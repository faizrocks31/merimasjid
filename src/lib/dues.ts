import { prisma } from "@/lib/db";
import { addMonths, istParts, monthPeriod } from "@/lib/dates";
import { FREQUENCIES, PERIOD_STATUS, EVENT_STATUS } from "@/lib/constants";
import { notifyDuesReminder } from "@/lib/notifications";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** Number of months covered by one period for a frequency. */
export function monthsPerPeriod(frequency: string): number {
  switch (frequency) {
    case FREQUENCIES.MONTHLY:
      return 1;
    case FREQUENCIES.SEMI_ANNUAL:
      return 6;
    case FREQUENCIES.ANNUAL:
      return 12;
    case FREQUENCIES.ONE_TIME:
      return 0;
    default:
      return 1;
  }
}

type PlanLike = {
  id: string;
  masjidId: string;
  memberId: string;
  frequency: string;
  amountPaise: number;
  startDate: Date;
  endDate: Date | null;
  dueDay: number;
  graceDays: number;
};

/**
 * Builds the period boundaries for a plan up to `horizon` (default: 12 months
 * past the later of startDate and today). Idempotent: the unique constraint on
 * (planId, periodStart, periodEnd) means re-running never duplicates a period.
 */
export function buildPeriods(
  plan: PlanLike,
  horizon: Date = addMonths(new Date(), 12),
): Array<{ periodStart: Date; periodEnd: Date; dueDate: Date; expectedAmountPaise: number }> {
  const out: Array<{ periodStart: Date; periodEnd: Date; dueDate: Date; expectedAmountPaise: number }> = [];

  if (plan.frequency === FREQUENCIES.ONE_TIME) {
    const start = plan.startDate;
    const end = plan.endDate ?? start;
    out.push({
      periodStart: start,
      periodEnd: end,
      dueDate: new Date(start.getTime() + plan.graceDays * 86400000),
      expectedAmountPaise: plan.amountPaise,
    });
    return out;
  }

  const step = monthsPerPeriod(plan.frequency);
  const limit = plan.endDate && plan.endDate < horizon ? plan.endDate : horizon;

  let cursor = plan.startDate;
  let guard = 0;
  while (cursor <= limit && guard < 240) {
    guard++;
    const startParts = istPartsOf(cursor);
    const { start } = monthPeriod(startParts.year, startParts.month);
    // Period spans `step` months from the plan's start month.
    const spanEnd = addMonths(start, step);
    spanEnd.setUTCDate(spanEnd.getUTCDate() - 1);

    const dueDate = new Date(
      Date.UTC(startParts.year, startParts.month - 1, Math.min(plan.dueDay, 28)) -
        5.5 * 60 * 60 * 1000 +
        plan.graceDays * 86400000,
    );

    out.push({
      periodStart: start,
      periodEnd: spanEnd,
      dueDate,
      expectedAmountPaise: plan.amountPaise,
    });

    cursor = addMonths(start, step);
  }
  return out;
}

function istPartsOf(d: Date): { year: number; month: number } {
  const { year, month } = istParts(d);
  return { year, month };
}

/**
 * Ensures due periods exist for a plan and refreshes each period's status from
 * its successful allocations. Safe to call repeatedly.
 */
export async function generateDuesPeriods(planId: string): Promise<number> {
  const plan = await prisma.contributionPlan.findUnique({ where: { id: planId } });
  if (!plan || plan.status !== "ACTIVE") return 0;

  const periods = buildPeriods(plan);
  if (periods.length === 0) return 0;

  try {
    const result = await prisma.duesPeriod.createMany({
      data: periods.map((p) => ({
        masjidId: plan.masjidId,
        collectionDefinitionId: plan.collectionDefinitionId,
        planId: plan.id,
        memberId: plan.memberId,
        periodStart: p.periodStart,
        periodEnd: p.periodEnd,
        dueDate: p.dueDate,
        expectedAmountPaise: p.expectedAmountPaise,
      })),
      skipDuplicates: true,
    });
    return result.count;
  } catch (err) {
    console.error(`generateDuesPeriods failed for plan ${planId}:`, err);
    throw err;
  }
}

/** Recomputes a due period's status from its valid (non-reversed) allocations. */
export async function recomputePeriodStatus(tx: Tx, duesPeriodId: string): Promise<void> {
  const period = await tx.duesPeriod.findUnique({
    where: { id: duesPeriodId },
    include: {
      allocations: { include: { payment: { select: { status: true } } } },
    },
  });
  if (!period) return;

  const allocated = period.allocations
    .filter((a) => a.payment.status === "SUCCESS")
    .reduce((sum, a) => sum + a.allocatedAmountPaise, 0);

  let status: string = PERIOD_STATUS.PENDING;
  if (allocated >= period.expectedAmountPaise) status = PERIOD_STATUS.PAID;
  else if (allocated > 0) status = PERIOD_STATUS.PARTIAL;

  if (period.status === PERIOD_STATUS.WAIVED) status = PERIOD_STATUS.WAIVED;

  await tx.duesPeriod.update({ where: { id: period.id }, data: { status } });
}

/**
 * Recomputes a collection event assignment's status.
 *
 * An assignment is settled by the allocations that point at the same event
 * *and* were made by that assignment's member. Walk-in donors and members
 * who paid on someone else's behalf therefore do not settle a household row.
 */
export async function recomputeAssignmentStatus(
  tx: Tx,
  assignmentId: string
): Promise<void> {
  const assignment = await tx.collectionEventAssignment.findUnique({
    where: { id: assignmentId },
    select: { id: true, eventId: true, memberId: true, expectedAmountPaise: true, status: true },
  });
  if (!assignment) return;

  const allocated = await sumEventAllocationsForMember(tx, assignment.eventId, assignment.memberId);

  let status: string = "PENDING";
  if (allocated >= assignment.expectedAmountPaise) status = "PAID";
  else if (allocated > 0) status = "PARTIAL";

  if (assignment.status === "WAIVED") status = "WAIVED";

  await tx.collectionEventAssignment.update({
    where: { id: assignment.id },
    data: { status },
  });
}

