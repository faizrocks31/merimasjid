import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { ROLES } from "@/lib/constants";
import { createPaymentAction } from "@/modules/payments/actions";
import { getCollectionDefinitionByPurposeCode, createDefaultCollectionDefinitions } from "./helpers";

const COOKIE_NAME = "masjid_session";

type Caller = { userId: string; masjidId: string | null; role: string; isPlatformAdmin: boolean };

let currentCookieValue: string | undefined;

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === COOKIE_NAME && currentCookieValue !== undefined
        ? { name, value: currentCookieValue }
        : undefined,
    set: () => {},
    delete: () => {},
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    const err = new Error(`NEXT_REDIRECT:${path}`) as Error & { digest?: string };
    err.digest = `NEXT_REDIRECT;${path}`;
    throw err;
  },
  notFound: () => {
    const err = new Error("NEXT_NOT_FOUND") as Error & { digest?: string };
    err.digest = "NEXT_NOT_FOUND";
    throw err;
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
}));

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET is missing or too short.");
  return new TextEncoder().encode(secret);
}

async function signIn(caller: Caller): Promise<void> {
  const token = await new SignJWT({ ...caller })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secretKey());
  currentCookieValue = token;
}

let masjidId = "";
let userId = "";
let jummaCollectionDefinitionId = "";

function buildFormData(data: {
  memberId?: string;
  walkInName?: string;
  collectionDefinitionId: string;
  amountPaise: number;
  collectionEventId?: string;
  mode?: string;
  referenceNo?: string;
  notes?: string;
  paymentDate?: string;
  idempotencyKey: string;
}) {
  const fd = new FormData();
  fd.set("memberId", data.memberId || "");
  fd.set("walkInName", data.walkInName || "");
  fd.set("collectionDefinitionId", data.collectionDefinitionId);
  fd.set("paymentDate", data.paymentDate || "2094-01-15");
  fd.set("amountPaise", String(data.amountPaise));
  fd.set("mode", data.mode || "CASH");
  fd.set("referenceNo", data.referenceNo || "");
  fd.set("notes", data.notes || "");
  fd.set("idempotencyKey", data.idempotencyKey);
  fd.set("allocations", JSON.stringify([]));
  if (data.collectionEventId) {
    fd.set("collectionEventId", data.collectionEventId);
  }
  return fd;
}

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "-");
}

beforeAll(async () => {
  const suffix = `debug-${Date.now().toString(36)}`;
  const masjid = await prisma.masjid.create({
    data: {
      name: "Debug Jumma Test Masjid",
      slug: slugify(`debug-jumma-${suffix}`),
      receiptPrefix: "DJT",
      financialYearStartMonth: 4,
      status: "ACTIVE",
    },
  });
  masjidId = masjid.id;

  // Create default collection definitions
  await createDefaultCollectionDefinitions(masjidId);
  const jummaCollectionDefinition = await getCollectionDefinitionByPurposeCode(masjidId, "JUMMA_COLLECTION");
  if (!jummaCollectionDefinition) throw new Error("JUMMA_COLLECTION collection definition not created");
  jummaCollectionDefinitionId = jummaCollectionDefinition.id;

  const user = await prisma.user.create({
    data: {
      name: "Admin User",
      email: `admin-${suffix}@example.invalid`,
      passwordHash: await bcrypt.hash("password123", 12),
      status: "ACTIVE",
    },
  });
  userId = user.id;

  await prisma.masjidUser.create({
    data: { masjidId, userId, role: ROLES.ADMIN, status: "ACTIVE" },
  });

  await signIn({
    userId,
    masjidId,
    role: ROLES.ADMIN,
    isPlatformAdmin: false,
  });
});

afterAll(async () => {
  await prisma.paymentAllocation.deleteMany({ where: { masjidId } });
  await prisma.payment.deleteMany({ where: { masjidId } });
  await prisma.collectionEvent.deleteMany({ where: { masjidId } });
  await prisma.collectionDefinition.deleteMany({ where: { masjidId } });
  await prisma.masjidUser.deleteMany({ where: { masjidId } });
  await prisma.auditLog.deleteMany({ where: { masjidId } });
  await prisma.user.delete({ where: { id: userId } });
  await prisma.masjid.delete({ where: { id: masjidId } });
  await prisma.$disconnect();
});

describe("Debug Jumma Event Workflow", () => {
  beforeEach(async () => {
    await prisma.paymentAllocation.deleteMany({ where: { masjidId } });
    await prisma.payment.deleteMany({ where: { masjidId } });
  });

  it("Jumma event-based non-member payment works", async () => {
    // Create a Jumma event
    const jummaEvent = await prisma.collectionEvent.create({
      data: {
        masjidId,
        collectionDefinitionId: jummaCollectionDefinitionId,
        name: "Jumma Collection 2094-01-12",
        startDate: new Date("2094-01-12T00:00:00+05:30"),
        dueDate: new Date("2094-01-12T13:00:00+05:30"),
        expectedAmountPaise: 50000,
        status: "OPEN",
      },
    });

    console.log("Created Jumma event:", jummaEvent.id);

    // Walk-in payment to Jumma event (using collectionEventId)
    const form = new FormData();
    form.set("walkInName", "Jumma Donor");
    form.set("collectionDefinitionId", jummaCollectionDefinitionId);
    form.set("collectionEventId", jummaEvent.id);
    form.set("paymentDate", "2094-01-12");
    form.set("amountPaise", "5000");
    form.set("mode", "CASH");
    form.set("idempotencyKey", `jumma-event-${Date.now()}`);
    form.set("allocations", JSON.stringify([]));

    console.log("Submitting payment with:", {
      walkInName: form.get("walkInName"),
      collectionDefinitionId: form.get("collectionDefinitionId"),
      collectionEventId: form.get("collectionEventId"),
      amountPaise: form.get("amountPaise"),
    });

    const result = await createPaymentAction(form);

    console.log("Result:", JSON.stringify(result, null, 2));

    if (!result.ok) {
      console.log("ERROR:", result.error);
    }

    expect(result.ok).toBe(true);

    const payment = await prisma.payment.findFirst({
      where: { masjidId, idempotencyKey: form.get("idempotencyKey") as string },
      include: { allocations: true },
    });
    console.log("Payment:", payment);
    expect(payment?.allocations[0].collectionEventId).toBe(jummaEvent.id);
    expect(payment?.donorMemberId).toBeNull();

    await prisma.collectionEvent.delete({ where: { id: jummaEvent.id } });
  });
});