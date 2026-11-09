# Phase 2C Completion Plan

## Overview
Complete the Phase 2C implementation by fixing critical gaps identified in the acceptance review.

## Priority 0 - Critical Financial & Data Integrity

### 1. Jumma Consolidated Collection (Fix)
**Current Issues:**
- Creates individual Payment records (violation)
- Consumes receipt numbers (violation)
- Creates receipt events (violation)
- Uses upsert with increment (silent overwrite risk)
- No Friday date validation
- Uses TIMESTAMP instead of DATE

**Required Changes:**
1. Schema: Change JummaCollection.collectionDate from DateTime to DATE
2. Create dedicated Jumma collection page at `/collections/jumma`
3. Remove JummaCollection logic from createPaymentAction
4. Create separate `recordJummaCollectionAction` that:
   - Validates date is Friday
   - Creates one JummaCollection record per masjid+definition+friday
   - Does NOT create Payment, receipt, or allocations
   - Uses unique constraint for duplicate prevention
5. Create Jumma correction workflow with:
   - Admin-only action
   - Previous amount tracking
   - New amount
   - Correction reason
   - AuditLog entry
   - Atomic transaction

### 2. OLDEST_FIRST Validation (Fix)
**Current Issues:**
- No continuous prefix validation
- No server-side validation of selected IDs

**Required Changes:**
1. Update createPaymentAction OLDEST_FIRST path to:
   - Accept client-submitted duesPeriodIds and collectionEventIds
   - Validate selected IDs form continuous prefix from oldest
   - Reject if older pending periods are skipped
   - Calculate allocation amounts server-side
   - Maintain FIFO with partial payment support

### 3. Additional Voluntary Contribution (Fix)
**Current Issues:**
- Not restricted to MILAD_UN_NABI and SHAB_E_QADR
- May share allocation with dues period

**Required Changes:**
1. Restrict to specific purpose codes only:
   - MILAD_UN_NABI
   - SHAB_E_QADR
2. Ensure separate PaymentAllocation row
3. No duesPeriodId on this allocation
4. purposeNote = "Additional Voluntary Contribution"
5. Cannot combine with regular dues allocation

## Priority 1 - Walk-in & Payment Rules

### 4. Dynamic Walk-in Eligibility (Implement)
**Required Changes:**
1. Server-side validation using stable purposeCode values:
   - ANNUAL_CHANDA → MEMBERS_ONLY
   - DEATH_COLLECTION → MEMBERS_ONLY
   - BARTAN_COLLECTION → MEMBERS_ONLY
   - MONTHLY_CHANDA → Per-Masjid configurable
   - JUMMA_COLLECTION → Dedicated workflow (not walk-in)
2. When walk-in enabled for Monthly Chanda:
   - Accept voluntary contributions
   - No member DuesPeriod created
   - No member dues allocation
   - Normal walk-in receipt

### 5. Payment Received Visibility (Implement)
**Required Changes:**
1. Filter Payment Received selector by:
   - active = true
   - showInPaymentReceived = true
2. Dynamic donorEligibility based on selected Masjid

## Priority 2 - Settlement Policy UI

### 6. OLDEST_FIRST UI (Complete)
**Required Changes:**
1. Checkboxes for pending periods
2. Continuous selection from oldest (no skipping)
3. Single total payment amount
4. Automatic FIFO allocation preview

### 7. ANY_PENDING_PERIOD UI (Complete)
**Required Changes:**
1. Independent checkboxes
2. Any pending periods selectable
3. Unselected periods remain pending
4. Chronological allocation within selected periods
5. Single total payment amount

## Priority 3 - Receipt Identity

### 8. A5 Receipt Template (Update)
**Required Changes:**
1. Registered member: "Member ID — Member Name" (e.g., "MAS-0025 — Mohammad Faizan")
2. Walk-in: "Blank Member ID position — Donor Name" (e.g., "__________ — Ahmed")
3. Member ID from server-resolved Member record
4. No client-provided Member ID
5. Jumma aggregate: No receipt

## Priority 4 - UI Completion

### 9. Required Interfaces
1. Registered Member Search (existing)
2. Collection Selection (existing)
3. Pending Period Display (existing)
4. Settlement Policy Checkboxes (new)
5. Single Total Payment Amount (existing)
6. Payment Review (existing)
7. Existing Receipt Preview (existing)
8. Walk-in voluntary donation (existing)
9. **Dedicated Jumma Aggregate Collection page/form (NEW)**
10. **Jumma Friday-wise collection list (NEW)**
11. **Jumma correction workflow (NEW)**

## Priority 5 - Tests

### Jumma Tests
- Friday-only date validation
- One record per Friday
- Duplicate submission prevention
- Concurrent duplicate prevention
- No individual Payment record
- No receipt number consumption
- No DuesPeriod
- No individual PaymentAllocation
- Authorized correction
- Correction audit history
- Date-range reporting

### Settlement Tests
- OLDEST_FIRST continuous-prefix validation
- Skipping older period rejected
- ANY_PENDING_PERIOD independent selection
- Unselected periods remain pending
- Partial payment
- No over-allocation
- No client-controlled amounts
- Concurrency safety

### Walk-in Tests
- BOTH permitted
- WALKIN_ONLY permitted
- MEMBERS_ONLY rejected
- Monthly Chanda per-Masjid configurability
- Hidden definitions excluded
- Death and Bartan rejected for Walk-in
- Regular Annual Chanda rejected for Walk-in

### Additional Contribution Tests
- Milad allowed
- Shab-e-Qadr allowed
- Regular Annual Chanda rejected
- Separate PaymentAllocation row
- No DuesPeriod liability
- No carry-forward

### Receipt Tests
- Registered Member ID before name
- Walk-in blank Member ID position
- Existing A5 design preserved
- No individual Jumma receipt

### Playwright Tests
- Registered Member payment
- OLDEST_FIRST
- ANY_PENDING_PERIOD
- Walk-in Monthly Chanda where enabled
- Generic Walk-in donation
- Jumma consolidated total entry
- Jumma correction
- Receipt identity

## Implementation Order

1. **Schema migration** - Change JummaCollection.collectionDate to DATE
2. **Jumma actions** - Create recordJummaCollectionAction + correction workflow
3. **Jumma UI** - Create /collections/jumma page
4. **Payment action fixes** - OLDEST_FIRST validation, Additional Voluntary Contribution restrictions
5. **Walk-in eligibility** - Server-side purposeCode validation
6. **Payment Received visibility** - Filter by showInPaymentReceived
7. **Settlement policy UI** - Checkboxes for both policies
8. **Receipt template** - Member ID positioning
9. **Tests** - Vitest + Playwright
10. **Documentation** - Update project progress

## Files to Create/Modify

### Create
- `src/app/(dashboard)/collections/jumma/page.tsx` - Jumma collection dashboard
- `src/modules/jumma/actions.ts` - Jumma record + correction actions
- `tests/phase2c-jumma.test.ts` - Jumma tests
- `tests/phase2c-settlement.test.ts` - Settlement tests
- `tests/phase2c-walkin.test.ts` - Walk-in tests
- `tests/phase2c-receipt.test.ts` - Receipt tests

### Modify
- `prisma/schema.prisma` - Change JummaCollection.collectionDate to DATE
- `prisma/migrations/20261108090000_phase2c_jumma_collection/migration.sql` - Update migration
- `src/modules/payments/actions.ts` - Fix OLDEST_FIRST, Additional Voluntary Contribution, remove Jumma logic
- `src/app/(dashboard)/collections/new/page.tsx` - Filter by showInPaymentReceived
- `src/app/(dashboard)/collections/new/collection-form.tsx` - Settlement policy UI
- `src/components/receipts/receipt-template.tsx` - Member ID positioning

## Out of Scope
- No Phase 9
- No ContributionCategory restoration
- No PaymentAllocation.categoryId restoration
- No ExpenseCategory modification
- No A5 receipt redesign
- No duplicate payment actions
- No unnecessary schema changes
- No destructive database operations
