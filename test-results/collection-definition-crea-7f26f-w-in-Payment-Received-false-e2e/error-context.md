# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: collection-definition-create-form-state.spec.ts >> Collection Definition Create Form State >> Test D - Save and Persistence: Show in Payment Received = false
- Location: e2e\collection-definition-create-form-state.spec.ts:208:7

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.waitForTimeout: Test timeout of 60000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=f1e1]:
  - generic [ref=f1e2]:
    - complementary [ref=f1e3]:
      - navigation "Main" [ref=f1e4]:
        - link "Dashboard" [ref=f1e5] [cursor=pointer]:
          - /url: /dashboard
        - link "Members" [ref=f1e13] [cursor=pointer]:
          - /url: /members
        - link "Contribution plans" [ref=f1e21] [cursor=pointer]:
          - /url: /plans
        - link "Receive payment" [ref=f1e28] [cursor=pointer]:
          - /url: /collections/new
        - link "Due Status Overview" [ref=f1e37] [cursor=pointer]:
          - /url: /collections/due-status
        - link "Transactions" [ref=f1e44] [cursor=pointer]:
          - /url: /transactions
        - link "Expenses" [ref=f1e49] [cursor=pointer]:
          - /url: /expenses
        - link "Reports" [ref=f1e55] [cursor=pointer]:
          - /url: /reports
        - link "Settings" [ref=f1e60] [cursor=pointer]:
          - /url: /settings
        - link "Staff" [ref=f1e67] [cursor=pointer]:
          - /url: /staff
        - link "Audit log" [ref=f1e73] [cursor=pointer]:
          - /url: /audit
    - generic [ref=f1e79]:
      - banner [ref=f1e80]:
        - generic [ref=f1e81]:
          - generic [ref=f1e87]: हुसैनी मस्जिद आलोट
          - generic [ref=f1e88]: 25 Nov 2026
        - generic [ref=f1e89]:
          - generic [ref=f1e91]:
            - generic [ref=f1e92]: Language
            - generic [ref=f1e97]:
              - button "English" [pressed] [ref=f1e98]
              - button "हिन्दी" [ref=f1e99]
              - button "اردو" [ref=f1e100]
          - button "MA Masjid Admin" [ref=f1e102]:
            - generic [ref=f1e103]: MA
            - generic [ref=f1e104]: Masjid Admin
      - main [ref=f1e107]:
        - generic [ref=f1e109]:
          - heading [level=1]
          - paragraph [ref=f1e110]: हुसैनी मस्जिद आलोट
        - generic [ref=f1e111]:
          - generic [ref=f1e112]:
            - button "Masjid Details" [ref=f1e113]
            - button "Collections" [ref=f1e118]
            - button "Expense Categories" [ref=f1e123]
            - button "Notifications" [ref=f1e126]
            - button "Staff" [ref=f1e130]
            - button "Prayer Times" [ref=f1e135]
          - generic [ref=f1e140]:
            - generic [ref=f1e141]:
              - button "Collection Definitions" [ref=f1e142]
              - button "Collection Events" [ref=f1e147]
              - button "Assignments" [ref=f1e150]
            - generic [ref=f1e158]:
              - generic [ref=f1e159]:
                - heading "Collection Definitions" [level=2] [ref=f1e160]
                - button "Add Collection Definition" [ref=f1e161]
              - list [ref=f1e164]:
                - listitem [ref=f1e165]:
                  - generic [ref=f1e166]:
                    - generic [ref=f1e167]:
                      - paragraph [ref=f1e168]: Milad-un-Nabi
                      - paragraph [ref=f1e169]: ANNUAL · GENERAL · MILAD_UN_NABI · Both Members & Walk-ins · All Eligible Members · Admin Generated · Oldest First (FIFO)
                    - generic [ref=f1e170]:
                      - generic [ref=f1e171]: Active
                      - generic [ref=f1e172]: Show in Payment Received
                      - generic [ref=f1e173]: Annual
                      - generic [ref=f1e174]: Fixed Amount
                      - generic [ref=f1e175]: ₹1000
                      - generic [ref=f1e176]:
                        - button "Edit" [ref=f1e177]
                        - button "Delete" [active] [ref=f1e181]
                - listitem [ref=f1e185]:
                  - generic [ref=f1e186]:
                    - generic [ref=f1e187]:
                      - paragraph [ref=f1e188]: Monthly Chanda
                      - paragraph [ref=f1e189]: MONTHLY · RECURRING_DONATION · MONTHLY_CHANDA · Members Only · All Eligible Members · Admin Generated · Oldest First (FIFO)
                    - generic [ref=f1e190]:
                      - generic [ref=f1e191]: Active
                      - generic [ref=f1e192]: Show in Payment Received
                      - generic [ref=f1e193]: Monthly
                      - generic [ref=f1e194]: Fixed Amount
                      - generic [ref=f1e195]: ₹150
                      - generic [ref=f1e196]:
                        - button "Edit" [ref=f1e197]
                        - button "Delete" [ref=f1e201]
                - listitem [ref=f1e205]:
                  - generic [ref=f1e206]:
                    - generic [ref=f1e207]:
                      - paragraph [ref=f1e208]: Shab-e-Qadr
                      - paragraph [ref=f1e209]: ANNUAL · RECURRING_DONATION · SHAB_E_QADR · Both Members & Walk-ins · All Eligible Members · Admin Generated · Oldest First (FIFO)
                    - generic [ref=f1e210]:
                      - generic [ref=f1e211]: Active
                      - generic [ref=f1e212]: Show in Payment Received
                      - generic [ref=f1e213]: Annual
                      - generic [ref=f1e214]: Fixed Amount
                      - generic [ref=f1e215]: ₹1000
                      - generic [ref=f1e216]:
                        - button "Edit" [ref=f1e217]
                        - button "Delete" [ref=f1e221]
                - listitem [ref=f1e225]:
                  - generic [ref=f1e226]:
                    - generic [ref=f1e227]:
                      - paragraph [ref=f1e228]: abc
                      - paragraph [ref=f1e229]: ANNUAL · GENERAL · Both Members & Walk-ins · All Eligible Members · Admin Generated · Oldest First (FIFO)
                    - generic [ref=f1e230]:
                      - generic [ref=f1e231]: Active
                      - generic [ref=f1e232]: Hidden in Payment Received
                      - generic [ref=f1e233]: Monthly
                      - generic [ref=f1e234]: Variable Amount
                      - generic [ref=f1e235]:
                        - button "Edit" [ref=f1e236]
                        - button "Delete" [ref=f1e240]
                - listitem [ref=f1e244]:
                  - generic [ref=f1e245]:
                    - generic [ref=f1e246]:
                      - paragraph [ref=f1e247]: Annual Chanda
                      - paragraph [ref=f1e248]: ANNUAL · RECURRING_DONATION · ANNUAL_CHANDA · Members Only · All Eligible Members · Automatic · Oldest First (FIFO)
                    - generic [ref=f1e249]:
                      - generic [ref=f1e250]: Active
                      - generic [ref=f1e251]: Hidden in Payment Received
                      - generic [ref=f1e252]: Annual
                      - generic [ref=f1e253]: Variable Amount
                      - generic [ref=f1e254]:
                        - button "Edit" [ref=f1e255]
                        - button "Delete" [ref=f1e259]
                - listitem [ref=f1e263]:
                  - generic [ref=f1e264]:
                    - generic [ref=f1e265]:
                      - paragraph [ref=f1e266]: Construction Fund
                      - paragraph [ref=f1e267]: CONSTRUCTION · RESTRICTED · CONSTRUCTION_FUND · Both Members & Walk-ins · Selected Members · Admin Generated · Any Pending Period
                    - generic [ref=f1e268]:
                      - generic [ref=f1e269]: Active
                      - generic [ref=f1e270]: Hidden in Payment Received
                      - generic [ref=f1e271]: Event-based
                      - generic [ref=f1e272]: Variable Amount
                      - generic [ref=f1e273]:
                        - button "Edit" [ref=f1e274]
                        - button "Delete" [ref=f1e278]
                - listitem [ref=f1e282]:
                  - generic [ref=f1e283]:
                    - generic [ref=f1e284]:
                      - paragraph [ref=f1e285]: General Donation
                      - paragraph [ref=f1e286]: GENERAL · GENERAL · GENERAL_DONATION · Both Members & Walk-ins · Selected Members · Admin Generated · Any Pending Period
                    - generic [ref=f1e287]:
                      - generic [ref=f1e288]: Active
                      - generic [ref=f1e289]: Hidden in Payment Received
                      - generic [ref=f1e290]: One-Time
                      - generic [ref=f1e291]: Variable Amount
                      - generic [ref=f1e292]:
                        - button "Edit" [ref=f1e293]
                        - button "Delete" [ref=f1e297]
                - listitem [ref=f1e301]:
                  - generic [ref=f1e302]:
                    - generic [ref=f1e303]:
                      - paragraph [ref=f1e304]: Jumma Collection
                      - paragraph [ref=f1e305]: JUMMA · RECURRING_DONATION · JUMMA_COLLECTION · Both Members & Walk-ins · Selected Members · Admin Generated · Any Pending Period
                    - generic [ref=f1e306]:
                      - generic [ref=f1e307]: Active
                      - generic [ref=f1e308]: Hidden in Payment Received
                      - generic [ref=f1e309]: Weekly
                      - generic [ref=f1e310]: Fixed Amount
                      - generic [ref=f1e311]: ₹10
                      - generic [ref=f1e312]:
                        - button "Edit" [ref=f1e313]
                        - button "Delete" [ref=f1e317]
                - listitem [ref=f1e321]:
                  - generic [ref=f1e322]:
                    - generic [ref=f1e323]:
                      - paragraph [ref=f1e324]: Test Edit Name Prefill
                      - paragraph [ref=f1e325]: MONTHLY · RECURRING_DONATION · Members Only · All Eligible Members · Automatic · Oldest First (FIFO)
                    - generic [ref=f1e326]:
                      - generic [ref=f1e327]: Active
                      - generic [ref=f1e328]: Hidden in Payment Received
                      - generic [ref=f1e329]: Monthly
                      - generic [ref=f1e330]: Variable Amount
                      - generic [ref=f1e331]:
                        - button "Edit" [ref=f1e332]
                        - button "Delete" [ref=f1e336]
                - listitem [ref=f1e340]:
                  - generic [ref=f1e341]:
                    - generic [ref=f1e342]:
                      - paragraph [ref=f1e343]: Zakat
                      - paragraph [ref=f1e344]: ZAKAT · RESTRICTED · ZAKAT · Members Only · Selected Members · Admin Generated · Any Pending Period
                    - generic [ref=f1e345]:
                      - generic [ref=f1e346]: Active
                      - generic [ref=f1e347]: Hidden in Payment Received
                      - generic [ref=f1e348]: Annual
                      - generic [ref=f1e349]: Variable Amount
                      - generic [ref=f1e350]:
                        - button "Edit" [ref=f1e351]
                        - button "Delete" [ref=f1e355]
  - button "Open Next.js Dev Tools" [ref=f1e364] [cursor=pointer]
  - alert [ref=f1e368]
