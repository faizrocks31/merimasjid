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
  // Find members with this phone
  const members = await prisma.member.findMany({
    where: { phone: "+918871997756" },
    select: { id: true, memberNo: true, fullName: true, createdAt: true },
  });
  console.log("Members with +918871997756:", members);
  
  // Keep the first one, set phone to null for others
  if (members.length > 1) {
    const keep = members[0];
    for (const m of members.slice(1)) {
      await prisma.member.update({
        where: { id: m.id },
        data: { phone: null },
      });
      console.log("Cleared phone for:", m.id, m.memberNo, m.fullName);
    }
  }
  
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
