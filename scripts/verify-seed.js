const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = "postgresql://masjid_app:xNyfsjngYpP9TiJgIQa75rVi1rvnHLVWUFENg37CGMw_@127.0.0.1:5432/masjid_collection_test";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function check() {
  try {
    await prisma.$connect();

    const masjids = await prisma.masjid.findMany();
    console.log('Masjids:', masjids.length);

    if (masjids.length > 0) {
      const defs = await prisma.collectionDefinition.findMany({
        where: { masjidId: masjids[0].id },
        include: { baseCategory: true, subcategory: true }
      });
      console.log(`\nCollection Definitions for ${masjids[0].name}:`);
      for (const d of defs) {
        console.log(`  - ${d.name} [${d.baseCategory.code} → ${d.subcategory.code}] freq=${d.frequency} policy=${d.settlementPolicy}`);
      }
    }

    const counts = {
      baseCategories: await prisma.baseCategory.count(),
      subcategories: await prisma.subcategory.count(),
      combinations: await prisma.baseCategorySubcategory.count(),
      collectionDefinitions: await prisma.collectionDefinition.count(),
    };
    console.log('\n=== COUNTS ===');
    console.log(counts);

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

check();