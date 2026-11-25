# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phase2c-jumma.spec.ts >> Phase 2C: Jumma Aggregate Collection >> should reject Jumma collection for non-Friday date
- Location: e2e\phase2c-jumma.spec.ts:84:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[role="dialog"]').locator('text=must be a Friday')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('[role="dialog"]').locator('text=must be a Friday') with timeout 15000ms
  - waiting for locator('[role="dialog"]').locator('text=must be a Friday')

```

```yaml
- complementary:
  - navigation "Main":
    - link "Dashboard":
      - /url: /dashboard
    - link "Members":
      - /url: /members
    - link "Contribution plans":
      - /url: /plans
    - link "Receive payment":
      - /url: /collections/new
    - link "Due Status Overview":
      - /url: /collections/due-status
    - link "Transactions":
      - /url: /transactions
    - link "Expenses":
      - /url: /expenses
    - link "Reports":
      - /url: /reports
    - link "Settings":
      - /url: /settings
    - link "Staff":
      - /url: /staff
    - link "Audit log":
      - /url: /audit
- banner:
  - text: हुसैनी मस्जिद आलोट 25 Nov 2026 Language
  - button "English" [pressed]
  - button "हिन्दी"
  - button "اردو"
  - button "MA Masjid Admin"
- main:
  - heading "Jumma Collection" [level=1]
  - paragraph: Record and manage Friday Jumma collection totals
  - heading "Total" [level=2]
  - paragraph: ₹8,020
  - text: Filter by definition
  - combobox "Filter by definition":
    - option "All" [selected]
    - option "Jumma Collection"
  - text: From
  - textbox "From"
  - text: To
  - textbox "To"
  - text: Sort by
  - combobox "Sort by":
    - option "Latest First"
    - option "Date Order" [selected]
  - button "Clear"
  - button "Record New Jumma"
  - paragraph: "Date Range: All — All"
  - text: 27 Nov 2026 Jumma Jumma Collection
  - paragraph: ₹350
  - paragraph: "(Recorded by: Masjid Admin)"
  - button "Correct"
  - heading "Corrections (1)" [level=4]
  - button
  - text: 20 Nov 2026 Jumma Jumma Collection
  - paragraph: ₹260
  - paragraph: "(Recorded by: Masjid Admin)"
  - button "Correct"
  - text: 13 Nov 2026 Jumma Jumma Collection
  - paragraph: ₹220
  - paragraph: "(Recorded by: Masjid Admin)"
  - button "Correct"
  - text: 06 Nov 2026 Jumma Jumma Collection
  - paragraph: ₹190
  - paragraph: "(Recorded by: Masjid Admin)"
  - button "Correct"
  - text: 30 Oct 2026 Jumma Jumma Collection
  - paragraph: ₹270
  - paragraph: "(Recorded by: Masjid Admin)"
  - button "Correct"
  - text: 23 Oct 2026 Jumma Jumma Collection
  - paragraph: ₹310
  - paragraph: "(Recorded by: Masjid Admin)"
  - button "Correct"
  - text: 16 Oct 2026 Jumma Jumma Collection
  - paragraph: ₹180
  - paragraph: "(Recorded by: Masjid Admin)"
  - button "Correct"
  - text: 09 Oct 2026 Jumma Jumma Collection
  - paragraph: ₹230
  - paragraph: "(Recorded by: Masjid Admin)"
  - button "Correct"
  - text: 02 Oct 2026 Jumma Jumma Collection
  - paragraph: ₹150
  - paragraph: "(Recorded by: Masjid Admin)"
  - button "Correct"
  - text: 25 Sep 2026 Jumma Jumma Collection
  - paragraph: ₹230
  - paragraph: "(Recorded by: Masjid Admin)"
  - button "Correct"
  - text: 18 Sep 2026 Jumma Jumma Collection
  - paragraph: ₹170
  - paragraph: "(Recorded by: Masjid Admin)"
  - button "Correct"
  - text: 11 Sep 2026 Jumma Jumma Collection
  - paragraph: ₹210
  - paragraph: "(Recorded by: Masjid Admin)"
  - button "Correct"
  - text: 04 Sep 2026 Jumma Jumma Collection
  - paragraph: ₹190
  - paragraph: "(Recorded by: Masjid Admin)"
  - button "Correct"
  - text: 28 Aug 2026 Jumma Jumma Collection
  - paragraph: ₹250
  - paragraph: "(Recorded by: Masjid Admin)"
  - button "Correct"
  - text: 21 Aug 2026 Jumma Jumma Collection
  - paragraph: ₹180
  - paragraph: "(Recorded by: Masjid Admin)"
  - button "Correct"
  - text: 14 Aug 2026 Jumma Jumma Collection
  - paragraph: ₹220
  - paragraph: "(Recorded by: Masjid Admin)"
  - button "Correct"
  - text: 07 Aug 2026 Jumma Jumma Collection
  - paragraph: ₹160
  - paragraph: "(Recorded by: Masjid Admin)"
  - button "Correct"
  - text: 31 Jul 2026 Jumma Jumma Collection
  - paragraph: ₹240
  - paragraph: "(Recorded by: Masjid Admin)"
  - button "Correct"
  - text: 24 Jul 2026 Jumma Jumma Collection
  - paragraph: ₹200
  - paragraph: "(Recorded by: Masjid Admin)"
  - button "Correct"
  - text: 17 Jul 2026 Jumma Jumma Collection
  - paragraph: ₹150
  - paragraph: "(Recorded by: Masjid Admin)"
  - button "Correct"
  - text: 10 Jul 2026 Jumma Jumma Collection
  - paragraph: ₹230
  - paragraph: "(Recorded by: Masjid Admin)"
  - button "Correct"
  - text: 03 Jul 2026 Jumma Jumma Collection
  - paragraph: ₹170
  - paragraph: "(Recorded by: Masjid Admin)"
  - button "Correct"
  - text: 26 Jun 2026 Jumma Jumma Collection
  - paragraph: ₹210
  - paragraph: "(Recorded by: Masjid Admin)"
  - button "Correct"
  - text: 19 Jun 2026 Jumma Jumma Collection
  - paragraph: ₹190
  - paragraph: "(Recorded by: Masjid Admin)"
  - button "Correct"
  - text: 12 Jun 2026 Jumma Jumma Collection
  - paragraph: ₹220
  - paragraph: "(Recorded by: Masjid Admin)"
  - button "Correct"
  - text: 05 Jun 2026 Jumma Jumma Collection
  - paragraph: ₹180
  - paragraph: "(Recorded by: Masjid Admin)"
  - button "Correct"
  - text: 29 May 2026 Jumma Jumma Collection
  - paragraph: ₹240
  - paragraph: "(Recorded by: Masjid Admin)"
  - button "Correct"
  - text: 22 May 2026 Jumma Jumma Collection
  - paragraph: ₹140
  - paragraph: "(Recorded by: Masjid Admin)"
  - button "Correct"
  - text: 15 May 2026 Jumma Jumma Collection
  - paragraph: ₹230
  - paragraph: "(Recorded by: Masjid Admin)"
  - button "Correct"
  - text: 08 May 2026 Jumma Jumma Collection
  - paragraph: ₹200
  - paragraph: "(Recorded by: Masjid Admin)"
  - button "Correct"
  - text: 01 May 2026 Jumma Jumma Collection
  - paragraph: ₹160
  - paragraph: "(Recorded by: Masjid Admin)"
  - button "Correct"
  - text: 24 Apr 2026 Jumma Jumma Collection
  - paragraph: ₹210
  - paragraph: "(Recorded by: Masjid Admin)"
  - button "Correct"
  - text: 17 Apr 2026 Jumma Jumma Collection
  - paragraph: ₹170
  - paragraph: "(Recorded by: Masjid Admin)"
  - button "Correct"
  - text: 10 Apr 2026 Jumma Jumma Collection
  - paragraph: ₹250
  - paragraph: "(Recorded by: Masjid Admin)"
  - button "Correct"
  - text: 03 Apr 2026 Jumma Jumma Collection
  - paragraph: ₹190
  - paragraph: "(Recorded by: Masjid Admin)"
  - button "Correct"
  - text: 27 Mar 2026 Jumma Jumma Collection
  - paragraph: ₹220
  - paragraph: "(Recorded by: Masjid Admin)"
  - button "Correct"
  - text: 20 Mar 2026 Jumma Jumma Collection
  - paragraph: ₹150
  - paragraph: "(Recorded by: Masjid Admin)"
  - button "Correct"
  - text: 13 Mar 2026 Jumma Jumma Collection
  - paragraph: ₹180
  - paragraph: "(Recorded by: Masjid Admin)"
  - button "Correct"
  - text: 06 Mar 2026 Jumma Jumma Collection
  - paragraph: ₹120
  - paragraph: "(Recorded by: Masjid Admin)"
  - button "Correct"
  - dialog:
    - heading "Record New Jumma" [level=3]
    - text: Date
    - textbox "Date": 2026-12-25
    - text: Select a Jumma definition
    - combobox "Select a Jumma definition":
      - option "Select a Jumma definition"
      - option "Jumma Collection" [selected]
    - text: Amount ₹
    - textbox "Amount":
      - /placeholder: "0.00"
      - text: "5000.00"
    - text: Notes (optional)
    - textbox "Notes (optional)"
    - button "Cancel"
    - button "Save" [disabled]
