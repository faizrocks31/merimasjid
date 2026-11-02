# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: browser-verification.spec.ts >> Browser Verification - Phase 3 >> 5. Create manual event
- Location: e2e\browser-verification.spec.ts:139:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Manual Event Test hvnnmizx').first()
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('text=Manual Event Test hvnnmizx').first() with timeout 15000ms
  - waiting for locator('text=Manual Event Test hvnnmizx').first()

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
  - heading [level=1]
  - paragraph: हुसैनी मस्जिद आलोट
  - button "Masjid Details"
  - button "Contribution Categories"
  - button "Expense Categories"
  - button "Notifications"
  - button "Staff"
  - heading "Category" [level=2]
  - button "Add Category"
  - list:
    - listitem:
      - paragraph: Annual Chanda
      - paragraph: ANNUAL · Recurring
      - text: Annual HOUSEHOLD_WISE
      - button "Edit"
      - button "Delete"
      - paragraph: Collection Events (0)
      - button "Add Event"
      - button "Generate events"
      - paragraph: No collection events yet
    - listitem:
      - paragraph: Construction Fund
      - paragraph: CONSTRUCTION · Restricted
      - text: Restricted
      - button "Edit"
      - button "Delete"
      - paragraph: Collection Events (0)
      - button "Add Event"
      - paragraph: No collection events yet
    - listitem:
      - paragraph: General Donation
      - paragraph: GENERAL · General
      - button "Edit"
      - button "Delete"
      - paragraph: Collection Events (0)
      - button "Add Event"
      - paragraph: No collection events yet
    - listitem:
      - paragraph: Monthly Chanda
      - paragraph: MONTHLY · Recurring
      - button "Edit"
      - button "Delete"
      - paragraph: Collection Events (0)
      - button "Add Event"
      - paragraph: No collection events yet
    - listitem:
      - paragraph: Sadaqah
      - paragraph: SADAQAH · General
      - button "Edit"
      - button "Delete"
      - paragraph: Collection Events (0)
      - button "Add Event"
      - paragraph: No collection events yet
    - listitem:
      - paragraph: Test Monthly Chanda
      - paragraph: TESTMONTH014527 · DONATIONS
      - text: Monthly HOUSEHOLD_WISE
      - button "Edit"
      - button "Delete"
      - paragraph: Collection Events (3)
      - button "Add Event"
      - button "Generate events"
      - list:
        - listitem:
          - paragraph: Manual Event Test fkxemwyq
          - paragraph: "01 Jun 2026 · Due date: 15 Jun 2026 · ₹20,000"
          - text: Scheduled
          - button "Assign households"
          - button "Edit"
          - button "Delete"
        - listitem:
          - paragraph: Manual Event Test fkxemwyq
          - paragraph: "01 Jun 2026 · Due date: 15 Jun 2026 · ₹20,000"
          - text: Scheduled
          - button "Assign households"
          - button "Edit"
          - button "Delete"
        - listitem:
          - paragraph: Manual Event Test ozclimda
          - paragraph: "01 Jun 2026 · Due date: 15 Jun 2026 · ₹20,000"
          - text: Scheduled
          - button "Assign households"
          - button "Edit"
          - button "Delete"
      - paragraph: "Category: Test Monthly Chanda"
      - text: Name
      - textbox "Name" [disabled]: Manual Event Test hvnnmizx
      - paragraph: Only letters, spaces, dots, hyphens, apostrophes
      - text: Date
      - textbox "Date" [disabled]: 2026-06-01
      - text: Date
      - textbox "Date" [disabled]
      - text: Date
      - textbox "Date" [disabled]: 2026-06-15
      - text: Expected amount
      - spinbutton "Expected amount" [disabled]: "20000"
      - text: Status
      - combobox "Status" [disabled]:
        - option "Scheduled" [selected]
        - option "Open"
        - option "Completed"
        - option "Cancelled"
      - text: Applicable Month
      - spinbutton "Applicable Month" [disabled]
      - text: Applicable Year
      - spinbutton "Applicable Year" [disabled]
      - text: Notes
      - textbox "Notes" [disabled]
      - button "Loading…" [disabled]
      - button "Cancel"
    - listitem:
      - paragraph: Test Monthly Chanda
      - paragraph: TESTMONTH077780 · DONATIONS
      - text: Monthly HOUSEHOLD_WISE
      - button "Edit"
      - button "Delete"
      - paragraph: Collection Events (1)
      - button "Add Event"
      - button "Generate events"
      - list:
        - listitem:
          - paragraph: Manual Event Test tqnihqeh
          - paragraph: "01 Jun 2026 · Due date: 15 Jun 2026 · ₹20,000"
          - text: Scheduled
          - button "Assign households"
          - button "Edit"
          - button "Delete"
    - listitem:
      - paragraph: Test Monthly Chanda
      - paragraph: TESTMONTH143931 · DONATIONS
      - text: Monthly HOUSEHOLD_WISE
      - button "Edit"
      - button "Delete"
      - paragraph: Collection Events (1)
      - button "Add Event"
      - button "Generate events"
      - list:
        - listitem:
          - paragraph: Manual Event Test tqnihqeh
          - paragraph: "01 Jun 2026 · Due date: 15 Jun 2026 · ₹20,000"
          - text: Scheduled
          - button "Assign households"
          - button "Edit"
          - button "Delete"
    - listitem:
      - paragraph: Test Monthly Chanda
      - paragraph: TESTMONTH507007 · DONATIONS
      - text: Monthly HOUSEHOLD_WISE
      - button "Edit"
      - button "Delete"
      - paragraph: Collection Events (1)
      - button "Add Event"
      - button "Generate events"
      - list:
        - listitem:
          - paragraph: Manual Event Test ipuueuht
          - paragraph: "01 Jun 2026 · Due date: 15 Jun 2026 · ₹20,000"
          - text: Scheduled
          - button "Assign households"
          - button "Edit"
          - button "Delete"
    - listitem:
      - paragraph: Zakat
      - paragraph: ZAKAT · Restricted
      - text: Restricted
      - button "Edit"
      - button "Delete"
      - paragraph: Collection Events (0)
      - button "Add Event"
      - paragraph: No collection events yet
- alert
```

# Test source

```ts
  58  |       console.log('Tab:', { text, title });
  59  |     }
  60  | 
  61  |     // The tab is a TabsTrigger with icon + tooltip, not visible text
  62  |     await expect(page.locator('button[title="Contribution Categories"]').first()).toBeVisible({ timeout: 10000 });
  63  |   });
  64  | 
  65  |   test("3. Ensure a TESTMONTH category exists for subsequent tests", async ({ page }) => {
  66  |     await page.goto(`${BASE_URL}/settings?tab=contributionCategories`);
  67  |     await page.waitForTimeout(500);
  68  | 
  69  |     // Locate existing TESTMONTH categories
  70  |     const testMonthCategories = page.locator('text=/TESTMONTH\\d+/');
  71  |     const count = await testMonthCategories.count();
  72  |     if (count > 0) {
  73  |       // Use the first existing category
  74  |       const firstCode = await testMonthCategories.first().textContent();
  75  |       const categoryCode = firstCode?.trim() || '';
  76  |       dynamicCategoryCode = categoryCode;
  77  | 
  78  |       // Extract name from the category card (parent elements)
  79  |       const categoryCard = page.locator(`text=${dynamicCategoryCode}`).first().locator('..').locator('..').locator('..');
  80  |       const cardText = await categoryCard.textContent();
  81  |       dynamicCategoryName = cardText?.replace(dynamicCategoryCode, '').trim() || `Test Monthly Chanda ${dynamicCategoryCode}`;
  82  |     } else {
  83  |       // No existing category – create a new one with deterministic values
  84  |       const uniqueName = `Test Monthly Chanda ${Date.now()}`;
  85  |       const uniqueCode = `TESTMONTH${String(Date.now()).slice(-6)}`;
  86  | 
  87  |       // Click add category button - it's a toggle button
  88  |       await page.click('button:has-text("Add Category")');
  89  |       await page.waitForTimeout(500);
  90  | 
  91  |       // Fill category form
  92  |       await page.fill('input[name="name"]', uniqueName);
  93  |       await page.fill('input[name="code"]', uniqueCode);
  94  |       await page.fill('input[name="reportingGroup"]', "DONATIONS");
  95  |       await page.selectOption('select[name="frequency"]', "MONTHLY");
  96  |       await page.selectOption('select[name="collectionMode"]', "HOUSEHOLD_WISE");
  97  |       await page.fill('input[name="defaultAmountPaise"]', "10000"); // 100 INR
  98  |       await page.fill('input[name="defaultDueDay"]', "5");
  99  |       await page.fill('input[name="defaultGraceDays"]', "10");
  100 | 
  101 |       // Save the new category
  102 |       await page.click('button:has-text("Save")');
  103 |       await page.waitForLoadState('networkidle');
  104 |       await page.waitForTimeout(3000);
  105 | 
  106 |       dynamicCategoryName = uniqueName;
  107 |       dynamicCategoryCode = uniqueCode;
  108 |     }
  109 | 
  110 |     // Persist for later tests
  111 |     fs.writeFileSync(path.resolve(DYNAMIC_CATEGORY_FILE), `${dynamicCategoryName}|${dynamicCategoryCode}`);
  112 |     console.log('Using category for tests:', dynamicCategoryName, dynamicCategoryCode);
  113 |   });
  114 | 
  115 |   test("4. Generate events from category scheduling rules", async ({ page }) => {
  116 |     await page.goto(`${BASE_URL}/settings?tab=contributionCategories`);
  117 |     await page.waitForTimeout(500);
  118 | 
  119 |     // Find the dynamically created category's "Generate events" button
  120 |     // Use the unique code which appears in the category card
  121 |     await page.locator(`text=${dynamicCategoryCode}`).locator('..').locator('..').locator('..').locator('button:has-text("Generate events")').first().click();
  122 |     await page.waitForTimeout(300);
  123 | 
  124 |     // Fill generate form
  125 |     await page.fill('input[name="startDate"]', "2026-01-01");
  126 |     await page.fill('input[name="endDate"]', "2026-12-31");
  127 | 
  128 |     await page.click('button:has-text("Generate Events")');
  129 |     await page.waitForTimeout(3000);
  130 | 
  131 |     // Verify events were generated - page reloads on success
  132 |     // The list shows name + code concatenated, so we search for the code
  133 |     await expect(page.locator(`text=${dynamicCategoryCode}`).first()).toBeVisible();
  134 |     // Check that Collection Events count > 0 for this category
  135 |     const categoryItem = page.locator("li").filter({ hasText: dynamicCategoryCode }).first();
  136 |     await expect(categoryItem).toContainText(/Collection Events \(\d+\)/);
  137 |   });
  138 | 
  139 |   test("5. Create manual event", async ({ page }) => {
  140 |     await page.goto(`${BASE_URL}/settings?tab=contributionCategories`);
  141 |     await page.waitForTimeout(500);
  142 | 
  143 |     // Click Add Event for dynamically created category
  144 |     // The list shows name + code concatenated, so we search for the code
  145 |     await page.locator(`text=${dynamicCategoryCode}`).locator('..').locator('..').locator('..').locator('button:has-text("Add Event")').first().click();
  146 |     await page.waitForTimeout(300);
  147 | 
  148 |     // Fill event form with unique name
  149 |     await page.fill('input[name="name"]', MANUAL_EVENT_NAME);
  150 |     await page.fill('input[name="startDate"]', "2026-06-01");
  151 |     await page.fill('input[name="dueDate"]', "2026-06-15");
  152 |     await page.fill('input[name="expectedAmountPaise"]', "20000"); // 200 INR
  153 |     await page.selectOption('select[name="status"]', "SCHEDULED");
  154 | 
  155 |     // The save triggers a page reload via useReloadOnSuccess
  156 |     await page.click('button:has-text("Save")');
  157 |     // Wait for the specific event name to appear in the DOM (more reliable than networkidle)
> 158 |     await expect(page.locator(`text=${MANUAL_EVENT_NAME}`).first()).toBeVisible({ timeout: 15000 });
      |                                                                     ^ Error: expect(locator).toBeVisible() failed
  159 |   });
  160 | 
  161 |   test("6. Assign households to event", async ({ page }) => {
  162 |     await page.goto(`${BASE_URL}/settings?tab=contributionCategories`);
  163 |     await page.waitForTimeout(500);
  164 | 
  165 |     // The "Assign households" button is icon-only with aria-label.
  166 |     // Find the first "Assign households" button that appears after our manual event name
  167 |     // Use a more reliable locator: find the button directly by accessible name
  168 |     const assignBtn = page.getByRole("button", { name: "Assign households" }).first();
  169 |     await expect(assignBtn).toBeVisible({ timeout: 10000 });
  170 |     await assignBtn.click();
  171 |     await page.waitForTimeout(500);
  172 | 
  173 |     // The assignment form is the only open form on the page
  174 |     const assignForm = page.locator("form").filter({ hasText: "Expected amount per household" });
  175 | 
  176 |     // First, check if there are any members by searching
  177 |     await assignForm.locator('input[type="search"]').fill("Test Member Browser");
  178 |     await page.waitForTimeout(3000); // Wait longer for search results
  179 | 
  180 |     // Debug: Check what's in the form
  181 |     const formHTML = await assignForm.evaluate(el => el.outerHTML);
  182 |     console.log('Assign form HTML:', formHTML.substring(0, 3000));
  183 | 
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
```