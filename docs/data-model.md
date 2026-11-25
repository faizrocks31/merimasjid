# Data model

SQLite via Prisma. The authoritative definition is `prisma/schema.prisma`; the
migration in `prisma/migrations/20261019092355_init` creates it.

---

## Conventions

1. **Tenant column.** Every tenant-owned table carries `masjidId`. Reads and
   writes always include it in the `where` clause, taken from the session.
2. **Money is `Int` paise.** 1 INR = 100 paise. Integer arithmetic only.
3. **Enum-like columns are `TEXT`**, validated in `src/lib/constants.ts`
   (`ROLES`, `FREQUENCIES`, `PAYMENT_MODES`, `PAYMENT_STATUS`, `PERIOD_STATUS`,
   `EXPENSE_STATUS`, …). SQLite has no enum type; this keeps values readable in
   the file while the application enforces the set.
4. **Internal ids are cuid strings.** Human-readable references
   (`memberNo`, `receiptNo`, `expenseNo`) are display values with unique
   constraints scoped to a Masjid.
5. **Financial history is append-only.** Completed payments are never edited or
   deleted; corrections add `Reversal` rows. Audit rows are never updated.

### Why integer paise instead of `Decimal`

The blueprint says "DECIMAL/NUMERIC, never floating point". Prisma's SQLite
connector has no `Decimal` type — it would store as REAL (a float), which is
exactly what the blueprint forbids. Storing integer paise is a stronger
guarantee than a decimal column: every value and every aggregate is exact by
construction. The display layer divides by 100 once, for formatting only.

---

## Entity overview

```
Masjid ─┬─ MasjidUser ── User
        ├─ Member ─┬─ ContributionPlan ─┬─ PlanAmountHistory
        │          │                    └─ DuesPeriod ─┐
        │          ├─ Payment ─┬─ PaymentAllocation ──┘
        │          │           ├─ ReceiptEvent
        │          │           └─ Reversal (1:1)
        │          └─ User (optional portal login)
        ├─ ContributionCategory ── PaymentAllocation
        ├─ ExpenseCategory ── Expense
        ├─ ReceiptSequence
        ├─ CashSession
        ├─ AuditLog
        ├─ Subscription
        └─ NotificationLog
```

---

## Tables

### `Masjid`

The tenant. One row per Masjid.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | cuid |
| `name` | TEXT | official name |
| `slug` | TEXT **unique** | URL-safe identifier |
| `address`, `phone`, `email` | TEXT? | printed on receipts |
| `logoUrl` | TEXT? | reserved; no upload pipeline yet |
| `timezone` | TEXT | default `Asia/Kolkata` |
| `currency` | TEXT | default `INR` |
| `financialYearStartMonth` | INTEGER | 1–12, default 4 (April) |
| `receiptPrefix` | TEXT | default `MSA` |
| `receiptFooter` | TEXT? | thank-you line |
| `status` | TEXT | `ACTIVE` \| `SUSPENDED` |
| `createdAt`, `updatedAt` | DATETIME | |

### `User`

A login identity, independent of any Masjid.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `name` | TEXT | |
| `email` | TEXT **unique** | lowercased on write |
| `phone` | TEXT? | |
| `passwordHash` | TEXT | bcrypt, cost 12 |
| `status` | TEXT | `ACTIVE` \| `DISABLED` |
| `lastLoginAt` | DATETIME? | |

A user is either staff (has `MasjidUser` rows), a portal member (linked from
`Member.userId`), or both.

### `MasjidUser`

Staff membership and role within a Masjid.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `masjidId` | TEXT FK → Masjid, cascade | |
| `userId` | TEXT FK → User, cascade | |
| `role` | TEXT | `SUPER_ADMIN` \| `ADMIN` \| `COLLECTOR` \| `AUDITOR` |
| `status` | TEXT | `ACTIVE` \| `INACTIVE` (default `ACTIVE`) |
| `invitedAt`, `joinedAt` | DATETIME? | |

Unique `(masjidId, userId)`; index on `userId`; index on `(masjidId, status)`.

A membership with `status = "INACTIVE"` is excluded from authentication
(`getCurrentUser()`, `loginAction()`) and from staff UPI lookups used in payment
review, so deactivating a staff member ends their access on the very next
request. The row and all historical data (payments entered, receipts, audit
rows) remain for integrity.

### `Member`

A contributor. Permanent within the Masjid.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `masjidId` | TEXT FK, cascade | |
| `memberNo` | TEXT | `MAS-000001`, unique per Masjid |
| `fullName` | TEXT | |
| `fatherName` | TEXT? | |
| `phone`, `alternatePhone` | TEXT? | **not** unique — families share numbers |
| `address` | TEXT? | |
| `joinDate` | DATETIME | default now |
| `status` | TEXT | `ACTIVE` \| `INACTIVE` |
| `notes` | TEXT? | |
| `userId` | TEXT? FK → User, `SetNull` | optional portal login |

Unique `(masjidId, memberNo)`. Indexes: `(masjidId, status)`,
`(masjidId, fullName)`, `(masjidId, phone)`, `(userId)`.

### `ContributionCategory`

| Column | Type | Notes |
|---|---|---|
| `id`, `masjidId` | TEXT | |
| `name` | TEXT | e.g. Monthly Chanda, Zakat |
| `code` | TEXT | uppercase, unique per Masjid |
| `restrictedPurpose` | BOOLEAN | earmarked funds (Zakat, construction) |
| `reportingGroup` | TEXT? | e.g. Recurring / General / Restricted |
| `active` | BOOLEAN | |

Unique `(masjidId, code)`.

Defaults seeded: MONTHLY, ANNUAL, GENERAL, ZAKAT (restricted), SADAQAH,
CONSTRUCTION (restricted).

### `ContributionPlan`

The **expectation** schedule for a member. Not money.

| Column | Type | Notes |
|---|---|---|
| `id`, `masjidId` | TEXT | |
| `memberId` | FK → Member, cascade | |
| `categoryId` | FK → ContributionCategory | |
| `frequency` | TEXT | `MONTHLY` \| `SEMI_ANNUAL` \| `ANNUAL` \| `ONE_TIME` |
| `amountPaise` | INTEGER | per period |
| `startDate`, `endDate` | DATETIME, DATETIME? | |
| `dueDay` | INTEGER | 1–28, day of month the period is due |
| `graceDays` | INTEGER | 0–60 |
| `status` | TEXT | `ACTIVE` \| `ENDED` \| `CANCELLED` |

Indexes `(masjidId, memberId)`, `(masjidId, status)`.

### `PlanAmountHistory`

Append-only record of amount changes.

| Column | Type | Notes |
|---|---|---|
| `id`, `planId` | TEXT | |
| `amountPaise` | INTEGER | |
| `effectiveFrom` | DATETIME | changes apply from this date forward |
| `changedBy` | TEXT? | user id |
| `reason` | TEXT? | |

Index `(planId, effectiveFrom)`. The initial amount is written at plan creation
with reason "Initial amount".

### `DuesPeriod`

One expected installment.

| Column | Type | Notes |
|---|---|---|
| `id`, `masjidId` | TEXT | |
| `planId` | FK → plan, cascade | |
| `memberId` | FK → Member, cascade | denormalized for direct member queries |
| `periodStart`, `periodEnd` | DATETIME | IST midnight boundaries |
| `dueDate` | DATETIME | `dueDay` + `graceDays`, IST |
| `expectedAmountPaise` | INTEGER | snapshot of the plan amount at generation |
| `status` | TEXT | `PENDING` \| `PARTIAL` \| `PAID` \| `WAIVED` |

**Unique `(planId, periodStart, periodEnd)`** — this is what makes generation
idempotent. Indexes `(masjidId, status, dueDate)`, `(masjidId, memberId)`.

Status is derived, not entered:

```
allocated = Σ allocations where payment.status = SUCCESS
PAID     if allocated >= expected
PARTIAL  if 0 < allocated < expected
PENDING  if allocated = 0
WAIVED   always preserved
```

### `Payment`

The actual financial event.

| Column | Type | Notes |
|---|---|---|
| `id`, `masjidId` | TEXT | |
| `receiptNo` | TEXT | `<prefix>-<FY>-000001` |
| `donorMemberId` | TEXT? FK → Member, `SetNull` | null for walk-in |
| `donorNameSnapshot` | TEXT | name at time of payment |
| `paymentDate` | DATETIME | IST midnight |
| `amountPaise` | INTEGER | |
| `mode` | TEXT | `CASH` \| `UPI` \| `BANK_TRANSFER` \| `OTHER` |
| `referenceNo` | TEXT? | UPI/bank reference |
| `verificationStatus` | TEXT | `MANUAL` \| `VERIFIED` |
| `status` | TEXT | `SUCCESS` \| `REVERSED` |
| `enteredBy` | FK → User | the collector |
| `notes` | TEXT? | |
| `idempotencyKey` | TEXT? | client-generated per form session |

**Unique `(masjidId, receiptNo)`**, **unique `(masjidId, idempotencyKey)`**.
Indexes `(masjidId, paymentDate)`, `(masjidId, donorMemberId)`,
`(masjidId, status)`, `(masjidId, mode)`.

### `PaymentAllocation`

How a payment is split.

| Column | Type | Notes |
|---|---|---|
| `id`, `masjidId` | TEXT | |
| `paymentId` | FK → Payment, cascade | |
| `duesPeriodId` | TEXT? FK → DuesPeriod, `SetNull` | null for a general donation |
| `categoryId` | FK → ContributionCategory | |
| `allocatedAmountPaise` | INTEGER | |
| `purposeNote` | TEXT? | e.g. "Unallocated balance", "Advance" |

