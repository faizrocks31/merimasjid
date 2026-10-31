# Project Overview: Multi-Masjid Collection Management SaaS

## 1. Technology Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| **Framework** | Next.js 16.4.2 (App Router) | React 19, Server Components by default |
| **Runtime** | Node.js (Turbopack in dev) | `next dev` uses Turbopack |
| **Database** | SQLite via Prisma 7 | `@prisma/adapter-better-sqlite3`, file-based (`data/masjid.db`) |
| **ORM** | Prisma Client 7.10.1 | `prisma/schema.prisma` is source of truth |
| **Auth** | JWT (HS256) via `jose` | Cookie `masjid_session`, 12h expiry, verified + re-read from DB on every request |
| **Validation** | Zod 4.6.7 + central registry (`src/lib/validation-registry.ts`) | Single source of truth for field rules, labels, types |
| **UI** | Custom component kit (`src/components/ui.tsx`) | No external UI library; Tailwind CSS 4 for styling |
| **PDF** | `pdf-lib` + embedded NotoSans font | Receipt generation with proper ₹ sign |
| **Charts** | Recharts 3.10.1 | Collection trend on dashboard |
| **Testing** | Vitest (unit/integration) + Playwright (E2E) | 24 E2E tests passing |
| **i18n** | Custom dictionary system | `en.ts`, `hi.ts`, `ur.ts` |
| **Notifications** | Telegram Bot API (optional) | `TELEGRAM_BOT_TOKEN` in env; member opt-in via profile |

---

## 2. Project Folder Structure (Key Directories)

```
src/
├── app/
│   ├── (auth)/login/                 # Sign-in page + form
│   ├── (dashboard)/                  # Staff shell (sidebar, header, mobile nav)
│   │   ├── dashboard/                # Home page
│   │   ├── members/                  # CRUD + search
│   │   ├── plans/                    # Contribution plans & dues generation
│   │   ├── collections/new/          # Receive payment (multi-category allocation)
│   │   ├── collections/review/       # Pending receipts (approve/reprint)
│   │   ├── transactions/             # Payment register
│   │   ├── expenses/                 # Expense entry + approval
│   │   ├── reports/                  # Category totals, member ledger, event totals
│   │   ├── settings/                 # Categories, staff, notifications, masjid details
│   │   ├── staff/                    # Staff management
│   │   └── audit/                    # Audit log viewer
│   ├── (portal)/                     # Member shell
│   │   ├── portal/                   # Dashboard (summary, outstanding dues)
│   │   ├── portal/dues/              # Detailed dues list
│   │   ├── portal/receipts/          # Member's own receipts
│   │   └── portal/profile/           # Notification preferences, Telegram link
│   ├── (platform)/                   # Super Admin shell
│   │   ├── platform/                 # Masjid list + create/edit/detail
│   │   └── layout.tsx                # Guards: SUPER_ADMIN + isPlatformAdmin
│   ├── receipts/[id]/                # Receipt page (shared staff + member)
│   │   ├── page.tsx                  # HTML receipt sheet
│   │   ├── auto-print.tsx            # Print trigger
│   │   ├── reverse-payment.tsx       # Reversal form
│   │   └── receipt-actions.tsx       # Reprint / reverse buttons
│   ├── api/
│   │   ├── payments/create/route.ts  # Payment API endpoint
│   │   ├── receipts/[id]/pdf/route.ts # Authenticated PDF download
│   │   └── exports/transactions/route.ts # CSV export
│   ├── layout.tsx                    # Root layout, fonts, locale cookie
│   └── page.tsx                      # Landing → role-based redirect
├── components/
│   ├── ui.tsx                        # Button, Card, Input, Select, Textarea, Checkbox, Badge, StatCard, EmptyState, Field, SimpleForm, AutoForm
│   ├── layout/                       # SidebarNav, MobileNav, UserMenu, LocaleSwitcher
│   ├── receipts/receipt-sheet.tsx    # Printable receipt (screen + @media print)
│   ├── charts/collection-trend.tsx   # Recharts line chart
│   └── forms/auto-form.tsx           # Registry-driven form renderer + MemberSearch widget
├── modules/
│   ├── auth/actions.ts               # loginAction, logoutAction
│   ├── members/actions.ts            # createMemberAction, updateMemberAction
│   ├── plans/actions.ts              # createPlanAction, changeAmountAction, generateDuesAction
│   ├── payments/actions.ts           # createPaymentAction, reversePaymentAction, recordReprintAction
│   ├── payments/review.ts            # buildPaymentReviewData, generateQRCodeDataUrl, getStaffUPIForMasjid
│   ├── expenses/actions.ts           # createExpenseAction, approveExpenseAction, rejectExpenseAction
│   ├── settings/actions.ts           # Masjid settings, categories, staff, locale
│   ├── settings/locale-action.ts     # Language preference
│   ├── collections/actions.ts        # CollectionEvent CRUD, generate from category, assign households
│   ├── portal/queries.ts             # requirePortalMember, portalSummary
│   ├── portal/actions.ts             # Member notification preferences
│   ├── receipts/load.ts              # loadReceipt (tenant + ownership checks)
│   ├── receipts/view.ts              # ReceiptView model
│   ├── receipts/pdf.ts               # renderReceiptPdf (A4, Unicode font)
│   ├── reports/queries.ts            # All report aggregates
│   ├── platform/actions.ts           # createMasjidAction, updateMasjidAction, setMasjidStatusAction, deleteMasjidAction
│   └── audit/write.ts                # writeAudit helper
├── lib/
│   ├── auth.ts                       # JWT, getCurrentUser, requireUser, requireStaff, requirePortalMember
│   ├── permissions.ts                # Role → Permission matrix, can(), assertCan()
│   ├── constants.ts                  # ROLES, FREQUENCIES, PAYMENT_MODES, CATEGORY_FREQUENCIES, COLLECTION_MODES, EVENT_STATUS, MEMBER_STATUS, EXPENSE_STATUS, MASJID_STATUS, DEFAULT_CATEGORIES, DEFAULT_EXPENSE_CATEGORIES
│   ├── validation-registry.ts        # VALIDATION_RULES (declarative), getFormFields(), memberShape, validateForm()
│   ├── validation.ts                 # Zod schemas derived from registry
│   ├── db.ts                         # PrismaClient singleton (cached on globalThis in dev)
│   ├── dates.ts                      # IST calendar helpers: monthPeriod, addMonths, financialYearRange, parseISODate
│   ├── dues.ts                       # recomputePeriodStatus, recomputeAssignmentStatus, recomputeEventStatus
│   ├── money.ts                      # parseRupeesToPaise, formatPaise, numberToWordsIndian
│   ├── receipts/numbering.ts         # nextReceiptNumber (transactional ReceiptSequence)
│   ├── api-auth.ts                   # authorizeFileRequest for route handlers
│   ├── form-date.ts                  # dateInput helper for forms
│   └── cn.ts                         # clsx + tailwind-merge
├── i18n/
│   ├── en.ts, hi.ts, ur.ts           # Dictionaries
│   ├── index.ts                      # getDictionary(), t()
│   └── config.ts                     # Locale config
prisma/
├── schema.prisma                     # 23 models (see Section 3)
├── migrations/                       # 3 migrations
└── seed.ts                           # Idempotent: SUPER_ADMIN, 2 demo masjids, admin, categories, optional demo member
```

---

## 3. Database Models and Relationships (from `prisma/schema.prisma`)

**23 models** — all tenant-owned tables carry `masjidId` (except `User` and `AuditLog` which can be platform-level).

### Core Tenant: `Masjid`
- `id`, `name`, `slug` (unique), `address`, `phone`, `email`, `logoUrl`
- `timezone` (default `Asia/Kolkata`), `currency` (default `INR`)
- `financialYearStartMonth` (1–12, default 4), `receiptPrefix` (default `MSA`), `receiptFooter`
- `status`: `ACTIVE` | `SUSPENDED`
- Relations: users, members, categories, plans, duesPeriods, payments, allocations, events, expenses, cashSessions, subscriptions, notifications, auditLogs, receiptSequences, receiptEvents, reversals

