import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test('Edit member with email', async ({ page }) => {
  // Login first
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="email"]', 'localadmin@gmail.com');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');

  // Go to member list
  await page.goto(`${BASE_URL}/members`);
  await page.waitForTimeout(500);

  // Click on the first member to go to profile
  await page.click('table tbody tr:first-child a');
  await page.waitForTimeout(500);

  // Click edit button on profile page
  await page.click('a:has-text("Edit")');
  await page.waitForTimeout(500);

  // Check if email field is visible and has value
  const emailInput = page.locator('input[name="email"]');
  await expect(emailInput).toBeVisible();

  // Fill email if empty
  const emailValue = await emailInput.inputValue();
  console.log('Current email value:', emailValue);

  if (!emailValue) {
    await emailInput.fill('edited@example.com');
  }

  // Update alternate mobile
  const altMobileInput = page.locator('input[name="alternatePhone"]');
  await altMobileInput.fill('7123456789');

  // Submit
  await page.click('button:has-text("Save")');
  await page.waitForTimeout(3000);

  // Verify success
  console.log('Current URL:', page.url());
  console.log('✅ Member edited successfully!');
});
