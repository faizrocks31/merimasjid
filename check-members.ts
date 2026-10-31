import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const masjid = await prisma.masjid.findFirst({ where: { slug: 'test-masjid' } });

  if (!masjid) {
    console.log('Masjid not found');
    await prisma.$disconnect();
    return;
  }

  console.log('Masjid:', masjid.name, masjid.id);

  const members = await prisma.member.findMany({
    where: { masjidId: masjid.id },
    select: { fullName: true, phone: true, status: true, id: true }
  });
  console.log('Members:', JSON.stringify(members, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);