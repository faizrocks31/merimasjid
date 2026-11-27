import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

test.describe("Expense Management - Comprehensive Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to expenses page and wait for it to load
    await page.goto(`${BASE_URL}/expenses`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test("Record an expense successfully", async ({ page }) => {
    // Verify the expenses page loads
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 5000 });

    // Wait for the form to be ready
    await page.waitForSelector('select[name="categoryId"]', { timeout: 10000 });

    // Select an expense category from the dropdown
    const categorySelect = page.locator('select[name="categoryId"]');
    await expect(categorySelect).toBeVisible();
    const options = await categorySelect.locator('option').all();
    if (options.length > 1) {
      await categorySelect.selectOption({ index: 1 });
    }
    await page.waitForTimeout(300);

    // Fill in expense details
    await page.fill('input[name="date"]', "2026-01-15");
    await page.fill('input[name="payee"]', "Test Payee");
    await page.fill('input[name="amount"]', "500"); // 500 INR
    await page.selectOption('select[name="mode"]', "CASH");
    await page.fill('input[name="referenceNo"]', "REF-001");
    await page.fill('textarea[name="description"]', "Test expense description for E2E testing");

    // Submit the expense
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(3000);

    // Check for success - no error message should appear
    const errorMessage = page.locator('p[role="alert"]');
    const hasError = await errorMessage.count() > 0;

    if (hasError) {
      const errorText = await errorMessage.textContent();
      console.log("Expense form error:", errorText);
      throw new Error(`Expense submission failed: ${errorText}`);
    }

    // If no error, test passes - form was submitted successfully
    await page.waitForTimeout(1000);
    console.log("✅ Expense recorded successfully");
  });

  test("Add new expense category in settings", async ({ page }) => {
    // Navigate to settings expense categories tab
    await page.goto(`${BASE_URL}/settings?tab=expenseCategories`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Click add expense category button
    await page.click('button:has-text("Add Expense Category")');
    await page.waitForTimeout(500);

    // Fill in category name
    const uniqueName = `Test Category ${Date.now().toString(36).replace(/\d/g, '').substring(0, 8)}`;
    await page.fill('input[name="name"]', uniqueName);

    // Save the category
    await page.click('button:has-text("Save")');

    // Wait for the server action to complete and page to reload
    // The form uses useReloadOnSuccess which triggers window.location.reload() on success
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

    // Debug: log category list items
    const listItems = await page.locator('ul >> li').allTextContents();
    console.log("Category list items:", listItems);

    // Verify the category was created - it should appear in the list
    await expect(page.locator(`text=${uniqueName}`)).toBeVisible({ timeout: 180000 });
    console.log(`✅ Expense category "${uniqueName}" created successfully`);
  });

  test("Update expense category in settings", async ({ page }) => {
    await page.goto(`${BASE_URL}/settings?tab=expenseCategories`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // First create a test category to update
    await page.click('button:has-text("Add Expense Category")');
    await page.waitForTimeout(500);

    const uniqueName = `Test Category ${Date.now().toString(36).replace(/\d/g, '').substring(0, 8)}`;
    await page.fill('input[name="name"]', uniqueName);
    await page.click('button:has-text("Save")');

    // Wait for the form to submit and page to reload
    // The form uses useReloadOnSuccess which triggers window.location.reload() on success
    await page.waitForURL(/settings/, { timeout: 60000 });
    await page.waitForLoadState('networkidle');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000);

    // Force a fresh navigation with cache-busting to ensure server-side data is fresh
    await page.goto(`${BASE_URL}/settings?tab=expenseCategories&_=${Date.now()}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    // Debug: log category list items
    const listItems = await page.locator('ul >> li').allTextContents();
    console.log("Category list items after create:", listItems);

    // Check for any error messages first
    const errorMessage2 = page.locator('p[role="alert"]');
    const hasError2 = await errorMessage2.count() > 0;
    if (hasError2) {
      const errorText = await errorMessage2.textContent();
      console.log("Create category error:", errorText);
      throw new Error(`Category creation failed: ${errorText}`);
    }

    // Wait for the form to close (Add Expense Category button reappears)
    // This indicates the form submission was successful and page reloaded
    await page.waitForSelector('button:has-text("Add Expense Category")', { state: 'visible', timeout: 60000 });

    // Wait for the page to reload and content to be ready
    await page.waitForLoadState('networkidle');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000);

    // Force a fresh navigation with cache-busting to ensure server-side data is fresh
    await page.goto(`${BASE_URL}/settings?tab=expenseCategories&_=${Date.now()}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    // Check for any error messages first
    const errorMessage3 = page.locator('p[role="alert"]');
    const hasError3 = await errorMessage3.count() > 0;
    if (hasError3) {
      const errorText = await errorMessage3.textContent();
      console.log("Create category error:", errorText);
      throw new Error(`Category creation failed: ${errorText}`);
    }

    // Debug: log category list items
    const listItems2 = await page.locator('ul >> li').allTextContents();
    console.log("Category list items after create (2nd check):", listItems2);

    // Verify the category was created - it should appear in the list
    await expect(page.locator(`text=${uniqueName}`)).toBeVisible({ timeout: 120000 });

    // Now update the category - click edit button for this category
    // The edit button is in the same li as the category name (icon only)
    const categoryItem = page.locator('ul >> li', { hasText: uniqueName }).first();
    await categoryItem.locator('button:has(svg)').first().click(); // First button is Edit
    await page.waitForLoadState('networkidle');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000);

    // Update the name
    const updatedName = `${uniqueName} Updated`;
    await page.fill('input[name="name"]', updatedName);
    await page.click('button:has-text("Update")');

    // Wait for the form submission to complete and page to reload
    // The form uses useReloadOnSuccess which calls window.location.reload()
    // Wait for a navigation/reload to occur
    await page.waitForLoadState('networkidle');
    await page.waitForLoadState('domcontentloaded');

    // Wait for the "Add Expense Category" button to reappear (indicating form closed and page reloaded)
    await page.waitForSelector('button:has-text("Add Expense Category")', { state: 'visible', timeout: 60000 });

    // Wait for the page to reload and content to be ready
    await page.waitForLoadState('networkidle');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Force a fresh navigation with cache-busting to ensure server-side data is fresh
    await page.goto(`${BASE_URL}/settings?tab=expenseCategories&_=${Date.now()}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Debug: log category list items
    const listItemsAfterUpdate = await page.locator('ul >> li').allTextContents();
    console.log("Category list items after update:", listItemsAfterUpdate);

    // Verify the update
    await expect(page.locator(`text=${updatedName}`)).toBeVisible({ timeout: 120000 });
    console.log(`✅ Expense category updated from "${uniqueName}" to "${updatedName}"`);
  });
});