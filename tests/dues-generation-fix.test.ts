import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { ROLES } from "@/lib/constants";
import { generateDuesPeriods, buildPeriods, generateAllDuesForMasjid } from "@/lib/dues";
import { generateDuesAction } from "@/modules/plans/actions";

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
let planId2 = "";

beforeAll(async () => {
  const suffix = `duesfix-${Date.now().toString(36)}`;
  const masjid = await prisma.masjid.create({
    data: {
      name: "Dues Fix Test Masjid",
      slug: `duesfix-${suffix}`,
      receiptPrefix: "DFX",
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
      amountPaise: 50000,
      startDate: new Date("2026-01-01T00:00:00+05:30"),
      dueDay: 10,
    },
  });
  planId = plan.id;

  // Second plan for concurrent generation test
  const member2 = await prisma.member.create({
    data: { masjidId, memberNo: `MEM2-${suffix}`, fullName: "Test Member 2" },
  });

  const plan2 = await prisma.contributionPlan.create({
    data: {
      masjidId,
      memberId: member2.id,
      categoryId,
      frequency: "MONTHLY",
      amountPaise: 30000,
      startDate: new Date("2026-01-01T00:00:00+05:30"),
      dueDay: 10,
    },
  });
  planId2 = plan2.id;

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
  await prisma.contributionPlan.deleteMany({ where: { masjidId } });
  await prisma.member.deleteMany({ where: { masjidId } });
  await prisma.contributionCategory.deleteMany({ where: { masjidId } });
  await prisma.masjidUser.deleteMany({ where: { masjidId } });
  await prisma.auditLog.deleteMany({ where: { masjidId } });
  await prisma.user.delete({ where: { id: userId } });
  await prisma.masjid.delete({ where: { id: masjidId } });
  await prisma.$disconnect();
});

describe("Dues Generation Atomicity & Idempotency (Phase 2D Fix)", () => {
  beforeEach(async () => {
    await prisma.duesPeriod.deleteMany({ where: { masjidId } });
  });

  it("successfully generates periods for a new plan", async () => {
    const count = await generateDuesPeriods(planId);
    // With default horizon (12 months ahead), MONTHLY plan from Jan 2026 should create ~12 periods
    expect(count).toBeGreaterThan(0);

    const periods = await prisma.duesPeriod.findMany({ where: { planId }, orderBy: { periodStart: "asc" } });
    expect(periods.length).toBe(count);
    expect(periods[0].periodStart).toEqual(new Date("2026-01-01T00:00:00+05:30"));
    expect(periods.every(p => p.expectedAmountPaise === 50000)).toBe(true);
  });

  it("is idempotent: repeated calls do not create duplicates", async () => {
    const count1 = await generateDuesPeriods(planId);
    expect(count1).toBeGreaterThan(0);

    const count2 = await generateDuesPeriods(planId);
    expect(count2).toBe(0);

    const periods = await prisma.duesPeriod.findMany({ where: { planId } });
    expect(periods.length).toBe(count1);
  });

  it("correctly counts newly created periods when some already exist", async () => {
    // First call creates periods
    await generateDuesPeriods(planId);

    // Manually delete some periods to simulate gap
    const existing = await prisma.duesPeriod.findMany({ where: { planId } });
    await prisma.duesPeriod.delete({ where: { id: existing[0].id } });
    await prisma.duesPeriod.delete({ where: { id: existing[1].id } });

    // Second call should recreate only the missing ones
    const count = await generateDuesPeriods(planId);
    expect(count).toBe(2);

    const final = await prisma.duesPeriod.findMany({ where: { planId } });
    expect(final.length).toBe(existing.length);
  });

  it("preserves existing dues with payment allocations when regenerating", async () => {
    // Generate initial periods
    await generateDuesPeriods(planId);

    const periods = await prisma.duesPeriod.findMany({ where: { planId } });
    const firstPeriod = periods[0];

    // Create a payment allocation for the first period
    const payment = await prisma.payment.create({
      data: {
        masjidId,
        receiptNo: `TEST-${Date.now()}`,
        donorMemberId: memberId,
        donorNameSnapshot: "Test Donor",
        paymentDate: new Date("2026-01-15T00:00:00+05:30"),
        amountPaise: 50000,
        mode: "CASH",
        status: "SUCCESS",
        enteredBy: userId,
        idempotencyKey: `pay-alloc-${Date.now()}`,
      },
    });

    await prisma.paymentAllocation.create({
      data: {
        masjidId,
        paymentId: payment.id,
        duesPeriodId: firstPeriod.id,
        categoryId,
        allocatedAmountPaise: 50000,
      },
    });

    // Regenerate - should NOT recreate the period or lose the allocation
    const count = await generateDuesPeriods(planId);
    expect(count).toBe(0);

    // Verify allocation still exists
    const allocation = await prisma.paymentAllocation.findFirst({ where: { duesPeriodId: firstPeriod.id } });
    expect(allocation).not.toBeNull();
    expect(allocation!.allocatedAmountPaise).toBe(50000);
  });

  it("generateAllDuesForMasjid generates for multiple plans and returns total count", async () => {
    const total = await generateAllDuesForMasjid(masjidId);
    expect(total).toBeGreaterThan(0);

    const periods = await prisma.duesPeriod.findMany({ where: { masjidId } });
    expect(periods.length).toBe(total);
  });

  it("handles concurrent generation requests for the same plan without duplicates", async () => {
    // Run two simultaneous generateDuesPeriods calls for the same plan
    const [count1, count2] = await Promise.all([
      generateDuesPeriods(planId),
      generateDuesPeriods(planId),
    ]);

    // One should create periods, the other should return 0
    const totalCreated = count1 + count2;
    const periods = await prisma.duesPeriod.findMany({ where: { planId } });
    expect(periods.length).toBe(totalCreated);
    expect(periods.length).toBeGreaterThan(0);
  });

  it("handles concurrent generation for multiple plans", async () => {
    await prisma.duesPeriod.deleteMany({ where: { masjidId } });

    const [count1, count2] = await Promise.all([
      generateDuesPeriods(planId),
      generateDuesPeriods(planId2),
    ]);

    expect(count1).toBeGreaterThan(0);
    expect(count2).toBeGreaterThan(0);

    const periods = await prisma.duesPeriod.findMany({ where: { masjidId } });
    expect(periods.length).toBe(count1 + count2);
  });

  it("generateDuesAction (server action) works and logs audit", async () => {
    await prisma.duesPeriod.deleteMany({ where: { masjidId } });

    await generateDuesAction();

    const periods = await prisma.duesPeriod.findMany({ where: { masjidId } });
    expect(periods.length).toBeGreaterThan(0);

    // Verify audit log entry exists
    const audit = await prisma.auditLog.findFirst({
      where: { action: "dues.generate", masjidId },
      orderBy: { createdAt: "desc" },
    });
    expect(audit).not.toBeNull();
    expect(audit!.metadata).toContain("created");
  });
});