import { test, expect } from "@playwright/test";

test("debug generate page", async ({ page }) => {
  await page.goto("/collections/generate");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: "/tmp/generate-page.png" });
  
  const bodyText = await page.locator("body").textContent();
  console.log("URL:", page.url());
  console.log("=== BODY TEXT ===");
  console.log(bodyText?.substring(0, 3000));
  
  // Check for specific texts
  const hasGenerateDues = bodyText?.includes("Generate due periods");
  const hasHindi = bodyText?.includes("देय");
  console.log("\nHas 'Generate due periods':", hasGenerateDues);
  console.log("Has Hindi text:", hasHindi);
  
  // Check for Monthly Chanda
  const hasMonthlyChanda = bodyText?.includes("Monthly Chanda");
  console.log("Has 'Monthly Chanda':", hasMonthlyChanda);
  
  // Check all buttons
  const buttons = await page.locator("button").all();
  console.log("\n=== BUTTONS ===");
  for (const btn of buttons) {
    const text = await btn.textContent();
    const visible = await btn.isVisible();
    if (visible && text?.trim()) {
      console.log(`  Button: "${text.trim()}"`);
    }
  }
});