Invariant enforced by the action: `Σ allocations ≤ payment.amountPaise`, and any
remainder is allocated to the first chosen category so category reports always
sum to the payment total.

### `ReceiptEvent`

Append-only receipt lifecycle.

| Column | Type | Notes |
|---|---|---|
| `id`, `masjidId`, `paymentId` | TEXT | |
| `eventType` | TEXT | `ISSUED` \| `REPRINTED` \| `CANCELLED` |
| `actorUserId` | FK → User | |
| `reason` | TEXT? | required for cancellation |
| `createdAt` | DATETIME | |

### `ReceiptSequence`

The receipt counter.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `masjidId` | FK, cascade | |
| `financialYear` | TEXT | e.g. `2026-27` |
| `lastNumber` | INTEGER | default 0 |

**Unique `(masjidId, financialYear)`**. Read-modify-write happens inside the
payment transaction; numbers only move forward.

### `ExpenseCategory` / `Expense`

`ExpenseCategory`: `id`, `masjidId`, `name`, `active`; unique
`(masjidId, name)`.

`Expense`:

| Column | Type | Notes |
|---|---|---|
| `id`, `masjidId` | TEXT | |
| `expenseNo` | TEXT | `EXP-<FY>-000001`, unique per Masjid |
| `categoryId` | FK → ExpenseCategory | |
| `date` | DATETIME | |
| `payee` | TEXT | |
| `amountPaise` | INTEGER | |
| `mode` | TEXT | same set as payments |
| `referenceNo`, `description` | TEXT? | |
| `attachmentUrl` | TEXT? | reserved |
| `enteredBy` | FK → User | |
| `approvalStatus` | TEXT | `PENDING` \| `APPROVED` \| `REJECTED` |

Only `APPROVED` expenses appear in reports.

### `Reversal`

| Column | Type | Notes |
|---|---|---|
| `id`, `masjidId` | TEXT | |
| `originalPaymentId` | TEXT **unique** FK → Payment | one reversal per payment |
| `reversalPaymentId` | TEXT? **unique** FK → Payment, `SetNull` | reserved for a linked refund entry |
| `amountPaise` | INTEGER | |
| `reason` | TEXT | mandatory |
| `approvedBy` | TEXT | user id |
| `createdAt` | DATETIME | |

### `AuditLog`

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `masjidId` | TEXT? FK, cascade | null for platform-level events |
| `actorUserId` | TEXT? FK → User, `SetNull` | |
| `action` | TEXT | e.g. `payment.create` |
| `entityType`, `entityId` | TEXT, TEXT? | |
| `beforeJson`, `afterJson`, `metadata` | TEXT? | JSON strings |
| `createdAt` | DATETIME | |

Indexes `(masjidId, createdAt)`, `(masjidId, entityType, entityId)`. Written in
the same transaction as the change it describes.

### `CashSession`

Present for the blueprint's reconciliation phase: `masjidId`, `collectorId`,
`openedAt`, `openingCashPaise`, `closedAt?`, `countedCashPaise?`,
`expectedCashPaise?`, `differencePaise?`, `status` (`OPEN`/`CLOSED`), `notes?`.
**Not yet wired into the UI** (see Known limitations).

### `Subscription` / `NotificationLog`

Reserved for multi-tenant billing and messaging. `Subscription` carries
`planCode`, `status` (`TRIAL`/`ACTIVE`/`SUSPENDED`/`CANCELLED`), `startsAt`,
`endsAt?`, `billingReference?`. `NotificationLog` carries recipient, channel,
template, status, provider reference. Neither is used by the application logic
in this release; the Masjid `status` field is what suspends a tenant.

---

## Integrity rules

| Rule | Where enforced |
|---|---|
| Receipt numbers unique per Masjid and never reused | `(masjidId, receiptNo)` unique + transactional `ReceiptSequence` |
| Member numbers unique per Masjid | `(masjidId, memberNo)` unique + `nextMemberNumber` |
| No duplicate due periods | `(planId, periodStart, periodEnd)` unique |
| No duplicate payment on resubmit | `(masjidId, idempotencyKey)` unique + lookup-first transaction |
| One reversal per payment | `Reversal.originalPaymentId` unique |
| Allocations never exceed the payment | Server Action validation |
| Cross-tenant ids rejected | `findFirst({ id, masjidId })` before every reference use |
| Money is exact | `Int` paise everywhere |
| Completed transactions immutable | No update/delete path for `Payment` except `status` → `REVERSED` via the reversal action |
| Audit is append-only | `writeAudit` only creates; no update/delete code exists |

---

## Seeded data

`npm run seed` (idempotent) creates:

- the Masjid from `SEED_MASJID_NAME` (default "Jama Masjid") with prefix `MSA`,
  FY starting April;
- the admin user from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`, linked as
  `ADMIN`;
- the six default contribution categories;
- the six default expense categories.

It creates **no** members, plans, payments or expenses — the database starts
financially empty.
