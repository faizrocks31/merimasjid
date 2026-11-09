import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const masjid = await prisma.masjid.findUnique({ where: { slug: 'test-masjid' } });
  if (!masjid) throw new Error("Test masjid not found");
  const def = await prisma.collectionDefinition.findFirst({
    where: { masjidId: masjid.id, purposeCode: 'MONTHLY_CHANDA', active: true }
  });
  if (!def) throw new Error("Monthly Chanda definition not found");

  const periods = await prisma.duesPeriod.findMany({
    where: { collectionDefinitionId: def.id },
    select: { id: true, memberId: true, periodStart: true, periodEnd: true },
    orderBy: { periodStart: 'asc' },
    take: 30
  });

  console.log('Found ' + periods.length + ' periods for Monthly Chanda:');
  periods.forEach(p => console.log('  ' + p.memberId + ': ' + p.periodStart.toISOString() + ' to ' + p.periodEnd.toISOString()));

  await prisma.$disconnect();
}

main().catch(console.error);