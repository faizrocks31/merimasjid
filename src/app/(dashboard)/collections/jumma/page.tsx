import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getDictionary } from "@/i18n";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui";
import { JummaDashboardClient } from "./jumma-dashboard-client";

export const dynamic = "force-dynamic";

export default async function JummaPage({
  searchParams,
}: {
  searchParams: Promise<{
    collectionDefinitionId?: string;
    fromDate?: string;
    toDate?: string;
    sort?: string;
  }>;
}) {
  const user = await requireStaff();
  if (!can(user.role, "payment:create")) redirect("/collections/new");
  const { t } = await getDictionary();
  const params = await searchParams;
  const sort = params.sort || "date"; // Default to date order (latest collectionDate first)

  const masjid = await prisma.masjid.findUnique({
    where: { id: user.masjidId! },
  });
  if (!masjid) redirect("/dashboard");

  // Fetch Jumma collection definitions (JUMMA subcategory or purposeCode JUMMA_COLLECTION for legacy)
  const collectionDefinitions = await prisma.collectionDefinition.findMany({
    where: {
      masjidId: user.masjidId!,
      active: true,
      OR: [
        { subcategory: { code: "JUMMA" } },
        { purposeCode: "JUMMA_COLLECTION" },
      ],
    },
    select: {
      id: true,
      name: true,
    },
  });

  // Fetch Jumma collections with correction history
  const jummaCollections = await prisma.jummaCollection.findMany({
    where: {
      masjidId: user.masjidId!,
      collectionDefinitionId: params.collectionDefinitionId || undefined,
      collectionDate: {
        gte: params.fromDate ? new Date(params.fromDate + "T00:00:00.000Z") : undefined,
        lte: params.toDate ? new Date(params.toDate + "T23:59:59.999Z") : undefined,
      },
    },
    include: {
      collectionDefinition: { select: { id: true, name: true } },
      recordedByUser: { select: { id: true, name: true } },
      updatedByUser: { select: { id: true, name: true } },
      corrections: {
        orderBy: { createdAt: "desc" },
        include: { correctedByUser: { select: { id: true, name: true } } },
      },
    },
    orderBy: sort === "latest" ? { createdAt: "desc" } : { collectionDate: "desc" },
    take: 100,
  });

  // Calculate totals for display
  const totalAmount = jummaCollections.reduce(
    (sum, jc) => sum + jc.totalAmountPaise,
    0
  );

  const labels: Record<string, string> = {
    title: "Jumma Collection",
    subtitle: "Record and manage Friday Jumma collection totals",
    recordNew: "Record New Jumma",
    date: t("date"),
    amount: t("amount"),
    notes: t("notes"),
    optional: t("optional"),
    save: t("save") || "Save",
    cancel: t("cancel"),
    required: t("required"),
    dateRange: "Date Range",
    from: "From",
    to: "To",
    filterByDefinition: "Filter by definition",
    all: "All",
    total: "Total",
    noRecords: "No Jumma collections found.",
    correct: "Correct",
    correctionHistory: "Correction History",
    previous: "Previous",
    new: "New",
    reason: "Reason",
    correctNow: "Apply Correction",
    selectDefinition: "Select a Jumma definition",
    mustBeFriday: "Date must be a Friday",
    alreadyRecorded: "A Jumma collection for this Friday is already recorded. Use correction instead.",
    fridayLabel: "Jumma",
    corrections: "Corrections",
    recordedBy: "Recorded by",
    updatedBy: "Updated by",
    noCorrections: "No corrections recorded",
    filter: "Filter",
    clear: "Clear",
    apply: "Apply",
    sortBy: "Sort by",
    sortLatest: "Latest First",
    sortDate: "Date Order",
  };

  return (
    <>
      <PageHeader
        title={labels.title}
        description={labels.subtitle}
        actions={
          <JummaDashboardClient
            labels={labels}
            masjidName={masjid.name}
            collectionDefinitions={collectionDefinitions}
            jummaCollections={jummaCollections.map((jc) => ({
              id: jc.id,
              collectionDate: jc.collectionDate.toISOString().split("T")[0],
              createdAt: jc.createdAt.toISOString(),
              totalAmountPaise: jc.totalAmountPaise,
              participantCount: jc.participantCount,
              notes: jc.notes,
              collectionDefinition: jc.collectionDefinition,
              recordedByUser: jc.recordedByUser,
              updatedByUser: jc.updatedByUser,
              corrections: jc.corrections.map((c) => ({
                id: c.id,
                previousAmountPaise: c.previousAmountPaise,
                newAmountPaise: c.newAmountPaise,
                reason: c.reason,
                createdAt: c.createdAt.toISOString(),
                correctedByUser: c.correctedByUser,
              })),
            }))}
            totalAmountPaise={totalAmount}
            initialFilter={{
              collectionDefinitionId: params.collectionDefinitionId,
              fromDate: params.fromDate,
              toDate: params.toDate,
            }}
            initialSort={sort as "latest" | "date"}
          />
        }
      />
    </>
  );
}
