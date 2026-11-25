import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getDictionary } from "@/i18n";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { DueStatusOverviewClient } from "./due-status-client";

export const dynamic = "force-dynamic";

export default async function DueStatusOverviewPage() {
  const user = await requireStaff();
  if (!can(user.role, "collection:read")) redirect("/dashboard");

  const { t } = await getDictionary();
  const masjidId = user.masjidId!;

  // Fetch active collection definitions for this masjid
  const collectionDefinitions = await prisma.collectionDefinition.findMany({
    where: { masjidId, active: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      frequency: true,
      amountType: true,
      defaultAmountPaise: true,
      donorEligibility: true,
      memberAssignment: true,
      dueGeneration: true,
      settlementPolicy: true,
      baseCategory: { select: { name: true, code: true } },
      subcategory: { select: { name: true, code: true } },
    },
  });

  // Fetch years that have dues periods
  const yearsWithDues = await prisma.duesPeriod.findMany({
    where: { masjidId },
    select: { periodStart: true },
    distinct: ["periodStart"],
  });

  const availableYears = Array.from(
    new Set(yearsWithDues.map((d) => new Date(d.periodStart).getFullYear()))
  ).sort((a, b) => b - a);

  const labels: Record<string, string> = {
    dueStatusOverview: t("dueStatusOverview"),
    dueStatusOverviewDesc: t("dueStatusOverviewDesc"),
    selectCollection: t("selectCollection"),
    selectYear: t("selectYear"),
    selectFrequency: t("selectFrequency"),
    selectEvent: t("selectEvent"),
    memberSearch: t("memberSearch"),
    memberStatus: t("memberStatus"),
    allStatus: t("allStatus"),
    activeStatus: t("activeStatus"),
    inactiveStatus: t("inactiveStatus"),
    dueStatus: t("dueStatus"),
    paid: t("paid"),
    pending: t("pending"),
    notGenerated: t("notGenerated"),
    partial: t("partial"),
    noCollectionSelected: t("noCollectionSelected"),
    noDataAvailable: t("noDataAvailable"),
    loadingStatus: t("loadingStatus"),
    month: t("month"),
    year: t("year"),
    frequency: t("frequency"),
    baseCategory: t("baseCategory"),
    subcategory: t("subcategory"),
    defaultAmount: t("defaultAmount"),
    memberAssignment: t("memberAssignment"),
    dueGeneration: t("dueGeneration"),
    active: t("active"),
    inactive: t("inactive"),
    selectCollectionFirst: t("selectCollectionFirst"),
  };

  return (
    <>
      <PageHeader
        title={labels.dueStatusOverview}
        description={labels.dueStatusOverviewDesc}
      />
      <DueStatusOverviewClient
        labels={labels}
        masjidId={masjidId}
        collectionDefinitions={collectionDefinitions}
        availableYears={availableYears}
      />
    </>
  );
}