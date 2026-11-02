# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: browser-verification.spec.ts >> Regression Tests - Phase 4 >> Reports - Category totals tab works
- Location: e2e\browser-verification.spec.ts:486:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('table')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('table') with timeout 15000ms
  - waiting for locator('table')

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
  - heading "Reports" [level=1]
  - paragraph: 01-11-2026 – 30-11-2026
  - link "Export CSV":
    - /url: /api/exports/transactions?from=2026-11-01&to=2026-11-30
    - button "Export CSV"
  - paragraph: Gross collection
  - paragraph: ₹0.00
  - paragraph: 0 transactions
  - paragraph: Reversals
  - paragraph: ₹0.00
  - paragraph: "0"
  - paragraph: Net collection
  - paragraph: ₹0.00
  - paragraph: Net cash movement
  - paragraph: ₹0.00
  - paragraph: "Expenses: ₹0.00"
  - text: Date range
  - textbox "Date range": 2026-11-01
  - text: –
  - textbox "–": 2026-11-30
  - button "Search"
  - link "Gross collection":
    - /url: /reports?report=collection&from=2026-11-01&to=2026-11-30
  - link "Pending dues":
    - /url: /reports?report=dues&from=2026-11-01&to=2026-11-30
  - link "Category-wise collection":
    - /url: /reports?report=category&from=2026-11-01&to=2026-11-30
  - link "Collection Events":
    - /url: /reports?report=event&from=2026-11-01&to=2026-11-30
  - link "Payment-mode totals":
    - /url: /reports?report=mode&from=2026-11-01&to=2026-11-30
  - link "Collector-wise collection":
    - /url: /reports?report=collector&from=2026-11-01&to=2026-11-30
  - link "Income vs expenses":
    - /url: /reports?report=expense&from=2026-11-01&to=2026-11-30
  - heading "Category-wise collection" [level=2]
  - paragraph: Nothing here yet
- alert
```

# Test source

```ts
  390 |       if (await errorMsg.isVisible({ timeout: 2000 })) {
  391 |         console.log('Member limit reached - this is expected in TRIAL plan with 100 member limit');
  392 |         // Test passes - the limit enforcement is working correctly
  393 |         return;
  394 |       }
  395 |       throw new Error('Member creation failed - no navigation to detail page and no limit error shown');
  396 |     }
  397 |   });
  398 | 
  399 |   test("Contribution plans page loads", async ({ page }) => {
  400 |     await page.goto(`${BASE_URL}/plans`);
  401 |     await expect(page.locator("h1").first()).toBeVisible({ timeout: 5000 });
  402 |   });
  403 | 
  404 |   test("Create contribution plan works", async ({ page }) => {
  405 |     await page.goto(`${BASE_URL}/plans/new`);
  406 |     await page.waitForTimeout(500);
  407 | 
  408 |     // The member is chosen with a search widget, not a <select>
  409 |     await page.fill("#member-search", "Test Member Browser");
  410 |     await page.waitForTimeout(300);
  411 |     await page.click('button:has-text("Test Member Browser")');
  412 |     await page.waitForTimeout(300);
  413 | 
  414 |     await page.selectOption('select[name="categoryId"]', { index: 1 });
  415 |     await page.fill('input[name="amountPaise"]', "100");
  416 |     await page.selectOption('select[name="frequency"]', "MONTHLY");
  417 |     await page.fill('input[name="startDate"]', "2026-01-01");
  418 |     await page.fill('input[name="dueDay"]', "5");
  419 | 
  420 |     await page.click('button:has-text("Save")');
  421 |     await page.waitForTimeout(2000);
  422 | 
  423 |     await expect(page).toHaveURL(/\/plans/);
  424 |   });
  425 | 
  426 |   test("Collections review page loads", async ({ page }) => {
  427 |     await page.goto(`${BASE_URL}/collections/review`);
  428 |     await expect(page.locator("h1").first()).toBeVisible({ timeout: 5000 });
  429 |   });
  430 | 
  431 |   test("Expenses page loads", async ({ page }) => {
  432 |     await page.goto(`${BASE_URL}/expenses`);
  433 |     await expect(page.locator("h1").first()).toBeVisible({ timeout: 5000 });
  434 |   });
  435 | 
  436 |   test("Create expense category works", async ({ page }) => {
  437 |     await page.goto(`${BASE_URL}/settings?tab=expenseCategories`);
  438 |     await page.waitForTimeout(500);
  439 | 
  440 |     // The button text is "Add Expense Category" on this tab
  441 |     await page.click('button:has-text("Add Expense Category")');
  442 |     await page.waitForTimeout(300);
  443 | 
  444 |     await page.fill('input[name="name"]', "Test Expense");
  445 |     await page.click('button:has-text("Save")');
  446 |     await page.waitForTimeout(500);
  447 | 
  448 |     await expect(page.locator("text=Test Expense")).toBeVisible();
  449 |   });
  450 | 
  451 |   test("Settings - Masjid details tab works", async ({ page }) => {
  452 |     await page.goto(`${BASE_URL}/settings?tab=masjid`);
  453 |     await page.waitForTimeout(500);
  454 | 
  455 |     // The CardTitle shows "Masjid name" (not "Masjid Details")
  456 |     await expect(page.locator('h2:has-text("Masjid name")').first()).toBeVisible();
  457 |     await expect(page.locator('input[name="name"]')).toBeVisible();
  458 |   });
  459 | 
  460 |   test("Settings - Notifications tab works", async ({ page }) => {
  461 |     await page.goto(`${BASE_URL}/settings?tab=notifications`);
  462 |     await page.waitForTimeout(500);
  463 | 
  464 |     // The CardTitle shows "Notifications" (from labels.notifications)
  465 |     await expect(page.locator('h2:has-text("Notifications")').first()).toBeVisible();
  466 |   });
  467 | 
  468 |   test("Settings - Staff tab works", async ({ page }) => {
  469 |     await page.goto(`${BASE_URL}/settings?tab=staff`);
  470 |     await page.waitForTimeout(500);
  471 | 
  472 |     // The heading is in the CardTitle inside the Staff list
  473 |     await expect(page.locator('h2:has-text("Staff")').first()).toBeVisible();
  474 |   });
  475 | 
  476 |   test("Transactions page loads", async ({ page }) => {
  477 |     await page.goto(`${BASE_URL}/transactions`);
  478 |     await expect(page.locator("h1").first()).toBeVisible({ timeout: 5000 });
  479 |   });
  480 | 
  481 |   test("Audit page loads", async ({ page }) => {
  482 |     await page.goto(`${BASE_URL}/audit`);
  483 |     await expect(page.locator("h1").first()).toBeVisible({ timeout: 5000 });
  484 |   });
  485 | 
  486 |   test("Reports - Category totals tab works", async ({ page }) => {
  487 |     await page.goto(`${BASE_URL}/reports?report=category`);
  488 |     await page.waitForTimeout(500);
  489 | 
> 490 |     await expect(page.locator("table")).toBeVisible();
      |                                         ^ Error: expect(locator).toBeVisible() failed
  491 |   });
  492 | 
  493 |   // Create a member with a plan that will have dues for the member ledger test
  494 |   test("Setup: Create member with plan for dues report", async ({ page }) => {
  495 |     await page.goto(`${BASE_URL}/members/new`);
  496 |     await page.waitForTimeout(500);
  497 | 
  498 |     const uniquePhone = `9${String(Date.now()).slice(-9)}`;
  499 |     await page.fill('input[name="fullName"]', "Test Member For Dues");
  500 |     await page.fill('input[name="fatherName"]', "Father Name");
  501 |     await page.fill('input[name="phone"]', uniquePhone);
  502 |     await page.fill('textarea[name="address"]', "Test Address");
  503 |     await page.fill('input[name="joinDate"]', "2026-01-01");
  504 | 
  505 |     await page.click('button:has-text("Save")');
  506 |     await page.waitForTimeout(2000);
  507 | 
  508 |     // Create a contribution plan for this member
  509 |     await page.goto(`${BASE_URL}/plans/new`);
  510 |     await page.waitForTimeout(500);
  511 | 
  512 |     await page.fill("#member-search", "Test Member For Dues");
  513 |     await page.waitForTimeout(300);
  514 |     await page.click('button:has-text("Test Member For Dues")');
  515 |     await page.waitForTimeout(300);
  516 | 
  517 |     await page.selectOption('select[name="categoryId"]', { index: 1 });
  518 |     await page.fill('input[name="amountPaise"]', "10000"); // 100 INR
  519 |     await page.selectOption('select[name="frequency"]', "MONTHLY");
  520 |     await page.fill('input[name="startDate"]', "2026-01-01");
  521 |     await page.fill('input[name="dueDay"]', "5");
  522 | 
  523 |     await page.click('button:has-text("Save")');
  524 |     await page.waitForTimeout(2000);
  525 |   });
  526 | 
  527 |   test("Reports - Member ledger tab works", async ({ page }) => {
  528 |     await page.goto(`${BASE_URL}/reports`);
  529 |     await page.waitForTimeout(500);
  530 | 
  531 |     // Member ledger is the "dues" report - the tab label is "Pending dues"
  532 |     await page.click('a:has-text("Pending dues")');
  533 |     await page.waitForTimeout(500);
  534 | 
  535 |     // Verify the page loads - just check for the tab title (heading)
  536 |     await expect(page.locator("h2:has-text('Pending dues')").first()).toBeVisible();
  537 |   });
  538 | });
```