### Identity & Access
| Model | Purpose | Key Fields |
|-------|---------|------------|
| `User` | Global login identity | `id`, `email` (unique), `name`, `passwordHash`, `phone`, `status`, `upiId` |
| `MasjidUser` | Staff membership in a masjid | `masjidId`, `userId`, `role` (`SUPER_ADMIN`/`ADMIN`/`COLLECTOR`/`AUDITOR`), `status` (`ACTIVE`/`INACTIVE`), `joinedAt` |
| `Member` | Contributor (may link to User for portal) | `masjidId`, `memberNo` (unique per masjid, e.g. `MAS-000001`), `fullName`, `fatherName`, `phone`, `alternatePhone`, `address`, `joinDate`, `status`, `notes`, `userId?`, Telegram prefs |

### Contribution & Collection
| Model | Purpose | Key Fields |
|-------|---------|------------|
| `ContributionCategory` | Income category (e.g. Monthly Chanda, Zakat) | `masjidId`, `name`, `code` (unique per masjid), `restrictedPurpose`, `reportingGroup`, `active`, `defaultAmountPaise`, `frequency`, `collectionMode` (`HOUSEHOLD_WISE`/`COMBINED`), `schedulingRules`, `defaultDueDay`, `defaultGraceDays`, `description` |
| `ContributionPlan` | Member's recurring commitment | `masjidId`, `memberId`, `categoryId`, `frequency` (`MONTHLY`/`SEMI_ANNUAL`/`ANNUAL`/`ONE_TIME`), `amountPaise`, `startDate`, `endDate?`, `dueDay`, `graceDays`, `status` |
| `PlanAmountHistory` | Audit trail of amount changes | `planId`, `amountPaise`, `effectiveFrom`, `changedBy`, `reason` |
| `DuesPeriod` | One expected installment from a plan | `masjidId`, `planId`, `memberId`, `periodStart`, `periodEnd`, `dueDate`, `expectedAmountPaise` (snapshot), `status` (`PENDING`/`PARTIAL`/`PAID`/`WAIVED`) — **unique `(planId, periodStart, periodEnd)`** |
| `CollectionEvent` | Category-level scheduling unit | `masjidId`, `categoryId`, `name`, `startDate`, `endDate?`, `dueDate`, `expectedAmountPaise?`, `status` (`SCHEDULED`/`OPEN`/`COMPLETED`/`CANCELLED`), `applicableMonth`, `applicableYear`, `createdBy` |
| `CollectionEventAssignment` | Household linked to event | `eventId`, `memberId`, `expectedAmountPaise`, `status` (`PENDING`/`PARTIAL`/`PAID`/`WAIVED`) — **unique `(eventId, memberId)`** |

### Payments & Receipts
| Model | Purpose | Key Fields |
|-------|---------|------------|
| `Payment` | Financial event | `masjidId`, `receiptNo` (unique per masjid, `<prefix>-<FY>-000001`), `donorMemberId?`, `donorNameSnapshot`, `paymentDate`, `amountPaise`, `mode` (`CASH`/`UPI`/`BANK_TRANSFER`/`OTHER`), `referenceNo`, `verificationStatus` (`MANUAL`/`VERIFIED`), `status` (`SUCCESS`/`REVERSED`), `enteredBy`, `idempotencyKey` (unique per masjid) |
| `PaymentAllocation` | How payment is split | `masjidId`, `paymentId`, `duesPeriodId?`, `categoryId`, `collectionEventId?`, `allocatedAmountPaise`, `purposeNote` — invariant: `Σ allocations ≤ payment.amountPaise` |
| `ReceiptSequence` | Counter per financial year | `masjidId`, `financialYear` (e.g. `2026-27`), `lastNumber` — **unique `(masjidId, financialYear)`** |
| `ReceiptEvent` | Append-only lifecycle | `masjidId`, `paymentId`, `eventType` (`ISSUED`/`REPRINTED`/`CANCELLED`), `actorUserId`, `reason?` |
| `Reversal` | Immutable correction | `masjidId`, `originalPaymentId` (unique), `reversalPaymentId?`, `amountPaise`, `reason`, `approvedBy` — original payment status → `REVERSED` |

### Expenses
| Model | Purpose |
|-------|---------|
| `ExpenseCategory` | `masjidId`, `name` (unique per masjid), `active` |
| `Expense` | `masjidId`, `expenseNo` (`EXP-<FY>-000001`), `categoryId`, `date`, `payee`, `amountPaise`, `mode`, `referenceNo`, `description`, `attachmentUrl`, `enteredBy`, `approvalStatus` (`PENDING`/`APPROVED`/`REJECTED`) — only `APPROVED` in reports |

### Platform & Ops
| Model | Purpose |
|-------|---------|
| `Subscription` | Reserved for multi-tenant billing: `masjidId`, `planCode`, `status` (`TRIAL`/`ACTIVE`/`SUSPENDED`/`CANCELLED`), `startsAt`, `endsAt?`, `billingReference?` — **not used by app logic yet** |
| `NotificationLog` | Outbound message log: `masjidId`, `recipient`, `channel`, `template`, `status`, `providerReference` |
| `MasjidNotificationSettings` | Per-masjid toggles: `telegramEnabled`, `emailEnabled`, `inAppEnabled`, `defaultTemplates` |
| `CashSession` | Collector cash reconciliation: `masjidId`, `collectorId`, `openedAt`, `openingCashPaise`, `closedAt?`, `countedCashPaise?`, `expectedCashPaise?`, `differencePaise?`, `status` (`OPEN`/`CLOSED`) — **UI not wired yet** |
| `AuditLog` | Append-only: `masjidId?`, `actorUserId?`, `action`, `entityType`, `entityId?`, `beforeJson`, `afterJson`, `metadata` |

---

## 4. Authentication and Role-Based Access

### Session
- `jose` HS256 JWT in cookie `masjid_session` (httpOnly, sameSite=lax, secure in prod, 12h)
- Payload: `{ userId, masjidId?, role, isPlatformAdmin }`
- **Critical:** `getCurrentUser()` re-reads `User`, `MasjidUser` memberships, and `Member` profiles from DB on **every call** — stale cookie cannot grant revoked access.

### Roles (`src/lib/constants.ts`)
| Role | Label | Scope | Permissions (`src/lib/permissions.ts`) |
|------|-------|-------|----------------------------------------|
| `SUPER_ADMIN` | Platform Super Admin | Platform (all masjids) | `tenant:manage` only (platform actions) |
| `ADMIN` | Masjid Admin / Treasurer | One masjid | Full: members, plans, payments, receipts, expenses, reports, settings, staff, audit |
| `COLLECTOR` | Collector | One masjid | Members (read/write), payments (create/read), receipts (reprint), expenses (create), reports (read) |
| `AUDITOR` | Auditor / Viewer | One masjid | Read-only: members, payments, reports, audit |
| `MEMBER` | Member (portal) | Own data only | No staff permissions; portal reads own dues, receipts, profile |

### Guards
- `requireUser()` — throws if unauthenticated
- `requireStaff()` — throws if MEMBER or no masjidId; blocks SUSPENDED masjid for non-SUPER_ADMIN
- `requireRole([...])` — checks permission matrix
- `requirePortalMember()` — throws unless `role === MEMBER` with valid `memberId` and `masjidId`
- Layout-level redirects: `(dashboard)/layout.tsx` sends MEMBER → `/portal`, SUPER_ADMIN with `isPlatformAdmin` → `/platform`

---

## 5. How Super Admin, Local Admin, and Member Roles Work

### Super Admin (`SUPER_ADMIN` + `isPlatformAdmin`)
- Created by seed: `admin@masjid.super` / `F@izan8871`
- Linked as `SUPER_ADMIN` to **all** masjids via `MasjidUser`
- Access: `/platform` only (masjid list, create, edit, suspend/activate, delete empty masjids, view staff)
- **No operational dashboard** — redirected from `/dashboard` to `/platform`
- Can impersonate/access any masjid's data via platform actions

### Local Admin (`ADMIN`, `COLLECTOR`, `AUDITOR`)
- Created by Super Admin via Settings → Staff (invite) or seed (`admin@masjid.local` / `ChangeMe123!`)
- Linked to **one** masjid via `MasjidUser` with role
- Session `masjidId` comes from their active membership
- All queries auto-scoped to `user.masjidId`
- Dashboard at `/dashboard` with sidebar navigation per role permissions

### Member (`MEMBER`)
- **No `MasjidUser` row** — resolves via `Member.userId` (portal login)
- Created by staff (add member + optional `createPortalAccount`) or self-registration (not implemented)
- Session: `role = MEMBER`, `masjidId` from their member profile, `memberId` set
- Redirected to `/portal` by dashboard layout
- Portal pages: `/portal` (summary), `/portal/dues`, `/portal/receipts`, `/portal/profile`
- Can only see **own** dues, payments, receipts; owns `telegramChatId` for notifications

---

## 6. How Multiple Masjids Are Separated (Tenant Isolation)

**Three independent layers** (each sufficient alone), documented in `docs/architecture.md:5`:

1. **Session-derived tenant** — `user.masjidId` from `getCurrentUser()`; nothing in URL/form/cookie can change it
2. **Query scoping** — every Prisma query includes `masjidId: user.masjidId`; composite unique keys are `[masjidId, …]` (e.g. `(masjidId, memberNo)`, `(masjidId, receiptNo)`)
3. **Object-level checks** — before acting on any ID from request, actions do `findFirst({ where: { id, masjidId } })` and return "not found" if row belongs to another tenant

Test coverage: `tests/allocations.test.ts` proves cross-tenant isolation with a second masjid.

---

## 7. How Subscriptions Are Managed

**Currently NOT implemented** — infrastructure only.

- `Subscription` model exists (`prisma/schema.prisma:409-421`) with fields: `planCode`, `status` (`TRIAL`/`ACTIVE`/`SUSPENDED`/`CANCELLED`), `startsAt`, `endsAt?`, `billingReference?`
- `Masjid.status` (`ACTIVE`/`SUSPENDED`) is what actually gates access (`requireStaff()` checks this)
- No billing integration, no webhook handlers, no plan enforcement, no trial logic
- **Assumption:** Intended for future SaaS billing (Stripe/Paddle); currently all masjids are effectively "free"

---

## 8. How Collections, Payments, and Receipts Work

### Collections (Two Parallel Systems)
| System | Model | Use Case |
|--------|-------|----------|
| **Plan-based (DuesPeriod)** | `ContributionPlan` → `DuesPeriod` | Recurring member commitments (monthly chanda) |
| **Event-based (CollectionEvent)** | `ContributionCategory` → `CollectionEvent` → `CollectionEventAssignment` | Category-level drives (Ramadan, construction fund) with household assignments |

Both feed into `PaymentAllocation` via `duesPeriodId` or `collectionEventId`.

### Payment Flow (`src/modules/payments/actions.ts:createPaymentAction`)
1. **Auth**: `requireStaff()` + `assertCan("payment:create")`
2. **Validate**: Zod `paymentSchema` (amount, mode, allocations)
3. **Cross-tenant checks**: member, categories, dues periods, collection events all belong to `user.masjidId`
4. **Idempotency**: lookup `(masjidId, idempotencyKey)` — return existing if duplicate
5. **Receipt number**: `nextReceiptNumber()` (transactional `ReceiptSequence` read-modify-write)
6. **Transaction** (atomic):
   - Create `Payment` (`status: SUCCESS`)
   - Create `PaymentAllocation` rows (unallocated remainder → first category)
   - Recompute `DuesPeriod.status`, `CollectionEventAssignment.status`, `CollectionEvent.status`
   - Create `ReceiptEvent` (`ISSUED`)
   - `writeAudit()` — append-only
