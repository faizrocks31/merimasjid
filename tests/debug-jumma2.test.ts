import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { ROLES } from "@/lib/constants";
import { paymentSchema } from "@/lib/validation-registry";

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
let jummaCategoryId = "";

function buildFormData(data: {
  memberId?: string;
  walkInName?: string;
  categoryId: string;
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
  fd.set("categoryId", data.categoryId);
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

async function createCategory(code: string, name: string, frequency?: string) {
  return prisma.contributionCategory.create({
    data: {
      masjidId,
      name,
      code,
      restrictedPurpose: false,
      reportingGroup: "Test",
      frequency: frequency || null,
      defaultAmountPaise: 100000,
      collectionMode: "HOUSEHOLD_WISE",
      defaultDueDay: 10,
      defaultGraceDays: 0,
    },
  });
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

  // Create JUMMA category
  jummaCategoryId = (await createCategory("JUMMA", "Jumma Collection", "WEEKLY")).id;

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
  await prisma.contributionCategory.deleteMany({ where: { masjidId } });
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

  it("check form parsing", async () => {
    const form = buildFormData({
      categoryId: jummaCategoryId,
      amountPaise: 5000,
      walkInName: "Jumma Donor",
      collectionEventId: "test-event-id",
      idempotencyKey: `test-${Date.now()}`,
    });

    console.log("Form entries:");
    for (const [key, value] of form.entries()) {
      console.log(`  ${key}: ${value}`);
    }

    // Test parsing
    const allocationJson = String(form.get("allocations") ?? "[]");
    console.log("allocationJson:", allocationJson);
    let allocations: unknown = [];
    try {
      allocations = JSON.parse(allocationJson);
    } catch {
      allocations = [];
    }
    console.log("parsed allocations:", allocations);

    const parsed = paymentSchema.safeParse({
      memberId: String(form.get("memberId") ?? ""),
      walkInName: String(form.get("walkInName") ?? ""),
      categoryId: String(form.get("categoryId") ?? ""),
      collectionEventId: String(form.get("collectionEventId") ?? ""),
      paymentDate: String(form.get("paymentDate") ?? ""),
      amountPaise: Number(form.get("amountPaise") ?? 0),
      mode: String(form.get("mode") ?? "CASH"),
      referenceNo: String(form.get("referenceNo") ?? ""),
      verificationStatus: String(form.get("verificationStatus") ?? "MANUAL"),
      notes: String(form.get("notes") ?? ""),
      idempotencyKey: String(form.get("idempotencyKey") ?? ""),
      allocations,
    });

    console.log("Parsed success:", parsed.success);
    if (parsed.success) {
      console.log("Parsed data:", JSON.stringify(parsed.data, null, 2));
    } else {
      console.log("Parse errors:", parsed.error.issues);
    }
  });
});