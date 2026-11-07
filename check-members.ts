const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL;
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function check() {
  const masjid = await prisma.masjid.findUnique({ where: { slug: 'test-masjid' } });
  console.log('Masjid:', JSON.stringify(masjid, null, 2));

  const members = await prisma.member.findMany({
    where: { masjidId: masjid.id, status: 'ACTIVE' },
    select: { id: true, memberNo: true, fullName: true, phone: true, status: true }
  });
  console.log('Members:', JSON.stringify(members, null, 2));
}

check().catch(e => console.error(e)).finally(() => prisma.$disconnect());