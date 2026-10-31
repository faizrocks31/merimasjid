import { prisma } from "@/lib/db";
import { DEFAULT_CATEGORIES, DEFAULT_EXPENSE_CATEGORIES } from "@/lib/constants";

export async function createMasjidWithDefaults(name: string, slug: string) {
  const masjid = await prisma.masjid.create({
    data: {
      name,
      slug,
      receiptPrefix: "TMP",
      financialYearStartMonth: 4,
      status: "ACTIVE",
    },
  });

  // copy contribution categories
  for (const c of DEFAULT_CATEGORIES) {
    await prisma.contributionCategory.create({
      data: {
        masjidId: masjid.id,
        name: c.name,
        code: c.code,
        restrictedPurpose: c.restrictedPurpose,
        reportingGroup: c.reportingGroup,
        defaultGraceDays: 0,
      },
    });
  }

  // copy expense categories
  for (const n of DEFAULT_EXPENSE_CATEGORIES) {
    await prisma.expenseCategory.create({
      data: { masjidId: masjid.id, name: n },
    });
  }

  return masjid.id;
}