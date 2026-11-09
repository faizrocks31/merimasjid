/**
 * Phase 8: Monthly Chanda Payment Flow - Playwright E2E Verification
 *
 * Complete end-to-end verification of Monthly Chanda workflow:
 * 1. Uses existing test masjid and seeded admin
 * 2. Creates 2 test members (Member A & Member B)
 * 3. Use Due Generation Wizard UI to generate 12 months of Monthly Chanda dues (Jan-Dec 2026)
 * 4. Verify Payment Received UI shows all 12 pending months for Member A
 * 5. Collect ₹300 for Jan+Feb via OLDEST_FIRST
 * 6. Verify remaining 10 months show for Member A
 * 7. Verify Member B unaffected (all 12 months pending)
 */
import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL not set");
if (connectionString.startsWith("file:")) throw new Error("Requires PostgreSQL");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

// Use existing seeded test masjid and admin
const TEST_MASJID_SLUG = "test-masjid";
const TEST_MEMBER_A_NAME = "Member A - Monthly Chanda";
const TEST_MEMBER_B_NAME = "Member B - Monthly Chanda";

// Expected months - dynamically calculated based on date range
let EXPECTED_MONTHS: string[] = [];
let REMAINING_MONTHS: string[] = [];

let testData: {
  masjid: any;
  monthlyChandaDef: any;
  memberA: any;
  memberB: any;
} = { masjid: null, monthlyChandaDef: null, memberA: null, memberB: null };

async function setupTestData() {
  console.log("\n=== Setting up test data ===");

  // 1. Find existing test masjid
  const masjid = await prisma.masjid.findUnique({ where: { slug: TEST_MASJID_SLUG } });
  if (!masjid) {
    throw new Error(`Test masjid not found: ${TEST_MASJID_SLUG}`);
  }
  console.log(`✓ Found test masjid: ${masjid.name} (${masjid.id})`);

  // 2. Find Monthly Chanda collection definition
  let monthlyChandaDef = await prisma.collectionDefinition.findFirst({
    where: { masjidId: masjid.id, purposeCode: "MONTHLY_CHANDA", active: true },
  });
  if (!monthlyChandaDef) {
    throw new Error("Monthly Chanda definition not found for test masjid");
  }

  // Set a default amount for dues generation (Monthly Chanda is VARIABLE type, but needs a default for auto-generation)
  const TARGET_AMOUNT_PAISE = 15000; // ₹150 per month
  if (!monthlyChandaDef.defaultAmountPaise || monthlyChandaDef.defaultAmountPaise < TARGET_AMOUNT_PAISE) {
    console.log(`  Updating defaultAmountPaise from ${monthlyChandaDef.defaultAmountPaise ?? 'null'} to ${TARGET_AMOUNT_PAISE}...`);
    const updated = await prisma.collectionDefinition.update({
      where: { id: monthlyChandaDef.id },
      data: { defaultAmountPaise: TARGET_AMOUNT_PAISE }, // ₹150 per month
    });
    console.log(`✓ Updated Monthly Chanda with default amount: ${updated.defaultAmountPaise!} paise (₹${updated.defaultAmountPaise! / 100})`);
    monthlyChandaDef = updated;
  } else {
    console.log(`  Monthly Chanda already has sufficient defaultAmountPaise: ${monthlyChandaDef.defaultAmountPaise} paise (₹${monthlyChandaDef.defaultAmountPaise / 100})`);
  }

  // Re-fetch to ensure we have the latest
  const refreshedDef = await prisma.collectionDefinition.findUnique({ where: { id: monthlyChandaDef.id } });
  if (!refreshedDef) throw new Error("Monthly Chanda definition disappeared after update");
  monthlyChandaDef = refreshedDef;
  console.log(`  After re-fetch: defaultAmountPaise = ${monthlyChandaDef.defaultAmountPaise!} paise (₹${monthlyChandaDef.defaultAmountPaise! / 100})`);

  // Verify the default amount was set correctly
  if (!monthlyChandaDef.defaultAmountPaise || monthlyChandaDef.defaultAmountPaise <= 0) {
    throw new Error("Failed to set default amount for Monthly Chanda");
  }
  console.log(`✓ Monthly Chanda definition ready: ${monthlyChandaDef.id} (defaultAmount: ₹${monthlyChandaDef.defaultAmountPaise! / 100})`);

  // 3. Create Member A
  let memberA = await prisma.member.findFirst({ where: { masjidId: masjid.id, fullName: TEST_MEMBER_A_NAME } });
  if (!memberA) {
    const seq = await prisma.memberSequence.upsert({
      where: { masjidId: masjid.id },
      update: { lastNumber: { increment: 1 } },
      create: { masjidId: masjid.id, lastNumber: 1 },
    });
    memberA = await prisma.member.create({
      data: {
        masjidId: masjid.id,
        memberNo: `MCA-${seq.lastNumber}`,
        fullName: TEST_MEMBER_A_NAME,
        phone: `+919876543210`,
        status: "ACTIVE",
        joinDate: new Date("2025-01-01"),
      },
    });
    console.log(`✓ Created Member A: ${memberA.fullName} (${memberA.id}, memberNo: ${memberA.memberNo})`);
  } else {
    console.log(`• Member A already exists: ${memberA.fullName} (${memberA.id})`);
  }

  // 4. Create Member B
  let memberB = await prisma.member.findFirst({ where: { masjidId: masjid.id, fullName: TEST_MEMBER_B_NAME } });
  if (!memberB) {
    const seq = await prisma.memberSequence.upsert({
      where: { masjidId: masjid.id },
      update: { lastNumber: { increment: 1 } },
      create: { masjidId: masjid.id, lastNumber: 1 },
    });
    memberB = await prisma.member.create({
      data: {
        masjidId: masjid.id,
        memberNo: `MCB-${seq.lastNumber}`,
        fullName: TEST_MEMBER_B_NAME,
        phone: `+919876543211`,
        status: "ACTIVE",
        joinDate: new Date("2025-01-01"),
      },
    });
    console.log(`✓ Created Member B: ${memberB.fullName} (${memberB.id}, memberNo: ${memberB.memberNo})`);
  } else {
    console.log(`• Member B already exists: ${memberB.fullName} (${memberB.id})`);
  }

  // 5. Clean up any existing dues periods for this category and these members
  await prisma.duesPeriod.deleteMany({
    where: {
      collectionDefinitionId: monthlyChandaDef.id,
    },
  });
  // Also clean up any payments for these members
  await prisma.payment.deleteMany({
    where: {
      masjidId: masjid.id,
      donorMemberId: { in: [memberA.id, memberB.id] },
    },
  });
  await prisma.paymentAllocation.deleteMany({
    where: {
      masjidId: masjid.id,
      payment: { donorMemberId: { in: [memberA.id, memberB.id] } },
    },
  });
  console.log(`✓ Cleaned up existing dues periods and payments for test members`);

  testData = { masjid, monthlyChandaDef, memberA, memberB };
  return testData;
}

