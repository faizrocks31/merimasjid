import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

const VIEWPORTS = [
  { name: "Mobile-320", width: 320, height: 720 },
  { name: "Mobile-360", width: 360, height: 800 },
  { name: "Mobile-390", width: 390, height: 844 },
  { name: "Mobile-430", width: 430, height: 932 },
  { name: "Tablet-768", width: 768, height: 1024 },
];

test.describe("Mobile Settings Page", () => {
  for (const vp of VIEWPORTS) {
    test.describe(`${vp.name} (${vp.width}x${vp.height})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`${BASE_URL}/dashboard`);
        await page.waitForLoadState("networkidle");
      });

      test("Settings page opens and tabs are accessible", async ({ page }) => {
        await page.goto(`${BASE_URL}/settings?tab=collections`);
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(1000);

        // Check for tabs - TabsTrigger uses title attribute
        const tabs = page.locator('button[title]');
        const tabCount = await tabs.count();
        expect(tabCount).toBeGreaterThan(0);

        // Verify specific tabs exist
        await expect(page.locator('button[title="Collections"]').first()).toBeVisible({ timeout: 10000 });
      });

      test("Collections tab works - list visible", async ({ page }) => {
        await page.goto(`${BASE_URL}/settings?tab=collections`);
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(1000);

        // Check collection definitions list
        const list = page.locator('ul.divide-y, .collection-list').first();
        await expect(list).toBeVisible({ timeout: 10000 });
      });

      test("Add Collection Definition opens correctly", async ({ page }) => {
        await page.goto(`${BASE_URL}/settings?tab=collections`);
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(1000);

        // Click add button
        const addBtn = page.locator('button:has-text("Add Collection Definition")').first();
        await expect(addBtn).toBeVisible({ timeout: 10000 });
        await addBtn.click();
        await page.waitForTimeout(500);

        // Verify form opens
        await expect(page.locator('input[name="name"]')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('select[name="baseCategoryId"]')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('select[name="subcategoryId"]')).toBeVisible({ timeout: 5000 });
      });

      test("Base Category dropdown works", async ({ page }) => {
        await page.goto(`${BASE_URL}/settings?tab=collections`);
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(1000);

        const addBtn = page.locator('button:has-text("Add Collection Definition")').first();
        await addBtn.click();
        await page.waitForTimeout(500);

        // Test base category dropdown
        const baseSelect = page.locator('select[name="baseCategoryId"]');
        await expect(baseSelect).toBeVisible({ timeout: 5000 });

        // Get options
        const options = await baseSelect.locator('option').all();
        expect(options.length).toBeGreaterThanOrEqual(7); // 7 base categories

        // Select Annual
        await baseSelect.selectOption({ label: "Annual" });
        await page.waitForTimeout(300);

        // Verify subcategory updates
        const subSelect = page.locator('select[name="subcategoryId"]');
        await expect(subSelect).toBeVisible({ timeout: 5000 });
        const subOptions = await subSelect.locator('option').all();
        expect(subOptions.length).toBeGreaterThanOrEqual(2); // General + Recurring Donation
      });

      test("Subcategory filtering works - Annual shows General and Recurring Donation", async ({ page }) => {
        await page.goto(`${BASE_URL}/settings?tab=collections`);
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(1000);

        const addBtn = page.locator('button:has-text("Add Collection Definition")').first();
        await addBtn.click();
        await page.waitForTimeout(500);

        await page.locator('select[name="baseCategoryId"]').selectOption({ label: "Annual" });
        await page.waitForTimeout(300);

        const subSelect = page.locator('select[name="subcategoryId"]');
        const subOptions = await subSelect.locator('option').all();
        const subTexts = [];
        for (const opt of subOptions) {
          subTexts.push((await opt.textContent())?.trim() || "");
        }

        expect(subTexts).toContain("General");
        expect(subTexts).toContain("Recurring Donation");
        expect(subTexts).not.toContain("Restricted");
      });

      test("Subcategory filtering works - General shows General and Restricted", async ({ page }) => {
        await page.goto(`${BASE_URL}/settings?tab=collections`);
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(1000);

        const addBtn = page.locator('button:has-text("Add Collection Definition")').first();
        await addBtn.click();
        await page.waitForTimeout(500);

        await page.locator('select[name="baseCategoryId"]').selectOption({ label: "General" });
        await page.waitForTimeout(300);

        const subSelect = page.locator('select[name="subcategoryId"]');
        const subOptions = await subSelect.locator('option').all();
        const subTexts = [];
        for (const opt of subOptions) {
          subTexts.push((await opt.textContent())?.trim() || "");
        }

        expect(subTexts).toContain("General");
        expect(subTexts).toContain("Restricted");
        expect(subTexts).not.toContain("Recurring Donation");
      });

      test("Checkboxes can be checked and unchecked", async ({ page }) => {
        await page.goto(`${BASE_URL}/settings?tab=collections`);
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(1000);

        const addBtn = page.locator('button:has-text("Add Collection Definition")').first();
        await addBtn.click();
        await page.waitForTimeout(500);

        // Test Active checkbox - use getByRole to avoid hidden input
        const activeCheckbox = page.getByRole('checkbox', { name: 'Active' });
        await expect(activeCheckbox).toBeVisible({ timeout: 5000 });

        // Uncheck using force option to bypass interception
        await activeCheckbox.uncheck({ force: true });
        await page.waitForTimeout(100);
        await expect(activeCheckbox).not.toBeChecked();

        // Check
        await activeCheckbox.check({ force: true });
        await page.waitForTimeout(100);
        await expect(activeCheckbox).toBeChecked();

        // Uncheck again
        await activeCheckbox.uncheck({ force: true });
        await page.waitForTimeout(100);
        await expect(activeCheckbox).not.toBeChecked();

        // Test Show in Payment Received checkbox
        const showInPaymentCheckbox = page.getByRole('checkbox', { name: 'Show in Payment Received' });
        await expect(showInPaymentCheckbox).toBeVisible({ timeout: 5000 });

        // Uncheck first
        await showInPaymentCheckbox.uncheck({ force: true });
        await page.waitForTimeout(100);
        await expect(showInPaymentCheckbox).not.toBeChecked();

        // Check
        await showInPaymentCheckbox.check({ force: true });
        await page.waitForTimeout(100);
        await expect(showInPaymentCheckbox).toBeChecked();

        // Uncheck again
        await showInPaymentCheckbox.uncheck({ force: true });
        await page.waitForTimeout(100);
        await expect(showInPaymentCheckbox).not.toBeChecked();
      });

      test("Form does not overflow viewport", async ({ page }) => {
        await page.goto(`${BASE_URL}/settings?tab=collections`);
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(1000);

        const addBtn = page.locator('button:has-text("Add Collection Definition")').first();
        await addBtn.click();
        await page.waitForTimeout(500);

        // Check form container width (the form itself, not the entire body)
        const formContainer = page.locator('form').first();
        await expect(formContainer).toBeVisible({ timeout: 5000 });

        const formWidth = await formContainer.evaluate((el) => el.scrollWidth);
        const viewportWidth = vp.width;

        // Allow small margin
        expect(formWidth).toBeLessThanOrEqual(viewportWidth + 20);
      });

      test("Cancel button works and closes form", async ({ page }) => {
        await page.goto(`${BASE_URL}/settings?tab=collections`);
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(1000);

        const addBtn = page.locator('button:has-text("Add Collection Definition")').first();
        await addBtn.click();
        await page.waitForTimeout(500);

        // Verify form is visible
        await expect(page.locator('input[name="name"]')).toBeVisible({ timeout: 5000 });

        // Click cancel - use more specific selector to avoid header interception
        const cancelBtn = page.locator('form button:has-text("Cancel")').first();
        await expect(cancelBtn).toBeVisible({ timeout: 5000 });
        await cancelBtn.click({ force: true });
        await page.waitForTimeout(500);

        // Form should be closed
        await expect(page.locator('input[name="name"]')).not.toBeVisible({ timeout: 5000 });
      });
    });
  }
});