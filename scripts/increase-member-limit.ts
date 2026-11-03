import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString || !connectionString.trim()) {
  throw new Error("DATABASE_URL is not set");
}
if (connectionString.startsWith("file:")) {
  throw new Error("DATABASE_URL points at a SQLite file. This project requires PostgreSQL.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  // Find the test masjid
  const masjid = await prisma.masjid.findFirst({
    where: { slug: 'test-masjid' },
  });

  if (!masjid) {
    console.error("Test masjid not found");
    process.exit(1);
  }

  console.log(`Found masjid: ${masjid.name} (${masjid.id})`);
  console.log(`Current maxMembers: ${masjid.maxMembers}`);

  // Update maxMembers to 500
  const updated = await prisma.masjid.update({
    where: { id: masjid.id },
    data: { maxMembers: 500 },
  });

  console.log(`Updated maxMembers to: ${updated.maxMembers}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });