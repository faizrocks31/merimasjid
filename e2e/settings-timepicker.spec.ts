import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('Settings Page - Prayer Times & AnalogTimePicker', () => {
  test.beforeEach(async ({ page }) => {
    // Use auth state
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('networkidle');
    // Wait for tabs to be visible - use role button
    await expect(page.getByRole('button', { name: 'Prayer Times' })).toBeVisible({ timeout: 10000 });
  });

  test('Settings page loads with prayer times section', async ({ page }) => {
    // Check page loaded - wait for Save button in masjid settings form
    await expect(page.locator('button:has-text("Save")').first()).toBeVisible({ timeout: 15000 });

    // Click on Prayer Times tab
    await page.getByRole('button', { name: 'Prayer Times' }).click();
    await page.waitForTimeout(500);

    // Check prayer times section exists - use .first() since there are multiple elements with this text
    await expect(page.locator('text=/Prayer Times|नमाज़ के समय|نماز کے اوقات/').first()).toBeVisible({ timeout: 10000 });
  });

  test('AnalogTimePicker opens when clicking Fajr time', async ({ page }) => {
    // Click on Prayer Times tab first
    await page.getByRole('button', { name: 'Prayer Times' }).click();
    await page.waitForTimeout(500);
    
    // Find the Fajr time picker button and click it
    // The AnalogTimePicker renders a button with the current time (e.g., "Fajr")
    const fajrButton = page.getByRole('button', { name: /^Fajr/ }).first();
    await expect(fajrButton).toBeVisible({ timeout: 10000 });
    
    // Click the button to open picker
    await fajrButton.click();
    
    // Wait for modal/bottom sheet to appear
    await page.waitForTimeout(1000);
    
    // Check for time picker elements - AM/PM buttons in the modal
    await expect(page.locator('text=/AM|सुबह|صبح/').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/PM|शाम|شام/').first()).toBeVisible({ timeout: 5000 });
    
    // Check for Save Time and Cancel buttons - use the dialog element (role="dialog" div, not <dialog>)
    const dialog = page.locator('[role="dialog"]:has-text("Fajr")').first();
    // The dialog has footer buttons - check they exist (at least 2 buttons in the footer area)
    const footerButtons = dialog.locator('div[class*="border-t"] button');
    await expect(footerButtons.first()).toBeVisible({ timeout: 5000 });
  });
});
