const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://masjid_app:xNyfsjngYpP9TiJgIQa75rVi1rvnHLVWUFENg37CGMw_@127.0.0.1:5432/masjid_collection_test' } } });
async function main() {
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE "CollectionDefinition" ADD COLUMN IF NOT EXISTS "purposeCode" TEXT;');
    console.log('Added purposeCode');
  } catch(e) { console.log('purposeCode:', e.message); }
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE "CollectionDefinition" ADD COLUMN IF NOT EXISTS "showInPaymentReceived" BOOLEAN NOT NULL DEFAULT true;');
    console.log('Added showInPaymentReceived');
  } catch(e) { console.log('showInPaymentReceived:', e.message); }
}
main().catch(console.error).finally(() => prisma.$disconnect());