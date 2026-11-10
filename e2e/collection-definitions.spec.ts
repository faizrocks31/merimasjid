import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

// Helper function to delete existing test definitions to stay within plan limit
async function cleanupTestDefinitions(page: any, prefix: string) {
  await page.goto(`${BASE_URL}/settings?tab=collections`);
  await page.waitForTimeout(1000);

  // Find and delete definitions matching the prefix
  const listItems = page.locator('ul.divide-y li');
  const count = await listItems.count();

  for (let i = 0; i < count; i++) {
    const item = listItems.nth(i);
    const text = await item.textContent();
    if (text?.includes(prefix)) {
      const deleteBtn = item.locator('button[aria-label="Delete"]').first();
      if (await deleteBtn.isVisible({ timeout: 1000 })) {
        await deleteBtn.click();
        await page.waitForTimeout(1000);
        // Handle confirmation if any
        const confirmBtn = page.locator('button:has-text("Delete"), button:has-text("Yes"), button:has-text("Confirm")').first();
        if (await confirmBtn.isVisible({ timeout: 1000 })) {
          await confirmBtn.click();
          await page.waitForTimeout(1000);
        }
      }
    }
  }
}

test.describe("Settings - Collection Definitions Tab", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 10000 });
    // Clean up test definitions from previous runs to stay within plan limit
    await page.goto(`${BASE_URL}/settings?tab=collections`);
    await page.waitForTimeout(1000);
    // Delete any test definitions with known prefixes
    const prefixes = ["Test Monthly Chanda Playwright", "Test Edit Name Prefill", "Visible Definition", "Hidden Definition", "Amount No Decimals Test", "Construction Test", "Jumma Test", "General Test"];
    for (const prefix of prefixes) {
      await cleanupTestDefinitions(page, prefix);
    }
  });

  test("Add Collection Definition - dropdown filtering and rupee input", async ({ page }) => {
    // Navigate to Settings → Collections tab
    await page.goto(`${BASE_URL}/settings?tab=collections`);
    await page.waitForTimeout(1000);

    // Click "Add Collection Definition" button
    const addBtn = page.locator('button:has-text("Add Collection Definition")').first();
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();
    await page.waitForTimeout(500);

    // Verify form is visible
    await expect(page.locator('form')).toBeVisible({ timeout: 5000 });

    // Test 1: Base Category dropdown should have all 7 options
    const baseCategorySelect = page.locator('select[name="baseCategoryId"]');
    await expect(baseCategorySelect).toBeVisible();

    const baseOptions = await baseCategorySelect.locator('option').all();
    console.log('Base category options count:', baseOptions.length);
    // 7 base categories + 1 placeholder = 8 options
    expect(baseOptions.length).toBeGreaterThanOrEqual(8);

    // Test 2: Select MONTHLY base category (Chanda -> Monthly)
    // Use evaluate to properly trigger React onChange
    await page.evaluate(() => {
      const select = document.querySelector('select[name="baseCategoryId"]') as HTMLSelectElement;
      if (select) {
        // Find the option with label "Monthly"
        const options = Array.from(select.options);
        const monthlyOption = options.find(opt => opt.textContent?.trim() === "Monthly");
        if (monthlyOption) {
          select.value = monthlyOption.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });
    await page.waitForTimeout(500);

    // DEBUG: Check if selectedBaseCategoryCode was updated
    const debugInfo = await page.evaluate(() => {
      // Check if there's any React state we can inspect
      const select = document.querySelector('select[name="baseCategoryId"]') as HTMLSelectElement;
      return {
        selectedValue: select?.value,
        selectedText: select?.options[select?.selectedIndex]?.textContent
      };
    });
    console.log('DEBUG after MONTHLY select:', debugInfo);

    // Test 3: Subcategory dropdown should now filter to only MONTHLY subcategories (RECURRING_DONATION)
    const subcategorySelect = page.locator('select[name="subcategoryId"]');
    await expect(subcategorySelect).toBeVisible();

    const subOptions = await subcategorySelect.locator('option').all();
    const subLabels = [];
    for (const opt of subOptions) {
      const text = await opt.textContent();
      if (text && text.trim()) subLabels.push(text.trim());
    }
    console.log('Subcategory options for MONTHLY:', subLabels);

    // Should only have Recurring Donation for MONTHLY
    expect(subLabels).toContain("Recurring Donation");
    // Should NOT have General, Restricted, etc.
    expect(subLabels).not.toContain("General");
    expect(subLabels).not.toContain("Restricted");

    // Test 4: Select RECURRING_DONATION subcategory
    await subcategorySelect.selectOption({ label: "Recurring Donation" });
    await page.waitForTimeout(300);

    // Test 5: Fill name
    await page.fill('input[name="name"]', "Test Monthly Chanda Playwright");
    await page.waitForTimeout(300);

    // Test 6: Default Amount should accept rupees (not paise)
    // Verify label says (₹) not (Paise) - the label is "Default amount" in English
    const amountLabel = await page.locator('label:has-text("Default amount")').textContent();
    console.log('Amount label:', amountLabel);
    // The actual translation may vary, just check it doesn't say "Paise"
    expect(amountLabel).not.toContain("Paise");

    // Test 7: Enter amount in rupees (e.g., 500 for ₹500)
    const amountInput = page.locator('input[name="defaultAmountPaise"]');
    await expect(amountInput).toBeVisible();
    await amountInput.fill("500");
    await page.waitForTimeout(300);

    // Verify the input value is 500 (not 50000)
    const inputValue = await amountInput.inputValue();
    expect(inputValue).toBe("500");

    // Test 8: Select frequency, amount type, etc.
    await page.selectOption('select[name="frequency"]', "MONTHLY");
    await page.selectOption('select[name="amountType"]', "VARIABLE");
    await page.selectOption('select[name="donorEligibility"]', "MEMBERS_ONLY");
    await page.selectOption('select[name="memberAssignment"]', "ALL_ELIGIBLE");
    await page.selectOption('select[name="dueGeneration"]', "AUTOMATIC");
    await page.selectOption('select[name="settlementPolicy"]', "OLDEST_FIRST");

    // Test 9: Save the form
    const saveBtn = page.locator('button[type="submit"]:has-text("Save")').first();
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();
    await page.waitForTimeout(3000);

    // Test 10: Verify category was created and shows in list
    await expect(page.locator('text=Test Monthly Chanda Playwright').first()).toBeVisible({ timeout: 10000 });

    // Test 11: Now test EDIT mode - click edit button
    const editBtn = page.locator('button[aria-label="Edit"]').first();
    await expect(editBtn).toBeVisible({ timeout: 5000 });
    await editBtn.click();
    await page.waitForTimeout(500);

    // Test 12: In edit mode, base category should be pre-selected
    const editBaseSelect = page.locator('select[name="baseCategoryId"]');
    const selectedBaseValue = await editBaseSelect.inputValue();
    console.log('Edit mode base category value:', selectedBaseValue);
    expect(selectedBaseValue).not.toBe("");

    // Test 13: Subcategory should be filtered in edit mode too
    const editSubSelect = page.locator('select[name="subcategoryId"]');
    const editSubOptions = await editSubSelect.locator('option').all();
    const editSubLabels = [];
    for (const opt of editSubOptions) {
      const text = await opt.textContent();
      if (text && text.trim()) editSubLabels.push(text.trim());
    }
    console.log('Subcategory options in edit mode:', editSubLabels);
    expect(editSubLabels).toContain("Recurring Donation");

    // Test 14: Default amount should show in rupees (500, not 50000)
    const editAmountInput = page.locator('input[name="defaultAmountPaise"]');
    const editAmountValue = await editAmountInput.inputValue();
    console.log('Edit mode amount value:', editAmountValue);
    expect(editAmountValue).toBe("500"); // Should be 500 rupees, not 50000 paise

    // Test 15: Cancel edit
    const cancelBtn = page.locator('button:has-text("Cancel")').first();
    await cancelBtn.click();
    await page.waitForTimeout(500);

    // Test 16: Test another base category - CONSTRUCTION (Infaq -> Construction)
    await addBtn.click();
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      const select = document.querySelector('select[name="baseCategoryId"]') as HTMLSelectElement;
      if (select) {
        const options = Array.from(select.options);
        const constructionOption = options.find(opt => opt.textContent?.trim() === "Construction");
        if (constructionOption) {
          select.value = constructionOption.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });
    await page.waitForTimeout(500);

    const constructionSubOptions = await subcategorySelect.locator('option').all();
    const constructionSubLabels = [];
    for (const opt of constructionSubOptions) {
      const text = await opt.textContent();
      if (text && text.trim()) constructionSubLabels.push(text.trim());
    }
    console.log('Subcategory options for CONSTRUCTION:', constructionSubLabels);
    expect(constructionSubLabels).toContain("General");
    expect(constructionSubLabels).toContain("Restricted");
    expect(constructionSubLabels).toContain("Recurring Donation");

    console.log("✅ All Collection Definition tests passed!");
  });

  test("Add Collection Definition - CONSTRUCTION base category filtering", async ({ page }) => {

    await page.goto(`${BASE_URL}/settings?tab=collections`);
    await page.waitForTimeout(1000);

    const addBtn = page.locator('button:has-text("Add Collection Definition")').first();
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();
    await page.waitForTimeout(500);

    // Select CONSTRUCTION base category
    await page.evaluate(() => {
      const select = document.querySelector('select[name="baseCategoryId"]') as HTMLSelectElement;
      if (select) {
        const options = Array.from(select.options);
        const constructionOption = options.find(opt => opt.textContent?.trim() === "Construction");
        if (constructionOption) {
          select.value = constructionOption.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });
    await page.waitForTimeout(500);

    // Verify subcategory filtering for CONSTRUCTION
    const subcategorySelect = page.locator('select[name="subcategoryId"]');
    const subOptions = await subcategorySelect.locator('option').all();
    const subLabels = [];
    for (const opt of subOptions) {
      const text = await opt.textContent();
      if (text && text.trim()) subLabels.push(text.trim());
    }
    console.log('Subcategory options for CONSTRUCTION:', subLabels);

    expect(subLabels).toContain("General");
    expect(subLabels).toContain("Restricted");
    expect(subLabels).toContain("Recurring Donation");
    // Should NOT have only Recurring Donation like MONTHLY
    expect(subLabels.length).toBeGreaterThanOrEqual(3);

    const cancelBtn = page.locator('button:has-text("Cancel")').first();
    await cancelBtn.click();
    await page.waitForTimeout(500);
  });

  test("Add Collection Definition - JUMMA base category filtering", async ({ page }) => {

    await page.goto(`${BASE_URL}/settings?tab=collections`);
    await page.waitForTimeout(1000);

    const addBtn = page.locator('button:has-text("Add Collection Definition")').first();
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();
    await page.waitForTimeout(500);

    // Select JUMMA base category
    await page.evaluate(() => {
      const select = document.querySelector('select[name="baseCategoryId"]') as HTMLSelectElement;
      if (select) {
        const options = Array.from(select.options);
        const jummaOption = options.find(opt => opt.textContent?.trim() === "Jumma");
        if (jummaOption) {
          select.value = jummaOption.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });
    await page.waitForTimeout(500);

    // Verify subcategory filtering for JUMMA
    const subcategorySelect = page.locator('select[name="subcategoryId"]');
    const subOptions = await subcategorySelect.locator('option').all();
    const subLabels = [];
    for (const opt of subOptions) {
      const text = await opt.textContent();
      if (text && text.trim()) subLabels.push(text.trim());
    }
    console.log('Subcategory options for JUMMA:', subLabels);

    expect(subLabels).toContain("General");
    expect(subLabels).toContain("Restricted");
    expect(subLabels).toContain("Recurring Donation");

    const cancelBtn = page.locator('button:has-text("Cancel")').first();
    await cancelBtn.click();
    await page.waitForTimeout(500);
  });

  test("Add Collection Definition - GENERAL base category filtering", async ({ page }) => {

    await page.goto(`${BASE_URL}/settings?tab=collections`);
    await page.waitForTimeout(1000);

    const addBtn = page.locator('button:has-text("Add Collection Definition")').first();
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();
    await page.waitForTimeout(500);

    // Select GENERAL base category
    await page.evaluate(() => {
      const select = document.querySelector('select[name="baseCategoryId"]') as HTMLSelectElement;
      if (select) {
        const options = Array.from(select.options);
        const generalOption = options.find(opt => opt.textContent?.trim() === "General");
        if (generalOption) {
          select.value = generalOption.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });
    await page.waitForTimeout(500);

    // Verify subcategory filtering for GENERAL
    const subcategorySelect = page.locator('select[name="subcategoryId"]');
    const subOptions = await subcategorySelect.locator('option').all();
    const subLabels = [];
    for (const opt of subOptions) {
      const text = await opt.textContent();
      if (text && text.trim()) subLabels.push(text.trim());
    }
    console.log('Subcategory options for GENERAL:', subLabels);

    expect(subLabels).toContain("General");
    expect(subLabels).toContain("Restricted");
    // Should NOT have Recurring Donation for GENERAL
    expect(subLabels).not.toContain("Recurring Donation");

    const cancelBtn = page.locator('button:has-text("Cancel")').first();
    await cancelBtn.click();
    await page.waitForTimeout(500);
  });

  test("Add Collection Definition - ZAKAT base category filtering", async ({ page }) => {

    await page.goto(`${BASE_URL}/settings?tab=collections`);
    await page.waitForTimeout(1000);

    const addBtn = page.locator('button:has-text("Add Collection Definition")').first();
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();
    await page.waitForTimeout(500);

    // Select ZAKAT base category
    await page.evaluate(() => {
      const select = document.querySelector('select[name="baseCategoryId"]') as HTMLSelectElement;
      if (select) {
        const options = Array.from(select.options);
        const zakatOption = options.find(opt => opt.textContent?.trim() === "Zakat");
        if (zakatOption) {
          select.value = zakatOption.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });
    await page.waitForTimeout(500);

    // Verify subcategory filtering for ZAKAT
    const subcategorySelect = page.locator('select[name="subcategoryId"]');
    const subOptions = await subcategorySelect.locator('option').all();
    const subLabels = [];
    for (const opt of subOptions) {
      const text = await opt.textContent();
      if (text && text.trim()) subLabels.push(text.trim());
    }
    console.log('Subcategory options for ZAKAT:', subLabels);

    expect(subLabels).toContain("General");
    expect(subLabels).toContain("Restricted");
    // Should NOT have Recurring Donation for ZAKAT
    expect(subLabels).not.toContain("Recurring Donation");

    const cancelBtn = page.locator('button:has-text("Cancel")').first();
    await cancelBtn.click();
    await page.waitForTimeout(500);
  });

  test("Add Collection Definition - SADAQAH base category filtering", async ({ page }) => {

    await page.goto(`${BASE_URL}/settings?tab=collections`);
    await page.waitForTimeout(1000);

    const addBtn = page.locator('button:has-text("Add Collection Definition")').first();
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();
    await page.waitForTimeout(500);

    // Select SADAQAH base category
    await page.evaluate(() => {
      const select = document.querySelector('select[name="baseCategoryId"]') as HTMLSelectElement;
      if (select) {
        const options = Array.from(select.options);
        const sadaqahOption = options.find(opt => opt.textContent?.trim() === "Sadaqah");
        if (sadaqahOption) {
          select.value = sadaqahOption.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });
    await page.waitForTimeout(500);

    // Verify subcategory filtering for SADAQAH
    const subcategorySelect = page.locator('select[name="subcategoryId"]');
    const subOptions = await subcategorySelect.locator('option').all();
    const subLabels = [];
    for (const opt of subOptions) {
      const text = await opt.textContent();
      if (text && text.trim()) subLabels.push(text.trim());
    }
    console.log('Subcategory options for SADAQAH:', subLabels);

    expect(subLabels).toContain("General");
    expect(subLabels).toContain("Restricted");
    // Should NOT have Recurring Donation for SADAQAH
    expect(subLabels).not.toContain("Recurring Donation");

    const cancelBtn = page.locator('button:has-text("Cancel")').first();
    await cancelBtn.click();
    await page.waitForTimeout(500);
  });

  test("Add Collection Definition - ANNUAL base category filtering", async ({ page }) => {

    await page.goto(`${BASE_URL}/settings?tab=collections`);
    await page.waitForTimeout(1000);

    const addBtn = page.locator('button:has-text("Add Collection Definition")').first();
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();
    await page.waitForTimeout(500);

    // Select ANNUAL base category
    await page.evaluate(() => {
      const select = document.querySelector('select[name="baseCategoryId"]') as HTMLSelectElement;
      if (select) {
        const options = Array.from(select.options);
        const annualOption = options.find(opt => opt.textContent?.trim() === "Annual");
        if (annualOption) {
          select.value = annualOption.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });
    await page.waitForTimeout(500);

    // Verify subcategory filtering for ANNUAL
    const subcategorySelect = page.locator('select[name="subcategoryId"]');
    const subOptions = await subcategorySelect.locator('option').all();
    const subLabels = [];
    for (const opt of subOptions) {
      const text = await opt.textContent();
      if (text && text.trim()) subLabels.push(text.trim());
    }
    console.log('Subcategory options for ANNUAL:', subLabels);

    // Should only have Recurring Donation for ANNUAL
    expect(subLabels).toContain("Recurring Donation");
    expect(subLabels).not.toContain("General");
    expect(subLabels).not.toContain("Restricted");

    const cancelBtn = page.locator('button:has-text("Cancel")').first();
    await cancelBtn.click();
    await page.waitForTimeout(500);
  });

  test("Edit Collection Definition - name pre-filled", async ({ page }) => {

    await page.goto(`${BASE_URL}/settings?tab=collections`);
    await page.waitForTimeout(1000);

    // Create a test definition first
    const addBtn = page.locator('button:has-text("Add Collection Definition")').first();
    await addBtn.click();
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      const select = document.querySelector('select[name="baseCategoryId"]') as HTMLSelectElement;
      if (select) {
        const options = Array.from(select.options);
        const monthlyOption = options.find(opt => opt.textContent?.trim() === "Monthly");
        if (monthlyOption) {
          select.value = monthlyOption.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });
    await page.waitForTimeout(500);

    await page.fill('input[name="name"]', "Test Edit Name Prefill");
    await page.selectOption('select[name="subcategoryId"]', { label: "Recurring Donation" });
    await page.selectOption('select[name="frequency"]', "MONTHLY");
    await page.selectOption('select[name="amountType"]', "VARIABLE");
    await page.selectOption('select[name="donorEligibility"]', "MEMBERS_ONLY");
    await page.selectOption('select[name="memberAssignment"]', "ALL_ELIGIBLE");
    await page.selectOption('select[name="dueGeneration"]', "AUTOMATIC");
    await page.selectOption('select[name="settlementPolicy"]', "OLDEST_FIRST");

    const saveBtn = page.locator('button[type="submit"]:has-text("Save")').first();
    await saveBtn.click();
    // Wait for page reload (useReloadOnSuccess triggers reload on state.ok)
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Now edit the created definition - find the edit button for "Test Edit Name Prefill"
    const editBtn = page.locator('li:has-text("Test Edit Name Prefill") button[aria-label="Edit"]').first();
    await expect(editBtn).toBeVisible({ timeout: 5000 });
    await editBtn.click();
    await page.waitForTimeout(500);

    // Verify name is pre-filled
    const nameInput = page.locator('input[name="name"]');
    const nameValue = await nameInput.inputValue();
    expect(nameValue).toBe("Test Edit Name Prefill");

    const cancelBtn = page.locator('button:has-text("Cancel")').first();
    await cancelBtn.click();
  });

  test("List sorting - showInPaymentReceived=true at top", async ({ page }) => {
    await cleanupTestDefinitions(page, "Visible Definition");
    await cleanupTestDefinitions(page, "Hidden Definition");

    await page.goto(`${BASE_URL}/settings?tab=collections`);
    await page.waitForTimeout(1000);

    // Check if we can add more (plan limit check)
    const limitAlert = page.locator('text=Collection definition limit exceeded');
    if (await limitAlert.isVisible({ timeout: 1000 })) {
      console.log('Plan limit reached, skipping test');
      test.skip();
    }

    // Create two definitions - one visible, one hidden
    const addBtn = page.locator('button:has-text("Add Collection Definition")').first();

    // First: visible in payment received
    await addBtn.click();
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const select = document.querySelector('select[name="baseCategoryId"]') as HTMLSelectElement;
      if (select) {
        const options = Array.from(select.options);
        const monthlyOption = options.find(opt => opt.textContent?.trim() === "Monthly");
        if (monthlyOption) {
          select.value = monthlyOption.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });
    await page.waitForTimeout(500);
    await page.fill('input[name="name"]', "Visible Definition");
    await page.selectOption('select[name="subcategoryId"]', { label: "Recurring Donation" });
    await page.selectOption('select[name="frequency"]', "MONTHLY");
    await page.selectOption('select[name="amountType"]', "VARIABLE");
    await page.selectOption('select[name="donorEligibility"]', "MEMBERS_ONLY");
    await page.selectOption('select[name="memberAssignment"]', "ALL_ELIGIBLE");
    await page.selectOption('select[name="dueGeneration"]', "AUTOMATIC");
    await page.selectOption('select[name="settlementPolicy"]', "OLDEST_FIRST");
    // Ensure visible in payment received is checked (default)
    await page.locator('button[type="submit"]:has-text("Save")').first().click();
    // Wait for page reload (useReloadOnSuccess triggers reload on state.ok)
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Second: hidden in payment received
    await addBtn.click();
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const select = document.querySelector('select[name="baseCategoryId"]') as HTMLSelectElement;
      if (select) {
        const options = Array.from(select.options);
        const monthlyOption = options.find(opt => opt.textContent?.trim() === "Monthly");
        if (monthlyOption) {
          select.value = monthlyOption.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });
    await page.waitForTimeout(500);
    await page.fill('input[name="name"]', "Hidden Definition");
    await page.selectOption('select[name="subcategoryId"]', { label: "Recurring Donation" });
    await page.selectOption('select[name="frequency"]', "MONTHLY");
    await page.selectOption('select[name="amountType"]', "VARIABLE");
    await page.selectOption('select[name="donorEligibility"]', "MEMBERS_ONLY");
    await page.selectOption('select[name="memberAssignment"]', "ALL_ELIGIBLE");
    await page.selectOption('select[name="dueGeneration"]', "AUTOMATIC");
    await page.selectOption('select[name="settlementPolicy"]', "OLDEST_FIRST");
    // Uncheck showInPaymentReceived
    await page.uncheck('input[name="showInPaymentReceived"]');
    await page.locator('button[type="submit"]:has-text("Save")').first().click();
    await page.waitForTimeout(3000);

    // Verify list order - visible should be above hidden
    const listItems = page.locator('ul.divide-y li');
    const count = await listItems.count();

    // Find positions of our test items
    let visibleIndex = -1;
    let hiddenIndex = -1;
    for (let i = 0; i < count; i++) {
      const text = await listItems.nth(i).textContent();
      if (text?.includes("Visible Definition")) visibleIndex = i;
      if (text?.includes("Hidden Definition")) hiddenIndex = i;
    }

    console.log('Visible index:', visibleIndex, 'Hidden index:', hiddenIndex);
    expect(visibleIndex).toBeLessThan(hiddenIndex);
  });

  test("Amount display - no decimals in list", async ({ page }) => {
    await cleanupTestDefinitions(page, "Amount No Decimals Test");

    await page.goto(`${BASE_URL}/settings?tab=collections`);
    await page.waitForTimeout(1000);

    // Check if we can add more (plan limit check)
    const limitAlert = page.locator('text=Collection definition limit exceeded');
    if (await limitAlert.isVisible({ timeout: 1000 })) {
      console.log('Plan limit reached, skipping test');
      test.skip();
    }

    // Create a definition with amount 500
    const addBtn = page.locator('button:has-text("Add Collection Definition")').first();
    await addBtn.click();
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const select = document.querySelector('select[name="baseCategoryId"]') as HTMLSelectElement;
      if (select) {
        const options = Array.from(select.options);
        const monthlyOption = options.find(opt => opt.textContent?.trim() === "Monthly");
        if (monthlyOption) {
          select.value = monthlyOption.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });
    await page.waitForTimeout(500);
    await page.fill('input[name="name"]', "Amount No Decimals Test");
    await page.selectOption('select[name="subcategoryId"]', { label: "Recurring Donation" });
    await page.selectOption('select[name="frequency"]', "MONTHLY");
    await page.selectOption('select[name="amountType"]', "FIXED");
    await page.selectOption('select[name="donorEligibility"]', "MEMBERS_ONLY");
    await page.selectOption('select[name="memberAssignment"]', "ALL_ELIGIBLE");
    await page.selectOption('select[name="dueGeneration"]', "AUTOMATIC");
    await page.selectOption('select[name="settlementPolicy"]', "OLDEST_FIRST");
    await page.fill('input[name="defaultAmountPaise"]', "500"); // 500 rupees
    await page.locator('button[type="submit"]:has-text("Save")').first().click();

    // Wait for page reload (useReloadOnSuccess triggers reload on state.ok)
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check list display - should show "₹500" not "₹500.00"
    // Find the list item containing "Amount No Decimals Test" and look for the amount text
    const listItem = page.locator('ul.divide-y li').filter({ hasText: "Amount No Decimals Test" });
    // Badge renders as a generic element, look for the text containing ₹500
    const amountText = listItem.locator('text=₹500').first();
    const badgeText = await amountText.textContent();
    console.log('Amount badge text:', badgeText);
    expect(badgeText).toBe("₹500");
    expect(badgeText).not.toBe("₹500.00");
  });
});