# Payment & Collection Implementation Audit

**Project:** Multi-Masjid SaaS  
**Date:** 2026-10-21  
**Scope:** Read-only audit of payment/collection implementation  
**Methodology:** Source code review across 15+ files; no runtime testing

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Core Workflows](#core-workflows)
3. [Critical Business Rules](#critical-business-rules)
4. [Confirmed Bugs & Logic Gaps](#confirmed-bugs--logic-gaps)
5. [Risk Register](#risk-register)
6. [Missing Test Coverage](#missing-test-coverage)
7. [Recommendations (Ranked)](#recommendations-ranked)

---

## Executive Summary

The payment and collection system implements **two parallel collection models**:

| Model | Trigger | Core Entities | Status Logic |
|-------|---------|---------------|--------------|
| **Recurring Dues** | ContributionPlan → DuesPeriod (scheduled) | Plan → DuesPeriod → PaymentAllocation | `recomputePeriodStatus()` |
| **Event-Based** | ContributionCategory → CollectionEvent → Assignment (household) | Category → CollectionEvent → CollectionEventAssignment → PaymentAllocation | `recomputeEventStatus()` + `recomputeAssignmentStatus()` |

### Key Architectural Strengths
- **Single source of truth** via `validation-registry.ts` → Zod schemas → forms → server actions
- **Tenant isolation** at three layers: session-derived `masjidId`, query-scoped, object-level checks
- **Idempotency keys** on every payment create prevent duplicate receipts
- **Reversals** are append-only (original payment marked REVERSED + Reversal record + audit)
- **Integer paise** everywhere — no floating-point money
- **IST-aware calendar** helpers (`monthPeriod`, `financialYearRange`, `addMonths`)
- **Receipt numbering** per masjid + financial year with sequential counter

### Critical Findings (Summary)

| Severity | Count | Top Issues |
|----------|-------|------------|
| **Critical** | 3 | Allocation overpayment not blocked at DB level; reversal recomputes ALL assignments (not just payer's); collection event status can flip COMPLETED→OPEN on new partial payment |
| **High** | 4 | Race condition on receipt sequence; no unique constraint on (paymentId, categoryId) in PaymentAllocation; `generateEventsFromCategory` uses local Date (not IST) for weekly; `outstandingDues` loads all allocations into memory |
| **Medium** | 6 | Event status logic requires ALL assignments PAID for COMPLETED (too strict); no concurrency control on plan amount changes; walk-in donor allocations skip assignment status updates |
| **Low** | 5 | CSV export includes reversed payments in count; redundant allocations array in payment schema; `monthsPerPeriod` returns 0 for ONE_TIME but code handles it |

---

## Core Workflows

### 1. Payment Creation (`createPaymentAction`)

**File:** `src/modules/payments/actions.ts` (lines 52–235)  
**Entry Point:** POST `/api/payments/create` → `createPaymentAction`

```
User submits form (member/walk-in + amount + mode + allocations + idempotencyKey)
       │
       ▼
Zod validation (paymentSchema) + manual checks:
  - member exists in masjid (or walkInName provided)
  - allocationTotal ≤ amountPaise
  - every category/period/event belongs to masjid
       │
       ▼
Prisma transaction:
  1. Check idempotencyKey → return existing if duplicate
  2. Allocate next receipt number (receiptSequence + financial year)
  3. Create Payment (status=SUCCESS)
  4. Create PaymentAllocation rows (one per allocation + unallocated remainder)
  5. For each duesPeriodId → recomputePeriodStatus()
  6. For each collectionEventId:
       - If member: find their assignment → recomputeAssignmentStatus()
       - recomputeEventStatus()
  7. Create ReceiptEvent (ISSUED)
  8. writeAudit()
       │
       ▼
Revalidate paths → return {ok, paymentId, receiptNo, duplicate?}
```

**Critical Validation Gaps:**
- No DB-level unique constraint on `(paymentId, categoryId)` → same category can appear multiple times in allocations
- Unallocated remainder silently added to **first category** (line 138–146) — may misrepresent restricted-purpose categories
- `verificationStatus` forced to MANUAL for CASH (line 158) — correct but implicit

---

### 2. Payment Reversal (`reversePaymentAction`)

**File:** `src/modules/payments/actions.ts` (lines 242–322)

```
User submits paymentId + reason (requires payment:reverse permission)
       │
       ▼
Load payment + allocations + reversalFor (to detect already-reversed)
       │
       ▼
Prisma transaction:
  1. payment.update(status="REVERSED")
  2. create Reversal record (amountPaise, reason, approvedBy)
  3. create ReceiptEvent (CANCELLED, reason)
  4. For EACH allocation:
       - if duesPeriodId → recomputePeriodStatus()
       - if collectionEventId →
            find ALL assignments for that event → recomputeAssignmentStatus()  ← BUG: should filter by donorMemberId
            recomputeEventStatus()
  5. writeAudit(payment.reverse)
```

**Bug:** Line 291–297 — `findMany` gets **all assignments** for the event, not just the payer's. A reversal by Member A will recalc Member B's assignment status.

---

### 3. Dues Period Generation (`generateDuesPeriods`)

**File:** `src/lib/dues.ts` (lines 98–124) + `buildPeriods` (lines 40–87)

```
generateDuesPeriods(planId):
  1. Load plan (must be ACTIVE)
  2. buildPeriods(plan, horizon=now+12mo) → array of {periodStart, periodEnd, dueDate, expectedAmountPaise}
  3. For each period: try create DuesPeriod (unique on planId+periodStart+periodEnd)
  4. Return count created
```

**`buildPeriods` Logic:**
- MONTHLY: 1-month periods, dueDay + graceDays
- SEMI_ANNUAL: 6-month periods
- ANNUAL: 12-month periods (dueDay in April by default)
- ONE_TIME: single period (startDate→endDate or startDate)
- **IST anchoring:** `istPartsOf()` extracts year/month in Asia/Kolkata; `monthPeriod()` builds UTC boundaries at IST midnight

**Gap:** `horizon` defaults to 12 months ahead — plans starting far in future won't generate periods until `generateAllDuesForMasjid` or manual trigger.

---

### 4. Event Generation from Category (`generateEventsFromCategoryAction`)

**File:** `src/modules/collections/actions.ts` (lines 290–469)

```
Input: categoryId, startDate, endDate
       │
       ▼
Validate: category has frequency + defaultAmountPaise
       │
       ▼
Loop current=startDate to endDate:
  switch frequency:
    WEEKLY:   periodStart=current (day-of-week), periodEnd=+6d, dueDate=current+defaultDueDay
    MONTHLY:  periodStart=1st, periodEnd=last day, dueDay=defaultDueDay
    SEMI_ANNUAL: 6-month blocks
    ANNUAL/YEARLY: Jan 1–Dec 31, dueDay in April
    EVENT_BASED/OCCASIONAL: error
  push event with expectedAmountPaise=defaultAmount
  advance current by frequency step
       │
       ▼
Transaction: check existing events in range → createMany new events (with masjidId)
```

**Bugs:**
- **WEEKLY** uses `current.getDay()` / `current.setDate()` — these are **local timezone**, not IST. A server in UTC will generate wrong week boundaries.
- No `applicableMonth/applicableYear` set for WEEKLY (lines 357–358 set them but SEMI_ANNUAL/ANNUAL overwrite differently)
- Duplicate detection compares `startDate/endDate` ranges but not `dueDate` — events with same period but different due dates would be skipped

---

### 5. Household Assignment (`assignHouseholdsAction`)

**File:** `src/modules/collections/actions.ts` (lines 225–288)

```
Input: eventId, memberIds[], expectedAmountPaise
       │
       ▼
Verify event + all members belong to masjid
       │
       ▼
Transaction:
  1. DELETE existing assignments for these (eventId, memberIds)
  2. CREATE new assignments (status=PENDING)
  3. writeAudit()
```

**Design Note:** Assignments are **replaced**, not updated — prior payment history for removed members becomes orphaned (allocations still point to event but assignment gone).

---

### 6. Status Recomputation

#### `recomputePeriodStatus` (Dues)
```ts
allocated = sum(allocations where payment.status=SUCCESS)
if allocated >= expected → PAID
else if allocated > 0 → PARTIAL
else → PENDING
WAIVED is sticky (never downgraded)
```

#### `recomputeAssignmentStatus` (Event Household)
```ts
allocated = sum(paymentAllocations where eventId + payment.status=SUCCESS + donorMemberId=memberId)
if allocated >= expected → PAID
else if allocated > 0 → PARTIAL
else → PENDING
WAIVED is sticky
```

#### `recomputeEventStatus` (Event Overall)
```ts
expectedPaise = hasAssignments ? sum(assignments.expectedAmountPaise) : event.expectedAmountPaise
receivedPaise = sum(all successful allocations to event)
paidAssignments = count(assignments where status=PAID)

if event.status=CANCELLED → CANCELLED
else if expected>0 AND received>=expected AND paidAssignments==totalAssignments → COMPLETED
else if received>0 OR (hasAssignments AND paidAssignments>0) → OPEN
else → SCHEDULED
```

**Logic Gap:** Event goes COMPLETED **only if every assigned household is PAID**. A single partial household keeps event OPEN even if total received ≥ expected. This may be intentional but is strict.

---

### 7. Report Aggregation

**File:** `src/modules/reports/queries.ts`

| Report | Query Strategy | Double-Count Protection |
|--------|---------------|------------------------|
| `collectionSummary` | `payment.aggregate` (all SUCCESS) − `payment.aggregate` (REVERSED) | Reversed included in gross so gross−reversed=net |
| `categoryTotals` | `paymentAllocation.groupBy(categoryId)` where payment.SUCCESS + date range | Only SUCCESS allocations counted |
| `eventTotals` | Load events + assignments + allocations (filtered by payment.SUCCESS + date range) | Allocations scoped to event only |
| `outstandingDues` | Load PENDING/PARTIAL periods + their SUCCESS allocations → sum(max(expected−allocated,0)) | Per-period calc prevents cross-period masking |
| `pendingDueRows` | Same as outstandingDues but returns row detail | — |

**Consistency Risk:** `categoryTotals` and `eventTotals` both read `paymentAllocation` but with different filters (date range on payment vs. no date range on event totals). A payment allocated to an event in March but event due in April appears in category report for March, event report for April — correct separation but operators must understand the difference.

---

## Critical Business Rules

### 1. Tenant Isolation (Three Layers)
| Layer | Implementation |
|-------|----------------|
| Session | `getCurrentUser()` → `user.masjidId` from active membership |
| Query | Every `prisma.xxx.findXxx({ where: { masjidId: user.masjidId, ... } })` |
| Object | `assertCan(user.role, permission)` + explicit `masjidId` checks on cross-refs |

### 2. Money Representation
- **All amounts stored as integer paise** (INR × 100)
- `parseRupeesToPaise()` rejects >2 decimal places, negatives, scientific notation
- `formatPaise()` / `formatPaisePlain()` for display
- `numberToWordsIndian()` for receipts (crore/lakh/thousand)

### 3. Receipt Numbering
- Format: `{PREFIX}-{FY}-{SEQ:06d}` (e.g., `MSA-2026-27-000042`)
- `ReceiptSequence` table: unique on `(masjidId, financialYear)`
- `nextReceiptNumber()` **must run inside Prisma transaction** (read-modify-write)
- FY label from `financialYearLabel(date, startMonth)` — April default

### 4. Idempotency
- Client generates `crypto.randomUUID()` (or fallback) → stored in `Payment.idempotencyKey`
- Unique index: `@@unique([masjidId, idempotencyKey])`
- On duplicate key: return existing payment + `duplicate: true` flag
- Reprint tracked via `ReceiptEvent(eventType="REPRINTED")`

### 5. Reversal Rules
- Original payment **never deleted/modified** — status→REVERSED
- `Reversal` record: `originalPaymentId` (unique), `amountPaise`, `reason`, `approvedBy`
- Optional `reversalPaymentId` for offsetting entry (not used in current flow)
- All period/assignment/event statuses **recomputed** after reversal

### 6. Calendar & Financial Year
- All date boundaries computed in **Asia/Kolkata** (IST)
- `monthPeriod(year, month)` → UTC start/end at IST midnight
- `addMonths()` preserves day-of-month, clamps to target month length
- `financialYearRange(date, startMonth=4)` → inclusive start / exclusive end
- `parseISODate("YYYY-MM-DD")` → UTC instant at 00:00 IST

---

## Confirmed Bugs & Logic Gaps

### C1. Allocation Overpayment Not Enforced at DB Level
**Location:** `src/modules/payments/actions.ts:73–76`  
**Issue:** Application-level check `allocationTotal > amountPaise` returns error, but **no unique constraint or check constraint** prevents direct DB inserts or race conditions. Two concurrent payments could each allocate ≤ amount but combined exceed.  
**Evidence:** `PaymentAllocation` model (schema.prisma:276–295) has no constraint on sum per payment.

### C2. Reversal Recomputes ALL Event Assignments
**Location:** `src/modules/payments/actions.ts:291–297`  
**Issue:** `findMany({ where: { eventId } })` loads every household assignment for the event, then calls `recomputeAssignmentStatus` for each. A reversal by Member A recalculates Member B's assignment status.  
**Fix:** Filter by `memberId` of the reversing payment's donor (if member payment) or skip assignment recompute for walk-ins.

### C3. Event Status Can Flip COMPLETED → OPEN
**Location:** `src/lib/dues.ts:227–234`  
**Issue:** `recomputeEventStatus` sets COMPLETED only when `receivedPaise >= expectedPaise AND paidAssignments === totalAssignments`. If a new partial payment arrives after COMPLETED (e.g., late payer), `receivedPaise` increases but `paidAssignments` may not change → status becomes OPEN.  
**Risk:** Dashboard flicker; audit confusion. Consider making COMPLETED sticky or adding a "closed" flag.

### H1. Race Condition on Receipt Sequence
**Location:** `src/lib/receipts/numbering.ts:12–40`  
**Issue:** `nextReceiptNumber` does `findUnique` → `update`/`create` inside a transaction. SQLite serializes writes so this is safe **for single-server deployments**. On multi-instance (Vercel Fluid Compute, Kubernetes), two transactions can read same `lastNumber`, both write `lastNumber+1` → duplicate receipt numbers.  
**Mitigation:** Use `prisma.$transaction` with isolation level (not supported by SQLite) or advisory lock. For SQLite, current behavior is safe; document assumption.

### H2. No Unique Constraint on (paymentId, categoryId) in PaymentAllocation
**Location:** `prisma/schema.prisma:276–295`  
**Issue:** Same category can appear multiple times in one payment's allocations. `createPaymentAction` creates one allocation per input + unallocated remainder on first category (lines 138–146), but nothing prevents manual/allocator creating duplicates.  
**Impact:** `categoryTotals` would double-count; receipt PDF may show duplicate lines.

### H3. Weekly Event Generation Uses Local Timezone
**Location:** `src/modules/collections/actions.ts:347–360`  
**Issue:** `current.getDay()`, `current.setDate()`, `current.getMonth()` operate in **server local timezone**, not IST. On a UTC server, "week starting Monday" shifts.  
**Fix:** Use `istParts(current)` to get IST day-of-week, build dates via `istMidnight()`.

### H4. `outstandingDues` Loads All Allocations Into Memory
**Location:** `src/modules/reports/queries.ts:54–77`  
**Issue:** Fetches all PENDING/PARTIAL periods with nested allocations, then reduces in JS. For masjids with 10k+ periods, this pulls MBs of data.  
**Fix:** Use Prisma aggregation with `_sum` on filtered allocations, or a raw query.

### H5. Walk-in Donor Payments Skip Assignment Status Updates
**Location:** `src/modules/payments/actions.ts:180–193`  
**Issue:** `if (member?.id) { find assignment for member; recomputeAssignmentStatus }` — walk-in payments (no `memberId`) never update `CollectionEventAssignment` status. Household assignments stay PENDING even if event is fully paid by walk-ins.  
**Design Decision:** Assignments track *member* obligations; walk-ins are "extra" — but event status uses total received, so event may show COMPLETED while assignments show PENDING. Inconsistent UX.

### H6. Unallocated Remainder Assigned to First Category (Even if Restricted)
**Location:** `src/modules/payments/actions.ts:138–146`  
**Issue:** If `allocationTotal < amountPaise`, remainder pushed to `rows[0].categoryId` with `purposeNote: "Unallocated balance"`. If that category has `restrictedPurpose=true`, the remainder is misattributed.  
**Fix:** Create allocation with `categoryId: null` (not allowed by schema) or a dedicated "Unallocated" category.

### M1. Event Status Requires ALL Assignments PAID for COMPLETED
**Location:** `src/lib/dues.ts:230`  
**Issue:** `paidAssignments === event.assignments.length` — a single household with 1₹ short keeps event OPEN. For large events (100+ households), this is fragile.  
**Suggestion:** Add `completionThreshold` (e.g., 95% of expected received) or make COMPLETED sticky.

### M2. No Concurrency Control on Plan Amount Change
**Location:** `src/modules/plans/actions.ts:108–116`  
**Issue:** `changePlanAmountAction` updates `ContributionPlan.amountPaise` AND `DuesPeriod.expectedAmountPaise` for PENDING periods ≥ effective date. Two admins changing amount simultaneously → last write wins, no conflict detection.  
**Fix:** Optimistic locking (version field) or row-level lock.

### M3. `generateEventsFromCategory` Duplicate Detection Ignores dueDate
**Location:** `src/modules/collections/actions.ts:432–439`  
**Issue:** Overlap check compares `startDate`/`endDate` ranges only. Two events for same period but different due dates would be considered duplicate.  
**Edge Case:** Low probability but possible if admin manually creates event then runs generator.

### M4. CSV Export Includes Reversed Payments in Count
**Location:** `src/app/api/exports/transactions/route.ts:26–43`  
**Issue:** `payments` query includes all statuses; `rows` maps each payment. Header says "Transactions" but count includes REVERSED. `collectionSummary` correctly separates gross/reversed.  
**Fix:** Add `status: "SUCCESS"` to export query or add status column (already present).

### M5. Redundant `allocations` Array in Payment Schema
**Location:** `src/lib/validation-registry.ts:348–365`  
**Issue:** `paymentShape.allocations` defines `duesPeriodId` + `collectionEventId` as optional, but form only uses one. No validation that exactly one is provided.  
**Impact:** Could create allocation with neither (orphaned) or both (ambiguous).

### L1. `monthsPerPeriod` Returns 0 for ONE_TIME
**Location:** `src/lib/dues.ts:8–21`  
**Issue:** `ONE_TIME` returns 0, but `buildPeriods` handles it as special case (lines 46–56). Works but confusing; should return 1 or use explicit enum check.

### L2. `generateDuesAction` No Feedback on Failures
**Location:** `src/modules/plans/actions.ts:138–165`  
**Issue:** Catches error, logs, returns void. UI has no indication if some plans failed.  
**Fix:** Return `{created, failed: planId[]}`.

### L3. `recomputeEventStatus` Doesn't Consider WAIVED Assignments
**Location:** `src/lib/dues.ts:224–225`  
**Issue:** `paidAssignments` counts only `status === "PAID"`. WAIVED assignments don't count toward completion but do count in `totalAssignments`. Event with 10 assignments, 9 PAID + 1 WAIVED → `paidAssignments=9, total=10` → never COMPLETED.  
**Fix:** Treat WAIVED as "settled" for completion check.

### L4. No Index on `PaymentAllocation.donorMemberId` (via Payment)
**Location:** `prisma/schema.prisma:276–295`  
**Issue:** `sumEventAllocationsForMember` filters `payment.donorMemberId = memberId`. Prisma generates join; no composite index on `(collectionEventId, payment.donorMemberId)`.  
**Fix:** Add `@@index([collectionEventId, paymentId])` and ensure payment has index on donorMemberId (exists).

### L5. `nextMemberNumber` Scans All Members
**Location:** `src/lib/receipts/numbering.ts:46–58`  
**Issue:** `findFirst` with `orderBy: { memberNo: "desc" }` on `masjidId` + prefix. For 50k+ members, full scan.  
**Fix:** Add `memberSequence` counter table like `ReceiptSequence`.

---

## Risk Register

| ID | Risk | Likelihood | Impact | Detection | Mitigation |
|----|------|------------|--------|-----------|------------|
| R1 | Duplicate receipt numbers on multi-instance deploy | Medium | Critical (legal/compliance) | Manual audit | Document single-server assumption; add advisory lock for scale |
| R2 | Allocation sum > payment amount via race/concurrency | Low | High (financial) | Unit test `allocations.test.ts` covers logic | Add DB check constraint `sum(allocatedAmountPaise) <= payment.amountPaise` via trigger or application lock |
| R3 | Event status oscillation (COMPLETED↔OPEN) | Medium | Medium (ops confusion) | E2E test "9. Verify no double-counting" | Make COMPLETED sticky or add manual close action |
| R4 | Walk-in payments leave assignments PENDING | High | Low (UX inconsistency) | Manual test | Document behavior; consider "settled by walk-in" flag on assignment |
| R5 | Restricted-purpose category receives unallocated remainder | Low | High (fund misuse) | Code review | Create "General/Unallocated" category; validate remainder category |
| R6 | `outstandingDues` OOM on large datasets | Medium | Medium (perf) | Load test | Migrate to aggregation query |
| R7 | Weekly event generation drift on non-IST servers | High | Medium (schedule wrong) | Code review | Use `istParts`/`istMidnight` consistently |
| R8 | Plan amount change lost update | Low | Medium | Code review | Add `version` field to ContributionPlan |
| R9 | CSV export misleading (includes reversed) | High | Low (reporting) | Manual test | Filter `status: "SUCCESS"` in export query |

---

## Missing Test Coverage

### Unit Tests (Vitest)

| Area | Current Coverage | Missing |
|------|-----------------|---------|
| `dues.ts` — `recomputePeriodStatus` | ✅ 5 cases (pending, partial, paid, reversed, waived, advance) | ✅ Covered |
| `dues.ts` — `recomputeAssignmentStatus` | ❌ | No tests for assignment status logic |
| `dues.ts` — `recomputeEventStatus` | ❌ | No tests for event status transitions (SCHEDULED→OPEN→COMPLETED, COMPLETED→OPEN) |
| `dues.ts` — `buildPeriods` | ✅ 6 cases (monthly, semi-annual, annual, one-time, endDate, dueDay/graceDays, determinism) | ✅ Covered |
| `dates.ts` | ✅ 3 cases (format, parse, financial year) | IST edge cases (DST not applicable but month boundaries) |
| `money.ts` | ✅ 4 cases (parse, format, words, round-trip) | Large number edge cases (crore+) |
| `numbering.ts` | ✅ 4 cases (sequence, FY separation, no reuse, member/expense) | Concurrent sequence allocation |
| `validation-registry.ts` | ✅ 1 test file | Schema inference types |
| `payments/actions.ts` | ❌ | No unit tests for create/reverse actions |
| `collections/actions.ts` | ❌ | No unit tests for event CRUD, generate, assign |
| `plans/actions.ts` | ❌ | No unit tests for plan CRUD, amount change, dues generation |
| `reports/queries.ts` | ❌ | No unit tests for any report query |

### E2E Tests (Playwright)

**Existing:** `e2e/browser-verification.spec.ts` — 24 tests covering:
- Category CRUD + event generation
- Manual event + household assignment
- Payment with event allocation
- Report tabs (category, event, dues)
- Portal redirect

**Missing Critical Scenarios:**
1. **Payment reversal flow** — create → verify status → reverse → verify status reverted
2. **Plan amount change** — create plan → generate dues → change amount → verify only future periods updated
3. **Concurrent payment idempotency** — submit same idempotencyKey twice → verify single receipt
4. **Walk-in donor payment** — no member selected, allocations to category/event
5. **Restricted category** — payment to restricted category → verify report shows restricted flag
6. **Event COMPLETED→OPEN regression** — fully pay event → verify COMPLETED → add partial payment → verify status
7. **Multi-masjid isolation** — create data in masjid A → query from masjid B → verify empty
8. **CSV export** — generate payments → export → verify row count, reversed handling
9. **Receipt numbering** — create payments across FY boundary → verify sequence resets
10. **Assignment removal** — assign households → remove one → verify status recomputed

---

## Recommendations (Ranked)

### 🔴 Critical (Do First)

| # | Recommendation | Effort | File(s) |
|---|----------------|--------|---------|
| 1 | **Fix reversal assignment recompute** — filter by `donorMemberId` when recalculating assignments | 1h | `src/modules/payments/actions.ts:291–297` |
| 2 | **Add DB constraint: allocation sum ≤ payment amount** — Prisma doesn't support check constraints on relations; implement in `createPaymentAction` with row-level lock or document single-writer assumption | 2h | `src/modules/payments/actions.ts:73–76`, consider `tx.payment.update({ where: { id }, data: { version: { increment: 1 } } })` |
| 3 | **Make event COMPLETED status sticky** — add `closedAt` field or check `event.status === "COMPLETED"` before downgrading | 1h | `src/lib/dues.ts:227–234`, `prisma/schema.prisma:202–225` |

### 🟠 High (Next Sprint)

| # | Recommendation | Effort | File(s) |
|---|----------------|--------|---------|
| 4 | **Fix weekly event generation to use IST** — replace `getDay()/setDate()` with `istParts`/`istMidnight` | 2h | `src/modules/collections/actions.ts:347–360` |
| 5 | **Add unique constraint on (paymentId, categoryId) in PaymentAllocation** — prevents duplicate category lines | 30m + migration | `prisma/schema.prisma:276–295` |
| 6 | **Optimize `outstandingDues` to use aggregation** — avoid loading all allocations | 2h | `src/modules/reports/queries.ts:54–77` |
| 7 | **Handle walk-in donor assignment status** — either update a "walk-in" pseudo-assignment or document/event status logic | 2h | `src/modules/payments/actions.ts:180–193`, `src/lib/dues.ts:156–197` |
| 8 | **Validate unallocated remainder category** — reject if first category is restrictedPurpose | 1h | `src/modules/payments/actions.ts:138–146` |

### 🟡 Medium (Backlog)

| # | Recommendation | Effort | File(s) |
|---|----------------|--------|---------|
| 9 | **Add optimistic locking to ContributionPlan** — `version` field for `changePlanAmountAction` | 2h | `prisma/schema.prisma:141–163`, `src/modules/plans/actions.ts:108–116` |
| 10 | **Fix event duplicate detection to include dueDate** | 1h | `src/modules/collections/actions.ts:432–439` |
| 11 | **Filter CSV export to SUCCESS payments only** (or add status column explicitly) | 30m | `src/app/api/exports/transactions/route.ts:26–43` |
| 12 | **Add `completionThreshold` to event status** — allow COMPLETED at 95% received | 3h | `src/lib/dues.ts:200–240`, `prisma/schema.prisma:202–225` |
| 13 | **Treat WAIVED assignments as settled for event completion** | 1h | `src/lib/dues.ts:224–225` |
| 14 | **Add member sequence counter table** — replace `nextMemberNumber` scan | 2h | `src/lib/receipts/numbering.ts:46–58`, new `MemberSequence` model |
| 15 | **Return structured result from `generateDuesAction`** — include failed plan IDs | 1h | `src/modules/plans/actions.ts:138–165` |

### 🟢 Low (Nice to Have)

| # | Recommendation | Effort | File(s) |
|---|----------------|--------|---------|
| 16 | **Rename `monthsPerPeriod(ONE_TIME)` to return 1 or use explicit check** | 30m | `src/lib/dues.ts:8–21` |
| 17 | **Add unit tests for `recomputeAssignmentStatus` / `recomputeEventStatus`** | 4h | New test files in `tests/` |
| 18 | **Add unit tests for server actions (payments, collections, plans)** | 8h | New test files |
| 19 | **Add E2E tests for missing critical scenarios (10 listed above)** | 16h | `e2e/` |
| 20 | **Document single-server assumption for receipt numbering** | 30m | `README.md` or `AGENTS.md` |

---

## Appendix: File Reference Map

| Area | Key Files |
|------|-----------|
| Payment create/reverse | `src/modules/payments/actions.ts` |
| Collection event CRUD + generate + assign | `src/modules/collections/actions.ts` |
| Plan CRUD + amount change + dues generation | `src/modules/plans/actions.ts` |
| Dues/event status recomputation | `src/lib/dues.ts` |
| Report queries | `src/modules/reports/queries.ts` |
| Date/calendar (IST) | `src/lib/dates.ts` |
| Money (paise, formatting, words) | `src/lib/money.ts` |
| Receipt/member/expense numbering | `src/lib/receipts/numbering.ts` |
| Validation registry (single source) | `src/lib/validation-registry.ts` |
| Permissions matrix | `src/lib/permissions.ts` |
| Auth (JWT, session, roles) | `src/lib/auth.ts` |
| Prisma schema | `prisma/schema.prisma` |
| Unit tests | `tests/*.test.ts` |
| E2E tests | `e2e/browser-verification.spec.ts` |

---

*End of Audit — generated from source code review on 2026-10-21*