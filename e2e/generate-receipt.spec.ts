import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test('Generate receipt via payment creation', async ({ page }) => {
  // Use mobile viewport since purpose selector is mobile-only
  await page.setViewportSize({ width: 375, height: 667 });

  // Login first
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="email"]', 'localadmin@gmail.com');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
  console.log('✅ Logged in successfully');

  // Go to new collection page
  await page.goto(`${BASE_URL}/collections/new`);
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

  // Select purpose/category
  await page.click('button:has-text("Add Allocation")');
  await page.waitForTimeout(1000); // Wait for modal/sheet to open

  // Click on first available category (mobile sheet buttons don't have w-full class)
  await page.locator('button:has-text("Monthly Chanda"):not([class*="w-full"]), button:has-text("General Donation"):not([class*="w-full"]), button:has-text("Construction Fund"):not([class*="w-full"])').first().click();
  await page.waitForTimeout(300);
  console.log('✅ Purpose selected');

  // Fill allocation amount (required for form validation)
  await page.waitForTimeout(500);
  // Only fill the allocation input (has placeholder "0.00"), not the main amount input (placeholder "0")
  const allocationInput = page.locator('input[placeholder="0.00"]').first();
  await allocationInput.fill('500');
  await page.waitForTimeout(300);
  console.log('✅ Allocation amount set');

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

  // Click submit - try both buttons if one is disabled
  const submitBtn = page.locator('button:has-text("Confirm and issue receipt")').first();
  const submitBtnHasDisabled = await submitBtn.evaluate(el => (el as HTMLButtonElement).disabled);

  if (submitBtnHasDisabled) {
    console.log('Trying mobile bottom bar submit button...');
    await page.locator('button:has-text("Confirm and issue receipt")').nth(1).click();
  } else {
    await submitBtn.click();
  }
  await page.waitForTimeout(5000);
  console.log('✅ Payment submitted');

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