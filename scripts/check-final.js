import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL not set");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const records = await prisma.jummaCollection.findMany({
  orderBy: { collectionDate: "asc" },
  select: { collectionDate: true, totalAmountPaise: true },
});

console.log(`Total: ${records.length} records`);
for (const r of records) {
  console.log(`  ${r.collectionDate.toISOString().split("T")[0]} - ₹${(r.totalAmountPaise / 100).toFixed(2)}`);
}
await prisma.$disconnect();