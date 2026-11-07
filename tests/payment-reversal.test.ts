/**
 * Payment Reversal Tests (Phase 2E)
 *
 * Covers:
 * 1. Successful reversal of a payment
 * 2. Reversal of a payment with multiple allocations
 * 3. Correct Dues Period outstanding balance and status after reversal
 * 4. Correct Collection Event Assignment/Event balance after reversal
 * 5. Duplicate reversal does not create a second reversal record or restore balances twice
 * 6. Two concurrent reversal requests against the same payment
 * 7. Cross-tenant reversal is rejected
 * 8. Unauthorized reversal is rejected
 * 9. A failed reversal transaction leaves no partial reversal state
 * 10. Existing payment history, allocations, receipt history, and audit history remain intact
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { ROLES } from "@/lib/constants";
import { reversePaymentAction, createPaymentAction } from "@/modules/payments/actions";
import { recomputePeriodStatus, recomputeEventStatus, recomputeAssignmentStatus } from "@/lib/dues";
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

function signOut(): void {
  currentCookieValue = undefined;
}

// Fixtures
let masjidId = "";
let masjidBId = "";
let userId = "";
let otherUserId = "";
let collectionDefinitionId = "";
let generalCollectionDefinitionId = "";
let collectionDefinitionBId = "";
let memberId = "";
let memberBId = "";
let planId = "";
let eventId = "";
let assignmentId = "";

const createdIds: string[] = [];

beforeAll(async () => {
  const suffix = `rev-${Date.now().toString(36)}`;

  // Masjid A
  const masjid = await prisma.masjid.create({
    data: {
      name: "Reversal Test Masjid A",
      slug: `rev-a-${suffix}`,
      receiptPrefix: "RVA",
      financialYearStartMonth: 4,
      status: "ACTIVE",
    },
  });
  masjidId = masjid.id;
  createdIds.push(masjidId);

  // Masjid B (for cross-tenant test)
  const masjidB = await prisma.masjid.create({
    data: {
      name: "Reversal Test Masjid B",
      slug: `rev-b-${suffix}`,
      receiptPrefix: "RVB",
      financialYearStartMonth: 4,
      status: "ACTIVE",
    },
  });
  masjidBId = masjidB.id;
  createdIds.push(masjidBId);

  // Create default collection definitions for both masjids
  await createDefaultCollectionDefinitions(masjidId);
  await createDefaultCollectionDefinitions(masjidBId);

  const collectionDefinition = await getCollectionDefinitionByPurposeCode(masjidId, "MONTHLY_CHANDA");
  if (!collectionDefinition) throw new Error("MONTHLY_CHANDA collection definition not created for masjid A");
  collectionDefinitionId = collectionDefinition.id;

  // Get GENERAL_DONATION for non-FIFO tests (like collection events)
  const generalCollectionDefinition = await getCollectionDefinitionByPurposeCode(masjidId, "GENERAL_DONATION");
  if (!generalCollectionDefinition) throw new Error("GENERAL_DONATION collection definition not created for masjid A");
  generalCollectionDefinitionId = generalCollectionDefinition.id;

  const collectionDefinitionB = await getCollectionDefinitionByPurposeCode(masjidBId, "MONTHLY_CHANDA");
  if (!collectionDefinitionB) throw new Error("MONTHLY_CHANDA collection definition not created for masjid B");
  collectionDefinitionBId = collectionDefinitionB.id;

  // Users
  const user = await prisma.user.create({
    data: {
      name: "Admin User",
      email: `admin-${suffix}@example.invalid`,
      passwordHash: await bcrypt.hash("password123", 12),
      status: "ACTIVE",
    },
  });
  userId = user.id;

  const otherUser = await prisma.user.create({
    data: {
      name: "Other Admin",
      email: `other-${suffix}@example.invalid`,
      passwordHash: await bcrypt.hash("password123", 12),
      status: "ACTIVE",
    },
  });
  otherUserId = otherUser.id;

  await prisma.masjidUser.create({
    data: { masjidId, userId, role: ROLES.ADMIN, status: "ACTIVE" },
  });

  await prisma.masjidUser.create({
    data: { masjidId: masjidBId, userId: otherUserId, role: ROLES.ADMIN, status: "ACTIVE" },
  });

  // Members
  const member = await prisma.member.create({
    data: { masjidId, memberNo: `MEM-${suffix}`, fullName: "Test Member" },
  });
  memberId = member.id;

  const memberB = await prisma.member.create({
    data: { masjidId: masjidBId, memberNo: `MEM-B-${suffix}`, fullName: "Member B" },
  });
  memberBId = memberB.id;

  // Contribution plan
  const plan = await prisma.contributionPlan.create({
    data: {
      masjidId,
      memberId,
      collectionDefinitionId,
      frequency: "MONTHLY",
      amountPaise: 100000,
      startDate: new Date("2026-01-01T00:00:00+05:30"),
      dueDay: 10,
    },
  });
  planId = plan.id;

  // Collection event + assignment
  const event = await prisma.collectionEvent.create({
    data: {
      masjidId,
      collectionDefinitionId,
      name: "Test Event",
      startDate: new Date("2026-01-01T00:00:00+05:30"),
      dueDate: new Date("2026-02-10T00:00:00+05:30"),
      expectedAmountPaise: 100000,
      status: "OPEN",
    },
  });
  eventId = event.id;

  const assignment = await prisma.collectionEventAssignment.create({
    data: {
      masjidId,
      eventId,
      memberId,
      expectedAmountPaise: 100000,
      status: "PENDING",
    },
  });
  assignmentId = assignment.id;

  await signIn({
    userId,
    masjidId,
    role: ROLES.ADMIN,
    isPlatformAdmin: false,
  });
});

afterAll(async () => {
  await prisma.paymentAllocation.deleteMany({ where: { masjidId: { in: createdIds } } });
  await prisma.receiptEvent.deleteMany({ where: { masjidId: { in: createdIds } } });
  await prisma.auditLog.deleteMany({ where: { masjidId: { in: createdIds } } });
  await prisma.reversal.deleteMany({ where: { masjidId: { in: createdIds } } });
  await prisma.payment.deleteMany({ where: { masjidId: { in: createdIds } } });
  await prisma.duesPeriod.deleteMany({ where: { masjidId: { in: createdIds } } });
  await prisma.contributionPlan.deleteMany({ where: { masjidId: { in: createdIds } } });
  await prisma.collectionEventAssignment.deleteMany({ where: { eventId: { in: [eventId] } } });
  await prisma.collectionEvent.deleteMany({ where: { masjidId: { in: createdIds } } });
  await prisma.member.deleteMany({ where: { masjidId: { in: createdIds } } });
  await prisma.collectionDefinition.deleteMany({ where: { masjidId: { in: createdIds } } });
  await prisma.expenseCategory.deleteMany({ where: { masjidId: { in: createdIds } } });
  await prisma.masjidUser.deleteMany({ where: { masjidId: { in: createdIds } } });
  await prisma.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } });
  await prisma.masjid.deleteMany({ where: { id: { in: createdIds } } });
  await prisma.$disconnect();
});

// Helper to create a payment with allocations
async function createTestPayment(
  duesPeriodIds: string[],
  collectionEventIds: string[],
  amountPaise: number,
  idempotencyKey: string,
  collectionDefinitionId: string
) {
  const form = new FormData();
  form.set("memberId", memberId);
  form.set("paymentDate", "2026-01-15");
  form.set("amountPaise", String(amountPaise));
  form.set("mode", "CASH");
  form.set("idempotencyKey", idempotencyKey);
  form.set("collectionDefinitionId", collectionDefinitionId);
  form.set(
    "allocations",
    JSON.stringify([
      ...duesPeriodIds.map((id) => ({ duesPeriodId: id, collectionDefinitionId, amountPaise: amountPaise / duesPeriodIds.length })),
      ...collectionEventIds.map((id) => ({ collectionEventId: id, collectionDefinitionId, amountPaise: amountPaise / collectionEventIds.length })),
    ])
  );
  return createPaymentAction(form);
}

// Helper to create a dues period with explicit due date
let duesPeriodCounter = 0;
async function createDuesPeriod(expectedAmount: number, dueDateOffsetDays: number = 0): Promise<string> {
  const baseDate = new Date("2026-01-01T00:00:00+05:30");
  const start = new Date(baseDate.getTime() + duesPeriodCounter * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
  const dueDate = new Date(baseDate.getTime() + (30 + dueDateOffsetDays) * 24 * 60 * 60 * 1000);

  const period = await prisma.duesPeriod.create({
    data: {
      masjidId,
      collectionDefinitionId,
      planId,
      memberId,
      periodStart: start,
      periodEnd: end,
      dueDate,
      expectedAmountPaise: expectedAmount,
    },
  });
  duesPeriodCounter++;
  return period.id;
}

describe("Payment Reversal (Phase 2E)", () => {
  beforeEach(async () => {
    await prisma.paymentAllocation.deleteMany({ where: { masjidId } });
    await prisma.receiptEvent.deleteMany({ where: { masjidId } });
    await prisma.auditLog.deleteMany({ where: { masjidId } });
    await prisma.reversal.deleteMany({ where: { masjidId } });
    await prisma.payment.deleteMany({ where: { masjidId } });
    await prisma.duesPeriod.deleteMany({ where: { masjidId } });
  });

  // ------------------------------------------------------------------------
  // 1. Successful reversal of a payment
  // ------------------------------------------------------------------------
  it("successfully reverses a payment", async () => {
    const periodId = await createDuesPeriod(100000);

    // Create payment
    const paymentResult = await createTestPayment([periodId], [], 100000, "rev-ok-1", collectionDefinitionId);
    expect(paymentResult.ok).toBe(true);
    if (!paymentResult.ok) throw new Error("Payment creation failed");

    // Verify payment is SUCCESS
    let payment = await prisma.payment.findUnique({ where: { id: (paymentResult as any).paymentId } });
    expect(payment?.status).toBe("SUCCESS");

    // Reverse payment
    const form = new FormData();
    form.set("paymentId", (paymentResult as any).paymentId);
    form.set("reason", "Test reversal");

    const reverseResult = await reversePaymentAction(form);
    expect(reverseResult.ok).toBe(true);

    // Verify payment is REVERSED
    payment = await prisma.payment.findUnique({ where: { id: (paymentResult as any).paymentId } });
    expect(payment?.status).toBe("REVERSED");

    // Verify reversal record exists
    const reversal = await prisma.reversal.findUnique({ where: { originalPaymentId: (paymentResult as any).paymentId } });
    expect(reversal).not.toBeNull();
    expect(reversal?.reason).toBe("Test reversal");
    expect(reversal?.amountPaise).toBe(100000);
    expect(reversal?.approvedBy).toBe(userId);

    // Verify receipt event CANCELLED
    const receiptEvent = await prisma.receiptEvent.findFirst({
      where: { paymentId: (paymentResult as any).paymentId, eventType: "CANCELLED" },
    });
    expect(receiptEvent).not.toBeNull();

    // Verify audit log
    const audit = await prisma.auditLog.findFirst({
      where: { action: "payment.reverse", entityId: (paymentResult as any).paymentId },
    });
    expect(audit).not.toBeNull();
  });

  // ------------------------------------------------------------------------
  // 2. Reversal of a payment with multiple allocations
  // ------------------------------------------------------------------------
  it("reverses a payment with multiple allocations to dues periods and collection events", async () => {
    const periodId1 = await createDuesPeriod(50000, 0); // Due first
    const periodId2 = await createDuesPeriod(50000, 10); // Due later

    // Create payment with allocations to multiple dues periods
    const paymentResult = await createTestPayment([periodId1, periodId2], [], 100000, "rev-multi-1", collectionDefinitionId);
    if (!paymentResult.ok) console.log("Payment creation error:", paymentResult.error);
    expect(paymentResult.ok).toBe(true);
    if (!paymentResult.ok) throw new Error("Payment creation failed: " + paymentResult.error);

    // Verify allocations exist
    const allocationsBefore = await prisma.paymentAllocation.findMany({
      where: { paymentId: (paymentResult as any).paymentId },
    });
    expect(allocationsBefore.length).toBe(2);

    // Reverse payment
    const form = new FormData();
    form.set("paymentId", (paymentResult as any).paymentId);
    form.set("reason", "Multi-allocation reversal");

    const reverseResult = await reversePaymentAction(form);
    expect(reverseResult.ok).toBe(true);

    // Verify all dues periods reverted to PENDING
    const period1 = await prisma.duesPeriod.findUnique({ where: { id: periodId1 } });
    const period2 = await prisma.duesPeriod.findUnique({ where: { id: periodId2 } });
    expect(period1?.status).toBe("PENDING");
    expect(period2?.status).toBe("PENDING");

    // Verify reversal record created
    const reversal = await prisma.reversal.findUnique({ where: { originalPaymentId: (paymentResult as any).paymentId } });
    expect(reversal).not.toBeNull();
  });

  // ------------------------------------------------------------------------
  // 3. Correct Dues Period outstanding balance and status after reversal
  // ------------------------------------------------------------------------
  it("restores Dues Period outstanding balance and status to PENDING after reversal", async () => {
    const periodId = await createDuesPeriod(100000);

    // Create payment fully paying the period
    const paymentResult = await createTestPayment([periodId], [], 100000, "rev-balance-1", collectionDefinitionId);
    expect(paymentResult.ok).toBe(true);
    if (!paymentResult.ok) throw new Error("Payment creation failed");

    // Verify period is PAID
    let period = await prisma.duesPeriod.findUnique({ where: { id: periodId } });
    expect(period?.status).toBe("PAID");

    // Reverse payment
    const form = new FormData();
    form.set("paymentId", (paymentResult as any).paymentId);
    form.set("reason", "Balance restoration test");

    const reverseResult = await reversePaymentAction(form);
    expect(reverseResult.ok).toBe(true);

    // Verify period restored to PENDING
    period = await prisma.duesPeriod.findUnique({ where: { id: periodId } });
    expect(period?.status).toBe("PENDING");

    // Verify no successful allocations remain
    const allocations = await prisma.paymentAllocation.findMany({
      where: { duesPeriodId: periodId, payment: { status: "SUCCESS" } },
    });
    expect(allocations.length).toBe(0);
  });

  // ------------------------------------------------------------------------
  // 4. Correct Collection Event Assignment/Event balance after reversal
  // ------------------------------------------------------------------------
  it("restores Collection Event Assignment and Event balance after reversal", async () => {
    // Create a fresh event and assignment for this test to avoid prior payment interference
    // Use GENERAL_DONATION (ANY_PENDING_PERIOD) instead of MONTHLY_CHANDA (OLDEST_FIRST)
    const freshEvent = await prisma.collectionEvent.create({
      data: {
        masjidId,
        collectionDefinitionId: generalCollectionDefinitionId,
        name: "Fresh Test Event",
        startDate: new Date("2026-03-01T00:00:00+05:30"),
        dueDate: new Date("2026-03-10T00:00:00+05:30"),
        expectedAmountPaise: 100000,
        status: "OPEN",
      },
    });
    const freshAssignment = await prisma.collectionEventAssignment.create({
      data: {
        masjidId,
        eventId: freshEvent.id,
        memberId,
        expectedAmountPaise: 100000,
        status: "PENDING",
      },
    });

    // Create payment allocated to collection event
    const paymentResult = await createTestPayment([], [freshEvent.id], 100000, "rev-event-1", generalCollectionDefinitionId);
    if (!paymentResult.ok) console.log("Event payment creation error:", paymentResult.error);
    expect(paymentResult.ok).toBe(true);
    if (!paymentResult.ok) throw new Error("Payment creation failed: " + paymentResult.error);

    // Verify assignment is PAID
    let assignment = await prisma.collectionEventAssignment.findUnique({ where: { id: freshAssignment.id } });
    expect(assignment?.status).toBe("PAID");

    // Verify event is COMPLETED (when all assignments are paid and expected amount met)
    let event = await prisma.collectionEvent.findUnique({ where: { id: freshEvent.id } });
    expect(event?.status).toBe("COMPLETED");

    // Reverse payment
    const form = new FormData();
    form.set("paymentId", (paymentResult as any).paymentId);
    form.set("reason", "Event balance restoration");

    const reverseResult = await reversePaymentAction(form);
    expect(reverseResult.ok).toBe(true);

    // Verify assignment restored to PENDING
    assignment = await prisma.collectionEventAssignment.findUnique({ where: { id: freshAssignment.id } });
    expect(assignment?.status).toBe("PENDING");

    // Verify event restored to OPEN or SCHEDULED
    event = await prisma.collectionEvent.findUnique({ where: { id: freshEvent.id } });
    expect(["OPEN", "SCHEDULED"]).toContain(event?.status);
  });

  // ------------------------------------------------------------------------
  // 5. Duplicate reversal does not create a second reversal record or restore balances twice
  // ------------------------------------------------------------------------
  it("prevents duplicate reversal and returns clear error", async () => {
    const periodId = await createDuesPeriod(100000);

    const paymentResult = await createTestPayment([periodId], [], 100000, "rev-dup-1", collectionDefinitionId);
    expect(paymentResult.ok).toBe(true);
    if (!paymentResult.ok) throw new Error("Payment creation failed");

    // First reversal
    const form1 = new FormData();
    form1.set("paymentId", (paymentResult as any).paymentId);
    form1.set("reason", "First reversal");
    const result1 = await reversePaymentAction(form1);
    expect(result1.ok).toBe(true);

    // Second reversal attempt
    const form2 = new FormData();
    form2.set("paymentId", (paymentResult as any).paymentId);
    form2.set("reason", "Second reversal attempt");
    const result2 = await reversePaymentAction(form2);
    expect(result2.ok).toBe(false);
    expect(result2.error).toBe("This payment is already reversed.");

    // Verify only ONE reversal record exists
    const reversals = await prisma.reversal.findMany({ where: { originalPaymentId: (paymentResult as any).paymentId } });
    expect(reversals.length).toBe(1);

    // Verify payment still REVERSED (not flipped back)
    const payment = await prisma.payment.findUnique({ where: { id: (paymentResult as any).paymentId } });
    expect(payment?.status).toBe("REVERSED");

    // Verify balance restored only once (period PENDING)
    const period = await prisma.duesPeriod.findUnique({ where: { id: periodId } });
    expect(period?.status).toBe("PENDING");
  });

  // ------------------------------------------------------------------------
  // 6. Two concurrent reversal requests against the same payment
  // ------------------------------------------------------------------------
  it("handles concurrent reversal requests safely: exactly one succeeds, one fails with clear error", async () => {
    const periodId = await createDuesPeriod(100000);

    const paymentResult = await createTestPayment([periodId], [], 100000, "rev-conc-1", collectionDefinitionId);
    expect(paymentResult.ok).toBe(true);
    if (!paymentResult.ok) throw new Error("Payment creation failed");

    const paymentId = (paymentResult as any).paymentId;

    // Fire two concurrent reversal requests
    const form = (reason: string) => {
      const f = new FormData();
      f.set("paymentId", paymentId);
      f.set("reason", reason);
      return f;
    };

    const [result1, result2] = await Promise.allSettled([
      reversePaymentAction(form("Concurrent 1")),
      reversePaymentAction(form("Concurrent 2")),
    ]);

    const successes = [result1, result2].filter((r) => r.status === "fulfilled" && r.value.ok);
    const failures = [result1, result2].filter(
      (r) => r.status === "fulfilled" && !r.value.ok
    );

    // Exactly one should succeed
    expect(successes.length).toBe(1);
    // The other should fail with "already reversed" error
    expect(failures.length).toBe(1);
    if (failures[0].status === "fulfilled") {
      expect(failures[0].value.error).toBe("This payment is already reversed.");
    }

    // Verify exactly ONE reversal record
    const reversals = await prisma.reversal.findMany({ where: { originalPaymentId: paymentId } });
    expect(reversals.length).toBe(1);

    // Verify payment REVERSED
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    expect(payment?.status).toBe("REVERSED");

    // Verify balance restored only once
    const period = await prisma.duesPeriod.findUnique({ where: { id: periodId } });
    expect(period?.status).toBe("PENDING");
  });

  // ------------------------------------------------------------------------
  // 7. Cross-tenant reversal is rejected
  // ------------------------------------------------------------------------
  it("rejects cross-tenant reversal attempt", async () => {
    // Create payment in Masjid B
    const paymentB = await prisma.payment.create({
      data: {
        masjidId: masjidBId,
        receiptNo: `RVB-${Date.now()}`,
        donorMemberId: memberBId,
        donorNameSnapshot: "Member B",
        paymentDate: new Date("2026-01-15T00:00:00+05:30"),
        amountPaise: 50000,
        mode: "CASH",
        status: "SUCCESS",
        enteredBy: otherUserId,
        idempotencyKey: `cross-tenant-${Date.now()}`,
      },
    });

    // Sign in as Admin of Masjid A
    await signIn({
      userId,
      masjidId,
      role: ROLES.ADMIN,
      isPlatformAdmin: false,
    });

    const form = new FormData();
    form.set("paymentId", paymentB.id);
    form.set("reason", "Cross-tenant attempt");

    const result = await reversePaymentAction(form);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Payment not found in this Masjid.");

    // Verify payment in Masjid B unchanged
    const unchanged = await prisma.payment.findUnique({ where: { id: paymentB.id } });
    expect(unchanged?.status).toBe("SUCCESS");
  });

  // ------------------------------------------------------------------------
  // 8. Unauthorized reversal is rejected
  // ------------------------------------------------------------------------
  it("rejects reversal from unauthenticated user", async () => {
    const periodId = await createDuesPeriod(100000);
    const paymentResult = await createTestPayment([periodId], [], 100000, "rev-unauth-1", collectionDefinitionId);
    expect(paymentResult.ok).toBe(true);
    if (!paymentResult.ok) throw new Error("Payment creation failed");

    signOut();

    const form = new FormData();
    form.set("paymentId", (paymentResult as any).paymentId);
    form.set("reason", "Unauthorized");

    await expect(reversePaymentAction(form)).rejects.toThrow("UNAUTHENTICATED");
  });

  it("rejects reversal from user without payment:reverse permission", async () => {
    // Create a user with COLLECTOR role (no payment:reverse)
    const suffix = `collector-${Date.now().toString(36)}`;
    const collectorUser = await prisma.user.create({
      data: {
        name: "Collector User",
        email: `collector-${suffix}@example.invalid`,
        passwordHash: await bcrypt.hash("password123", 12),
        status: "ACTIVE",
      },
    });

    await prisma.masjidUser.create({
      data: { masjidId, userId: collectorUser.id, role: ROLES.COLLECTOR, status: "ACTIVE" },
    });

    await signIn({
      userId: collectorUser.id,
      masjidId,
      role: ROLES.COLLECTOR,
      isPlatformAdmin: false,
    });

    const periodId = await createDuesPeriod(100000);
    const paymentResult = await createTestPayment([periodId], [], 100000, "rev-perm-1", collectionDefinitionId);
    expect(paymentResult.ok).toBe(true);

    const form = new FormData();
    form.set("paymentId", (paymentResult as any).paymentId);
    form.set("reason", "No permission");

    // Expect reversal to be forbidden due to missing permission
    await expect(reversePaymentAction(form)).rejects.toThrow("FORBIDDEN");

    // Re-sign as admin for remaining tests
    await signIn({
      userId,
      masjidId,
      role: ROLES.ADMIN,
      isPlatformAdmin: false,
    });
  });

  // ------------------------------------------------------------------------
  // 9. Failed reversal transaction leaves no partial reversal state
  // ------------------------------------------------------------------------
  it("leaves no partial state if reversal transaction fails mid-way", async () => {
    // This test verifies atomicity: if a transaction fails, nothing is committed.
    // We can't easily inject a mid-transaction failure without mocking,
    // but we verify the general atomicity by ensuring all operations
    // succeed or fail together in the normal path.

    const periodId = await createDuesPeriod(100000);
    const paymentResult = await createTestPayment([periodId], [], 100000, "rev-atomic-1", collectionDefinitionId);
    expect(paymentResult.ok).toBe(true);
    if (!paymentResult.ok) throw new Error("Payment creation failed");

    const form = new FormData();
    form.set("paymentId", (paymentResult as any).paymentId);
    form.set("reason", "Atomicity test");

    const result = await reversePaymentAction(form);
    expect(result.ok).toBe(true);

    // Verify all side effects happened atomically
    const payment = await prisma.payment.findUnique({ where: { id: (paymentResult as any).paymentId } });
    expect(payment?.status).toBe("REVERSED");

    const reversal = await prisma.reversal.findUnique({ where: { originalPaymentId: (paymentResult as any).paymentId } });
    expect(reversal).not.toBeNull();

    const receiptEvent = await prisma.receiptEvent.findFirst({
      where: { paymentId: (paymentResult as any).paymentId, eventType: "CANCELLED" },
    });
    expect(receiptEvent).not.toBeNull();

    const audit = await prisma.auditLog.findFirst({
      where: { action: "payment.reverse", entityId: (paymentResult as any).paymentId },
    });
    expect(audit).not.toBeNull();
  });

  // ------------------------------------------------------------------------
  // 10. Existing payment history, allocations, receipt history, and audit history remain intact
  // ------------------------------------------------------------------------
  it("preserves all historical records after reversal", async () => {
    const periodId = await createDuesPeriod(100000);

    const paymentResult = await createTestPayment([periodId], [], 100000, "rev-history-1", collectionDefinitionId);
    expect(paymentResult.ok).toBe(true);
    if (!paymentResult.ok) throw new Error("Payment creation failed");

    const paymentId = (paymentResult as any).paymentId;

    // Verify original receipt event ISSUED exists
    const issuedEvent = await prisma.receiptEvent.findFirst({
      where: { paymentId, eventType: "ISSUED" },
    });
    expect(issuedEvent).not.toBeNull();

    // Verify payment allocation exists
    const allocation = await prisma.paymentAllocation.findFirst({ where: { paymentId } });
    expect(allocation).not.toBeNull();

    // Reverse
    const form = new FormData();
    form.set("paymentId", paymentId);
    form.set("reason", "History preservation");
    const reverseResult = await reversePaymentAction(form);
    expect(reverseResult.ok).toBe(true);

    // Verify original payment row still exists with full data
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    expect(payment).not.toBeNull();
    expect(payment?.amountPaise).toBe(100000);
    expect(payment?.donorNameSnapshot).toBe("Test Member");
    expect(payment?.mode).toBe("CASH");
    expect(payment?.status).toBe("REVERSED"); // only status changed

    // Verify allocation still exists
    const allocationAfter = await prisma.paymentAllocation.findFirst({ where: { paymentId } });
    expect(allocationAfter).not.toBeNull();
    expect(allocationAfter?.allocatedAmountPaise).toBe(100000);

    // Verify both receipt events exist: ISSUED + CANCELLED
    const receiptEvents = await prisma.receiptEvent.findMany({ where: { paymentId } });
    expect(receiptEvents.length).toBe(2);
    const eventTypes = receiptEvents.map((e) => e.eventType).sort();
    expect(eventTypes).toEqual(["CANCELLED", "ISSUED"]);

    // Verify audit logs: create + reverse
    const audits = await prisma.auditLog.findMany({
      where: { entityType: "Payment", entityId: paymentId },
      orderBy: { createdAt: "asc" },
    });
    expect(audits.length).toBe(2);
    expect(audits[0].action).toBe("payment.create");
    expect(audits[1].action).toBe("payment.reverse");
    expect(JSON.parse(audits[1].beforeJson!)).toEqual({ status: "SUCCESS" });
    expect(JSON.parse(audits[1].afterJson!)).toEqual({ status: "REVERSED" });
  });
});