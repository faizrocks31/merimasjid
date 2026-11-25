const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || "postgresql://masjid_app:xNyfsjngYpP9TiJgIQa75rVi1rvnHLVWUFENg37CGMw_@127.0.0.1:5432/masjid_collection_test"
    }
  }
});

async function main() {
  console.log('Adding missing columns to CollectionDefinition table...');

  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "CollectionDefinition" ADD COLUMN IF NOT EXISTS "purposeCode" TEXT;`);
    console.log('Added purposeCode column');
  } catch (e) {
    console.log('purposeCode column may already exist:', e.message);
  }

  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "CollectionDefinition" ADD COLUMN IF NOT EXISTS "showInPaymentReceived" BOOLEAN NOT NULL DEFAULT true;`);
    console.log('Added showInPaymentReceived column');
  } catch (e) {
    console.log('showInPaymentReceived column may already exist:', e.message);
  }

  console.log('Done!');
}

main().catch(console.error).finally(() => prisma.$disconnect());