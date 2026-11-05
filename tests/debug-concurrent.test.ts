import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
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
let monthlyCategoryId = "";
let monthlyPlanId = "";

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
      name: "Debug Concurrent Test Masjid",
      slug: slugify(`debug-concurrent-${suffix}`),
      receiptPrefix: "DCT",
      financialYearStartMonth: 4,
      status: "ACTIVE",
    },
  });
  masjidId = masjid.id;

  // Create categories
  monthlyCategoryId = (await createCategory("MONTHLY", "Monthly Collection", "MONTHLY")).id;

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

  // Create monthly plan for the member
  const plan = await prisma.contributionPlan.create({
    data: {
      masjidId,
      memberId,
      categoryId: monthlyCategoryId,
      frequency: "MONTHLY",
      amountPaise: 15000, // ₹150
      startDate: new Date("2094-01-01T00:00:00+05:30"),
      dueDay: 10,
    },
  });
  monthlyPlanId = plan.id;

  // Create dues periods for monthly
  await prisma.duesPeriod.create({
    data: {
      masjidId,
      planId: monthlyPlanId,
      memberId,
      periodStart: new Date("2094-01-01T00:00:00+05:30"),
      periodEnd: new Date("2094-01-31T00:00:00+05:30"),
      dueDate: new Date("2094-02-10T00:00:00+05:30"),
      expectedAmountPaise: 15000,
      status: "PENDING",
    },
  });
  await prisma.duesPeriod.create({
    data: {
      masjidId,
      planId: monthlyPlanId,
      memberId,
      periodStart: new Date("2094-02-01T00:00:00+05:30"),
      periodEnd: new Date("2094-02-28T00:00:00+05:30"),
      dueDate: new Date("2094-03-10T00:00:00+05:30"),
      expectedAmountPaise: 15000,
      status: "PENDING",
    },
  });
  await prisma.duesPeriod.create({
    data: {
      masjidId,
      planId: monthlyPlanId,
      memberId,
      periodStart: new Date("2094-03-01T00:00:00+05:30"),
      periodEnd: new Date("2094-03-31T00:00:00+05:30"),
      dueDate: new Date("2094-04-10T00:00:00+05:30"),
      expectedAmountPaise: 15000,
      status: "PENDING",
    },
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
  await prisma.duesPeriod.deleteMany({ where: { masjidId } });
  await prisma.contributionPlan.deleteMany({ where: { id: monthlyPlanId } });
  await prisma.member.deleteMany({ where: { masjidId } });
  await prisma.contributionCategory.deleteMany({ where: { masjidId } });
  await prisma.masjidUser.deleteMany({ where: { masjidId } });
  await prisma.auditLog.deleteMany({ where: { masjidId } });
  await prisma.user.delete({ where: { id: userId } });
  await prisma.masjid.delete({ where: { id: masjidId } });
  await prisma.$disconnect();
});

describe("Debug Concurrent Submissions", () => {
  beforeEach(async () => {
    await prisma.paymentAllocation.deleteMany({ where: { masjidId } });
    await prisma.payment.deleteMany({ where: { masjidId } });
    await prisma.duesPeriod.updateMany({
      where: { masjidId, planId: monthlyPlanId },
      data: { status: "PENDING" },
    });
  });

  it("concurrent submissions cannot over-allocate dues", async () => {
    const form1 = buildFormData({
      memberId,
      categoryId: monthlyCategoryId,
      amountPaise: 8000,
      idempotencyKey: `conc-1-${Date.now()}`,
    });
    const form2 = buildFormData({
      memberId,
      categoryId: monthlyCategoryId,
      amountPaise: 8000,
      idempotencyKey: `conc-2-${Date.now()}`,
    });

    const results = await Promise.all([
      createPaymentAction(form1),
      createPaymentAction(form2),
    ]);

    console.log("Result 1:", JSON.stringify(results[0], null, 2));
    console.log("Result 2:", JSON.stringify(results[1], null, 2));

    const succeeded = results.filter(r => r.ok);
    const failed = results.filter(r => !r.ok);

    console.log("Succeeded:", succeeded.length);
    console.log("Failed:", failed.length);

    const totalAllocated = await prisma.paymentAllocation.aggregate({
      where: { masjidId, categoryId: monthlyCategoryId },
      _sum: { allocatedAmountPaise: true },
    });
    console.log("Total allocated:", totalAllocated._sum.allocatedAmountPaise);

    // Check individual periods
    const periods = await prisma.duesPeriod.findMany({
      where: { masjidId, planId: monthlyPlanId },
      orderBy: { periodStart: "asc" },
      include: { allocations: { include: { payment: { select: { status: true, idempotencyKey: true } } } } },
    });

    for (const p of periods) {
      const allocated = p.allocations
        .filter(a => a.payment.status === "SUCCESS")
        .reduce((sum, a) => sum + a.allocatedAmountPaise, 0);
      console.log(`Period ${p.periodStart.toISOString().split('T')[0]}: expected=${p.expectedAmountPaise}, allocated=${allocated}, status=${p.status}`);
      for (const a of p.allocations) {
        console.log(`  Allocation: ${a.allocatedAmountPaise} paise, payment=${a.payment.idempotencyKey}, status=${a.payment.status}`);
      }
    }

    // Both payments should succeed with FIFO allocation
    // Total paid = 16000 (8000 + 8000)
    // Jan: 15000 (PAID) - 8000 from first, 7000 from second
    // Feb: 1000 (PARTIAL) - 1000 from second
    // Mar: 0 (PENDING)
    expect(totalAllocated._sum.allocatedAmountPaise).toBe(16000);

    // Jan should be PAID with 15000
    const janAllocated = periods[0].allocations
      .filter(a => a.payment.status === "SUCCESS")
      .reduce((sum, a) => sum + a.allocatedAmountPaise, 0);
    expect(janAllocated).toBe(15000);
    expect(periods[0].status).toBe("PAID");

    // Feb should be PARTIAL with 1000
    const febAllocated = periods[1].allocations
      .filter(a => a.payment.status === "SUCCESS")
      .reduce((sum, a) => sum + a.allocatedAmountPaise, 0);
    expect(febAllocated).toBe(1000);
    expect(periods[1].status).toBe("PARTIAL");

    // Mar should be PENDING
    expect(periods[2].status).toBe("PENDING");
  });
});