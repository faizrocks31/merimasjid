import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString || !connectionString.trim()) {
  throw new Error("DATABASE_URL is not set.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const rows = await prisma.member.findMany({
    select: { id: true, memberNo: true, fullName: true, phone: true, masjidId: true },
    where: { phone: { not: null } },
  });
  console.log("All members with phone:");
  for (const r of rows) {
    console.log(r.id, r.memberNo, r.fullName, r.phone, r.masjidId);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
