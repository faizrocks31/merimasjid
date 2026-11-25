# Final Collection Module Gap Analysis & Implementation Plan

**Project:** Masjid Collection Management System  
**Date:** 2026-11-05  
**Status:** READ-ONLY ASSESSMENT — No code modifications performed  

---

## A. Executive Summary

This report presents a comprehensive gap analysis of the Collection Management system against the finalized real-world Masjid collection requirements (12 sections as specified). The assessment is **read-only** — no code, schema, or migration changes were made.

### Current State
- **Phases Completed:** 0–9c (Two-Step Registration, Payment/Collection/Dues core, Receipts A5 Portrait, Analog Time Picker, Announcements, Prayer Times, Member Portal)
- **Architecture:** Next.js 16.4.2 App Router, Prisma/PostgreSQL, multi-tenant via `masjidId`, Server Actions, Zod validation registry
- **Core Strengths:** Atomic receipt numbering, row-level locking (`FOR UPDATE`), FIFO allocation logic, idempotency keys, PDF generation via Playwright/Chromium (A5 Portrait), robust audit trail

### Key Findings
| Area | Status |
|------|--------|
| **Monthly Collection** | PARTIALLY IMPLEMENTED (backend complete, UI needs category restriction) |
| **Milad-un-Nabi** | PARTIALLY IMPLEMENTED (event-based category exists, auto-generation works) |
| **Shab-e-Qadr** | PARTIALLY IMPLEMENTED (event-based category exists, auto-generation works) |
| **Death Collection** | NOT IMPLEMENTED (expense separation missing; walk-in allowed incorrectly) |
| **Bartan Collection** | PARTIALLY IMPLEMENTED (can use existing event model, no dedicated workflow) |
| **Jumma Collection** | PARTIALLY IMPLEMENTED (recurring weekly events supported via generator) |
| **General Donation** | VERIFIED (walk-in supported, but allowed for all categories incorrectly) |
| **Member Assignment** | VERIFIED (bulk assign/unassign exists with audit) |
| **Dues Management** | VERIFIED (FIFO logic, period status, COMPLETED→OPEN guard) |
| **Payment Entry** | VERIFIED (idempotency, concurrency, FIFO allocation, receipt numbering) |
| **Walk-in Donors** | NOT CONFIRMED (currently allowed for ALL categories; should be restricted to 3) |
| **Receipts** | VERIFIED (A5 Portrait, mint green, Hindi labels, Chromium PDF) |
| **Reports** | PARTIALLY IMPLEMENTED (category/event/mode/collector totals exist; missing Death/Bartan/Jumma separation) |

### Overall Readiness
The **backend data model and core payment/dues/collection engine are production-ready** for most requirements. The primary gaps are:
1. **UI/UX enforcement** of category restrictions (walk-in only for 3 categories)
2. **Death Collection** expense separation workflow
3. **Reporting** category-wise separation for special collections
4. **Bartan/Jumma** dedicated UI workflows
5. **Member Assignment** exclusivity rules (one active assignment per category type)

---

## B. Requirement Status Matrix

