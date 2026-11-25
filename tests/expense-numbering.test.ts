import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { nextExpenseNumber } from "@/lib/receipts/numbering";
import { financialYearLabel } from "@/lib/dates";

let masjidId = "";
let masjidId2 = "";
const testFy = "2099-00";

beforeAll(async () => {
  // Use unique slugs with timestamp to avoid conflicts with test fixtures
  const uniqueSuffix = `${Date.now().toString(36)}`;

  // Find or create test masjid 1
  let masjid = await prisma.masjid.findFirst({ where: { slug: "jama-masjid" } });
  if (!masjid) {
    masjid = await prisma.masjid.findFirst();
    if (!masjid) {
      masjid = await prisma.masjid.create({
        data: {
          name: "Jama Masjid Test",
          slug: `jama-masjid-test-${uniqueSuffix}`,
          receiptPrefix: "JMT",
          financialYearStartMonth: 4,
          status: "ACTIVE",
        },
      });
    }
  }
  masjidId = masjid.id;

  // Find or create a DIFFERENT masjid for the second one
  let masjid2 = await prisma.masjid.findFirst({ where: { slug: "test-masjid" } });
  if (!masjid2) {
    masjid2 = await prisma.masjid.create({
      data: {
        name: "Test Masjid 2",
        slug: `test-masjid-2-${uniqueSuffix}`,
        receiptPrefix: "TST2",
        financialYearStartMonth: 4,
        status: "ACTIVE",
      },
    });
  }
  // Ensure masjidId2 is different from masjidId
  if (masjid2.id === masjidId) {
    masjid2 = await prisma.masjid.create({
      data: {
        name: "Test Masjid 3",
        slug: `test-masjid-3-${uniqueSuffix}`,
        receiptPrefix: "TST3",
        financialYearStartMonth: 4,
        status: "ACTIVE",
      },
    });
  }
  masjidId2 = masjid2.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("expense numbering", () => {
  beforeEach(async () => {
    // Ensure expense categories exist for both masjids
    for (const mId of [masjidId, masjidId2]) {
      const cat = await prisma.expenseCategory.findFirst({ where: { masjidId: mId } });
      if (!cat) {
        await prisma.expenseCategory.create({ data: { masjidId: mId, name: "Test Category" } });
      }
    }
    // Clean up sequences and expenses for our test FY
    await prisma.expenseSequence.deleteMany({ where: { masjidId: { in: [masjidId, masjidId2] }, financialYear: testFy } });
    await prisma.expense.deleteMany({ where: { masjidId: { in: [masjidId, masjidId2] }, expenseNo: { startsWith: `EXP-${testFy}-` } } });
  });

  it("starts each masjid + financial year at 000001 and increments", async () => {
    const date = new Date("2099-05-10T00:00:00+05:30");
    expect(financialYearLabel(date, 4)).toBe(testFy);

    const first = await prisma.$transaction((tx) => nextExpenseNumber(tx, masjidId, date, 4));
    const second = await prisma.$transaction((tx) => nextExpenseNumber(tx, masjidId, date, 4));

    expect(first).toBe(`EXP-${testFy}-000001`);
    expect(second).toBe(`EXP-${testFy}-000002`);
  });

  it("keeps separate sequences per financial year", async () => {
    const fyA = "2098-99";
    const fyB = "2097-98";
    await prisma.expenseSequence.deleteMany({ where: { masjidId, financialYear: { in: [fyA, fyB] } } });
    await prisma.expense.deleteMany({
      where: {
        masjidId,
        OR: [
          { expenseNo: { startsWith: `EXP-${fyA}-` } },
          { expenseNo: { startsWith: `EXP-${fyB}-` } },
        ],
      },
    });

    const a = await prisma.$transaction((tx) =>
      nextExpenseNumber(tx, masjidId, new Date("2098-06-01T00:00:00+05:30"), 4),
    );
    const b = await prisma.$transaction((tx) =>
      nextExpenseNumber(tx, masjidId, new Date("2097-06-01T00:00:00+05:30"), 4),
    );

    expect(a).toBe(`EXP-${fyA}-000001`);
    expect(b).toBe(`EXP-${fyB}-000001`);
  });

  it("keeps separate sequences per masjid", async () => {
    const date = new Date("2099-05-10T00:00:00+05:30");

    // Explicit cleanup for this test - ensure both masjids have no sequences for this FY
    await prisma.expenseSequence.deleteMany({ where: { masjidId: masjidId2, financialYear: testFy } });
    await prisma.expense.deleteMany({ where: { masjidId: masjidId2, expenseNo: { startsWith: `EXP-${testFy}-` } } });

    // Also clean masjidId to ensure clean state
    await prisma.expenseSequence.deleteMany({ where: { masjidId: masjidId, financialYear: testFy } });
    await prisma.expense.deleteMany({ where: { masjidId: masjidId, expenseNo: { startsWith: `EXP-${testFy}-` } } });

    const m1First = await prisma.$transaction((tx) => nextExpenseNumber(tx, masjidId, date, 4));
    const m2First = await prisma.$transaction((tx) => nextExpenseNumber(tx, masjidId2, date, 4));

    expect(m1First).toBe(`EXP-${testFy}-000001`);
    expect(m2First).toBe(`EXP-${testFy}-000001`);
  });

  it("never reuses a number after the sequence advances", async () => {
    const date = new Date("2099-05-10T00:00:00+05:30");

    const issued: string[] = [];
    for (let i = 0; i < 5; i++) {
      const r = await prisma.$transaction((tx) => nextExpenseNumber(tx, masjidId, date, 4));
      issued.push(r);
    }

    expect(new Set(issued).size).toBe(5);
    expect(issued.at(-1)).toBe(`EXP-${testFy}-000005`);
  });

  it("handles concurrent allocations without duplicates (10 parallel)", async () => {
    const date = new Date("2099-05-10T00:00:00+05:30");

    // Launch 10 concurrent transactions, each calling nextExpenseNumber
    const promises = Array.from({ length: 10 }, () =>
      prisma.$transaction((tx) => nextExpenseNumber(tx, masjidId, date, 4)),
    );

    const results = await Promise.all(promises);

    // All 10 numbers should be unique
    expect(new Set(results).size).toBe(10);

    // Numbers should be 000001 through 000010 (order may vary)
    const sorted = results.sort();
    expect(sorted[0]).toBe(`EXP-${testFy}-000001`);
    expect(sorted[9]).toBe(`EXP-${testFy}-000010`);
  });

  it("handles concurrent first-time sequence creation for same masjid+FY", async () => {
    const date = new Date("2099-05-10T00:00:00+05:30");
    // Ensure clean state - no sequence row, no expenses
    await prisma.expenseSequence.deleteMany({ where: { masjidId, financialYear: testFy } });
    await prisma.expense.deleteMany({ where: { masjidId, expenseNo: { startsWith: `EXP-${testFy}-` } } });

    // Launch 5 concurrent transactions - first ones will create the sequence row
    const promises = Array.from({ length: 5 }, () =>
      prisma.$transaction((tx) => nextExpenseNumber(tx, masjidId, date, 4)),
    );

    const results = await Promise.all(promises);

    // All 5 numbers should be unique
    expect(new Set(results).size).toBe(5);

    // Numbers should be 000001 through 000005
    const sorted = results.sort();
    expect(sorted[0]).toBe(`EXP-${testFy}-000001`);
    expect(sorted[4]).toBe(`EXP-${testFy}-000005`);
  });

  it("initializes sequence from existing expenses to avoid conflicts", async () => {
    const fy = "2096-97";
    const date = new Date("2096-06-15T00:00:00+05:30");
    expect(financialYearLabel(date, 4)).toBe(fy);

    // Clean slate
    await prisma.expenseSequence.deleteMany({ where: { masjidId, financialYear: fy } });
    await prisma.expense.deleteMany({ where: { masjidId, expenseNo: { startsWith: `EXP-${fy}-` } } });

    // Pre-create 3 expenses with numbers 000001, 000002, 000003
    const cat = await prisma.expenseCategory.findFirst({ where: { masjidId } });
    if (!cat) throw new Error("No expense category for test masjid");

    await prisma.expense.create({
      data: {
        masjidId,
        expenseNo: `EXP-${fy}-000001`,
        categoryId: cat.id,
        date: new Date("2096-06-01T00:00:00+05:30"),
        payee: "Test Payee 1",
        amountPaise: 10000,
        mode: "CASH",
        enteredBy: (await prisma.user.findFirst({ where: { email: "test-user@example.invalid" } }))?.id ?? "",
      },
    });
    await prisma.expense.create({
      data: {
        masjidId,
        expenseNo: `EXP-${fy}-000002`,
        categoryId: cat.id,
        date: new Date("2096-06-02T00:00:00+05:30"),
        payee: "Test Payee 2",
        amountPaise: 20000,
        mode: "CASH",
        enteredBy: (await prisma.user.findFirst({ where: { email: "test-user@example.invalid" } }))?.id ?? "",
      },
    });
    await prisma.expense.create({
      data: {
        masjidId,
        expenseNo: `EXP-${fy}-000003`,
        categoryId: cat.id,
        date: new Date("2096-06-03T00:00:00+05:30"),
        payee: "Test Payee 3",
        amountPaise: 30000,
        mode: "CASH",
        enteredBy: (await prisma.user.findFirst({ where: { email: "test-user@example.invalid" } }))?.id ?? "",
      },
    });

    // Now call nextExpenseNumber - it should start from 000004
    const next = await prisma.$transaction((tx) => nextExpenseNumber(tx, masjidId, date, 4));

    expect(next).toBe(`EXP-${fy}-000004`);
  });

  it("transaction rollback does not persist sequence advance", async () => {
    const date = new Date("2099-05-10T00:00:00+05:30");

    // First, get a number normally
    const first = await prisma.$transaction((tx) => nextExpenseNumber(tx, masjidId, date, 4));
    expect(first).toBe(`EXP-${testFy}-000001`);

    // Now attempt a transaction that rolls back after getting a number
    let rolledBackNumber = "";
    try {
      await prisma.$transaction(async (tx) => {
        rolledBackNumber = await nextExpenseNumber(tx, masjidId, date, 4);
        expect(rolledBackNumber).toBe(`EXP-${testFy}-000002`);
        // Force rollback
        throw new Error("Intentional rollback");
      });
    } catch (e) {
      // Expected
    }

    // Next allocation should get 000002 (not 000003)
    const next = await prisma.$transaction((tx) => nextExpenseNumber(tx, masjidId, date, 4));
    expect(next).toBe(`EXP-${testFy}-000002`);
  });

  it("enforces unique constraint on expense numbers at database level", async () => {
    const date = new Date("2099-05-10T00:00:00+05:30");
    const cat = await prisma.expenseCategory.findFirst({ where: { masjidId } });
    if (!cat) throw new Error("No expense category for test masjid");

    // Get a number and create an expense
    const expenseNo = await prisma.$transaction((tx) => nextExpenseNumber(tx, masjidId, date, 4));
    await prisma.expense.create({
      data: {
        masjidId,
        expenseNo,
        categoryId: cat.id,
        date,
        payee: "Test",
        amountPaise: 1000,
        mode: "CASH",
        enteredBy: (await prisma.user.findFirst({ where: { email: "test-user@example.invalid" } }))?.id ?? "",
      },
    });

    // Attempting to create another expense with the same number should fail
    await expect(
      prisma.expense.create({
        data: {
          masjidId,
          expenseNo,
          categoryId: cat.id,
          date,
          payee: "Test Duplicate",
          amountPaise: 2000,
          mode: "CASH",
          enteredBy: (await prisma.user.findFirst({ where: { email: "test-user@example.invalid" } }))?.id ?? "",
        },
      }),
    ).rejects.toThrow();
  });

  it("expense creation integration uses nextExpenseNumber correctly", async () => {
    const date = new Date("2099-05-10T00:00:00+05:30");
    const cat = await prisma.expenseCategory.findFirst({ where: { masjidId } });
    if (!cat) throw new Error("No expense category for test masjid");

    // Direct test of the full flow (same as createExpenseAction)
    const expenseNo = await prisma.$transaction(async (tx) => {
      const no = await nextExpenseNumber(tx, masjidId, date, 4);
      await tx.expense.create({
        data: {
          masjidId,
          expenseNo: no,
          categoryId: cat.id,
          date,
          payee: "Integration Test",
          amountPaise: 5000,
          mode: "CASH",
          enteredBy: (await prisma.user.findFirst({ where: { email: "test-user@example.invalid" } }))?.id ?? "",
          approvalStatus: "PENDING",
        },
      });
      return no;
    });

    expect(expenseNo).toMatch(/^EXP-2099-00-\d{6}$/);

    const created = await prisma.expense.findUnique({ where: { masjidId_expenseNo: { masjidId, expenseNo } } });
    expect(created).not.toBeNull();
    expect(created?.expenseNo).toBe(expenseNo);
  });
});