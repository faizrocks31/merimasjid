const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const masjids = await prisma.masjid.findMany({
    include: { contributionCategories: { orderBy: { code: 'asc' } } }
  });
  for (const m of masjids) {
    console.log(`Masjid: ${m.name} (${m.id})`);
    console.log(`Categories (${m.contributionCategories.length}):`);
    m.contributionCategories.forEach(c => console.log(`  - ${c.name} [code: ${c.code}] active=${c.active} freq=${c.frequency} mode=${c.collectionMode}`));
    console.log('');
  }
  await prisma.$disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });