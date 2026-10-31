import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString || !connectionString.trim()) {
  throw new Error("DATABASE_URL is not set. Cannot clean up.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  // First, let's see how many members exist
  const allMembers = await prisma.member.findMany({
    where: {
      masjidId: "test-masjid"
    },
    select: { id: true, fullName: true, phone: true }
  });

  console.log(`Total members in test-masjid: ${allMembers.length}`);
  console.log("Members:");
  allMembers.forEach(m => console.log(`  - ${m.fullName} (${m.phone})`));

  // Delete all test members (names starting with "Test Member")
  const deleted = await prisma.member.deleteMany({
    where: {
      masjidId: "test-masjid",
      fullName: {
        startsWith: "Test Member"
      }
    }
  });

  console.log(`\nDeleted ${deleted.count} test members`);

  // Also delete "Arif Hussain", "Mohammad Ali", "Fatima Khan" if they were test data
  const deletedSeeds = await prisma.member.deleteMany({
    where: {
      masjidId: "test-masjid",
      fullName: {
        in: ["Arif Hussain", "Mohammad Ali", "Fatima Khan"]
      }
    }
  });

  console.log(`Deleted ${deletedSeeds.count} seed test members`);

  // Verify remaining members
  const remaining = await prisma.member.findMany({
    where: {
      masjidId: "test-masjid"
    },
    select: { id: true, fullName: true, phone: true }
  });

  console.log(`\nRemaining members: ${remaining.length}`);
  remaining.forEach(m => console.log(`  - ${m.fullName} (${m.phone})`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });