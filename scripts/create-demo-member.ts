import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString || !connectionString.trim()) {
  throw new Error("DATABASE_URL is not set.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const masjid = await prisma.masjid.findFirst({ where: { slug: 'test-masjid' } });
  if (!masjid) {
    console.log('No test-masjid found');
    return;
  }

  const existing = await prisma.member.findFirst({ where: { masjidId: masjid.id, phone: '+919876543210' } });
  if (existing) {
    console.log('Demo member already exists:', existing.id);
    return;
  }

  const member = await prisma.member.create({
    data: {
      masjidId: masjid.id,
      memberNo: 'TSTM-001',
      fullName: 'Ahmed Khan',
      fatherName: 'Mohammed Khan',
      phone: '+919876543210',
      alternatePhone: '+918765432109',
      address: '123 Mosque Street, City Center',
      joinDate: new Date(),
      status: 'ACTIVE',
      notes: 'Demo member for testing',
      idempotencyKey: 'demo-key-' + Date.now(),
    }
  });
  console.log('Created demo member:', member.id, member.fullName);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });