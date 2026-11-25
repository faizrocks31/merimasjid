with open('e2e/browser-verification.spec.ts', 'r') as f:
    content = f.read()

# Find the test start and end
start_marker = '  test("Update expense category in settings works"'
end_marker = '  test("Settings - Masjid details tab works"'

start_idx = content.index(start_marker)
end_idx = content.index(end_marker)

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

# Find start and end
start_idx = content.index('  test("Update expense category in settings works"')
end_idx = content.index('  test("Settings - Masjid details tab works"')

# Replace
new_content = content[:start_idx] + new_test + '\n\n' + content[end_idx:]

with open('e2e/browser-verification.spec.ts', 'w') as f:
    f.write(new_content)

print("Done!")