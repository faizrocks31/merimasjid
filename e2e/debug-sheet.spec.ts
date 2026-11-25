import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test('Debug sheet selector', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="email"]', 'localadmin@gmail.com');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
  
  await page.goto(`${BASE_URL}/collections/new`);
  await page.waitForTimeout(1500);
  
  const addAllocBtn = page.locator('button:has-text("Add Allocation")').first();
  await expect(addAllocBtn).toBeVisible({ timeout: 5000 });
  
  await addAllocBtn.click();
  await page.waitForTimeout(1000);
  
  // List all dialogs
  const dialogs = await page.locator('[role="dialog"]').all();
  console.log(`Found ${dialogs.length} dialogs`);
  for (let i = 0; i < dialogs.length; i++) {
    const cls = await dialogs[i].getAttribute('class');
    console.log(`Dialog ${i}: class="${cls}"`);
  }
  
  // Look for BottomSheet - dialog 1 is the mobile sheet
  const bottomSheetOuter = page.locator('[role="dialog"].fixed.inset-0.z-50').nth(1);
  console.log(`BottomSheet outer visible: ${await bottomSheetOuter.isVisible()}`);
  
  const bottomSheetInner = page.locator('.absolute.bottom-0.left-0.right-0');
  console.log(`BottomSheet inner visible: ${await bottomSheetInner.isVisible()}`);
  
  // Take screenshot
  await page.screenshot({ path: 'test-results/debug-sheet.png', fullPage: true });
});
