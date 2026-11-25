# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: responsive-test.spec.ts >> Collection Page - Desktop-1920 (1920x1080)
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
    - complementary [ref=e3]:
      - navigation "Main" [ref=e4]:
        - link "Dashboard" [ref=e5] [cursor=pointer]:
          - /url: /dashboard
        - link "Members" [ref=e14] [cursor=pointer]:
          - /url: /members
        - link "Contribution plans" [ref=e22] [cursor=pointer]:
          - /url: /plans
        - link "Receive payment" [ref=e29] [cursor=pointer]:
          - /url: /collections/new
        - link "Due Status Overview" [ref=e38] [cursor=pointer]:
          - /url: /collections/due-status
        - link "Transactions" [ref=e45] [cursor=pointer]:
          - /url: /transactions
        - link "Expenses" [ref=e50] [cursor=pointer]:
          - /url: /expenses
        - link "Reports" [ref=e56] [cursor=pointer]:
          - /url: /reports
        - link "Settings" [ref=e61] [cursor=pointer]:
          - /url: /settings
        - link "Staff" [ref=e67] [cursor=pointer]:
          - /url: /staff
        - link "Audit log" [ref=e73] [cursor=pointer]:
          - /url: /audit
    - generic [ref=e79]:
      - banner [ref=e80]:
        - generic [ref=e81]:
          - generic [ref=e87]: हुसैनी मस्जिद आलोट
          - generic [ref=e88]: 25 Nov 2026
        - generic [ref=e89]:
          - generic [ref=e91]:
            - generic [ref=e92]: Language
            - generic [ref=e97]:
              - button "English" [pressed] [ref=e98]
              - button "हिन्दी" [ref=e99]
              - button "اردو" [ref=e100]
          - button "MA Masjid Admin" [ref=e102]:
            - generic [ref=e103]: MA
            - generic [ref=e104]: Masjid Admin
      - main [ref=e107]:
        - generic [ref=e108]:
          - generic [ref=e109]:
            - heading "Dashboard" [level=1] [ref=e110]
            - paragraph [ref=e111]: हुसैनी मस्जिद आलोट · This month
          - link [ref=e113] [cursor=pointer]:
            - /url: /collections/new
            - button "New payment" [ref=e114]
        - generic [ref=e121]:
          - generic [ref=e123]:
            - paragraph [ref=e124]: Today's collection
            - paragraph [ref=e125]: ₹0
            - paragraph [ref=e126]: 0 transactions
          - generic [ref=e128]:
            - paragraph [ref=e129]: This month
            - paragraph [ref=e130]: ₹65,400
            - paragraph [ref=e131]: "Gross collection: ₹65,400"
          - generic [ref=e133]:
            - paragraph [ref=e134]: This year
            - paragraph [ref=e135]: ₹65,400
            - paragraph [ref=e136]: "Reversals: ₹0"
          - generic [ref=e138]:
            - paragraph [ref=e139]: Outstanding dues
            - paragraph [ref=e140]: ₹87,200
            - paragraph [ref=e141]: 88 dues
          - generic [ref=e143]:
            - paragraph [ref=e144]: Expenses this month
            - paragraph [ref=e145]: ₹0
            - paragraph [ref=e146]: 0 expenses
          - generic [ref=e148]:
            - paragraph [ref=e149]: Net movement
            - paragraph [ref=e150]: ₹65,400
            - paragraph [ref=e151]: Net cash movement
        - generic [ref=e152]:
          - generic [ref=e153]:
            - heading "Collection trend (last 6 months)" [level=2] [ref=e155]
            - img "Collection trend for the last six months" [ref=e157]:
              - application [ref=e160]:
                - generic [ref=e175]:
                  - generic [ref=e176]:
                    - generic [ref=e177]: Jun
                    - generic [ref=e179]: Jul
                    - generic [ref=e181]: Aug
                    - generic [ref=e183]: Sept
                    - generic [ref=e185]: Oct
                    - generic [ref=e187]: Nov
                  - generic [ref=e189]:
                    - generic [ref=e190]: ₹0
                    - generic [ref=e192]: ₹20k
                    - generic [ref=e194]: ₹40k
                    - generic [ref=e196]: ₹60k
                    - generic [ref=e198]: ₹80k
          - generic [ref=e200]:
            - generic [ref=e201]:
              - heading "Outstanding dues" [level=2] [ref=e202]
              - link "View all" [ref=e203] [cursor=pointer]:
                - /url: /reports?report=dues
            - generic [ref=e204]:
              - generic [ref=e208]:
                - paragraph [ref=e209]: ₹87,200
                - paragraph [ref=e210]: 88 dues · 70 active members
              - generic [ref=e217]:
                - paragraph [ref=e218]: "70"
                - paragraph [ref=e219]: Members
              - generic [ref=e224]:
                - paragraph [ref=e225]: ₹0
                - paragraph [ref=e226]: Expenses this month
        - generic [ref=e227]:
          - generic [ref=e228]:
            - heading "Recent transactions" [level=2] [ref=e229]
            - link "View all" [ref=e230] [cursor=pointer]:
              - /url: /transactions
          - table [ref=e234]:
            - rowgroup [ref=e235]:
              - row [ref=e236]:
                - columnheader "Receipt no." [ref=e237]
                - columnheader "Received from" [ref=e238]
                - columnheader "Date" [ref=e239]
                - columnheader "Amount" [ref=e240]
                - columnheader "Status" [ref=e241]
            - rowgroup [ref=e242]:
              - row [ref=e243]:
                - cell [ref=e244]:
                  - link "HMA-2026-27-000174" [ref=e245] [cursor=pointer]:
                    - /url: /receipts/cmwuxne7g001g7wufw3g0wpiv
                - cell "Arif Hussain" [ref=e246]
                - cell "24-11-2026" [ref=e247]
                - cell "₹250" [ref=e248]
                - cell "Successful" [ref=e249]
              - row [ref=e251]:
                - cell [ref=e252]:
                  - link "HMA-2026-27-000173" [ref=e253] [cursor=pointer]:
                    - /url: /receipts/cmwtfyb5f0003usuf8bqiskfs
                - cell "Arif Hussain" [ref=e254]
                - cell "23-11-2026" [ref=e255]
                - cell "₹500" [ref=e256]
                - cell "Successful" [ref=e257]
              - row [ref=e259]:
                - cell [ref=e260]:
                  - link "HMA-2026-27-000172" [ref=e261] [cursor=pointer]:
                    - /url: /receipts/cmwmzg571000di8uf9eofo9gw
                - cell "Arif Hussain" [ref=e262]
                - cell "19-11-2026" [ref=e263]
                - cell "₹50" [ref=e264]
                - cell "Successful" [ref=e265]
              - row [ref=e267]:
                - cell [ref=e268]:
                  - link "HMA-2026-27-000171" [ref=e269] [cursor=pointer]:
                    - /url: /receipts/cmwkz6ez800iwxgufc47dr3ti
                - cell "Gullu Chacha Vikramgarh" [ref=e270]
                - cell "17-11-2026" [ref=e271]
                - cell "₹100" [ref=e272]
                - cell "Successful" [ref=e273]
              - row [ref=e275]:
                - cell [ref=e276]:
                  - link "HMA-2026-27-000170" [ref=e277] [cursor=pointer]:
                    - /url: /receipts/cmwkl4nrd000600ufix316ghg
                - cell "Chunna Bhai Alote" [ref=e278]
                - cell "17-11-2026" [ref=e279]
                - cell "₹150" [ref=e280]
                - cell "Successful" [ref=e281]
              - row [ref=e283]:
                - cell [ref=e284]:
                  - link "HMA-2026-27-000169" [ref=e285] [cursor=pointer]:
                    - /url: /receipts/cmwjl3ysd004z6oufwjkrqm0r
                - cell "Walkin Receipt Test" [ref=e286]
                - cell "16-11-2026" [ref=e287]
                - cell "₹300" [ref=e288]
                - cell "Successful" [ref=e289]
              - row [ref=e291]:
                - cell [ref=e292]:
                  - link "HMA-2026-27-000168" [ref=e293] [cursor=pointer]:
                    - /url: /receipts/cmwjl37qp004u6oufmcyryqh9
                - cell "Walkin General Test" [ref=e294]
                - cell "16-11-2026" [ref=e295]
                - cell "₹500" [ref=e296]
                - cell "Successful" [ref=e297]
              - row [ref=e299]:
                - cell [ref=e300]:
                  - link "HMA-2026-27-000167" [ref=e301] [cursor=pointer]:
                    - /url: /receipts/cmwjh378k003j6oufsj1ayojs
                - cell "Fatima Khan" [ref=e302]
                - cell "16-11-2026" [ref=e303]
                - cell "₹300" [ref=e304]
                - cell "Successful" [ref=e305]
  - button "Open Next.js Dev Tools" [ref=e312] [cursor=pointer]
  - alert [ref=e316]
  - generic [aria-hidden] [ref=e317]: ₹0
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