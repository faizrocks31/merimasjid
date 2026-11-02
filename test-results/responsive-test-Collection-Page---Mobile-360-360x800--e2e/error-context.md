# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: responsive-test.spec.ts >> Collection Page - Mobile-360 (360x800)
- Location: e2e\responsive-test.spec.ts:22:7

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
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | const BASE_URL = 'http://localhost:3000';
  4  | 
  5  | const VIEWPORTS = [
  6  |   { name: 'Mobile-360', width: 360, height: 800 },
  7  |   { name: 'Mobile-390', width: 390, height: 844 },
  8  |   { name: 'Tablet-768', width: 768, height: 1024 },
  9  |   { name: 'Laptop-1366', width: 1366, height: 768 },
  10 |   { name: 'Desktop-1920', width: 1920, height: 1080 },
  11 | ];
  12 | 
  13 | async function login(page: any) {
  14 |   await page.goto(`${BASE_URL}/login`);
> 15 |   await page.fill('input[name="email"]', 'localadmin@gmail.com');
     |              ^ TimeoutError: page.fill: Timeout 15000ms exceeded.
  16 |   await page.fill('input[name="password"]', 'admin123');
  17 |   await page.click('button[type="submit"]');
  18 |   await page.waitForURL('**/dashboard');
  19 | }
  20 | 
  21 | for (const vp of VIEWPORTS) {
  22 |   test(`Collection Page - ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
  23 |     await page.setViewportSize({ width: vp.width, height: vp.height });
  24 |     await login(page);
  25 | 
  26 |     await page.goto(`${BASE_URL}/collections/new`);
  27 |     await page.waitForTimeout(1500);
  28 | 
  29 |     // Check horizontal overflow
  30 |     const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  31 |     const viewportWidth = vp.width;
  32 |     const hasHorizontalOverflow = bodyWidth > viewportWidth + 10;
  33 |     console.log(`${vp.name}: Body ${bodyWidth}px vs Viewport ${viewportWidth}px - Overflow: ${hasHorizontalOverflow}`);
  34 | 
  35 |     // Check receipt preview visibility
  36 |     if (vp.width < 1024) {
  37 |       const bottomBar = page.locator('.sticky.bottom-0').first();
  38 |       await expect(bottomBar).toBeVisible({ timeout: 5000 });
  39 |     } else {
  40 |       const preview = page.locator('.sticky.top-6 .print-sheet').first();
  41 |       await expect(preview).toBeVisible({ timeout: 5000 });
  42 |     }
  43 | 
  44 |     // Check Add Allocation button
  45 |     const addAllocBtn = page.locator('button:has-text("Add Allocation")').first();
  46 |     await expect(addAllocBtn).toBeVisible({ timeout: 5000 });
  47 | 
  48 |     // Test Add Allocation sheet opens - desktop uses popover, mobile/tablet uses BottomSheet
  49 |     await addAllocBtn.click();
  50 |     await page.waitForTimeout(500);
  51 |     if (vp.width < 1024) {
  52 |       // Mobile/Tablet: BottomSheet (2nd dialog to skip Next.js error overlay)
  53 |       const sheet = page.locator('[role="dialog"].fixed.inset-0.z-50').nth(1);
  54 |       await expect(sheet).toBeVisible({ timeout: 5000 });
  55 |     } else {
  56 |       // Desktop: Popover (fixed positioned near button, has w-72 class)
  57 |       const popover = page.locator('.fixed.z-50 .w-72.max-h-60').first();
  58 |       await expect(popover).toBeVisible({ timeout: 5000 });
  59 |     }
  60 | 
  61 |     // Screenshot
  62 |     await page.screenshot({ path: `test-results/collection-${vp.name}.png`, fullPage: true });
  63 |   });
  64 | }
  65 | 
  66 | for (const vp of VIEWPORTS) {
  67 |   test(`Receipt Page - ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
  68 |     await page.setViewportSize({ width: vp.width, height: vp.height });
  69 |     await login(page);
  70 | 
  71 |     // Use existing receipt
  72 |     const receiptUrl = `${BASE_URL}/receipts/cmvujtnn8000lg8ufyl4li5ua?issued=1`;
  73 |     await page.goto(receiptUrl);
  74 |     await page.waitForTimeout(1500);
  75 | 
  76 |     const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  77 |     const viewportWidth = vp.width;
  78 |     const hasHorizontalOverflow = bodyWidth > viewportWidth + 10;
  79 |     console.log(`${vp.name} Receipt: Body ${bodyWidth}px vs Viewport ${viewportWidth}px - Overflow: ${hasHorizontalOverflow}`);
  80 | 
  81 |     // Check receipt is visible
  82 |     const receiptSheet = page.locator('.print-sheet').first();
  83 |     await expect(receiptSheet).toBeVisible({ timeout: 10000 });
  84 | 
  85 |     // Screenshot
  86 |     await page.screenshot({ path: `test-results/receipt-${vp.name}.png`, fullPage: true });
  87 |   });
  88 | }
  89 | 
```