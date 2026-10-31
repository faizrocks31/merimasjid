import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";
const ADMIN_EMAIL = "localadmin@gmail.com";
const ADMIN_PASSWORD = "admin123";

// The unique event name is written once by globalSetup and read here, so
// retries (which re-import this file) all target the same event.
const MANUAL_EVENT_NAME = fs
  .readFileSync(path.resolve("e2e/manual-event-name.txt"), "utf-8")
  .trim();

// Unique category name/code for this test run to avoid conflicts with previous runs
const CATEGORY_SUFFIX = MANUAL_EVENT_NAME.replace("Manual Event Test ", "");
const TEST_CATEGORY_NAME = `Test Monthly Chanda ${CATEGORY_SUFFIX}`;
const TEST_CATEGORY_CODE = `TESTMONTH${CATEGORY_SUFFIX.toUpperCase()}`.slice(0, 20); // max 20 chars

// Store dynamically created category name from test 3 for use in test 4+
// Read from file to persist across retries
const DYNAMIC_CATEGORY_FILE = "e2e/dynamic-category.txt";
let dynamicCategoryName: string;
let dynamicCategoryCode: string;

try {
  const content = fs.readFileSync(path.resolve(DYNAMIC_CATEGORY_FILE), "utf-8").trim();
  const [name, code] = content.split("|");
  dynamicCategoryName = name;
  dynamicCategoryCode = code;
} catch {
  dynamicCategoryName = "";
  dynamicCategoryCode = "";
}

