# Implementation plan and status

Source: `Masjid_Collection_Management_Blueprint_Updated.docx` §15, §22 and §23,
with the user's confirmed scope from §21.

Status legend: **Done** = implemented and verified (test or scripted runtime
check). **Partial** = implemented with a documented gap. **Not started** = no
code.

---

## Phase 0 — Repository and decisions

| Item | Status | Evidence |
|---|---|---|
| Inspect the repository before building | Done | existing Next.js scaffold reused; no working code overwritten |
| Record confirmed requirements | Done | `docs/requirements.md` §5 |
| Local-only deployment decision (user) | Done | no Vercel config, no cloud services, SQLite file |
| Document the stack and risks | Done | `docs/architecture.md` §14 |

---

## Phase 1 — Foundation, tenants, authentication, authorization

| Item | Status | Evidence |
|---|---|---|
| App shell, design system, responsive layout | Done | `(dashboard)/layout.tsx`, `components/ui.tsx`, mobile bottom nav |
| Prisma schema + versioned migration | Done | `prisma/migrations/20261019092355_init` |
| Masjid tenant model with settings | Done | `Masjid`, `/settings` |
| Staff membership and roles | Done | `MasjidUser`, `/staff` |
| Login / logout, bcrypt, JWT session | Done | `modules/auth/actions.ts`, `lib/auth.ts` |
| Server-side permission matrix | Done | `lib/permissions.ts`, `assertCan` in every action |
| DB-revalidated session (no stale roles) | Done | `getCurrentUser()` |
| Tenant isolation tests | Done | `tests/allocations.test.ts` → "scopes every tenant query by masjidId" |
| Subscription status gate (read-only when suspended) | Done | `requireStaff`, payment action, banner |
| Seed: Masjid, admin, default categories | Done | `prisma/seed.ts` |

---

## Phase 2 — Multilingual design system

| Item | Status | Evidence |
|---|---|---|
| Hindi, English, Urdu dictionaries | Done | `src/i18n/{en,hi,ur}.ts` |
| Typed keys (missing key = compile error) | Done | `Dictionary = typeof en` |
| Locale cookie + server-side selection | Done | `i18n/index.ts`, `masjid_locale` |
| Urdu RTL (`<html dir="rtl">`) | Done | `app/layout.tsx`, `LOCALE_DIR` |
| Fonts: Devanagari + Naskh Arabic | Done | `next/font` in `app/layout.tsx` |
| Logical CSS properties for mirroring | Done | `ms/me/start/end/text-start/text-end` throughout |
| Language switcher in both shells | Done | `components/layout/locale-switcher.tsx` |

---

## Phase 3 — Members and member portal

| Item | Status | Evidence |
|---|---|---|
| Member CRUD + search + status | Done | `modules/members/actions.ts`, `/members` |
| Unique member numbers per Masjid | Done | `nextMemberNumber` + unique constraint |
| Member profile: plans, dues, timeline, totals | Done | `/members/[id]` |
| Optional portal account creation | Done | `memberSchema`, `Member.userId` |
| Member portal (overview, dues, receipts, profile) | Done | `(portal)/portal/*` |
| Server-side ownership on every portal read | Done | `requirePortalMember`, `loadReceipt` |
| Receipt route usable by members | Done | `/receipts/[id]` moved out of the staff-only layout |
| Portal redirects (staff ↔ member) | Done | both layouts, `/`, login action |

---

## Phase 4 — Plans and dues

| Item | Status | Evidence |
|---|---|---|
| Monthly / semi-annual / annual / one-time schedules | Done | `lib/dues.ts` `buildPeriods` |
| Idempotent period generation | Done | unique `(planId, periodStart, periodEnd)` |
| IST calendar month arithmetic (no drift) | Done | `lib/dates.ts` `addMonths`, `monthPeriod` |
| Period status derived from SUCCESS allocations | Done | `recomputePeriodStatus` |
| WAIVED preserved | Done | same + test |
| Partial, advance and multi-period allocation | Done | payment allocations + test |
| Plan amount history with effective date | Done | `PlanAmountHistory`, `changePlanAmountAction` |
| Historical periods never rewritten | Done | update limited to PENDING periods on/after effective date |
| Tests: boundaries, leap/month-end, status | Done | `tests/dates-dues.test.ts` (9), `tests/allocations.test.ts` (7) |

---

## Phase 5 — Cash/UPI collection and receipts

| Item | Status | Evidence |
|---|---|---|
| Collection form (member or walk-in, split allocations) | Done | `/collections/new` |
| Cash / UPI / bank transfer / other + reference | Done | `paymentSchema`, form |
| Manual vs verified state shown honestly | Done | `verificationStatus`, badges, receipt |
| Atomic payment + allocations + numbering | Done | `createPaymentAction` transaction |
| Idempotency on resubmit | Done | unique key + lookup-first |
| Unique per-Masjid per-FY receipt numbers | Done | `lib/receipts/numbering.ts` + tests |
| Receipt screen, print, PDF, WhatsApp share | Done | `/receipts/[id]`, `receipt-sheet.tsx`, `modules/receipts/pdf.ts` |
| Reprint opens a marked copy, not the original | Done | `?duplicate=1&print=1` view + `AutoPrint`; the recorded reprint and the paper agree |
| Reprint keeps number, marked DUPLICATE COPY | Done | `duplicate` flag, `recordReprintAction` |
| Receipt events (ISSUED/REPRINTED/CANCELLED) | Done | `ReceiptEvent` |
| ₹ renders in PDF | Done | embedded `assets/fonts/NotoSans.ttf`, `@pdf-lib/fontkit` registered |

---

## Phase 6 — Expenses, reconciliation, audit

| Item | Status | Evidence |
|---|---|---|
| Expense entry with category/payee/mode/reference | Done | `/expenses` |
| Approval workflow (collector → pending) | Done | `approveExpenseAction`, `expense:approve` |
| Per-FY expense numbers | Done | `nextExpenseNumber` + test |
| Reversal workflow with mandatory reason | Done | `reversePaymentAction` |
| Append-only audit log | Done | `modules/audit/write.ts`, `/audit` |
| Audit coverage of financial events and exports | Done | actions list in `docs/requirements.md` §3.11 |
| Cash session / reconciliation UI | **Not started** | table exists; no screen. Out of the confirmed first-release scope |

---

## Phase 7 — Reports and exports

| Item | Status | Evidence |
|---|---|---|
| Dashboard (today/month/year, dues, expenses, balance, trend) | Done | `/dashboard`, `monthlyTrend` |
| Collection summary with gross/reversals/net | Done | `collectionSummary` |
| Category / mode / collector totals | Done | `reports/queries.ts`, `/reports` |
| Due list with per-period outstanding | Done | `pendingDueRows` |
| Income vs expenses, net movement | Done | `/reports?report=expense` |
| Date-range filters and presets | Done | `ranges()`, from/to |
| CSV export (BOM, quoted, audit-logged) | Done | `/api/exports/transactions` |
| PDF report export | **Partial** | receipts are PDF; report PDFs are not generated — CSV is the export |
| Subscription management UI | **Not started** | table + status gate only; not in first-release scope |

---

## Phase 8 — QA and hardening

