# Phase 2D — Fix Dues Generation Partial-Write Risk — Final Report

**Date**: 2026-10-23  
**Status**: ✅ **COMPLETE** — All tests passing, TypeScript clean.

---

## 1. Files Changed

- **`src/lib/dues.ts`**: Refactored `generateDuesPeriods()` function.
- **`tests/dues-generation-fix.test.ts`**: New comprehensive test file (8 tests).

---

## 2. Failure Mode Addressed

**Original Code (`src/lib/dues.ts:98-124`)**:
```typescript
for (const p of periods) {
  try {
    await prisma.duesPeriod.create({ data: { ... } });
    created++;
  } catch {
    // Unique constraint: period already exists.
  }
}
```

**Problems**:
1. **Partial writes**: Each `create()` is a separate implicit transaction. If a genuine DB error (connection loss, constraint violation, timeout) occurs midway, already-created periods persist while later periods are missing.
2. **Silent error swallowing**: `catch { }` treats *all* errors as duplicates, masking real failures.
3. **Performance**: N round-trips for N periods.

---

## 3. Chosen Solution

**Refactored to use `createMany({ skipDuplicates: true })`**:

```typescript
export async function generateDuesPeriods(planId: string): Promise<number> {
  const plan = await prisma.contributionPlan.findUnique({ where: { id: planId } });
  if (!plan || plan.status !== "ACTIVE") return 0;

  const periods = buildPeriods(plan);
  if (periods.length === 0) return 0;

  try {
    const result = await prisma.duesPeriod.createMany({
      data: periods.map((p) => ({
        masjidId: plan.masjidId,
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
```

**Why this approach**:
- **Atomic**: Single INSERT statement with `ON CONFLICT DO NOTHING` (PostgreSQL).
- **No partial writes**: All-or-nothing — either all new periods are inserted, or none.
- **Intentional duplicate handling**: `skipDuplicates: true` explicitly handles unique constraint collisions per the schema's `@@unique([planId, periodStart, periodEnd])`.
- **Genuine errors propagate**: Connection failures, constraint violations (other than the unique constraint), and timeouts are thrown and logged, not silently swallowed.
- **Performance**: One round-trip instead of N.

---

## 4. How Partial Writes Are Prevented

- `createMany` executes as a single SQL statement: `INSERT ... ON CONFLICT (planId, periodStart, periodEnd) DO NOTHING`.
- PostgreSQL guarantees atomicity of the statement: all rows succeed or none do.
- No intermediate state visible to other transactions.

---

## 5. How Duplicate Generation Is Handled

- Schema enforces `@@unique([planId, periodStart, periodEnd])` at the database level.
- `skipDuplicates: true` maps to `ON CONFLICT DO NOTHING`, so existing periods are silently skipped.
- Return value `result.count` = number of *newly* created periods (not including skipped duplicates).
- Idempotent: repeated calls with same plan/horizon return 0 after first run.

---

## 6. How Genuine Database Errors Are Surfaced

- The `try/catch` now **only wraps the `createMany` call**.
- Errors are logged with context (`planId`) and **re-thrown**.
- Callers (`createPlanAction`, `generateDuesAction`, `generateAllDuesForMasjid`) handle errors per their existing patterns (return error state or log and continue).

---

## 7. Test Commands & Results

### New Test File: `tests/dues-generation-fix.test.ts`

```
✅ successfully generates periods for a new plan
✅ is idempotent: repeated calls do not create duplicates
✅ correctly counts newly created periods when some already exist
✅ preserves existing dues with payment allocations when regenerating
✅ generateAllDuesForMasjid generates for multiple plans and returns total count
✅ handles concurrent generation requests for the same plan without duplicates
✅ handles concurrent generation for multiple plans
✅ generateDuesAction (server action) works and logs audit
```

### Full Regression Suite (49 tests):

| Test File | Tests | Status |
|-----------|-------|--------|
| `tests/dues-generation-fix.test.ts` | 8 | ✅ |
| `tests/concurrent-action.test.ts` | 3 | ✅ |
| `tests/allocations.test.ts` | 16 | ✅ |
| `tests/numbering.test.ts` | 9 | ✅ |
| `tests/concurrency.test.ts` | 4 | ✅ |
| `tests/dates-dues.test.ts` | 9 | ✅ |
| **Total** | **49** | **All Passed** |

### TypeScript Compilation:
```
npx tsc --noEmit → ✅ No errors
```

---

## 8. Concurrency Testing Against PostgreSQL

**Verified**:
1. **Same-plan concurrent generation** (`Promise.all([generateDuesPeriods(id), generateDuesPeriods(id)])`): Only one call creates periods; the other returns 0. No duplicate rows created.
2. **Multi-plan concurrent generation** (`Promise.all([generateDuesPeriods(id1), generateDuesPeriods(id2)])`): Both succeed independently, total count matches sum.

Both tests use real PostgreSQL transactions and unique constraints — not mocks.

---

## 9. Remaining Limitations

- **No automatic scheduled/cron generation**: Dues beyond the 12-month horizon require manual or triggered regeneration. This is an architectural gap, not a bug in the fixed function.
- **Horizon is fixed at 12 months**: `buildPeriods` uses a hardcoded default. This is unchanged behavior.

---

## 10. Safety Confirmation

- **No production data modified**: All tests used isolated test fixtures in the configured test database.
- **No destructive commands**: No `DROP`, `TRUNCATE`, `RESET`, or migration operations.
- **Existing dues, payments, allocations preserved**: Tests explicitly verify payment allocations survive regeneration.

---

## 11. Stop Condition Reached

Phase 2D fix complete and verified. Awaiting review before Phase 2E.

**Co-Authored-By: Claude Code <noreply@anthropic.com>**