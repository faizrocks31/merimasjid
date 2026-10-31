# Phase 2D — Read-Only Dues Generation Audit Report

**Date**: 2026-10-23  
**Status**: 🔍 **AUDIT COMPLETE** — Read-only inspection performed. No files or database records modified.

---

## 1. Files and Functions Inspected

- **`src/lib/dues.ts`**:
  - `buildPeriods(plan, horizon)`: Pure function calculating period boundaries (start, end, dueDate, expectedAmountPaise) based on frequency (`MONTHLY`, `SEMI_ANNUAL`, `ANNUAL`, `ONE_TIME`).
  - `generateDuesPeriods(planId)`: Iterates over generated periods and inserts them into `DuesPeriod`.
  - `generateAllDuesForMasjid(masjidId)`: Generates dues for all active plans of a masjid.
  - Status recomputation (`recomputePeriodStatus`, `recomputeAssignmentStatus`, `recomputeEventStatus`).
- **`src/modules/plans/actions.ts`**:
  - `createPlanAction(...)`: Creates a contribution plan and immediately calls `generateDuesPeriods(plan.id)`.
  - `changePlanAmountAction(...)`: Updates plan amount and future pending dues periods (`periodStart >= effectiveFrom`, status = `PENDING`).
  - `generateDuesAction()`: Server action allowing staff to generate dues for active plans in their masjid and logs an audit trail.
- **`prisma/schema.prisma`**:
  - `ContributionPlan` model.
  - `DuesPeriod` model with unique constraint `@@unique([planId, periodStart, periodEnd])`.
- **`tests/dates-dues.test.ts`**:
  - Unit tests for `buildPeriods` and date utilities.

---

## 2. Current Dues-Generation Architecture

1. **Trigger points**:
   - Automatically upon plan creation (`createPlanAction` in `src/modules/plans/actions.ts`).
   - Manually via staff action (`generateDuesAction` in `src/modules/plans/actions.ts`).
2. **Period Calculation (`buildPeriods`)**:
   - Calculates recurring periods up to 12 months ahead (`horizon`).
   - Respects frequency (`MONTHLY`, `SEMI_ANNUAL`, `ANNUAL`, `ONE_TIME`), `startDate`, `endDate`, `dueDay`, and `graceDays`.
3. **Storage & Idempotency (`generateDuesPeriods`)**:
   - Inserts each period individually in a `for...of` loop using `prisma.duesPeriod.create(...)`.
   - Catches and ignores errors (`try { ... } catch { /* duplicate */ }`) to handle unique constraint collisions gracefully.

---

## 3. Findings Categorized

### 🔴 CRITICAL
- **NO ISSUE FOUND**

### 🟠 HIGH
1. **Partial Write Risk in `generateDuesPeriods`**
   - **File**: `src/lib/dues.ts:98-124` (`generateDuesPeriods`)
   - **Finding**: The function loops through periods and calls `prisma.duesPeriod.create` individually outside of a database transaction. If an error occurs midway (other than a unique constraint violation), some periods will be created while later periods are not.
   - **Risk**: Incomplete generation state for a single plan if an intermittent DB error occurs.

### 🟡 MEDIUM
1. **Lack of Concurrency Locking on Dues Generation**
   - **File**: `src/lib/dues.ts:98-124` (`generateDuesPeriods`)
   - **Finding**: While unique constraints prevent duplicate period rows, concurrent background/manual generation calls for the same plan could result in redundant loop iterations and exception handling.

### 🟢 LOW
1. **No Automated Scheduled Job (Cron) for Ongoing Generation**
   - **Finding**: Dues generation currently relies on manual triggers (`generateDuesAction`) or plan creation. As time advances past the 12-month horizon, periods beyond 12 months won't exist unless regenerated periodically. There is currently no cron job or scheduled task defined in the codebase for recurring background generation.

### ✅ NO ISSUE FOUND
1. **Tenant Isolation**: `generateDuesAction` strictly scopes plans by `masjidId: user.masjidId!`. `generateDuesPeriods` checks plan ownership via planId.
2. **Financial History Preservation**: `changePlanAmountAction` only updates pending periods (`status: "PENDING"`) starting on or after `effectiveFrom`, leaving paid/partial historical periods untouched.
3. **Duplicate Prevention**: `@@unique([planId, periodStart, periodEnd])` combined with `try/catch` in `generateDuesPeriods` ensures idempotency.

---

## 4. Evidence Supporting Findings

- **Partial Write Evidence (`src/lib/dues.ts:105-122`)**:
  ```ts
  for (const p of periods) {
    try {
      await prisma.duesPeriod.create({ ... });
      created++;
    } catch {
      // Unique constraint: period already exists.
    }
  }
  ```
  *Each insert is a separate round-trip and separate implicit transaction.*

- **Tenant Isolation Evidence (`src/modules/plans/actions.ts:143-145`)**:
  ```ts
  const plans = await prisma.contributionPlan.findMany({
    where: { masjidId: user.masjidId!, status: "ACTIVE" },
    select: { id: true },
  });
  ```
  *Strictly scoped to the authenticated user's masjid.*

---

## 5. Existing Protections Working Correctly

- **Unique Constraint (`@@unique([planId, periodStart, periodEnd])`)**: Prevents duplicate periods for the same plan and time range.
- **Plan Amount Changes (`changePlanAmountAction`)**: Safely targets only future `PENDING` periods, preserving past ledgers.
- **Audit Logging**: Dues generation events are logged in the audit trail with metadata (`created`, `plans`).

---

## 6. Missing Tests and Proposed Test Scenarios

1. **Mid-Operation Failure / Rollback Test**: Test bulk generation wrapping in an explicit transaction or handling partial failures gracefully.
2. **Concurrent Generation Test**: Test running `generateDuesPeriods` simultaneously for the same plan.
3. **Horizon Extension Test**: Test generating dues when some periods already exist (verifying idempotency and correct count of newly created periods).

---

## 7. Recommended Minimal Fixes (Prioritized)

1. **Wrap `generateDuesPeriods` in a Transaction or Batch Upsert**:
   - Wrap the period creation loop inside `prisma.$transaction(...)` or use `createMany` with `skipDuplicates: true` (supported in PostgreSQL/Prisma).
   - Using `prisma.duesPeriod.createMany({ data: periods, skipDuplicates: true })` would make dues generation atomic, significantly faster (single database round-trip), and inherently idempotent.

---

## 8. Dependencies Between Proposed Fixes

- Refactoring `generateDuesPeriods` to use `createMany({ skipDuplicates: true })` is independent and has no complex prerequisites.

---

## 9. Any Uncertainty Requiring Investigation

- None. The dues generation logic, schema constraints, and action handlers are fully transparent.

---

## 10. Confirmation of Safety

- **No files or database records were changed during this audit.** All inspection was strictly read-only.

---

**Stop Condition Reached.** Stopping here and awaiting review and explicit approval.