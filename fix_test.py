with open('e2e/browser-verification.spec.ts', 'r') as f:
    content = f.read()

old_test = '''  test("Update expense category in settings works", async ({ page }) => {
    await page.goto(`${BASE_URL}/settings?tab=expenseCategories`);
    await page.waitForTimeout(1000);

    // First create a test category to update
    await page.click('button:has-text("Add Expense Category")');
    await page.waitForTimeout(500);

    const uniqueName = `Test Category ${Date.now()}`;
    await page.fill('input[name="name"]', uniqueName);
    await page.click('button:has-text("Save")');

    // Wait for the form to submit and the category to appear in the list
    await page.waitForLoadState('networkidle');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Wait for the category to appear in the list - it should be in the CategoryList
    await expect(page.locator(`text=${uniqueName}`)).toBeVisible({ timeout: 15000 });

    // Now update the category - click edit button for this category
    // Find the row containing the category name and click its edit button
    const categoryRow = page.locator(`text=${uniqueName}`).first().locator('..').locator('..');
    await categoryRow.locator('button:has-text("Edit")').click();
    await page.waitForTimeout(1000);

    // Update the name
    const updatedName = `${uniqueName} Updated`;
    await page.fill('input[name="name"]', updatedName);
    await page.click('button:has-text("Update")');
    await page.waitForLoadState('networkidle');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Verify the update
    await expect(page.locator(`text=${updatedName}`)).toBeVisible({ timeout: 10000 });
  });'''

new_test = '''  test("Update expense category in settings works", async ({ page }) => {
    await page.goto(`${BASE_URL}/settings?tab=expenseCategories`);
    await page.waitForTimeout(1000);

    // Wait for the category list to load - look for the first edit button
    await page.waitForSelector('button:has-text("Edit")', { timeout: 15000 });

    // Click the first edit button to update an existing category
    await page.click('button:has-text("Edit")');
    await page.waitForTimeout(1000);

    // Update the name
    const updatedName = `Test Expense Updated ${Date.now()}`;
    await page.fill('input[name="name"]', updatedName);
    await page.click('button:has-text("Update")');

    // Wait for page reload after update
    await page.waitForLoadState('networkidle');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Verify the update
    await expect(page.locator(`text=${updatedName}`)).toBeVisible({ timeout: 10000 });
  });'''

content = content.replace(old_test, new_test)

with open('e2e/browser-verification.spec.ts', 'w') as f:
    f.write(content)

print("Done!")