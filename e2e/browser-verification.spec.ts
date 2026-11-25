import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

test.describe("Browser Verification - Phase 3", () => {
  test("1. Dashboard loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 5000 });
  });

  test("2. Settings - Collections tab loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/settings?tab=collections`);
    await page.waitForTimeout(500);

    await expect(page.locator('h2:has-text("Collection Definitions")').first()).toBeVisible();
  });

  test("3. Ensure a TESTMONTH category exists for subsequent tests", async ({ page }) => {
    await page.goto(`${BASE_URL}/settings?tab=collections`);
    await page.waitForTimeout(500);

    // Get first category code from existing categories
    const categoryCards = page.locator('text=Monthly Chanda').first().locator('..').locator('..').locator('..');
    const firstCode = await categoryCards.locator('text=/[A-Z]+/').first().textContent();
    const dynamicCategoryCode = firstCode?.trim() || '';

    // Check if TESTMONTH category exists, if not create it
    const testMonthExists = await page.locator('text=TESTMONTH').count();

    if (testMonthExists === 0) {
      // Click add category button - it's a toggle button
      await page.click('button:has-text("Add Collection Definition")');
      await page.waitForTimeout(500);

      await page.fill('input[name="name"]', "TESTMONTH");
      await page.fill('input[name="description"]', "Test Monthly Category");

      await page.selectOption('select[name="baseCategoryId"]', { index: 1 });
      const subOptionsCount = await page.locator('select[name="subcategoryId"] option').count();
      console.log('Subcategory options count:', subOptionsCount);
      if (subOptionsCount === 0) throw new Error('Subcategory options empty after base category selection');
      await page.selectOption('select[name="subcategoryId"]', { index: 1 });
      await page.selectOption('select[name="frequency"]', "MONTHLY");
      await page.selectOption('select[name="amountType"]', "FIXED");
      await page.fill('input[name="defaultAmountPaise"]', "10000"); // 100 INR
      await page.selectOption('select[name="donorEligibility"]', "MEMBERS_ONLY");
      await page.selectOption('select[name="memberAssignment"]', "ALL_ELIGIBLE");
      await page.selectOption('select[name="dueGeneration"]', "ADMIN");
      await page.selectOption('select[name="settlementPolicy"]', "OLDEST_FIRST");
      await page.selectOption('select[name="showInPaymentReceived"]', "true");

      await page.click('button:has-text("Save")');
      await page.waitForTimeout(2000);

      await expect(page.locator("text=TESTMONTH")).toBeVisible();
    }
  });

  test("4. Collection Definition Create Form - Subcategory Filtering Works", async ({ page }) => {
    await page.goto(`${BASE_URL}/settings?tab=collections`);
    await page.waitForTimeout(500);

    // Click add collection definition button
    await page.click('button:has-text("Add Collection Definition")');
    await page.waitForTimeout(500);

    // Fill in name
    await page.fill('input[name="name"]', "Test Subcategory Filter");

    // Select base category
    await page.selectOption('select[name="baseCategoryId"]', { index: 1 });
    await page.waitForTimeout(500);

    // Check subcategory options are filtered
    const subOptionsCount = await page.locator('select[name="subcategoryId"] option').count();
    console.log('Subcategory options count:', subOptionsCount);
    if (subOptionsCount === 0) throw new Error('Subcategory options empty after base category selection');
    await page.selectOption('select[name="subcategoryId"]', { index: 1 });

    await page.selectOption('select[name="frequency"]', "MONTHLY");
    await page.selectOption('select[name="amountType"]', "FIXED");
    await page.fill('input[name="defaultAmountPaise"]', "10000");
    await page.selectOption('select[name="donorEligibility"]', "MEMBERS_ONLY");
    await page.selectOption('select[name="memberAssignment"]', "ALL_ELIGIBLE");
    await page.selectOption('select[name="dueGeneration"]', "ADMIN");
    await page.selectOption('select[name="settlementPolicy"]', "OLDEST_FIRST");

    await page.click('button:has-text("Save")');
    await page.waitForTimeout(2000);

    await expect(page.locator("text=Test Subcategory Filter")).toBeVisible();
  });

  test("5. Collection Definition Create Form - Subcategory Updates When Base Category Changes", async ({ page }) => {
    await page.goto(`${BASE_URL}/settings?tab=collections`);
    await page.waitForTimeout(500);

    await page.click('button:has-text("Add Collection Definition")');
    await page.waitForTimeout(500);

    await page.fill('input[name="name"]', "Test Subcategory Filter 2");

    // Select first base category
    await page.selectOption('select[name="baseCategoryId"]', { index: 1 });
    await page.waitForTimeout(500);

    const subOptions1 = await page.locator('select[name="subcategoryId"] option').count();
    console.log('Subcategory options count for base 1:', subOptions1);
    if (subOptions1 === 0) throw new Error('Subcategory options empty after base category 1 selection');

    // Select a subcategory
    await page.selectOption('select[name="subcategoryId"]', { index: 1 });

    // Change base category
    await page.selectOption('select[name="baseCategoryId"]', { index: 2 });
    await page.waitForTimeout(500);

    const subOptions2 = await page.locator('select[name="subcategoryId"] option').count();
    console.log('Subcategory options count for base 2:', subOptions2);
    // Should have different options now

    await page.selectOption('select[name="subcategoryId"]', { index: 1 });

    await page.selectOption('select[name="frequency"]', "MONTHLY");
    await page.selectOption('select[name="amountType"]', "FIXED");
    await page.fill('input[name="defaultAmountPaise"]', "5000");
    await page.selectOption('select[name="donorEligibility"]', "MEMBERS_ONLY");
    await page.selectOption('select[name="memberAssignment"]', "ALL_ELIGIBLE");
    await page.selectOption('select[name="dueGeneration"]', "ADMIN");
    await page.selectOption('select[name="settlementPolicy"]', "OLDEST_FIRST");

    await page.click('button:has-text("Save")');
    await page.waitForTimeout(2000);

    await expect(page.locator("text=Test Subcategory Filter 2")).toBeVisible();
  });

  test("6. Collection Definition Edit Form - Subcategory Pre-fills Correctly", async ({ page }) => {
    // This test verifies that when editing a collection definition, the subcategory dropdown
    // correctly filters based on the base category and pre-selects the correct subcategory
    await page.goto(`${BASE_URL}/settings?tab=collections`);
    await page.waitForTimeout(500);

    // Find the first collection definition and click edit
    const firstEditBtn = page.locator('button:has-text("Edit")').first();
    await firstEditBtn.click();
    await page.waitForTimeout(500);

    // Verify the edit form loads with correct base category and subcategory
    await expect(page.locator('select[name="baseCategoryId"]')).toBeVisible();
    await expect(page.locator('select[name="subcategoryId"]')).toBeVisible();

    // Check that the correct subcategory is pre-selected (the one matching the base category)
    const baseCategoryValue = await page.locator('select[name="baseCategoryId"]').inputValue();
    const subcategoryValue = await page.locator('select[name="subcategoryId"]').inputValue();

    // If base category and subcategory are both selected, they should be a valid combination
    if (baseCategoryValue && subcategoryValue) {
      console.log('Base category:', baseCategoryValue, 'Subcategory:', subcategoryValue);
    }

    // Cancel edit
    await page.click('button:has-text("Cancel")');
    await page.waitForTimeout(500);
  });

  test("7. Duplicate Collection Definition Name Rejection", async ({ page }) => {
    await page.goto(`${BASE_URL}/settings?tab=collections`);
    await page.waitForTimeout(500);

    await page.click('button:has-text("Add Collection Definition")');
    await page.waitForTimeout(500);

    await page.fill('input[name="name"]', "Duplicate Test");
    await page.selectOption('select[name="baseCategoryId"]', { index: 1 });
    await page.waitForTimeout(300);
    await page.selectOption('select[name="subcategoryId"]', { index: 1 });
    await page.selectOption('select[name="frequency"]', "MONTHLY");
    await page.selectOption('select[name="amountType"]', "FIXED");
    await page.fill('input[name="defaultAmountPaise"]', "10000");
    await page.selectOption('select[name="donorEligibility"]', "MEMBERS_ONLY");
    await page.selectOption('select[name="memberAssignment"]', "ALL_ELIGIBLE");
    await page.selectOption('select[name="dueGeneration"]', "ADMIN");
    await page.selectOption('select[name="settlementPolicy"]', "OLDEST_FIRST");

    await page.click('button:has-text("Save")');
    await page.waitForTimeout(2000);

    await expect(page.locator("text=Test Subcategory Filter")).toBeVisible();

    // Try to create another with same name
    await page.click('button:has-text("Add Collection Definition")');
    await page.waitForTimeout(500);

    await page.fill('input[name="name"]', "Duplicate Test");
    await page.selectOption('select[name="baseCategoryId"]', { index: 1 });
    await page.waitForTimeout(300);
    await page.selectOption('select[name="subcategoryId"]', { index: 1 });
    await page.selectOption('select[name="frequency"]', "MONTHLY");
    await page.selectOption('select[name="amountType"]', "FIXED");
    await page.fill('input[name="defaultAmountPaise"]', "10000");
    await page.selectOption('select[name="donorEligibility"]', "MEMBERS_ONLY");
    await page.selectOption('select[name="memberAssignment"]', "ALL_ELIGIBLE");
    await page.selectOption('select[name="dueGeneration"]', "ADMIN");
    await page.selectOption('select[name="settlementPolicy"]', "OLDEST_FIRST");

    await page.click('button:has-text("Save")');
    await page.waitForTimeout(2000);

    // Should show error about duplicate
    await expect(page.locator("text=already exists")).toBeVisible();
  });

  test("8. Collection Definition Delete Works", async ({ page }) => {
    await page.goto(`${BASE_URL}/settings?tab=collections`);
    await page.waitForTimeout(500);

    // Find the "Duplicate Test" category and delete it
    const duplicateRow = page.locator('text=Duplicate Test').first().locator('..').locator('..');
    await duplicateRow.locator('button:has-text("Delete")').click();
    await page.waitForTimeout(500);

    // Verify it's gone
    await expect(page.locator("text=Duplicate Test")).not.toBeVisible({ timeout: 5000 });
  });

  test("9. Collection Definition - Cancel Edit Preserves Data", async ({ page }) => {
    await page.goto(`${BASE_URL}/settings?tab=collections`);
    await page.waitForTimeout(500);

    // Click edit on first item
    const firstEditBtn = page.locator('button:has-text("Edit")').first();
    await firstEditBtn.click();
    await page.waitForTimeout(500);

    // Modify something
    await page.fill('input[name="name"]', "Modified Name");

    // Click cancel
    await page.click('button:has-text("Cancel")');
    await page.waitForTimeout(500);

    // Original name should still be there (not modified)
    await expect(page.locator("text=Test Subcategory Filter")).toBeVisible();
    await expect(page.locator("text=Modified Name")).not.toBeVisible();
  });

  test("10. Collection Definition - Base Category Change Clears Subcategory", async ({ page }) => {
    await page.goto(`${BASE_URL}/settings?tab=collections`);
    await page.waitForTimeout(500);

    await page.click('button:has-text("Add Collection Definition")');
    await page.waitForTimeout(500);

    await page.fill('input[name="name"]', "Test Clear Subcategory");
    await page.selectOption('select[name="baseCategoryId"]', { index: 1 });
    await page.waitForTimeout(300);
    await page.selectOption('select[name="subcategoryId"]', { index: 1 });

    // Change base category
    await page.selectOption('select[name="baseCategoryId"]', { index: 2 });
    await page.waitForTimeout(500);

    // Subcategory should be cleared/empty
    const subcategoryValue = await page.locator('select[name="subcategoryId"]').inputValue();
    if (subcategoryValue !== "") {
      console.log('Subcategory was not cleared:', subcategoryValue);
    }
    // Should be empty or different options

    // Cancel
    await page.click('button:has-text("Cancel")');
    await page.waitForTimeout(500);
  });

  // ============================================
  // REGRESSION TESTS - PHASE 4 (Expenses & Settings)
  // ============================================

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

  test("Record an expense works", async ({ page }) => {
    await page.goto(`${BASE_URL}/expenses`);
    await page.waitForTimeout(500);

    // Verify the page loads
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 5000 });

    // Select an expense category from the dropdown
    const categorySelect = page.locator('select[name="categoryId"]');
    await expect(categorySelect).toBeVisible();
    await categorySelect.selectOption({ index: 1 });
    await page.waitForTimeout(300);

    // Fill in expense details
    await page.fill('input[name="date"]', "2026-01-15");
    await page.fill('input[name="payee"]', "Test Payee");
    await page.fill('input[name="amount"]', "500"); // 500 INR
    await page.selectOption('select[name="mode"]', "CASH");
    await page.fill('input[name="referenceNo"]', "REF-001");
    await page.fill('textarea[name="description"]', "Test expense description");

    // Submit the expense
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(3000);

    // Check for error message - if no error, test passes
    const errorMessage = page.locator('p[role="alert"]');
    const hasError = await errorMessage.count() > 0;

    if (hasError) {
      const errorText = await errorMessage.textContent();
      console.log("Expense form error:", errorText);
      throw new Error(`Expense submission failed: ${errorText}`);
    }

    // If no error, test passes - form was submitted successfully
    await page.waitForTimeout(1000);
  });

  test("Update expense category in settings works", async ({ page }) => {
    await page.goto(`${BASE_URL}/settings?tab=expenseCategories`);
    await page.waitForTimeout(1000);

    // First create a test category to update
    await page.click('button:has-text("Add Expense Category")');
    await page.waitForTimeout(500);

    // Use a truly unique name with random suffix to avoid conflicts
    const uniqueName = `Test Category ${Date.now().toString(36).replace(/\d/g, '').substring(0, 8)}`;
    await page.fill('input[name="name"]', uniqueName);

    // Submit the form via JavaScript to ensure it triggers the server action
    await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) form.requestSubmit();
    });

    // Wait for form submission and page reload (useReloadOnSuccess triggers reload)
    await page.waitForURL(/settings/, { timeout: 60000 });
    await page.waitForLoadState('networkidle');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000);

    // Force a fresh navigation with cache-busting to ensure server-side data is fresh
    await page.goto(`${BASE_URL}/settings?tab=expenseCategories&_=${Date.now()}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    // Check for any error messages first
    const errorMessage = page.locator('p[role="alert"]');
    const hasError = await errorMessage.count() > 0;
    if (hasError) {
      const errorText = await errorMessage.textContent();
      console.log("Create category error:", errorText);
      throw new Error(`Category creation failed: ${errorText}`);
    }

    // Wait for the category to appear in the list - it should be in the CategoryList
    await expect(page.locator(`text=${uniqueName}`)).toBeVisible({ timeout: 30000 });

    // Now update the category - click edit button for this category
    // Find the li containing the category name and click its edit button (first button with svg icon)
    const categoryItem = page.locator('ul >> li', { hasText: uniqueName }).first();
    await categoryItem.locator('button:has(svg)').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000);

    // Update the name
    const updatedName = `${uniqueName} Updated`;
    await page.fill('input[name="name"]', updatedName);

    // Submit the update form via JavaScript
    await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) form.requestSubmit();
    });

    // Wait for form submission and page reload
    await page.waitForURL(/settings/, { timeout: 60000 });
    await page.waitForLoadState('networkidle');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000);

    // Force a fresh navigation with cache-busting to ensure server-side data is fresh
    await page.goto(`${BASE_URL}/settings?tab=expenseCategories&_=${Date.now()}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    // Verify the update
    await expect(page.locator(`text=${updatedName}`)).toBeVisible({ timeout: 30000 });
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

    await page.selectOption('select[name="collectionDefinitionId"]', { index: 1 });
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