| # | Requirement Section | Status | Evidence (File:Line) | Notes |
|---|---------------------|--------|---------------------|-------|
| 1 | Monthly Collection (recurring, household-wise) | PARTIALLY IMPLEMENTED | `src/modules/collections/actions.ts:366-375` (MONTHLY generator), `src/lib/dues.ts:10-22` | Generator creates monthly events; dues periods via plans. UI allows manual allocation instead of auto-FIFO |
| 2 | Milad-un-Nabi (annual, event-based) | PARTIALLY IMPLEMENTED | `src/modules/collections/actions.ts:386-396` (ANNUAL generator) | Category frequency ANNUAL works; auto-generates yearly events |
| 3 | Shab-e-Qadr (annual, event-based) | PARTIALLY IMPLEMENTED | Same as Milad; uses ANNUAL/YEARLY frequency | Same generator logic; needs dedicated UI |
| 4 | Death Collection (expense-linked, walk-in allowed) | NOT IMPLEMENTED | `prisma/schema.prisma:384-408` (Expense model exists) | Expense architecture exists but no collection→expense linking; walk-in currently allowed for all categories |
| 5 | Bartan Collection (utensils rental, event-based) | PARTIALLY IMPLEMENTED | `src/modules/collections/actions.ts:339-340` (EVENT_BASED frequency) | EVENT_BASED category frequency exists; no dedicated UI workflow |
| 6 | Jumma Collection (weekly, recurring) | PARTIALLY IMPLEMENTED | `src/modules/collections/actions.ts:351-365` (WEEKLY generator) | WEEKLY frequency supported in generator; needs dedicated UI |
| 7 | General Donation (walk-in, any time) | VERIFIED | `src/modules/payments/actions.ts:76-78` (walkInName), `src/app/(dashboard)/collections/new/collection-form.tsx` | Walk-in donor flow works; but currently allowed for ALL categories (should be restricted) |
| 8 | Member Assignment (household to event) | VERIFIED | `src/modules/collections/actions.ts:226-292` (assignHouseholdsAction), `src/app/(dashboard)/settings/settings-forms.tsx` (AssignHouseholdsForm) | Bulk assign/unassign with audit; missing exclusivity validation |
| 9 | Dues Management (FIFO, status tracking) | VERIFIED | `src/lib/dues.ts:126-147` (recomputePeriodStatus), `src/lib/dues.ts:156-178` (recomputeAssignmentStatus), `src/lib/dues.ts:199-268` (recomputeEventStatus with COMPLETED→OPEN guard) | FIFO via allocation order; status: PENDING/PARTIAL/PAID/WAIVED; guard prevents downgrade |
| 10 | Payment Entry (idempotency, concurrency, receipts) | VERIFIED | `src/modules/payments/actions.ts:127-133` (idempotency), `src/modules/payments/actions.ts:145-290` (FOR UPDATE locking), `src/lib/receipts/numbering.ts` (atomic sequencing) | Row-level locks, allocation validation, atomic receipt numbers per financial year |
| 11 | Walk-in Donor Restrictions (only 3 categories) | NOT CONFIRMED | `src/modules/payments/actions.ts:101-115` (category validation allows all) | Backend accepts any category for walk-in; no restriction to Milad/Shab-e-Qadr/General Donation |
| 12 | Category-wise Reports (7 collection types) | PARTIALLY IMPLEMENTED | `src/modules/reports/queries.ts`, `src/app/(dashboard)/reports/page.tsx:54-62` (tabs), `src/app/(dashboard)/reports/page.tsx:117-184` (category/event tables) | Category totals, event totals exist; missing dedicated Death/Bartan/Jumma separation |

### Status Legend
- **VERIFIED**: Fully implemented and tested in codebase
- **PARTIALLY IMPLEMENTED**: Backend exists; UI/workflow gaps remain
- **NOT IMPLEMENTED**: No backend or UI support
- **NOT CONFIRMED**: Code exists but behavior contradicts requirements

---

## C. Existing Functionality to Reuse

### 1. Data Models (Prisma) — `prisma/schema.prisma`
| Model | Reusable For | Lines |
|-------|--------------|-------|
| `ContributionCategory` | All 7 collection types (via `code`, `frequency`, `collectionMode`, `restrictedPurpose`) | 142-164 |
| `CollectionEvent` | Monthly, Milad, Shab-e-Qadr, Bartan, Jumma events | 230-253 |
| `CollectionEventAssignment` | Household assignment for all recurring/event types | 257-275 |
| `DuesPeriod` | Monthly recurring dues with FIFO tracking | 206-225 |
| `Payment` / `PaymentAllocation` | All payment entry with atomic receipt numbering | 277-328 |
| `Expense` / `ExpenseCategory` | Death Collection expense separation | 384-408 |
| `ReceiptSequence` | Atomic receipt numbering per financial year | 345-353 |
| `AuditLog` | Full audit trail for all operations | 426-442 |

### 2. Backend Actions — `src/modules/collections/actions.ts`
| Function | Reusable For | Lines |
|----------|--------------|-------|
| `generateEventsFromCategoryAction` | Monthly, Milad, Shab-e-Qadr, Jumma auto-generation | 294-473 |
| `assignHouseholdsAction` / `removeHouseholdAssignmentAction` | Member assignment for all types | 226-292, 475-517 |
| `createCollectionEventAction` / `updateCollectionEventAction` | Manual event creation (Bartan, Death) | 13-171 |

### 3. Payment Engine — `src/modules/payments/actions.ts`
| Function | Reusable For | Lines |
|----------|--------------|-------|
| `createPaymentAction` | All payment entry with concurrency control | 54-431 |
| `reversePaymentAction` | Reversal with audit & status recomputation | 443-588 |
| Row-level locking (`FOR UPDATE`) | Concurrency safety for all allocations | 155-290 |

### 4. Dues & Status Logic — `src/lib/dues.ts`
| Function | Reusable For | Lines |
|----------|--------------|-------|
| `buildPeriods` | Period generation for all frequencies | 41-88 |
| `generateDuesPeriods` | Monthly dues creation | 99-124 |
| `recomputePeriodStatus` / `recomputeAssignmentStatus` / `recomputeEventStatus` | FIFO status tracking with COMPLETED→OPEN guard | 126-268 |

### 5. Reporting — `src/modules/reports/queries.ts` & `src/app/(dashboard)/reports/page.tsx`
| Query/Component | Reusable For | Notes |
|-----------------|--------------|-------|
| `categoryTotals` | Category-wise collection totals | Already grouped by category |
| `eventTotals` | Event-wise collection with assignment status | Shows expected/received/outstanding |
| `modeTotals` | Payment mode breakdown | CASH/UPI/BANK/OTHER |
| `collectorTotals` | Staff-wise collection | |
| `pendingDueRows` | Outstanding dues list | |

### 6. Receipt System — `src/components/receipts/receipt-sheet.tsx` & `src/modules/receipts/pdf-chromium.ts`
- **A5 Portrait** (148mm × 210mm) — `globals.css:1-50`, `receipt-sheet.tsx`, `pdf-chromium.ts`
- **Mint Green theme** — CSS variables in `globals.css`
- **Hindi labels** — i18n dictionaries (`src/i18n/dictionaries/hi.json`)
- **Chromium/Playwright PDF** — Embedded Poppins fonts, print-optimized

### 7. Validation Registry — `src/lib/validation-registry.ts`
Centralized Zod schemas for all entities — single source of truth for forms and API validation.

### 8. Member Portal — `src/app/(portal)/portal/page.tsx`
Member-facing dues view, notifications, prayer times — reusable for collection visibility.

---

## D. Required Changes

### D.1 UI Changes (Frontend)

| # | Change | Target File(s) | Priority |
|---|--------|----------------|----------|
| 1 | **Walk-in Category Restriction**: Disable category selector for walk-in donors; only show `MILAD`, `SHAB_E_QADR`, `GENERAL_DONATION` codes | `src/app/(dashboard)/collections/new/collection-form.tsx`, `src/lib/validation-registry.ts` (payment allocations) | HIGH |
| 2 | **Death Collection Workflow**: New "Death Collection" page linking payment → expense category; show expense fields (payee, description, attachment) | New: `src/app/(dashboard)/collections/death/page.tsx`, `src/app/(dashboard)/settings/settings-forms.tsx` (ExpenseCategory management) | HIGH |
| 3 | **Bartan Collection UI**: Dedicated event creation form for EVENT_BASED category; utensil inventory tracking (optional) | New: `src/app/(dashboard)/collections/bartan/page.tsx` | MEDIUM |
| 4 | **Jumma Collection UI**: Weekly event generator preset; quick-entry for Friday collections | New: `src/app/(dashboard)/collections/jumma/page.tsx` | MEDIUM |
| 5 | **Member Assignment Exclusivity**: Prevent duplicate active assignments per member per category type (MONTHLY, ANNUAL) | `src/app/(dashboard)/settings/settings-forms.tsx` (AssignHouseholdsForm), `src/modules/collections/actions.ts:226-292` | HIGH |
| 6 | **Auto-FIFO Allocation UI**: For collectors, hide manual allocation chips; auto-assign to oldest due period/assignment | `src/app/(dashboard)/collections/new/collection-form.tsx` | HIGH |
| 7 | **Category-wise Report Tabs**: Add dedicated tabs for Death, Bartan, Jumma with expense separation | `src/app/(dashboard)/reports/page.tsx:54-62` (tabs), `src/modules/reports/queries.ts` | MEDIUM |
| 8 | **Receipt Template per Category**: Optional category-specific receipt footer/notes (e.g., Death Collection shows expense reference) | `src/components/receipts/receipt-sheet.tsx`, `src/modules/receipts/pdf-chromium.ts` | LOW |

