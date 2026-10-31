import "server-only";
import { prisma } from "@/lib/db";
import { addDays, addMonths, financialYearRange, monthPeriod, startOfToday } from "@/lib/dates";

export type DateRange = { from: Date; toExclusive: Date };

/** Net collection is gross SUCCESS payments minus reversals in the range. */
export async function collectionSummary(masjidId: string, range: DateRange) {
  const [gross, reversed] = await Promise.all([
    prisma.payment.aggregate({
      where: { masjidId, paymentDate: { gte: range.from, lt: range.toExclusive } },
      _sum: { amountPaise: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: {
        masjidId,
        status: "REVERSED",
        paymentDate: { gte: range.from, lt: range.toExclusive },
      },
      _sum: { amountPaise: true },
      _count: true,
    }),
  ]);

  // Gross includes reversed rows so that "gross − reversals = net" always
  // reconciles with the transaction register.
  const grossPaise = gross._sum.amountPaise ?? 0;
  const reversedPaise = reversed._sum.amountPaise ?? 0;

  return {
    grossPaise,
    reversedPaise,
    netPaise: grossPaise - reversedPaise,
    count: gross._count,
    reversedCount: reversed._count,
  };
}

export async function expenseSummary(masjidId: string, range: DateRange) {
  const agg = await prisma.expense.aggregate({
    where: {
      masjidId,
      approvalStatus: "APPROVED",
      date: { gte: range.from, lt: range.toExclusive },
    },
    _sum: { amountPaise: true },
    _count: true,
  });
  return { totalPaise: agg._sum.amountPaise ?? 0, count: agg._count };
}

/** Outstanding = sum over due periods of max(expected − valid allocations, 0). */
export async function outstandingDues(masjidId: string) {
  const periods = await prisma.duesPeriod.findMany({
    where: { masjidId, status: { in: ["PENDING", "PARTIAL"] } },
    select: {
      expectedAmountPaise: true,
      allocations: {
        where: { payment: { status: "SUCCESS" } },
        select: { allocatedAmountPaise: true },
      },
    },
  });

  let total = 0;
  let periodsCount = 0;
  for (const p of periods) {
    const allocated = p.allocations.reduce((s, a) => s + a.allocatedAmountPaise, 0);
    const remaining = Math.max(p.expectedAmountPaise - allocated, 0);
    if (remaining > 0) {
      total += remaining;
      periodsCount++;
    }
  }
  return { totalPaise: total, periods: periodsCount };
}

export function ranges() {
  const today = startOfToday();
  const now = new Date();
  const month = monthPeriod(
    Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric" }).format(now)),
    Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", month: "2-digit" }).format(now)),
  );
  return {
    today: { from: today, toExclusive: addDays(today, 1) },
    month: { from: month.start, toExclusive: addDays(month.end, 1) },
    year: financialYearRange(now, 4),
  };
}

export async function monthlyTrend(masjidId: string, months = 6) {
  const now = new Date();
  const buckets: { label: string; grossPaise: number; netPaise: number; expensesPaise: number }[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const anchor = addMonths(now, -i);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
    }).formatToParts(anchor);
    const year = Number(parts.find((p) => p.type === "year")?.value);
    const month = Number(parts.find((p) => p.type === "month")?.value);
    const { start, end } = monthPeriod(year, month);
    const range = { from: start, toExclusive: addDays(end, 1) };

    const [c, e] = await Promise.all([collectionSummary(masjidId, range), expenseSummary(masjidId, range)]);
    buckets.push({
      label: new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", month: "short" }).format(start),
      grossPaise: c.grossPaise,
      netPaise: c.netPaise,
      expensesPaise: e.totalPaise,
    });
  }
  return buckets;
}

export async function categoryTotals(masjidId: string, range: DateRange) {
  const rows = await prisma.paymentAllocation.groupBy({
    by: ["categoryId"],
    where: {
      masjidId,
      payment: { status: "SUCCESS", paymentDate: { gte: range.from, lt: range.toExclusive } },
    },
    _sum: { allocatedAmountPaise: true },
  });

  const categories = await prisma.contributionCategory.findMany({
    where: { masjidId },
    select: { id: true, name: true, restrictedPurpose: true },
  });
  const byId = new Map(categories.map((c) => [c.id, c]));

  return rows
    .map((r) => ({
      name: byId.get(r.categoryId)?.name ?? "Unknown",
      restricted: byId.get(r.categoryId)?.restrictedPurpose ?? false,
      totalPaise: r._sum.allocatedAmountPaise ?? 0,
    }))
    .sort((a, b) => b.totalPaise - a.totalPaise);
}