```

# Test source

```ts
  130 |     await selectBaseCategory(page, "Annual");
  131 |     subLabels = await getSubcategoryOptions(page);
  132 |     expect(subLabels).toEqual(["General", "Recurring Donation"]);
  133 |   });
  134 | 
  135 |   test("Test C - Checkbox Toggle", async ({ page }) => {
  136 |     await openAddCollectionDefinitionForm(page);
  137 | 
  138 |     // Use getByRole to target only the checkbox (not the hidden input)
  139 |     const showInPaymentCheckbox = page.getByRole('checkbox', { name: 'Show in Payment Received' });
  140 |     const activeCheckbox = page.getByRole('checkbox', { name: 'Active' });
  141 | 
  142 |     const initialChecked = await showInPaymentCheckbox.isChecked();
  143 |     console.log('Initial Show in Payment Received:', initialChecked);
  144 | 
  145 |     const initialActiveChecked = await activeCheckbox.isChecked();
  146 |     console.log('Initial Active:', initialActiveChecked);
  147 | 
  148 |     // Uncheck Show in Payment Received
  149 |     if (initialChecked) {
  150 |       await showInPaymentCheckbox.uncheck();
  151 |       await page.waitForTimeout(300);
  152 |     }
  153 |     const afterUncheck = await showInPaymentCheckbox.isChecked();
  154 |     expect(afterUncheck).toBe(false);
  155 | 
  156 |     // Trigger React re-render by changing other form fields
  157 |     await page.fill('input[name="name"]', "Test Checkbox Toggle");
  158 |     await page.waitForTimeout(300);
  159 | 
  160 |     // Verify Show in Payment Received remains unchecked
  161 |     const afterRender = await showInPaymentCheckbox.isChecked();
  162 |     expect(afterRender).toBe(false);
  163 | 
  164 |     // Verify Active checkbox maintains its independent state
  165 |     const activeAfterRender = await activeCheckbox.isChecked();
  166 |     expect(activeAfterRender).toBe(initialActiveChecked);
  167 | 
  168 |     // Re-check Show in Payment Received
  169 |     await showInPaymentCheckbox.check();
  170 |     await page.waitForTimeout(300);
  171 |     const afterRecheck = await showInPaymentCheckbox.isChecked();
  172 |     expect(afterRecheck).toBe(true);
  173 | 
  174 |     // Change Base Category to trigger another re-render
  175 |     await selectBaseCategory(page, "Construction");
  176 |     await page.waitForTimeout(300);
  177 |     const afterBaseChange = await showInPaymentCheckbox.isChecked();
  178 |     expect(afterBaseChange).toBe(true);
  179 | 
  180 |     // Verify the form can be submitted with showInPaymentReceived = false
  181 |     await openAddCollectionDefinitionForm(page);
  182 |     const showInPaymentCheckbox2 = page.getByRole('checkbox', { name: 'Show in Payment Received' });
  183 |     await showInPaymentCheckbox2.uncheck();
  184 |     await page.waitForTimeout(300);
  185 | 
  186 |     // Fill required fields
  187 |     await page.fill('input[name="name"]', "Test Checkbox False");
  188 |     await selectBaseCategory(page, "Annual");
  189 |     await selectSubcategory(page, "Recurring Donation");
  190 |     await page.selectOption('select[name="frequency"]', "MONTHLY");
  191 |     await page.selectOption('select[name="amountType"]', "VARIABLE");
  192 |     await page.selectOption('select[name="donorEligibility"]', "MEMBERS_ONLY");
  193 |     await page.selectOption('select[name="memberAssignment"]', "ALL_ELIGIBLE");
  194 |     await page.selectOption('select[name="dueGeneration"]', "AUTOMATIC");
  195 |     await page.selectOption('select[name="settlementPolicy"]', "OLDEST_FIRST");
  196 | 
  197 |     // Intercept form submission to inspect payload
  198 |     let capturedFormData: FormData | null = null;
  199 |     page.on('console', msg => {
  200 |       if (msg.type() === 'log' && msg.text().includes('FormData entries')) {
  201 |         console.log('Form submit log:', msg.text());
  202 |       }
  203 |     });
  204 | 
  205 |     // We'll verify the actual submitted value by checking the database after creation
  206 |   });
  207 | 
  208 |   test("Test D - Save and Persistence: Show in Payment Received = false", async ({ page }) => {
  209 |     // Clean up any existing test definitions first to avoid hitting the 10 category limit
  210 |     await page.goto(`${BASE_URL}/settings?tab=collections`);
  211 |     await page.waitForTimeout(1000);
  212 | 
  213 |     // Aggressively delete items until we have fewer than 10
  214 |     // Get current count
  215 |     let itemCount = await page.locator('ul > li').count();
  216 |     console.log('Initial item count:', itemCount);
  217 | 
  218 |     // Keep deleting items until we have fewer than 10
  219 |     while (itemCount >= 10) {
  220 |       const allItems = page.locator('ul > li');
  221 |       const firstItem = allItems.first();
  222 |       const deleteBtn = firstItem.locator('button[aria-label="Delete"]').first();
  223 | 
  224 |       if (await deleteBtn.isVisible({ timeout: 1000 })) {
  225 |         console.log('Deleting item to make room...');
  226 |         page.once('dialog', async dialog => {
  227 |           await dialog.accept();
  228 |         });
  229 |         await deleteBtn.click();
> 230 |         await page.waitForTimeout(2000);
      |                    ^ Error: page.waitForTimeout: Test timeout of 60000ms exceeded.
  231 |       } else {
  232 |         break;
  233 |       }
  234 |       itemCount = await page.locator('ul > li').count();
  235 |     }
  236 | 
  237 |     // Verify we have room
  238 |     itemCount = await page.locator('ul > li').count();
  239 |     console.log('Final item count before test:', itemCount);
  240 | 
  241 |     await openAddCollectionDefinitionForm(page);
  242 | 
  243 |     // Set up the form
  244 |     await page.fill('input[name="name"]', "Test Persistence False");
  245 |     await selectBaseCategory(page, "Annual");
  246 |     await selectSubcategory(page, "Recurring Donation");
  247 | 
  248 |     // Uncheck Show in Payment Received
  249 |     const showInPaymentCheckbox = page.getByRole('checkbox', { name: 'Show in Payment Received' });
  250 |     await showInPaymentCheckbox.uncheck();
  251 |     await page.waitForTimeout(300);
  252 |     const isUnchecked = await showInPaymentCheckbox.isChecked();
  253 |     expect(isUnchecked).toBe(false);
  254 | 
  255 |     // Fill remaining required fields
  256 |     await page.selectOption('select[name="frequency"]', "MONTHLY");
  257 |     await page.selectOption('select[name="amountType"]', "VARIABLE");
  258 |     await page.selectOption('select[name="donorEligibility"]', "MEMBERS_ONLY");
  259 |     await page.selectOption('select[name="memberAssignment"]', "ALL_ELIGIBLE");
  260 |     await page.selectOption('select[name="dueGeneration"]', "AUTOMATIC");
  261 |     await page.selectOption('select[name="settlementPolicy"]', "OLDEST_FIRST");
  262 | 
  263 |     // Submit
  264 |     const saveBtn = page.locator('button[type="submit"]:has-text("Save")').first();
  265 |     await expect(saveBtn).toBeVisible();
  266 | 
  267 |     // Debug: Intercept the form submission to see what's happening
  268 |     const responsePromise = page.waitForResponse(response => response.url().includes('/settings') && response.request().method() === 'POST', { timeout: 5000 }).catch(() => null);
  269 | 
  270 |     await saveBtn.click();
  271 | 
  272 |     // Wait for the response
  273 |     const response = await responsePromise;
  274 |     if (response) {
  275 |       console.log('Response status:', response.status());
  276 |       const responseBody = await response.text().catch(() => 'could not read');
  277 |       console.log('Response body:', responseBody);
  278 |     } else {
  279 |       console.log('No POST response captured');
  280 |     }
  281 | 
  282 |     // Wait for form submission and page reload
  283 |     await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  284 |     await page.waitForTimeout(3000);
  285 | 
  286 |     // Debug: Check if there's an error notice
  287 |     const errorNotice = page.locator('p:has-text("Could not create"), p:has-text("Invalid"), p:has-text("error")').first();
  288 |     if (await errorNotice.isVisible({ timeout: 2000 }).catch(() => false)) {
  289 |       const errorText = await errorNotice.textContent();
  290 |       console.log('Error notice:', errorText);
  291 |     }
  292 | 
  293 |     // Debug: Check if we're still on the form page
  294 |     const currentUrl = page.url();
  295 |     console.log('Current URL after submit:', currentUrl);
  296 | 
  297 |     // Debug: Check if the form is still visible (meaning submission failed silently)
  298 |     const formVisible = await page.locator('input[name="name"]').isVisible({ timeout: 2000 }).catch(() => false);
  299 |     if (formVisible) {
  300 |       console.log('Form is still visible - submission may have failed silently');
  301 | 
  302 |       // Check for any visible error messages in the form
  303 |       const formError = await page.locator('form p[role="alert"], form .text-red, form .text-[var(--danger)]').first().textContent().catch(() => null);
  304 |       if (formError) {
  305 |         console.log('Form error message:', formError);
  306 |       }
  307 | 
  308 |       // Debug: Check what the Notice component shows (it shows state.error or state.ok)
  309 |       const notice = await page.locator('form > div > p').first().textContent().catch(() => null);
  310 |       console.log('Notice text:', notice);
  311 | 
  312 |       // Debug: Check if form fields are properly filled
  313 |       const nameVal = await page.locator('input[name="name"]').inputValue();
  314 |       const baseCategoryVal = await page.locator('select[name="baseCategoryId"]').inputValue();
  315 |       const subcategoryVal = await page.locator('select[name="subcategoryId"]').inputValue();
  316 |       console.log('Form values:', { name: nameVal, baseCategoryId: baseCategoryVal, subcategoryId: subcategoryVal });
  317 |     }
  318 | 
  319 |     // Debug: Get all list items to see what's there
  320 |     const allItems = await page.locator('ul > li').allTextContents();
  321 |     console.log('All list items:', allItems);
  322 | 
  323 |     // Verify creation succeeded by checking the list
  324 |     await page.goto(`${BASE_URL}/settings?tab=collections`);
  325 |     await page.waitForLoadState('networkidle');
  326 |     await page.waitForTimeout(1000);
  327 | 
  328 |     const testItem = page.locator('li:has-text("Test Persistence False")');
  329 |     await expect(testItem).toBeVisible({ timeout: 10000 });
  330 | 
```