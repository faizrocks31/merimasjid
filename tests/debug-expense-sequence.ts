import "dotenv/config";
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) { console.error('TEST_DATABASE_URL not set'); process.exit(1); }
process.env.DATABASE_URL = testUrl;

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  return url;
}

const adapter = new PrismaPg({ connectionString: connectionString() });
export const prisma = new PrismaClient({ adapter });
import { nextExpenseNumber } from "@/lib/receipts/numbering";
import { financialYearLabel } from "@/lib/dates";

async function main() {
  const testFy = "2099-00";

  // Find or create test masjids
  const masjids = await prisma.masjid.findMany({ select: { id: true, name: true, slug: true } });
  console.log("All masjids:", masjids);

  const masjid1 = await prisma.masjid.findFirst({ where: { slug: "jama-masjid" } }) ?? await prisma.masjid.findFirst();
  if (!masjid1) throw new Error("No masjid found");
  console.log("Masjid 1:", masjid1.id, masjid1.name);

  let masjid2 = await prisma.masjid.findFirst({ where: { slug: "test-masjid" } });
  if (!masjid2) {
    masjid2 = await prisma.masjid.create({
      data: {
        name: "Test Masjid 2",
        slug: "test-masjid-2",
        receiptPrefix: "TST2",
        financialYearStartMonth: 4,
        status: "ACTIVE",
      },
    });
  }
  console.log("Masjid 2:", masjid2.id, masjid2.name);

  // Clean up
  await prisma.expenseSequence.deleteMany({ where: { masjidId: { in: [masjid1.id, masjid2.id] }, financialYear: testFy } });
  await prisma.expense.deleteMany({ where: { masjidId: { in: [masjid1.id, masjid2.id] }, expenseNo: { startsWith: `EXP-${testFy}-` } } });

  console.log("Cleaned up sequences and expenses for test FY");

  // Check sequences
  let seqs = await prisma.expenseSequence.findMany({ where: { financialYear: testFy } });
  console.log("Sequences after cleanup:", seqs);

  // Test 1: First masjid gets first number
  const date = new Date("2099-05-10T00:00:00+05:30");
  const m1First = await prisma.$transaction((tx) => nextExpenseNumber(tx, masjid1.id, date, 4));
  console.log("Masjid 1 first:", m1First);

  // Check sequence after m1
  seqs = await prisma.expenseSequence.findMany({ where: { financialYear: testFy } });
  console.log("Sequences after m1First:", seqs);

  // Test 2: Second masjid gets first number
  const m2First = await prisma.$transaction((tx) => nextExpenseNumber(tx, masjid2.id, date, 4));
  console.log("Masjid 2 first:", m2First);

  // Check sequence after m2
  seqs = await prisma.expenseSequence.findMany({ where: { financialYear: testFy } });
  console.log("Sequences after m2First:", seqs);

  console.log("m1First:", m1First);
  console.log("m2First:", m2First);
  console.log("Expected both to be EXP-2099-00-000001");
  console.log("Test passed:", m1First === `EXP-${testFy}-000001` && m2First === `EXP-${testFy}-000001`);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());