# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: generate-receipt.spec.ts >> Generate receipt via payment creation
- Location: e2e\generate-receipt.spec.ts:5:5

# Error details

```
Error: page.fill: Target page, context or browser has been closed
Call log:
  - waiting for locator('input[name="password"]')
    - waiting for "http://localhost:3000/" navigation to finish...
    2 × navigated to "http://localhost:3000/dashboard"
      - waiting for "http://localhost:3000/dashboard" navigation to finish...
    - navigated to "http://localhost:3000/dashboard"
    - waiting for "http://localhost:3000/" navigation to finish...
    - navigated to "http://localhost:3000/dashboard"
    - waiting for "http://localhost:3000/dashboard" navigation to finish...
    - navigated to "http://localhost:3000/dashboard"

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | const BASE_URL = 'http://localhost:3000';
  4   | 
  5   | test('Generate receipt via payment creation', async ({ page }) => {
  6   |   // Use mobile viewport since purpose selector is mobile-only
  7   |   await page.setViewportSize({ width: 375, height: 667 });
  8   | 
  9   |   // Go directly to new collection page (already authenticated via auth-state.json)
  10  |   await page.goto(`${BASE_URL}/collections/new`);
  11  |   await page.waitForLoadState('networkidle');
> 12  |   console.log('✅ On collections/new page (authenticated)');
      |              ^ Error: page.fill: Target page, context or browser has been closed
  13  |   await page.waitForTimeout(1000);
  14  |   console.log('✅ On collections/new page');
  15  | 
  16  |   // Ensure "Choose member" is selected (it should be by default, but click to ensure member search renders)
  17  |   await page.click('text=Choose member');
  18  |   await page.waitForTimeout(500);
  19  | 
  20  |   // Check if a member is already selected (input disabled with value)
  21  |   const memberSearchInput = page.locator('#member-search');
  22  |   const isDisabled = await memberSearchInput.evaluate(el => (el as HTMLInputElement).disabled);
  23  | 
  24  |   if (!isDisabled) {
  25  |     // Fill in member search - use existing member from seed data
  26  |     await page.fill('#member-search', 'Arif Hussain');
  27  |     await page.waitForTimeout(500);
  28  | 
  29  |     // Click the first matching member
  30  |     await page.click('button:has-text("Arif Hussain")');
  31  |     await page.waitForTimeout(500);
  32  |   } else {
  33  |     console.log('✅ Member already selected, proceeding...');
  34  |   }
  35  |   console.log('✅ Member selected');
  36  | 
  37  |   // Set amount
  38  |   await page.fill('input[placeholder="0"]', '500');
  39  |   await page.waitForTimeout(300);
  40  |   console.log('✅ Amount set to 500');
  41  | 
  42  |   // Select payment mode - Cash
  43  |   await page.click('button:has-text("Cash")');
  44  |   await page.waitForTimeout(300);
  45  |   console.log('✅ Payment mode: Cash');
  46  | 
  47  |   // Select purpose/category directly (buttons are rendered directly on mobile view)
  48  |   // Use "General Donation" which has ANY_PENDING_PERIOD settlement policy (no FIFO allocation required)
  49  |   await page.click('button:has-text("General Donation")');
  50  |   await page.waitForTimeout(500);
  51  |   console.log('✅ Purpose selected');
  52  | 
  53  |   // General Donation has ANY_PENDING_PERIOD settlement - no allocation input needed
  54  |   await page.waitForTimeout(500);
  55  |   console.log('✅ General Donation category selected (no FIFO allocation required)');
  56  | 
  57  |   // Set date to today
  58  |   const today = new Date().toISOString().split('T')[0];
  59  |   await page.fill('input[type="date"]', today);
  60  |   await page.waitForTimeout(300);
  61  | 
  62  |   // Wait a bit for form validation to update
  63  |   await page.waitForTimeout(1000);
  64  | 
  65  |   // Check if there are any errors
  66  |   const errorMsg = await page.locator('p[role="alert"]').textContent().catch(() => null);
  67  |   if (errorMsg) {
  68  |     console.log('Error message:', errorMsg);
  69  |   }
  70  | 
  71  |   // Click submit - use mobile bottom bar submit button (the one in the sticky footer)
  72  |   const mobileSubmitBtn = page.locator('button:has-text("Confirm and issue receipt")').last();
  73  |   await mobileSubmitBtn.waitFor({ state: 'visible', timeout: 10000 });
  74  | 
  75  |   // Check for validation errors before clicking
  76  |   const validationError = await page.locator('p[role="alert"]').textContent().catch(() => null);
  77  |   if (validationError) {
  78  |     console.log('Form validation error:', validationError);
  79  |   }
  80  | 
  81  |   // Wait for navigation to receipt page after click
  82  |   const navigationPromise = page.waitForURL('**/receipts/**', { timeout: 30000 });
  83  |   await mobileSubmitBtn.click();
  84  | 
  85  |   // Wait for either navigation or error
  86  |   try {
  87  |     await navigationPromise;
  88  |     await page.waitForLoadState('networkidle');
  89  |     console.log('✅ Payment submitted and navigated to receipt page');
  90  |   } catch (navError) {
  91  |     // Check if still on collections/new page with error
  92  |     const currentUrl = page.url();
  93  |     console.log('Current URL after click:', currentUrl);
  94  | 
  95  |     const errorAfterClick = await page.locator('p[role="alert"]').textContent().catch(() => null);
  96  |     if (errorAfterClick) {
  97  |       console.log('Form error after submit:', errorAfterClick);
  98  |     }
  99  |     throw navError;
  100 |   }
  101 | 
  102 |   // Check current URL - should redirect to receipt page
  103 |   const currentUrl = page.url();
  104 |   console.log('Current URL:', currentUrl);
  105 | 
  106 |   // Verify receipt page loaded - check for new Hindi receipt design
  107 |   await expect(page.locator('text=रसीद').first()).toBeVisible({ timeout: 15000 });
  108 |   console.log('✅ Receipt page loaded');
  109 | 
  110 |   // Get receipt number (target the receipt page element, not the preview on collection page)
  111 |   const receiptText = await page.locator('.print-sheet').locator('text=रसीद संख्या').first().textContent();
  112 |   console.log('Receipt info:', receiptText);
```