import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getFirstCollectionDefinition } from "./helpers";
import testDbReady from "./setup";

let masjidId = "";
let memberId = "";
let collectionDefinitionId = "";
let userId = "";
let planId = "";

async function makePeriod(expected: number, dayOffset = 0) {
  const baseDate = new Date("2094-01-01T00:00:00+05:30");
  const periodStart = new Date(baseDate);
  periodStart.setDate(baseDate.getDate() + dayOffset * 35);

  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodStart.getDate() + 30);

  const dueDate = new Date(periodEnd);
  dueDate.setDate(periodEnd.getDate() + 10);

  return prisma.duesPeriod.create({
    data: {
      masjidId,
      collectionDefinitionId,
      planId,
      memberId,
      periodStart,
      periodEnd,
      dueDate,
      expectedAmountPaise: expected,
    },
  });
}

async function makePayment(amount: number, idempotencyKey: string) {
  return prisma.payment.create({
    data: {
      masjidId,
      receiptNo: `T-${idempotencyKey}`,
      donorMemberId: memberId,
      donorNameSnapshot: "Test Donor",
      paymentDate: new Date("2094-01-15T00:00:00+05:30"),
      amountPaise: amount,
      mode: "CASH",
      status: "SUCCESS",
      enteredBy: userId,
      idempotencyKey,
    },
  });
}

beforeAll(async () => {
  await testDbReady;

  const masjid = await prisma.masjid.findFirst({ where: { slug: "test-masjid" } });
  if (!masjid) throw new Error("Seed first - test-masjid not found");
  masjidId = masjid.id;
  const user = await prisma.user.findFirst();
  if (!user) throw new Error("Seed first");
  userId = user.id;
  const member = await prisma.member.create({ data: { masjidId, memberNo: `M-${Date.now()}`, fullName: "Test Member" } });
  memberId = member.id;

  const collectionDefinition = await getFirstCollectionDefinition(masjidId);
  if (!collectionDefinition) throw new Error("Collection definitions not seeded");
  collectionDefinitionId = collectionDefinition.id;

  // Create a contribution plan for the member
  const plan = await prisma.contributionPlan.create({
    data: {
      masjidId,
      memberId,
      collectionDefinitionId,
      frequency: "MONTHLY",
      amountPaise: 100000,
      startDate: new Date("2094-01-01T00:00:00+05:30"),
      dueDay: 10,
    },
  });
  planId = plan.id;
});

afterAll(async () => {
  await prisma.paymentAllocation.deleteMany({ where: { masjidId } });
  await prisma.payment.deleteMany({ where: { masjidId } });
  await prisma.duesPeriod.deleteMany({ where: { masjidId, memberId } });
  await prisma.contributionPlan.deleteMany({ where: { id: planId } });
  await prisma.member.deleteMany({ where: { masjidId } });
  await prisma.$disconnect();
});

