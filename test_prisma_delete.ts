import { prisma } from "@/lib/db";

async function test() {
  try {
    // First test JummaCorrection
    const countBefore = await prisma.jummaCorrection.count();
    console.log("JummaCorrection count before:", countBefore);

    // Try deleteMany
    const result = await prisma.jummaCorrection.deleteMany({});
    console.log("Delete result:", result);

    const countAfter = await prisma.jummaCorrection.count();
    console.log("JummaCorrection count after:", countAfter);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

test();