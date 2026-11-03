import { test, expect } from '@playwright/test';

test('debug login', async ({ page }) => {
  // Enable console logging
  page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('request', req => console.log('REQUEST:', req.method(), req.url()));
  page.on('response', res => console.log('RESPONSE:', res.status(), res.url()));

  // Clear any existing session first
  await page.context().clearCookies();

  // Go to login page
  await page.goto('http://localhost:3000/login');

  // Wait for login form to be visible
  await expect(page.locator('form')).toBeVisible();

  // Check form attributes
  const form = page.locator('form').first();
  console.log('Form action:', await form.getAttribute('action'));
  console.log('Form method:', await form.getAttribute('method'));

  // Get the full form HTML
  const formHTML = await form.evaluate(el => el.outerHTML);
  console.log('Form HTML:', formHTML);

  // Check inputs
  const emailInput = page.locator('input[name="email"]');
  const passwordInput = page.locator('input[name="password"]');
  console.log('Email input type:', await emailInput.getAttribute('type'));
  console.log('Password input type:', await passwordInput.getAttribute('type'));

  // Fill in credentials
  await emailInput.fill('superadmin@gmail.com');
  await passwordInput.fill('admin123');

  // Submit form
  await page.click('button[type="submit"]');

  // Wait a bit to see what happens
  await page.waitForTimeout(5000);

  // Check current URL
  console.log('Current URL:', page.url());

  // Check if there's an error message
  const errorMsg = await page.locator('[role="alert"]').textContent().catch(() => null);
  console.log('Error message:', errorMsg);

  // Check page content
  const bodyText = await page.locator('body').textContent();
  console.log('Body text snippet:', bodyText?.substring(0, 500));
});