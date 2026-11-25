# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: browser-verification.spec.ts >> Browser Verification - Phase 3 >> 10. Collection Definition - Base Category Change Clears Subcategory
- Location: e2e\browser-verification.spec.ts:248:7

# Error details

```
TimeoutError: page.selectOption: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('select[name="subcategoryId"]')
    - locator resolved to <select required="" id="subcategoryId" name="subcategoryId" class="w-full min-w-0 rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2.5 text-base text-[var(--ink)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)] h-11 max-w-full">…</select>
  - attempting select option action
    2 × waiting for element to be visible and enabled
      - did not find some options
    - retrying select option action
    - waiting 20ms
    2 × waiting for element to be visible and enabled
      - did not find some options
    - retrying select option action
      - waiting 100ms
    29 × waiting for element to be visible and enabled
       - did not find some options
     - retrying select option action
       - waiting 500ms

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
        - link "Due Status Overview" [ref=e37] [cursor=pointer]:
          - /url: /collections/due-status
        - link "Transactions" [ref=e44] [cursor=pointer]:
          - /url: /transactions
        - link "Expenses" [ref=e49] [cursor=pointer]:
          - /url: /expenses
        - link "Reports" [ref=e55] [cursor=pointer]:
          - /url: /reports
        - link "Settings" [ref=e60] [cursor=pointer]:
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
          - heading [level=1]
          - paragraph [ref=e110]: हुसैनी मस्जिद आलोट
        - generic [ref=e111]:
          - generic [ref=e112]:
            - button "Masjid Details" [ref=e113]
            - button "Collections" [ref=e118]
            - button "Expense Categories" [ref=e123]
            - button "Notifications" [ref=e126]
            - button "Staff" [ref=e130]
            - button "Prayer Times" [ref=e135]
          - generic [ref=e140]:
            - generic [ref=e141]:
              - button "Collection Definitions" [ref=e142]
              - button "Collection Events" [ref=e147]
              - button "Assignments" [ref=e150]
            - generic [ref=e157]:
              - generic [ref=e159]:
                - generic [ref=e160]:
                  - generic [ref=e161]:
                    - generic [ref=e162]: Name
                    - textbox "Name" [active] [ref=e163]:
                      - /placeholder: e.g. Monthly Chanda
                      - text: Test Clear Subcategory
                  - generic [ref=e164]:
                    - generic [ref=e165]: Description
                    - textbox "Description" [ref=e166]:
                      - /placeholder: ""
                  - generic [ref=e167]:
                    - generic [ref=e168]: Base Category
                    - combobox "Base Category" [ref=e169]:
                      - option "Annual"
                      - option "Construction" [selected]
                      - option "General"
                      - option "Jumma"
                      - option "Monthly"
                      - option "Sadaqah"
                      - option "Zakat"
                  - generic [ref=e170]:
                    - generic [ref=e171]: Subcategory
                    - combobox "Subcategory" [ref=e172]:
                      - option "Restricted" [selected]
                  - generic [ref=e173]:
                    - generic [ref=e174]: Active
                    - checkbox "Active" [checked] [ref=e175]
                  - generic [ref=e176]:
                    - generic [ref=e177]: Show in Payment Received
                    - checkbox "Show in Payment Received" [checked] [ref=e178]
                  - generic [ref=e179]:
                    - generic [ref=e180]: Frequency
                    - combobox "Frequency" [ref=e181]:
                      - option "Weekly"
                      - option "Monthly" [selected]
                      - option "Quarterly"
                      - option "Semi-annual"
                      - option "Annual"
                      - option "Event-based"
                      - option "One-Time"
                  - generic [ref=e182]:
                    - generic [ref=e183]: Amount Type
                    - combobox "Amount Type" [ref=e184]:
                      - option "Fixed Amount"
                      - option "Variable Amount" [selected]
                  - generic [ref=e185]:
                    - generic [ref=e186]: Default amount
                    - spinbutton "Default amount" [ref=e187]
                  - generic [ref=e188]:
                    - generic [ref=e189]: Donor Eligibility
                    - combobox "Donor Eligibility" [ref=e190]:
                      - option "Members Only"
                      - option "Walk-in Only"
                      - option "Both Members & Walk-ins" [selected]
                  - generic [ref=e191]:
                    - generic [ref=e192]: Member Assignment
                    - combobox "Member Assignment" [ref=e193]:
                      - option "All Eligible Members" [selected]
                      - option "Selected Members"
                  - generic [ref=e194]:
                    - generic [ref=e195]: Due Generation
                    - combobox "Due Generation" [ref=e196]:
                      - option "Admin Generated" [selected]
                      - option "Automatic"
                  - generic [ref=e197]:
                    - generic [ref=e198]: Settlement Policy
                    - combobox "Settlement Policy" [ref=e199]:
                      - option "Oldest First (FIFO)" [selected]
                      - option "Any Pending Period"
                - generic [ref=e200]:
                  - button "Save" [ref=e201]
                  - button "Cancel" [ref=e203]
              - generic [ref=e207]:
                - generic [ref=e208]:
                  - heading "Collection Definitions" [level=2] [ref=e209]
                  - button "Cancel" [ref=e210]
                - list [ref=e213]:
                  - listitem [ref=e214]:
                    - generic [ref=e215]:
                      - generic [ref=e216]:
                        - paragraph [ref=e217]: Milad-un-Nabi
                        - paragraph [ref=e218]: ANNUAL · GENERAL · MILAD_UN_NABI · Both Members & Walk-ins · All Eligible Members · Admin Generated · Oldest First (FIFO)
                      - generic [ref=e219]:
                        - generic [ref=e220]: Active
                        - generic [ref=e221]: Show in Payment Received
                        - generic [ref=e222]: Annual
                        - generic [ref=e223]: Fixed Amount
                        - generic [ref=e224]: ₹1000
                        - generic [ref=e225]:
                          - button "Edit" [ref=e226]
                          - button "Delete" [ref=e230]
                  - listitem [ref=e234]:
                    - generic [ref=e235]:
                      - generic [ref=e236]:
                        - paragraph [ref=e237]: Monthly Chanda
                        - paragraph [ref=e238]: MONTHLY · RECURRING_DONATION · MONTHLY_CHANDA · Members Only · All Eligible Members · Admin Generated · Oldest First (FIFO)
                      - generic [ref=e239]:
                        - generic [ref=e240]: Active
                        - generic [ref=e241]: Show in Payment Received
                        - generic [ref=e242]: Monthly
                        - generic [ref=e243]: Fixed Amount
                        - generic [ref=e244]: ₹150
                        - generic [ref=e245]:
                          - button "Edit" [ref=e246]
                          - button "Delete" [ref=e250]
                  - listitem [ref=e254]:
                    - generic [ref=e255]:
                      - generic [ref=e256]:
                        - paragraph [ref=e257]: Shab-e-Qadr
                        - paragraph [ref=e258]: ANNUAL · RECURRING_DONATION · SHAB_E_QADR · Both Members & Walk-ins · All Eligible Members · Admin Generated · Oldest First (FIFO)
                      - generic [ref=e259]:
                        - generic [ref=e260]: Active
                        - generic [ref=e261]: Show in Payment Received
                        - generic [ref=e262]: Annual
                        - generic [ref=e263]: Fixed Amount
                        - generic [ref=e264]: ₹1000
                        - generic [ref=e265]:
                          - button "Edit" [ref=e266]
                          - button "Delete" [ref=e270]
                  - listitem [ref=e274]:
                    - generic [ref=e275]:
                      - generic [ref=e276]:
                        - paragraph [ref=e277]: abc
                        - paragraph [ref=e278]: ANNUAL · GENERAL · Both Members & Walk-ins · All Eligible Members · Admin Generated · Oldest First (FIFO)
                      - generic [ref=e279]:
                        - generic [ref=e280]: Active
                        - generic [ref=e281]: Hidden in Payment Received
                        - generic [ref=e282]: Monthly
                        - generic [ref=e283]: Variable Amount
                        - generic [ref=e284]:
                          - button "Edit" [ref=e285]
                          - button "Delete" [ref=e289]
                  - listitem [ref=e293]:
                    - generic [ref=e294]:
                      - generic [ref=e295]:
                        - paragraph [ref=e296]: Annual Chanda
                        - paragraph [ref=e297]: ANNUAL · RECURRING_DONATION · ANNUAL_CHANDA · Members Only · All Eligible Members · Automatic · Oldest First (FIFO)
                      - generic [ref=e298]:
                        - generic [ref=e299]: Active
                        - generic [ref=e300]: Hidden in Payment Received
                        - generic [ref=e301]: Annual
                        - generic [ref=e302]: Variable Amount
                        - generic [ref=e303]:
                          - button "Edit" [ref=e304]
                          - button "Delete" [ref=e308]
                  - listitem [ref=e312]:
                    - generic [ref=e313]:
                      - generic [ref=e314]:
                        - paragraph [ref=e315]: Construction Fund
                        - paragraph [ref=e316]: CONSTRUCTION · RESTRICTED · CONSTRUCTION_FUND · Both Members & Walk-ins · Selected Members · Admin Generated · Any Pending Period
                      - generic [ref=e317]:
                        - generic [ref=e318]: Active
                        - generic [ref=e319]: Hidden in Payment Received
                        - generic [ref=e320]: Event-based
                        - generic [ref=e321]: Variable Amount
                        - generic [ref=e322]:
                          - button "Edit" [ref=e323]
                          - button "Delete" [ref=e327]
                  - listitem [ref=e331]:
                    - generic [ref=e332]:
                      - generic [ref=e333]:
                        - paragraph [ref=e334]: General Donation
                        - paragraph [ref=e335]: GENERAL · GENERAL · GENERAL_DONATION · Both Members & Walk-ins · Selected Members · Admin Generated · Any Pending Period
                      - generic [ref=e336]:
                        - generic [ref=e337]: Active
                        - generic [ref=e338]: Hidden in Payment Received
                        - generic [ref=e339]: One-Time
                        - generic [ref=e340]: Variable Amount
                        - generic [ref=e341]:
                          - button "Edit" [ref=e342]
                          - button "Delete" [ref=e346]
                  - listitem [ref=e350]:
                    - generic [ref=e351]:
                      - generic [ref=e352]:
                        - paragraph [ref=e353]: Jumma Collection
                        - paragraph [ref=e354]: JUMMA · RECURRING_DONATION · JUMMA_COLLECTION · Both Members & Walk-ins · Selected Members · Admin Generated · Any Pending Period
                      - generic [ref=e355]:
                        - generic [ref=e356]: Active
                        - generic [ref=e357]: Hidden in Payment Received
                        - generic [ref=e358]: Weekly
                        - generic [ref=e359]: Fixed Amount
                        - generic [ref=e360]: ₹10
                        - generic [ref=e361]:
                          - button "Edit" [ref=e362]
                          - button "Delete" [ref=e366]
                  - listitem [ref=e370]:
                    - generic [ref=e371]:
                      - generic [ref=e372]:
                        - paragraph [ref=e373]: Test Edit Name Prefill
                        - paragraph [ref=e374]: MONTHLY · RECURRING_DONATION · Members Only · All Eligible Members · Automatic · Oldest First (FIFO)
                      - generic [ref=e375]:
                        - generic [ref=e376]: Active
                        - generic [ref=e377]: Hidden in Payment Received
                        - generic [ref=e378]: Monthly
                        - generic [ref=e379]: Variable Amount
                        - generic [ref=e380]:
                          - button "Edit" [ref=e381]
                          - button "Delete" [ref=e385]
                  - listitem [ref=e389]:
                    - generic [ref=e390]:
                      - generic [ref=e391]:
                        - paragraph [ref=e392]: Zakat
                        - paragraph [ref=e393]: ZAKAT · RESTRICTED · ZAKAT · Members Only · Selected Members · Admin Generated · Any Pending Period
                      - generic [ref=e394]:
                        - generic [ref=e395]: Active
                        - generic [ref=e396]: Hidden in Payment Received
                        - generic [ref=e397]: Annual
                        - generic [ref=e398]: Variable Amount
                        - generic [ref=e399]:
                          - button "Edit" [ref=e400]
                          - button "Delete" [ref=e404]
  - button "Open Next.js Dev Tools" [ref=e413] [cursor=pointer]
  - alert [ref=e417]
```

