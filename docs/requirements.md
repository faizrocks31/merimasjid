# Requirements

Derived from `Masjid_Collection_Management_Blueprint_Updated.docx` (v1.0) with the
user's confirmed decisions recorded in §21 of that document. Where the blueprint
allowed a choice, the decision made for this build is stated explicitly and the
reason given.

**Deployment decision (user-confirmed):** this application runs on a **local
server only**. It is not deployed to Vercel or any cloud host, and it uses no
managed database or marketplace integration. The database is a SQLite file under
`data/`.

---

## 1. Product scope

A web application for Masjid committees to:

1. register contributors (members) permanently;
2. define recurring and one-time contribution plans;
3. record cash and UPI contributions, including partial, advance and
   multi-period payments;
4. issue a unique numbered receipt for every successful payment, with print,
   PDF and WhatsApp share;
5. track unpaid periods and outstanding dues;
6. record and approve expenses;
7. produce reconciled financial reports with CSV export;
8. give members a read-only portal for their own history and receipts;
9. keep a complete, append-only audit trail of financial changes.

The data model is **multi-Masjid (multi-tenant)** from day one. The first
deployment serves one Masjid, but every tenant-owned row carries `masjidId` and
every query is scoped to it.

### Non-goals for this release

- No online payment gateway, no automatic UPI verification, no recurring bank
  debit/mandate.
- No tax-deduction certificate claim; the receipt explicitly says it confirms
  receipt of funds only.
- No public display of donor names, phone numbers or amounts.
- No silent editing or deletion of completed financial transactions.
- No bank-account ledger or transfer accounting (net movement is not a bank
  balance).
- No subscription billing automation (the `Subscription` table exists for
  status only).

---

## 2. Roles and permissions

| Role | Can do | Restrictions |
|---|---|---|
| **Platform Super Admin** | Everything a Masjid Admin can do, plus tenant-level settings | Cannot browse other tenants' financial data; privileged access is audited |
| **Masjid Admin / Treasurer** | Members, plans, payments, receipts, reversals, expenses + approval, reports, exports, settings, staff, audit log | Cannot erase financial history; corrections go through reversal |
| **Collector** | Search members, add/edit members, enter payments, print/download receipts, record expenses, view reports | Cannot reverse payments, approve expenses, manage staff/settings, export data, or read the audit log |
| **Auditor / Viewer** | Read-only: members, transactions, receipts, reports, audit log | No create/update permissions at all |
| **Member** | Own profile, own dues, own payments, own receipt PDFs | Server-side ownership check on every request; never sees staff screens or other members |

Permissions are enforced **server-side** in `src/lib/permissions.ts`
(`can` / `assertCan`) inside every server action and route handler. Hiding a
button is a convenience, never the control.

### Permission matrix

| Permission | Super Admin | Admin | Collector | Auditor | Member |
|---|:-:|:-:|:-:|:-:|:-:|
| `member:read` | ✓ | ✓ | ✓ | ✓ | — |
| `member:write` | ✓ | ✓ | ✓ | — | — |
| `plan:write` | ✓ | ✓ | — | — | — |
| `payment:create` | ✓ | ✓ | ✓ | — | — |
| `payment:read` | ✓ | ✓ | ✓ | ✓ | — |
| `payment:reverse` | ✓ | ✓ | — | — | — |
| `receipt:reprint` | ✓ | ✓ | ✓ | — | — |
| `expense:create` | ✓ | ✓ | ✓ | — | — |
| `expense:approve` | ✓ | ✓ | — | — | — |
| `report:read` | ✓ | ✓ | ✓ | ✓ | — |
| `export:data` | ✓ | ✓ | — | — | — |
| `settings:write` | ✓ | ✓ | — | — | — |
| `staff:manage` | ✓ | ✓ | — | — | — |
| `audit:read` | ✓ | ✓ | — | ✓ | — |
| `tenant:manage` | ✓ | — | — | — | — |

Members are not in the staff matrix: their access is limited to
`/portal/*` and `/receipts/<own payment>`.

---

## 3. Functional requirements

### 3.1 Authentication

- Email + password sign-in; passwords hashed with bcrypt (cost 12).
- Session is an HS256 JWT in an HttpOnly, SameSite=Lax cookie, 12-hour expiry;
  `Secure` is set in production.
- The session holds `userId`, `masjidId`, `role`, `isPlatformAdmin`. On **every**
  request `getCurrentUser()` reloads the user and their membership from the
  database, so a role change or disabled account takes effect immediately.
- Brute-force throttle: 8 failed attempts per email per 10 minutes, in memory
  (adequate for one local server).
- Login errors do not reveal whether the email exists; a bcrypt comparison runs
  even for unknown emails.
- Sign-out clears the cookie.

### 3.2 Masjid settings

Configurable per Masjid: name, address, phone, email, receipt prefix (2–8
uppercase alphanumeric characters), financial-year start month (1–12, default
April), receipt footer note. Logo field exists in the schema; upload is not
implemented in this release (see Known limitations).

### 3.3 Members

- Permanent member number, unique within the Masjid: `MAS-000001`, `MAS-000002`,
  … Never reused, even for inactive members.
- Fields: full name (required), father's name, phone, alternate phone, address,
  join date, status (ACTIVE/INACTIVE), notes.
- Phone is **not** a unique key — family members may share a number.
- Search by name, member number or phone.
- Member profile shows plan(s), dues with per-period status, payment timeline,
  total paid and outstanding.
- Optional portal account: staff can create a login for the member while adding
  or editing. The member row links to a `User` row (`Member.userId`).

### 3.4 Contribution plans and dues

- Frequencies: monthly (1 month per period), semi-annual (6), annual (12),
  one-time (single period).
- Fields: member, category, amount, start date, optional end date, due day
  (1–28), grace days (0–60).
- A **plan is an expectation; a payment is an actual financial event.** They are
  separate records and a period is never marked paid just because a plan exists.
- Due periods are generated idempotently (unique `planId + periodStart +
  periodEnd`), up to 12 months ahead of today or the plan end date, whichever is
  earlier.
- Period boundaries are computed in the **Asia/Kolkata calendar**: a period
  starts at IST midnight on the first of its month and ends at IST midnight on
  the last day. Month arithmetic clamps day-of-month and never drifts across
  months (covered by tests).
- Period status is derived from **SUCCESS allocations only**:
  `PAID` when allocated ≥ expected, `PARTIAL` when 0 < allocated < expected,
  `PENDING` when nothing is allocated. `WAIVED` is never downgraded.
- Changing a plan amount writes a `PlanAmountHistory` row with an effective date
  and reason, and updates only **PENDING** periods starting on/after that date.
  Past periods and existing payments are never rewritten.

### 3.5 Payments and allocations

- Select an existing member or enter a walk-in donor name.
- Amount > 0; payment date; mode (Cash / UPI / Bank transfer / Other); optional
  reference number; verification status; notes.
- Allocations: one payment may be split across several due periods and/or
  categories. Allocated total may not exceed the payment total. Any unallocated
  remainder is recorded against the first chosen category as
  "Unallocated balance", so category reports always reconcile to the payment
  total.
- For UPI, the reference ID is stored and the verification state is shown. Cash
  is always `MANUAL`. **The UI never claims gateway verification**; the only
  values are "Manually recorded" and "Verified", and nothing sets "Verified"
  automatically.
- Idempotency: the client generates a key per form session; `(masjidId,
  idempotencyKey)` is unique. A repeated submission returns the original payment
  and receipt number instead of creating a second record.
- Atomicity: receipt numbering, payment insert, allocation rows, period status
  recalculation, the ISSUED receipt event and the audit entry all commit in one
  interactive transaction.
- Cross-tenant references (member, category, due period) are rejected before the
  transaction opens.
- A suspended Masjid is read-only for payments.

### 3.6 Receipts

- Number format: `<prefix>-<FY>-<000001>`, e.g. `MSA-2026-27-000001`. Sequence
  is per Masjid **and** per financial year, allocated inside the payment
  transaction, never reused.
- Content: Masjid identity, receipt number, date/time in IST (DD-MM-YYYY),
  received-from (member name + member number, or "Anonymous Donor"), amount in
  figures and Indian-numbering words, purpose/category split, payment mode,
  reference, verification state, collector, notes, footer, and a note that the
  receipt is not a tax certificate.
- Actions: print (browser print stylesheet), PDF download
  (`/api/receipts/<id>/pdf`), WhatsApp share (`wa.me` deep link, user-initiated),
  reprint.
- A reprint keeps the **same receipt number** and is marked "DUPLICATE COPY" on
  screen, in print and in the PDF. The reprint is logged as a `REPRINTED`
  receipt event and an audit row.
- The PDF is generated from persisted data only, with an embedded Unicode font
  so ₹ renders; it falls back to Helvetica + "Rs." if the font is unavailable.

### 3.7 Reversals

- A completed payment can never be edited or deleted.
- An authorized user reverses it with a mandatory reason.
- The original row stays visible and is marked `REVERSED`; a `Reversal` row
  records amount, reason, approver and timestamp; a `CANCELLED` receipt event is
  written; affected period statuses are recalculated from remaining successful
  allocations; an audit row records before/after plus the reason.
- A corrected payment is entered as a **new** transaction with a new receipt
  number.
- Reports show gross, reversals and net; gross includes reversed rows so that
  gross − reversals = net always reconciles with the register.

### 3.8 Expenses

- Fields: category, date, payee, amount, mode, reference, description.
- Numbered `EXP-<FY>-000001` per Masjid per financial year.
- Approval status: expenses entered by an Admin/Super Admin are auto-approved;
  those entered by a Collector are `PENDING` and need approval.
- Only `APPROVED` expenses count in reports and dashboards.
- Expense categories are per-Masjid and managed in Settings.

### 3.9 Reports

Available with a date range (default: current month; presets today / month /
financial year; custom from–to):

- Collection summary: gross, reversals, net, transaction count.
- Expense summary (approved only).
- Category-wise collection (with restricted-purpose flag).
- Payment-mode totals.
- Collector-wise totals.
- Pending dues list with outstanding per period.
- Income vs expenses and net cash movement.
- Dashboard: today, this month, financial year, outstanding dues, expenses this
  month, net movement, 6-month trend chart, recent transactions.

All totals come from authorized database queries, never client-side arithmetic.
CSV export of transactions (with a UTF-8 BOM so Excel shows ₹/Devanagari) is
available and is audit-logged.

### 3.10 Member portal

- Members sign in with their own account and land on `/portal`.
- They see only: their profile, their dues and status, their payment history and
  their own receipt pages/PDFs.
- The member id always comes from the session (`user.memberId`), never from the
  URL. A receipt URL for another member's payment returns 404.
- Staff are redirected from `/portal` to `/dashboard`; members are redirected
  from `/dashboard` to `/portal`.

### 3.11 Audit log

Append-only. Every entry records actor, action, entity, before/after JSON,
metadata and timestamp. Recorded actions:

`payment.create`, `payment.reverse`, `receipt.reprint`, `member.create`,
`member.update`, `plan.create`, `plan.changeAmount`, `dues.generate`,
`expense.create`, `expense.decide`, `settings.update`, `category.create`,
`expenseCategory.create`, `staff.create`, `staff.changeRole`,
`staff.deactivate`, `staff.reactivate`, `export.transactions`.

The log is paginated (100/page) and filterable by action, and is visible to
Admin and Auditor roles.

### 3.12 Localization

- Hindi, English and Urdu from launch.
- Language is stored in the `masjid_locale` cookie and applied server-side to
  `<html lang dir>`; Urdu sets `dir="rtl"`.
- Fonts: Geist (UI/Latin), Noto Sans Devanagari (Hindi), Noto Naskh Arabic
  (Urdu) via `next/font`.
- Dictionary keys are typed from the English dictionary, so a missing key is a
  compile error.
- Layout uses logical CSS properties (`ms-`, `me-`, `start-`, `end-`,
  `text-start`, `text-end`) so RTL works without a parallel stylesheet.

### 3.13 Formatting rules

- Currency INR (₹), always stored and computed as **integer paise**.
- Timezone Asia/Kolkata; dates displayed DD-MM-YYYY.
- Numbers use Indian grouping (`1,23,456.00`).

### 3.14 Responsive and accessible UI

- Desktop: left sidebar, top bar with Masjid name, date, locale switcher, user
  menu.
- Mobile: compact header, bottom navigation for the five primary destinations,
  horizontally scrollable tables, one-hand-usable collection form.
- Status is always shown as text + colour, never colour alone.
- Form fields have labels; validation errors appear next to the field.
- Print styles hide navigation and controls and print only the receipt sheet.

---

## 4. Acceptance criteria

Each of these was verified by an automated test, a scripted runtime check, or a
documented manual step (see `docs/implementation-plan.md`).

| Area | Criterion |
|---|---|
| Member records | Create, update, search, deactivate; member number unique per Masjid |
| Monthly plans | Periods generated without duplicates; paid/partial/pending correct |
| Semi-annual / annual | Correct period boundaries, including month-end and leap-year cases |
| Payment | One transaction + allocations + one unique receipt; repeat submit does not duplicate |
| Partial / advance | Outstanding balances and future-period allocations remain correct |
| Receipt | Print and PDF match persisted data; reprint keeps the number and says DUPLICATE COPY |
| Reversal | Original stays visible; reason logged; net totals update |
| Permissions | Collector cannot reverse/approve/manage staff/export; member sees only own data |
| Tenant isolation | A user of Masjid A cannot read or infer Masjid B's data by changing IDs |
| Reports | Totals reconcile with transaction detail for the selected range |
| Responsive | Core collection flow usable on a phone-width viewport and desktop |
| Recovery | Copying `data/masjid.db` back restores the database (documented procedure) |

---

## 5. Confirmed decisions

| Decision | Value |
|---|---|
| Deployment | Local server only; no cloud, no Vercel |
| Database | SQLite file (`data/masjid.db`) via Prisma |
| Tenancy | Multi-Masjid, strict `masjidId` scoping |
| Member portal | Required in the first release |
| Languages | Hindi + English + Urdu, Urdu RTL |
| Payment modes | Cash + UPI (plus bank transfer / other as recorded modes) |
| Receipt numbering | `<prefix>-<FY>-000001`, per Masjid per financial year |
| Corrections | Reversal workflow only, with reason + audit |
| Money storage | Integer paise (see `docs/data-model.md` for why not Decimal) |
| Financial year | Configurable per Masjid, default April |
