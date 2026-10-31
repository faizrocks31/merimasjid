# Phase 2C — Genuine Concurrent Payment Testing Report

**Date**: 2026-10-23  
**Status**: ✅ **COMPLETE** — All tests passing

---

## Summary

Successfully created and verified genuine concurrent testing for `createPaymentAction` using the actual server action (not raw Prisma transactions). This proves the row-level locking implemented in Phase 2B works end-to-end through the full stack: authentication → validation → locking → database commit.

---

## New Test File: `tests/concurrent-action.test.ts`

Created a new test file following the exact pattern from `tests/tenant-isolation.test.ts`:

- **Auth mocking**: `vi.mock("next/headers")` provides a cookie jar with a signed JWT for a test ADMIN user
- **Next.js mocks**: `next/navigation` and `next/cache` stubbed
- **Fixtures**: Masjid, ADMIN user, member, category, contribution plan, dues periods, collection event + assignment
- **Concurrency**: `Promise.all([createPaymentAction(form1), createPaymentAction(form2)])` for true parallel execution

### Test Cases (All Passing)

| Test | Scenario | Result |
|------|----------|--------|
| `prevents concurrent over-allocation on a single dues period` | 2 × 80k payments on 100k due period | ✅ 1 succeeds, 1 fails with generic error; DB shows exactly 80k allocated |
| `prevents concurrent over-allocation on a collection event assignment` | 2 × 80k payments on 100k assignment | ✅ 1 succeeds, 1 fails; DB shows exactly 80k allocated |
| `allows concurrent allocations to different dues periods` | 2 payments on different periods (50k + 30k) | ✅ Both succeed; correct allocations per period |

---

## Full Test Suite Verification

```
✅ tests/concurrent-action.test.ts        — 3 tests passed (new)
✅ tests/concurrency.test.ts              — 4 tests passed (DB-level locking)
✅ tests/allocations.test.ts              — 16 tests passed
✅ tests/numbering.test.ts                — 9 tests passed
✅ npx tsc --noEmit                       — No TypeScript errors
```

**Total**: 32 tests passing across 4 test files

---

## Key Findings

1. **Row-level locking works correctly**: When two concurrent `createPaymentAction` calls target the same dues period/collection event, PostgreSQL's `SELECT FOR UPDATE` serializes them. The first transaction locks the row, checks the remaining balance, and commits. The second transaction waits for the lock, sees the updated balance, and correctly rejects the over-allocation.

2. **Error handling is correct**: The internal error message ("Allocation exceeds outstanding balance...") is logged server-side, while the client receives a generic "Could not save the payment. No changes were made." This is the intended security behavior (no internal state leaked).

3. **No false blocking**: Concurrent allocations to *different* dues periods proceed in parallel without blocking each other, confirming the lock ordering and isolation work as designed.

4. **Tenant isolation maintained**: All fixtures scoped to a single test masjid; cross-tenant references would be rejected (verified by existing `tests/tenant-isolation.test.ts`).

---

## Concurrency Architecture Validated

The implementation in `src/modules/payments/actions.ts` correctly:

1. **Collects all lock targets** (duesPeriodIds, collectionEventIds) before the transaction
2. **Sorts IDs consistently** to prevent deadlocks
3. **Acquires locks in order** using `FOR UPDATE` on:
   - `DuesPeriod` rows (validates remaining balance per period)
   - `CollectionEvent` rows (validates tenant ownership)
   - `CollectionEventAssignment` rows (validates member-specific remaining balance)
4. **Re-checks balances inside the lock** after acquiring it (prevents TOCTOU)
5. **Commits atomically** with payment + allocations + status recomputation

---

## Next Steps (Phase 2D)

Phase 2C is complete. Ready to proceed to Phase 2D when approved.

### Recommended Phase 2D focus areas:
- Expense tracking and reimbursement flows
- Member onboarding/offboarding workflows  
- Reporting and analytics endpoints
- Receipt printing and PDF generation

---

**Co-Authored-By: Claude Code <noreply@anthropic.com>**