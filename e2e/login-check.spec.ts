import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test('login flow works', async ({ page }) => {
  // Enable console logging
  page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('request', req => console.log('REQUEST:', req.method(), req.url()));
  page.on('response', res => console.log('RESPONSE:', res.status(), res.url()));

  // Go to login page
  await page.goto(`${BASE_URL}/login`);

  // Wait for login form to be visible
  await expect(page.locator('form')).toBeVisible();

  // Fill in credentials
  await page.fill('input[name="email"]', 'superadmin@gmail.com');
  await page.fill('input[name="password"]', 'admin123');

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for redirect to platform (for super admin)
  await page.waitForURL('**/platform', { timeout: 10000 });

  // Verify we're on platform page
  await expect(page).toHaveURL(/.*platform/);

  console.log('Login successful! Redirected to:', page.url());
});

test('login as local admin redirects to dashboard', async ({ page }) => {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="email"]', 'localadmin@gmail.com');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  await expect(page).toHaveURL(/.*dashboard/);
  console.log('Local admin login successful! Redirected to:', page.url());
});

test('login with wrong password shows error', async ({ page }) => {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="email"]', 'superadmin@gmail.com');
  await page.fill('input[name="password"]', 'wrongpassword');
  await page.click('button[type="submit"]');

  // Should stay on login page with error
  await expect(page.locator('text=Invalid email or password')).toBeVisible({ timeout: 5000 });
  console.log('Wrong password correctly shows error');
});