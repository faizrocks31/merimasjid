# Phase 2E — Read-Only Payment Reversal Safety Audit Report

**Date**: 2026-10-23  
**Status**: 🔍 **AUDIT COMPLETE** — Read-only inspection performed. No files or database records modified.

---

## 1. Scope and Objectives

A comprehensive read-only security and correctness audit of the payment reversal implementation (`reversePaymentAction` in `src/modules/payments/actions.ts` and related data models/recomputation logic) covering:
1. Idempotency & Duplicate Prevention
2. Transaction Atomicity
3. Financial Balance Integrity
4. Tenant Isolation & Authorization
5. Concurrency & Database Locking
6. Receipts, Audit Trail & Historical Records
7. Error Handling & Recovery
8. Existing Tests & Test Coverage Matrix

---

## 2. Code Inspected

- **`src/modules/payments/actions.ts`**: `reversePaymentAction(...)` (lines 387–467)
- **`prisma/schema.prisma`**: `Payment`, `Reversal`, `PaymentAllocation`, `DuesPeriod`, `CollectionEvent`, `CollectionEventAssignment`, `ReceiptEvent`, `AuditLog`
- **`src/lib/dues.ts`**: `recomputePeriodStatus`, `recomputeAssignmentStatus`, `recomputeEventStatus`, `sumEventAllocationsForMember`
- **`tests/tenant-isolation.test.ts`**: Tenant boundary tests for reversal attempts
- **`tests/receipt-pdf.test.ts`**: Receipt PDF rendering tests for cancelled/reversed payments

---

## 3. Detailed Audit Findings by Dimension

### A. Idempotency & Duplicate Prevention
- **Status**: ✅ **SECURE**
- **Implementation**:
  1. Application-level check: `if (payment.status === "REVERSED") return { ok: false, error: "This payment is already reversed." };`
  2. Database-level constraint: The `Reversal` model enforces `originalPaymentId String @unique`. If a race condition bypasses the application check, the database unique constraint prevents duplicate reversal records.
- **Risk**: None. Double-reversal is safely blocked at both application and database layers.

### B. Transaction Atomicity
- **Status**: ✅ **SECURE**
- **Implementation**:
  - All side effects of a reversal—updating payment status to `REVERSED`, creating the `Reversal` record, creating the `ReceiptEvent` (`CANCELLED`), recomputing all affected dues periods and collection events/assignments, and writing the `AuditLog`—are wrapped inside a single Prisma `$transaction(async (tx) => { ... })`.
- **Risk**: None. If any step fails (e.g. recomputation error), the entire transaction rolls back, preventing partial reversal states (e.g., payment marked reversed but balances not restored).

### C. Financial Balance Integrity
- **Status**: ✅ **SECURE**
- **Implementation**:
  - Recomputation functions (`recomputePeriodStatus`, `sumEventAllocationsForMember`, `recomputeEventStatus`) explicitly filter allocations by `payment: { status: "SUCCESS" }`.
  - When a payment's status changes to `REVERSED`, its allocations are automatically excluded from successful payment totals.
  - Consequently, the outstanding balance on dues periods and collection event assignments is immediately restored to its pre-payment state.
- **Risk**: None. Ledger integrity is fully maintained upon reversal.

### D. Tenant Isolation & Authorization
- **Status**: ✅ **SECURE**
- **Implementation**:
  1. Staff authentication required (`requireStaff()`).
  2. Permission check: `assertCan(user.role, "payment:reverse")`.
  3. Tenant scoping: `prisma.payment.findFirst({ where: { id: parsed.data.paymentId, masjidId: user.masjidId! } })` ensures an admin of Masjid A cannot reverse a payment belonging to Masjid B.
- **Risk**: None. Cross-tenant reversal attempts are strictly rejected with `"Payment not found in this Masjid."`.