# Test source

```ts
  158 |     if (baseCategoryValue && subcategoryValue) {
  159 |       console.log('Base category:', baseCategoryValue, 'Subcategory:', subcategoryValue);
  160 |     }
  161 | 
  162 |     // Cancel edit
  163 |     await page.click('button:has-text("Cancel")');
  164 |     await page.waitForTimeout(500);
  165 |   });
  166 | 
  167 |   test("7. Duplicate Collection Definition Name Rejection", async ({ page }) => {
  168 |     await page.goto(`${BASE_URL}/settings?tab=collections`);
  169 |     await page.waitForTimeout(500);
  170 | 
  171 |     await page.click('button:has-text("Add Collection Definition")');
  172 |     await page.waitForTimeout(500);
  173 | 
  174 |     await page.fill('input[name="name"]', "Duplicate Test");
  175 |     await page.selectOption('select[name="baseCategoryId"]', { index: 1 });
  176 |     await page.waitForTimeout(300);
  177 |     await page.selectOption('select[name="subcategoryId"]', { index: 1 });
  178 |     await page.selectOption('select[name="frequency"]', "MONTHLY");
  179 |     await page.selectOption('select[name="amountType"]', "FIXED");
  180 |     await page.fill('input[name="defaultAmountPaise"]', "10000");
  181 |     await page.selectOption('select[name="donorEligibility"]', "MEMBERS_ONLY");
  182 |     await page.selectOption('select[name="memberAssignment"]', "ALL_ELIGIBLE");
  183 |     await page.selectOption('select[name="dueGeneration"]', "ADMIN");
  184 |     await page.selectOption('select[name="settlementPolicy"]', "OLDEST_FIRST");
  185 | 
  186 |     await page.click('button:has-text("Save")');
  187 |     await page.waitForTimeout(2000);
  188 | 
  189 |     await expect(page.locator("text=Test Subcategory Filter")).toBeVisible();
  190 | 
  191 |     // Try to create another with same name
  192 |     await page.click('button:has-text("Add Collection Definition")');
  193 |     await page.waitForTimeout(500);
  194 | 
  195 |     await page.fill('input[name="name"]', "Duplicate Test");
  196 |     await page.selectOption('select[name="baseCategoryId"]', { index: 1 });
  197 |     await page.waitForTimeout(300);
  198 |     await page.selectOption('select[name="subcategoryId"]', { index: 1 });
  199 |     await page.selectOption('select[name="frequency"]', "MONTHLY");
  200 |     await page.selectOption('select[name="amountType"]', "FIXED");
  201 |     await page.fill('input[name="defaultAmountPaise"]', "10000");
  202 |     await page.selectOption('select[name="donorEligibility"]', "MEMBERS_ONLY");
  203 |     await page.selectOption('select[name="memberAssignment"]', "ALL_ELIGIBLE");
  204 |     await page.selectOption('select[name="dueGeneration"]', "ADMIN");
  205 |     await page.selectOption('select[name="settlementPolicy"]', "OLDEST_FIRST");
  206 | 
  207 |     await page.click('button:has-text("Save")');
  208 |     await page.waitForTimeout(2000);
  209 | 
  210 |     // Should show error about duplicate
  211 |     await expect(page.locator("text=already exists")).toBeVisible();
  212 |   });
  213 | 
  214 |   test("8. Collection Definition Delete Works", async ({ page }) => {
  215 |     await page.goto(`${BASE_URL}/settings?tab=collections`);
  216 |     await page.waitForTimeout(500);
  217 | 
  218 |     // Find the "Duplicate Test" category and delete it
  219 |     const duplicateRow = page.locator('text=Duplicate Test').first().locator('..').locator('..');
  220 |     await duplicateRow.locator('button:has-text("Delete")').click();
  221 |     await page.waitForTimeout(500);
  222 | 
  223 |     // Verify it's gone
  224 |     await expect(page.locator("text=Duplicate Test")).not.toBeVisible({ timeout: 5000 });
  225 |   });
  226 | 
  227 |   test("9. Collection Definition - Cancel Edit Preserves Data", async ({ page }) => {
  228 |     await page.goto(`${BASE_URL}/settings?tab=collections`);
  229 |     await page.waitForTimeout(500);
  230 | 
  231 |     // Click edit on first item
  232 |     const firstEditBtn = page.locator('button:has-text("Edit")').first();
  233 |     await firstEditBtn.click();
  234 |     await page.waitForTimeout(500);
  235 | 
  236 |     // Modify something
  237 |     await page.fill('input[name="name"]', "Modified Name");
  238 | 
  239 |     // Click cancel
  240 |     await page.click('button:has-text("Cancel")');
  241 |     await page.waitForTimeout(500);
  242 | 
  243 |     // Original name should still be there (not modified)
  244 |     await expect(page.locator("text=Test Subcategory Filter")).toBeVisible();
  245 |     await expect(page.locator("text=Modified Name")).not.toBeVisible();
  246 |   });
  247 | 
  248 |   test("10. Collection Definition - Base Category Change Clears Subcategory", async ({ page }) => {
  249 |     await page.goto(`${BASE_URL}/settings?tab=collections`);
  250 |     await page.waitForTimeout(500);
  251 | 
  252 |     await page.click('button:has-text("Add Collection Definition")');
  253 |     await page.waitForTimeout(500);
  254 | 
  255 |     await page.fill('input[name="name"]', "Test Clear Subcategory");
  256 |     await page.selectOption('select[name="baseCategoryId"]', { index: 1 });
  257 |     await page.waitForTimeout(300);
> 258 |     await page.selectOption('select[name="subcategoryId"]', { index: 1 });
      |                ^ TimeoutError: page.selectOption: Timeout 15000ms exceeded.
  259 | 
  260 |     // Change base category
  261 |     await page.selectOption('select[name="baseCategoryId"]', { index: 2 });
  262 |     await page.waitForTimeout(500);
  263 | 
  264 |     // Subcategory should be cleared/empty
  265 |     const subcategoryValue = await page.locator('select[name="subcategoryId"]').inputValue();
  266 |     if (subcategoryValue !== "") {
  267 |       console.log('Subcategory was not cleared:', subcategoryValue);
  268 |     }
  269 |     // Should be empty or different options
  270 | 
  271 |     // Cancel
  272 |     await page.click('button:has-text("Cancel")');
  273 |     await page.waitForTimeout(500);
  274 |   });
  275 | 
  276 |   // ============================================
  277 |   // REGRESSION TESTS - PHASE 4 (Expenses & Settings)
  278 |   // ============================================
  279 | 
  280 |   test("Expenses page loads", async ({ page }) => {
  281 |     await page.goto(`${BASE_URL}/expenses`);
  282 |     await expect(page.locator("h1").first()).toBeVisible({ timeout: 5000 });
  283 |   });
  284 | 
  285 |   test("Create expense category works", async ({ page }) => {
  286 |     await page.goto(`${BASE_URL}/settings?tab=expenseCategories`);
  287 |     await page.waitForTimeout(500);
  288 | 
  289 |     // The button text is "Add Expense Category" on this tab
  290 |     await page.click('button:has-text("Add Expense Category")');
  291 |     await page.waitForTimeout(300);
  292 | 
  293 |     await page.fill('input[name="name"]', "Test Expense");
  294 |     await page.click('button:has-text("Save")');
  295 |     await page.waitForTimeout(500);
  296 | 
  297 |     await expect(page.locator("text=Test Expense")).toBeVisible();
  298 |   });
  299 | 
  300 |   test("Record an expense works", async ({ page }) => {
  301 |     await page.goto(`${BASE_URL}/expenses`);
  302 |     await page.waitForTimeout(500);
  303 | 
  304 |     // Verify the page loads
  305 |     await expect(page.locator("h1").first()).toBeVisible({ timeout: 5000 });
  306 | 
  307 |     // Select an expense category from the dropdown
  308 |     const categorySelect = page.locator('select[name="categoryId"]');
  309 |     await expect(categorySelect).toBeVisible();
  310 |     await categorySelect.selectOption({ index: 1 });
  311 |     await page.waitForTimeout(300);
  312 | 
  313 |     // Fill in expense details
  314 |     await page.fill('input[name="date"]', "2026-01-15");
  315 |     await page.fill('input[name="payee"]', "Test Payee");
  316 |     await page.fill('input[name="amount"]', "500"); // 500 INR
  317 |     await page.selectOption('select[name="mode"]', "CASH");
  318 |     await page.fill('input[name="referenceNo"]', "REF-001");
  319 |     await page.fill('textarea[name="description"]', "Test expense description");
  320 | 
  321 |     // Submit the expense
  322 |     await page.click('button:has-text("Save")');
  323 |     await page.waitForTimeout(3000);
  324 | 
  325 |     // Check for error message - if no error, test passes
  326 |     const errorMessage = page.locator('p[role="alert"]');
  327 |     const hasError = await errorMessage.count() > 0;
  328 | 
  329 |     if (hasError) {
  330 |       const errorText = await errorMessage.textContent();
  331 |       console.log("Expense form error:", errorText);
  332 |       throw new Error(`Expense submission failed: ${errorText}`);
  333 |     }
  334 | 
  335 |     // If no error, test passes - form was submitted successfully
  336 |     await page.waitForTimeout(1000);
  337 |   });
  338 | 
  339 |   test("Update expense category in settings works", async ({ page }) => {
  340 |     await page.goto(`${BASE_URL}/settings?tab=expenseCategories`);
  341 |     await page.waitForTimeout(1000);
  342 | 
  343 |     // First create a test category to update
  344 |     await page.click('button:has-text("Add Expense Category")');
  345 |     await page.waitForTimeout(500);
  346 | 
  347 |     // Use a truly unique name with random suffix to avoid conflicts
  348 |     const uniqueName = `Test Category ${Date.now().toString(36).replace(/\d/g, '').substring(0, 8)}`;
  349 |     await page.fill('input[name="name"]', uniqueName);
  350 | 
  351 |     // Submit the form via JavaScript to ensure it triggers the server action
  352 |     await page.evaluate(() => {
  353 |       const form = document.querySelector('form');
  354 |       if (form) form.requestSubmit();
  355 |     });
  356 | 
  357 |     // Wait for form submission and page reload (useReloadOnSuccess triggers reload)
  358 |     await page.waitForURL(/settings/, { timeout: 60000 });
```