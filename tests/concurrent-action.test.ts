import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { ROLES } from "@/lib/constants";
import { createPaymentAction } from "@/modules/payments/actions";

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
let memberId = "";
let categoryId = "";
let planId = "";

function buildFormData({ amountPaise, allocations, memberId, idempotencyKey }: any) {
  const fd = new FormData();
  fd.set("memberId", memberId);
  fd.set("paymentDate", "2094-01-15");
  fd.set("amountPaise", String(amountPaise));
  fd.set("mode", "CASH");
  fd.set("idempotencyKey", idempotencyKey);
  fd.set("allocations", JSON.stringify(allocations));
  return fd;
}

beforeAll(async () => {
  const suffix = `conc-${Date.now().toString(36)}`;
  const masjid = await prisma.masjid.create({
    data: {
      name: "Concurrency Test Masjid",
      slug: slugify(`concurrency-${suffix}`),
      receiptPrefix: "CONC",
      financialYearStartMonth: 4,
      status: "ACTIVE",
    },
  });
  masjidId = masjid.id;

  const category = await prisma.contributionCategory.create({
    data: { masjidId, name: "General", code: "GEN" },
  });
  categoryId = category.id;

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

  const member = await prisma.member.create({
    data: { masjidId, memberNo: `MEM-${suffix}`, fullName: "Test Member" },
  });
  memberId = member.id;

  const plan = await prisma.contributionPlan.create({
    data: {
      masjidId,
      memberId,
      categoryId,
      frequency: "MONTHLY",
      amountPaise: 100000,
      startDate: new Date("2094-01-01T00:00:00+05:30"),
      dueDay: 10,
    },
  });
  planId = plan.id;

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
  await prisma.duesPeriod.deleteMany({ where: { masjidId } });
  const events = await prisma.collectionEvent.findMany({ where: { masjidId }, select: { id: true } });
  if (events.length > 0) {
    await prisma.collectionEventAssignment.deleteMany({ where: { eventId: { in: events.map(e => e.id) } } });
    await prisma.collectionEvent.deleteMany({ where: { masjidId } });
  }
  await prisma.contributionPlan.deleteMany({ where: { id: planId } });
  await prisma.member.deleteMany({ where: { masjidId } });
  await prisma.contributionCategory.deleteMany({ where: { masjidId } });
  await prisma.masjidUser.deleteMany({ where: { masjidId } });
  await prisma.user.delete({ where: { id: userId } });
  await prisma.masjid.delete({ where: { id: masjidId } });
  await prisma.$disconnect();
});

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "-");
}