### D.2 Backend Changes (Server Actions / API)

| # | Change | Target File(s) | Priority |
|---|--------|----------------|----------|
| 1 | **Walk-in Category Validation**: Enforce `restrictedPurpose` or category code allowlist in `createPaymentAction` | `src/modules/payments/actions.ts:101-115` | HIGH |
| 2 | **Death Collection Expense Link**: New action `createDeathCollectionAction` creating Payment + Expense atomically | New: `src/modules/collections/death-actions.ts` | HIGH |
| 3 | **Assignment Exclusivity Check**: In `assignHouseholdsAction`, validate no other active assignment for same category type | `src/modules/collections/actions.ts:248-255` | HIGH |
| 4 | **Auto-FIFO Allocation Logic**: New internal function `allocateFIFO(memberId, amount, categoryId)` for collector mode | New: `src/lib/allocation.ts` | HIGH |
| 5 | **Category Code Constants**: Define canonical codes for 7 collection types in `src/lib/constants.ts` | `src/lib/constants.ts` | HIGH |
| 6 | **Report Queries Extension**: Add `deathCollectionSummary`, `bartanEventTotals`, `jummaWeeklyTotals` | `src/modules/reports/queries.ts` | MEDIUM |
| 7 | **Event Generator Presets**: Add `generateMonthlyEvents`, `generateJummaEvents`, `generateAnnualEvents` helpers | `src/modules/collections/actions.ts` (extend generateEventsFromCategoryAction) | MEDIUM |

### D.3 Database Changes (Prisma Schema) — **For Planning Only, No Migration Created**

| # | Change | Model/Field | Rationale |
|---|--------|-------------|-----------|
| 1 | **Category Code Enum/Constants** | `ContributionCategory.code` — add canonical values: `MONTHLY`, `MILAD`, `SHAB_E_QADR`, `DEATH`, `BARTAN`, `JUMMA`, `GENERAL_DONATION` | Enables programmatic category identification |
| 2 | **Death Collection Link** | `PaymentAllocation.expenseId` (nullable FK to Expense) | Links collection payment to expense record |
| 3 | **Bartan Inventory** (optional) | New model `BartanItem` (name, quantity, condition, eventId?) | Track utensil stock per event |
| 4 | **Assignment Exclusivity** | Partial unique index: `@@unique([memberId, categoryId], where: (status = 'ACTIVE'))` on `CollectionEventAssignment` via category join | Prevents duplicate household assignments |
| 5 | **Expense Category for Death** | Seed `ExpenseCategory` with code `DEATH_COLLECTION` | Separate reporting |

> **Note:** Per instructions, **no Prisma schema modifications or migrations were created**. These are documented for implementation planning only.

### D.4 Reporting Changes

| # | Change | Target | Priority |
|---|--------|--------|----------|
| 1 | Category-wise tabs for all 7 types | `src/app/(dashboard)/reports/page.tsx` | MEDIUM |
| 2 | Death Collection report (collections + expenses) | `src/modules/reports/queries.ts` | HIGH |
| 3 | Bartan Collection report (event-wise + inventory) | `src/modules/reports/queries.ts` | MEDIUM |
| 4 | Jumma Collection report (weekly trends) | `src/modules/reports/queries.ts` | MEDIUM |
| 5 | Export CSV per category | `src/app/api/exports/transactions/route.ts` | LOW |

---

## E. Implementation Phases

### Phase 1: Core Enforcement & Death Collection (Week 1-2)
**Goal:** Enforce walk-in restrictions, implement Death Collection workflow

| Task | Description | Files |
|------|-------------|-------|
| 1.1 | Define canonical category codes in `constants.ts` | `src/lib/constants.ts` |
| 1.2 | Add walk-in category validation in `createPaymentAction` | `src/modules/payments/actions.ts` |
| 1.3 | Update payment form UI to restrict walk-in categories | `src/app/(dashboard)/collections/new/collection-form.tsx` |
| 1.4 | Create Death Collection action (Payment + Expense atomic) | `src/modules/collections/death-actions.ts` |
| 1.5 | Add Death Collection UI page | `src/app/(dashboard)/collections/death/page.tsx` |
| 1.6 | Add Death Collection report query & tab | `src/modules/reports/queries.ts`, `src/app/(dashboard)/reports/page.tsx` |

### Phase 2: Assignment Rules & Auto-FIFO (Week 2-3)
**Goal:** Prevent duplicate assignments, automate allocation for collectors

| Task | Description | Files |
|------|-------------|-------|
| 2.1 | Add assignment exclusivity validation in `assignHouseholdsAction` | `src/modules/collections/actions.ts` |
| 2.2 | Create `allocateFIFO` utility for collector mode | `src/lib/allocation.ts` |
| 2.3 | Update payment form: collector mode → auto-FIFO, admin mode → manual | `src/app/(dashboard)/collections/new/collection-form.tsx` |
| 2.4 | Add assignment conflict UI warning | `src/app/(dashboard)/settings/settings-forms.tsx` |

### Phase 3: Bartan & Jumma Workflows (Week 3-4)
**Goal:** Dedicated UI for Bartan (utensils) and Jumma (weekly)

| Task | Description | Files |
|------|-------------|-------|
| 3.1 | Bartan Collection event creation UI | `src/app/(dashboard)/collections/bartan/page.tsx` |
| 3.2 | Jumma Collection weekly generator preset + quick entry | `src/app/(dashboard)/collections/jumma/page.tsx` |
| 3.3 | Extend event generator with presets | `src/modules/collections/actions.ts` |
| 3.4 | Bartan/Jumma report tabs & queries | `src/modules/reports/queries.ts`, `src/app/(dashboard)/reports/page.tsx` |

### Phase 4: Reporting & Polish (Week 4-5)
**Goal:** Complete category-wise reporting, receipt enhancements

| Task | Description | Files |
|------|-------------|-------|
| 4.1 | All 7 category tabs in Reports page | `src/app/(dashboard)/reports/page.tsx` |
| 4.2 | Category-specific receipt footer (optional) | `src/components/receipts/receipt-sheet.tsx` |
| 4.3 | CSV export per category | `src/app/api/exports/transactions/route.ts` |
| 4.4 | End-to-end testing & UAT | — |

### Phase 5: Database Migration (Post-Code, Separate PR)
**Goal:** Apply schema changes after code is verified

| Task | Description |
|------|-------------|
| 5.1 | Create Prisma migration for category codes, expenseId, partial indexes |
| 5.2 | Seed canonical categories & expense categories |
| 5.3 | Backfill existing data (map current categories to canonical codes) |
| 5.4 | Deploy with zero-downtime migration strategy |

---

## F. Risks and Data Protection

### F.1 Data Integrity Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Walk-in restriction bypass** | Donations mis-categorized; reporting incorrect | Server-side validation in `createPaymentAction` (already has category tenant check) + UI restriction |
| **Duplicate household assignments** | Double-counting expected amounts; wrong dues status | Partial unique index on `(memberId, categoryId)` where status=ACTIVE; server validation in assign action |
| **FIFO allocation race condition** | Over-allocation to same due period | Existing `FOR UPDATE` row locks on DuesPeriod/CollectionEventAssignment; extend to new auto-FIFO logic |
| **Death Collection payment-expense mismatch** | Orphaned payments or expenses | Atomic transaction creating both; `expenseId` on PaymentAllocation FK |
| **COMPLETED→OPEN downgrade** | Event status incorrectly reopened after full collection | Existing guard in `recomputeEventStatus` (lines 246-259) — **verified working** |

