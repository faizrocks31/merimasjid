const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

async function main() {
  const adapter = new PrismaPg({ connectionString: 'postgresql://masjid_app:xNyfsjngYpP9TiJgIQa75rVi1rvnHLVWUFENg37CGMw_@127.0.0.1:5432/masjid_collection_test' });
  const prisma = new PrismaClient({ adapter });
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE "CollectionDefinition" ADD COLUMN IF NOT EXISTS "purposeCode" TEXT;');
    console.log('Added purposeCode');
  } catch(e) { console.log('purposeCode:', e.message); }
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE "CollectionDefinition" ADD COLUMN IF NOT EXISTS "showInPaymentReceived" BOOLEAN NOT NULL DEFAULT true;');
    console.log('Added showInPaymentReceived');
  } catch(e) { console.log('showInPaymentReceived:', e.message); }
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });