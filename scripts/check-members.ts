import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL not set");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const masjids = await prisma.masjid.findMany({ select: { id: true, name: true } });
  console.log("Masjids:", masjids);

  for (const m of masjids) {
    const members = await prisma.member.findMany({
      where: { masjidId: m.id },
      select: { id: true, fullName: true, phone: true }
    });
    console.log(`Masjid ${m.name} (${m.id}): ${members.length} members`);
    members.forEach(mem => console.log(`  - ${mem.fullName} (${mem.phone})`));
  }
}

main().finally(() => prisma.$disconnect());