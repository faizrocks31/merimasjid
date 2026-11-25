/**
 * Date helpers. The application operates in Asia/Kolkata.
 * Dates are stored as UTC DateTime; business periods are month boundaries
 * evaluated in the Masjid timezone.
 */

export const APP_TIMEZONE = "Asia/Kolkata";

/** YYYY-MM-DD for a date input, evaluated in Asia/Kolkata. */
export function todayInput(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** YYYY-MM-DD for a stored Date, in Asia/Kolkata. */
export function dateInput(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Current instant. Kept behind a function so tests can be deterministic. */
export function now(): Date {
  return new Date();
}

/** YYYY-MM-DD in Asia/Kolkata. */
export function toISODate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** DD-MM-YYYY display format. */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("day")}-${get("month")}-${get("year")}`;
}

/** DD-MM-YYYY HH:mm */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
  return `${formatDate(d)} ${time}`;
}

/** Parses "YYYY-MM-DD" into a UTC date anchored at 00:00 IST. */
export function parseISODate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00+05:30`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Builds an instant at 00:00 IST on the given calendar date. */
function istMidnight(year: number, month: number, day: number): Date {
  return new Date(
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00+05:30`,
  );
}

/** Calendar parts of an instant as seen in Asia/Kolkata. */
export function istParts(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/**
 * Month period boundaries for a given year/month (1-based month), anchored at
 * IST midnight. `end` is the last day of the month, also at IST midnight.
 */
export function monthPeriod(year: number, month: number): { start: Date; end: Date } {
  const start = istMidnight(year, month, 1);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const end = new Date(istMidnight(nextYear, nextMonth, 1).getTime() - 86400000);
  return { start, end };
}

/**
 * Adds calendar months in IST. The day-of-month is clamped to the target
 * month's length and the time-of-day offset is preserved, so a month start
 * always lands on the first of the target month.
 */
export function addMonths(date: Date, months: number): Date {
  const { year, month, day } = istParts(date);
  const total = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(total / 12);
  const targetMonth = (total % 12) + 1;
  const daysInTarget = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  const targetDay = Math.min(day, daysInTarget);
  const offset = date.getTime() - istMidnight(year, month, day).getTime();
  return new Date(istMidnight(targetYear, targetMonth, targetDay).getTime() + offset);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

/** Financial year label for a date, given the starting month (1-12). e.g. "2026-27". */
export function financialYearLabel(date: Date, startMonth: number): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const startYear = month >= startMonth ? year : year - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

/** Inclusive start / exclusive end for a financial year containing `date`. */
export function financialYearRange(date: Date, startMonth: number): { start: Date; end: Date; label: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const startYear = month >= startMonth ? year : year - 1;
  const start = new Date(`${startYear}-${String(startMonth).padStart(2, "0")}-01T00:00:00+05:30`);
  const end = new Date(`${startYear + 1}-${String(startMonth).padStart(2, "0")}-01T00:00:00+05:30`);
  return { start, end, label: `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}` };
}

export function startOfToday(): Date {
  const iso = toISODate(new Date());
  return new Date(`${iso}T00:00:00+05:30`);
}

export function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

/** Returns a Date at 00:00:00 of the given date in the local timezone. */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Returns a Date at 23:59:59.999 of the given date in the local timezone. */
export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}
