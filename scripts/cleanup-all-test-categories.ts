import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const p = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
});

async function main() {
  // Delete all test categories
  const toDelete = await p.collectionDefinition.findMany({
    where: {
      name: { contains: 'Test' },
    },
    select: { id: true, name: true }
  });

  // Also delete "abc" category if it exists
  const abc = await p.collectionDefinition.findMany({
    where: { name: 'abc' },
    select: { id: true, name: true }
  });

  // Also delete "Test Edit Name Prefill"
  const testEdit = await p.collectionDefinition.findMany({
    where: { name: 'Test Edit Name Prefill' },
    select: { id: true, name: true }
  });

  const allToDelete = [...toDelete, ...abc, ...testEdit];
  const uniqueIds = [...new Set(allToDelete.map(t => t.id))];

  if (uniqueIds.length > 0) {
    await p.collectionDefinition.deleteMany({ where: { id: { in: uniqueIds } } });
    console.log('Deleted', uniqueIds.length, 'categories');
    for (const t of allToDelete) {
      console.log('  Deleted:', t.name);
    }
  } else {
    console.log('No test categories to delete');
  }

  // Check current count
  const count = await p.collectionDefinition.count({ where: { masjidId: '019d9b2b-cd5b-4e9d-8381-ddc62f88f398' } });
  console.log('Current total count:', count);

  await p.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
});