- alert
```

# Test source

```ts
  1   | /**
  2   |  * Phase 2C: Jumma Aggregate Collection - Playwright E2E Tests
  3   |  *
  4   |  * Tests browser workflows for:
  5   |  * 1. Recording Jumma collections (Friday-only, one per masjid+date+definition)
  6   |  * 2. Correcting Jumma collections with audit history
  7   |  * 3. Walk-in restrictions for restricted categories
  8   |  * 4. Settlement policy UI (OLDEST_FIRST preview, ANY_PENDING_PERIOD checkboxes)
  9   |  * 5. Receipt identity (Member ID for registered, blank for walk-in)
  10  |  */
  11  | import { test, expect } from "@playwright/test";
  12  | import { format } from "date-fns";
  13  | 
  14  | // Helper: get a future Friday date string (yyyy-MM-dd) offset by N weeks from today
  15  | function getFutureFriday(weeksFromNow: number): string {
  16  |   const today = new Date();
  17  |   const day = today.getDay(); // 0=Sun, 5=Fri
  18  |   const daysUntilFriday = (5 - day + 7) % 7 || 7;
  19  |   const nextFriday = new Date(today);
  20  |   nextFriday.setDate(today.getDate() + daysUntilFriday + weeksFromNow * 7);
  21  |   return nextFriday.toISOString().split("T")[0];
  22  | }
  23  | 
  24  | // Helper: generate a unique future Friday for this test run using timestamp
  25  | // Uses reasonable range (2027-2030) to avoid absurd dates like 2352
  26  | function getUniqueFutureFriday(): string {
  27  |   const timestamp = Date.now();
  28  |   // Base: ~52 weeks * 2 years = 104 weeks from now (early 2028)
  29  |   // Unique component: 0-51 weeks (one year range)
  30  |   const baseOffset = 104;
  31  |   const uniqueWeeks = Math.floor((timestamp % 5200) / 100); // 0-51 extra weeks
  32  |   return getFutureFriday(baseOffset + uniqueWeeks);
  33  | }
  34  | 
  35  | // Helper: create a regex pattern to match the displayed date
  36  | // Since the component uses local timezone formatting, we match on month/year only
  37  | function getDateRegex(dateStr: string): RegExp {
  38  |   const date = new Date(dateStr + "T00:00:00.000Z");
  39  |   const month = date.toLocaleString("en-US", { month: "short" });
  40  |   const year = date.getFullYear();
  41  |   // Match any day in the given month/year (handles timezone differences)
  42  |   return new RegExp(`${month}\\s+${year}`);
  43  | }
  44  | 
  45  | // Helper: create a more specific regex to match the exact displayed date
  46  | // Uses day-of-month range to narrow down
  47  | function getSpecificDateRegex(dateStr: string): RegExp {
  48  |   const date = new Date(dateStr + "T00:00:00.000Z");
  49  |   const month = date.toLocaleString("en-US", { month: "short" });
  50  |   const year = date.getFullYear();
  51  |   const day = date.getDate();
  52  |   // Match the specific day in the month/year (e.g., "13 Jun 2036")
  53  |   return new RegExp(`\\b${day}\\s+${month}\\s+${year}\\b`);
  54  | }
  55  | 
  56  | test.describe("Phase 2C: Jumma Aggregate Collection", () => {
  57  |   test.beforeEach(async ({ page }) => {
  58  |     await page.goto("/collections/jumma");
  59  |     await expect(page.getByRole("heading", { name: "Jumma Collection" })).toBeVisible();
  60  |   });
  61  | 
  62  |   test("should record a Jumma collection for a Friday", async ({ page }) => {
  63  |     // Use a unique date for this test run to avoid conflicts with previous runs
  64  |     const fridayDate = getUniqueFutureFriday();
  65  |     // Use a unique amount to avoid conflicts with existing test data
  66  |     const uniqueAmount = "5000.91";
  67  | 
  68  |     await page.click("text=Record New Jumma");
  69  | 
  70  |     const modal = page.locator('[role="dialog"]');
  71  |     await expect(modal).toBeVisible();
  72  | 
  73  |     await modal.locator('input[id="recordDate"]').fill(fridayDate);
  74  |     await modal.locator('input[id="recordAmount"]').fill(uniqueAmount);
  75  |     await modal.locator('select[id="recordCollectionDefinitionId"]').selectOption({ index: 1 });
  76  | 
  77  |     // Click Save - on success the app does window.location.reload()
  78  |     await modal.locator('button:has-text("Save")').click();
  79  | 
  80  |     // Wait for the new record to appear in the list - verify by unique amount
  81  |     await expect(page.locator(`text=${parseFloat(uniqueAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).first()).toBeVisible({ timeout: 30000 });
  82  |   });
  83  | 
  84  |   test("should reject Jumma collection for non-Friday date", async ({ page }) => {
  85  |     const fridayDate = getFutureFriday(4);
  86  |     const saturday = new Date(fridayDate + "T00:00:00.000Z");
  87  |     saturday.setDate(saturday.getDate() + 1);
  88  |     const saturdayStr = saturday.toISOString().split("T")[0];
  89  | 
  90  |     await page.click("text=Record New Jumma");
  91  | 
  92  |     const modal = page.locator('[role="dialog"]');
  93  |     await expect(modal).toBeVisible();
  94  | 
  95  |     await modal.locator('input[id="recordDate"]').fill(saturdayStr);
  96  |     await modal.locator('input[id="recordAmount"]').fill("5000.00");
  97  |     await modal.locator('select[id="recordCollectionDefinitionId"]').selectOption({ index: 1 });
  98  | 
  99  |     // Client-side validation should show "must be a Friday"
> 100 |     await expect(modal.locator("text=must be a Friday")).toBeVisible();
      |                                                          ^ Error: expect(locator).toBeVisible() failed
  101 |   });
  102 | 
  103 |   test("should prevent duplicate Jumma collection for same Friday", async ({ page }) => {
  104 |     // Use a unique date for this test run to avoid conflicts with previous runs
  105 |     const fridayDate = getUniqueFutureFriday();
  106 |     // Use unique amounts to avoid conflicts with existing test data
  107 |     const firstAmount = "3000.92";
  108 |     const secondAmount = "4000.92";
  109 | 
  110 |     // Record first
  111 |     await page.click("text=Record New Jumma");
  112 |     let modal = page.locator('[role="dialog"]');
  113 |     await expect(modal).toBeVisible();
  114 | 
  115 |     await modal.locator('input[id="recordDate"]').fill(fridayDate);
  116 |     await modal.locator('input[id="recordAmount"]').fill(firstAmount);
  117 |     await modal.locator('select[id="recordCollectionDefinitionId"]').selectOption({ index: 1 });
  118 | 
  119 |     // Click Save - on success the app does window.location.reload()
  120 |     await modal.locator('button:has-text("Save")').click();
  121 |     // Wait for reload by waiting for the new record to appear
  122 |     await expect(page.locator(`text=${parseFloat(firstAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).first()).toBeVisible({ timeout: 30000 });
  123 | 
  124 |     // Wait for page to be fully ready after reload
  125 |     await page.waitForLoadState('networkidle');
  126 | 
  127 |     // Try duplicate
  128 |     await page.click("text=Record New Jumma");
  129 |     modal = page.locator('[role="dialog"]');
  130 |     await expect(modal).toBeVisible();
  131 | 
  132 |     await modal.locator('input[id="recordDate"]').fill(fridayDate);
  133 |     await modal.locator('input[id="recordAmount"]').fill(secondAmount);
  134 |     await modal.locator('select[id="recordCollectionDefinitionId"]').selectOption({ index: 1 });
  135 |     await modal.locator('button:has-text("Save")').click();
  136 | 
  137 |     // Server returns duplicate error, modal stays open
  138 |     await expect(modal.locator("text=already recorded")).toBeVisible({ timeout: 15000 });
  139 |   });
  140 | 
  141 |   test("should correct a Jumma collection and show audit history", async ({ page }) => {
  142 |     // Use a unique date for this test run to avoid conflicts with previous runs
  143 |     const fridayDate = getUniqueFutureFriday();
  144 |     // Use unique amounts to avoid conflicts with existing test data
  145 |     const initialAmount = "2000.93";
  146 |     const correctedAmount = "2500.93";
  147 | 
  148 |     // Record initial
  149 |     await page.click("text=Record New Jumma");
  150 |     let modal = page.locator('[role="dialog"]');
  151 |     await expect(modal).toBeVisible();
  152 | 
  153 |     await modal.locator('input[id="recordDate"]').fill(fridayDate);
  154 |     await modal.locator('input[id="recordAmount"]').fill(initialAmount);
  155 |     await modal.locator('select[id="recordCollectionDefinitionId"]').selectOption({ index: 1 });
  156 | 
  157 |     await modal.locator('button:has-text("Save")').click();
  158 |     // Wait for reload by waiting for the new record to appear
  159 |     await expect(page.locator(`text=${parseFloat(initialAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).first()).toBeVisible({ timeout: 30000 });
  160 | 
  161 |     // Wait for page to be fully ready after reload
  162 |     await page.waitForLoadState('networkidle');
  163 | 
  164 |     // Click Correct on the newest record (first in the list = newest)
  165 |     // Find the record card by the amount
  166 |     const recordCard = page.locator(`text=${parseFloat(initialAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).first().locator("xpath=ancestor::div[contains(@class,'rounded-lg')]");
  167 |     await recordCard.locator('button:has-text("Correct")').click();
  168 | 
  169 |     modal = page.locator('[role="dialog"]');
  170 |     await expect(modal).toBeVisible();
  171 | 
  172 |     await modal.locator('input[id="correctionAmount"]').fill(correctedAmount);
  173 |     await modal.locator('textarea[id="correctionReason"]').fill("Corrected count error");
  174 | 
  175 |     await modal.locator('button:has-text("Apply Correction")').click();
  176 | 
  177 |     // Wait for reload and verify updated amount + correction history
  178 |     await expect(page.locator(`text=${parseFloat(correctedAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).first()).toBeVisible({ timeout: 30000 });
  179 | 
  180 |     // Find the specific Corrections heading for our record (by looking in the card with our amount)
  181 |     const correctionsHeading = page.locator(`text=${parseFloat(correctedAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).first().locator("xpath=ancestor::div[contains(@class,'rounded-lg')]").locator("text=Corrections");
  182 |     await expect(correctionsHeading).toBeVisible({ timeout: 15000 });
  183 | 
  184 |     // Expand the corrections section to see the reason
  185 |     await correctionsHeading.locator("..").locator("button").click();
  186 |     await expect(page.locator("text=Corrected count error")).toBeVisible({ timeout: 10000 });
  187 |   });
  188 | 
  189 |   test("should filter Jumma collections by date range via URL params", async ({ page }) => {
  190 |     const fridayDate = getFutureFriday(0);
  191 |     const from = new Date(fridayDate + "T00:00:00.000Z");
  192 |     from.setDate(from.getDate() - 7);
  193 |     const to = new Date(fridayDate + "T00:00:00.000Z");
  194 |     to.setDate(to.getDate() + 14);
  195 | 
  196 |     const fromStr = from.toISOString().split("T")[0];
  197 |     const toStr = to.toISOString().split("T")[0];
  198 | 
  199 |     // Navigate with filter params (desktop uses URL params, not the mobile filter sheet)
  200 |     await page.goto(`/collections/jumma?fromDate=${fromStr}&toDate=${toStr}`);
```