| Item | Status | Evidence |
|---|---|---|
| Lint | Done | `npm run lint` — 0 errors, 0 warnings |
| Typecheck | Done | `npm run typecheck` — clean |
| Unit tests | Done | `tests/money.test.ts` (5), `tests/dates-dues.test.ts` (9) |
| DB integration tests | Done | `tests/numbering.test.ts` (4), `tests/allocations.test.ts` (7) |
| Receipt PDF content tests | Done | `tests/receipt-pdf.test.ts` (7) — decodes the subset font's ToUnicode CMap and asserts the visible text |
| Production build | Done | `npm run build` — all routes dynamic, exit 0 |
| Runtime smoke of every staff route | Done | signed-cookie fetch; all 200 (redirects as expected) |
| Member-portal walkthrough | Done | seeded member account; portal pages 200, own receipt 200, **another member's receipt 404**, own PDF 200 |
| Reprint/duplicate runtime check | Done | plain view: 0 watermarks; `?duplicate=1` view: watermark + badge present, receipt number unchanged |
| File-route authorization matrix | Done | anon → 307 login, member CSV → 403, staff CSV → 200, member's own PDF → 200, another member's PDF → 404 |
| Urdu RTL visual check | **Manual** | direction/fonts wired; a native reader should confirm shaping on device |
| Mobile viewport check | **Manual** | responsive classes in place; verify on the target Android phone |
| Backup/restore test | **Manual** | `npm run backup`, then copy back and start (procedure in README) |
| Playwright end-to-end suite | **Not started** | no e2e harness; covered by scripted smoke + manual flow |

---

## Verification commands

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Latest results: lint clean, typecheck clean, `Test Files 5 passed (5) /
Tests 32 passed (32)`, build exit 0.

---

## Defects found and fixed during verification

Both were found by exercising the app end to end rather than by reading it, and
both now have a regression test or a runtime check.

1. **Receipt PDF returned HTTP 500 for every download.** `pdf-lib` refuses to
   embed a custom font unless a `fontkit` instance is registered, and
   `@pdf-lib/fontkit` was not even a dependency, so embedding NotoSans threw.
   Fixed by installing `@pdf-lib/fontkit` and calling
   `doc.registerFontkit(fontkit)` in `renderReceiptPdf`.
   `tests/receipt-pdf.test.ts` fails if the registration is removed (verified by
   reverting it: 7 failed).
2. **A reprint printed an unmarked original.** The Reprint button recorded the
   REPRINTED event but then printed the same sheet as the first issue, so the
   paper copies were indistinguishable — contrary to the blueprint, which
   requires reprints to be marked. Reprint now opens
   `/receipts/<id>?duplicate=1&print=1`, which renders the DUPLICATE COPY
   watermark and badge and auto-opens the print dialog; the PDF from that view
   is named `…-duplicate.pdf` and carries the same mark.
3. **File routes answered 500 instead of denying.** `/api/receipts/[id]/pdf` and
   `/api/exports/transactions` let `requireUser()` / `assertCan()` throw, so a
   signed-out visitor and a member requesting a CSV both received a generic
   server error. They now use `authorizeFileRequest()`: **307 → /login** when
   signed out, **403** when the role lacks the permission. Members can still
   download their **own** receipt PDF (200); another member's receipt is 404.

---

## Decisions and assumptions

1. **SQLite instead of PostgreSQL.** The blueprint recommends PostgreSQL for a
   managed SaaS. The user's explicit requirement is a local-only server with no
   cloud provisioning; a single SQLite file is the correct fit and makes backup
   a file copy. The schema keeps `masjidId` on every tenant row so a later move
   to PostgreSQL is a migration, not a redesign.
2. **Integer paise instead of `Decimal`.** Prisma's SQLite connector has no
   `Decimal`; using it would store REAL (a float), violating the blueprint. See
   `docs/data-model.md`.
3. **JWT cookie instead of a hosted auth provider.** A local deployment must not
   depend on an external identity service. The session is revalidated from the
   database on every request.
4. **Cash sessions deferred.** The blueprint lists reconciliation as a phase-5
   item; the confirmed first-release scope (§21) does not require it. The table
   is in place so it can be added without a migration.
5. **Report PDFs deferred.** CSV export covers the accounting need; receipt PDFs
   are the legally important document and are implemented.
6. **No automatic UPI verification.** Explicitly out of scope; the UI never
   claims it.

---

## Remaining work (in priority order)

1. Cash session / daily reconciliation screen.
2. Report PDF export with Masjid header, range and generated-by metadata.
3. Password reset flow and an admin "reset password" action.
4. Playwright e2e for the payment → receipt → reprint → reversal → report path.
5. Logo upload stored under `public/` (local file only).
6. WhatsApp provider integration (only if explicitly configured and tested).
