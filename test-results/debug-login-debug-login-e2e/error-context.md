# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: debug-login.spec.ts >> debug login
- Location: e2e\debug-login.spec.ts:3:5

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3001/login
Call log:
  - navigating to "http://localhost:3001/login", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('debug login', async ({ page }) => {
  4  |   // Enable console logging
  5  |   page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
  6  |   page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  7  |   page.on('request', req => console.log('REQUEST:', req.method(), req.url()));
  8  |   page.on('response', res => console.log('RESPONSE:', res.status(), res.url()));
  9  | 
  10 |   // Go to login page
> 11 |   await page.goto('http://localhost:3001/login');
     |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3001/login
  12 | 
  13 |   // Wait for login form to be visible
  14 |   await expect(page.locator('form')).toBeVisible();
  15 | 
  16 |   // Check form attributes
  17 |   const form = page.locator('form').first();
  18 |   console.log('Form action:', await form.getAttribute('action'));
  19 |   console.log('Form method:', await form.getAttribute('method'));
  20 | 
  21 |   // Get the full form HTML
  22 |   const formHTML = await form.evaluate(el => el.outerHTML);
  23 |   console.log('Form HTML:', formHTML);
  24 | 
  25 |   // Check inputs
  26 |   const emailInput = page.locator('input[name="email"]');
  27 |   const passwordInput = page.locator('input[name="password"]');
  28 |   console.log('Email input type:', await emailInput.getAttribute('type'));
  29 |   console.log('Password input type:', await passwordInput.getAttribute('type'));
  30 | 
  31 |   // Fill in credentials
  32 |   await emailInput.fill('superadmin@gmail.com');
  33 |   await passwordInput.fill('admin123');
  34 | 
  35 |   // Submit form
  36 |   await page.click('button[type="submit"]');
  37 | 
  38 |   // Wait a bit to see what happens
  39 |   await page.waitForTimeout(5000);
  40 | 
  41 |   // Check current URL
  42 |   console.log('Current URL:', page.url());
  43 | 
  44 |   // Check if there's an error message
  45 |   const errorMsg = await page.locator('[role="alert"]').textContent().catch(() => null);
  46 |   console.log('Error message:', errorMsg);
  47 | 
  48 |   // Check page content
  49 |   const bodyText = await page.locator('body').textContent();
  50 |   console.log('Body text snippet:', bodyText?.substring(0, 500));
  51 | });
```