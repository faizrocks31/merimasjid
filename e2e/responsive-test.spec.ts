import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

const VIEWPORTS = [
  { name: 'Mobile-360', width: 360, height: 800 },
  { name: 'Mobile-390', width: 390, height: 844 },
  { name: 'Tablet-768', width: 768, height: 1024 },
  { name: 'Laptop-1366', width: 1366, height: 768 },
  { name: 'Desktop-1920', width: 1920, height: 1080 },
];

async function login(page: any) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="email"]', 'localadmin@gmail.com');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
}

for (const vp of VIEWPORTS) {
  test(`Collection Page - ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await login(page);

    await page.goto(`${BASE_URL}/collections/new`);
    await page.waitForTimeout(1500);

    // Check horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = vp.width;
    const hasHorizontalOverflow = bodyWidth > viewportWidth + 10;
    console.log(`${vp.name}: Body ${bodyWidth}px vs Viewport ${viewportWidth}px - Overflow: ${hasHorizontalOverflow}`);

    // Check receipt preview visibility
    if (vp.width < 1024) {
      const bottomBar = page.locator('.sticky.bottom-0').first();
      await expect(bottomBar).toBeVisible({ timeout: 5000 });
    } else {
      const preview = page.locator('.sticky.top-6 .print-sheet').first();
      await expect(preview).toBeVisible({ timeout: 5000 });
    }

    // Check Add Allocation button
    const addAllocBtn = page.locator('button:has-text("Add Allocation")').first();
    await expect(addAllocBtn).toBeVisible({ timeout: 5000 });

    // Test Add Allocation sheet opens - desktop uses popover, mobile/tablet uses BottomSheet
    await addAllocBtn.click();
    await page.waitForTimeout(500);
    if (vp.width < 1024) {
      // Mobile/Tablet: BottomSheet (2nd dialog to skip Next.js error overlay)
      const sheet = page.locator('[role="dialog"].fixed.inset-0.z-50').nth(1);
      await expect(sheet).toBeVisible({ timeout: 5000 });
    } else {
      // Desktop: Popover (fixed positioned near button, has w-72 class)
      const popover = page.locator('.fixed.z-50 .w-72.max-h-60').first();
      await expect(popover).toBeVisible({ timeout: 5000 });
    }

    // Screenshot
    await page.screenshot({ path: `test-results/collection-${vp.name}.png`, fullPage: true });
  });
}

for (const vp of VIEWPORTS) {
  test(`Receipt Page - ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await login(page);

    // Use existing receipt
    const receiptUrl = `${BASE_URL}/receipts/cmvujtnn8000lg8ufyl4li5ua?issued=1`;
    await page.goto(receiptUrl);
    await page.waitForTimeout(1500);

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = vp.width;
    const hasHorizontalOverflow = bodyWidth > viewportWidth + 10;
    console.log(`${vp.name} Receipt: Body ${bodyWidth}px vs Viewport ${viewportWidth}px - Overflow: ${hasHorizontalOverflow}`);

    // Check receipt is visible
    const receiptSheet = page.locator('.print-sheet').first();
    await expect(receiptSheet).toBeVisible({ timeout: 10000 });

    // Screenshot
    await page.screenshot({ path: `test-results/receipt-${vp.name}.png`, fullPage: true });
  });
}
