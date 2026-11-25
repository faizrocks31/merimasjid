import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function check() {
  const masjid = await prisma.masjid.findFirst({ where: { slug: "test-masjid" } });
  if (!masjid) {
    console.log("No masjid found");
    return;
  }
  const defs = await prisma.collectionDefinition.findMany({
    where: { masjidId: masjid.id, active: true },
    include: { baseCategory: true, subcategory: true },
  });
  console.log("All active collection definitions:");
  defs.forEach((d) =>
    console.log("  ", d.name, "| base:", d.baseCategory?.code, "| sub:", d.subcategory?.code, "| purposeCode:", d.purposeCode)
  );

  const jumma = defs.filter((d) => d.subcategory?.code === "JUMMA" || d.purposeCode === "JUMMA_COLLECTION");
  console.log("Jumma definitions:", jumma.length);
  jumma.forEach((d) => console.log("  ", d.name, "| base:", d.baseCategory?.code, "| sub:", d.subcategory?.code));
}

check().finally(() => prisma.$disconnect());