import { prisma } from "@/lib/db";
import { addMonths, istParts, monthPeriod, addWeeks, addDays, startOfDay, endOfDay } from "@/lib/dates";
import { COLLECTION_FREQUENCY, DUE_GENERATION, MEMBER_ASSIGNMENT, SETTLEMENT_POLICY, FREQUENCIES } from "@/lib/constants";
import { writeAudit } from "@/modules/audit/write";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Number of months covered by one period for a frequency.
 */
export function monthsPerPeriod(frequency: string): number {
  switch (frequency) {
    case COLLECTION_FREQUENCY.MONTHLY:
    case FREQUENCIES.MONTHLY:
      return 1;
    case COLLECTION_FREQUENCY.QUARTERLY:
      return 3;
    case COLLECTION_FREQUENCY.SEMI_ANNUAL:
    case FREQUENCIES.SEMI_ANNUAL:
      return 6;
    case COLLECTION_FREQUENCY.ANNUAL:
    case FREQUENCIES.ANNUAL:
      return 12;
    case COLLECTION_FREQUENCY.WEEKLY:
      return 0; // handled specially
    case COLLECTION_FREQUENCY.ONE_TIME:
    case FREQUENCIES.ONE_TIME:
      return 0;
    default:
      return 1;
  }
}

interface DefinitionLike {
  id: string;
  masjidId: string;
  frequency: string;
  amountType: string;
  defaultAmountPaise: number | null;
  memberAssignment: string;
  dueGeneration: string;
  settlementPolicy: string;
  defaultDueDay?: number | null;
  defaultGraceDays?: number | null;
}

interface MemberLike {
  id: string;
  masjidId: string;
  fullName: string;
  memberNo: string;
  status?: string;
}

/**
 * Builds the period boundaries for a collection definition up to `horizon`.
 * Supports all frequencies: WEEKLY, MONTHLY, QUARTERLY, SEMI_ANNUAL, ANNUAL, EVENT_BASED, ONE_TIME.
 */
export function buildPeriods(
  definition: DefinitionLike,
  horizon: Date = addMonths(new Date(), 12),
  defaultDueDay = 10,
  defaultGraceDays = 0,
): Array<{ periodStart: Date; periodEnd: Date; dueDate: Date; expectedAmountPaise: number }> {
  const out: Array<{ periodStart: Date; periodEnd: Date; dueDate: Date; expectedAmountPaise: number }> = [];

  // EVENT_BASED and ONE_TIME don't auto-generate periods via this function
  if (definition.frequency === COLLECTION_FREQUENCY.EVENT_BASED || definition.frequency === COLLECTION_FREQUENCY.ONE_TIME) {
    return out;
  }

  const amountPaise = definition.defaultAmountPaise ?? 0;
  if (amountPaise <= 0) return out;

  const step = monthsPerPeriod(definition.frequency);
  if (step === 0) return out; // WEEKLY handled separately below

  const limit = horizon;

  let cursor = startOfDay(new Date()); // Start from today
  let guard = 0;
  while (cursor <= limit && guard < 240) {
    guard++;
    const startParts = istParts(cursor);
    const { start } = monthPeriod(startParts.year, startParts.month);

    // Period spans `step` months from the start month
    const spanEnd = addMonths(start, step);
    spanEnd.setUTCDate(spanEnd.getUTCDate() - 1);
    spanEnd.setUTCHours(23, 59, 59, 999);

    const dueDay = Math.min(defaultDueDay, 28);
    const dueDate = new Date(
      Date.UTC(startParts.year, startParts.month - 1, dueDay) -
        5.5 * 60 * 60 * 1000 + // Convert to IST
        defaultGraceDays * 86400000,
    );

    out.push({
      periodStart: start,
      periodEnd: spanEnd,
      dueDate,
      expectedAmountPaise: amountPaise,
    });

    cursor = addMonths(start, step);
  }
  return out;
}

/**
 * Builds weekly periods for a collection definition.
 */
export function buildWeeklyPeriods(
  definition: DefinitionLike,
  horizon: Date = addMonths(new Date(), 12),
  defaultDueDay = 10,
  defaultGraceDays = 0,
): Array<{ periodStart: Date; periodEnd: Date; dueDate: Date; expectedAmountPaise: number }> {
  const out: Array<{ periodStart: Date; periodEnd: Date; dueDate: Date; expectedAmountPaise: number }> = [];
  const amountPaise = definition.defaultAmountPaise ?? 0;
  if (amountPaise <= 0) return out;

  // Start from the Monday of the current week
  let cursor = startOfDay(new Date());
  const dayOfWeek = cursor.getDay(); // 0 = Sunday
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  cursor.setDate(cursor.getDate() + daysToMonday);
  cursor.setUTCHours(0, 0, 0, 0);

  let guard = 0;
  while (cursor <= horizon && guard < 240) {
    guard++;
    const periodStart = new Date(cursor);
    const periodEnd = new Date(cursor);
    periodEnd.setDate(periodEnd.getDate() + 6);
    periodEnd.setUTCHours(23, 59, 59, 999);

    // Due date is defaultDueDay days from period start + grace days
    const dueDate = new Date(periodStart);
    dueDate.setDate(dueDate.getDate() + defaultDueDay + defaultGraceDays);

    out.push({
      periodStart,
      periodEnd,
      dueDate,
      expectedAmountPaise: amountPaise,
    });

    cursor.setDate(cursor.getDate() + 7);
  }
  return out;
}

/**
 * Builds quarterly periods for a collection definition.
 * Aligns to calendar quarters: Q1=Jan-Mar, Q2=Apr-Jun, Q3=Jul-Sep, Q4=Oct-Dec
 */
export function buildQuarterlyPeriods(
  definition: DefinitionLike,
  horizon: Date = addMonths(new Date(), 12),
  defaultDueDay = 10,
  defaultGraceDays = 0,
): Array<{ periodStart: Date; periodEnd: Date; dueDate: Date; expectedAmountPaise: number }> {
  const out: Array<{ periodStart: Date; periodEnd: Date; dueDate: Date; expectedAmountPaise: number }> = [];
  const amountPaise = definition.defaultAmountPaise ?? 0;
  if (amountPaise <= 0) return out;

  let cursor = startOfDay(new Date());
  // Align to start of current quarter
  const quarterStartMonth = Math.floor(cursor.getMonth() / 3) * 3;
  cursor = new Date(cursor.getFullYear(), quarterStartMonth, 1);
  cursor.setUTCHours(0, 0, 0, 0);

  let guard = 0;
  while (cursor <= horizon && guard < 240) {
    guard++;
    const periodStart = new Date(cursor);
    const periodEnd = new Date(cursor);
    periodEnd.setMonth(periodEnd.getMonth() + 2); // 3 months
    periodEnd.setDate(periodEnd.getDate() - 1);
    periodEnd.setUTCHours(23, 59, 59, 999);

    const dueDate = new Date(periodStart);
    dueDate.setDate(dueDate.getDate() + defaultDueDay + defaultGraceDays);

    out.push({
      periodStart,
      periodEnd,
      dueDate,
      expectedAmountPaise: amountPaise,
    });

    cursor.setMonth(cursor.getMonth() + 3);
  }
  return out;
}

/**
 * Builds semi-annual periods for a collection definition.
 * Aligns to half-years: H1=Jan-Jun, H2=Jul-Dec
 */
export function buildSemiAnnualPeriods(
  definition: DefinitionLike,
  horizon: Date = addMonths(new Date(), 12),
  defaultDueDay = 10,
  defaultGraceDays = 0,
): Array<{ periodStart: Date; periodEnd: Date; dueDate: Date; expectedAmountPaise: number }> {
  const out: Array<{ periodStart: Date; periodEnd: Date; dueDate: Date; expectedAmountPaise: number }> = [];
  const amountPaise = definition.defaultAmountPaise ?? 0;
  if (amountPaise <= 0) return out;

  let cursor = startOfDay(new Date());
  // Align to start of current half-year
  const halfStartMonth = cursor.getMonth() < 6 ? 0 : 6;
  cursor = new Date(cursor.getFullYear(), halfStartMonth, 1);
  cursor.setUTCHours(0, 0, 0, 0);

  let guard = 0;
  while (cursor <= horizon && guard < 240) {
    guard++;
    const periodStart = new Date(cursor);
    const periodEnd = new Date(cursor);
    periodEnd.setMonth(periodEnd.getMonth() + 5); // 6 months
    periodEnd.setDate(periodEnd.getDate() - 1);
    periodEnd.setUTCHours(23, 59, 59, 999);

    const dueDate = new Date(periodStart);
    dueDate.setDate(dueDate.getDate() + defaultDueDay + defaultGraceDays);

    out.push({
      periodStart,
      periodEnd,
      dueDate,
      expectedAmountPaise: amountPaise,
    });

    cursor.setMonth(cursor.getMonth() + 6);
  }
  return out;
}

/**
 * Builds annual periods for a collection definition.
 * Aligns to calendar year: Jan-Dec
 */
export function buildAnnualPeriods(
  definition: DefinitionLike,
  horizon: Date = addMonths(new Date(), 12),
  defaultDueDay = 10,
  defaultGraceDays = 0,
): Array<{ periodStart: Date; periodEnd: Date; dueDate: Date; expectedAmountPaise: number }> {
  const out: Array<{ periodStart: Date; periodEnd: Date; dueDate: Date; expectedAmountPaise: number }> = [];
  const amountPaise = definition.defaultAmountPaise ?? 0;
  if (amountPaise <= 0) return out;

  let cursor = startOfDay(new Date());
  // Align to start of current year
  cursor = new Date(cursor.getFullYear(), 0, 1);
  cursor.setUTCHours(0, 0, 0, 0);

  let guard = 0;
  while (cursor <= horizon && guard < 240) {
    guard++;
    const periodStart = new Date(cursor);
    const periodEnd = new Date(cursor);
    periodEnd.setMonth(periodEnd.getMonth() + 11); // 12 months
    periodEnd.setDate(periodEnd.getDate() - 1);
    periodEnd.setUTCHours(23, 59, 59, 999);

    const dueDate = new Date(periodStart);
    dueDate.setDate(dueDate.getDate() + defaultDueDay + defaultGraceDays);

    out.push({
      periodStart,
      periodEnd,
      dueDate,
      expectedAmountPaise: amountPaise,
    });

    cursor.setFullYear(cursor.getFullYear() + 1);
  }
  return out;
}

/**
 * Generates all period types based on frequency.
 */
export function buildAllPeriods(
  definition: DefinitionLike,
  horizon: Date = addMonths(new Date(), 12),
  defaultDueDay = 10,
  defaultGraceDays = 0,
): Array<{ periodStart: Date; periodEnd: Date; dueDate: Date; expectedAmountPaise: number }> {
  switch (definition.frequency) {
    case COLLECTION_FREQUENCY.WEEKLY:
      return buildWeeklyPeriods(definition, horizon, defaultDueDay, defaultGraceDays);
    case COLLECTION_FREQUENCY.MONTHLY:
      return buildPeriods(definition, horizon, defaultDueDay, defaultGraceDays);
    case COLLECTION_FREQUENCY.QUARTERLY:
      return buildQuarterlyPeriods(definition, horizon, defaultDueDay, defaultGraceDays);
    case COLLECTION_FREQUENCY.SEMI_ANNUAL:
      return buildSemiAnnualPeriods(definition, horizon, defaultDueDay, defaultGraceDays);
    case COLLECTION_FREQUENCY.ANNUAL:
      return buildAnnualPeriods(definition, horizon, defaultDueDay, defaultGraceDays);
    case COLLECTION_FREQUENCY.EVENT_BASED:
    case COLLECTION_FREQUENCY.ONE_TIME:
    default:
      return [];
  }
}

export interface GenerationOptions {
  startDate: Date;
  endDate: Date;
  memberIds?: string[];        // For SELECTED assignment
  skipExisting?: boolean;      // Default true
  forceRegenerate?: boolean;   // Admin override
}

/**
 * Result of dues generation for a category.
 */
export interface GenerationResult {
  created: number;
  skipped: number;
  errors: string[];
}

/**
 * Core engine: generates dues periods for all eligible members of a collection definition.
 * 5-step workflow:
 * 1. Validate definition and settings
 * 2. Determine eligible members based on memberAssignment and ACTIVE status
 * 3. Build period boundaries for all 7 frequencies
 * 4. Check ADMIN/AUTOMATIC mode - ADMIN requires forceRegenerate
 * 5. Batch insert with idempotency (P2002) using unique constraint
 */
export async function generateDuesForCategory(
  masjidId: string,
  categoryId: string,
  options: GenerationOptions
): Promise<GenerationResult> {
  const definition = await prisma.collectionDefinition.findFirst({
    where: { id: categoryId, masjidId },
  });
  if (!definition) {
    return { created: 0, skipped: 0, errors: ["Collection definition not found"] };
  }

  // Check dueGeneration mode - ADMIN means manual only (unless forceRegenerate)
  if (definition.dueGeneration === DUE_GENERATION.ADMIN && !options.forceRegenerate) {
    return { created: 0, skipped: 0, errors: ["Category is in Admin mode; use forceRegenerate to override"] };
  }

  if (!definition.defaultAmountPaise || definition.defaultAmountPaise <= 0) {
    return { created: 0, skipped: 0, errors: ["Category has no default amount configured"] };
  }

  // Get target members based on memberAssignment mode
  // CRITICAL: Only ACTIVE members are eligible for dues generation
  let members: MemberLike[];
  if (definition.memberAssignment === MEMBER_ASSIGNMENT.SELECTED && options.memberIds && options.memberIds.length > 0) {
    // SELECTED mode: only specified members (must be ACTIVE)
    members = await prisma.member.findMany({
      where: { id: { in: options.memberIds }, masjidId, status: "ACTIVE" },
      select: { id: true, masjidId: true, fullName: true, memberNo: true },
    });
    if (members.length !== options.memberIds.length) {
      return { created: 0, skipped: 0, errors: ["Some members not found or inactive in this masjid"] };
    }
  } else if (definition.memberAssignment === MEMBER_ASSIGNMENT.SELECTED) {
    // SELECTED but no memberIds provided - get from assignments
    // For dues periods, we need to know which members are assigned to events
    const assignments = await prisma.collectionEventAssignment.findMany({
      where: { event: { collectionDefinitionId: definition.id, masjidId } },
      include: { member: { select: { id: true, masjidId: true, fullName: true, memberNo: true, status: true } } },
      distinct: ["memberId"],
    });
    members = assignments.map(a => a.member).filter(m => m.status === "ACTIVE");
  } else {
    // ALL_ELIGIBLE: all ACTIVE members in the masjid
    members = await prisma.member.findMany({
      where: { masjidId, status: "ACTIVE" },
      select: { id: true, masjidId: true, fullName: true, memberNo: true },
    });
  }

  if (members.length === 0) {
    return { created: 0, skipped: 0, errors: ["No eligible ACTIVE members found"] };
  }

  // Build periods for the date range
  const horizon = options.endDate;
  // Use defaultDueDay and defaultGraceDays from definition if available, otherwise defaults
  const defaultDueDay = definition.defaultDueDay ?? 10;
  const defaultGraceDays = definition.defaultGraceDays ?? 0;
  const periods = buildAllPeriods(definition, horizon, defaultDueDay, defaultGraceDays);

  // Filter periods to the requested range
  const filteredPeriods = periods.filter(p =>
    p.periodStart >= options.startDate && p.periodStart <= options.endDate
  );

  if (filteredPeriods.length === 0) {
    return { created: 0, skipped: 0, errors: ["No periods in the specified date range"] };
  }

  let totalCreated = 0;
  let totalSkipped = 0;
  const errors: string[] = [];

  // Process in batches to avoid timeout
  const batchSize = 500;
  for (let i = 0; i < members.length; i += batchSize) {
    const batch = members.slice(i, i + batchSize);

    try {
      const result = await prisma.$transaction(async (tx) => {
        let batchCreated = 0;
        let batchSkipped = 0;

        for (const member of batch) {
          for (const period of filteredPeriods) {
            try {
              await tx.duesPeriod.create({
                data: {
                  masjidId,
                  collectionDefinitionId: definition.id,
                  memberId: member.id,
                  periodStart: period.periodStart,
                  periodEnd: period.periodEnd,
                  dueDate: period.dueDate,
                  expectedAmountPaise: period.expectedAmountPaise,
                  status: "PENDING",
                },
              });
              batchCreated++;
            } catch (err: any) {
              if (err.code === "P2002" && err.meta?.target?.includes("collectionDefinitionId")) {
                batchSkipped++;
              } else {
                throw err;
              }
            }
          }
        }
        return { created: batchCreated, skipped: batchSkipped };
      });

      totalCreated += result.created;
      totalSkipped += result.skipped;
    } catch (err) {
      console.error(`Batch generation failed for members ${i}-${i + batchSize}:`, err);
      errors.push(`Batch ${i / batchSize + 1}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  // Audit log
  await prisma.$transaction(async (tx) => {
    await writeAudit(tx, {
      masjidId,
      actorUserId: "system", // Will be overwritten by caller
      action: "dues.generate.category",
      entityType: "DuesPeriod",
      entityId: definition.id,
      after: {
        categoryId: definition.id,
        categoryName: definition.name,
        created: totalCreated,
        skipped: totalSkipped,
        dateRange: { start: options.startDate.toISOString(), end: options.endDate.toISOString() },
      },
    });
  });

  return { created: totalCreated, skipped: totalSkipped, errors };
}

/**
 * Generates dues for a specific member (e.g., when new member joins).
 */
export async function generateDuesForMember(
  masjidId: string,
  categoryId: string,
  memberId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const result = await generateDuesForCategory(masjidId, categoryId, {
    startDate,
    endDate,
    memberIds: [memberId],
    forceRegenerate: true,
  });
  return result.created;
}

/**
 * Generates dues for all categories with dueGeneration = AUTOMATIC.
 * Called by cron job - generates for next 30 days.
 * Returns result with per-category breakdown.
 */
export interface AutomaticGenerationResult {
  categoryId: string;
  categoryName: string;
  created: number;
  skipped: number;
  errors: string[];
}

export async function generateAllAutomaticDues(masjidId: string): Promise<{
  categories: AutomaticGenerationResult[];
  totalCreated: number;
  totalSkipped: number;
  totalErrors: number;
}> {
  const definitions = await prisma.collectionDefinition.findMany({
    where: {
      masjidId,
      active: true,
      dueGeneration: DUE_GENERATION.AUTOMATIC,
      defaultAmountPaise: { gt: 0 },
    },
  });

  const results: AutomaticGenerationResult[] = [];
  let totalCreated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  // Generate for next 30 days (matching cron frequency)
  const horizon = addMonths(new Date(), 1);
  const startDate = new Date();

  for (const def of definitions) {
    try {
      const result = await generateDuesForCategory(masjidId, def.id, {
        startDate,
        endDate: horizon,
        forceRegenerate: false,
      });
      results.push({
        categoryId: def.id,
        categoryName: def.name,
        created: result.created,
        skipped: result.skipped,
        errors: result.errors,
      });
      totalCreated += result.created;
      totalSkipped += result.skipped;
      totalErrors += result.errors.length;
    } catch (err) {
      const errorMsg = `${def.name}: ${err instanceof Error ? err.message : "Unknown error"}`;
      results.push({
        categoryId: def.id,
        categoryName: def.name,
        created: 0,
        skipped: 0,
        errors: [errorMsg],
      });
      totalErrors++;
    }
  }

  return { categories: results, totalCreated, totalSkipped, totalErrors };
}

/**
 * Preview what dues would be generated without actually creating them.
 * Returns a summary of periods per member.
 */
export async function previewDuesGeneration(
  masjidId: string,
  categoryId: string,
  startDate: Date,
  endDate: Date,
  memberIds?: string[]
): Promise<{
  definition: DefinitionLike;
  periods: Array<{ periodStart: Date; periodEnd: Date; dueDate: Date; expectedAmountPaise: number }>;
  members: MemberLike[];
  totalPeriods: number;
  totalMembers: number;
}> {
  const definition = await prisma.collectionDefinition.findFirst({
    where: { id: categoryId, masjidId },
  });
  if (!definition) {
    throw new Error("Collection definition not found");
  }

  if (!definition.defaultAmountPaise || definition.defaultAmountPaise <= 0) {
    throw new Error("Category has no default amount configured");
  }

  // Get target members (same logic as generateDuesForCategory)
  let members: MemberLike[];
  if (definition.memberAssignment === MEMBER_ASSIGNMENT.SELECTED && memberIds && memberIds.length > 0) {
    members = await prisma.member.findMany({
      where: { id: { in: memberIds }, masjidId, status: "ACTIVE" },
      select: { id: true, masjidId: true, fullName: true, memberNo: true },
    });
  } else if (definition.memberAssignment === MEMBER_ASSIGNMENT.SELECTED) {
    const assignments = await prisma.collectionEventAssignment.findMany({
      where: { event: { collectionDefinitionId: definition.id, masjidId } },
      include: { member: { select: { id: true, masjidId: true, fullName: true, memberNo: true, status: true } } },
      distinct: ["memberId"],
    });
    members = assignments.map(a => a.member).filter(m => m.status === "ACTIVE");
  } else {
    members = await prisma.member.findMany({
      where: { masjidId, status: "ACTIVE" },
      select: { id: true, masjidId: true, fullName: true, memberNo: true },
    });
  }

  const horizon = endDate;
  const defaultDueDay = definition.defaultDueDay ?? 10;
  const defaultGraceDays = definition.defaultGraceDays ?? 0;
  const periods = buildAllPeriods(definition, horizon, defaultDueDay, defaultGraceDays);
  const filteredPeriods = periods.filter(p =>
    p.periodStart >= startDate && p.periodStart <= endDate
  );

  return {
    definition,
    periods: filteredPeriods,
    members,
    totalPeriods: filteredPeriods.length * members.length,
    totalMembers: members.length,
  };
}

/**
 * Assigns members to a collection definition (for SELECTED memberAssignment mode).
 * Creates CollectionEventAssignment entries for existing events.
 */
export async function assignMembersToCategory(
  masjidId: string,
  categoryId: string,
  memberIds: string[],
  expectedAmountPaise: number
): Promise<number> {
  const definition = await prisma.collectionDefinition.findFirst({
    where: { id: categoryId, masjidId },
  });
  if (!definition) throw new Error("Collection definition not found");

  if (definition.memberAssignment !== MEMBER_ASSIGNMENT.SELECTED) {
    throw new Error("Member assignment only applies to SELECTED mode");
  }

  // Get all events for this category
  const events = await prisma.collectionEvent.findMany({
    where: { collectionDefinitionId: categoryId, masjidId },
    select: { id: true },
  });

  if (events.length === 0) {
    throw new Error("No events exist for this category. Generate events first.");
  }

  // Verify all members belong to this masjid and are active
  const members = await prisma.member.findMany({
    where: { id: { in: memberIds }, masjidId, status: "ACTIVE" },
    select: { id: true },
  });
  if (members.length !== memberIds.length) {
    throw new Error("Some members not found or inactive in this masjid");
  }

  let totalAssigned = 0;

  await prisma.$transaction(async (tx) => {
    for (const event of events) {
      // Delete existing assignments for these members in this event
      await tx.collectionEventAssignment.deleteMany({
        where: { eventId: event.id, memberId: { in: memberIds } },
      });

      // Create new assignments
      await tx.collectionEventAssignment.createMany({
        data: memberIds.map(memberId => ({
          eventId: event.id,
          memberId,
          expectedAmountPaise,
          status: "PENDING",
          masjidId,
        })),
        skipDuplicates: true,
      });

      totalAssigned += memberIds.length;

      // Recompute event status
      const { recomputeEventStatus } = await import("@/lib/dues");
      await recomputeEventStatus(tx, event.id);
    }

    await writeAudit(tx, {
      masjidId,
      actorUserId: "system", // Will be overwritten by caller
      action: "collectionDefinition.assignMembers",
      entityType: "CollectionEventAssignment",
      entityId: categoryId,
      after: {
        categoryId,
        memberCount: memberIds.length,
        expectedAmountPaise,
        eventCount: events.length,
      },
    });
  });

  return totalAssigned;
}