/**
 * Event-level collection totals.
 *
 * Each row is one collection event, split into what was actually received
 * against that event and what is still outstanding. Only allocations that
 * point at the event count here, so a payment is never double-counted
 * between the category report and the event report.
 */
export async function eventTotals(masjidId: string, range: DateRange) {
  const events = await prisma.collectionEvent.findMany({
    where: { masjidId },
    orderBy: { dueDate: "desc" },
    select: {
      id: true,
      name: true,
      status: true,
      startDate: true,
      endDate: true,
      dueDate: true,
      applicableMonth: true,
      applicableYear: true,
      expectedAmountPaise: true,
      category: { select: { id: true, name: true } },
      assignments: {
        select: { id: true, expectedAmountPaise: true, status: true },
      },
      allocations: {
        where: { payment: { status: "SUCCESS", paymentDate: { gte: range.from, lt: range.toExclusive } } },
        select: { allocatedAmountPaise: true },
      },
    },
  });

  return events.map((e) => {
    const receivedPaise = e.allocations.reduce((s, a) => s + a.allocatedAmountPaise, 0);
    // For household-wise events the expectation is the sum of the assignments;
    // for a plain event it is the single expected amount on the event itself.
    const assignedPaise = e.assignments.reduce((s, a) => s + a.expectedAmountPaise, 0);
    const expectedPaise = e.assignments.length > 0 ? assignedPaise : (e.expectedAmountPaise ?? 0);
    return {
      id: e.id,
      name: e.name,
      categoryName: e.category.name,
      status: e.status,
      startDate: e.startDate,
      endDate: e.endDate,
      dueDate: e.dueDate,
      applicableMonth: e.applicableMonth,
      applicableYear: e.applicableYear,
      expectedPaise,
      receivedPaise,
      outstandingPaise: Math.max(expectedPaise - receivedPaise, 0),
      householdCount: e.assignments.length,
      paidHouseholds: e.assignments.filter((a) => a.status === "PAID").length,
    };
  });
}

export async function modeTotals(masjidId: string, range: DateRange) {
  const rows = await prisma.payment.groupBy({
    by: ["mode"],
    where: { masjidId, status: "SUCCESS", paymentDate: { gte: range.from, lt: range.toExclusive } },
    _sum: { amountPaise: true },
    _count: true,
  });
  return rows.map((r) => ({ mode: r.mode, totalPaise: r._sum.amountPaise ?? 0, count: r._count }));
}

export async function collectorTotals(masjidId: string, range: DateRange) {
  const rows = await prisma.payment.groupBy({
    by: ["enteredBy"],
    where: { masjidId, status: "SUCCESS", paymentDate: { gte: range.from, lt: range.toExclusive } },
    _sum: { amountPaise: true },
    _count: true,
  });
  const users = await prisma.user.findMany({
    where: { id: { in: rows.map((r) => r.enteredBy) } },
    select: { id: true, name: true },
  });
  const byId = new Map(users.map((u) => [u.id, u.name]));
  return rows
    .map((r) => ({ name: byId.get(r.enteredBy) ?? "Unknown", totalPaise: r._sum.amountPaise ?? 0, count: r._count }))
    .sort((a, b) => b.totalPaise - a.totalPaise);
}

export async function pendingDueRows(masjidId: string, limit = 200) {
  const periods = await prisma.duesPeriod.findMany({
    where: { masjidId, status: { in: ["PENDING", "PARTIAL"] } },
    include: {
      member: { select: { id: true, fullName: true, memberNo: true, phone: true } },
      allocations: { where: { payment: { status: "SUCCESS" } }, select: { allocatedAmountPaise: true } },
    },
    orderBy: { dueDate: "asc" },
    take: limit,
  });

  return periods
    .map((p) => {
      const allocated = p.allocations.reduce((s, a) => s + a.allocatedAmountPaise, 0);
      return {
        id: p.id,
        memberId: p.member.id,
        memberName: p.member.fullName,
        memberNo: p.member.memberNo,
        phone: p.member.phone,
        periodStart: p.periodStart,
        periodEnd: p.periodEnd,
        dueDate: p.dueDate,
        expectedPaise: p.expectedAmountPaise,
        allocatedPaise: allocated,
        outstandingPaise: Math.max(p.expectedAmountPaise - allocated, 0),
        status: p.status,
      };
    })
    .filter((r) => r.outstandingPaise > 0);
}