describe("Payment Allocation Concurrency (Direct DB Simulation)", () => {
  beforeEach(async () => {
    await prisma.paymentAllocation.deleteMany({ where: { masjidId } });
    await prisma.payment.deleteMany({ where: { masjidId, donorMemberId: memberId } });
    await prisma.duesPeriod.deleteMany({ where: { masjidId, memberId } });
  });

  it("prevents concurrent over-allocation with row-level locking", async () => {
    const period = await makePeriod(100000);

    // Simulate 2 concurrent transactions trying to allocate 80000 each (total 160000 > 100000)
    // Each transaction mimics the locking logic in createPaymentAction
    async function attemptAllocation(paymentAmount: number, allocationAmount: number, key: string) {
      return prisma.$transaction(async (tx) => {
        // Lock the dues period row (simulates FOR UPDATE)
        const periodLock = await tx.$queryRaw<{ id: string; masjidId: string; expectedAmountPaise: number }[]>`
          SELECT id, "masjidId", "expectedAmountPaise"
          FROM "DuesPeriod"
          WHERE id = ${period.id}
          FOR UPDATE
        `;

        if (periodLock.length === 0) throw new Error("Dues period not found");
        if (periodLock[0].masjidId !== masjidId) throw new Error("Dues period does not belong to this Masjid");

        // Calculate already allocated amount
        const allocatedSum = await tx.paymentAllocation.aggregate({
          where: {
            duesPeriodId: period.id,
            payment: { status: "SUCCESS" },
          },
          _sum: { allocatedAmountPaise: true },
        });

        const alreadyAllocated = allocatedSum._sum.allocatedAmountPaise ?? 0;
        const remaining = periodLock[0].expectedAmountPaise - alreadyAllocated;

        if (allocationAmount > remaining) {
          throw new Error(`Allocation exceeds outstanding balance for due period. Outstanding: ${remaining} paise`);
        }

        // Create payment and allocation
        const payment = await tx.payment.create({
          data: {
            masjidId,
            receiptNo: `T-${key}`,
            donorMemberId: memberId,
            donorNameSnapshot: "Test Donor",
            paymentDate: new Date("2094-01-15T00:00:00+05:30"),
            amountPaise: paymentAmount,
            mode: "CASH",
            status: "SUCCESS",
            enteredBy: userId,
            idempotencyKey: key,
          },
        });

        await tx.paymentAllocation.create({
          data: {
            masjidId,
            paymentId: payment.id,
            duesPeriodId: period.id,
            collectionDefinitionId,
            allocatedAmountPaise: allocationAmount,
          },
        });

        return { ok: true, paymentId: payment.id };
      });
    }

    // Launch both transactions concurrently
    const promises = [
      attemptAllocation(80000, 80000, "conc-1"),
      attemptAllocation(80000, 80000, "conc-2"),
    ];

    const results = await Promise.allSettled(promises);

    const succeeded = results.filter(r => r.status === "fulfilled");
    const failed = results.filter(r => r.status === "rejected");

    // Only one should succeed due to row-level locking
    expect(succeeded.length).toBe(1);
    expect(failed.length).toBe(1);
    expect(failed[0].reason.message).toMatch(/exceeds outstanding balance/i);

    // Verify exactly 80000 was allocated
    const allocatedSum = await prisma.paymentAllocation.aggregate({
      where: { duesPeriodId: period.id },
      _sum: { allocatedAmountPaise: true },
    });
    expect(allocatedSum._sum.allocatedAmountPaise).toBe(80000);
  });

  it("allows concurrent allocations to different due periods", async () => {
    const period1 = await makePeriod(50000, 0);
    const period2 = await makePeriod(30000, 1);

    async function attemptAllocation(paymentAmount: number, allocationAmount: number, periodId: string, key: string) {
      return prisma.$transaction(async (tx) => {
        const periodLock = await tx.$queryRaw<{ id: string; masjidId: string; expectedAmountPaise: number }[]>`
          SELECT id, "masjidId", "expectedAmountPaise"
          FROM "DuesPeriod"
          WHERE id = ${periodId}
          FOR UPDATE
        `;

        if (periodLock.length === 0) throw new Error("Dues period not found");
        if (periodLock[0].masjidId !== masjidId) throw new Error("Dues period does not belong to this Masjid");

        const allocatedSum = await tx.paymentAllocation.aggregate({
          where: {
            duesPeriodId: periodId,
            payment: { status: "SUCCESS" },
          },
          _sum: { allocatedAmountPaise: true },
        });

        const alreadyAllocated = allocatedSum._sum.allocatedAmountPaise ?? 0;
        const remaining = periodLock[0].expectedAmountPaise - alreadyAllocated;

        if (allocationAmount > remaining) {
          throw new Error(`Allocation exceeds outstanding balance for due period. Outstanding: ${remaining} paise`);
        }

        const payment = await tx.payment.create({
          data: {
            masjidId,
            receiptNo: `T-${key}`,
            donorMemberId: memberId,
            donorNameSnapshot: "Test Donor",
            paymentDate: new Date("2094-01-15T00:00:00+05:30"),
            amountPaise: paymentAmount,
            mode: "CASH",
            status: "SUCCESS",
            enteredBy: userId,
            idempotencyKey: key,
          },
        });

        await tx.paymentAllocation.create({
          data: {
            masjidId,
            paymentId: payment.id,
            duesPeriodId: periodId,
            collectionDefinitionId,
            allocatedAmountPaise: allocationAmount,
          },
        });

        return { ok: true, paymentId: payment.id };
      });
    }

    // Launch both transactions concurrently - they lock different periods
    const promises = [
      attemptAllocation(50000, 50000, period1.id, "diff-1"),
      attemptAllocation(30000, 30000, period2.id, "diff-2"),
    ];

    const results = await Promise.allSettled(promises);

    // Both should succeed since they lock different rows
    const succeeded = results.filter(r => r.status === "fulfilled");
    const failed = results.filter(r => r.status === "rejected");

    expect(succeeded.length).toBe(2);
    expect(failed.length).toBe(0);

    // Verify allocations
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

  it("prevents concurrent over-allocation for collection events with assignments", async () => {
    const event = await prisma.collectionEvent.create({
      data: {
        masjidId,
        collectionDefinitionId,
        name: "Test Event",
        startDate: new Date("2094-01-01T00:00:00+05:30"),
        dueDate: new Date("2094-02-10T00:00:00+05:30"),
        expectedAmountPaise: 100000,
        status: "OPEN",
      },
    });

    const assignment = await prisma.collectionEventAssignment.create({
      data: {
        masjidId,
        eventId: event.id,
        memberId,
        expectedAmountPaise: 100000,
        status: "PENDING",
      },
    });

    async function attemptEventAllocation(paymentAmount: number, allocationAmount: number, key: string) {
      return prisma.$transaction(async (tx) => {
        // Lock the collection event
        const eventLock = await tx.$queryRaw<{ id: string; masjidId: string; expectedAmountPaise: number | null }[]>`
          SELECT id, "masjidId", "expectedAmountPaise"
          FROM "CollectionEvent"
          WHERE id = ${event.id}
          FOR UPDATE
        `;

        if (eventLock.length === 0) throw new Error("Collection event not found");
        if (eventLock[0].masjidId !== masjidId) throw new Error("Collection event does not belong to this Masjid");

        // Lock the assignment
        const assignmentLock = await tx.$queryRaw<{ id: string; eventId: string; memberId: string; expectedAmountPaise: number }[]>`
          SELECT id, "eventId", "memberId", "expectedAmountPaise"
          FROM "CollectionEventAssignment"
          WHERE "eventId" = ${event.id} AND "memberId" = ${memberId}
          FOR UPDATE
        `;

        if (assignmentLock.length === 0) throw new Error("Assignment not found");

        // Calculate already allocated for this member+event
        const allocatedSum = await tx.paymentAllocation.aggregate({
          where: {
            collectionEventId: event.id,
            payment: { status: "SUCCESS", donorMemberId: memberId },
          },
          _sum: { allocatedAmountPaise: true },
        });

        const alreadyAllocated = allocatedSum._sum.allocatedAmountPaise ?? 0;
        const remaining = assignmentLock[0].expectedAmountPaise - alreadyAllocated;

        if (allocationAmount > remaining) {
          throw new Error(`Allocation exceeds outstanding balance for collection event assignment. Outstanding: ${remaining} paise`);
        }

        const payment = await tx.payment.create({
          data: {
            masjidId,
            receiptNo: `T-${key}`,
            donorMemberId: memberId,
            donorNameSnapshot: "Test Donor",
            paymentDate: new Date("2094-01-15T00:00:00+05:30"),
            amountPaise: paymentAmount,
            mode: "CASH",
            status: "SUCCESS",
            enteredBy: userId,
            idempotencyKey: key,
          },
        });

        await tx.paymentAllocation.create({
          data: {
            masjidId,
            paymentId: payment.id,
            collectionEventId: event.id,
            collectionDefinitionId,
            allocatedAmountPaise: allocationAmount,
          },
        });

        return { ok: true, paymentId: payment.id };
      });
    }

    // Launch both transactions concurrently
    const promises = [
      attemptEventAllocation(80000, 80000, "conc-event-1"),
      attemptEventAllocation(80000, 80000, "conc-event-2"),
    ];

    const results = await Promise.allSettled(promises);

    const succeeded = results.filter(r => r.status === "fulfilled");
    const failed = results.filter(r => r.status === "rejected");

    // Only one should succeed due to row-level locking
    expect(succeeded.length).toBe(1);
    expect(failed.length).toBe(1);
    expect(failed[0].reason.message).toMatch(/exceeds outstanding balance/i);

    // Verify exactly 80000 was allocated
    const allocatedSum = await prisma.paymentAllocation.aggregate({
      where: { collectionEventId: event.id, payment: { donorMemberId: memberId } },
      _sum: { allocatedAmountPaise: true },
    });
    expect(allocatedSum._sum.allocatedAmountPaise).toBe(80000);

    await prisma.collectionEventAssignment.delete({ where: { id: assignment.id } });
    await prisma.collectionEvent.delete({ where: { id: event.id } });
  });

  it("prevents concurrent over-allocation for walk-in collection events (event total)", async () => {
    const event = await prisma.collectionEvent.create({
      data: {
        masjidId,
        collectionDefinitionId,
        name: "Walk-in Event",
        startDate: new Date("2094-01-01T00:00:00+05:30"),
        dueDate: new Date("2094-02-10T00:00:00+05:30"),
        expectedAmountPaise: 100000,
        status: "OPEN",
      },
    });

    async function attemptWalkInAllocation(paymentAmount: number, allocationAmount: number, key: string) {
      return prisma.$transaction(async (tx) => {
        // Lock the collection event
        const eventLock = await tx.$queryRaw<{ id: string; masjidId: string; expectedAmountPaise: number | null }[]>`
          SELECT id, "masjidId", "expectedAmountPaise"
          FROM "CollectionEvent"
          WHERE id = ${event.id}
          FOR UPDATE
        `;

        if (eventLock.length === 0) throw new Error("Collection event not found");
        if (eventLock[0].masjidId !== masjidId) throw new Error("Collection event does not belong to this Masjid");
        if (eventLock[0].expectedAmountPaise === null) throw new Error("Event has no expected amount set");

        // Calculate already allocated for this event (all payments)
        const allocatedSum = await tx.paymentAllocation.aggregate({
          where: {
            collectionEventId: event.id,
            payment: { status: "SUCCESS" },
          },
          _sum: { allocatedAmountPaise: true },
        });

        const alreadyAllocated = allocatedSum._sum.allocatedAmountPaise ?? 0;
        const remaining = eventLock[0].expectedAmountPaise - alreadyAllocated;

        if (allocationAmount > remaining) {
          throw new Error(`Allocation exceeds outstanding balance for collection event. Outstanding: ${remaining} paise`);
        }

        const payment = await tx.payment.create({
          data: {
            masjidId,
            receiptNo: `T-${key}`,
            donorMemberId: null, // walk-in
            donorNameSnapshot: "Walk-in Donor",
            paymentDate: new Date("2094-01-15T00:00:00+05:30"),
            amountPaise: paymentAmount,
            mode: "CASH",
            status: "SUCCESS",
            enteredBy: userId,
            idempotencyKey: key,
          },
        });

        await tx.paymentAllocation.create({
          data: {
            masjidId,
            paymentId: payment.id,
            collectionEventId: event.id,
            collectionDefinitionId,
            allocatedAmountPaise: allocationAmount,
          },
        });

        return { ok: true, paymentId: payment.id };
      });
    }

    // Launch both transactions concurrently
    const promises = [
      attemptWalkInAllocation(80000, 80000, "conc-walkin-1"),
      attemptWalkInAllocation(80000, 80000, "conc-walkin-2"),
    ];

    const results = await Promise.allSettled(promises);

    const succeeded = results.filter(r => r.status === "fulfilled");
    const failed = results.filter(r => r.status === "rejected");

    // Only one should succeed due to row-level locking
    expect(succeeded.length).toBe(1);
    expect(failed.length).toBe(1);
    expect(failed[0].reason.message).toMatch(/exceeds outstanding balance/i);

    // Verify exactly 80000 was allocated
    const allocatedSum = await prisma.paymentAllocation.aggregate({
      where: { collectionEventId: event.id },
      _sum: { allocatedAmountPaise: true },
    });
    expect(allocatedSum._sum.allocatedAmountPaise).toBe(80000);

    await prisma.collectionEvent.delete({ where: { id: event.id } });
  });
});