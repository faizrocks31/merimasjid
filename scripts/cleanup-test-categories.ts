import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString || !connectionString.trim()) {
  throw new Error("DATABASE_URL is not set. Cannot clean up.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  // First, let's see how many categories exist
  const allCategories = await prisma.contributionCategory.findMany({
    where: {
      masjidId: "test-masjid"
    },
    select: { id: true, name: true, code: true }
  });

  console.log(`Total categories in test-masjid: ${allCategories.length}`);
  console.log("Categories:");
  allCategories.forEach(c => console.log(`  - ${c.name} (${c.code})`));

  // Delete all test categories (names starting with "Test Monthly Chanda")
  const deleted = await prisma.contributionCategory.deleteMany({
    where: {
      name: {
        startsWith: "Test Monthly Chanda"
      }
    }
  });

  console.log(`\nDeleted ${deleted.count} test categories`);

  // Also delete any test expense categories
  const deletedExpenses = await prisma.expenseCategory.deleteMany({
    where: {
      name: {
        startsWith: "Test Expense"
      }
    }
  });

  console.log(`Deleted ${deletedExpenses.count} test expense categories`);

  // Verify remaining categories
  const remaining = await prisma.contributionCategory.findMany({
    where: {
      masjidId: "test-masjid"
    },
    select: { id: true, name: true, code: true }
  });

  console.log(`\nRemaining categories: ${remaining.length}`);
  remaining.forEach(c => console.log(`  - ${c.name} (${c.code})`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });