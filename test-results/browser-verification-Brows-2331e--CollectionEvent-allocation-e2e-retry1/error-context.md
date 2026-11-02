# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: browser-verification.spec.ts >> Browser Verification - Phase 3 >> 7. Collections - New payment with CollectionEvent allocation
- Location: e2e\browser-verification.spec.ts:248:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Manual Event Test').first()
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('text=Manual Event Test').first() with timeout 10000ms
  - waiting for locator('text=Manual Event Test').first()

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
  - text: हुसैनी मस्जिद आलोट 02 Nov 2026 Language
  - button "English" [pressed]
  - button "हिन्दी"
  - button "اردو"
  - button "MA Masjid Admin"
- main:
  - heading "Receive payment" [level=1]
  - paragraph: Duplicate submissions are blocked automatically.
  - paragraph: Received from
  - radiogroup:
    - radio "Choose member"
    - radio "Walk-in donor" [checked]
  - text: Walk-in donor
  - textbox "Walk-in donor":
    - /placeholder: Anonymous donor
    - text: Test Walk-in Donor
  - paragraph: Amount (₹)
  - text: Amount in Rupees
  - textbox "0": "250"
  - group "Quick amounts":
    - button "15.00"
    - button "100.00"
    - button "100.00"
    - button "100.00"
    - button "100.00"
  - paragraph: Mode
  - radiogroup "Payment mode":
    - radio "Cash" [checked]
    - radio "UPI"
    - radio "Bank"
    - radio "Other"
  - paragraph: Purpose
  - button "Add allocation" [disabled]
  - button "Test Monthly Chanda" [disabled]
  - text: Amount
  - textbox "0.00"
  - button "Cancel"
  - text: Date
  - textbox "Date": 2026-11-02
  - text: Notes (optional)
  - textbox "Notes (optional)"
  - status "Receipt preview":
    - img
    - img
    - img
    - heading "हुसैनी मस्जिद आलोट" [level=1]
    - text: Pramila Ganj Alote | 8871997756 रसीद 1 रसीद संख्या Auto-generated 2 दिनांक 02-11-2026 3 मोहतरम जनाब Test Walk-in Donor 4 रुपये शब्दों में Rupees Two Hundred Fifty Only 5 आवंटन श्रेणी Test Monthly Chanda 6 भुगतान का तरीका
    - checkbox "कैश" [checked] [disabled]
    - text: कैश
    - checkbox "यूपीआई" [disabled]
    - text: यूपीआई
    - checkbox "बैंक ट्रांसफर" [disabled]
    - text: बैंक ट्रांसफर
    - checkbox "अन्य" [disabled]
    - text: अन्य
    - paragraph: प्राप्त राशि
    - paragraph: रु. 250.00/-
    - paragraph: Rupees Two Hundred Fifty Only
    - paragraph:
      - text: "प्राप्तकर्ता:"
      - strong: Collector
    - paragraph: अधिकृत हस्ताक्षर
    - paragraph: धन्यवाद! आपका योगदान सराहनीय है।
  - text: Total ₹250.00 Allocated ₹0.00 Unallocated ₹250.00
  - button "Confirm and issue receipt" [disabled]
  - paragraph: Duplicate submissions are blocked automatically.
- alert
```

# Test source

```ts
  184 |     // The search results render checkboxes inside labels - look for them in the results div
  185 |     const resultsDiv = assignForm.locator('div.max-h-52.overflow-y-auto');
  186 |     await expect(resultsDiv).toBeVisible();
  187 | 
  188 |     // Look for checkboxes in the results
  189 |     const checkboxes = resultsDiv.locator('input[type="checkbox"]');
  190 |     const checkboxCount = await checkboxes.count();
  191 |     console.log('Checkbox count:', checkboxCount);
  192 | 
  193 |     if (checkboxCount === 0) {
  194 |       // No members found - need to create one first
  195 |       console.log('No members found, creating a test member...');
  196 |       await page.goto(`${BASE_URL}/members/new`);
  197 |       await page.waitForTimeout(500);
  198 | 
  199 |       await page.fill('input[name="fullName"]', "Test Member For Assignment");
  200 |       await page.fill('input[name="fatherName"]', "Father Name");
  201 |       const uniquePhone = `9${String(Date.now()).slice(-9)}`;
  202 |       await page.fill('input[name="phone"]', uniquePhone);
  203 |       await page.fill('textarea[name="address"]', "Test Address");
  204 |       await page.fill('input[name="joinDate"]', "2026-01-01");
  205 | 
  206 |       await page.click('button:has-text("Save")');
  207 |       await page.waitForTimeout(2000);
  208 | 
  209 |       // Go back to settings and re-open assign form
  210 |       await page.goto(`${BASE_URL}/settings?tab=contributionCategories`);
  211 |       await page.waitForTimeout(500);
  212 |       const assignBtn2 = page.getByRole("button", { name: "Assign households" }).first();
  213 |       await expect(assignBtn2).toBeVisible({ timeout: 10000 });
  214 |       await assignBtn2.click();
  215 |       await page.waitForTimeout(500);
  216 | 
  217 |       const assignForm2 = page.locator("form").filter({ hasText: "Expected amount per household" });
  218 |       await assignForm2.locator('input[type="search"]').fill("Test Member");
  219 |       await page.waitForTimeout(3000);
  220 | 
  221 |       const resultsDiv2 = assignForm2.locator('div.max-h-52.overflow-y-auto');
  222 |       const checkboxes2 = resultsDiv2.locator('input[type="checkbox"]');
  223 |       const checkboxCount2 = await checkboxes2.count();
  224 |       console.log('Checkbox count after creating member:', checkboxCount2);
  225 | 
  226 |       if (checkboxCount2 > 0) {
  227 |         await checkboxes2.first().click();
  228 |       }
  229 | 
  230 |       // Set expected amount per household (spinbutton)
  231 |       await assignForm2.locator('input[name="expectedAmountPaise"]').fill("15000");
  232 |       await assignForm2.getByRole("button", { name: "Assign households" }).click();
  233 |       await page.waitForTimeout(1500);
  234 |     } else {
  235 |       await checkboxes.first().click();
  236 | 
  237 |       // Set expected amount per household (spinbutton)
  238 |       await assignForm.locator('input[name="expectedAmountPaise"]').fill("15000");
  239 | 
  240 |       await assignForm.getByRole("button", { name: "Assign households" }).click();
  241 |       await page.waitForTimeout(1500);
  242 |     }
  243 | 
  244 |     // Verify assignment appears - the member created in "Create member works" test is "Test Member Browser"
  245 |     await expect(page.getByText("Test Member Browser").first()).toBeVisible();
  246 |   });
  247 | 
  248 |   test("7. Collections - New payment with CollectionEvent allocation", async ({ page }) => {
  249 |     await page.goto(`${BASE_URL}/collections/new`);
  250 |     await page.waitForTimeout(500);
  251 | 
  252 |     // Click "Walk-in donor" segmented control first to show the walk-in input
  253 |     await page.click('button:has-text("Walk-in donor")');
  254 |     await page.waitForTimeout(300);
  255 | 
  256 |     // Use walk-in donor since member search may not have data loaded in test context
  257 |     const walkInInput = page.locator('#walkIn');
  258 |     await expect(walkInInput).toBeVisible();
  259 |     await walkInInput.fill("Test Walk-in Donor");
  260 |     await page.waitForTimeout(300);
  261 | 
  262 |     // Fill payment details - amount input uses placeholder "0" (main amount input)
  263 |     await page.fill('input[placeholder="0"]', "250"); // 250 INR
  264 | 
  265 |     // Click "Add allocation" button to open purpose selector
  266 |     const addAllocBtn = page.locator('button:has-text("Add allocation")').first();
  267 |     await expect(addAllocBtn).toBeVisible({ timeout: 10000 });
  268 |     await addAllocBtn.click();
  269 |     await page.waitForTimeout(1000);
  270 | 
  271 |     // Find and click any Manual Event Test button in the allocation popover
  272 |     // (The event created in test 5 may not appear due to caching; use first available)
  273 |     const eventBtn = page.locator('button:has-text("Manual Event Test")').first();
  274 |     await expect(eventBtn).toBeVisible({ timeout: 15000 });
  275 |     // Use JavaScript to find and click the button by text to bypass viewport constraints
  276 |     await page.evaluate(() => {
  277 |       const buttons = Array.from(document.querySelectorAll('button'));
  278 |       const target = buttons.find(b => b.textContent?.includes('Manual Event Test'));
  279 |       if (target) target.click();
  280 |     });
  281 |     await page.waitForTimeout(500);
  282 | 
  283 |     // Verify allocation was added - check that ANY manual event allocation row appears
> 284 |     await expect(page.locator('text=Manual Event Test').first()).toBeVisible({ timeout: 10000 });
      |                                                                  ^ Error: expect(locator).toBeVisible() failed
  285 | 
  286 |     // Adjust allocation amount to 200 (the event's expected amount in INR)
  287 |     // The allocation inputs have placeholder "0.00" (first one is main amount with "0")
  288 |     await page.locator('input[placeholder="0.00"]').first().fill("200");
  289 |     await page.waitForTimeout(300);
  290 | 
  291 |     // Submit payment - the button is labelled "Confirm and issue receipt"
  292 |     await page.click('button:has-text("Confirm and issue receipt")');
  293 |     await page.waitForTimeout(2000);
  294 | 
  295 |     // Should redirect to review page
  296 |     await expect(page).toHaveURL(/.*collections\/review/);
  297 |   });
  298 | 
  299 |   test("8. Reports - Collection Events tab shows correct totals", async ({ page }) => {
  300 |     await page.goto(`${BASE_URL}/reports`);
  301 |     await page.waitForTimeout(500);
  302 | 
  303 |     // Click Collection Events tab - it's a link, not a button
  304 |     await page.click('a:has-text("Collection Events")');
  305 |     await page.waitForTimeout(500);
  306 | 
  307 |     // Verify the table shows events with totals
  308 |     await expect(page.locator("table")).toBeVisible();
  309 |     // Verify the table has at least one row of data
  310 |     const rows = page.locator("table tbody tr");
  311 |     await expect(rows.first()).toBeVisible({ timeout: 10000 });
  312 |   });
  313 | 
  314 |   test("9. Verify no double-counting in reports", async ({ page }) => {
  315 |     await page.goto(`${BASE_URL}/reports?report=event`);
  316 |     await page.waitForTimeout(500);
  317 | 
  318 |     const rows = page.locator("table tbody tr");
  319 |     const count = await rows.count();
  320 |     expect(count).toBeGreaterThan(0);
  321 | 
  322 |     // Each event row must show the same figure in "Expected amount" and "Outstanding"
  323 |     // when nothing was received - if the total double-counted, Outstanding would
  324 |     // be twice the expected amount.
  325 |     const eventRows = page.locator("table tbody tr").filter({ hasText: "Manual Event Test" });
  326 |     const eventRowCount = await eventRows.count();
  327 |     expect(eventRowCount).toBeGreaterThan(0);
  328 | 
  329 |     const expected = await eventRows.first().locator("td").nth(3).innerText();
  330 |     const outstanding = await eventRows.first().locator("td").nth(5).innerText();
  331 |     expect(outstanding).toBe(expected);
  332 |   });
  333 | 
  334 |   test("10. Portal - Member profile page redirects staff to dashboard", async ({ page }) => {
  335 |     // Staff users cannot access portal - should redirect to dashboard
  336 |     await page.goto(`${BASE_URL}/portal/profile`);
  337 |     await page.waitForTimeout(1000);
  338 |     await expect(page).toHaveURL(/\/dashboard/);
  339 |     await expect(page.locator("h1:has-text('Dashboard')").first()).toBeVisible();
  340 |   });
  341 | });
  342 | 
  343 | test.describe.serial("Regression Tests - Phase 4", () => {
  344 |   test.beforeEach(async ({ page }) => {
  345 |     // Skip manual login - using global auth state from storageState
  346 |     // Just verify we're authenticated by going to dashboard
  347 |     await page.goto(`${BASE_URL}/dashboard`);
  348 |     await expect(page.locator("h1").first()).toBeVisible({ timeout: 10000 });
  349 |   });
  350 | 
  351 |   test("Dashboard loads without errors", async ({ page }) => {
  352 |     await page.goto(`${BASE_URL}/dashboard`);
  353 |     await expect(page.locator("h1").first()).toBeVisible({ timeout: 5000 });
  354 |   });
  355 | 
  356 |   test("Members page loads", async ({ page }) => {
  357 |     await page.goto(`${BASE_URL}/members`);
  358 |     await expect(page.locator("h1").first()).toBeVisible({ timeout: 5000 });
  359 |   });
  360 | 
  361 |   test("Create member works", async ({ page }) => {
  362 |     await page.goto(`${BASE_URL}/members/new`);
  363 |     await page.waitForTimeout(500);
  364 | 
  365 |     // Check for form fields
  366 |     const fullNameInput = page.locator('input[name="fullName"]');
  367 |     await expect(fullNameInput).toBeVisible({ timeout: 10000 });
  368 | 
  369 |     const uniquePhone = `9${String(Date.now()).slice(-9)}`;
  370 |     await page.fill('input[name="fullName"]', "Test Member Browser");
  371 |     await page.fill('input[name="fatherName"]', "Father Name");
  372 |     await page.fill('input[name="phone"]', uniquePhone);
  373 |     // The address rule renders a textarea, not an input
  374 |     await page.fill('textarea[name="address"]', "Test Address");
  375 |     await page.fill('input[name="joinDate"]', "2026-01-01");
  376 | 
  377 |     await page.click('button:has-text("Save")');
  378 | 
  379 |     // Wait for navigation to member detail page OR error message
  380 |     try {
  381 |       await page.waitForURL(/\/members\/[a-z0-9]+$/, { timeout: 10000 });
  382 |       await page.waitForLoadState('networkidle');
  383 |       await page.waitForTimeout(1000);
  384 | 
```