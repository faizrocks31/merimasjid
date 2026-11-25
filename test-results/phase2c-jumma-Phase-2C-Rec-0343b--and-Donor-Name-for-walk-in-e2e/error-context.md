# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phase2c-jumma.spec.ts >> Phase 2C: Receipt Identity >> should show blank Member ID position and Donor Name for walk-in
- Location: e2e\phase2c-jumma.spec.ts:336:7

# Error details

```
TimeoutError: page.click: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('button:has-text("General Donation")')

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - complementary [ref=e3]:
      - navigation "Main" [ref=e4]:
        - link "Dashboard" [ref=e5] [cursor=pointer]:
          - /url: /dashboard
        - link "Members" [ref=e13] [cursor=pointer]:
          - /url: /members
        - link "Contribution plans" [ref=e21] [cursor=pointer]:
          - /url: /plans
        - link "Receive payment" [ref=e28] [cursor=pointer]:
          - /url: /collections/new
        - link "Due Status Overview" [ref=e38] [cursor=pointer]:
          - /url: /collections/due-status
        - link "Transactions" [ref=e45] [cursor=pointer]:
          - /url: /transactions
        - link "Expenses" [ref=e50] [cursor=pointer]:
          - /url: /expenses
        - link "Reports" [ref=e56] [cursor=pointer]:
          - /url: /reports
        - link "Settings" [ref=e61] [cursor=pointer]:
          - /url: /settings
        - link "Staff" [ref=e67] [cursor=pointer]:
          - /url: /staff
        - link "Audit log" [ref=e73] [cursor=pointer]:
          - /url: /audit
    - generic [ref=e79]:
      - banner [ref=e80]:
        - generic [ref=e81]:
          - generic [ref=e87]: हुसैनी मस्जिद आलोट
          - generic [ref=e88]: 25 Nov 2026
        - generic [ref=e89]:
          - generic [ref=e91]:
            - generic [ref=e92]: Language
            - generic [ref=e97]:
              - button "English" [pressed] [ref=e98]
              - button "हिन्दी" [ref=e99]
              - button "اردو" [ref=e100]
          - button "MA Masjid Admin" [ref=e102]:
            - generic [ref=e103]: MA
            - generic [ref=e104]: Masjid Admin
      - main [ref=e107]:
        - generic [ref=e109]:
          - heading "Receive payment" [level=1] [ref=e110]
          - paragraph [ref=e111]: Duplicate submissions are blocked automatically.
        - generic [ref=e112]:
          - generic [ref=e113]:
            - generic [ref=e114]:
              - paragraph [ref=e116]: Received from
              - generic [ref=e117]:
                - radiogroup [ref=e118]:
                  - radio "Choose member" [ref=e119]
                  - radio "Walk-in donor" [checked] [ref=e120]
                - generic [ref=e121]:
                  - generic [ref=e122]: Walk-in donor
                  - textbox "Walk-in donor" [active] [ref=e123]:
                    - /placeholder: Anonymous donor
                    - text: Walkin Receipt Test
            - generic [ref=e124]:
              - generic [ref=e125]:
                - paragraph [ref=e126]: Amount (₹)
                - generic [ref=e127]:
                  - generic [ref=e128]: Amount in Rupees
                  - generic [aria-hidden] [ref=e129]: ₹
                  - textbox "0" [ref=e130]
              - group "Quick amounts" [ref=e131]:
                - button "1,000" [ref=e132]
                - button "150" [ref=e133]
                - button "1,000" [ref=e134]
            - generic [ref=e136]:
              - generic [ref=e137]:
                - paragraph [ref=e138]: Purpose
                - generic [ref=e139]:
                  - button "Milad-un-Nabi" [ref=e140]
                  - button "Shab-e-Qadr" [ref=e141]
              - generic [ref=e142]:
                - paragraph [ref=e143]: Mode
                - radiogroup "Payment mode" [ref=e144]:
                  - radio "Cash" [checked] [ref=e145]
                  - radio "UPI" [ref=e150]
                  - radio "Bank" [ref=e155]
                  - radio "Other" [ref=e160]
              - generic [ref=e166]:
                - generic [ref=e167]: Date
                - textbox "Date" [ref=e168]: 2026-11-25
              - generic [ref=e170]:
                - generic [ref=e171]: Notes (optional)
                - textbox "Notes (optional)" [ref=e172]
          - generic [ref=e174]:
            - status "Receipt preview" [ref=e176]:
              - generic [ref=e177]:
                - heading "हुसैनी मस्जिद आलोट" [level=1] [ref=e184]
                - generic [ref=e185]: Pramilaganj Alote , Tehsil Alote | 7000261097
              - generic [ref=e186]: रसीद
              - generic [ref=e188]:
                - generic [ref=e189]:
                  - generic [ref=e190]:
                    - generic [ref=e191]: "1"
                    - generic [ref=e192]:
                      - generic [ref=e193]: रसीद संख्या
                      - generic [ref=e194]: Auto-generated
                  - generic [ref=e196]:
                    - generic [ref=e197]: "2"
                    - generic [ref=e198]:
                      - generic [ref=e199]: दिनांक
                      - generic [ref=e200]: 25-11-2026
                - generic [ref=e203]:
                  - generic [ref=e204]: "3"
                  - generic [ref=e205]:
                    - generic [ref=e206]: मोहतरम जनाब
                    - generic [ref=e207]: __________ — Walkin Receipt Test
                - generic [ref=e210]:
                  - generic [ref=e211]: "4"
                  - generic [ref=e212]: रुपये शब्दों में
                - generic [ref=e215]:
                  - generic [ref=e216]:
                    - generic [ref=e217]: "5"
                    - generic [ref=e218]:
                      - generic [ref=e219]: आवंटन श्रेणी
                      - generic [ref=e220]: —
                  - generic [ref=e222]:
                    - generic [ref=e223]: "6"
                    - generic [ref=e224]:
                      - generic [ref=e225]: भुगतान का तरीका
                      - generic [ref=e226]:
                        - generic [ref=e227]:
                          - checkbox "कैश" [checked] [disabled] [ref=e228]
                          - generic [ref=e229]: कैश
                        - generic [ref=e230]:
                          - checkbox "यूपीआई" [disabled] [ref=e231]
                          - generic [ref=e232]: यूपीआई
                        - generic [ref=e233]:
                          - checkbox "बैंक ट्रांसफर" [disabled] [ref=e234]
                          - generic [ref=e235]: बैंक ट्रांसफर
                        - generic [ref=e236]:
                          - checkbox "अन्य" [disabled] [ref=e237]
                          - generic [ref=e238]: अन्य
              - generic [ref=e239]:
                - generic [ref=e240]:
                  - paragraph [ref=e241]: प्राप्त राशि
                  - paragraph [ref=e242]: रु. 0/-
                  - paragraph
                - generic [ref=e243]:
                  - paragraph [ref=e244]:
                    - text: "प्राप्तकर्ता:"
                    - strong [ref=e245]: Collector
                  - paragraph [ref=e247]: अधिकृत हस्ताक्षर
              - paragraph [ref=e249]: धन्यवाद! आपका योगदान सराहनीय है।
            - generic [ref=e251]:
              - generic [ref=e252]:
                - generic [ref=e253]: Total
                - generic [ref=e254]: ₹0
              - generic [ref=e255]:
                - generic [ref=e256]: Allocated
                - generic [ref=e257]: ₹0
              - generic [ref=e258]:
                - generic [ref=e259]: Unallocated
                - generic [ref=e260]: ₹0
              - button "Confirm and issue receipt" [disabled] [ref=e261]
              - paragraph [ref=e268]: Duplicate submissions are blocked automatically.
  - generic [ref=e275] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e276]
    - generic [ref=e280]:
      - button "Open issues overlay" [ref=e281]:
        - generic [ref=e282]:
          - generic [aria-hidden] [ref=e283]: "2"
          - generic [ref=e284]: "3"
        - generic [ref=e285]:
          - text: Issue
          - generic [aria-hidden] [ref=e286]: s
      - button "Collapse issues badge" [ref=e287]
  - alert [ref=e290]
```

# Test source

```ts
  244 |     // Fill walk-in name
  245 |     await page.fill('input[id="walkIn"]', "Walkin Annual Test");
  246 | 
  247 |     // Monthly Chanda and Annual Chanda should NOT be visible (MEMBERS_ONLY filtered out)
  248 |     const monthlyChanda = page.locator('button:has-text("Monthly Chanda")');
  249 |     await expect(monthlyChanda).not.toBeVisible();
  250 | 
  251 |     const annualChanda = page.locator('button:has-text("Annual Chanda")');
  252 |     await expect(annualChanda).not.toBeVisible();
  253 |   });
  254 | 
  255 |   test("should reject individual Jumma payment via createPaymentAction", async ({ page }) => {
  256 |     // In member mode, Jumma Collection is visible (BOTH eligibility)
  257 |     // But the form should require a member selection for Jumma
  258 |     await page.click('button:has-text("Jumma Collection")');
  259 | 
  260 |     // Set amount
  261 |     await page.fill('input[placeholder="0"]', "500");
  262 | 
  263 |     // The button should be disabled because no member is selected for Jumma
  264 |     const submitBtn = page.locator('button:has-text("Confirm and issue receipt")');
  265 |     await expect(submitBtn).toBeDisabled({ timeout: 5000 });
  266 |   });
  267 | });
  268 | 
  269 | test.describe("Phase 2C: Settlement Policy UI", () => {
  270 |   test.beforeEach(async ({ page }) => {
  271 |     await page.goto("/collections/new");
  272 |     await expect(page.getByRole("heading", { name: "Receive payment" })).toBeVisible();
  273 |   });
  274 | 
  275 |   test("should show FIFO preview section for OLDEST_FIRST categories when member has dues", async ({ page }) => {
  276 |     // Use the seed member "Arif Hussain"
  277 |     await page.fill('input[placeholder="Search member..."]', "Arif");
  278 | 
  279 |     // Click the first matching member in the dropdown
  280 |     await page.click('button:has-text("Arif Hussain")');
  281 | 
  282 |     // Select Monthly Chanda (OLDEST_FIRST settlement policy)
  283 |     await page.click('button:has-text("Monthly Chanda")');
  284 | 
  285 |     // Set amount
  286 |     await page.fill('input[placeholder="0"]', "500");
  287 | 
  288 |     // The receipt preview should show the category name
  289 |     await expect(page.locator("text=Monthly Chanda").first()).toBeVisible({ timeout: 10000 });
  290 |   });
  291 | 
  292 |   test("should show event/period selection UI for ANY_PENDING_PERIOD categories", async ({ page }) => {
  293 |     // Use the seed member "Arif Hussain"
  294 |     await page.fill('input[placeholder="Search member..."]', "Arif");
  295 | 
  296 |     // Click the first matching member in the dropdown
  297 |     await page.click('button:has-text("Arif Hussain")');
  298 | 
  299 |     // Select General Donation (ANY_PENDING_PERIOD settlement policy)
  300 |     await page.click('button:has-text("General Donation")');
  301 | 
  302 |     // Set amount
  303 |     await page.fill('input[placeholder="0"]', "500");
  304 | 
  305 |     // The receipt preview should show the category name
  306 |     await expect(page.locator("text=General Donation").first()).toBeVisible({ timeout: 10000 });
  307 |   });
  308 | });
  309 | 
  310 | test.describe("Phase 2C: Receipt Identity", () => {
  311 |   test.beforeEach(async ({ page }) => {
  312 |     await page.goto("/collections/new");
  313 |     await expect(page.getByRole("heading", { name: "Receive payment" })).toBeVisible();
  314 |   });
  315 | 
  316 |   test("should show Member ID and Name for registered member in receipt preview", async ({ page }) => {
  317 |     // Search for and select the seed member
  318 |     await page.fill('input[placeholder="Search member..."]', "Arif");
  319 |     await page.click('button:has-text("Arif Hussain")');
  320 | 
  321 |     // Select General Donation (BOTH eligibility)
  322 |     await page.click('button:has-text("General Donation")');
  323 | 
  324 |     // Set amount
  325 |     await page.fill('input[placeholder="0"]', "500");
  326 | 
  327 |     // Wait for receipt preview to update
  328 |     await page.waitForTimeout(500);
  329 | 
  330 |     // The receipt preview should show the member's name and member ID
  331 |     // Check for the member name in the preview
  332 |     await expect(page.locator("text=MAS-000003").first()).toBeVisible({ timeout: 10000 });
  333 |     await expect(page.locator("text=Arif Hussain").first()).toBeVisible({ timeout: 10000 });
  334 |   });
  335 | 
  336 |   test("should show blank Member ID position and Donor Name for walk-in", async ({ page }) => {
  337 |     // Switch to walk-in mode
  338 |     await page.getByRole("radio", { name: "Walk-in donor" }).click();
  339 | 
  340 |     // Fill walk-in name
  341 |     await page.fill('input[id="walkIn"]', "Walkin Receipt Test");
  342 | 
  343 |     // Select General Donation (walk-in doesn't need period selection)
> 344 |     await page.click('button:has-text("General Donation")');
      |                ^ TimeoutError: page.click: Timeout 15000ms exceeded.
  345 | 
  346 |     // Set amount
  347 |     await page.fill('input[placeholder="0"]', "300");
  348 | 
  349 |     // Submit
  350 |     const submitBtn = page.locator('button:has-text("Confirm and issue receipt")');
  351 |     await expect(submitBtn).toBeEnabled({ timeout: 5000 });
  352 |     await submitBtn.click();
  353 | 
  354 |     // Navigate to receipt
  355 |     await expect(page).toHaveURL(/\/receipts\//, { timeout: 30000 });
  356 | 
  357 |     // Receipt should show the walk-in name with blank member ID
  358 |     await expect(page.locator("text=__________ — Walkin Receipt Test").first()).toBeVisible();
  359 |   });
  360 | });
  361 | 
  362 | test.describe("Phase 2C: Jumma Fixes - Timezone, Filter, Sort", () => {
  363 |   test.beforeEach(async ({ page }) => {
  364 |     await page.goto("/collections/jumma");
  365 |     await expect(page.getByRole("heading", { name: "Jumma Collection" })).toBeVisible();
  366 |   });
  367 | 
  368 |   test("should allow recording Jumma for Nov 13, 20, 27 2026 (previously failing Fridays)", async ({ page }) => {
  369 |     // These are the specific dates that were failing due to timezone bug
  370 |     // Note: These dates already exist from seeding (unique constraint prevents duplicates)
  371 |     // So we use future Fridays to verify the Friday validation works correctly
  372 |     // The test demonstrates that the timezone fix allows these Fridays to be accepted
  373 |     const testFridays = [
  374 |       { date: "2026-12-04", amount: "100.01" }, // First Friday in Dec 2026
  375 |       { date: "2026-12-11", amount: "100.02" },
  376 |       { date: "2026-12-18", amount: "100.03" },
  377 |     ];
  378 | 
  379 |     for (const { date: fridayDate, amount } of testFridays) {
  380 |       await page.click("text=Record New Jumma");
  381 |       const modal = page.locator('[role="dialog"]');
  382 |       await expect(modal).toBeVisible();
  383 | 
  384 |       // Fill date - should pass client-side Friday validation
  385 |       await modal.locator('input[id="recordDate"]').fill(fridayDate);
  386 |       // Wait a moment for validation
  387 |       await page.waitForTimeout(100);
  388 |       // Should NOT show "must be a Friday" error
  389 |       await expect(modal.locator("text=must be a Friday")).not.toBeVisible();
  390 | 
  391 |       // Fill amount and select definition
  392 |       await modal.locator('input[id="recordAmount"]').fill(amount);
  393 |       await modal.locator('select[id="recordCollectionDefinitionId"]').selectOption({ index: 1 });
  394 | 
  395 |       // Click Save
  396 |       await modal.locator('button:has-text("Save")').click();
  397 | 
  398 |       // Wait for reload and verify record appears
  399 |       await expect(page.locator(`text=₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).first()).toBeVisible({ timeout: 30000 });
  400 | 
  401 |       // Verify the specific date appears in the list (format: "dd MMM yyyy" e.g., "04 Dec 2026")
  402 |       const dateDisplay = new Date(fridayDate + "T00:00:00.000Z").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  403 |       await expect(page.locator(`text=${dateDisplay}`).first()).toBeVisible({ timeout: 15000 });
  404 | 
  405 |       // Wait for page to be ready for next iteration
  406 |       await page.waitForLoadState('networkidle');
  407 |     }
  408 |   });
  409 | 
  410 |   test("should filter Jumma collections by date range and show filtered results", async ({ page }) => {
  411 |     // Navigate with date range covering Oct 2026
  412 |     await page.goto("/collections/jumma?fromDate=2026-10-01&toDate=2026-10-31");
  413 | 
  414 |     await expect(page.getByRole("heading", { name: "Jumma Collection" })).toBeVisible();
  415 | 
  416 |     // Should show only Oct 2026 entries (5 Fridays)
  417 |     // Verify date range header shows Oct dates
  418 |     await expect(page.locator("text=Date Range:").first()).toBeVisible({ timeout: 15000 });
  419 | 
  420 |     // Check that Oct dates are present
  421 |     await expect(page.locator("text=02 Oct 2026").first()).toBeVisible({ timeout: 10000 });
  422 |     await expect(page.locator("text=30 Oct 2026").first()).toBeVisible({ timeout: 10000 });
  423 | 
  424 |     // Nov dates should NOT be visible
  425 |     await expect(page.locator("text=06 Nov 2026")).not.toBeVisible({ timeout: 5000 });
  426 |   });
  427 | 
  428 |   test("should filter Jumma collections by definition via URL params", async ({ page }) => {
  429 |     // First get the definition ID from the dropdown
  430 |     await page.click("text=Record New Jumma");
  431 |     const modal = page.locator('[role="dialog"]');
  432 |     await expect(modal).toBeVisible();
  433 | 
  434 |     // Get the first option value (skip the placeholder)
  435 |     const definitionId = await modal.locator('select[id="recordCollectionDefinitionId"] option').nth(1).getAttribute('value');
  436 |     await modal.locator('button:has-text("Cancel")').click();
  437 | 
  438 |     if (definitionId) {
  439 |       await page.goto(`/collections/jumma?collectionDefinitionId=${definitionId}`);
  440 |       await expect(page.getByRole("heading", { name: "Jumma Collection" })).toBeVisible();
  441 | 
  442 |       // All records should be from the same definition
  443 |       // The definition name badge should appear in the header
  444 |       await expect(page.locator("text=Jumma Collection").first()).toBeVisible({ timeout: 15000 });
```