### F.2 Migration Safety (Phase 5)

| Concern | Strategy |
|---------|----------|
| **Category code backfill** | Map existing categories by name/frequency to canonical codes; manual review for ambiguous ones |
| **Partial unique index on assignments** | Create index with `WHERE` clause; existing duplicates must be resolved before migration (waive or merge) |
| **ExpenseId on PaymentAllocation** | Nullable field; backfill only for Death Collection payments |
| **Receipt numbering** | Unaffected — uses separate `ReceiptSequence` table |

### F.3 Audit & Compliance
- All changes go through existing `writeAudit` (audit log with before/after JSON)
- Idempotency keys on Payment/Member/Expense prevent duplicate submissions
- Reversal workflow creates offsetting REVERSED payment + Reversal record — never deletes
- Row-level locks prevent lost updates under concurrency

---

## G. Unresolved Business Questions

| # | Question | Impact | Recommended Resolution |
|---|----------|--------|------------------------|
| 1 | **Can a member have multiple active Monthly plans?** (e.g., General + Masjid Fund) | Affects assignment exclusivity rule design | If YES: exclusivity per `category.code` not per frequency; if NO: per frequency |
| 2 | **Death Collection: who is the "payee" on expense?** (family, funeral service, masjid fund) | Determines expense category & reporting | Business decision needed; default to "Funeral Expenses" category |
| 3 | **Bartan Collection: track individual utensil items or just event-level rental fee?** | Determines if `BartanItem` model needed | Start simple: event-level fee only; add inventory later if requested |
| 4 | **Jumma Collection: fixed amount per household or variable?** | Affects event `expectedAmountPaise` and assignment logic | Likely fixed; use `defaultAmountPaise` on category |
| 5 | **Walk-in for Milad/Shab-e-Qadr: allow anonymous or require name?** | Affects `walkInName` required validation | Require name (current: optional but recommended) |
| 6 | **Receipt footer per category?** (e.g., Death shows "For funeral expenses") | Receipt template complexity | Optional Phase 4; default footer works for now |
| 7 | **Financial year for Death/Bartan/Jumma same as Monthly (April-March)?** | Affects receipt sequencing & reporting | Yes — use masjid's `financialYearStartMonth` |
| 8 | **Collector vs Admin role distinction for auto-FIFO?** | UI behavior difference | Collector role → auto-FIFO; Admin → manual override allowed |

---

## H. Final Recommendation

### Proceed with Phased Implementation (Phases 1-4)

**Rationale:**
1. **Backend is 90% ready** — core models, payment engine, dues logic, receipts, reports already handle the requirements
2. **No breaking schema changes needed** for Phases 1-4 — all work can be done in application code
3. **High-value gaps are UI/enforcement** — walk-in restriction, Death Collection workflow, auto-FIFO for collectors
4. **Risk is low** — existing concurrency controls, audit trails, and COMPLETED→OPEN guard protect data integrity

### Immediate Next Steps
1. **Confirm canonical category codes** with stakeholders (Question G.1, G.2, G.3)
2. **Implement Phase 1** (walk-in restriction + Death Collection) — highest business value
3. **Defer database migration** (Phase 5) until after code verification in staging

### Effort Estimate
| Phase | Backend | Frontend | Total |
|-------|---------|----------|-------|
| 1 | 8 pts | 13 pts | 21 pts |
| 2 | 8 pts | 8 pts | 16 pts |
| 3 | 5 pts | 13 pts | 18 pts |
| 4 | 5 pts | 8 pts | 13 pts |
| **Total** | **26 pts** | **42 pts** | **~68 pts** (~2-3 sprints) |

### Go/No-Go Criteria for Phase 1
- [ ] Category codes agreed with masjid admin
- [ ] Death Collection expense category defined
- [ ] Walk-in restriction scope confirmed (3 categories only)
- [ ] Staging environment available for UAT

---

**Report Prepared By:** Claude Code (Read-Only Assessment)  
**No code modifications were made during this analysis.**  
**All file references are to current `master` branch as of 2026-11-05.**