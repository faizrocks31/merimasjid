import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test('Members page loads and shows pagination controls', async ({ page }) => {
  // Login first (uses stored auth state from global config)
  await page.goto(`${BASE_URL}/members`);
  await page.waitForLoadState('networkidle');

  // Verify that the search box is visible (placeholder contains "Search member")
  const searchInput = page.locator('input[placeholder*="Search member"]');
  await expect(searchInput).toBeVisible({ timeout: 10000 });

  // Verify pagination selector exists
  const selector = page.locator('select[name="size"]');
  await expect(selector).toBeVisible({ timeout: 10000 });

  // Verify default page size is 10
  await expect(selector).toHaveValue('10');

  // Change page size to 25 and verify URL updates
  await selector.selectOption('25');
  await expect(page).toHaveURL(/size=25/);

  // Ensure at least one member row is displayed
  const rows = page.locator('table tbody tr');
  await expect(rows.first()).toBeVisible();
});