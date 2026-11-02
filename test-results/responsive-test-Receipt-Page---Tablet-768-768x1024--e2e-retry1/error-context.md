# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: responsive-test.spec.ts >> Receipt Page - Tablet-768 (768x1024)
- Location: e2e\responsive-test.spec.ts:67:7

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
          - button "MA Masjid Admin" [ref=e20]:
            - generic [ref=e21]: MA
            - generic [ref=e22]: Masjid Admin
      - main [ref=e25]:
        - generic [ref=e26]:
          - generic [ref=e27]:
            - heading "Dashboard" [level=1] [ref=e28]
            - paragraph [ref=e29]: हुसैनी मस्जिद आलोट · This month
          - link [ref=e31] [cursor=pointer]:
            - /url: /collections/new
            - button "New payment" [ref=e32]
        - generic [ref=e39]:
          - generic [ref=e41]:
            - paragraph [ref=e42]: Today's collection
            - paragraph [ref=e43]: ₹0.00
            - paragraph [ref=e44]: 0 transactions
          - generic [ref=e46]:
            - paragraph [ref=e47]: This month
            - paragraph [ref=e48]: ₹0.00
            - paragraph [ref=e49]: "Gross collection: ₹0.00"
          - generic [ref=e51]:
            - paragraph [ref=e52]: This year
            - paragraph [ref=e53]: ₹25,600.00
            - paragraph [ref=e54]: "Reversals: ₹0.00"
          - generic [ref=e56]:
            - paragraph [ref=e57]: Outstanding dues
            - paragraph [ref=e58]: ₹0.00
            - paragraph [ref=e59]: 0 dues
          - generic [ref=e61]:
            - paragraph [ref=e62]: Expenses this month
            - paragraph [ref=e63]: ₹0.00
            - paragraph [ref=e64]: 0 expenses
          - generic [ref=e66]:
            - paragraph [ref=e67]: Net movement
            - paragraph [ref=e68]: ₹0.00
            - paragraph [ref=e69]: Net cash movement
        - generic [ref=e70]:
          - generic [ref=e71]:
            - heading "Collection trend (last 6 months)" [level=2] [ref=e73]
            - img "Collection trend for the last six months" [ref=e75]:
              - application [ref=e78]:
                - generic [ref=e93]:
                  - generic [ref=e94]:
                    - generic [ref=e95]: Jun
                    - generic [ref=e97]: Jul
                    - generic [ref=e99]: Aug
                    - generic [ref=e101]: Sept
                    - generic [ref=e103]: Oct
                    - generic [ref=e105]: Nov
                  - generic [ref=e107]:
                    - generic [ref=e108]: ₹0
                    - generic [ref=e110]: ₹7k
                    - generic [ref=e112]: ₹13k
                    - generic [ref=e114]: ₹20k
                    - generic [ref=e116]: ₹26k
          - generic [ref=e118]:
            - generic [ref=e119]:
              - heading "Outstanding dues" [level=2] [ref=e120]
              - link "View all" [ref=e121] [cursor=pointer]:
                - /url: /reports?report=dues
            - generic [ref=e122]:
              - generic [ref=e126]:
                - paragraph [ref=e127]: ₹0.00
                - paragraph [ref=e128]: 0 dues · 102 active members
              - generic [ref=e135]:
                - paragraph [ref=e136]: "102"
                - paragraph [ref=e137]: Members
              - generic [ref=e142]:
                - paragraph [ref=e143]: ₹0.00
                - paragraph [ref=e144]: Expenses this month
        - generic [ref=e145]:
          - generic [ref=e146]:
            - heading "Recent transactions" [level=2] [ref=e147]
            - link "View all" [ref=e148] [cursor=pointer]:
              - /url: /transactions
          - table [ref=e152]:
            - rowgroup [ref=e153]:
              - row [ref=e154]:
                - columnheader "Receipt no." [ref=e155]
                - columnheader "Received from" [ref=e156]
                - columnheader "Date" [ref=e157]
                - columnheader "Amount" [ref=e158]
                - columnheader "Status" [ref=e159]
            - rowgroup [ref=e160]:
              - row [ref=e161]:
                - cell [ref=e162]:
                  - link "HMA-2026-27-000053" [ref=e163] [cursor=pointer]:
                    - /url: /receipts/cmvv5t29d0001q8uf0jh1udmg
                - cell "Adam" [ref=e164]
                - cell "30-10-2026" [ref=e165]
                - cell "₹500.00" [ref=e166]
                - cell "Successful" [ref=e167]
              - row [ref=e169]:
                - cell [ref=e170]:
                  - link "HMA-2026-27-000052" [ref=e171] [cursor=pointer]:
                    - /url: /receipts/cmvut8xha000bhcufpfewkwsw
                - cell "Arif Hussain" [ref=e172]
                - cell "30-10-2026" [ref=e173]
                - cell "₹500.00" [ref=e174]
                - cell "Successful" [ref=e175]
              - row [ref=e177]:
                - cell [ref=e178]:
                  - link "HMA-2026-27-000051" [ref=e179] [cursor=pointer]:
                    - /url: /receipts/cmvuslgqw0006hcufza8z71w2
                - cell "Arif Hussain" [ref=e180]
                - cell "30-10-2026" [ref=e181]
                - cell "₹500.00" [ref=e182]
                - cell "Successful" [ref=e183]
              - row [ref=e185]:
                - cell [ref=e186]:
                  - link "HMA-2026-27-000050" [ref=e187] [cursor=pointer]:
                    - /url: /receipts/cmvus2jcz0001hcufol77znsy
                - cell "Arif Hussain" [ref=e188]
                - cell "30-10-2026" [ref=e189]
                - cell "₹500.00" [ref=e190]
                - cell "Successful" [ref=e191]
              - row [ref=e193]:
                - cell [ref=e194]:
                  - link "HMA-2026-27-000049" [ref=e195] [cursor=pointer]:
                    - /url: /receipts/cmvurm8zy000g38uff61huf8a
                - cell "Arif Hussain" [ref=e196]
                - cell "30-10-2026" [ref=e197]
                - cell "₹500.00" [ref=e198]
                - cell "Successful" [ref=e199]
              - row [ref=e201]:
                - cell [ref=e202]:
                  - link "HMA-2026-27-000048" [ref=e203] [cursor=pointer]:
                    - /url: /receipts/cmvur09ut000b38uf3179nk20
                - cell "Arif Hussain" [ref=e204]
                - cell "30-10-2026" [ref=e205]
                - cell "₹500.00" [ref=e206]
                - cell "Successful" [ref=e207]
              - row [ref=e209]:
                - cell [ref=e210]:
                  - link "HMA-2026-27-000047" [ref=e211] [cursor=pointer]:
                    - /url: /receipts/cmvuqe71z000638ufa2qsan3l
                - cell "Arif Hussain" [ref=e212]
                - cell "30-10-2026" [ref=e213]
                - cell "₹500.00" [ref=e214]
                - cell "Successful" [ref=e215]
              - row [ref=e217]:
                - cell [ref=e218]:
                  - link "HMA-2026-27-000046" [ref=e219] [cursor=pointer]:
                    - /url: /receipts/cmvuqa33w000138ufnpv1jcyu
                - cell "Arif Hussain" [ref=e220]
                - cell "30-10-2026" [ref=e221]
                - cell "₹500.00" [ref=e222]
                - cell "Successful" [ref=e223]
    - navigation "Primary" [ref=e225]:
      - link "Dashboard" [ref=e226] [cursor=pointer]:
        - /url: /dashboard
      - link "Members" [ref=e235] [cursor=pointer]:
        - /url: /members
      - link "Receive payment" [ref=e243] [cursor=pointer]:
        - /url: /collections/new
      - link "Transactions" [ref=e252] [cursor=pointer]:
        - /url: /transactions
      - link "Reports" [ref=e257] [cursor=pointer]:
        - /url: /reports
  - button "Open Next.js Dev Tools" [ref=e267] [cursor=pointer]
  - alert [ref=e271]
  - generic [aria-hidden] [ref=e272]: ₹0
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