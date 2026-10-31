# Phase 2E — Payment Reversal Safety Fix — Final Report

**Date**: 2026-10-23  
**Status**: ✅ **COMPLETE** — All tests passing, TypeScript clean.

---

## 1. Files Changed

- **`src/modules/payments/actions.ts`**: Refactored `reversePaymentAction()` to be concurrency-safe with row-level locking.
- **`tests/payment-reversal.test.ts`**: New comprehensive test file (11 tests) covering reversal safety, concurrency, authorization, and historical preservation.

---

## 2. Problem Addressed

**Original Issue (from Phase 2E Audit)**:
- The payment lookup and status check occurred **outside** the transaction and **without row locking**.
- Concurrent reversal requests could both pass the initial `payment.status === "REVERSED"` check, leading to race conditions.
- While the database unique constraint on `Reversal.originalPaymentId` prevented duplicate reversal records, the second request would fail with a generic database error rather than a clear "already reversed" message.

---

## 3. Solution: Concurrency-Safe Reversal with `FOR UPDATE` Locking

### Locking Strategy

```typescript
const payment = await tx.$queryRaw<{
  id: string;
  masjidId: string;
  status: string;
  amountPaise: number;
  receiptNo: string;
}[]>`
  SELECT id, "masjidId", status, "amountPaise", "receiptNo"
  FROM "Payment"
  WHERE id = ${paymentId}
  FOR UPDATE
`;
```

### Key Design Decisions

1. **Lock inside transaction**: The `SELECT ... FOR UPDATE` is executed inside the Prisma `$transaction` block, ensuring the lock is held for the entire reversal operation.

2. **Re-check status after lock**: After acquiring the lock, the payment status is re-verified:
   ```typescript
   if (payment[0].status === "REVERSED") {
     throw new Error("This payment is already reversed.");
   }
   ```
   This prevents the TOCTOU (Time-of-Check-Time-of-Use) race where a concurrent reversal could flip the status between the initial check and the lock.

3. **Tenant scoping verified under lock**: The `masjidId` is checked **inside** the locked query, preventing cross-tenant access even under race conditions.

4. **Database unique constraint as final safety net**: `Reversal.originalPaymentId @unique` guarantees that even if a race condition somehow bypasses the application logic, no duplicate reversal records can be created.

5. **Clear error handling**: 
   - "Payment not found in this Masjid." for missing/wrong-tenant payments
   - "This payment is already reversed." for duplicate attempts (both application-level and unique constraint violations)
   - Generic "Could not reverse the payment." for unexpected errors (no stack traces leaked)

### Complete Transaction Flow

```
BEGIN TRANSACTION
├── SELECT Payment ... FOR UPDATE (lock row)
├── Verify tenant ownership (masjidId match)
├── Re-check status !== "REVERSED"
├── Fetch allocations
├── UPDATE Payment SET status = 'REVERSED'
├── INSERT Reversal (originalPaymentId, amountPaise, reason, approvedBy)
├── INSERT ReceiptEvent (CANCELLED, reason)
├── FOR EACH allocation:
│   ├── recomputePeriodStatus (dues periods)
│   ├── recomputeAssignmentStatus (event assignments)
│   └── recomputeEventStatus (collection events)
├── INSERT AuditLog (payment.reverse)
COMMIT
```

---

## 4. How Concurrent Duplicate Reversals Are Handled

| Scenario | Behavior |
|---|---|
| Request A acquires lock first | Updates payment to REVERSED, creates Reversal record, commits. |
| Request B waits for lock | When lock released, sees `status === "REVERSED"`, throws "already reversed" error. |
| Both pass initial check before locking | First to acquire lock wins; second re-checks status inside lock and fails cleanly. |
| Unique constraint collision (extreme edge case) | Caught in catch block, returns "This payment is already reversed." |

**Result**: Exactly one reversal record created, payment reversed exactly once, balances restored exactly once. Losing request gets clear, safe error message.

---

## 5. Balance Recomputation Verification

The reversal correctly restores outstanding balances on:

