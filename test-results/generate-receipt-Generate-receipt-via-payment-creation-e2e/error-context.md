# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: generate-receipt.spec.ts >> Generate receipt via payment creation
- Location: e2e\generate-receipt.spec.ts:5:5

# Error details

```
TimeoutError: page.fill: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('input[name="email"]')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e3]:
      - banner [ref=e4]:
        - generic [ref=e5]: हुसैनी मस्जिद आलोट
        - generic [ref=e12]:
          - generic [ref=e15]:
            - button "English" [pressed] [ref=e16]: EN
            - button "हिन्दी" [ref=e17]: हि
            - button "اردو" [ref=e18]: ار
          - button "MA" [ref=e20]
      - main [ref=e24]:
        - generic [ref=e25]:
          - generic [ref=e26]:
            - heading "Dashboard" [level=1] [ref=e27]
            - paragraph [ref=e28]: हुसैनी मस्जिद आलोट · This month
          - link [ref=e30] [cursor=pointer]:
            - /url: /collections/new
            - button "New payment" [ref=e31]
        - generic [ref=e38]:
          - generic [ref=e40]:
            - paragraph [ref=e41]: Today's collection
            - paragraph [ref=e42]: ₹0.00
            - paragraph [ref=e43]: 0 transactions
          - generic [ref=e45]:
            - paragraph [ref=e46]: This month
            - paragraph [ref=e47]: ₹0.00
            - paragraph [ref=e48]: "Gross collection: ₹0.00"
          - generic [ref=e50]:
            - paragraph [ref=e51]: This year
            - paragraph [ref=e52]: ₹25,600.00
            - paragraph [ref=e53]: "Reversals: ₹0.00"
          - generic [ref=e55]:
            - paragraph [ref=e56]: Outstanding dues
            - paragraph [ref=e57]: ₹0.00
            - paragraph [ref=e58]: 0 dues
          - generic [ref=e60]:
            - paragraph [ref=e61]: Expenses this month
            - paragraph [ref=e62]: ₹0.00
            - paragraph [ref=e63]: 0 expenses
          - generic [ref=e65]:
            - paragraph [ref=e66]: Net movement
            - paragraph [ref=e67]: ₹0.00
            - paragraph [ref=e68]: Net cash movement
        - generic [ref=e69]:
          - generic [ref=e70]:
            - heading "Collection trend (last 6 months)" [level=2] [ref=e72]
            - img "Collection trend for the last six months" [ref=e74]:
              - application [ref=e77]:
                - generic [ref=e92]:
                  - generic [ref=e93]:
                    - generic [ref=e94]: Jun
                    - generic [ref=e96]: Jul
                    - generic [ref=e98]: Aug
                    - generic [ref=e100]: Sept
                    - generic [ref=e102]: Oct
                    - generic [ref=e104]: Nov
                  - generic [ref=e106]:
                    - generic [ref=e107]: ₹0
                    - generic [ref=e109]: ₹7k
                    - generic [ref=e111]: ₹13k
                    - generic [ref=e113]: ₹20k
                    - generic [ref=e115]: ₹26k
          - generic [ref=e117]:
            - generic [ref=e118]:
              - heading "Outstanding dues" [level=2] [ref=e119]
              - link "View all" [ref=e120] [cursor=pointer]:
                - /url: /reports?report=dues
            - generic [ref=e121]:
              - generic [ref=e125]:
                - paragraph [ref=e126]: ₹0.00
                - paragraph [ref=e127]: 0 dues · 102 active members
              - generic [ref=e134]:
                - paragraph [ref=e135]: "102"
                - paragraph [ref=e136]: Members
              - generic [ref=e141]:
                - paragraph [ref=e142]: ₹0.00
                - paragraph [ref=e143]: Expenses this month
        - generic [ref=e144]:
          - generic [ref=e145]:
            - heading "Recent transactions" [level=2] [ref=e146]
            - link "View all" [ref=e147] [cursor=pointer]:
              - /url: /transactions
          - table [ref=e151]:
            - rowgroup [ref=e152]:
              - row [ref=e153]:
                - columnheader "Receipt no." [ref=e154]
                - columnheader "Received from" [ref=e155]
                - columnheader "Date" [ref=e156]
                - columnheader "Amount" [ref=e157]
                - columnheader "Status" [ref=e158]
            - rowgroup [ref=e159]:
              - row [ref=e160]:
                - cell [ref=e161]:
                  - link "HMA-2026-27-000053" [ref=e162] [cursor=pointer]:
                    - /url: /receipts/cmvv5t29d0001q8uf0jh1udmg
                - cell "Adam" [ref=e163]
                - cell "30-10-2026" [ref=e164]
                - cell "₹500.00" [ref=e165]
                - cell "Successful" [ref=e166]
              - row [ref=e168]:
                - cell [ref=e169]:
                  - link "HMA-2026-27-000052" [ref=e170] [cursor=pointer]:
                    - /url: /receipts/cmvut8xha000bhcufpfewkwsw
                - cell "Arif Hussain" [ref=e171]
                - cell "30-10-2026" [ref=e172]
                - cell "₹500.00" [ref=e173]
                - cell "Successful" [ref=e174]
              - row [ref=e176]:
                - cell [ref=e177]:
                  - link "HMA-2026-27-000051" [ref=e178] [cursor=pointer]:
                    - /url: /receipts/cmvuslgqw0006hcufza8z71w2
                - cell "Arif Hussain" [ref=e179]
                - cell "30-10-2026" [ref=e180]
                - cell "₹500.00" [ref=e181]
                - cell "Successful" [ref=e182]
              - row [ref=e184]:
                - cell [ref=e185]:
                  - link "HMA-2026-27-000050" [ref=e186] [cursor=pointer]:
                    - /url: /receipts/cmvus2jcz0001hcufol77znsy
                - cell "Arif Hussain" [ref=e187]
                - cell "30-10-2026" [ref=e188]
                - cell "₹500.00" [ref=e189]
                - cell "Successful" [ref=e190]
              - row [ref=e192]:
                - cell [ref=e193]:
                  - link "HMA-2026-27-000049" [ref=e194] [cursor=pointer]:
                    - /url: /receipts/cmvurm8zy000g38uff61huf8a
                - cell "Arif Hussain" [ref=e195]
                - cell "30-10-2026" [ref=e196]
                - cell "₹500.00" [ref=e197]
                - cell "Successful" [ref=e198]
              - row [ref=e200]:
                - cell [ref=e201]:
                  - link "HMA-2026-27-000048" [ref=e202] [cursor=pointer]:
                    - /url: /receipts/cmvur09ut000b38uf3179nk20
                - cell "Arif Hussain" [ref=e203]
                - cell "30-10-2026" [ref=e204]
                - cell "₹500.00" [ref=e205]
                - cell "Successful" [ref=e206]
              - row [ref=e208]:
                - cell [ref=e209]:
                  - link "HMA-2026-27-000047" [ref=e210] [cursor=pointer]:
                    - /url: /receipts/cmvuqe71z000638ufa2qsan3l
                - cell "Arif Hussain" [ref=e211]
                - cell "30-10-2026" [ref=e212]
                - cell "₹500.00" [ref=e213]
                - cell "Successful" [ref=e214]
              - row [ref=e216]:
                - cell [ref=e217]:
                  - link "HMA-2026-27-000046" [ref=e218] [cursor=pointer]:
                    - /url: /receipts/cmvuqa33w000138ufnpv1jcyu
                - cell "Arif Hussain" [ref=e219]
                - cell "30-10-2026" [ref=e220]
                - cell "₹500.00" [ref=e221]
                - cell "Successful" [ref=e222]
    - navigation "Primary" [ref=e224]:
      - link "Dashboard" [ref=e225] [cursor=pointer]:
        - /url: /dashboard
      - link "Members" [ref=e234] [cursor=pointer]:
        - /url: /members
      - link "Receive payment" [ref=e242] [cursor=pointer]:
        - /url: /collections/new
      - link "Transactions" [ref=e251] [cursor=pointer]:
        - /url: /transactions
      - link "Reports" [ref=e256] [cursor=pointer]:
        - /url: /reports
  - button "Open Next.js Dev Tools" [ref=e266] [cursor=pointer]
  - alert [ref=e270]
  - generic [aria-hidden] [ref=e271]: ₹0
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
  9   |   // Login first
  10  |   await page.goto(`${BASE_URL}/login`);
> 11  |   await page.fill('input[name="email"]', 'localadmin@gmail.com');
      |              ^ TimeoutError: page.fill: Timeout 15000ms exceeded.
  12  |   await page.fill('input[name="password"]', 'admin123');
  13  |   await page.click('button[type="submit"]');
  14  |   await page.waitForURL('**/dashboard');
  15  |   console.log('✅ Logged in successfully');
  16  | 
  17  |   // Go to new collection page
  18  |   await page.goto(`${BASE_URL}/collections/new`);
  19  |   await page.waitForTimeout(1000);
  20  |   console.log('✅ On collections/new page');
  21  | 
  22  |   // Ensure "Choose member" is selected (it should be by default, but click to ensure member search renders)
  23  |   await page.click('text=Choose member');
  24  |   await page.waitForTimeout(500);
  25  | 
  26  |   // Check if a member is already selected (input disabled with value)
  27  |   const memberSearchInput = page.locator('#member-search');
  28  |   const isDisabled = await memberSearchInput.evaluate(el => (el as HTMLInputElement).disabled);
  29  | 
  30  |   if (!isDisabled) {
  31  |     // Fill in member search - use existing member from seed data
  32  |     await page.fill('#member-search', 'Arif Hussain');
  33  |     await page.waitForTimeout(500);
  34  | 
  35  |     // Click the first matching member
  36  |     await page.click('button:has-text("Arif Hussain")');
  37  |     await page.waitForTimeout(500);
  38  |   } else {
  39  |     console.log('✅ Member already selected, proceeding...');
  40  |   }
  41  |   console.log('✅ Member selected');
  42  | 
  43  |   // Set amount
  44  |   await page.fill('input[placeholder="0"]', '500');
  45  |   await page.waitForTimeout(300);
  46  |   console.log('✅ Amount set to 500');
  47  | 
  48  |   // Select payment mode - Cash
  49  |   await page.click('button:has-text("Cash")');
  50  |   await page.waitForTimeout(300);
  51  |   console.log('✅ Payment mode: Cash');
  52  | 
  53  |   // Select purpose/category
  54  |   await page.click('button:has-text("Add Allocation")');
  55  |   await page.waitForTimeout(1000); // Wait for modal/sheet to open
  56  | 
  57  |   // Click on first available category (mobile sheet buttons don't have w-full class)
  58  |   await page.locator('button:has-text("Monthly Chanda"):not([class*="w-full"]), button:has-text("General Donation"):not([class*="w-full"]), button:has-text("Construction Fund"):not([class*="w-full"])').first().click();
  59  |   await page.waitForTimeout(300);
  60  |   console.log('✅ Purpose selected');
  61  | 
  62  |   // Fill allocation amount (required for form validation)
  63  |   await page.waitForTimeout(500);
  64  |   // Only fill the allocation input (has placeholder "0.00"), not the main amount input (placeholder "0")
  65  |   const allocationInput = page.locator('input[placeholder="0.00"]').first();
  66  |   await allocationInput.fill('500');
  67  |   await page.waitForTimeout(300);
  68  |   console.log('✅ Allocation amount set');
  69  | 
  70  |   // Set date to today
  71  |   const today = new Date().toISOString().split('T')[0];
  72  |   await page.fill('input[type="date"]', today);
  73  |   await page.waitForTimeout(300);
  74  | 
  75  |   // Wait a bit for form validation to update
  76  |   await page.waitForTimeout(1000);
  77  | 
  78  |   // Check if there are any errors
  79  |   const errorMsg = await page.locator('p[role="alert"]').textContent().catch(() => null);
  80  |   if (errorMsg) {
  81  |     console.log('Error message:', errorMsg);
  82  |   }
  83  | 
  84  |   // Click submit - try both buttons if one is disabled
  85  |   const submitBtn = page.locator('button:has-text("Confirm and issue receipt")').first();
  86  |   const submitBtnHasDisabled = await submitBtn.evaluate(el => (el as HTMLButtonElement).disabled);
  87  | 
  88  |   if (submitBtnHasDisabled) {
  89  |     console.log('Trying mobile bottom bar submit button...');
  90  |     await page.locator('button:has-text("Confirm and issue receipt")').nth(1).click();
  91  |   } else {
  92  |     await submitBtn.click();
  93  |   }
  94  |   await page.waitForTimeout(5000);
  95  |   console.log('✅ Payment submitted');
  96  | 
  97  |   // Check current URL - should redirect to receipt page
  98  |   const currentUrl = page.url();
  99  |   console.log('Current URL:', currentUrl);
  100 | 
  101 |   // Verify receipt page loaded - check for new Hindi receipt design
  102 |   await expect(page.locator('text=रसीद').first()).toBeVisible({ timeout: 15000 });
  103 |   console.log('✅ Receipt page loaded');
  104 | 
  105 |   // Get receipt number (target the receipt page element, not the preview on collection page)
  106 |   const receiptText = await page.locator('.print-sheet').locator('text=रसीद संख्या').first().textContent();
  107 |   console.log('Receipt info:', receiptText);
  108 | 
  109 |   // Get amount
  110 |   const amountText = await page.locator('.amount-value').first().textContent();
  111 |   console.log('Amount on receipt:', amountText);
```