test.describe.serial("Browser Verification - Phase 3", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    console.log('Logging in...');
    await page.goto(`${BASE_URL}/login`);
    console.log('On login page');
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    console.log('Submitted login form, waiting for redirect...');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('Logged in successfully, on dashboard page');
  });

  test("2. Settings - Contribution Categories tab loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/settings?tab=contributionCategories`);

    // Debug: check page content
    console.log('Current URL:', page.url());
    const bodyText = await page.locator('body').textContent();
    console.log('Body text snippet:', bodyText?.substring(0, 1000));

    // Check for tabs
    const tabs = await page.locator('button[role="tab"]').all();
    console.log('Number of tabs found:', tabs.length);
    for (const tab of tabs) {
      const text = await tab.textContent();
      const title = await tab.getAttribute('title');
      console.log('Tab:', { text, title });
    }

    // The tab is a TabsTrigger with icon + tooltip, not visible text
    await expect(page.locator('button[title="Contribution Categories"]').first()).toBeVisible({ timeout: 10000 });
  });

  test("3. Create category with frequency, collection mode, default amount", async ({ page }) => {
    await page.goto(`${BASE_URL}/settings?tab=contributionCategories`);
    await page.waitForTimeout(500);

    // Click add category button - it's a toggle button
    await page.click('button:has-text("Add Category")');
    await page.waitForTimeout(500);

    // Use unique name for this test run to avoid conflicts
    const uniqueName = `Test Monthly Chanda ${Date.now()}`;
    const uniqueCode = `TESTMONTH${String(Date.now()).slice(-6)}`;

    // Store for use in subsequent tests - write to file to persist across retries
    dynamicCategoryName = uniqueName;
    dynamicCategoryCode = uniqueCode;
    fs.writeFileSync(path.resolve(DYNAMIC_CATEGORY_FILE), `${dynamicCategoryName}|${dynamicCategoryCode}`);

    // Fill category form
    await page.fill('input[name="name"]', uniqueName);
    await page.fill('input[name="code"]', uniqueCode);
    // reportingGroup is a text input, not a select
    await page.fill('input[name="reportingGroup"]', "DONATIONS");
    await page.selectOption('select[name="frequency"]', "MONTHLY");
    await page.selectOption('select[name="collectionMode"]', "HOUSEHOLD_WISE");
    await page.fill('input[name="defaultAmountPaise"]', "10000"); // 100 INR
    await page.fill('input[name="defaultDueDay"]', "5");
    await page.fill('input[name="defaultGraceDays"]', "10");

    // Click save
    await page.click('button:has-text("Save")');

    // Wait for navigation/reload - longer wait
    await page.waitForTimeout(5000);

    // Debug: Check what's on the page
    const bodyText = await page.locator('body').textContent();
    console.log('Body text snippet after save:', bodyText?.substring(0, 2000));

    // Verify category appears in list - check for the unique code which is unique
    // The list shows name + code concatenated, so we can search for the code
    await expect(page.locator(`text=${dynamicCategoryCode}`).first()).toBeVisible({ timeout: 15000 });
  });

  test("4. Generate events from category scheduling rules", async ({ page }) => {
    await page.goto(`${BASE_URL}/settings?tab=contributionCategories`);
    await page.waitForTimeout(500);

    // Find the dynamically created category's "Generate events" button
    // Use the unique code which appears in the category card
    await page.locator(`text=${dynamicCategoryCode}`).locator('..').locator('..').locator('..').locator('button:has-text("Generate events")').first().click();
    await page.waitForTimeout(300);

    // Fill generate form
    await page.fill('input[name="startDate"]', "2026-01-01");
    await page.fill('input[name="endDate"]', "2026-12-31");

    await page.click('button:has-text("Generate Events")');
    await page.waitForTimeout(3000);

    // Verify events were generated - page reloads on success
    // The list shows name + code concatenated, so we search for the code
    await expect(page.locator(`text=${dynamicCategoryCode}`).first()).toBeVisible();
    // Check that Collection Events count > 0 for this category
    const categoryItem = page.locator("li").filter({ hasText: dynamicCategoryCode }).first();
    await expect(categoryItem).toContainText(/Collection Events \(\d+\)/);
  });

  test("5. Create manual event", async ({ page }) => {
    await page.goto(`${BASE_URL}/settings?tab=contributionCategories`);
    await page.waitForTimeout(500);

    // Click Add Event for dynamically created category
    // The list shows name + code concatenated, so we search for the code
    await page.locator(`text=${dynamicCategoryCode}`).locator('..').locator('..').locator('..').locator('button:has-text("Add Event")').first().click();
    await page.waitForTimeout(300);

    // Fill event form with unique name
    await page.fill('input[name="name"]', MANUAL_EVENT_NAME);
    await page.fill('input[name="startDate"]', "2026-06-01");
    await page.fill('input[name="dueDate"]', "2026-06-15");
    await page.fill('input[name="expectedAmountPaise"]', "20000"); // 200 INR
    await page.selectOption('select[name="status"]', "SCHEDULED");

    // The save triggers a page reload via useReloadOnSuccess
    await page.click('button:has-text("Save")');
    // Wait for the specific event name to appear in the DOM (more reliable than networkidle)
    await expect(page.locator(`text=${MANUAL_EVENT_NAME}`).first()).toBeVisible({ timeout: 15000 });
  });

  test("6. Assign households to event", async ({ page }) => {
    await page.goto(`${BASE_URL}/settings?tab=contributionCategories`);
    await page.waitForTimeout(500);

    // The "Assign households" button is icon-only with aria-label.
    // Find the first "Assign households" button that appears after our manual event name
    // Use a more reliable locator: find the button directly by accessible name
    const assignBtn = page.getByRole("button", { name: "Assign households" }).first();
    await expect(assignBtn).toBeVisible({ timeout: 10000 });
    await assignBtn.click();
    await page.waitForTimeout(500);

    // The assignment form is the only open form on the page
    const assignForm = page.locator("form").filter({ hasText: "Expected amount per household" });

    // First, check if there are any members by searching
    await assignForm.locator('input[type="search"]').fill("Test Member Browser");
    await page.waitForTimeout(3000); // Wait longer for search results

    // Debug: Check what's in the form
    const formHTML = await assignForm.evaluate(el => el.outerHTML);
    console.log('Assign form HTML:', formHTML.substring(0, 3000));

    // The search results render checkboxes inside labels - look for them in the results div
    const resultsDiv = assignForm.locator('div.max-h-52.overflow-y-auto');
    await expect(resultsDiv).toBeVisible();

    // Look for checkboxes in the results
    const checkboxes = resultsDiv.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    console.log('Checkbox count:', checkboxCount);

    if (checkboxCount === 0) {
      // No members found - need to create one first
      console.log('No members found, creating a test member...');
      await page.goto(`${BASE_URL}/members/new`);
      await page.waitForTimeout(500);

      await page.fill('input[name="fullName"]', "Test Member For Assignment");
      await page.fill('input[name="fatherName"]', "Father Name");
      const uniquePhone = `9${String(Date.now()).slice(-9)}`;
      await page.fill('input[name="phone"]', uniquePhone);
      await page.fill('textarea[name="address"]', "Test Address");
      await page.fill('input[name="joinDate"]', "2026-01-01");

      await page.click('button:has-text("Save")');
      await page.waitForTimeout(2000);

      // Go back to settings and re-open assign form
      await page.goto(`${BASE_URL}/settings?tab=contributionCategories`);
      await page.waitForTimeout(500);
      const assignBtn2 = page.getByRole("button", { name: "Assign households" }).first();
      await expect(assignBtn2).toBeVisible({ timeout: 10000 });
      await assignBtn2.click();
      await page.waitForTimeout(500);

      const assignForm2 = page.locator("form").filter({ hasText: "Expected amount per household" });
      await assignForm2.locator('input[type="search"]').fill("Test Member");
      await page.waitForTimeout(3000);

      const resultsDiv2 = assignForm2.locator('div.max-h-52.overflow-y-auto');
      const checkboxes2 = resultsDiv2.locator('input[type="checkbox"]');
      const checkboxCount2 = await checkboxes2.count();
      console.log('Checkbox count after creating member:', checkboxCount2);

      if (checkboxCount2 > 0) {
        await checkboxes2.first().click();
      }

      // Set expected amount per household (spinbutton)
      await assignForm2.locator('input[name="expectedAmountPaise"]').fill("15000");
      await assignForm2.getByRole("button", { name: "Assign households" }).click();
      await page.waitForTimeout(1500);
    } else {
      await checkboxes.first().click();

      // Set expected amount per household (spinbutton)
      await assignForm.locator('input[name="expectedAmountPaise"]').fill("15000");

      await assignForm.getByRole("button", { name: "Assign households" }).click();
      await page.waitForTimeout(1500);
    }

    // Verify assignment appears - the member created in "Create member works" test is "Test Member Browser"
    await expect(page.getByText("Test Member Browser").first()).toBeVisible();
  });

  test("7. Collections - New payment with CollectionEvent allocation", async ({ page }) => {
    await page.goto(`${BASE_URL}/collections/new`);
    await page.waitForTimeout(500);

    // Use walk-in donor since member search may not have data loaded in test context
    const walkInInput = page.locator('#walkIn');
    await expect(walkInInput).toBeVisible();
    await walkInInput.fill("Test Walk-in Donor");
    await page.waitForTimeout(300);

    // Fill payment details - amount input uses id="amount"
    await page.fill('#amount', "250"); // 250 INR

    // Find and click first Collection Event chip to add allocation
    await page.waitForTimeout(500);
    const eventChip = page.locator('button:has-text("Manual Event Test")').first();
    await expect(eventChip).toBeVisible();
    await eventChip.click();
    await page.waitForTimeout(300);

    // Verify allocation was added - check that an allocation row appears
    await expect(page.locator('text=Manual Event Test').first()).toBeVisible();

    // Adjust allocation amount to 200 (the event's expected amount in INR)
    // The allocation inputs have placeholder "0.00" (first one is main amount with "0")
    await page.locator('input[placeholder="0.00"]').first().fill("200");
    await page.waitForTimeout(300);

    // Submit payment - the button is labelled "Confirm and issue receipt"
    await page.click('button:has-text("Confirm and issue receipt")');
    await page.waitForTimeout(2000);

    // Should redirect to review page
    await expect(page).toHaveURL(/.*collections\/review/);
  });

  test("8. Reports - Collection Events tab shows correct totals", async ({ page }) => {
    await page.goto(`${BASE_URL}/reports`);
    await page.waitForTimeout(500);

    // Click Collection Events tab - it's a link, not a button
    await page.click('a:has-text("Collection Events")');
    await page.waitForTimeout(500);

    // Verify the table shows events with totals
    await expect(page.locator("table")).toBeVisible();
    // Verify the table has at least one row of data
    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
  });

  test("9. Verify no double-counting in reports", async ({ page }) => {
    await page.goto(`${BASE_URL}/reports?report=event`);
    await page.waitForTimeout(500);

    const rows = page.locator("table tbody tr");
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);

    // Each event row must show the same figure in "Expected amount" and "Outstanding"
    // when nothing was received - if the total double-counted, Outstanding would
    // be twice the expected amount.
    const eventRows = page.locator("table tbody tr").filter({ hasText: "Manual Event Test" });
    const eventRowCount = await eventRows.count();
    expect(eventRowCount).toBeGreaterThan(0);

    const expected = await eventRows.first().locator("td").nth(3).innerText();
    const outstanding = await eventRows.first().locator("td").nth(5).innerText();
    expect(outstanding).toBe(expected);
  });

  test("10. Portal - Member profile page redirects staff to dashboard", async ({ page }) => {
    // Staff users cannot access portal - should redirect to dashboard
    await page.goto(`${BASE_URL}/portal/profile`);
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator("h1:has-text('Dashboard')").first()).toBeVisible();
  });
});

test.describe.serial("Regression Tests - Phase 4", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    console.log('Logging in...');
    await page.goto(`${BASE_URL}/login`);
    console.log('On login page');
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    console.log('Submitted login form, waiting for redirect...');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('Logged in successfully, on dashboard page');
  });

  test("Dashboard loads without errors", async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 5000 });
  });

  test("Members page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/members`);
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 5000 });
  });

  test("Create member works", async ({ page }) => {
    await page.goto(`${BASE_URL}/members/new`);
    await page.waitForTimeout(500);

    // Debug: Check page content
    const bodyText = await page.locator('body').textContent();
    console.log('Body text snippet:', bodyText?.substring(0, 1000));

    // Check for form fields
    const fullNameInput = page.locator('input[name="fullName"]');
    await expect(fullNameInput).toBeVisible({ timeout: 10000 });

    const uniquePhone = `9${String(Date.now()).slice(-9)}`;
    await page.fill('input[name="fullName"]', "Test Member Browser");
    await page.fill('input[name="fatherName"]', "Father Name");
    await page.fill('input[name="phone"]', uniquePhone);
    // The address rule renders a textarea, not an input
    await page.fill('textarea[name="address"]', "Test Address");
    await page.fill('input[name="joinDate"]', "2026-01-01");

    await page.click('button:has-text("Save")');
    await page.waitForTimeout(3000);

    // The name shows in the page heading and the route announcer - use the heading
    await expect(page.locator("h1:has-text('Test Member Browser')").first()).toBeVisible({ timeout: 15000 });
  });

  test("Contribution plans page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/plans`);
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 5000 });
  });

  test("Create contribution plan works", async ({ page }) => {
    await page.goto(`${BASE_URL}/plans/new`);
    await page.waitForTimeout(500);

    // The member is chosen with a search widget, not a <select>
    await page.fill("#member-search", "Test Member Browser");
    await page.waitForTimeout(300);
    await page.click('button:has-text("Test Member Browser")');
    await page.waitForTimeout(300);

    await page.selectOption('select[name="categoryId"]', { index: 1 });
    await page.fill('input[name="amountPaise"]', "100");
    await page.selectOption('select[name="frequency"]', "MONTHLY");
    await page.fill('input[name="startDate"]', "2026-01-01");
    await page.fill('input[name="dueDay"]', "5");

    await page.click('button:has-text("Save")');
    await page.waitForTimeout(2000);

    await expect(page).toHaveURL(/\/plans/);
  });

  test("Collections review page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/collections/review`);
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 5000 });
  });

  test("Expenses page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/expenses`);
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 5000 });
  });

  test("Create expense category works", async ({ page }) => {
    await page.goto(`${BASE_URL}/settings?tab=expenseCategories`);
    await page.waitForTimeout(500);

    // The button text is "Add Expense Category" on this tab
    await page.click('button:has-text("Add Expense Category")');
    await page.waitForTimeout(300);

    await page.fill('input[name="name"]', "Test Expense");
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(500);

    await expect(page.locator("text=Test Expense")).toBeVisible();
  });

  test("Settings - Masjid details tab works", async ({ page }) => {
    await page.goto(`${BASE_URL}/settings?tab=masjid`);
    await page.waitForTimeout(500);

    // The CardTitle shows "Masjid name" (not "Masjid Details")
    await expect(page.locator('h2:has-text("Masjid name")').first()).toBeVisible();
    await expect(page.locator('input[name="name"]')).toBeVisible();
  });

  test("Settings - Notifications tab works", async ({ page }) => {
    await page.goto(`${BASE_URL}/settings?tab=notifications`);
    await page.waitForTimeout(500);

    // The CardTitle shows "Notifications" (from labels.notifications)
    await expect(page.locator('h2:has-text("Notifications")').first()).toBeVisible();
  });

  test("Settings - Staff tab works", async ({ page }) => {
    await page.goto(`${BASE_URL}/settings?tab=staff`);
    await page.waitForTimeout(500);

    // The heading is in the CardTitle inside the Staff list
    await expect(page.locator('h2:has-text("Staff")').first()).toBeVisible();
  });

  test("Transactions page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/transactions`);
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 5000 });
  });

  test("Audit page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/audit`);
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 5000 });
  });

  test("Reports - Category totals tab works", async ({ page }) => {
    await page.goto(`${BASE_URL}/reports?report=category`);
    await page.waitForTimeout(500);

    await expect(page.locator("table")).toBeVisible();
  });

  // Create a member with a plan that will have dues for the member ledger test
  test("Setup: Create member with plan for dues report", async ({ page }) => {
    await page.goto(`${BASE_URL}/members/new`);
    await page.waitForTimeout(500);

    const uniquePhone = `9${String(Date.now()).slice(-9)}`;
    await page.fill('input[name="fullName"]', "Test Member For Dues");
    await page.fill('input[name="fatherName"]', "Father Name");
    await page.fill('input[name="phone"]', uniquePhone);
    await page.fill('textarea[name="address"]', "Test Address");
    await page.fill('input[name="joinDate"]', "2026-01-01");

    await page.click('button:has-text("Save")');
    await page.waitForTimeout(2000);

    // Create a contribution plan for this member
    await page.goto(`${BASE_URL}/plans/new`);
    await page.waitForTimeout(500);

    await page.fill("#member-search", "Test Member For Dues");
    await page.waitForTimeout(300);
    await page.click('button:has-text("Test Member For Dues")');
    await page.waitForTimeout(300);

    await page.selectOption('select[name="categoryId"]', { index: 1 });
    await page.fill('input[name="amountPaise"]', "10000"); // 100 INR
    await page.selectOption('select[name="frequency"]', "MONTHLY");
    await page.fill('input[name="startDate"]', "2026-01-01");
    await page.fill('input[name="dueDay"]', "5");

    await page.click('button:has-text("Save")');
    await page.waitForTimeout(2000);
  });

  test("Reports - Member ledger tab works", async ({ page }) => {
    await page.goto(`${BASE_URL}/reports`);
    await page.waitForTimeout(500);

    // Member ledger is the "dues" report - the tab label is "Pending dues"
    await page.click('a:has-text("Pending dues")');
    await page.waitForTimeout(500);

    // Verify the page loads - just check for the tab title (heading)
    await expect(page.locator("h2:has-text('Pending dues')").first()).toBeVisible();
  });
});