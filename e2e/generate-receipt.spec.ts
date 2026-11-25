import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test('Generate receipt via payment creation', async ({ page }) => {
  // Use mobile viewport since purpose selector is mobile-only
  await page.setViewportSize({ width: 375, height: 667 });

  // Go directly to new collection page (already authenticated via auth-state.json)
  await page.goto(`${BASE_URL}/collections/new`);
  await page.waitForLoadState('networkidle');
  console.log('✅ On collections/new page (authenticated)');
  await page.waitForTimeout(1000);
  console.log('✅ On collections/new page');

  // Ensure "Choose member" is selected (it should be by default, but click to ensure member search renders)
  await page.click('text=Choose member');
  await page.waitForTimeout(500);

  // Check if a member is already selected (input disabled with value)
  const memberSearchInput = page.locator('#member-search');
  const isDisabled = await memberSearchInput.evaluate(el => (el as HTMLInputElement).disabled);

  if (!isDisabled) {
    // Fill in member search - use existing member from seed data
    await page.fill('#member-search', 'Arif Hussain');
    await page.waitForTimeout(500);

    // Click the first matching member
    await page.click('button:has-text("Arif Hussain")');
    await page.waitForTimeout(500);
  } else {
    console.log('✅ Member already selected, proceeding...');
  }
  console.log('✅ Member selected');

  // Set amount
  await page.fill('input[placeholder="0"]', '500');
  await page.waitForTimeout(300);
  console.log('✅ Amount set to 500');

  // Select payment mode - Cash
  await page.click('button:has-text("Cash")');
  await page.waitForTimeout(300);
  console.log('✅ Payment mode: Cash');

  // Select purpose/category directly (buttons are rendered directly on mobile view)
  // Use "General Donation" which has ANY_PENDING_PERIOD settlement policy (no FIFO allocation required)
  await page.click('button:has-text("General Donation")');
  await page.waitForTimeout(500);
  console.log('✅ Purpose selected');

  // General Donation has ANY_PENDING_PERIOD settlement - no allocation input needed
  await page.waitForTimeout(500);
  console.log('✅ General Donation category selected (no FIFO allocation required)');

  // Set date to today
  const today = new Date().toISOString().split('T')[0];
  await page.fill('input[type="date"]', today);
  await page.waitForTimeout(300);

  // Wait a bit for form validation to update
  await page.waitForTimeout(1000);

  // Check if there are any errors
  const errorMsg = await page.locator('p[role="alert"]').textContent().catch(() => null);
  if (errorMsg) {
    console.log('Error message:', errorMsg);
  }

  // Click submit - use mobile bottom bar submit button (the one in the sticky footer)
  const mobileSubmitBtn = page.locator('button:has-text("Confirm and issue receipt")').last();
  await mobileSubmitBtn.waitFor({ state: 'visible', timeout: 10000 });

  // Check for validation errors before clicking
  const validationError = await page.locator('p[role="alert"]').textContent().catch(() => null);
  if (validationError) {
    console.log('Form validation error:', validationError);
  }

  // Wait for navigation to receipt page after click
  const navigationPromise = page.waitForURL('**/receipts/**', { timeout: 30000 });
  await mobileSubmitBtn.click();

  // Wait for either navigation or error
  try {
    await navigationPromise;
    await page.waitForLoadState('networkidle');
    console.log('✅ Payment submitted and navigated to receipt page');
  } catch (navError) {
    // Check if still on collections/new page with error
    const currentUrl = page.url();
    console.log('Current URL after click:', currentUrl);

    const errorAfterClick = await page.locator('p[role="alert"]').textContent().catch(() => null);
    if (errorAfterClick) {
      console.log('Form error after submit:', errorAfterClick);
    }
    throw navError;
  }

  // Check current URL - should redirect to receipt page
  const currentUrl = page.url();
  console.log('Current URL:', currentUrl);

  // Verify receipt page loaded - check for new Hindi receipt design
  await expect(page.locator('text=रसीद').first()).toBeVisible({ timeout: 15000 });
  console.log('✅ Receipt page loaded');

  // Get receipt number (target the receipt page element, not the preview on collection page)
  const receiptText = await page.locator('.print-sheet').locator('text=रसीद संख्या').first().textContent();
  console.log('Receipt info:', receiptText);

  // Get amount
  const amountText = await page.locator('.amount-value').first().textContent();
  console.log('Amount on receipt:', amountText);

  // Take screenshot
  await page.screenshot({ path: 'test-results/generated-receipt.png', fullPage: true });
  console.log('✅ Screenshot saved to test-results/generated-receipt.png');

  // Test PDF download
  const downloadPromise = page.waitForEvent('download');
  await page.click('button:has-text("Download PDF")');
  const download = await downloadPromise;
  console.log('✅ PDF downloaded:', download.suggestedFilename());
  const downloadPath = await download.path();
  console.log('✅ PDF saved at:', downloadPath);
  if (downloadPath) {
    const fs = require('fs');
    const destPath = `test-results/${download.suggestedFilename()}`;
    fs.copyFileSync(downloadPath, destPath);
    console.log('✅ PDF copied to:', destPath);
  }

  // Test print (opens print dialog)
  try {
    await page.locator('button:has-text("Print")').first().click({ timeout: 5000 });
    console.log('✅ Print dialog triggered');
  } catch (err) {
    console.log('Print button click failed (non-critical):', (err as Error).message);
  }

  console.log('🎉 Receipt generated successfully!');
});