import { describe, expect, it } from "vitest";
import { addDays, financialYearLabel, financialYearRange, formatDate, parseISODate, toISODate } from "@/lib/dates";
import { buildPeriods, monthsPerPeriod } from "@/lib/dues";

const plan = (over: Partial<Parameters<typeof buildPeriods>[0]> = {}) => ({
  id: "p1",
  masjidId: "m1",
  memberId: "u1",
  frequency: "MONTHLY",
  amountPaise: 50000,
  startDate: new Date("2026-01-01T00:00:00+05:30"),
  endDate: null as Date | null,
  dueDay: 10,
  graceDays: 0,
  ...over,
});

describe("dates", () => {
  it("renders DD-MM-YYYY in Asia/Kolkata", () => {
    expect(formatDate(new Date("2026-03-09T18:45:00Z"))).toBe("10-03-2026");
    expect(toISODate(new Date("2026-03-09T18:45:00Z"))).toBe("2026-03-10");
  });

  it("anchors parsed dates at IST midnight", () => {
    const d = parseISODate("2026-04-01")!;
    expect(d.toISOString()).toBe("2026-03-31T18:30:00.000Z");
    expect(parseISODate("01-04-2026")).toBeNull();
  });

  it("labels financial years for an April start", () => {
    expect(financialYearLabel(new Date("2026-03-31T12:00:00+05:30"), 4)).toBe("2025-26");
    expect(financialYearLabel(new Date("2026-04-01T12:00:00+05:30"), 4)).toBe("2026-27");
    expect(financialYearRange(new Date("2026-10-19T12:00:00+05:30"), 4).label).toBe("2026-27");
  });
});

describe("due period generation", () => {
  it("uses one period per month for monthly plans", () => {
    const periods = buildPeriods(plan(), new Date("2026-03-15T00:00:00+05:30"));
    expect(periods).toHaveLength(3);
    expect(formatDate(periods[0].periodStart)).toBe("01-01-2026");
    expect(formatDate(periods[0].periodEnd)).toBe("31-01-2026");
    expect(formatDate(periods[2].periodStart)).toBe("01-03-2026");
    expect(periods.every((p) => p.expectedAmountPaise === 50000)).toBe(true);
  });

  it("spans six and twelve months for semi-annual and annual plans", () => {
    expect(monthsPerPeriod("SEMI_ANNUAL")).toBe(6);
    expect(monthsPerPeriod("ANNUAL")).toBe(12);

    const semi = buildPeriods(plan({ frequency: "SEMI_ANNUAL" }), new Date("2026-12-31T00:00:00+05:30"));
    expect(semi).toHaveLength(2);
    expect(formatDate(semi[0].periodStart)).toBe("01-01-2026");
    expect(formatDate(semi[0].periodEnd)).toBe("30-06-2026");
    expect(formatDate(semi[1].periodStart)).toBe("01-07-2026");
    expect(formatDate(semi[1].periodEnd)).toBe("31-12-2026");
  });

  it("creates exactly one period for a one-time plan", () => {
    const once = buildPeriods(plan({ frequency: "ONE_TIME", amountPaise: 500000 }), new Date("2026-12-31T00:00:00+05:30"));
    expect(once).toHaveLength(1);
    expect(once[0].expectedAmountPaise).toBe(500000);
  });

  it("stops at the plan end date", () => {
    const periods = buildPeriods(
      plan({ endDate: new Date("2026-03-31T00:00:00+05:30") }),
      new Date("2027-12-31T00:00:00+05:30"),
    );
    expect(periods).toHaveLength(3);
  });

  it("applies the due day and grace days", () => {
    const [first] = buildPeriods(plan({ dueDay: 5, graceDays: 3 }), new Date("2026-01-31T00:00:00+05:30"));
    expect(formatDate(first.dueDate)).toBe("08-01-2026");
  });

  it("is deterministic so re-running never duplicates a period", () => {
    const a = buildPeriods(plan(), addDays(new Date("2026-06-01T00:00:00+05:30"), 0));
    const b = buildPeriods(plan(), addDays(new Date("2026-06-01T00:00:00+05:30"), 0));
    expect(a.map((p) => p.periodStart.toISOString())).toEqual(b.map((p) => p.periodStart.toISOString()));
  });
});