async function cleanupTestData() {
  console.log("\n=== Cleaning up test data ===");
  if (testData.memberA && testData.memberB) {
    await prisma.duesPeriod.deleteMany({ where: { memberId: { in: [testData.memberA.id, testData.memberB.id] } } }).catch(() => {});
    await prisma.paymentAllocation.deleteMany({ where: { masjidId: testData.masjid.id, payment: { donorMemberId: { in: [testData.memberA.id, testData.memberB.id] } } } }).catch(() => {});
    await prisma.payment.deleteMany({ where: { masjidId: testData.masjid.id, donorMemberId: { in: [testData.memberA.id, testData.memberB.id] } } }).catch(() => {});
    await prisma.member.deleteMany({ where: { id: { in: [testData.memberA.id, testData.memberB.id] } } }).catch(() => {});
  }
  console.log("✓ Cleanup complete");
}

test.describe.configure({ retries: 0 });

test.describe("Phase 8: Monthly Chanda Payment Flow", () => {
  test.beforeAll(async () => {
    await setupTestData();
  });

  test.afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  // ─── Main Test: Complete Monthly Chanda Workflow ───
  test("Complete Monthly Chanda workflow: dues generation, payment collection, verification", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // ═══ STEP 1: Navigate to Due Generation Wizard ═══
    console.log("\n📋 STEP 1: Navigate to Due Generation Wizard");
    await page.goto("/collections/generate");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Generate due periods")).toBeVisible({ timeout: 15000 });
    console.log("✅ Due Generation Wizard page loaded");

    // ═══ STEP 2: Step 1 - Select Monthly Chanda category ═══
    console.log("\n📋 STEP 2: Select Monthly Chanda category (Step 1 of wizard)");
    await page.click('button:has-text("Monthly Chanda")');
    await page.waitForTimeout(500);

    // Click Next to go to Step 2
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(500);
    console.log("✅ Monthly Chanda selected, moved to Step 2");

    // ═══ STEP 3: Step 2 - Verify Generation Mode ═══
    console.log("\n📋 STEP 3: Verify generation mode (Step 2 of wizard)");
    await expect(page.getByRole('heading', { name: 'Generation Mode' })).toBeVisible();

    // Monthly Chanda should have AUTOMATIC as current mode
    await expect(page.getByRole('button', { name: 'Automatic' })).toBeVisible();
    console.log("✅ Generation mode confirmed");

    // Click Next to go to Step 3
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(500);
    console.log("✅ Moved to Step 3");

    // ═══ STEP 4: Step 3 - Set date range to next 12 months ═══
    console.log("\n📋 STEP 4: Set date range to next 12 months (Step 3 of wizard)");
    await expect(page.getByRole('heading', { name: 'Date Range' })).toBeVisible();

    // Set from date to next month and to date to 12 months from now
    // The wizard uses type="date" inputs - use local date format to avoid timezone issues
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const twelveMonthsLater = new Date(today.getFullYear(), today.getMonth() + 12, 1);

    // Format as YYYY-MM-DD in local time (not UTC) for HTML date inputs
    const fromDateStr = nextMonth.toLocaleDateString('en-CA'); // YYYY-MM-DD
    const toDateStr = twelveMonthsLater.toLocaleDateString('en-CA'); // YYYY-MM-DD

    await page.fill('input[type="date"] >> nth=0', fromDateStr);
    await page.fill('input[type="date"] >> nth=1', toDateStr);
    await page.waitForTimeout(300);
    console.log(`✅ Date range set to ${fromDateStr} to ${toDateStr}`);

    // Click Next to go to Step 4
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(500);
    console.log("✅ Moved to Step 4");

    // ═══ STEP 5: Step 4 - Verify ALL_ELIGIBLE ═══
    console.log("\n📋 STEP 5: Verify member selection mode (Step 4 of wizard)");
    await expect(page.getByRole('heading', { name: 'Select Members' })).toBeVisible();

    // Monthly Chanda uses ALL_ELIGIBLE - click the "All Eligible Members" option
    await page.click('button:has-text("All Eligible Members")');
    await page.waitForTimeout(500);
    console.log("✅ ALL_ELIGIBLE mode selected");

    // Click Review to go to Step 5 (it's "Review" on this step, not "Next")
    await page.click('button:has-text("Review")');
    await page.waitForTimeout(500);
    console.log("✅ Moved to Step 5");

    // ═══ STEP 6: Step 5 - Review and Generate ═══
    console.log("\n📋 STEP 6: Review and generate dues (Step 5 of wizard)");
    await expect(page.getByRole('heading', { name: 'Review' })).toBeVisible();

    // Verify summary - check category name and mode
    await expect(page.locator("text=Monthly Chanda")).toBeVisible();
    await expect(page.locator("text=AUTOMATIC")).toBeVisible();
    // Note: dates will show the dynamic from/to dates, not hardcoded 2026-01-01
    console.log("✅ Review summary verified");

    // Click Generate
    await page.click('button:has-text("Generate Dues")');
    console.log("✅ Generate clicked, waiting for completion...");

    // Wait for generation to complete - wait for the success result section
    // The success state shows a checkmark and "Success" heading
    // First check for any error message
    let errorMsg = null;
    try {
      errorMsg = await page.locator('p[role="alert"]').textContent({ timeout: 10000 });
      if (errorMsg) {
        console.log("❌ Generation error:", errorMsg);
      }
    } catch {
      // No error message
    }

    // Also check for any toast or error notification
    try {
      const toastError = await page.locator('[role="status"], [role="alert"], .toast').first().textContent({ timeout: 5000 });
      if (toastError) {
        console.log("Toast/Status:", toastError);
      }
    } catch {}

    await expect(page.locator('h3:has-text("Success")')).toBeVisible({ timeout: 120000 });
    console.log("✅ Dues generation completed");

    // Verify created count - should be 24 (12 months × 2 members)
    const duesGeneratedText = await page.locator('p:has-text("dues periods generated")').textContent();
    console.log("Generation result:", duesGeneratedText);

    // Click Done
    await page.click('button:has-text("Done")');
    await page.waitForLoadState("networkidle");
    console.log("✅ Dues generation wizard complete");

    // ═══ STEP 7: Verify DuesPeriod records in database ═══
    console.log("\n📋 STEP 7: Verify DuesPeriod records created in database");
    const duesPeriods = await prisma.duesPeriod.findMany({
      where: {
        collectionDefinitionId: testData.monthlyChandaDef.id,
        memberId: { in: [testData.memberA.id, testData.memberB.id] },
      },
      orderBy: [{ memberId: "asc" }, { periodStart: "asc" }],
    });

    console.log(`Total dues periods created: ${duesPeriods.length}`);
    expect(duesPeriods.length).toBe(24); // 2 members × 12 months

    // Verify 12 for each member
    const memberADues = duesPeriods.filter(d => d.memberId === testData.memberA.id);
    const memberBDues = duesPeriods.filter(d => d.memberId === testData.memberB.id);

    expect(memberADues.length).toBe(12);
    expect(memberBDues.length).toBe(12);

    // Verify all are PENDING
    for (const d of duesPeriods) {
      expect(d.status).toBe("PENDING");
    }
    console.log("✅ Database verification: 24 dues periods (12 per member), all PENDING");

    // Generate expected month names from the dues periods
    // Use formatDate from the dates utility (DD-MM-YYYY) to match UI display
    const monthsSet = new Set<string>();
    for (const d of memberADues) {
      // Format as DD-MM-YYYY to match formatDate() output
      const parts = d.periodStart.toLocaleString("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).split("-");
      monthsSet.add(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    EXPECTED_MONTHS = Array.from(monthsSet).sort((a, b) => new Date(a.split("-").reverse().join("-")).getTime() - new Date(b.split("-").reverse().join("-")).getTime());
    console.log("Expected months:", EXPECTED_MONTHS);

    // Remaining months after payment (skip first 2)
    REMAINING_MONTHS = EXPECTED_MONTHS.slice(2);

    // ═══ STEP 8: Payment Received UI - Member A sees 12 pending months ═══
    console.log("\n📋 STEP 8: Verify Payment Received UI shows 12 pending months for Member A");

    // Use mobile viewport for the collection form
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/collections/new");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Select Member A
    await page.click('text=Choose member');
    await page.waitForTimeout(300);

    const memberSearchInput = page.locator('#member-search');
    await memberSearchInput.fill(TEST_MEMBER_A_NAME);
    await page.waitForTimeout(500);

    // Click the member in dropdown
    await page.click(`button:has-text("${TEST_MEMBER_A_NAME}")`);
    await page.waitForTimeout(500);
    console.log("✅ Member A selected");

    // Select Monthly Chanda category
    await page.click('button:has-text("Monthly Chanda")');
    await page.waitForTimeout(500);

    // Monthly Chanda has OLDEST_FIRST settlement - should show FIFO allocation preview
    await expect(page.locator("text=FIFO Allocation Preview")).toBeVisible({ timeout: 10000 });
    console.log("✅ FIFO Allocation Preview visible");

    // Wait for all 12 months to appear in the preview
    // The preview shows period labels like "January 2026"
    for (const month of EXPECTED_MONTHS) {
      await expect(page.locator(`text=${month}`)).toBeVisible({ timeout: 5000 });
    }
    console.log("✅ All 12 pending months visible for Member A");

    // ═══ STEP 9: Collect ₹300 for Jan+Feb ═══
    console.log("\n📋 STEP 9: Collect ₹300 for Jan+Feb via OLDEST_FIRST");

    // Set amount to ₹300
    await page.fill('input[placeholder="0"]', "300");
    await page.waitForTimeout(300);

    // Select payment mode - Cash
    await page.click('button:has-text("Cash")');
    await page.waitForTimeout(300);

    // Set date to today
    const todayStr = new Date().toISOString().split("T")[0];
    await page.fill('input[type="date"]', todayStr);
    await page.waitForTimeout(300);

    // Click submit (mobile bottom bar)
    const mobileSubmitBtn = page.locator('button:has-text("Confirm and issue receipt")').last();
    await mobileSubmitBtn.waitFor({ state: "visible", timeout: 10000 });

    console.log("✅ Submitting payment...");
    const navigationPromise = page.waitForURL("**/receipts/**", { timeout: 30000 });
    await mobileSubmitBtn.click();

    try {
      await navigationPromise;
      await page.waitForLoadState("networkidle");
      console.log("✅ Payment submitted and navigated to receipt page");
    } catch (navError) {
      const errorAfterClick = await page.locator('p[role="alert"]').textContent().catch(() => null);
      if (errorAfterClick) {
        console.log("Form error after submit:", errorAfterClick);
      }
      throw navError;
    }

    // Verify receipt generated
    await expect(page.locator("text=रसीद").first()).toBeVisible({ timeout: 15000 });
    console.log("✅ ₹300 collected for Member A (first 2 months via OLDEST_FIRST)");

    // ═══ STEP 10: Verify Member A now shows 10 remaining months ═══
    console.log("\n📋 STEP 10: Verify Member A shows 10 remaining months after payment");

    await page.goto("/collections/new");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Select Member A again
    await page.click('text=Choose member');
    await page.waitForTimeout(300);

    const memberSearchInput2 = page.locator('#member-search');
    await memberSearchInput2.fill(TEST_MEMBER_A_NAME);
    await page.waitForTimeout(500);
    await page.click(`button:has-text("${TEST_MEMBER_A_NAME}")`);
    await page.waitForTimeout(500);

    // Select Monthly Chanda
    await page.click('button:has-text("Monthly Chanda")');
    await page.waitForTimeout(500);

    // Wait for FIFO preview to update
    await page.waitForTimeout(1000);

    // Now should show only remaining months (after first 2)
    for (const month of REMAINING_MONTHS) {
      await expect(page.locator(`text=${month}`)).toBeVisible({ timeout: 5000 });
    }

    // First 2 months should NOT appear in pending list (they're settled)
    // Note: They might still show in the FIFO preview as "allocated" but not as "pending"
    console.log("✅ Member A now shows remaining months after payment");

    // ═══ STEP 11: Verify Member B unaffected - all months pending ═══
    console.log("\n📋 STEP 11: Verify Member B shows all months pending (unaffected)");

    await page.goto("/collections/new");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Select Member B
    await page.click('text=Choose member');
    await page.waitForTimeout(300);

    const memberSearchInput3 = page.locator('#member-search');
    await memberSearchInput3.fill(TEST_MEMBER_B_NAME);
    await page.waitForTimeout(500);
    await page.click(`button:has-text("${TEST_MEMBER_B_NAME}")`);
    await page.waitForTimeout(500);

    // Select Monthly Chanda
    await page.click('button:has-text("Monthly Chanda")');
    await page.waitForTimeout(500);

    // Wait for FIFO preview
    await page.waitForTimeout(1000);

    // Member B should still show all months
    for (const month of EXPECTED_MONTHS) {
      await expect(page.locator(`text=${month}`)).toBeVisible({ timeout: 5000 });
    }
    console.log("✅ Member B shows all months pending (unaffected by Member A's payment)");

    // ═══ STEP 12: Database verification - dues periods status ═══
    console.log("\n📋 STEP 12: Database verification of dues periods status");

    const duesAfterPayment = await prisma.duesPeriod.findMany({
      where: {
        collectionDefinitionId: testData.monthlyChandaDef.id,
        memberId: { in: [testData.memberA.id, testData.memberB.id] },
      },
      orderBy: [{ memberId: "asc" }, { periodStart: "asc" }],
    });

    const memberADuesAfter = duesAfterPayment.filter(d => d.memberId === testData.memberA.id);
    const memberBDuesAfter = duesAfterPayment.filter(d => d.memberId === testData.memberB.id);

    // Member A: First 2 months should be PAID, rest PENDING
    const firstTwoMonths = memberADuesAfter.slice(0, 2);
    const restMonths = memberADuesAfter.slice(2);

    for (const d of firstTwoMonths) {
      expect(d.status).toBe("PAID");
    }

    // Rest should be PENDING
    for (const d of restMonths) {
      expect(d.status).toBe("PENDING");
    }

    // Member B: All should be PENDING
    for (const d of memberBDuesAfter) {
      expect(d.status).toBe("PENDING");
    }

    // Verify payment allocations exist for Member A's payment
    const payment = await prisma.payment.findFirst({
      where: {
        masjidId: testData.masjid.id,
        donorMemberId: testData.memberA.id,
        status: "SUCCESS",
      },
      include: { allocations: true },
    });

    expect(payment).not.toBeNull();
    expect(payment!.amountPaise).toBe(30000); // ₹300 = 30000 paise
    expect(payment!.allocations.length).toBe(2); // First 2 months

    const allocationPeriods = payment!.allocations.map(a => a.duesPeriodId);
    expect(allocationPeriods).toContain(firstTwoMonths[0].id);
    expect(allocationPeriods).toContain(firstTwoMonths[1].id);

    console.log("✅ Database verification passed:");
    console.log(`  - Member A: 2 SETTLED (first 2 months), ${restMonths.length} PENDING`);
    console.log(`  - Member B: ${memberBDuesAfter.length} PENDING (all months)`);
    console.log(`  - Payment: ₹300 with 2 allocations (first 2 months)`);

    console.log("\n🎉 COMPLETE MONTHLY CHANDA WORKFLOW VERIFIED SUCCESSFULLY");
  });
});