/**
 * Total successfully-allocated paise against an event for one member.
 * Reversed payments do not count.
 */
export async function sumEventAllocationsForMember(
  tx: Tx,
  eventId: string,
  memberId: string
): Promise<number> {
  const agg = await tx.paymentAllocation.aggregate({
    where: {
      collectionEventId: eventId,
      payment: { status: "SUCCESS", donorMemberId: memberId },
    },
    _sum: { allocatedAmountPaise: true },
  });
  return agg._sum.allocatedAmountPaise ?? 0;
}

/** Recomputes a collection event's overall status from its assignments and allocations.
 *
 * Guard: once an event reaches COMPLETED it must never be downgraded to OPEN
 * by a later reversal or assignment removal. The only allowed transition from
 * COMPLETED is to CANCELLED (handled by explicit admin action) or SCHEDULED
 * (full reversal - no payments at all).
 */
export async function recomputeEventStatus(
  tx: Tx,
  eventId: string
): Promise<void> {
  const event = await tx.collectionEvent.findUnique({
    where: { id: eventId },
    include: {
      assignments: true,
      allocations: { include: { payment: { select: { status: true } } } },
    },
  });
  if (!event) return;

  // If already CANCELLED, preserve it
  if (event.status === EVENT_STATUS.CANCELLED) {
    return;
  }

  // Total expected: sum of assignments if household-wise, else event's expectedAmountPaise
  const hasAssignments = event.assignments.length > 0;
  const expectedPaise = hasAssignments
    ? event.assignments.reduce((s, a) => s + a.expectedAmountPaise, 0)
    : (event.expectedAmountPaise ?? 0);

  // Total received from all successful allocations to this event
  const receivedPaise = event.allocations
    .filter((a) => a.payment.status === "SUCCESS")
    .reduce((s, a) => s + a.allocatedAmountPaise, 0);

  // Count paid assignments
  const paidAssignments = event.assignments.filter((a) => a.status === "PAID").length;

  // Compute tentative status WITHOUT considering the COMPLETED→OPEN guard
  let tentativeStatus: string = EVENT_STATUS.SCHEDULED;
  if (expectedPaise > 0 && receivedPaise >= expectedPaise && paidAssignments === event.assignments.length) {
    tentativeStatus = EVENT_STATUS.COMPLETED;
  } else if (receivedPaise > 0 || (hasAssignments && paidAssignments > 0)) {
    tentativeStatus = EVENT_STATUS.OPEN;
  }

  // Guard: never downgrade COMPLETED → OPEN.
  // If the event was COMPLETED and the computed status would be OPEN, keep it COMPLETED.
  // Allow COMPLETED → SCHEDULED (full reversal - no payments at all).
  let finalStatus: string = tentativeStatus;
  if (event.status === EVENT_STATUS.COMPLETED) {
    if (tentativeStatus === EVENT_STATUS.OPEN) {
      finalStatus = EVENT_STATUS.COMPLETED;
    } else if (tentativeStatus === EVENT_STATUS.SCHEDULED && receivedPaise === 0) {
      // Full reversal - allow transition to SCHEDULED
      finalStatus = EVENT_STATUS.SCHEDULED;
    } else {
      finalStatus = EVENT_STATUS.COMPLETED;
    }
  }

  // Only update if status actually changes
  if (finalStatus !== event.status) {
    await tx.collectionEvent.update({
      where: { id: event.id },
      data: { status: finalStatus },
    });
  }
}

/** Generates periods for every active plan of a masjid. Used by a settings action. */
export async function generateAllDuesForMasjid(masjidId: string): Promise<number> {
  const plans = await prisma.contributionPlan.findMany({
    where: { masjidId, status: "ACTIVE" },
    select: { id: true },
  });
  let total = 0;
  for (const p of plans) total += await generateDuesPeriods(p.id);
  return total;
}

/**
 * Sends dues reminders for all pending/partial periods due within the next N days.
 * This should be called by a cron job (e.g., daily).
 */
export async function sendDuesReminders(masjidId: string, daysAhead: number = 3): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() + daysAhead);

  const periods = await prisma.duesPeriod.findMany({
    where: {
      masjidId,
      status: { in: ["PENDING", "PARTIAL"] },
      dueDate: { lte: cutoffDate },
    },
    include: {
      plan: { include: { collectionDefinition: { select: { name: true } } } },
      member: { select: { id: true, fullName: true } },
      allocations: {
        include: { payment: { select: { status: true } } },
      },
    },
  });

  let sent = 0;
  for (const period of periods) {
    const allocated = period.allocations
      ?.filter((a) => a.payment?.status === "SUCCESS")
      .reduce((sum: number, a) => sum + a.allocatedAmountPaise, 0) ?? 0;
    const outstanding = Math.max(period.expectedAmountPaise - allocated, 0);

    if (outstanding > 0 && period.member) {
      const periodLabel = `${period.plan?.collectionDefinition?.name ?? "—"} (${period.periodStart.toISOString().split("T")[0]} - ${period.periodEnd?.toISOString().split("T")[0] ?? period.periodStart.toISOString().split("T")[0]})`;
      await notifyDuesReminder({
        masjidId,
        memberId: period.member.id,
        amount: outstanding,
        category: period.plan?.collectionDefinition?.name ?? "—",
        dueDate: period.dueDate,
        period: periodLabel,
      });
      sent++;
    }
  }
  return sent;
}
