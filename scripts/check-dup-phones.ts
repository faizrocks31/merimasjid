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
    select: { masjidId: true, phone: true },
    where: { phone: { not: null } },
  });
  const seen = new Map<string, number>();
  for (const r of rows) {
    const key = `${r.masjidId}::${r.phone}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  const dups = [...seen.entries()].filter(([, n]) => n > 1);
  console.log("members with phone:", rows.length);
  console.log("duplicate groups:", dups.length);
  for (const [k, n] of dups) console.log("  ", k, "x", n);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});