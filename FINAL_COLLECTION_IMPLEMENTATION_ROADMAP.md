# Final Collection Implementation Roadmap

**Project:** Masjid Collection Management System  
**Date:** 2026-11-05  
**Status:** PLANNING-ONLY — No code modifications performed  
**Roadmap Phase:** Post-Phase 9c (Prayer Times, Announcements, AnalogTimePicker complete)  
**Workstream:** Collection Management Enhancements  

---

## Section A: Final Business Rules

All confirmed requirements from the business specification and recent decisions:

### A.1 Monthly Collection (Recurring, Household-Wise)
- **Registered members only** — No walk-in contributions
- **Default amount:** ₹150/month per household
- **Bulk and selective member assignment** — Admin chooses which households participate
- **New members** — Start from following month (not current)
- **Admin-controlled dues generation** — Explicit action generates monthly dues periods
- **Historical dues retain original amounts** — Changing default only affects future generated dues
- **FIFO allocation** — Payments automatically apply to oldest outstanding dues first

### A.2 Milad-un-Nabi (Annual, Event-Based)
- **Default amount:** ₹1,000 per household
- **Events created manually by Admin** — NO automatic annual event generation
- **Admin selects all or specific members** — Household assignment per event
- **Dues generated only after explicit Admin action** — Not automatic
- **Walk-in contributions ALLOWED** — Non-members can contribute
- **Additional contributions above fixed amount allowed (Additional Voluntary Contribution)**:
  - Automatically identify amount received above fixed event contribution.
  - Record it as Additional Voluntary Contribution.
  - Keep its amount associated with the same Milad event and category.
  - Include it correctly in financial reports.
  - **Financial representation:** Handled via separate `PaymentAllocation` row with `purposeNote: "Additional Voluntary Contribution"` and allocated amount equal to the excess. The existing schema supports multiple allocations per payment, so excess payment over event expected amount is cleanly stored as a distinct allocation row pointing to the same category/event without needing schema changes.
- **Multiple years payable in one receipt** — If member owes for 2023, 2024, 2025, one payment covers all.

### A.3 Shab-e-Qadr (Annual, Event-Based)
- **Default amount:** ₹1,000 per household
- **Same rules as Milad-un-Nabi** — Manual event creation, walk-in allowed, additional voluntary contribution financially tracked via allocation rows, multi-year in one receipt.

### A.4 Death Collection (Expense-Linked, Walk-In Allowed)
- **Default amount:** ₹200 per household
- **Separate event** — Admin creates event, assigns members
- **Collection and expenses recorded separately** from normal Masjid totals (excluded from main collection summary).
- **Tracking:** Event's total collection, total expenses, and remaining amount (net to family).
- **Shortage handling:** If expenses exceed collection, shortage recovered from family if possible, or added to Masjid expenses.
- **Schema verification:** Reuses existing `CollectionEvent`, `Payment`, `PaymentAllocation`, and `Expense` models without new fund-management models. Expenses are linked to events or tracked via category separation.

### A.5 Bartan Collection (Utensils Rental, Transaction-Based)
- **Default amount:** ₹500 per transaction
- **Registered members only** — No walk-in
- **Transaction-based collection** — No recurring dues
- **Receipt generated at time of collection**
- **NO inventory management** — No BartanItem model or inventory tables.

### A.6 Jumma Collection (Weekly, Variable Amount)
- **Variable contribution amount** — No fixed default
- **Members AND non-members can contribute** — Non-member contributions use the existing Jumma-specific workflow (attaching payment to the Jumma `CollectionEvent` via `collectionEventId` with `walkInName`), NOT the generic Walk-in category selector.
- **No fixed amount per household**
- **No recurring member-wise dues**
- **Simple collection workflow** — Reuse existing collection entry.

### A.7 General Donation (Variable, Walk-In)
- **Variable amount** — No fixed default
- **Walk-in contributions supported** via generic Walk-in selector.
- **Separate reporting category**.

---

## A.8 Critical Cross-Cutting Rules

### Walk-In Donor Category Restriction (STRICT)
The generic Walk-in Donor category selector MUST show **exactly** these 3:
1. **Shab-e-Qadr**
2. **Milad-un-Nabi**
3. **General Donation**

Must **NOT** show:
- Monthly Collection
- Death Collection
- Bartan Collection
- Jumma Collection

### Automatic FIFO Payment Allocation (MANDATORY FOR ALL ROLES)
- **No manual due selection**
- **No manual allocation controls**
- **No Admin override**
- **No Collector override**
- **Every payment** automatically allocates to oldest outstanding dues first (server-side enforcement).
- **Server-side enforcement:** The payment action (`createPaymentAction`) calculates FIFO allocations on the server based on the member's outstanding `DuesPeriod` and `CollectionEventAssignment` rows ordered by due date ascending. Client-submitted allocations are ignored or validated strictly against the server-computed FIFO order. This prevents trusting client-submitted allocations.
- Preserve existing transactional locking (`FOR UPDATE`) and concurrency protection.

### One Category Per Receipt (BACKEND-ENFORCED)
- **Allowed:** Multiple periods within same category (Monthly: Jan+Feb+Mar; Milad: 2023+2024+2025).
- **Not allowed:** Monthly + Milad; Milad + Shab-e-Qadr; any cross-category combination.
- Enforcement in backend (`createPaymentAction`), verifying all allocation rows share the same `categoryId`.

### Partial Payment (FIFO Behavior)
- Example: 3 monthly dues of ₹150 each (₹450 total).
- Member pays ₹200.
- Expected: Oldest month ₹150 paid → Next month ₹50 paid (₹100 pending) → Third month ₹150 pending.
- Total outstanding: ₹250.
- Remaining balance stays attached to original dues — **NO duplicate carry-forward dues**.

---

## Section B: Schema Verification (Addressing Specific Verification Points)

### A. Whether additional voluntary contributions can be financially recorded using the existing schema:
**YES.** The existing schema (`Payment` + `PaymentAllocation`) fully supports this without schema changes. 
- A payment of ₹1,500 against a ₹1,000 Milad event creates **two** `PaymentAllocation` rows under the same payment:
  1. Allocation 1: `collectionEventId = event.id`, `allocatedAmountPaise = 100000`, `purposeNote = "Event Due"`
  2. Allocation 2: `collectionEventId = event.id`, `allocatedAmountPaise = 50000`, `purposeNote = "Additional Voluntary Contribution"`
- Both amounts are positive integers in paise, sum to the exact payment total (₹1,500), and are fully accounted for in category/event report aggregations (`sumEventAllocationsForMember`, `eventTotals`).

### B. Whether Death Collection expenses can be reliably associated with their respective events using the existing schema:
**YES.** The existing schema (`CollectionEvent`, `Payment`, `Expense`) supports this without schema changes.
- Death Collection is created as a `CollectionEvent` linked to the Death category.
- Collections are recorded as `Payment` records allocated to that event.
- Expenses are recorded in the `Expense` model linked to an expense category (e.g., Funeral Expenses) and can reference the event name/ID in `Expense.description` or `Expense.referenceNo`.
- Summary queries (`deathCollectionSummary`) can aggregate all payments for the Death event and all expenses for the Death category/event to calculate: Total Collected, Total Expenses, and Net Balance for the family.

### C. Whether existing category codes can support all required workflows:
**YES.** Reusing existing `ContributionCategory.code` values (e.g., `MONTHLY`, `MILAD`, `SHAB_E_QADR`, `DEATH`, `BARTAN`, `JUMMA`, `GENERAL_DONATION`) fully supports all required workflows. No new category codes, enums, or migrations are needed. Existing categories already have `frequency`, `collectionMode`, and `defaultAmountPaise` fields.

### D. Whether the existing payment engine can enforce FIFO server-side without trusting client-submitted allocations:
**YES.** The payment engine (`createPaymentAction`) can be modified to completely ignore client-submitted allocation details and compute FIFO allocations purely on the server:
1. When a payment is submitted with `memberId` and `amountPaise`, the server queries all unpaid/partial `DuesPeriod` and `CollectionEventAssignment` rows for that member ordered by `dueDate ASC`.
2. The server greedily allocates the payment amount across those outstanding dues in strict chronological order.
3. If the payment exceeds all outstanding dues (for Milad/Shab-e-Qadr), the excess is allocated as an "Additional Voluntary Contribution" to the target event.
4. This ensures FIFO is strictly enforced server-side with zero trust in client payloads.

---

## Section C: Actual Gaps & Corrected Implementation Phases

All previously identified gaps remain valid, but with the confirmed business decisions:
- **No schema changes**
- **Server-side FIFO enforcement**
- **Financial tracking of voluntary contributions via allocation rows**
- **Jumma non-members via event-specific workflow**

The 7 implementation phases (~7 weeks) outlined in the previous version remain the exact roadmap for execution.

---

**Document Status:** PLANNING COMPLETE — Updated with all 7 confirmed decisions and schema verifications. Awaiting explicit approval before implementation begins.  
**No code, schema, or database modifications have been made.**