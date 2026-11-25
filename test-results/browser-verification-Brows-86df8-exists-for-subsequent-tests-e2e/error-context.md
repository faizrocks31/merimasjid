# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: browser-verification.spec.ts >> Browser Verification - Phase 3 >> 3. Ensure a TESTMONTH category exists for subsequent tests
- Location: e2e\browser-verification.spec.ts:18:7

# Error details

```
TimeoutError: page.fill: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('input[name="description"]')

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
                      - text: TESTMONTH
                  - generic [ref=e164]:
                    - generic [ref=e165]: Description
                    - textbox "Description" [ref=e166]:
                      - /placeholder: ""
                  - generic [ref=e167]:
                    - generic [ref=e168]: Base Category
                    - combobox "Base Category" [ref=e169]:
                      - option "Annual" [selected]
                      - option "Construction"
                      - option "General"
                      - option "Jumma"
                      - option "Monthly"
                      - option "Sadaqah"
                      - option "Zakat"
                  - generic [ref=e170]:
                    - generic [ref=e171]: Subcategory
                    - combobox "Subcategory" [ref=e172]:
                      - option "General" [selected]
                      - option "Recurring Donation"
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
  1   | import { test, expect } from "@playwright/test";
  2   | 
  3   | const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
  4   | 
  5   | test.describe("Browser Verification - Phase 3", () => {
  6   |   test("1. Dashboard loads", async ({ page }) => {
  7   |     await page.goto(`${BASE_URL}/dashboard`);
  8   |     await expect(page.locator("h1").first()).toBeVisible({ timeout: 5000 });
  9   |   });
  10  | 
  11  |   test("2. Settings - Collections tab loads", async ({ page }) => {
  12  |     await page.goto(`${BASE_URL}/settings?tab=collections`);
  13  |     await page.waitForTimeout(500);
  14  | 
  15  |     await expect(page.locator('h2:has-text("Collection Definitions")').first()).toBeVisible();
  16  |   });
  17  | 
  18  |   test("3. Ensure a TESTMONTH category exists for subsequent tests", async ({ page }) => {
  19  |     await page.goto(`${BASE_URL}/settings?tab=collections`);
  20  |     await page.waitForTimeout(500);
  21  | 
  22  |     // Get first category code from existing categories
  23  |     const categoryCards = page.locator('text=Monthly Chanda').first().locator('..').locator('..').locator('..');
  24  |     const firstCode = await categoryCards.locator('text=/[A-Z]+/').first().textContent();
  25  |     const dynamicCategoryCode = firstCode?.trim() || '';
  26  | 
  27  |     // Check if TESTMONTH category exists, if not create it
  28  |     const testMonthExists = await page.locator('text=TESTMONTH').count();
  29  | 
  30  |     if (testMonthExists === 0) {
  31  |       // Click add category button - it's a toggle button
  32  |       await page.click('button:has-text("Add Collection Definition")');
  33  |       await page.waitForTimeout(500);
  34  | 
  35  |       await page.fill('input[name="name"]', "TESTMONTH");
> 36  |       await page.fill('input[name="description"]', "Test Monthly Category");
      |                  ^ TimeoutError: page.fill: Timeout 15000ms exceeded.
  37  | 
  38  |       await page.selectOption('select[name="baseCategoryId"]', { index: 1 });
  39  |       const subOptionsCount = await page.locator('select[name="subcategoryId"] option').count();
  40  |       console.log('Subcategory options count:', subOptionsCount);
  41  |       if (subOptionsCount === 0) throw new Error('Subcategory options empty after base category selection');
  42  |       await page.selectOption('select[name="subcategoryId"]', { index: 1 });
  43  |       await page.selectOption('select[name="frequency"]', "MONTHLY");
  44  |       await page.selectOption('select[name="amountType"]', "FIXED");
  45  |       await page.fill('input[name="defaultAmountPaise"]', "10000"); // 100 INR
  46  |       await page.selectOption('select[name="donorEligibility"]', "MEMBERS_ONLY");
  47  |       await page.selectOption('select[name="memberAssignment"]', "ALL_ELIGIBLE");
  48  |       await page.selectOption('select[name="dueGeneration"]', "ADMIN");
  49  |       await page.selectOption('select[name="settlementPolicy"]', "OLDEST_FIRST");
  50  |       await page.selectOption('select[name="showInPaymentReceived"]', "true");
  51  | 
  52  |       await page.click('button:has-text("Save")');
  53  |       await page.waitForTimeout(2000);
  54  | 
  55  |       await expect(page.locator("text=TESTMONTH")).toBeVisible();
  56  |     }
  57  |   });
  58  | 
  59  |   test("4. Collection Definition Create Form - Subcategory Filtering Works", async ({ page }) => {
  60  |     await page.goto(`${BASE_URL}/settings?tab=collections`);
  61  |     await page.waitForTimeout(500);
  62  | 
  63  |     // Click add collection definition button
  64  |     await page.click('button:has-text("Add Collection Definition")');
  65  |     await page.waitForTimeout(500);
  66  | 
  67  |     // Fill in name
  68  |     await page.fill('input[name="name"]', "Test Subcategory Filter");
  69  | 
  70  |     // Select base category
  71  |     await page.selectOption('select[name="baseCategoryId"]', { index: 1 });
  72  |     await page.waitForTimeout(500);
  73  | 
  74  |     // Check subcategory options are filtered
  75  |     const subOptionsCount = await page.locator('select[name="subcategoryId"] option').count();
  76  |     console.log('Subcategory options count:', subOptionsCount);
  77  |     if (subOptionsCount === 0) throw new Error('Subcategory options empty after base category selection');
  78  |     await page.selectOption('select[name="subcategoryId"]', { index: 1 });
  79  | 
  80  |     await page.selectOption('select[name="frequency"]', "MONTHLY");
  81  |     await page.selectOption('select[name="amountType"]', "FIXED");
  82  |     await page.fill('input[name="defaultAmountPaise"]', "10000");
  83  |     await page.selectOption('select[name="donorEligibility"]', "MEMBERS_ONLY");
  84  |     await page.selectOption('select[name="memberAssignment"]', "ALL_ELIGIBLE");
  85  |     await page.selectOption('select[name="dueGeneration"]', "ADMIN");
  86  |     await page.selectOption('select[name="settlementPolicy"]', "OLDEST_FIRST");
  87  | 
  88  |     await page.click('button:has-text("Save")');
  89  |     await page.waitForTimeout(2000);
  90  | 
  91  |     await expect(page.locator("text=Test Subcategory Filter")).toBeVisible();
  92  |   });
  93  | 
  94  |   test("5. Collection Definition Create Form - Subcategory Updates When Base Category Changes", async ({ page }) => {
  95  |     await page.goto(`${BASE_URL}/settings?tab=collections`);
  96  |     await page.waitForTimeout(500);
  97  | 
  98  |     await page.click('button:has-text("Add Collection Definition")');
  99  |     await page.waitForTimeout(500);
  100 | 
  101 |     await page.fill('input[name="name"]', "Test Subcategory Filter 2");
  102 | 
  103 |     // Select first base category
  104 |     await page.selectOption('select[name="baseCategoryId"]', { index: 1 });
  105 |     await page.waitForTimeout(500);
  106 | 
  107 |     const subOptions1 = await page.locator('select[name="subcategoryId"] option').count();
  108 |     console.log('Subcategory options count for base 1:', subOptions1);
  109 |     if (subOptions1 === 0) throw new Error('Subcategory options empty after base category 1 selection');
  110 | 
  111 |     // Select a subcategory
  112 |     await page.selectOption('select[name="subcategoryId"]', { index: 1 });
  113 | 
  114 |     // Change base category
  115 |     await page.selectOption('select[name="baseCategoryId"]', { index: 2 });
  116 |     await page.waitForTimeout(500);
  117 | 
  118 |     const subOptions2 = await page.locator('select[name="subcategoryId"] option').count();
  119 |     console.log('Subcategory options count for base 2:', subOptions2);
  120 |     // Should have different options now
  121 | 
  122 |     await page.selectOption('select[name="subcategoryId"]', { index: 1 });
  123 | 
  124 |     await page.selectOption('select[name="frequency"]', "MONTHLY");
  125 |     await page.selectOption('select[name="amountType"]', "FIXED");
  126 |     await page.fill('input[name="defaultAmountPaise"]', "5000");
  127 |     await page.selectOption('select[name="donorEligibility"]', "MEMBERS_ONLY");
  128 |     await page.selectOption('select[name="memberAssignment"]', "ALL_ELIGIBLE");
  129 |     await page.selectOption('select[name="dueGeneration"]', "ADMIN");
  130 |     await page.selectOption('select[name="settlementPolicy"]', "OLDEST_FIRST");
  131 | 
  132 |     await page.click('button:has-text("Save")');
  133 |     await page.waitForTimeout(2000);
  134 | 
  135 |     await expect(page.locator("text=Test Subcategory Filter 2")).toBeVisible();
  136 |   });
```