describe("Genuine Concurrent Action Testing with Row-Level Locking", () => {
  it("prevents concurrent over-allocation on a single dues period via createPaymentAction", async () => {
    const period = await prisma.duesPeriod.create({
      data: {
        masjidId,
        planId,
        memberId,
        periodStart: new Date("2094-01-01T00:00:00+05:30"),
        periodEnd: new Date("2094-01-31T00:00:00+05:30"),
        dueDate: new Date("2094-02-10T00:00:00+05:30"),
        expectedAmountPaise: 100000,
      },
    });

    // Launch two concurrent payment actions trying to allocate 80k each (total 160k > 100k)
    const form1 = buildFormData({
      amountPaise: 80000,
      allocations: [{ categoryId, duesPeriodId: period.id, amountPaise: 80000 }],
      memberId,
      idempotencyKey: `pay-conc-1-${Date.now()}`,
    });

    const form2 = buildFormData({
      amountPaise: 80000,
      allocations: [{ categoryId, duesPeriodId: period.id, amountPaise: 80000 }],
      memberId,
      idempotencyKey: `pay-conc-2-${Date.now()}`,
    });

    const results = await Promise.all([
      createPaymentAction(form1),
      createPaymentAction(form2),
    ]);

    const succeeded = results.filter(r => r.ok);
    const failed = results.filter(r => !r.ok);

    expect(succeeded.length).toBe(1);
    expect(failed.length).toBe(1);
    expect(failed[0].error).toBe("Could not save the payment. No changes were made.");

    // Verify exactly 80000 was allocated in DB
    const allocatedSum = await prisma.paymentAllocation.aggregate({
      where: { duesPeriodId: period.id },
      _sum: { allocatedAmountPaise: true },
    });
    expect(allocatedSum._sum.allocatedAmountPaise).toBe(80000);
  });

  it("prevents concurrent over-allocation on a collection event assignment via createPaymentAction", async () => {
    const event = await prisma.collectionEvent.create({
      data: {
        masjidId,
        categoryId,
        name: "Ramadan Fund",
        startDate: new Date("2094-03-01T00:00:00+05:30"),
        dueDate: new Date("2094-03-31T00:00:00+05:30"),
        expectedAmountPaise: 100000,
        status: "OPEN",
      },
    });

    await prisma.collectionEventAssignment.create({
      data: {
        masjidId,
        eventId: event.id,
        memberId,
        expectedAmountPaise: 100000,
        status: "PENDING",
      },
    });

    const form1 = buildFormData({
      amountPaise: 80000,
      allocations: [{ categoryId, collectionEventId: event.id, amountPaise: 80000 }],
      memberId,
      idempotencyKey: `event-conc-1-${Date.now()}`,
    });

    const form2 = buildFormData({
      amountPaise: 80000,
      allocations: [{ categoryId, collectionEventId: event.id, amountPaise: 80000 }],
      memberId,
      idempotencyKey: `event-conc-2-${Date.now()}`,
    });

    const results = await Promise.all([
      createPaymentAction(form1),
      createPaymentAction(form2),
    ]);

    const succeeded = results.filter(r => r.ok);
    const failed = results.filter(r => !r.ok);

    expect(succeeded.length).toBe(1);
    expect(failed.length).toBe(1);
    expect(failed[0].error).toBe("Could not save the payment. No changes were made.");

    // Verify exactly 80000 was allocated
    const allocatedSum = await prisma.paymentAllocation.aggregate({
      where: { collectionEventId: event.id },
      _sum: { allocatedAmountPaise: true },
    });
    expect(allocatedSum._sum.allocatedAmountPaise).toBe(80000);
  });

  it("allows concurrent allocations to different dues periods without blocking", async () => {
    const period1 = await prisma.duesPeriod.create({
      data: {
        masjidId,
        planId,
        memberId,
        periodStart: new Date("2094-02-01T00:00:00+05:30"),
        periodEnd: new Date("2094-02-28T00:00:00+05:30"),
        dueDate: new Date("2094-03-10T00:00:00+05:30"),
        expectedAmountPaise: 50000,
      },
    });

    const period2 = await prisma.duesPeriod.create({
      data: {
        masjidId,
        planId,
        memberId,
        periodStart: new Date("2094-03-01T00:00:00+05:30"),
        periodEnd: new Date("2094-03-31T00:00:00+05:30"),
        dueDate: new Date("2094-04-10T00:00:00+05:30"),
        expectedAmountPaise: 30000,
      },
    });

    const form1 = buildFormData({
      amountPaise: 50000,
      allocations: [{ categoryId, duesPeriodId: period1.id, amountPaise: 50000 }],
      memberId,
      idempotencyKey: `diff-1-${Date.now()}`,
    });

    const form2 = buildFormData({
      amountPaise: 30000,
      allocations: [{ categoryId, duesPeriodId: period2.id, amountPaise: 30000 }],
      memberId,
      idempotencyKey: `diff-2-${Date.now()}`,
    });

    const results = await Promise.all([
      createPaymentAction(form1),
      createPaymentAction(form2),
    ]);

    const succeeded = results.filter(r => r.ok);
    expect(succeeded.length).toBe(2);

    const alloc1 = await prisma.paymentAllocation.aggregate({
      where: { duesPeriodId: period1.id },
      _sum: { allocatedAmountPaise: true },
    });
    expect(alloc1._sum.allocatedAmountPaise).toBe(50000);

    const alloc2 = await prisma.paymentAllocation.aggregate({
      where: { duesPeriodId: period2.id },
      _sum: { allocatedAmountPaise: true },
    });
    expect(alloc2._sum.allocatedAmountPaise).toBe(30000);
  });
});