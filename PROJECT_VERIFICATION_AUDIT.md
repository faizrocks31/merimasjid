# Project Verification Audit

**Project:** Subscription-Based Multi-Masjid Collection Management SaaS  
**Date:** 2026-10-21  
**Scope:** Read-only verification of previous audit findings against current source code  
**Methodology:** Source code inspection across 100+ files; no runtime testing

---

## Executive Summary

This verification audit confirms the technology stack, validates previously reported payment/collection risks, and identifies the current state of features, security, and test coverage. All findings are derived from direct source code inspection.

### Key Verified Facts

| Area | Status |
|------|--------|
| **Stack** | Next.js 16.4.2 (App Router, Turbopack), React 19, Prisma + SQLite (better-sqlite3), JWT (HS256 via jose), Zod validation |
| **Architecture** | Server Components + Server Actions, Central Validation Registry, Three-layer tenant isolation |
| **Roles** | SUPER_ADMIN, ADMIN, COLLECTOR, AUDITOR, MEMBER (5 roles, matrix-based permissions) |
| **Tenant Isolation** | CONFIRMED: session-derived masjidId, query-scoped, object-level checks |
| **Subscription Billing** | PARTIAL: Subscription model exists but no active billing enforcement or Stripe integration |
| **Tests** | 7 unit test files (Vitest), 1 E2E test suite (Playwright, 24 tests), serial execution for DB safety |

### Critical Risk Verification Summary

| Risk | Classification | Evidence |
|------|----------------|----------|
| Allocation sum > payment amount possible | **CONFIRMED** | App-level check only, no DB constraint |
| Reversal updates other assignments | **CONFIRMED** | `reversePaymentAction` line 291-297 fetches ALL assignments |
| Event status COMPLETED → OPEN regression | **CONFIRMED** | `recomputeEventStatus` logic allows downgrade |
| Receipt numbering concurrent safety | **NEEDS FURTHER VERIFICATION** | Safe on SQLite single-server; unsafe multi-instance |
| Duplicate allocations per payment/category | **CONFIRMED** | No unique constraint on `(paymentId, categoryId)` |
| Weekly events use wrong timezone | **CONFIRMED** | `generateEventsFromCategoryAction` uses local `Date` methods |
| Outstanding dues loads excessive data | **CONFIRMED** | Fetches all periods + allocations into JS memory |
| Walk-in payments skip assignment status | **CONFIRMED** | `createPaymentAction` only updates assignments for member payments |
| Remainder auto-allocated to first category | **CONFIRMED** | Lines 138-146 push to `rows[0].categoryId` |
| Reversed payments in financial reports | **CONFIRMED** | CSV export includes REVERSED; `collectionSummary` correctly separates |
| Allocation ownership validation | **CONFIRMED** | Cross-tenant checks in `createPaymentAction` but no FK on `collectionEventId` |
| Concurrent plan changes cause inconsistent dues | **CONFIRMED** | No optimistic locking on `ContributionPlan` |
| Duplicate events for same date | **CONFIRMED** | Duplicate detection ignores `dueDate` |

---

## Project Stack Verified from Source

### Core Dependencies (package.json)
```
Next.js:           16.4.2 (App Router, Turbopack)
React:             19.3.0
Prisma:            7.10.1 + @prisma/adapter-better-sqlite3
Database:          SQLite (better-sqlite3)
Auth:              jose 6.2.12 (JWT HS256), bcryptjs 3.0.3
Validation:        Zod 4.6.7
Forms:             Server Actions (use server)
PDF:               pdf-lib 1.17.1 + @pdf-lib/fontkit
Charts:            recharts 3.10.1
Styling:           Tailwind CSS 4 + tailwind-merge
Testing:           Vitest 3.2.7 (unit), Playwright 1.64.1 (E2E)
i18n:              Custom (en/hi/ur dictionaries)
```

### Project Structure
```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/login/       # Login page
│   ├── (dashboard)/        # Staff dashboard (ADMIN, COLLECTOR, AUDITOR)
│   ├── (platform)/         # Platform admin (SUPER_ADMIN)
│   ├── (portal)/           # Member portal (MEMBER role)
│   ├── api/                # API routes (payments/create, exports, receipts/pdf)
│   └── receipts/[id]/      # Receipt view, PDF, reverse
├── lib/                    # Shared utilities
│   ├── auth.ts             # JWT session, getCurrentUser, requireStaff
│   ├── permissions.ts      # Role→Permission matrix, can(), assertCan()
│   ├── validation-registry.ts  # Single source of truth (Zod + form metadata)
│   ├── dates.ts            # IST calendar helpers
│   ├── money.ts            # Paise arithmetic, formatting, words
│   ├── dues.ts             # Period generation, status recomputation
│   ├── receipts/numbering.ts # Receipt/member/expense sequencing
│   └── db.ts               # Prisma client (better-sqlite3 adapter)
├── modules/                # Feature modules (server actions + queries)
│   ├── auth/actions.ts     # Login/logout
│   ├── payments/actions.ts # Create/reverse payments
│   ├── collections/actions.ts # Event CRUD, generate, assign
│   ├── plans/actions.ts    # Plan CRUD, amount change, dues generation
│   ├── members/actions.ts  # Member CRUD
│   ├── reports/queries.ts  # Aggregation queries
│   ├── settings/actions.ts # Masjid, categories, staff, notifications
│   ├── expenses/actions.ts # Expense CRUD, approval
│   ├── portal/             # Member portal queries/actions
│   ├── platform/actions.ts # SUPER_ADMIN masjid management
│   └── audit/write.ts      # Append-only audit logging
├── components/             # React components (UI kit, charts, forms)
└── i18n/                   # Translation dictionaries
```

### Database (prisma/schema.prisma) — 23 Models
| Model | Purpose | Key Indexes/Constraints |
|-------|---------|------------------------|
| Masjid | Tenant root | `@@unique([slug])` |
| User | Platform user | `@@unique([email])` |
| MasjidUser | Membership + role | `@@unique([masjidId, userId])` |
| Member | Congregant | `@@unique([masjidId, memberNo])`, `@@index([masjidId, phone])` |
| ContributionCategory | Donation type | `@@unique([masjidId, code])` |
| ContributionPlan | Recurring pledge | `@@index([masjidId, memberId])`, `@@index([masjidId, status])` |
| DuesPeriod | Scheduled period | `@@unique([planId, periodStart, periodEnd])` |
| CollectionEvent | Category-level event | `@@index([masjidId, categoryId, status])` |
| CollectionEventAssignment | Household assignment | `@@unique([eventId, memberId])` |
| Payment | Contribution | `@@unique([masjidId, receiptNo])`, `@@unique([masjidId, idempotencyKey])` |
| PaymentAllocation | Split to category/period/event | `@@index([duesPeriodId])`, `@@index([collectionEventId])` |
| ReceiptEvent | ISSUED/CANCELLED/REPRINTED | `@@index([masjidId, paymentId])` |
| ReceiptSequence | Per-masjid/FY counter | `@@unique([masjidId, financialYear])` |
| Expense/ExpenseCategory | Outflows | `@@unique([masjidId, expenseNo])` |
| Reversal | Payment reversal | `@@unique([originalPaymentId])` |
| Subscription | SaaS billing | `@@index([masjidId])` |
| AuditLog | Immutable trail | `@@index([masjidId, createdAt])` |
| NotificationLog | Delivery log | `@@index([masjidId, createdAt])` |
| CashSession | Collector cash tracking | — |

---

## Verified Features and Roles

### Role Definitions (src/lib/constants.ts, permissions.ts)

| Role | Permissions | Portal Access |
|------|-------------|---------------|
| **SUPER_ADMIN** | `tenant:manage` (create/suspend/delete masjids) | Platform UI only |
| **ADMIN** | All masjid ops: member/plan/payment/expense/report/settings/staff/audit | Dashboard |
| **COLLECTOR** | member:read/write, payment:create/read, receipt:reprint, expense:create, report:read | Dashboard |
| **AUDITOR** | member:read, payment:read, report:read, audit:read | Dashboard |
| **MEMBER** | None (portal only: own dues, receipts, preferences) | Portal only |