### E. Concurrency & Database Locking
- **Status**: ⚠️ **MODERATE RISK (TOCTOU / Race Condition)**
- **Finding**:
  - In `reversePaymentAction`, `prisma.payment.findFirst` fetches the payment and its allocations **outside** the transaction and without row-level locking (`FOR UPDATE`).
  - While the transaction itself updates the payment status and recomputes balances, two concurrent requests attempting to reverse the exact same payment simultaneously could both pass the initial `payment.status === "REVERSED"` check outside the transaction.
  - The first transaction would succeed and set status to `REVERSED`. The second transaction would then execute inside its own transaction block, updating an already-reversed payment to `REVERSED` (a no-op on payment status, but would create a duplicate `Reversal` record if not for the `@unique` constraint on `originalPaymentId`).
  - Because `originalPaymentId` has `@unique`, the second transaction's `tx.reversal.create` will throw a unique constraint violation error, causing the transaction to abort and return `"Could not reverse the payment."`.
- **Mitigation / Recommendation**:
  - While database unique constraints prevent data corruption (duplicate reversal records), wrapping the initial payment lookup and status check in a `SELECT FOR UPDATE` query inside the transaction (matching the pattern used in `createPaymentAction`) would eliminate race conditions and redundant execution.

### F. Receipts, Audit Trail & Historical Records
- **Status**: ✅ **SECURE**
- **Implementation**:
  - **No deletion or modification of historical financial records**: The original `Payment` row is never deleted or mutated except for `status: "REVERSED"`.
  - **Receipt Event**: A `ReceiptEvent` of type `CANCELLED` is recorded with the actor ID and reason.
  - **Reversal Record**: A dedicated `Reversal` table entry stores `originalPaymentId`, `amountPaise`, `reason`, and `approvedBy`.
  - **Audit Log**: An immutable `AuditLog` entry records `payment.reverse` with `before: { status: "SUCCESS" }`, `after: { status: "REVERSED" }`, and metadata.
- **Risk**: None. Full historical auditability and receipt transparency are preserved.

### G. Error Handling & Recovery
- **Status**: ✅ **SECURE**
- **Implementation**:
  - Input validation via `reversalSchema`.
  - Try/catch block wrapping the transaction. Errors are logged server-side via `console.error("reversePaymentAction failed", err)` and a safe generic error message is returned to the client (`"Could not reverse the payment."`).
- **Risk**: None. No internal DB errors or stack traces are leaked to clients.

---

## 4. Test Coverage Matrix

| Test Suite / File | Test Case | Covered? | Notes |
|---|---|---|---|
| `tests/tenant-isolation.test.ts` | Local Admin cannot reverse another masjid's payment | ✅ Yes | Proves tenant isolation on reversal |
| `tests/receipt-pdf.test.ts` | Shows CANCELLED and reason on reversed payment PDF | ✅ Yes | Proves receipt PDF rendering for reversals |
| `tests/tenant-isolation.test.ts` | Unauthenticated / unauthorized reversal attempts | ✅ Yes | Proves permission and auth checks |
| **Concurrency / Race Condition** | Concurrent duplicate reversal attempts on same payment | ❌ **No** | Relies on DB unique constraint fallback rather than explicit row lock |
| **Balance Restoration** | Verification that dues period status reverts from PAID/PARTIAL to PENDING upon reversal | ❌ **No** | Tested implicitly via recomputation logic, but lacks a dedicated unit test for reversal balance restoration |

---

## 5. Recommendations for Future Enhancements (Non-Blocking)

1. **Add `SELECT FOR UPDATE` on Reversal Lookup**:
   - Update `reversePaymentAction` to fetch and lock the payment inside the transaction using `FOR UPDATE` to prevent concurrent race conditions.
2. **Add Dedicated Reversal Unit Tests**:
   - Add test cases verifying that dues period and collection event balances are correctly restored when a payment is reversed.
   - Add test cases verifying that concurrent reversal attempts correctly handle unique constraint collisions.

---

## 6. Confirmation of Safety

- **No files or database records were modified during this audit.** All inspection was strictly read-only.
- **No production data affected.**

---

**Stop Condition Reached.** Awaiting review and explicit instructions.
