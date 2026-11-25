import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const p = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
});

async function main() {
  // Delete all categories except the first 5 (system ones)
  const mainMasjidId = '019d9b2b-cd5b-4e9d-8381-ddc62f88f398';

  const allCats = await p.collectionDefinition.findMany({
    where: { masjidId: mainMasjidId },
    select: { id: true, name: true, active: true }
  });

  console.log('Total categories:', allCats.length);
  for (const c of allCats) {
    console.log(`  ${c.name} (${c.id}) - active: ${c.active}`);
  }

  // Keep only first 5, delete the rest
  if (allCats.length > 5) {
    const toDelete = allCats.slice(5);
    console.log(`\nDeleting ${toDelete.length} categories...`);

    for (const cat of toDelete) {
      await p.collectionDefinition.delete({ where: { id: cat.id } });
      console.log(`  Deleted: ${cat.name} (${cat.id})`);
    }
  }

  const remaining = await p.collectionDefinition.findMany({
    where: { masjidId: mainMasjidId },
    select: { id: true, name: true, active: true }
  });

  console.log('\nRemaining categories:', remaining.length);
  for (const c of remaining) {
    console.log(`  ${c.name} (${c.id}) - active: ${c.active}`);
  }

  await p.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
});