7. **Revalidate** affected paths (`/dashboard`, `/transactions`, `/members`)

### Receipts
- **HTML** (`/receipts/[id]/page.tsx`): `loadReceipt()` with ownership check (member sees only own)
- **PDF** (`/api/receipts/[id]/pdf/route.ts`): `renderReceiptPdf()` using `pdf-lib` + embedded NotoSans (₹ sign)
- **Reprint**: `recordReprintAction()` logs `ReceiptEvent` (`REPRINTED`) + audit
- **Reverse**: `reversePaymentAction()` — marks `Payment.status = REVERSED`, creates `Reversal`, logs `ReceiptEvent` (`CANCELLED`), recomputes all statuses, audit

---

## 9. Major Modules: Complete / Partial / Missing

| Module | Status | Evidence |
|--------|--------|----------|
| **Authentication** | ✅ Complete | JWT, roles, session re-validation, brute-force throttle |
| **Tenant Isolation** | ✅ Complete | 3-layer, tested |
| **Masjid CRUD (Platform)** | ✅ Complete | create/update/suspend/delete + default categories |
| **Staff Management** | ✅ Complete | Invite, role assign, deactivate (`src/modules/settings/actions.ts`) |
| **Member CRUD** | ✅ Complete | Create (with optional portal account), edit, detail, search |
| **Contribution Categories** | ✅ Complete | CRUD + scheduling fields (frequency, collectionMode, defaultAmount) |
| **Collection Events** | ✅ Complete | CRUD, auto-generate from category rules, assign households |
| **Contribution Plans** | ✅ Complete | Create, amount change (with history), dues generation (idempotent) |
| **Dues Periods** | ✅ Complete | Auto-generated, status derived from allocations |
| **Payments (Receive)** | ✅ Complete | Multi-allocation, idempotent, receipt numbering, reversal, reprint |
| **Walk-in Donations** | ✅ Complete | `walkInName` instead of memberId |
| **Expense Management** | ✅ Complete | Categories, entry, approve/reject, only approved in reports |
| **Reports** | ✅ Complete | Category totals, member ledger, event totals, monthly trend, outstanding dues |
| **Receipts (HTML + PDF)** | ✅ Complete | A4, Unicode font, masjid branding, status flags (CANCELLED, DUPLICATE) |
| **Audit Log** | ✅ Complete | Append-only, written in same transaction, viewer with filters |
| **Member Portal** | ✅ Complete | Dashboard, dues list, receipts, profile, Telegram prefs |
| **Telegram Notifications** | ⚠️ Partial | Bot token in env, member opt-in, link via `/start` — **no outbound sender implemented** (only `getMe` check in settings) |
| **Email/WhatsApp** | ❌ Missing | Env placeholders only, no code |
| **Cash Sessions** | ❌ Missing | Model exists, **no UI, no actions** |
| **Subscription Billing** | ❌ Missing | Model exists, **no logic, no webhooks, no enforcement** |
| **File Uploads** | ❌ Missing | `Expense.attachmentUrl`, `Masjid.logoUrl` — no upload pipeline |
| **Self-registration** | ❌ Missing | Member portal account only created by staff |
| **Dashboard Charts** | ⚠️ Partial | Collection trend only; no expense trend, no category breakdown chart |

---

## 10. Most Important Areas Requiring Deeper Investigation

| Area | Why It Matters | Files to Review |
|------|----------------|-----------------|
| **Telegram outbound notifications** | Configured but no sending logic; members opt-in but nothing fires on payment/dues | `src/modules/settings/actions.ts` (check only), `src/modules/portal/actions.ts`, missing `sendNotification` module |
| **Subscription enforcement** | `Subscription` model + `Masjid.status` exist but no billing integration; suspended masjids are read-only but no automated suspension | `prisma/schema.prisma:409`, `src/lib/auth.ts:177`, `src/modules/platform/actions.ts` |
| **Cash Session reconciliation** | Model fully defined (`CashSession`), but no UI to open/close, no integration with payments by collector | `prisma/schema.prisma:374-389`, missing actions in `src/modules/collections/` or new module |
| **Dues generation edge cases** | `generateDuesAction` uses `monthPeriod`/`addMonths` on IST boundaries — verify year-end, leap-year, grace-day logic | `src/modules/plans/actions.ts`, `src/lib/dates.ts`, `tests/dates-dues.test.ts` |
| **Payment allocation remainder logic** | Unallocated balance forced into first category — verify reports reconcile correctly for mixed-category payments | `src/modules/payments/actions.ts:134-146`, `src/modules/reports/queries.ts:120` |
| **CollectionEvent vs DuesPeriod dual system** | Two parallel collection models; ensure reports (`categoryTotals`, `eventTotals`) don't double-count | `src/modules/reports/queries.ts:145-180`, `src/modules/collections/actions.ts:290` |
| **Idempotency key lifecycle** | Client must generate; server accepts on retry — verify no race conditions under load | `src/modules/payments/actions.ts:114-120`, `src/app/api/payments/create/route.ts` |
| **Role matrix completeness** | `PERMISSION` list vs actual `assertCan()` calls — audit for missing checks | `src/lib/permissions.ts:3-19`, grep `assertCan` across `src/modules/**/actions.ts` |
| **Audit log coverage** | Verify every write action calls `writeAudit()` with before/after | `src/modules/audit/write.ts`, grep `writeAudit` |
| **PDF font fallback** | Embedded NotoSans; if missing, falls back to Helvetica (loses ₹) — test deployment environments | `src/modules/receipts/pdf.ts:16-25`, `assets/fonts/NotoSans.ttf` |

---

## Verified Facts vs Assumptions

| Statement | Status | Source |
|-----------|--------|--------|
| All queries scoped by `masjidId` from session | ✅ Verified | `docs/architecture.md:145-153`, all action files |
| Passwords bcrypt cost 12 | ✅ Verified | `src/lib/auth.ts:22`, `src/modules/auth/actions.ts:59` |
| Receipt numbers unique per masjid per FY | ✅ Verified | `prisma/schema.prisma:268, 319`, `src/lib/receipts/numbering.ts` |
| Money stored as integer paise | ✅ Verified | `prisma/schema.prisma` (all `amountPaise` are `Int`), `src/lib/money.ts` |
| Member portal only reads own data | ✅ Verified | `src/modules/portal/queries.ts:11-20`, `src/modules/receipts/load.ts:35-37` |
| Telegram notifications actually send | ❌ **Assumption — NOT implemented** | Only `getMe` bot check in settings/profile; no `sendMessage` call found |
| Subscription billing works | ❌ **Assumption — model only** | `Subscription` model exists but no actions, webhooks, or enforcement |
| Cash sessions functional | ❌ **Assumption — model only** | `CashSession` model exists, no actions or UI |
| Email/WhatsApp channels work | ❌ **Assumption — env placeholders only** | `.env.example` has vars, no code references |

---

## Key Files for Future Work

| Task | Start Here |
|------|------------|
| Add outbound Telegram | Create `src/modules/notifications/send.ts`, call from `createPaymentAction`, `recomputePeriodStatus`, portal preferences |
| Implement subscription billing | Add Stripe/Paddle webhook route, `Subscription` status sync, `requireStaff` check for `ACTIVE` subscription |
| Wire Cash Sessions | Add `openCashSessionAction`, `closeCashSessionAction` in `collections/actions.ts`, UI in `/collections/new` |
| Member self-registration | Add public `/register` page, create `Member` + `User` + `MasjidUser`? (MEMBER role has no membership) |
| Expense attachments | Add `/api/upload` route, Vercel Blob or local storage, update `Expense.attachmentUrl` |

---

*Generated by inspecting source code only. No migrations run, no data modified.*