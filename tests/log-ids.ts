import "dotenv/config";
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) { console.error('TEST_DATABASE_URL not set'); process.exit(1); }
process.env.DATABASE_URL = testUrl;

import { prisma } from "@/lib/db";

async function main() {
  const masjid = await prisma.masjid.findFirst({ where: { slug: "jama-masjid" } }) ?? await prisma.masjid.findFirst();
  const masjid2 = await prisma.masjid.findFirst({ where: { slug: "test-masjid" } }) ?? await prisma.masjid.create({
    data: { name: "Test Masjid 2", slug: "test-masjid-2", receiptPrefix: "TST2", financialYearStartMonth: 4, status: "ACTIVE" },
  });
  console.log('masjidId', masjid?.id);
  console.log('masjidId2', masjid2?.id);
}

main().finally(() => prisma.$disconnect());