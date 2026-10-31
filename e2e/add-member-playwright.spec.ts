import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test('Add new member via UI', async ({ page }) => {
  // Go directly to new member page - auth state should already be loaded from global setup
  await page.goto(`${BASE_URL}/members/new`);
  await page.waitForTimeout(500);

  // Fill member form
  const uniquePhone = `9${String(Date.now()).slice(-9)}`;
  await page.fill('input[name="fullName"]', 'Playwright Test Member');
  await page.fill('input[name="fatherName"]', 'Test Father');
  await page.fill('input[name="phone"]', uniquePhone);
  await page.fill('input[name="alternatePhone"]', `8${String(Date.now()).slice(-9)}`);
  await page.fill('input[name="email"]', `test${Date.now()}@example.com`);
  await page.fill('textarea[name="address"]', 'Test Address from Playwright');
  await page.fill('input[name="joinDate"]', '2026-01-01');

  // Submit
  await page.click('button:has-text("Save")');
  await page.waitForTimeout(5000);

  // Check if there's an error message
  const errorMsg = await page.locator('p[role="alert"]').textContent().catch(() => null);
  if (errorMsg) {
    console.log('Error:', errorMsg);
  }

  // Check current URL
  console.log('Current URL:', page.url());

  // Verify success - should redirect to member profile
  await expect(page.locator("h1:has-text('Playwright Test Member')").first()).toBeVisible({ timeout: 20000 });

  console.log('✅ Member created successfully!');
  console.log('Phone:', uniquePhone);
  console.log('URL:', page.url());
});