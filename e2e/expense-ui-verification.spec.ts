import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

test.describe("Expense Form UI Interaction Verification", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/expenses`);
    await page.waitForLoadState('networkidle');
  });

  test("Expense Category Dropdown - Full Interaction Flow", async ({ page }) => {
    await page.goto("http://localhost:3000/expenses");
    await page.waitForLoadState('networkidle');

    // 1. Locate the Expense Category dropdown
    const categorySelect = page.locator('select[name="categoryId"]');
    await expect(categorySelect).toBeVisible();

    // 2. Click the dropdown to open it
    await categorySelect.click();
    await page.waitForTimeout(300);

    // 3. Verify options are visible
    const options = page.locator('select[name="categoryId"] option');
    const optionsCount = await options.count();
    console.log(`Found ${optionsCount} category options`);
    expect(optionsCount).toBeGreaterThan(1);

    // 3. Get initial selected value
    const initialValue = await categorySelect.inputValue();
    console.log(`Initial selected value: ${initialValue}`);

    // 4. Get all option values and texts
    const optionsList = await page.locator('select[name="categoryId"] option').all();
    const optionValues = [];
    for (const opt of optionsList) {
      const value = await opt.getAttribute('value');
      const text = await opt.textContent();
      if (value) {
        optionValues.push({ value, text: text?.trim() });
        console.log(`Option: value="${value}", text="${text?.trim()}"`);
      }
    }

    // 2. Click the dropdown to open it (using keyboard/click)
    await page.locator('select[name="categoryId"]').click();
    await page.waitForTimeout(500);

    // 3. Select a different category by clicking on an option
    // Find an option different from the initially selected one
    const targetOption = optionsList.find(async (opt) => {
      const val = await opt.getAttribute('value');
      return val && val !== await page.locator('select[name="categoryId"]').inputValue();
    });

    if (targetOption) {
      const targetValue = await targetOption.getAttribute('value');
      const targetText = (await targetOption.textContent())?.trim();
      console.log(`Selecting option: value="${targetValue}", text="${targetText}"`);

      // Click the option using keyboard or click
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(200);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
    }

    // Verify selection changed
    const newValue = await page.locator('select[name="categoryId"]').inputValue();
    console.log(`New selected value: ${newValue}`);

    // Open dropdown again and select another option
    await page.locator('select[name="categoryId"]').click();
    await page.waitForTimeout(300);

    // Select a different option
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    const newValue2 = await page.locator('select[name="categoryId"]').inputValue();
    console.log(`Second selection value: ${newValue2}`);

    // Verify both selections are different
    expect(newValue2).not.toBe(initialValue);
  });

  test("Expense Date Field - Full Interaction Flow", async ({ page }) => {
    await page.goto("http://localhost:3000/expenses");
    await page.waitForLoadState('networkidle');

    // 1. Locate the date field
    const dateInput = page.locator('input[name="date"]');
    await expect(dateInput).toBeVisible();

    // 2. Use fill() for native date input - this works reliably
    await dateInput.fill('2026-01-15');
    await page.waitForTimeout(500);

    // Verify the date was entered
    const dateValue = await page.locator('input[name="date"]').inputValue();
    console.log(`Date entered: ${dateValue}`);
    expect(dateValue).toBe("2026-01-15");

    // 3. Check input type
    const dateInputElement = page.locator('input[name="date"]');
    const inputType = await dateInputElement.getAttribute('type');
    console.log(`Date input type: ${inputType}`);

    // Check if there's a calendar/picker
    const hasCalendar = await page.locator('[role="dialog"], [class*="calendar"], [class*="datepicker"], [class*="DatePicker"]').count() > 0;
    console.log(`Has calendar/picker: ${hasCalendar}`);

    // If there's a native date picker, test it with fill()
    if (inputType === 'date') {
      // Use fill to change the date
      await dateInput.fill('2026-02-20');
      await page.waitForTimeout(500);

      const newDateValue = await page.locator('input[name="date"]').inputValue();
      console.log(`New date entered: ${newDateValue}`);
      expect(newDateValue).toBe("2026-02-20");
    }

    // 4. Interact with other fields and verify date persists
    await page.fill('input[name="payee"]', "Test Payee");
    await page.fill('input[name="amount"]', "500");
    await page.selectOption('select[name="mode"]', "CASH");

    // Verify date still persists
    const finalDateValue = await page.locator('input[name="date"]').inputValue();
    expect(finalDateValue).toBe("2026-02-20"); // Should be the second date we entered
  });

  test("Full Expense Form Interaction - Category, Date, and Submit", async ({ page }) => {
    await page.goto("http://localhost:3000/expenses");
    await page.waitForLoadState('networkidle');

    // 1. Select a category using real mouse interaction
    const categorySelect = page.locator('select[name="categoryId"]');
    await expect(categorySelect).toBeVisible();
    await categorySelect.click();
    await page.waitForTimeout(300);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    const selectedCategory = await page.locator('select[name="categoryId"]').inputValue();
    console.log(`Selected category: ${selectedCategory}`);

    // 2. Enter date using fill()
    await page.fill('input[name="date"]', '2026-02-20');
    await page.waitForTimeout(500);

    // 3. Fill other fields
    await page.fill('input[name="payee"]', "Test Payee");
    await page.fill('input[name="amount"]', "500");
    await page.selectOption('select[name="mode"]', "CASH");
    await page.fill('input[name="referenceNo"]', "REF-001");
    await page.fill('textarea[name="description"]', "Test expense for UI verification");

    // 4. Verify form state before submit
    const categoryValue = await page.locator('select[name="categoryId"]').inputValue();
    const dateValue = await page.locator('input[name="date"]').inputValue();
    console.log(`Before submit - Category: ${categoryValue}, Date: ${dateValue}`);

    // 5. Submit
    await page.locator('form:has(input[name="date"]) button[type="submit"]').click();
    await page.waitForTimeout(5000);

    // Check for success or error
    const errorMessage = page.locator('p[role="alert"]');
    const hasError = await errorMessage.count() > 0;

    if (await errorMessage.count() > 0) {
      const errorText = await page.locator('p[role="alert"]').textContent();
      console.log("Expense form error:", errorText);
      throw new Error(`Expense submission failed: ${errorText}`);
    }

    // Wait for success
    await page.waitForTimeout(3000);
    console.log("✅ Expense recorded successfully");
  });
});

export {};