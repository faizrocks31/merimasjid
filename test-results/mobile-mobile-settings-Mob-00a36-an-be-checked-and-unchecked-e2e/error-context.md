# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mobile\mobile-settings.spec.ts >> Mobile Settings Page >> Mobile-390 (390x844) >> Checkboxes can be checked and unchecked
- Location: e2e\mobile\mobile-settings.spec.ts:139:11

# Error details

```
Error: locator.uncheck: Clicking the checkbox did not change its state
Call log:
  - waiting for getByRole('checkbox', { name: 'Active' })
    - locator resolved to <input checked id="active" value="true" name="active" type="checkbox" class="h-4 w-4 rounded border-[var(--border-subtle)] text-[var(--brand)] focus:ring-[var(--brand-soft)]"/>
  - attempting click action
    - scrolling into view if needed
    - done scrolling
    - forcing action
    - performing click action
    - click action done
    - waiting for scheduled navigations to finish
    - navigations have finished

```

# Page snapshot

```yaml
- generic [ref=f1e1]:
  - generic [ref=f1e2]:
    - generic [ref=f1e3]:
      - banner [ref=f1e4]:
        - generic [ref=f1e5]: हुसैनी मस्जिद आलोट
        - generic [ref=f1e12]:
          - generic [ref=f1e15]:
            - button "English" [pressed] [ref=f1e16]: EN
            - button "हिन्दी" [ref=f1e17]: हि
            - button "اردو" [ref=f1e18]: ار
          - button "MA" [ref=f1e20]
      - main [ref=f1e24]:
        - generic [ref=f1e26]:
          - heading [level=1]
          - paragraph [ref=f1e27]: हुसैनी मस्जिद आलोट
        - generic [ref=f1e28]:
          - generic [ref=f1e29]:
            - button "Masjid Details" [ref=f1e30]
            - button "Collections" [ref=f1e35]
            - button "Expense Categories" [ref=f1e40]
            - button "Notifications" [ref=f1e43]
            - button "Staff" [ref=f1e47]
            - button "Prayer Times" [ref=f1e52]
          - generic [ref=f1e57]:
            - generic [ref=f1e58]:
              - button "Collection Definitions" [ref=f1e59]
              - button "Collection Events" [ref=f1e64]
              - button "Assignments" [ref=f1e67]
            - generic [ref=f1e73]:
              - generic [ref=f1e75]:
                - generic [ref=f1e76]:
                  - generic [ref=f1e77]:
                    - generic [ref=f1e78]: Name
                    - textbox "Name" [ref=f1e79]:
                      - /placeholder: e.g. Monthly Chanda
                  - generic [ref=f1e80]:
                    - generic [ref=f1e81]: Description
                    - textbox "Description" [ref=f1e82]:
                      - /placeholder: ""
                  - generic [ref=f1e83]:
                    - generic [ref=f1e84]: Base Category
                    - combobox "Base Category" [ref=f1e85]:
                      - option "Annual" [selected]
                      - option "Construction"
                      - option "General"
                      - option "Jumma"
                      - option "Monthly"
                      - option "Sadaqah"
                      - option "Zakat"
                  - generic [ref=f1e86]:
                    - generic [ref=f1e87]: Subcategory
                    - combobox "Subcategory" [ref=f1e88]:
                      - option "General" [selected]
                      - option "Recurring Donation"
                  - generic [ref=f1e89]:
                    - generic [ref=f1e90]: Active
                    - checkbox "Active" [checked] [ref=f1e91]
                  - generic [ref=f1e92]:
                    - generic [ref=f1e93]: Show in Payment Received
                    - checkbox "Show in Payment Received" [checked] [ref=f1e94]
                  - generic [ref=f1e95]:
                    - generic [ref=f1e96]: Frequency
                    - combobox "Frequency" [ref=f1e97]:
                      - option "Weekly"
                      - option "Monthly" [selected]
                      - option "Quarterly"
                      - option "Semi-annual"
                      - option "Annual"
                      - option "Event-based"
                      - option "One-Time"
                  - generic [ref=f1e98]:
                    - generic [ref=f1e99]: Amount Type
                    - combobox "Amount Type" [ref=f1e100]:
                      - option "Fixed Amount"
                      - option "Variable Amount" [selected]
                  - generic [ref=f1e101]:
                    - generic [ref=f1e102]: Default amount
                    - spinbutton "Default amount" [ref=f1e103]
                  - generic [ref=f1e104]:
                    - generic [ref=f1e105]: Donor Eligibility
                    - combobox "Donor Eligibility" [ref=f1e106]:
                      - option "Members Only"
                      - option "Walk-in Only"
                      - option "Both Members & Walk-ins" [selected]
                  - generic [ref=f1e107]:
                    - generic [ref=f1e108]: Member Assignment
                    - combobox "Member Assignment" [ref=f1e109]:
                      - option "All Eligible Members" [selected]
                      - option "Selected Members"
                  - generic [ref=f1e110]:
                    - generic [ref=f1e111]: Due Generation
                    - combobox "Due Generation" [ref=f1e112]:
                      - option "Admin Generated" [selected]
                      - option "Automatic"
                  - generic [ref=f1e113]:
                    - generic [ref=f1e114]: Settlement Policy
                    - combobox "Settlement Policy" [ref=f1e115]:
                      - option "Oldest First (FIFO)" [selected]
                      - option "Any Pending Period"
                - generic [ref=f1e116]:
                  - button "Save" [ref=f1e117]
                  - button "Cancel" [ref=f1e119]
              - generic [ref=f1e123]:
                - generic [ref=f1e124]:
                  - heading "Collection Definitions" [level=2] [ref=f1e125]
                  - button "Cancel" [ref=f1e126]
                - list [ref=f1e129]:
                  - listitem [ref=f1e130]:
                    - generic [ref=f1e131]:
                      - generic:
                        - paragraph: Milad-un-Nabi
                        - paragraph [ref=f1e132]: ANNUAL · GENERAL · MILAD_UN_NABI · Both Members & Walk-ins · All Eligible Members · Admin Generated · Oldest First (FIFO)
                      - generic [ref=f1e133]:
                        - generic [ref=f1e134]: Active
                        - generic [ref=f1e135]: Show in Payment Received
                        - generic [ref=f1e136]: Annual
                        - generic [ref=f1e137]: Fixed Amount
                        - generic [ref=f1e138]: ₹1000
                        - generic [ref=f1e139]:
                          - button "Edit" [ref=f1e140]
                          - button "Delete" [ref=f1e144]
                  - listitem [ref=f1e148]:
                    - generic [ref=f1e149]:
                      - generic:
                        - paragraph: Monthly Chanda
                        - paragraph [ref=f1e150]: MONTHLY · RECURRING_DONATION · MONTHLY_CHANDA · Members Only · All Eligible Members · Admin Generated · Oldest First (FIFO)
                      - generic [ref=f1e151]:
                        - generic [ref=f1e152]: Active
                        - generic [ref=f1e153]: Show in Payment Received
                        - generic [ref=f1e154]: Monthly
                        - generic [ref=f1e155]: Fixed Amount
                        - generic [ref=f1e156]: ₹150
                        - generic [ref=f1e157]:
                          - button "Edit" [ref=f1e158]
                          - button "Delete" [ref=f1e162]
                  - listitem [ref=f1e166]:
                    - generic [ref=f1e167]:
                      - generic:
                        - paragraph: Shab-e-Qadr
                        - paragraph [ref=f1e168]: ANNUAL · RECURRING_DONATION · SHAB_E_QADR · Both Members & Walk-ins · All Eligible Members · Admin Generated · Oldest First (FIFO)
                      - generic [ref=f1e169]:
                        - generic [ref=f1e170]: Active
                        - generic [ref=f1e171]: Show in Payment Received
                        - generic [ref=f1e172]: Annual
                        - generic [ref=f1e173]: Fixed Amount
                        - generic [ref=f1e174]: ₹1000
                        - generic [ref=f1e175]:
                          - button "Edit" [ref=f1e176]
                          - button "Delete" [ref=f1e180]
                  - listitem [ref=f1e184]:
                    - generic [ref=f1e185]:
                      - generic:
                        - paragraph: abc
                        - paragraph [ref=f1e186]: ANNUAL · GENERAL · Both Members & Walk-ins · All Eligible Members · Admin Generated · Oldest First (FIFO)
                      - generic [ref=f1e187]:
                        - generic [ref=f1e188]: Active
                        - generic [ref=f1e189]: Hidden in Payment Received
                        - generic [ref=f1e190]: Monthly
                        - generic [ref=f1e191]: Variable Amount
                        - generic [ref=f1e192]:
                          - button "Edit" [ref=f1e193]
                          - button "Delete" [ref=f1e197]
                  - listitem [ref=f1e201]:
                    - generic [ref=f1e202]:
                      - generic:
                        - paragraph: Annual Chanda
                        - paragraph [ref=f1e203]: ANNUAL · RECURRING_DONATION · ANNUAL_CHANDA · Members Only · All Eligible Members · Automatic · Oldest First (FIFO)
                      - generic [ref=f1e204]:
                        - generic [ref=f1e205]: Active
                        - generic [ref=f1e206]: Hidden in Payment Received
                        - generic [ref=f1e207]: Annual
                        - generic [ref=f1e208]: Variable Amount
                        - generic [ref=f1e209]:
                          - button "Edit" [ref=f1e210]
                          - button "Delete" [ref=f1e214]
                  - listitem [ref=f1e218]:
                    - generic [ref=f1e219]:
                      - generic:
                        - paragraph: Construction Fund
                        - paragraph [ref=f1e220]: CONSTRUCTION · RESTRICTED · CONSTRUCTION_FUND · Both Members & Walk-ins · Selected Members · Admin Generated · Any Pending Period
                      - generic [ref=f1e221]:
                        - generic [ref=f1e222]: Active
                        - generic [ref=f1e223]: Hidden in Payment Received
                        - generic [ref=f1e224]: Event-based
                        - generic [ref=f1e225]: Variable Amount
                        - generic [ref=f1e226]:
                          - button "Edit" [ref=f1e227]
                          - button "Delete" [ref=f1e231]
                  - listitem [ref=f1e235]:
                    - generic [ref=f1e236]:
                      - generic:
                        - paragraph: General Donation
                        - paragraph [ref=f1e237]: GENERAL · GENERAL · GENERAL_DONATION · Both Members & Walk-ins · Selected Members · Admin Generated · Any Pending Period
                      - generic [ref=f1e238]:
                        - generic [ref=f1e239]: Active
                        - generic [ref=f1e240]: Hidden in Payment Received
                        - generic [ref=f1e241]: One-Time
                        - generic [ref=f1e242]: Variable Amount
                        - generic [ref=f1e243]:
                          - button "Edit" [ref=f1e244]
                          - button "Delete" [ref=f1e248]
                  - listitem [ref=f1e252]:
                    - generic [ref=f1e253]:
                      - generic:
                        - paragraph: Jumma Collection
                        - paragraph [ref=f1e254]: JUMMA · RECURRING_DONATION · JUMMA_COLLECTION · Both Members & Walk-ins · Selected Members · Admin Generated · Any Pending Period
                      - generic [ref=f1e255]:
                        - generic [ref=f1e256]: Active
                        - generic [ref=f1e257]: Hidden in Payment Received
                        - generic [ref=f1e258]: Weekly
                        - generic [ref=f1e259]: Fixed Amount
                        - generic [ref=f1e260]: ₹10
                        - generic [ref=f1e261]:
                          - button "Edit" [ref=f1e262]
                          - button "Delete" [ref=f1e266]
                  - listitem [ref=f1e270]:
                    - generic [ref=f1e271]:
                      - generic:
                        - paragraph: Test Edit Name Prefill
                        - paragraph [ref=f1e272]: MONTHLY · RECURRING_DONATION · Members Only · All Eligible Members · Automatic · Oldest First (FIFO)
                      - generic [ref=f1e273]:
                        - generic [ref=f1e274]: Active
                        - generic [ref=f1e275]: Hidden in Payment Received
                        - generic [ref=f1e276]: Monthly
                        - generic [ref=f1e277]: Variable Amount
                        - generic [ref=f1e278]:
                          - button "Edit" [ref=f1e279]
                          - button "Delete" [ref=f1e283]
                  - listitem [ref=f1e287]:
                    - generic [ref=f1e288]:
                      - generic:
                        - paragraph: Zakat
                        - paragraph [ref=f1e289]: ZAKAT · RESTRICTED · ZAKAT · Members Only · Selected Members · Admin Generated · Any Pending Period
                      - generic [ref=f1e290]:
                        - generic [ref=f1e291]: Active
                        - generic [ref=f1e292]: Hidden in Payment Received
                        - generic [ref=f1e293]: Annual
                        - generic [ref=f1e294]: Variable Amount
                        - generic [ref=f1e295]:
                          - button "Edit" [ref=f1e296]
                          - button "Delete" [ref=f1e300]
    - navigation "Primary" [ref=f1e304]:
      - link "Dashboard" [active] [ref=f1e305] [cursor=pointer]:
        - /url: /dashboard
      - link "Members" [ref=f1e313] [cursor=pointer]:
        - /url: /members
      - link "Receive payment" [ref=f1e321] [cursor=pointer]:
        - /url: /collections/new
      - link "Transactions" [ref=f1e330] [cursor=pointer]:
        - /url: /transactions
      - link "Reports" [ref=f1e335] [cursor=pointer]:
        - /url: /reports
  - button "Open Next.js Dev Tools" [ref=f1e345] [cursor=pointer]
  - alert [ref=f1e349]
```

# Test source

```ts
  53  |         await expect(addBtn).toBeVisible({ timeout: 10000 });
  54  |         await addBtn.click();
  55  |         await page.waitForTimeout(500);
  56  | 
  57  |         // Verify form opens
  58  |         await expect(page.locator('input[name="name"]')).toBeVisible({ timeout: 5000 });
  59  |         await expect(page.locator('select[name="baseCategoryId"]')).toBeVisible({ timeout: 5000 });
  60  |         await expect(page.locator('select[name="subcategoryId"]')).toBeVisible({ timeout: 5000 });
  61  |       });
  62  | 
  63  |       test("Base Category dropdown works", async ({ page }) => {
  64  |         await page.goto(`${BASE_URL}/settings?tab=collections`);
  65  |         await page.waitForLoadState("networkidle");
  66  |         await page.waitForTimeout(1000);
  67  | 
  68  |         const addBtn = page.locator('button:has-text("Add Collection Definition")').first();
  69  |         await addBtn.click();
  70  |         await page.waitForTimeout(500);
  71  | 
  72  |         // Test base category dropdown
  73  |         const baseSelect = page.locator('select[name="baseCategoryId"]');
  74  |         await expect(baseSelect).toBeVisible({ timeout: 5000 });
  75  | 
  76  |         // Get options
  77  |         const options = await baseSelect.locator('option').all();
  78  |         expect(options.length).toBeGreaterThanOrEqual(7); // 7 base categories
  79  | 
  80  |         // Select Annual
  81  |         await baseSelect.selectOption({ label: "Annual" });
  82  |         await page.waitForTimeout(300);
  83  | 
  84  |         // Verify subcategory updates
  85  |         const subSelect = page.locator('select[name="subcategoryId"]');
  86  |         await expect(subSelect).toBeVisible({ timeout: 5000 });
  87  |         const subOptions = await subSelect.locator('option').all();
  88  |         expect(subOptions.length).toBeGreaterThanOrEqual(2); // General + Recurring Donation
  89  |       });
  90  | 
  91  |       test("Subcategory filtering works - Annual shows General and Recurring Donation", async ({ page }) => {
  92  |         await page.goto(`${BASE_URL}/settings?tab=collections`);
  93  |         await page.waitForLoadState("networkidle");
  94  |         await page.waitForTimeout(1000);
  95  | 
  96  |         const addBtn = page.locator('button:has-text("Add Collection Definition")').first();
  97  |         await addBtn.click();
  98  |         await page.waitForTimeout(500);
  99  | 
  100 |         await page.locator('select[name="baseCategoryId"]').selectOption({ label: "Annual" });
  101 |         await page.waitForTimeout(300);
  102 | 
  103 |         const subSelect = page.locator('select[name="subcategoryId"]');
  104 |         const subOptions = await subSelect.locator('option').all();
  105 |         const subTexts = [];
  106 |         for (const opt of subOptions) {
  107 |           subTexts.push((await opt.textContent())?.trim() || "");
  108 |         }
  109 | 
  110 |         expect(subTexts).toContain("General");
  111 |         expect(subTexts).toContain("Recurring Donation");
  112 |         expect(subTexts).not.toContain("Restricted");
  113 |       });
  114 | 
  115 |       test("Subcategory filtering works - General shows General and Restricted", async ({ page }) => {
  116 |         await page.goto(`${BASE_URL}/settings?tab=collections`);
  117 |         await page.waitForLoadState("networkidle");
  118 |         await page.waitForTimeout(1000);
  119 | 
  120 |         const addBtn = page.locator('button:has-text("Add Collection Definition")').first();
  121 |         await addBtn.click();
  122 |         await page.waitForTimeout(500);
  123 | 
  124 |         await page.locator('select[name="baseCategoryId"]').selectOption({ label: "General" });
  125 |         await page.waitForTimeout(300);
  126 | 
  127 |         const subSelect = page.locator('select[name="subcategoryId"]');
  128 |         const subOptions = await subSelect.locator('option').all();
  129 |         const subTexts = [];
  130 |         for (const opt of subOptions) {
  131 |           subTexts.push((await opt.textContent())?.trim() || "");
  132 |         }
  133 | 
  134 |         expect(subTexts).toContain("General");
  135 |         expect(subTexts).toContain("Restricted");
  136 |         expect(subTexts).not.toContain("Recurring Donation");
  137 |       });
  138 | 
  139 |       test("Checkboxes can be checked and unchecked", async ({ page }) => {
  140 |         await page.goto(`${BASE_URL}/settings?tab=collections`);
  141 |         await page.waitForLoadState("networkidle");
  142 |         await page.waitForTimeout(1000);
  143 | 
  144 |         const addBtn = page.locator('button:has-text("Add Collection Definition")').first();
  145 |         await addBtn.click();
  146 |         await page.waitForTimeout(500);
  147 | 
  148 |         // Test Active checkbox - use getByRole to avoid hidden input
  149 |         const activeCheckbox = page.getByRole('checkbox', { name: 'Active' });
  150 |         await expect(activeCheckbox).toBeVisible({ timeout: 5000 });
  151 | 
  152 |         // Uncheck using force option to bypass interception
> 153 |         await activeCheckbox.uncheck({ force: true });
      |                              ^ Error: locator.uncheck: Clicking the checkbox did not change its state
  154 |         await page.waitForTimeout(100);
  155 |         await expect(activeCheckbox).not.toBeChecked();
  156 | 
  157 |         // Check
  158 |         await activeCheckbox.check({ force: true });
  159 |         await page.waitForTimeout(100);
  160 |         await expect(activeCheckbox).toBeChecked();
  161 | 
  162 |         // Uncheck again
  163 |         await activeCheckbox.uncheck({ force: true });
  164 |         await page.waitForTimeout(100);
  165 |         await expect(activeCheckbox).not.toBeChecked();
  166 | 
  167 |         // Test Show in Payment Received checkbox
  168 |         const showInPaymentCheckbox = page.getByRole('checkbox', { name: 'Show in Payment Received' });
  169 |         await expect(showInPaymentCheckbox).toBeVisible({ timeout: 5000 });
  170 | 
  171 |         // Uncheck first
  172 |         await showInPaymentCheckbox.uncheck({ force: true });
  173 |         await page.waitForTimeout(100);
  174 |         await expect(showInPaymentCheckbox).not.toBeChecked();
  175 | 
  176 |         // Check
  177 |         await showInPaymentCheckbox.check({ force: true });
  178 |         await page.waitForTimeout(100);
  179 |         await expect(showInPaymentCheckbox).toBeChecked();
  180 | 
  181 |         // Uncheck again
  182 |         await showInPaymentCheckbox.uncheck({ force: true });
  183 |         await page.waitForTimeout(100);
  184 |         await expect(showInPaymentCheckbox).not.toBeChecked();
  185 |       });
  186 | 
  187 |       test("Form does not overflow viewport", async ({ page }) => {
  188 |         await page.goto(`${BASE_URL}/settings?tab=collections`);
  189 |         await page.waitForLoadState("networkidle");
  190 |         await page.waitForTimeout(1000);
  191 | 
  192 |         const addBtn = page.locator('button:has-text("Add Collection Definition")').first();
  193 |         await addBtn.click();
  194 |         await page.waitForTimeout(500);
  195 | 
  196 |         // Check form container width (the form itself, not the entire body)
  197 |         const formContainer = page.locator('form').first();
  198 |         await expect(formContainer).toBeVisible({ timeout: 5000 });
  199 | 
  200 |         const formWidth = await formContainer.evaluate((el) => el.scrollWidth);
  201 |         const viewportWidth = vp.width;
  202 | 
  203 |         // Allow small margin
  204 |         expect(formWidth).toBeLessThanOrEqual(viewportWidth + 20);
  205 |       });
  206 | 
  207 |       test("Cancel button works and closes form", async ({ page }) => {
  208 |         await page.goto(`${BASE_URL}/settings?tab=collections`);
  209 |         await page.waitForLoadState("networkidle");
  210 |         await page.waitForTimeout(1000);
  211 | 
  212 |         const addBtn = page.locator('button:has-text("Add Collection Definition")').first();
  213 |         await addBtn.click();
  214 |         await page.waitForTimeout(500);
  215 | 
  216 |         // Verify form is visible
  217 |         await expect(page.locator('input[name="name"]')).toBeVisible({ timeout: 5000 });
  218 | 
  219 |         // Click cancel - use more specific selector to avoid header interception
  220 |         const cancelBtn = page.locator('form button:has-text("Cancel")').first();
  221 |         await expect(cancelBtn).toBeVisible({ timeout: 5000 });
  222 |         await cancelBtn.click({ force: true });
  223 |         await page.waitForTimeout(500);
  224 | 
  225 |         // Form should be closed
  226 |         await expect(page.locator('input[name="name"]')).not.toBeVisible({ timeout: 5000 });
  227 |       });
  228 |     });
  229 |   }
  230 | });
```