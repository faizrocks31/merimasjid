# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: monthly-chanda-payment-flow.spec.ts >> Phase 8: Monthly Chanda Payment Flow >> Complete Monthly Chanda workflow: dues generation, payment collection, verification
- Location: e2e\monthly-chanda-payment-flow.spec.ts:178:7

# Error details

```
Error: page.setViewportSize: Target page, context or browser has been closed
```

# Test source

```ts
  79  |   if (!monthlyChandaDef.defaultAmountPaise || monthlyChandaDef.defaultAmountPaise <= 0) {
  80  |     throw new Error("Failed to set default amount for Monthly Chanda");
  81  |   }
  82  |   console.log(`✓ Monthly Chanda definition ready: ${monthlyChandaDef.id} (defaultAmount: ₹${monthlyChandaDef.defaultAmountPaise! / 100})`);
  83  | 
  84  |   // 3. Create Member A
  85  |   let memberA = await prisma.member.findFirst({ where: { masjidId: masjid.id, fullName: TEST_MEMBER_A_NAME } });
  86  |   if (!memberA) {
  87  |     const seq = await prisma.memberSequence.upsert({
  88  |       where: { masjidId: masjid.id },
  89  |       update: { lastNumber: { increment: 1 } },
  90  |       create: { masjidId: masjid.id, lastNumber: 1 },
  91  |     });
  92  |     memberA = await prisma.member.create({
  93  |       data: {
  94  |         masjidId: masjid.id,
  95  |         memberNo: `MCA-${seq.lastNumber}`,
  96  |         fullName: TEST_MEMBER_A_NAME,
  97  |         phone: `+919876543210`,
  98  |         status: "ACTIVE",
  99  |         joinDate: new Date("2025-01-01"),
  100 |       },
  101 |     });
  102 |     console.log(`✓ Created Member A: ${memberA.fullName} (${memberA.id}, memberNo: ${memberA.memberNo})`);
  103 |   } else {
  104 |     console.log(`• Member A already exists: ${memberA.fullName} (${memberA.id})`);
  105 |   }
  106 | 
  107 |   // 4. Create Member B
  108 |   let memberB = await prisma.member.findFirst({ where: { masjidId: masjid.id, fullName: TEST_MEMBER_B_NAME } });
  109 |   if (!memberB) {
  110 |     const seq = await prisma.memberSequence.upsert({
  111 |       where: { masjidId: masjid.id },
  112 |       update: { lastNumber: { increment: 1 } },
  113 |       create: { masjidId: masjid.id, lastNumber: 1 },
  114 |     });
  115 |     memberB = await prisma.member.create({
  116 |       data: {
  117 |         masjidId: masjid.id,
  118 |         memberNo: `MCB-${seq.lastNumber}`,
  119 |         fullName: TEST_MEMBER_B_NAME,
  120 |         phone: `+919876543211`,
  121 |         status: "ACTIVE",
  122 |         joinDate: new Date("2025-01-01"),
  123 |       },
  124 |     });
  125 |     console.log(`✓ Created Member B: ${memberB.fullName} (${memberB.id}, memberNo: ${memberB.memberNo})`);
  126 |   } else {
  127 |     console.log(`• Member B already exists: ${memberB.fullName} (${memberB.id})`);
  128 |   }
  129 | 
  130 |   // 5. Clean up any existing dues periods for this category and these members
  131 |   await prisma.duesPeriod.deleteMany({
  132 |     where: {
  133 |       collectionDefinitionId: monthlyChandaDef.id,
  134 |     },
  135 |   });
  136 |   // Also clean up any payments for these members
  137 |   await prisma.payment.deleteMany({
  138 |     where: {
  139 |       masjidId: masjid.id,
  140 |       donorMemberId: { in: [memberA.id, memberB.id] },
  141 |     },
  142 |   });
  143 |   await prisma.paymentAllocation.deleteMany({
  144 |     where: {
  145 |       masjidId: masjid.id,
  146 |       payment: { donorMemberId: { in: [memberA.id, memberB.id] } },
  147 |     },
  148 |   });
  149 |   console.log(`✓ Cleaned up existing dues periods and payments for test members`);
  150 | 
  151 |   testData = { masjid, monthlyChandaDef, memberA, memberB };
  152 |   return testData;
  153 | }
  154 | 
  155 | async function cleanupTestData() {
  156 |   console.log("\n=== Cleaning up test data ===");
  157 |   if (testData.memberA && testData.memberB) {
  158 |     await prisma.duesPeriod.deleteMany({ where: { memberId: { in: [testData.memberA.id, testData.memberB.id] } } }).catch(() => {});
  159 |     await prisma.paymentAllocation.deleteMany({ where: { masjidId: testData.masjid.id, payment: { donorMemberId: { in: [testData.memberA.id, testData.memberB.id] } } } }).catch(() => {});
  160 |     await prisma.payment.deleteMany({ where: { masjidId: testData.masjid.id, donorMemberId: { in: [testData.memberA.id, testData.memberB.id] } } }).catch(() => {});
  161 |     await prisma.member.deleteMany({ where: { id: { in: [testData.memberA.id, testData.memberB.id] } } }).catch(() => {});
  162 |   }
  163 |   console.log("✓ Cleanup complete");
  164 | }
  165 | 
  166 | test.describe.configure({ retries: 0 });
  167 | 
  168 | test.describe("Phase 8: Monthly Chanda Payment Flow", () => {
  169 |   test.beforeAll(async () => {
  170 |     await setupTestData();
  171 |   });
  172 | 
  173 |   test.afterAll(async () => {
  174 |     await cleanupTestData();
  175 |     await prisma.$disconnect();
  176 |   });
  177 | 
  178 |   // ─── Main Test: Complete Monthly Chanda Workflow ───
> 179 |   test("Complete Monthly Chanda workflow: dues generation, payment collection, verification", async ({ page }) => {
      |                ^ Error: page.setViewportSize: Target page, context or browser has been closed
  180 |     await page.setViewportSize({ width: 1440, height: 900 });
  181 | 
  182 |     // ═══ STEP 1: Navigate to Due Generation Wizard ═══
  183 |     console.log("\n📋 STEP 1: Navigate to Due Generation Wizard");
  184 |     await page.goto("/collections/generate");
  185 |     await page.waitForLoadState("networkidle");
  186 |     await expect(page.locator("text=Generate due periods")).toBeVisible({ timeout: 15000 });
  187 |     console.log("✅ Due Generation Wizard page loaded");
  188 | 
  189 |     // ═══ STEP 2: Step 1 - Select Monthly Chanda category ═══
  190 |     console.log("\n📋 STEP 2: Select Monthly Chanda category (Step 1 of wizard)");
  191 |     await page.click('button:has-text("Monthly Chanda")');
  192 |     await page.waitForTimeout(500);
  193 | 
  194 |     // Click Next to go to Step 2
  195 |     await page.click('button:has-text("Next")');
  196 |     await page.waitForTimeout(500);
  197 |     console.log("✅ Monthly Chanda selected, moved to Step 2");
  198 | 
  199 |     // ═══ STEP 3: Step 2 - Verify Generation Mode ═══
  200 |     console.log("\n📋 STEP 3: Verify generation mode (Step 2 of wizard)");
  201 |     await expect(page.getByRole('heading', { name: 'Generation Mode' })).toBeVisible();
  202 | 
  203 |     // Monthly Chanda should have AUTOMATIC as current mode
  204 |     await expect(page.getByRole('button', { name: 'Automatic' })).toBeVisible();
  205 |     console.log("✅ Generation mode confirmed");
  206 | 
  207 |     // Click Next to go to Step 3
  208 |     await page.click('button:has-text("Next")');
  209 |     await page.waitForTimeout(500);
  210 |     console.log("✅ Moved to Step 3");
  211 | 
  212 |     // ═══ STEP 4: Step 3 - Set date range to next 12 months ═══
  213 |     console.log("\n📋 STEP 4: Set date range to next 12 months (Step 3 of wizard)");
  214 |     await expect(page.getByRole('heading', { name: 'Date Range' })).toBeVisible();
  215 | 
  216 |     // Set from date to next month and to date to 12 months from now
  217 |     // The wizard uses type="date" inputs - use local date format to avoid timezone issues
  218 |     const today = new Date();
  219 |     const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  220 |     const twelveMonthsLater = new Date(today.getFullYear(), today.getMonth() + 12, 1);
  221 | 
  222 |     // Format as YYYY-MM-DD in local time (not UTC) for HTML date inputs
  223 |     const fromDateStr = nextMonth.toLocaleDateString('en-CA'); // YYYY-MM-DD
  224 |     const toDateStr = twelveMonthsLater.toLocaleDateString('en-CA'); // YYYY-MM-DD
  225 | 
  226 |     await page.fill('input[type="date"] >> nth=0', fromDateStr);
  227 |     await page.fill('input[type="date"] >> nth=1', toDateStr);
  228 |     await page.waitForTimeout(300);
  229 |     console.log(`✅ Date range set to ${fromDateStr} to ${toDateStr}`);
  230 | 
  231 |     // Click Next to go to Step 4
  232 |     await page.click('button:has-text("Next")');
  233 |     await page.waitForTimeout(500);
  234 |     console.log("✅ Moved to Step 4");
  235 | 
  236 |     // ═══ STEP 5: Step 4 - Verify ALL_ELIGIBLE ═══
  237 |     console.log("\n📋 STEP 5: Verify member selection mode (Step 4 of wizard)");
  238 |     await expect(page.getByRole('heading', { name: 'Select Members' })).toBeVisible();
  239 | 
  240 |     // Monthly Chanda uses ALL_ELIGIBLE - click the "All Eligible Members" option
  241 |     await page.click('button:has-text("All Eligible Members")');
  242 |     await page.waitForTimeout(500);
  243 |     console.log("✅ ALL_ELIGIBLE mode selected");
  244 | 
  245 |     // Click Review to go to Step 5 (it's "Review" on this step, not "Next")
  246 |     await page.click('button:has-text("Review")');
  247 |     await page.waitForTimeout(500);
  248 |     console.log("✅ Moved to Step 5");
  249 | 
  250 |     // ═══ STEP 6: Step 5 - Review and Generate ═══
  251 |     console.log("\n📋 STEP 6: Review and generate dues (Step 5 of wizard)");
  252 |     await expect(page.getByRole('heading', { name: 'Review' })).toBeVisible();
  253 | 
  254 |     // Verify summary - check category name and mode
  255 |     await expect(page.locator("text=Monthly Chanda")).toBeVisible();
  256 |     await expect(page.locator("text=AUTOMATIC")).toBeVisible();
  257 |     // Note: dates will show the dynamic from/to dates, not hardcoded 2026-01-01
  258 |     console.log("✅ Review summary verified");
  259 | 
  260 |     // Click Generate
  261 |     await page.click('button:has-text("Generate Dues")');
  262 |     console.log("✅ Generate clicked, waiting for completion...");
  263 | 
  264 |     // Wait for generation to complete - wait for the success result section
  265 |     // The success state shows a checkmark and "Success" heading
  266 |     // First check for any error message
  267 |     let errorMsg = null;
  268 |     try {
  269 |       errorMsg = await page.locator('p[role="alert"]').textContent({ timeout: 10000 });
  270 |       if (errorMsg) {
  271 |         console.log("❌ Generation error:", errorMsg);
  272 |       }
  273 |     } catch {
  274 |       // No error message
  275 |     }
  276 | 
  277 |     // Also check for any toast or error notification
  278 |     try {
  279 |       const toastError = await page.locator('[role="status"], [role="alert"], .toast').first().textContent({ timeout: 5000 });
```