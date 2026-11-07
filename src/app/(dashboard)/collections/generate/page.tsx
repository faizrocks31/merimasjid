import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getDictionary } from "@/i18n";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui";
import { DueGenerationWizard } from "./wizard";

export const dynamic = "force-dynamic";

export default async function DueGenerationWizardPage() {
  const user = await requireStaff();
  if (!can(user.role, "collection:write")) redirect("/dashboard");
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

  const labels: Record<string, string> = {
    // Step 1
    selectCategory: t("selectCategory"),
    selectCategoryDesc: t("selectCategoryDesc"),
    category: t("category"),
    noCategories: t("noCategories"),
    next: t("next"),
    back: t("back"),
    cancel: t("cancel"),
    // Step 2
    generationMode: t("generationMode"),
    generationModeDesc: t("generationModeDesc"),
    adminMode: t("adminMode"),
    adminModeDesc: t("adminModeDesc"),
    automaticMode: t("automaticMode"),
    automaticModeDesc: t("automaticModeDesc"),
    currentMode: t("currentMode"),
    // Step 3
    dateRange: t("dateRange"),
    dateRangeDesc: t("dateRangeDesc"),
    fromDate: t("wizardGenerateFromDate"),
    toDate: t("wizardGenerateToDate"),
    // Step 4
    selectMembers: t("selectMembers"),
    selectMembersDesc: t("selectMembersDesc"),
    allEligible: t("allEligible"),
    selectedMembers: t("selectedMembers"),
    memberCount: t("memberCount"),
    searchMembers: t("searchMembers"),
    noMembers: t("noActiveMembers"),
    // Step 5
    review: t("review"),
    reviewDesc: t("reviewDesc"),
    summary: t("summary"),
    categoryLabel: t("category"),
    modeLabel: t("generationMode"),
    dateRangeLabel: t("dateRange"),
    membersLabel: t("membersLabel"),
    generate: t("generateDuesAction"),
    generating: t("generating"),
    success: t("wizardSuccess"),
    duesGenerated: t("wizardDuesGenerated"),
    skipped: t("skipped"),
    errors: t("errors"),
    done: t("wizardDone"),
    // General
    step: t("wizardStep"),
    of: t("wizardOf"),
    loading: t("loading"),
  };

  return (
    <>
      <PageHeader
        title={t("generateDues")}
        description={t("generateDuesDesc")}
      />
      <DueGenerationWizard
        labels={labels}
        masjidId={masjidId}
        collectionDefinitions={collectionDefinitions}
      />
    </>
  );
}
