import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create ExpenseSequence table if it does not exist, with proper constraints.
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ExpenseSequence" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "masjidId" TEXT NOT NULL,
      "financialYear" TEXT NOT NULL,
      "lastNumber" INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT "ExpenseSequence_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "ExpenseSequence_masjidId_financialYear_key" ON "ExpenseSequence"("masjidId", "financialYear");
  `);
  console.log('ExpenseSequence table ensured.');
}

main()
  .catch((e) => {
    console.error('Error creating ExpenseSequence table:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
