# Phase 2: Financial Integrity & Transaction Safety — Read-Only Audit Report

**Date:** 2026-10-22  
**Status:** Read-Only Audit Complete — Awaiting Implementation Approval  
**Prepared for:** Masjid Collection Project Stakeholders

---

## Executive Summary

This audit examines the remaining high-severity financial integrity risks identified in Phase 0 (R-5, R-6, R-7) and performs a comprehensive review of all transaction boundaries, concurrency controls, constraint enforcement, and audit logging across the financial modules. The audit is **read-only** — no code changes have been made.

**Key Findings:**

| Risk ID | Phase 0 Description | Phase 1 Status | Phase 2 Audit Verdict |
|---------|---------------------|----------------|----------------------|
| **R-5** | Expense numbering uses `COUNT(*)` — concurrency risk | Deferred to Phase 2 | **CONFIRMED UNRESOLVED** — race condition exists |
| **R-6** | Member numbering uses lexicographic sort — boundary at 6→7 digits | Deferred to Phase 2 | **CONFIRMED UNRESOLVED** — lexicographic sort breaks at boundary |
| **R-7** | `generateDuesPeriods` called OUTSIDE plan transaction | Deferred to Phase 2 | **CONFIRMED UNRESOLVED** — periods can be orphaned from plan |

**Additional Critical Risks Identified:**
- **R-8 (New):** Receipt numbering `nextReceiptNumber` uses read-modify-write on `ReceiptSequence` without `SELECT FOR UPDATE` — lost updates under concurrent payment creation
- **R-9 (New):** `removeHouseholdAssignmentAction` does NOT call `recomputeEventStatus` — stale event status after assignment removal
- **R-10 (New):** `createExpenseAction` auto-approves if user has `expense:approve` permission — separation of duties violation
- **R-11 (New):** Payment allocation to `collectionEventId` lacks FK-enforced `masjidId` match — application-layer check only
- **R-12 (New):** Reversal logic recomputes statuses per-allocation but not atomically — intermediate states visible

---

## Section A: Current Transaction Boundaries

### A.1 Payment Creation (`createPaymentAction`)

**File:** `src/modules/payments/actions.ts` (lines 52-235)

```typescript
// Transaction boundary:
await prisma.$transaction(async (tx) => {
  // 1. Idempotency check (SELECT on Payment by idempotencyKey)
  // 2. nextReceiptNumber(tx, ...) — read-modify-write on ReceiptSequence
  // 3. Payment.create()
  // 4. PaymentAllocation.create() loop
  // 5. recomputePeriodStatus / recomputeAssignmentStatus / recomputeEventStatus
  // 6. ReceiptEvent.create()
  // 7. writeAudit()
});
```

**Properties:**
- ✅ Single interactive transaction — all writes atomic
- ✅ Idempotency key checked INSIDE transaction (prevents duplicate payments)
- ✅ Receipt number allocated inside transaction after validation
- ✅ Allocation totals validated before transaction
- ✅ Cross-tenant checks BEFORE transaction (member, categories, dues periods, collection events)
- ❌ **R-8:** `nextReceiptNumber` uses `findUnique` + `update`/`create` — no `FOR UPDATE` lock

### A.2 Payment Reversal (`reversePaymentAction`)

**File:** `src/modules/payments/actions.ts` (lines 242-322)

```typescript
// Transaction boundary:
await prisma.$transaction(async (tx) => {
  // 1. Payment.update({ status: "REVERSED" })
  // 2. Reversal.create()
  // 3. ReceiptEvent.create({ eventType: "CANCELLED" })
  // 4. For EACH allocation: recomputePeriodStatus / recomputeAssignmentStatus / recomputeEventStatus
  // 5. writeAudit()
});
```

**Properties:**
- ✅ Original payment never deleted — marked `REVERSED`
- ✅ Reversal record created with mandatory reason and approver
- ❌ **R-12:** Status recomputation happens in loop — intermediate states visible to concurrent readers
- ❌ No `SELECT FOR UPDATE` on allocations being recomputed

### A.3 Member Creation (`createMemberAction`)

**File:** `src/modules/members/actions.ts` (lines 45-130)

```typescript
// Transaction boundary:
await prisma.$transaction(async (tx) => {
  // 1. nextMemberNumber(tx, masjidId) — lexicographic sort
  // 2. Optional: User.create() for portal account
  // 3. Member.create()
  // 4. writeAudit()
});
```

**Properties:**
- ✅ Phone duplicate check BEFORE transaction
- ✅ Portal account email uniqueness checked inside transaction
- ❌ **R-6:** `nextMemberNumber` uses `ORDER BY memberNo DESC` — lexicographic sort breaks at M9→M10 boundary (MAS-000009 → MAS-000010 sorts after MAS-000009, but MAS-100000 sorts BEFORE MAS-000009)

### A.4 Expense Creation (`createExpenseAction`)

**File:** `src/modules/expenses/actions.ts` (lines 14-79)

```typescript
// Transaction boundary:
await prisma.$transaction(async (tx) => {
  // 1. nextExpenseNumber(tx, masjidId, date, financialYearStartMonth) — COUNT(*)
  // 2. Expense.create()
  // 3. writeAudit()
});
```

**Properties:**
- ✅ Category ownership verified before transaction
- ❌ **R-5:** `nextExpenseNumber` uses `COUNT(*)` — race condition: two concurrent calls see same count, generate same number
- ❌ **R-10:** `approvalStatus` auto-set to `APPROVED` if user has `expense:approve` — no separation of duties

### A.5 Plan Creation & Dues Generation (`createPlanAction`)

**File:** `src/modules/plans/actions.ts` (lines 14-84)

```typescript
// Transaction 1:
await prisma.$transaction(async (tx) => {
  // 1. ContributionPlan.create()
  // 2. PlanAmountHistory.create()
  // 3. writeAudit()
});

// Dues generation OUTSIDE transaction:
await generateDuesPeriods(plan.id);  // ← Separate call, separate transaction(s)
```

**Properties:**
- ✅ Plan and history created atomically
- ❌ **R-7:** `generateDuesPeriods` called AFTER transaction commits — if it fails, plan exists without periods
- ❌ `generateDuesPeriods` creates periods in a loop with individual try/catch — partial success possible

### A.6 Collection Event Assignment (`assignHouseholdsAction` / `removeHouseholdAssignmentAction`)

**File:** `src/modules/collections/actions.ts`

```typescript
// assignHouseholdsAction — Transaction:
await prisma.$transaction(async (tx) => {
  // 1. Delete existing assignments for these members
  // 2. Create new assignments
  // 3. writeAudit()
});
// Does NOT call recomputeEventStatus

// removeHouseholdAssignmentAction — Transaction:
await prisma.$transaction(async (tx) => {
  // 1. Delete assignment
  // 2. writeAudit()
});
// Does NOT call recomputeEventStatus — **R-9**
```

**Properties:**
- ✅ Member ownership verified before transaction
- ❌ **R-9:** Event status not recomputed after assignment changes

---

## Section B: Concurrency Risk Assessment

### B.1 Receipt Numbering — `nextReceiptNumber` (R-8)

**File:** `src/lib/receipts/numbering.ts` (lines 12-40)

```typescript
const existing = await tx.receiptSequence.findUnique({
  where: { masjidId_financialYear: { masjidId, financialYear: fy } },
});
const next = (existing?.lastNumber ?? 0) + 1;

if (existing) {
  await tx.receiptSequence.update({ where: { id: existing.id }, data: { lastNumber: next } });
} else {
  await tx.receiptSequence.create({ data: { masjidId, financialYear: fy, lastNumber: next } });
}
```

**Risk:** **HIGH** — Classic lost-update race condition. Two concurrent transactions:
1. Both read `lastNumber = 5`
2. Both compute `next = 6`
3. Both write `6` — one receipt number skipped, or duplicate if unique constraint catches it

**Mitigation Required:** `SELECT FOR UPDATE` on `ReceiptSequence` row, or use PostgreSQL `SEQUENCE` object.

### B.2 Expense Numbering — `nextExpenseNumber` (R-5)

**File:** `src/lib/receipts/numbering.ts` (lines 61-70)

```typescript
const count = await tx.expense.count({ where: { masjidId, expenseNo: { startsWith: `EXP-${fy}-` } } });
return `EXP-${fy}-${String(count + 1).padStart(6, "0")}`;
```

**Risk:** **HIGH** — `COUNT(*)` is not transactionally isolated from concurrent inserts. Two concurrent calls:
1. Both see `count = 3`
2. Both generate `EXP-2026-04-000004`
3. Unique constraint on `(masjidId, expenseNo)` catches one — but the other succeeds with wrong number

**Mitigation Required:** Use `ReceiptSequence`-style table for expenses, or PostgreSQL `SEQUENCE`.

### B.3 Member Numbering — `nextMemberNumber` (R-6)

**File:** `src/lib/receipts/numbering.ts` (lines 46-58)

```typescript
const last = await tx.member.findFirst({
  where: { masjidId, memberNo: { startsWith: "MAS-" } },
  orderBy: { memberNo: "desc" },
  select: { memberNo: true },
});
const lastNum = last ? Number(last.memberNo.replace("MAS-", "")) : 0;
const next = Number.isFinite(lastNum) ? lastNum + 1 : 1;
return `MAS-${String(next).padStart(6, "0")}`;
```

**Risk:** **MEDIUM** — Lexicographic `ORDER BY memberNo DESC` breaks at digit boundary:
- `MAS-000009` > `MAS-000008` ✅
- `MAS-000010` < `MAS-000009` ❌ (lexicographically "1" < "9")
- Next number after `MAS-000009` would be `MAS-000010` but query returns `MAS-000009` as "last"

**Mitigation Required:** Store numeric sequence in separate column/table, or use `LPAD` in query.

### B.4 Dues Period Generation — `generateDuesPeriods`

**File:** `src/lib/dues.ts` (lines 98-124)

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

**Risk:** **LOW-MEDIUM** — Safe for idempotency (unique constraint on `(planId, periodStart, periodEnd)`), but:
- Called outside plan transaction (R-7)
- Each `create` is separate implicit transaction — partial success leaves plan in inconsistent state
- No locking on plan row during generation

---

## Section C: Constraint Enforcement Gaps

### C.1 Database-Level Constraints (Present)

| Constraint | Table | Status |
|------------|-------|--------|
| `Payment_masjidId_receiptNo_key` | Payment | ✅ Enforced |
| `Payment_masjidId_idempotencyKey_key` | Payment | ✅ Enforced |
| `Member_masjidId_memberNo_key` | Member | ✅ Enforced |
| `Expense_masjidId_expenseNo_key` | Expense | ✅ Enforced |
| `ReceiptSequence_masjidId_financialYear_key` | ReceiptSequence | ✅ Enforced |
| `DuesPeriod_planId_periodStart_periodEnd_key` | DuesPeriod | ✅ Enforced |
| `CollectionEventAssignment_eventId_memberId_key` | CollectionEventAssignment | ✅ Enforced |
| `PaymentAllocation_collectionEventId_fkey` | PaymentAllocation | ✅ Enforced (`ON DELETE SET NULL`) |
| All other FKs | Various | ✅ Enforced |
| 27 `CHECK` constraints | Various | ✅ Enforced |

### C.2 Application-Level Checks (Present but Bypassable)

| Check | Location | Bypass Risk |
|-------|----------|-------------|
| Member ownership in payment | `createPaymentAction` lines 80-86 | Direct DB insert bypasses |
| Category ownership in payment | `createPaymentAction` lines 88-102 | Direct DB insert bypasses |
| DuesPeriod ownership in payment | `createPaymentAction` lines 95-101 | Direct DB insert bypasses |
| CollectionEvent ownership in payment | `createPaymentAction` lines 95-101 | Direct DB insert bypasses |
| Expense category ownership | `createExpenseAction` lines 33-36 | Direct DB insert bypasses |
| Assignment member ownership | `assignHouseholdsAction` lines 248-254 | Direct DB insert bypasses |

**Gap:** All cross-tenant integrity relies on application-layer checks. Direct database access (admin tools, migrations, future APIs) can violate tenant isolation.

### C.3 Missing Database-Level Constraints

| Missing Constraint | Risk | Recommended Fix |
|-------------------|------|-----------------|
| `PaymentAllocation.masjidId` = `Payment.masjidId` | Cross-masjid allocation | Composite FK or trigger |
| `PaymentAllocation.masjidId` = `CollectionEvent.masjidId` | Cross-masjid event allocation | Composite FK or trigger |
| `PaymentAllocation.masjidId` = `DuesPeriod.masjidId` | Cross-masjid period allocation | Composite FK or trigger |
| `DuesPeriod.masjidId` = `ContributionPlan.masjidId` | Cross-masjid period | Already via plan FK cascade |
| `CollectionEventAssignment.memberId` masjid = `CollectionEvent.masjidId` | Cross-masjid assignment | Composite FK or trigger |

---

## Section D: Audit Logging Coverage

### D.1 Current Audit Coverage

| Action | Module | Audited? | Before/After Captured? |
|--------|--------|----------|------------------------|
| `member.create` | members | ✅ | After only |
| `member.update` | members | ✅ | Before + After |
| `payment.create` | payments | ✅ | After only |
| `payment.reverse` | payments | ✅ | Before (status) + After + metadata |
| `receipt.reprint` | payments | ✅ | Metadata only |
| `expense.create` | expenses | ✅ | After only |
| `expense.decide` | expenses | ✅ | Before + After (approvalStatus) |
| `plan.create` | plans | ✅ | After only |
| `plan.changeAmount` | plans | ✅ | Before + After + metadata |
| `dues.generate` | plans | ✅ | Metadata only |
| `collectionEvent.create` | collections | ✅ | After only |
| `collectionEvent.update` | collections | ✅ | Before + After |
| `collectionEvent.delete` | collections | ✅ | Before only |
| `collectionEvent.assignHouseholds` | collections | ✅ | After only (count) |
| `collectionEvent.removeAssignment` | collections | ✅ | Before only (memberId) |
| `collectionEvent.generate` | collections | ✅ | After only (count) |
| `staff.deactivate/reactivate` | staff | ✅ | Before + After + metadata |
| `masjid.suspend/activate` | platform | ❌ | NOT AUDITED |
| `masjid.create` | platform | ❌ | NOT AUDITED |
| `masjid.delete` | platform | ❌ | NOT AUDITED |
| `masjid.update` | platform | ❌ | NOT AUDITED |

### D.2 Audit Log Schema

**File:** `prisma/schema.prisma` (lines 391-407)

```prisma
model AuditLog {
  id          String   @id @default(cuid())
  masjidId    String?
  actorUserId String?
  action      String
  entityType  String
  entityId    String?
  beforeJson  String?
  afterJson   String?
  metadata    String?
  createdAt   DateTime @default(now())
  ...
  @@index([masjidId, createdAt])
  @@index([masjidId, entityType, entityId])
}
```

**Observations:**
- ✅ Immutable (no update/delete in code)
- ✅ Per-masjid partitioning via index
- ❌ No tamper-evident chaining (hash chain)
- ❌ Platform-level actions (masjid CRUD) NOT audited — critical for SUPER_ADMIN accountability
- ❌ `beforeJson`/`afterJson` stored as JSON strings — no schema validation
- ❌ No automated retention/archival policy

---

## Section E: Reversal & Correction Logic

### E.1 Reversal Flow (`reversePaymentAction`)

```typescript
// 1. Find payment with allocations + reversalFor
// 2. Verify status !== "REVERSED"
// 3. Transaction:
//    a. Payment.update({ status: "REVERSED" })
//    b. Reversal.create({ originalPaymentId, amountPaise, reason, approvedBy })
//    c. ReceiptEvent.create({ eventType: "CANCELLED", reason })
//    d. For EACH allocation:
//       - recomputePeriodStatus / recomputeAssignmentStatus / recomputeEventStatus
//    e. writeAudit()
```

**Strengths:**
- ✅ Original payment preserved (never deleted)
- ✅ Reversal record links to original + approver + reason
- ✅ Receipt event log captures CANCELLED with reason
- ✅ All related statuses recomputed

**Weaknesses:**
- ❌ **R-12:** Recomputation per-allocation in loop — concurrent reader sees intermediate states
- ❌ No `reversalPaymentId` created (no contra-entry payment) — ledger shows reversal but no offsetting entry
- ❌ `Reversal.reversalPaymentId` nullable, never used
- ❌ No validation that reversal amount equals payment amount (enforced by code but not DB)

### E.2 Idempotency Protection

**Payment:** `idempotencyKey` unique per masjid — ✅ enforced by unique index  
**Expense:** No idempotency key — ❌ duplicate expenses possible  
**Member:** Phone duplicate check application-only — ❌ bypassable  
**Plan:** No idempotency key — ❌ duplicate plans possible  

---

## Section F: Business Rules Summary

### F.1 Payment Rules

| Rule | Enforcement | Location |
|------|-------------|----------|
| One payment per idempotency key per masjid | DB unique index + app check | `createPaymentAction` |
| Allocation total ≤ payment amount | App validation | `createPaymentAction` lines 73-76 |
| At least one allocation required | App validation | `createPaymentAction` lines 134-136 |
| Cross-tenant references rejected | App validation | `createPaymentAction` lines 78-102 |
| Suspended masjid rejects payments | App validation | `createPaymentAction` lines 104-109 |
| Receipt number unique per masjid per FY | DB unique index + sequence table | `nextReceiptNumber` |
| Reversed payments excluded from status | App filter (`status === "SUCCESS"`) | `recomputePeriodStatus`, `sumEventAllocationsForMember` |

### F.2 Expense Rules

| Rule | Enforcement | Location |
|------|-------------|----------|
| Category must belong to masjid | App validation | `createExpenseAction` lines 33-36 |
| Expense number unique per masjid per FY | DB unique index | `Expense_masjidId_expenseNo_key` |
| Auto-approval if user has `expense:approve` | App logic | `createExpenseAction` line 58 |

### F.3 Dues & Collection Rules

| Rule | Enforcement | Location |
|------|-------------|----------|
| Period status derived from SUCCESS allocations only | App logic | `recomputePeriodStatus` line 137 |
| WAIVED status never downgraded | App logic | `recomputePeriodStatus` line 144 |
| Assignment settled only by member's own payments | App logic | `sumEventAllocationsForMember` line 192 |
| Event status from assignments + allocations | App logic | `recomputeEventStatus` |
| Dues periods idempotent per plan | DB unique index | `DuesPeriod_planId_periodStart_periodEnd_key` |

### F.4 Tenant Isolation Rules

| Rule | Enforcement |
|------|-------------|
| All queries scoped by `masjidId` | Application pattern (verified by 35 tests) |
| SUPER_ADMIN only: `tenant:manage` | Permission matrix |
| Local Admin cannot read/modify other masjid | Application checks + test verification |
| Cookie role claim ignored; DB membership decides | `getCurrentUser` in `src/lib/auth.ts` |

---

## Section G: Risk Register — Detailed Classification

| ID | Risk | Severity | Classification | Evidence |
|----|------|----------|----------------|----------|
| **R-5** | Expense numbering `COUNT(*)` race | High | **CONFIRMED UNRESOLVED** | `nextExpenseNumber` uses `COUNT(*)` without locking |
| **R-6** | Member numbering lexicographic sort | High | **CONFIRMED UNRESOLVED** | `ORDER BY memberNo DESC` breaks at 6→7 digits |
| **R-7** | Dues generation outside plan transaction | High | **CONFIRMED UNRESOLVED** | `generateDuesPeriods` called after `createPlanAction` transaction |
| **R-8** | Receipt numbering lost update | High | **CONFIRMED UNRESOLVED (NEW)** | `nextReceiptNumber` read-modify-write without `FOR UPDATE` |
| **R-9** | Event status stale after assignment removal | Medium | **CONFIRMED UNRESOLVED (NEW)** | `removeHouseholdAssignmentAction` doesn't call `recomputeEventStatus` |
| **R-10** | Expense auto-approval — no separation of duties | Medium | **CONFIRMED UNRESOLVED (NEW)** | `createExpenseAction` line 58 |
| **R-11** | PaymentAllocation→CollectionEvent FK not tenant-scoped | Medium | **PARTIALLY ADDRESSED** | FK exists but `ON DELETE SET NULL`; app checks only |
| **R-12** | Reversal status recomputation not atomic | Medium | **CONFIRMED UNRESOLVED (NEW)** | Loop of independent `recompute*` calls in transaction |
| **R-13** | No idempotency on expense/member/plan create | Low | **CONFIRMED UNRESOLVED** | Only payment has `idempotencyKey` |
| **R-14** | Platform actions (masjid CRUD) not audited | Medium | **CONFIRMED UNRESOLVED** | `platform/actions.ts` has no `writeAudit` calls |
| **R-15** | Audit log not tamper-evident | Low | **UNABLE TO VERIFY** | No hash chain; would need design decision |
| **R-16** | Cross-tenant FK gaps (allocation→event/period) | Medium | **PARTIALLY ADDRESSED** | App checks present; DB triggers missing |

---

## Section H: Implementation Plan — Independently Reviewable Steps

### Phase 2A: Numbering Concurrency Fixes (High Priority)

| Step | Scope | Files | Test Strategy |
|------|-------|-------|---------------|
| **2A.1** | Receipt numbering: add `SELECT FOR UPDATE` to `nextReceiptNumber` | `src/lib/receipts/numbering.ts` | Concurrent payment test (10 parallel) |
| **2A.2** | Expense numbering: introduce `ExpenseSequence` table (like `ReceiptSequence`) | `prisma/schema.prisma`, `src/lib/receipts/numbering.ts`, migration | Concurrent expense test |
| **2A.3** | Member numbering: add `memberSequence` column to `Masjid` or sequence table | `prisma/schema.prisma`, `src/lib/receipts/numbering.ts`, migration | Boundary test (MAS-000009 → MAS-000010) |

### Phase 2B: Transaction Atomicity (High Priority)

| Step | Scope | Files | Test Strategy |
|------|-------|-------|---------------|
| **2B.1** | Move `generateDuesPeriods` INSIDE `createPlanAction` transaction | `src/modules/plans/actions.ts` | Plan creation failure rolls back periods |
| **2B.2** | Add `recomputeEventStatus` call to `removeHouseholdAssignmentAction` | `src/modules/collections/actions.ts` | Assignment removal updates event status |
| **2B.3** | Make reversal status recomputation atomic (single query or lock) | `src/modules/payments/actions.ts`, `src/lib/dues.ts` | Concurrent reversal + read test |

### Phase 2C: Separation of Duties & Constraints (Medium Priority)

| Step | Scope | Files | Test Strategy |
|------|-------|-------|---------------|
| **2C.1** | Remove auto-approval in `createExpenseAction`; always `PENDING` | `src/modules/expenses/actions.ts` | Expense created by approver → status PENDING |
| **2C.2** | Add composite FKs or triggers for cross-tenant allocation integrity | Migration SQL + `prisma/schema.prisma` | Direct DB insert test blocked |
| **2C.3** | Add `idempotencyKey` to expense, member, plan create actions | Respective action files + schema | Duplicate submission test |

### Phase 2D: Audit Completeness (Medium Priority)

| Step | Scope | Files | Test Strategy |
|------|-------|-------|---------------|
| **2D.1** | Add audit logging to all platform masjid actions | `src/modules/platform/actions.ts` | SUPER_ADMIN actions appear in audit log |
| **2D.2** | Add audit logging to expense approve/reject (already present ✅) | — | Verified |
| **2D.3** | Consider tamper-evident hash chain for audit log | `prisma/schema.prisma`, `src/modules/audit/write.ts` | Design decision needed |

### Phase 2E: Reversal Enhancement (Low Priority)

| Step | Scope | Files | Test Strategy |
|------|-------|-------|---------------|
| **2E.1** | Create contra-entry payment on reversal (`reversalPaymentId`) | `src/modules/payments/actions.ts`, `src/lib/dues.ts` | Reversal shows in reports as negative |
| **2E.2** | Add reversal amount validation (must equal original) | `src/modules/payments/actions.ts` | Mismatch rejected |

---

## Appendix: Test Coverage Gaps for Phase 2

| Area | Current Tests | Missing Tests |
|------|---------------|---------------|
| Concurrent receipt numbering | 3 tests (sequential) | Parallel payment creation (10+) |
| Concurrent expense numbering | 1 test | Parallel expense creation |
| Member numbering boundary | 0 tests | MAS-000009 → MAS-000010 |
| Dues generation failure rollback | 0 tests | Plan create + generate failure |
| Event status after assignment removal | 0 tests | Assignment delete → event status |
| Expense auto-approval bypass | 0 tests | Approver creates expense → PENDING |
| Reversal atomicity | 0 tests | Concurrent read during reversal |
| Platform action audit | 0 tests | SUPER_ADMIN actions logged |

---

## Next Steps

**Awaiting explicit user approval to proceed with implementation.** The recommended first step is **Phase 2A.1** (receipt numbering `FOR UPDATE`) as it is the highest-risk, smallest-scope fix with a clear test strategy.

**Do NOT implement any changes until explicit authorization is received.**