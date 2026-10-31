import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL not set");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  // Get the masjid
  const masjid = await prisma.masjid.findFirst({ where: { name: "Hussaini Masjid Alote" } });
  if (!masjid) {
    console.log("Masjid not found");
    return;
  }

  console.log(`Masjid: ${masjid.name} (${masjid.id})`);

  // Delete all test members (names starting with "Test Member")
  const deletedMembers = await prisma.member.deleteMany({
    where: {
      masjidId: masjid.id,
      fullName: {
        startsWith: "Test Member"
      }
    }
  });
  console.log(`Deleted ${deletedMembers.count} test members`);

  // Delete seed test members
  const deletedSeeds = await prisma.member.deleteMany({
    where: {
      masjidId: masjid.id,
      fullName: {
        in: ["Arif Hussain", "Mohammad Ali", "Fatima Khan", "Ahmed Khan"]
      }
    }
  });
  console.log(`Deleted ${deletedSeeds.count} seed test members`);

  // Delete test categories
  const deletedCategories = await prisma.contributionCategory.deleteMany({
    where: {
      masjidId: masjid.id,
      name: {
        startsWith: "Test Monthly Chanda"
      }
    }
  });
  console.log(`Deleted ${deletedCategories.count} test categories`);

  // Delete test expense categories
  const deletedExpenseCategories = await prisma.expenseCategory.deleteMany({
    where: {
      masjidId: masjid.id,
      name: {
        startsWith: "Test Expense"
      }
    }
  });
  console.log(`Deleted ${deletedExpenseCategories.count} test expense categories`);

  // Verify remaining
  const remainingMembers = await prisma.member.findMany({
    where: { masjidId: masjid.id },
    select: { id: true, fullName: true, phone: true }
  });
  console.log(`\nRemaining members: ${remainingMembers.length}`);
  remainingMembers.forEach(m => console.log(`  - ${m.fullName} (${m.phone})`));

  const remainingCategories = await prisma.contributionCategory.findMany({
    where: { masjidId: masjid.id },
    select: { id: true, name: true, code: true }
  });
  console.log(`\nRemaining categories: ${remainingCategories.length}`);
  remainingCategories.forEach(c => console.log(`  - ${c.name} (${c.code})`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });