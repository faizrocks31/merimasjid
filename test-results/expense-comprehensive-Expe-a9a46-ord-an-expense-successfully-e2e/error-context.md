# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: expense-comprehensive.spec.ts >> Expense Management - Comprehensive Tests >> Record an expense successfully
- Location: e2e\expense-comprehensive.spec.ts:13:7

# Error details

```
TimeoutError: page.click: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('button:has-text("Save")')

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - complementary [ref=e3]:
      - navigation "Main" [ref=e4]:
        - link "डैशबोर्ड" [ref=e5] [cursor=pointer]:
          - /url: /dashboard
        - link "सदस्य" [ref=e13] [cursor=pointer]:
          - /url: /members
        - link "योगदान योजनाएँ" [ref=e21] [cursor=pointer]:
          - /url: /plans
        - link "भुगतान लें" [ref=e28] [cursor=pointer]:
          - /url: /collections/new
        - link "देय स्थिति अवलोकन" [ref=e37] [cursor=pointer]:
          - /url: /collections/due-status
        - link "लेन-देन" [ref=e44] [cursor=pointer]:
          - /url: /transactions
        - link "खर्च" [ref=e49] [cursor=pointer]:
          - /url: /expenses
        - link "रिपोर्ट" [ref=e56] [cursor=pointer]:
          - /url: /reports
        - link "सेटिंग्स" [ref=e61] [cursor=pointer]:
          - /url: /settings
        - link "कर्मचारी" [ref=e67] [cursor=pointer]:
          - /url: /staff
        - link "ऑडिट लॉग" [ref=e73] [cursor=pointer]:
          - /url: /audit
    - generic [ref=e79]:
      - banner [ref=e80]:
        - generic [ref=e81]:
          - generic [ref=e87]: Hussaini Masjid Alote
          - generic [ref=e88]: 27 Nov 2026
        - generic [ref=e89]:
          - generic [ref=e91]:
            - generic [ref=e92]: भाषा
            - generic [ref=e97]:
              - button "English" [ref=e98]
              - button "हिन्दी" [pressed] [ref=e99]
              - button "اردو" [ref=e100]
          - button "MA Masjid Admin" [ref=e102]:
            - generic [ref=e103]: MA
            - generic [ref=e104]: Masjid Admin
      - main [ref=e107]:
        - generic [ref=e109]:
          - heading "खर्च" [level=1] [ref=e110]
          - paragraph [ref=e111]: "स्वीकृत: ₹0"
        - generic [ref=e112]:
          - generic [ref=e114]:
            - heading "खर्च" [level=2] [ref=e116]
            - generic [ref=e118]:
              - generic [ref=e119]:
                - generic [ref=e120]: Category
                - combobox "Category" [ref=e121]:
                  - option "Education"
                  - option "Events" [selected]
                  - option "Maintenance"
                  - option "Molana sab ki tankhwa"
                  - option "Other"
                  - option "Salaries"
                  - option "Utilities"
              - generic [ref=e122]:
                - generic [ref=e123]: दिनांक
                - textbox "दिनांक" [ref=e124]: 2026-01-15
                - paragraph [ref=e125]: YYYY-MM-DD format
              - generic [ref=e126]:
                - generic [ref=e127]: Payee
                - textbox "Payee" [ref=e128]: Test Payee
                - paragraph [ref=e129]: Only letters, spaces, dots, hyphens, apostrophes
              - generic [ref=e130]:
                - generic [ref=e131]: माध्यम
                - combobox "माध्यम" [ref=e132]:
                  - option "नकद" [selected]
                  - option "यूपीआई"
                  - option "बैंक ट्रांसफ़र"
                  - option "अन्य"
              - generic [ref=e133]:
                - generic [ref=e134]: Reference No
                - textbox "Reference No" [ref=e135]: REF-001
              - generic [ref=e136]:
                - generic [ref=e137]: टिप्पणियाँ
                - textbox "टिप्पणियाँ" [active] [ref=e138]: Test expense description for E2E testing
              - generic [ref=e139]:
                - generic [ref=e140]: राशि
                - spinbutton "राशि" [ref=e141]: "500"
              - button "सहेजें" [ref=e142]
          - generic [ref=e148]:
            - generic [ref=e149]:
              - heading "लेन-देन" [level=2] [ref=e150]
              - generic [ref=e151]: "10"
            - table [ref=e153]:
              - rowgroup [ref=e154]:
                - row [ref=e155]:
                  - columnheader "दिनांक" [ref=e156]
                  - columnheader "श्रेणी" [ref=e157]
                  - columnheader "Payee" [ref=e158]
                  - columnheader "राशि" [ref=e159]
                  - columnheader "स्थिति" [ref=e160]
              - rowgroup [ref=e161]:
                - row [ref=e162]:
                  - cell "26-11-2026" [ref=e163]
                  - cell [ref=e164]:
                    - paragraph [ref=e165]: Other
                    - paragraph [ref=e166]: Cash · Ref - 002
                  - cell [ref=e167]:
                    - paragraph [ref=e168]: Safai Wala
                    - paragraph [ref=e169]: EXP-2026-27-000003 · Masjid Admin
                  - cell "₹200" [ref=e170]
                  - cell "Pending approval स्वीकृत अस्वीकृत" [ref=e171]:
                    - generic [ref=e172]:
                      - generic [ref=e173]: Pending approval
                      - generic [ref=e174]:
                        - button "स्वीकृत" [ref=e176]
                        - button "अस्वीकृत" [ref=e178]
                - row [ref=e179]:
                  - cell "26-11-2026" [ref=e180]
                  - cell [ref=e181]:
                    - paragraph [ref=e182]: Other
                    - paragraph [ref=e183]: Cash · Ref - 002
                  - cell [ref=e184]:
                    - paragraph [ref=e185]: Safai Wala
                    - paragraph [ref=e186]: EXP-2026-27-000002 · Masjid Admin
                  - cell "₹200" [ref=e187]
                  - cell "Pending approval स्वीकृत अस्वीकृत" [ref=e188]:
                    - generic [ref=e189]:
                      - generic [ref=e190]: Pending approval
                      - generic [ref=e191]:
                        - button "स्वीकृत" [ref=e193]
                        - button "अस्वीकृत" [ref=e195]
                - row [ref=e196]:
                  - cell "26-11-2026" [ref=e197]
                  - cell [ref=e198]:
                    - paragraph [ref=e199]: Molana sab ki tankhwa
                    - paragraph [ref=e200]: Cash · Test 01
                  - cell [ref=e201]:
                    - paragraph [ref=e202]: Nasir Hafiz Sahab
                    - paragraph [ref=e203]: EXP-2026-27-000001 · Masjid Admin
                  - cell "₹10,000" [ref=e204]
                  - cell "Pending approval स्वीकृत अस्वीकृत" [ref=e205]:
                    - generic [ref=e206]:
                      - generic [ref=e207]: Pending approval
                      - generic [ref=e208]:
                        - button "स्वीकृत" [ref=e210]
                        - button "अस्वीकृत" [ref=e212]
                - row [ref=e213]:
                  - cell "20-02-2026" [ref=e214]
                  - cell [ref=e215]:
                    - paragraph [ref=e216]: Events
                    - paragraph [ref=e217]: Cash · REF-001
                  - cell [ref=e218]:
                    - paragraph [ref=e219]: Test Payee
                    - paragraph [ref=e220]: EXP-2025-26-000007 · Masjid Admin
                  - cell "₹500" [ref=e221]
                  - cell "Pending approval स्वीकृत अस्वीकृत" [ref=e222]:
                    - generic [ref=e223]:
                      - generic [ref=e224]: Pending approval
                      - generic [ref=e225]:
                        - button "स्वीकृत" [ref=e227]
                        - button "अस्वीकृत" [ref=e229]
                - row [ref=e230]:
                  - cell "20-02-2026" [ref=e231]
                  - cell [ref=e232]:
                    - paragraph [ref=e233]: Events
                    - paragraph [ref=e234]: Cash · REF-001
                  - cell [ref=e235]:
                    - paragraph [ref=e236]: Test Payee
                    - paragraph [ref=e237]: EXP-2025-26-000006 · Masjid Admin
                  - cell "₹500" [ref=e238]
                  - cell "Pending approval स्वीकृत अस्वीकृत" [ref=e239]:
                    - generic [ref=e240]:
                      - generic [ref=e241]: Pending approval
                      - generic [ref=e242]:
                        - button "स्वीकृत" [ref=e244]
                        - button "अस्वीकृत" [ref=e246]
                - row [ref=e247]:
                  - cell "20-02-2026" [ref=e248]
                  - cell [ref=e249]:
                    - paragraph [ref=e250]: Events
                    - paragraph [ref=e251]: Cash · REF-001
                  - cell [ref=e252]:
                    - paragraph [ref=e253]: Test Payee
                    - paragraph [ref=e254]: EXP-2025-26-000005 · Masjid Admin
                  - cell "₹500" [ref=e255]
                  - cell "Pending approval स्वीकृत अस्वीकृत" [ref=e256]:
                    - generic [ref=e257]:
                      - generic [ref=e258]: Pending approval
                      - generic [ref=e259]:
                        - button "स्वीकृत" [ref=e261]
                        - button "अस्वीकृत" [ref=e263]
                - row [ref=e264]:
                  - cell "20-02-2026" [ref=e265]
                  - cell [ref=e266]:
                    - paragraph [ref=e267]: Events
                    - paragraph [ref=e268]: Cash · REF-001
                  - cell [ref=e269]:
                    - paragraph [ref=e270]: Test Payee
                    - paragraph [ref=e271]: EXP-2025-26-000004 · Masjid Admin
                  - cell "₹500" [ref=e272]
                  - cell "Pending approval स्वीकृत अस्वीकृत" [ref=e273]:
                    - generic [ref=e274]:
                      - generic [ref=e275]: Pending approval
                      - generic [ref=e276]:
                        - button "स्वीकृत" [ref=e278]
                        - button "अस्वीकृत" [ref=e280]
                - row [ref=e281]:
                  - cell "20-02-2026" [ref=e282]
                  - cell [ref=e283]:
                    - paragraph [ref=e284]: Events
                    - paragraph [ref=e285]: Cash · REF-001
                  - cell [ref=e286]:
                    - paragraph [ref=e287]: Test Payee
                    - paragraph [ref=e288]: EXP-2025-26-000001 · Masjid Admin
                  - cell "₹500" [ref=e289]
                  - cell "Pending approval स्वीकृत अस्वीकृत" [ref=e290]:
                    - generic [ref=e291]:
                      - generic [ref=e292]: Pending approval
                      - generic [ref=e293]:
                        - button "स्वीकृत" [ref=e295]
                        - button "अस्वीकृत" [ref=e297]
                - row [ref=e298]:
                  - cell "15-01-2026" [ref=e299]
                  - cell [ref=e300]:
                    - paragraph [ref=e301]: Events
                    - paragraph [ref=e302]: Cash · REF-001
                  - cell [ref=e303]:
                    - paragraph [ref=e304]: Test Payee
                    - paragraph [ref=e305]: EXP-2025-26-000003 · Masjid Admin
                  - cell "₹500" [ref=e306]
                  - cell "Pending approval स्वीकृत अस्वीकृत" [ref=e307]:
                    - generic [ref=e308]:
                      - generic [ref=e309]: Pending approval
                      - generic [ref=e310]:
                        - button "स्वीकृत" [ref=e312]
                        - button "अस्वीकृत" [ref=e314]
                - row [ref=e315]:
                  - cell "15-01-2026" [ref=e316]
                  - cell [ref=e317]:
                    - paragraph [ref=e318]: Events
                    - paragraph [ref=e319]: Cash · REF-001
                  - cell [ref=e320]:
                    - paragraph [ref=e321]: Test Payee
                    - paragraph [ref=e322]: EXP-2025-26-000002 · Masjid Admin
                  - cell "₹500" [ref=e323]
                  - cell "Pending approval स्वीकृत अस्वीकृत" [ref=e324]:
                    - generic [ref=e325]:
                      - generic [ref=e326]: Pending approval
                      - generic [ref=e327]:
                        - button "स्वीकृत" [ref=e329]
                        - button "अस्वीकृत" [ref=e331]
  - button "Open Next.js Dev Tools" [ref=e337] [cursor=pointer]
  - alert [ref=e341]
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | 
  3   | const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
  4   | 
  5   | test.describe("Expense Management - Comprehensive Tests", () => {
  6   |   test.beforeEach(async ({ page }) => {
  7   |     // Navigate to expenses page and wait for it to load
  8   |     await page.goto(`${BASE_URL}/expenses`);
  9   |     await page.waitForLoadState('networkidle');
  10  |     await page.waitForTimeout(1000);
  11  |   });
  12  | 
  13  |   test("Record an expense successfully", async ({ page }) => {
  14  |     // Verify the expenses page loads
  15  |     await expect(page.locator("h1").first()).toBeVisible({ timeout: 5000 });
  16  | 
  17  |     // Wait for the form to be ready
  18  |     await page.waitForSelector('select[name="categoryId"]', { timeout: 10000 });
  19  | 
  20  |     // Select an expense category from the dropdown
  21  |     const categorySelect = page.locator('select[name="categoryId"]');
  22  |     await expect(categorySelect).toBeVisible();
  23  |     const options = await categorySelect.locator('option').all();
  24  |     if (options.length > 1) {
  25  |       await categorySelect.selectOption({ index: 1 });
  26  |     }
  27  |     await page.waitForTimeout(300);
  28  | 
  29  |     // Fill in expense details
  30  |     await page.fill('input[name="date"]', "2026-01-15");
  31  |     await page.fill('input[name="payee"]', "Test Payee");
  32  |     await page.fill('input[name="amount"]', "500"); // 500 INR
  33  |     await page.selectOption('select[name="mode"]', "CASH");
  34  |     await page.fill('input[name="referenceNo"]', "REF-001");
  35  |     await page.fill('textarea[name="description"]', "Test expense description for E2E testing");
  36  | 
  37  |     // Submit the expense
> 38  |     await page.click('button:has-text("Save")');
      |                ^ TimeoutError: page.click: Timeout 15000ms exceeded.
  39  |     await page.waitForTimeout(3000);
  40  | 
  41  |     // Check for success - no error message should appear
  42  |     const errorMessage = page.locator('p[role="alert"]');
  43  |     const hasError = await errorMessage.count() > 0;
  44  | 
  45  |     if (hasError) {
  46  |       const errorText = await errorMessage.textContent();
  47  |       console.log("Expense form error:", errorText);
  48  |       throw new Error(`Expense submission failed: ${errorText}`);
  49  |     }
  50  | 
  51  |     // If no error, test passes - form was submitted successfully
  52  |     await page.waitForTimeout(1000);
  53  |     console.log("✅ Expense recorded successfully");
  54  |   });
  55  | 
  56  |   test("Add new expense category in settings", async ({ page }) => {
  57  |     // Navigate to settings expense categories tab
  58  |     await page.goto(`${BASE_URL}/settings?tab=expenseCategories`);
  59  |     await page.waitForLoadState('networkidle');
  60  |     await page.waitForTimeout(2000);
  61  | 
  62  |     // Click add expense category button
  63  |     await page.click('button:has-text("Add Expense Category")');
  64  |     await page.waitForTimeout(500);
  65  | 
  66  |     // Fill in category name
  67  |     const uniqueName = `Test Category ${Date.now().toString(36).replace(/\d/g, '').substring(0, 8)}`;
  68  |     await page.fill('input[name="name"]', uniqueName);
  69  | 
  70  |     // Save the category
  71  |     await page.click('button:has-text("Save")');
  72  | 
  73  |     // Wait for the server action to complete and page to reload
  74  |     // The form uses useReloadOnSuccess which triggers window.location.reload() on success
  75  |     await page.waitForURL(/settings/, { timeout: 60000 });
  76  |     await page.waitForLoadState('networkidle');
  77  |     await page.waitForLoadState('domcontentloaded');
  78  |     await page.waitForTimeout(5000);
  79  | 
  80  |     // Force a fresh navigation with cache-busting to ensure server-side data is fresh
  81  |     await page.goto(`${BASE_URL}/settings?tab=expenseCategories&_=${Date.now()}`, { waitUntil: 'networkidle' });
  82  |     await page.waitForTimeout(5000);
  83  | 
  84  |     // Check for any error messages first
  85  |     const errorMessage = page.locator('p[role="alert"]');
  86  |     const hasError = await errorMessage.count() > 0;
  87  |     if (hasError) {
  88  |       const errorText = await errorMessage.textContent();
  89  |       console.log("Create category error:", errorText);
  90  |       throw new Error(`Category creation failed: ${errorText}`);
  91  |     }
  92  | 
  93  |     // Debug: log category list items
  94  |     const listItems = await page.locator('ul >> li').allTextContents();
  95  |     console.log("Category list items:", listItems);
  96  | 
  97  |     // Verify the category was created - it should appear in the list
  98  |     await expect(page.locator(`text=${uniqueName}`)).toBeVisible({ timeout: 180000 });
  99  |     console.log(`✅ Expense category "${uniqueName}" created successfully`);
  100 |   });
  101 | 
  102 |   test("Update expense category in settings", async ({ page }) => {
  103 |     await page.goto(`${BASE_URL}/settings?tab=expenseCategories`);
  104 |     await page.waitForLoadState('networkidle');
  105 |     await page.waitForTimeout(1000);
  106 | 
  107 |     // First create a test category to update
  108 |     await page.click('button:has-text("Add Expense Category")');
  109 |     await page.waitForTimeout(500);
  110 | 
  111 |     const uniqueName = `Test Category ${Date.now().toString(36).replace(/\d/g, '').substring(0, 8)}`;
  112 |     await page.fill('input[name="name"]', uniqueName);
  113 |     await page.click('button:has-text("Save")');
  114 | 
  115 |     // Wait for the form to submit and page to reload
  116 |     // The form uses useReloadOnSuccess which triggers window.location.reload() on success
  117 |     await page.waitForURL(/settings/, { timeout: 60000 });
  118 |     await page.waitForLoadState('networkidle');
  119 |     await page.waitForLoadState('domcontentloaded');
  120 |     await page.waitForTimeout(5000);
  121 | 
  122 |     // Force a fresh navigation with cache-busting to ensure server-side data is fresh
  123 |     await page.goto(`${BASE_URL}/settings?tab=expenseCategories&_=${Date.now()}`, { waitUntil: 'networkidle' });
  124 |     await page.waitForTimeout(5000);
  125 | 
  126 |     // Debug: log category list items
  127 |     const listItems = await page.locator('ul >> li').allTextContents();
  128 |     console.log("Category list items after create:", listItems);
  129 | 
  130 |     // Check for any error messages first
  131 |     const errorMessage2 = page.locator('p[role="alert"]');
  132 |     const hasError2 = await errorMessage2.count() > 0;
  133 |     if (hasError2) {
  134 |       const errorText = await errorMessage2.textContent();
  135 |       console.log("Create category error:", errorText);
  136 |       throw new Error(`Category creation failed: ${errorText}`);
  137 |     }
  138 | 
```