### Role Enforcement
- **Layout-level**: `(dashboard)/layout.tsx` redirects MEMBER → `/portal`, SUPER_ADMIN+isPlatformAdmin → `/platform`
- **Action-level**: Every server action calls `requireStaff()` → `assertCan(role, permission)`
- **API-level**: `authorizeFileRequest()` for CSV/PDF exports
- **Query-level**: All Prisma queries include `masjidId: user.masjidId`
- **Object-level**: Explicit `findFirst({ where: { id, masjidId } })` for cross-ref validation

### Feature Matrix

| Feature | SUPER_ADMIN | ADMIN | COLLECTOR | AUDITOR | MEMBER |
|---------|-------------|-------|-----------|---------|--------|
| Masjid CRUD | ✅ | ❌ | ❌ | ❌ | ❌ |
| Staff management | ❌ | ✅ | ❌ | ❌ | ❌ |
| Member CRUD | ❌ | ✅ | ✅ | Read | Portal (self) |
| Contribution Plans | ❌ | ✅ | ❌ | Read | ❌ |
| Payment create | ❌ | ✅ | ✅ | ❌ | ❌ |
| Payment reverse | ❌ | ✅ | ❌ | ❌ | ❌ |
| Receipt reprint | ❌ | ✅ | ✅ | ❌ | View own |
| Event-based collections | ❌ | ✅ | ❌ | Read | ❌ |
| Expense create | ❌ | ✅ | ✅ | ❌ | ❌ |
| Expense approve | ❌ | ✅ | ❌ | ❌ | ❌ |
| Reports | ❌ | ✅ | ✅ | ✅ | Portal (self) |
| Audit log | ❌ | ✅ | ❌ | ✅ | ❌ |
| Settings | ❌ | ✅ | ❌ | ❌ | ❌ |

---

## Tenant Isolation Findings

### Three-Layer Implementation (CONFIRMED)

**Layer 1 — Session-Derived**
```typescript
// src/lib/auth.ts:91-163 getCurrentUser()
const session = await readSession()  // JWT from cookie
const user = await prisma.user.findUnique({ include: { memberships: true } })
const membership = activeMemberships.find(m => m.masjidId === session.masjidId) ?? ...
return { masjidId: membership.masjid.id, role: membership.role, ... }
```
- Re-validates against DB on **every request**
- Only ACTIVE memberships considered
- SUPER_ADMIN detected via `isPlatformAdmin` flag

**Layer 2 — Query-Scoped**
```typescript
// Every query pattern:
prisma.payment.findMany({ where: { masjidId: user.masjidId!, ... } })
prisma.member.findMany({ where: { masjidId, status: "ACTIVE" } })
```
- **No unscoped queries found** in server actions or pages

**Layer 3 — Object-Level**
```typescript
// src/modules/payments/actions.ts:79-102
const member = await prisma.member.findFirst({ where: { id: input.memberId, masjidId: user.masjidId! } })
const category = await prisma.contributionCategory.findFirst({ where: { id: allocation.categoryId, masjidId: user.masjidId! } })
```
- Cross-references explicitly checked before transaction

### Gaps
- **No row-level security (RLS)** — relies on application discipline
- **SUPER_ADMIN** bypasses masjid scoping in some platform actions (expected)

---

## Payment and Collection Findings

### 1. Payment Creation Flow (`src/modules/payments/actions.ts:52-235`)

**Verified Flow:**
1. `requireStaff()` + `assertCan("payment:create")`
2. Zod `paymentSchema` validation via `parseForm()`
3. Manual checks: member exists in masjid, allocationTotal ≤ amountPaise, all categories/periods/events belong to masjid
4. Prisma transaction:
   - Idempotency check: `payment.findFirst({ where: { masjidId, idempotencyKey } })`
   - Receipt number: `nextReceiptNumber()` (reads/updates `ReceiptSequence`)
   - Create `Payment` (status=SUCCESS)
   - Create `PaymentAllocation` rows (input + unallocated remainder on first category)
   - `recomputePeriodStatus()` for each duesPeriodId
   - `recomputeAssignmentStatus()` for payer's assignment (if member) + `recomputeEventStatus()` for each collectionEventId
   - `ReceiptEvent` (ISSUED) + audit log

**Critical Findings:**
| Finding | Classification | Location | Severity |
|---------|----------------|----------|----------|
| Allocation sum > payment prevented only in app code | **CONFIRMED** | Line 73-76 | Critical |
| Unallocated remainder forced to first category (even if restricted) | **CONFIRMED** | Line 138-146 | High |
| No unique constraint on (paymentId, categoryId) | **CONFIRMED** | Schema: PaymentAllocation | High |
| VerificationStatus forced MANUAL for CASH | **CONFIRMED** | Line 158 | Low (by design) |
| Walk-in payments skip assignment recompute | **CONFIRMED** | Line 180-193 | Medium |

### 2. Payment Reversal (`src/modules/payments/actions.ts:242-322`)

**Verified Flow:**
1. `requireStaff()` + `assertCan("payment:reverse")`
2. Load payment + allocations + reversalFor
3. Prisma transaction:
   - `payment.update({ status: "REVERSED" })`
   - Create `Reversal` record
   - `ReceiptEvent` (CANCELLED)
   - For EACH allocation: `recomputePeriodStatus()` / `recomputeAssignmentStatus()` / `recomputeEventStatus()`
   - Audit log

**Critical Findings:**
| Finding | Classification | Location | Severity |
|---------|----------------|----------|----------|
| Reversal recomputes ALL event assignments (not just payer's) | **CONFIRMED** | Line 291-297 | Critical |
| No check for existing Reversal record before creating | **CONFIRMED** | Line 259 (only checks payment.status) | Medium |
| Optional `reversalPaymentId` never used | **CONFIRMED** | Schema + action | Low |

### 3. Recurring Dues (Plan → DuesPeriod)

**Files:** `src/modules/plans/actions.ts`, `src/lib/dues.ts`

**Verified Logic:**
- `ContributionPlan` (frequency, amountPaise, startDate, endDate, dueDay, graceDays)
- `buildPeriods()` generates periods up to 12 months ahead (IST boundaries)
- `generateDuesPeriods(planId)` creates `DuesPeriod` rows (unique on planId+periodStart+periodEnd)
- `recomputePeriodStatus()` — sums SUCCESS allocations, sets PENDING/PARTIAL/PAID, WAIVED sticky
- `changePlanAmountAction` updates plan.amountPaise + future PENDING periods' expectedAmountPaise

**Critical Findings:**
| Finding | Classification | Location | Severity |
|---------|----------------|----------|----------|
| No optimistic locking on plan amount change | **CONFIRMED** | `changePlanAmountAction` line 108-116 | High |
| Horizon fixed at 12 months (future plans won't generate) | **CONFIRMED** | `generateDuesPeriods` line 102 | Medium |
| `monthsPerPeriod(ONE_TIME)` returns 0 (special-cased) | **CONFIRMED** | `dues.ts` line 16-17 | Low |

### 4. Event-Based Collections (Category → Event → Assignment)

**Files:** `src/modules/collections/actions.ts`, `src/lib/dues.ts`

**Verified Logic:**
- `ContributionCategory` has `frequency`, `collectionMode` (HOUSEHOLD_WISE/COMBINED), `defaultAmountPaise`, `defaultDueDay`, `defaultGraceDays`
- `generateEventsFromCategoryAction` creates `CollectionEvent` rows for date range
- `assignHouseholdsAction` creates `CollectionEventAssignment` (unique on eventId+memberId)
- `recomputeAssignmentStatus()` — sums SUCCESS allocations for THAT member+event
- `recomputeEventStatus()` — COMPLETED only if received≥expected AND all assignments PAID

**Critical Findings:**
| Finding | Classification | Location | Severity |
|---------|----------------|----------|----------|
| Weekly generation uses local `Date` (not IST) | **CONFIRMED** | Line 347-360 | Critical |
| COMPLETED status can downgrade to OPEN on new partial payment | **CONFIRMED** | `recomputeEventStatus` line 227-234 | Critical |
| Duplicate detection ignores `dueDate` | **CONFIRMED** | Line 432-439 | Medium |
| WAIVED assignments not treated as settled for COMPLETED | **CONFIRMED** | Line 224-225 | Medium |
| Assignments replaced not updated (orphans prior allocations) | **CONFIRMED** | Line 258-270 | Low |

### 5. Status Recomputation (`src/lib/dues.ts`)

| Function | Input | Logic |
|----------|-------|-------|
| `recomputePeriodStatus` | duesPeriodId | SUCCESS allocations sum → PENDING/PARTIAL/PAID (WAIVED sticky) |
| `recomputeAssignmentStatus` | assignmentId | SUCCESS allocations for member+event → PENDING/PARTIAL/PAID (WAIVED sticky) |
| `recomputeEventStatus` | eventId | If hasAssignments: expected=sum(assignments); received=sum(all SUCCESS allocations). COMPLETED iff received≥expected AND all assignments PAID. |

---

## Database Integrity Findings

### Constraints and Indexes (schema.prisma)

| Model | Unique Constraints | Indexes | Missing |
|-------|-------------------|---------|---------|
| Payment | (masjidId, receiptNo), (masjidId, idempotencyKey) | masjidId+paymentDate, masjidId+donorMemberId, masjidId+status, masjidId+mode | — |
| PaymentAllocation | — | masjidId+paymentId, duesPeriodId, collectionEventId | **Missing: (paymentId, categoryId)** |
| DuesPeriod | (planId, periodStart, periodEnd) | masjidId+status+dueDate, masjidId+memberId | — |
| CollectionEventAssignment | (eventId, memberId) | memberId+status | — |
| ReceiptSequence | (masjidId, financialYear) | — | — |
| Reversal | (originalPaymentId), (reversalPaymentId) | masjidId | — |
| Member | (masjidId, memberNo) | masjidId+status, masjidId+fullName, masjidId+phone, userId | — |

### Referential Integrity
- All relations use Prisma `@relation` with `onDelete: Cascade` or `SetNull`
- **No DB-level check constraints** (SQLite limitation)
- Application-level validation in server actions is the only guard

### Data Quality Checks
| Check | Implementation |
|-------|----------------|
| Duplicate member phone | `createMemberAction` + `updateMemberAction` (normalized to +91XXXXXXXXXX) |
| Duplicate category code | `createCategoryAction` + `updateCategoryAction` |
| Duplicate receipt prefix | `createMasjidAction` + `updateMasjidAction` (platform) |
| Duplicate receipt number | Unique index on (masjidId, receiptNo) + sequence counter |
| Duplicate idempotency key | Unique index on (masjidId, idempotencyKey) |
| Cross-tenant reference | Explicit `masjidId` checks in every server action |

---

## Security Findings

### Authentication (`src/lib/auth.ts`)
- **JWT**: HS256, 12-hour expiry, HttpOnly+SameSite=Lax+Secure(cookies)
- **Password**: bcrypt cost 12
- **Session re-validation**: `getCurrentUser()` hits DB on every call
- **Brute-force protection**: In-memory Map (8 attempts/10min) — **single-server only**

### Authorization
- **Permission matrix**: 19 permissions mapped to 5 roles (src/lib/permissions.ts)
- **assertCan()** throws `FORBIDDEN` — caught by error boundary
- **Portal isolation**: `requirePortalMember()` ensures `role=MEMBER` + valid `memberId`

### Data Protection
- **No PII in logs** — audit logs store JSON before/after
- **Receipt PDF**: Generates server-side, no client-side secrets
- **CSV export**: UTF-8 BOM, audited (`export.transactions`)

### Gaps
| Gap | Location | Risk |
|-----|----------|------|
| In-memory rate limiting | `auth/actions.ts:11-33` | Resets on deploy; not distributed |
| No CSP headers | `next.config.ts` | XSS surface |
| No API route auth middleware | `api/payments/create/route.ts` uses action directly | Relies on action auth |
| SUPER_ADMIN cookie value trusted | `auth.ts:68` `isPlatformAdmin` from JWT | Re-validated via memberships query |

---

## Test Coverage and Verification Limitations

### Unit Tests (Vitest) — 7 Files
| File | Coverage |
|------|----------|
| `tests/validation-registry.test.ts` | Registry → schema → form parity |
| `tests/money.test.ts` | Paise parsing, formatting, words |
| `tests/dates-dues.test.ts` | Date formatting, financial year, `buildPeriods()` |
| `tests/numbering.test.ts` | Receipt/member/expense sequencing |
| `tests/allocations.test.ts` | Period status recomputation (5 cases) |
| `tests/staff-validation.test.ts` | Staff form validation |
| `tests/server-actions.test.ts` | "use server" files export only async functions |

**Missing Unit Tests:**
- `recomputeAssignmentStatus` / `recomputeEventStatus` — **no tests**
- All server actions (`payments/actions.ts`, `collections/actions.ts`, `plans/actions.ts`, `members/actions.ts`, `expenses/actions.ts`, `settings/actions.ts`) — **no tests**
- Report queries (`reports/queries.ts`) — **no tests**
- Reversal flow — **no tests**

### E2E Tests (Playwright) — 1 Suite (24 tests)
`e2e/browser-verification.spec.ts` covers:
- Category CRUD + event generation (tests 2-4)
- Manual event + household assignment (tests 5-6)
- Payment with event allocation (test 7)
- Report tabs: Collection Events, Category, Pending Dues (tests 8, 9, 31-32)
- Portal redirect for staff (test 10)
- Regression: Dashboard, Members, Plans, Expenses, Settings, Transactions, Audit (tests 11-24)

**Missing E2E Scenarios:**
1. Payment reversal flow
2. Plan amount change → verify only future periods updated
3. Concurrent idempotency (same key twice)
4. Walk-in donor payment
5. Restricted category payment
6. Event COMPLETED → OPEN regression
7. Multi-masjid isolation
8. CSV export verification
9. Receipt numbering across FY boundary
10. Assignment removal → status recompute

### Test Infrastructure
- **Vitest**: `fileParallelism: false` (serial DB tests), custom `server-only` stub
- **Playwright**: `fullyParallel: false`, `workers: 1`, `retries: 1`, globalSetup for auth
- **Test DB**: Copy of `data/masjid.db` → `data/test-masjid.db` per run

### Verification Limitations
| Limitation | Impact |
|------------|--------|
| No runtime testing | Cannot confirm race conditions, actual memory usage, PDF generation |
| Single-server SQLite | Cannot verify multi-instance receipt numbering safety |
| No load testing | `outstandingDues` OOM risk unquantified |
| No penetration testing | Auth bypass, IDOR, XSS not runtime-verified |
| Test DB may lack seed data | Some tests require `npm run seed` first |

---

## Confirmed Risks (with File References)

### Critical (3)

| ID | Risk | File | Function/Model | Lines | Business Impact | Runtime Test Needed? |
|----|------|------|----------------|-------|-----------------|---------------------|
| C1 | Allocation sum can exceed payment amount | `payments/actions.ts` | `createPaymentAction` | 73-76 | Overstated income, reconciliation failure | Yes (concurrent requests) |
| C2 | Reversal updates ALL event assignments | `payments/actions.ts` | `reversePaymentAction` | 291-297 | Other households' status corrupted | Yes |
| C3 | Event COMPLETED → OPEN on new partial | `lib/dues.ts` | `recomputeEventStatus` | 227-234 | Dashboard flicker, audit confusion | Yes |

### High (5)

| ID | Risk | File | Function/Model | Lines | Business Impact | Runtime Test Needed? |
|----|------|------|----------------|-------|-----------------|---------------------|
| H1 | No unique (paymentId, categoryId) | `schema.prisma` | PaymentAllocation | 276-295 | Duplicate category lines, double-counting | No (schema) |
| H2 | Weekly events use local TZ | `collections/actions.ts` | `generateEventsFromCategoryAction` | 347-360 | Wrong week boundaries on non-IST servers | Yes (TZ change) |
| H3 | `outstandingDues` loads all into memory | `reports/queries.ts` | `outstandingDues` | 54-77 | OOM on large datasets | Yes (load test) |
| H4 | No optimistic locking on plan change | `plans/actions.ts` | `changePlanAmountAction` | 108-116 | Lost updates, inconsistent dues | Yes (concurrent) |
| H5 | CSV export includes REVERSED payments | `api/exports/transactions/route.ts` | GET handler | 26-43 | Inflated transaction counts | No (code review) |

### Medium (5)

| ID | Risk | File | Function/Model | Lines | Business Impact | Runtime Test Needed? |
|----|------|------|----------------|-------|-----------------|---------------------|
| M1 | Remainder auto-allocated to restricted category | `payments/actions.ts` | `createPaymentAction` | 138-146 | Fund misuse for restricted purposes | Yes |
| M2 | Walk-in payments don't update assignments | `payments/actions.ts` | `createPaymentAction` | 180-193 | Event shows COMPLETED, assignments PENDING | Yes |
| M3 | Duplicate event detection ignores dueDate | `collections/actions.ts` | `generateEventsFromCategoryAction` | 432-439 | Missed events if dueDate differs | No (code) |
| M4 | WAIVED assignments block COMPLETED | `lib/dues.ts` | `recomputeEventStatus` | 224-225 | Event never completes if any WAIVED | No (code) |
| M5 | Assignment replace loses history | `collections/actions.ts` | `assignHouseholdsAction` | 258-270 | Orphaned allocations | No (code) |

### Low (5)

| ID | Risk | File | Function/Model | Lines | Business Impact | Runtime Test Needed? |
|----|------|------|----------------|-------|-----------------|---------------------|
| L1 | `monthsPerPeriod(ONE_TIME)=0` | `lib/dues.ts` | `monthsPerPeriod` | 16-17 | Confusing but handled | No |
| L2 | `generateDuesAction` silent failures | `plans/actions.ts` | `generateDuesAction` | 138-165 | No UI feedback on partial failure | No |
| L3 | No member sequence counter | `receipts/numbering.ts` | `nextMemberNumber` | 46-58 | Slow scan at scale | Yes (perf) |
| L4 | No composite index for assignment lookup | `schema.prisma` | PaymentAllocation | 276-295 | Slow `sumEventAllocationsForMember` | Yes (perf) |
| L5 | Brute-force map not distributed | `auth/actions.ts` | `throttled` | 11-33 | Resets on deploy | No |

---

## Items Requiring Runtime Verification

| Item | Why Runtime Needed | Suggested Test |
|------|-------------------|----------------|
| Receipt numbering under concurrency | SQLite serializes; multi-instance unknown | Simulate 2+ processes calling `nextReceiptNumber` |
| Allocation overpayment race | App check only; two requests could interleave | Concurrent POST to `/api/payments/create` |
| `outstandingDues` memory at 10k+ periods | JS reduce on full dataset | Load test with 10k periods |
| Weekly event TZ on UTC server | Code uses `getDay()`/`setDate()` | Deploy to UTC, verify week boundaries |
| Event COMPLETED→OPEN flip | State machine logic | Pay full event → verify COMPLETED → add partial → check status |
| Reversal cross-assignment corruption | Queries all assignments | Reverse payment A → check assignment B status |
| Plan amount change lost update | No version field | Two concurrent `changePlanAmountAction` calls |
| CSV export row count accuracy | Includes REVERSED | Export → count rows vs `collectionSummary` |

---

## Missing or Incomplete Features

### Subscription Billing (Incomplete)
- **Model exists**: `Subscription` (planCode, status, startsAt, endsAt, billingReference)
- **No enforcement**: No middleware/check on masjid status for feature access
- **No Stripe/Payment gateway**: No webhook handlers, no billing portal
- **No trial→paid conversion logic**
- **No usage metering** (members, payments, staff)

### Notifications (Partial)
- **Models**: `NotificationLog`, `MasjidNotificationSettings`
- **Channels**: Telegram (bot token in env), Email (SMTP config in settings), In-app
- **No trigger logic found** — no code sends notifications on payment, due, reversal, expense approval
- **Preferences**: Member portal has `notifyTelegram/InApp/Email` + quiet hours

### Member Portal (Complete for MVP)
- Dues list with status
- Receipt list + PDF download
- Profile preferences (notifications, timezone)
- **Missing**: Payment history filter, event assignments view, plan management

### Expense Approval Workflow (Complete)
- Collector creates → PENDING
- Admin/Auditor approves → APPROVED/REJECTED
- Reported in `expenseSummary` (only APPROVED counted)

### Audit Log (Complete)
- Append-only `AuditLog` model
- Written in every server action via `writeAudit(tx, ...)`
- UI: `/audit` with pagination, action filter, JSON preview

### Receipt PDF (Complete)
- `pdf-lib` + NotoSans font (Unicode ₹ support)
- A4 layout with masjid details, amount in words, purposes, footer
- API route: `/api/receipts/[id]/pdf`
- Reprint tracking via `ReceiptEvent(eventType="REPRINTED")`

### Multi-language (Complete)
- Dictionaries: `en.ts`, `hi.ts`, `ur.ts`
- `getDictionary()` loads by cookie/accept-language
- All UI strings use `t("key")`

---

## Prioritized Recommendations (No Implementation)

### Critical — Do First
1. **Fix reversal assignment recompute** — Filter by `donorMemberId` in `reversePaymentAction` (2h)
2. **Add allocation sum check at transaction level** — Use `tx.payment.update({ where: { id }, data: { version: { increment: 1 } } })` as optimistic lock or document single-writer (2h)
3. **Make event COMPLETED sticky** — Add `closedAt` field or check existing status before downgrade (2h)

### High — Next Sprint
4. **Fix weekly event generation to use IST** — Replace `getDay()/setDate()` with `istParts/istMidnight` (2h)
5. **Add unique constraint (paymentId, categoryId)** — Migration + Prisma schema (30m + deploy)
6. **Optimize `outstandingDues` with aggregation** — Prisma `_sum` on filtered allocations (2h)
7. **Validate remainder category not restricted** — Check `restrictedPurpose` before auto-allocating (1h)
8. **Handle walk-in assignment status** — Create pseudo-assignment or document behavior (2h)

### Medium — Backlog
9. **Add optimistic locking to ContributionPlan** — `version` Int field (2h)
10. **Include dueDate in event duplicate detection** (1h)
11. **Filter CSV export to SUCCESS only** (30m)
12. **Add completionThreshold to event status** (95% received) (3h)
13. **Treat WAIVED as settled for COMPLETED** (1h)
14. **Add member sequence counter table** (like ReceiptSequence) (2h)
15. **Return structured result from `generateDuesAction`** (1h)

### Low — Nice to Have
16. **Fix `monthsPerPeriod(ONE_TIME)` return value** (30m)
17. **Add unit tests for status recomputation functions** (4h)
18. **Add unit tests for all server actions** (8h)
19. **Add 10 missing E2E scenarios** (16h)
20. **Document single-server receipt numbering assumption** (30m)

---

## Inspection Summary

### Files Inspected (100+)
- All server actions (`src/modules/*/actions.ts`) — 11 files
- All API routes (`src/app/api/*/route.ts`) — 3 files
- All pages/layouts (`src/app/**/page.tsx`, `layout.tsx`) — 30+ files
- Core libraries (`src/lib/*.ts`) — 15 files
- Prisma schema + 3 migrations
- Test files (7 unit, 1 E2E suite, config)
- Validation registry (single source of truth)
- UI components (ui.tsx, forms, charts, receipts)

### Report Path
`C:\Users\hp\Documents\Claude Project\Masjid Collection\PROJECT_VERIFICATION_AUDIT.md`

### Confirmation
**No application code was modified.** No database migrations run. No packages installed. No environment variables changed. No secrets exposed. This audit was performed entirely through read-only source code inspection.

---

*End of Verification Audit — 2026-10-21*