- **DuesPeriod**: `recomputePeriodStatus` filters allocations by `payment.status === "SUCCESS"`, so reversed payment's allocations are excluded → status reverts to `PENDING` / `PARTIAL`.
- **CollectionEventAssignment**: `recomputeAssignmentStatus` uses `sumEventAllocationsForMember` which filters by `payment.status === "SUCCESS"` → assignment status reverts.
- **CollectionEvent**: `recomputeEventStatus` filters by `payment.status === "SUCCESS"` → event status reverts from `COMPLETED` to `SCHEDULED` (or `OPEN` if partial).

All recomputations execute inside the same transaction, guaranteeing atomicity.

---

## 6. Test Database Verification

- Tests run against isolated PostgreSQL test database (`TEST_DATABASE_URL` with "test" in database name).
- Schema verified via `_prisma_migrations` table (baseline migration `20261022000000_postgres_baseline`).
- Fixtures created fresh per test file, cleaned up in `afterAll`.
- No production data touched. No `DROP`, `TRUNCATE`, `RESET`, or destructive migrations.

---

## 7. Test Commands & Results

### New Test File: `tests/payment-reversal.test.ts` (11 tests)

```
✅ successfully reverses a payment
✅ reverses a payment with multiple allocations to dues periods and collection events
✅ restores Dues Period outstanding balance and status to PENDING after reversal
✅ restores Collection Event Assignment and Event balance after reversal
✅ prevents duplicate reversal and returns clear error
✅ handles concurrent reversal requests safely: exactly one succeeds, one fails with clear error
✅ rejects cross-tenant reversal attempt
✅ rejects reversal from unauthenticated user
✅ rejects reversal from user without payment:reverse permission
✅ leaves no partial state if reversal transaction fails mid-way (verifies atomicity)
✅ preserves all historical records after reversal
```

### Full Regression Suite (102 tests):

| Test File | Tests | Status |
|-----------|-------|--------|
| `tests/payment-reversal.test.ts` | 11 | ✅ |
| `tests/tenant-isolation.test.ts` | 35 | ✅ |
| `tests/allocations.test.ts` | 16 | ✅ |
| `tests/concurrency.test.ts` | 4 | ✅ |
| `tests/concurrent-action.test.ts` | 3 | ✅ |
| `tests/numbering.test.ts` | 9 | ✅ |
| `tests/dates-dues.test.ts` | 9 | ✅ |
| `tests/dues-generation-fix.test.ts` | 8 | ✅ |
| `tests/receipt-pdf.test.ts` | 7 | ✅ |
| **Total** | **102** | **All Passed** |

### TypeScript Compilation:
```
npx tsc --noEmit → ✅ No errors
```

---

## 8. Concurrency Testing Against PostgreSQL

**Verified**:
1. **Concurrent reversal of same payment**: `Promise.all([reverse(), reverse()])` — exactly one succeeds, one fails with "already reversed". Exactly one `Reversal` record created. Payment status `REVERSED` once. Balances restored once.
2. **Cross-tenant rejection**: Admin of Masjid A cannot reverse payment in Masjid B.
3. **Authorization rejection**: Unauthenticated users get `UNAUTHENTICATED`; users with `COLLECTOR` role (no `payment:reverse`) get `FORBIDDEN`.
4. **Historical preservation**: Original payment row, allocations, `ISSUED` receipt event, and `payment.create` audit log all preserved. Only `status` field changes to `REVERSED`; new `CANCELLED` receipt event and `payment.reverse` audit log added.

All tests use real PostgreSQL transactions and row-level locking — no mocks.

---

## 9. Remaining Limitations

- **No automatic scheduled reversal auditing**: Reversals are manual staff actions. A scheduled report of reversed payments could be a future enhancement.
- **No "soft" reversal reason categories**: The `reason` field is free-text; structured reason codes (duplicate, fraud, error, donor-request) could be added if needed.

---

## 10. Safety Confirmation

- **No production data modified**: All tests used isolated test fixtures in the configured test database.
- **No destructive commands**: No `DROP`, `TRUNCATE`, `RESET`, or migration operations.
- **Historical records preserved**: Original payments, allocations, receipt events, audit logs all remain intact.
- **Receipt numbering unchanged**: No modification to receipt sequence logic.
- **Dues generation unchanged**: Phase 2D behavior preserved.

---

## 11. Stop Condition Reached

Phase 2E fix complete and verified. Awaiting review before Phase 2F.

**Co-Authored-By: Claude Code <noreply@anthropic.com>**