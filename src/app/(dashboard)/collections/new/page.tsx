import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getDictionary } from "@/i18n";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui";
import { CollectionForm } from "./collection-form";

export const dynamic = "force-dynamic";

export default async function NewCollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ memberId?: string }>;
}) {
  const user = await requireStaff();
  if (!can(user.role, "payment:create")) redirect("/transactions");
  const { t } = await getDictionary();
  const params = await searchParams;

  const [masjid, members, collectionDefinitions, collectionEvents, duesPeriods] = await Promise.all([
    prisma.masjid.findUnique({ where: { id: user.masjidId! } }),
    prisma.member.findMany({
      where: { masjidId: user.masjidId!, status: "ACTIVE" },
      orderBy: { fullName: "asc" },
      select: { id: true, memberNo: true, fullName: true, phone: true },
      take: 2000,
    }),
    prisma.collectionDefinition.findMany({
      where: { masjidId: user.masjidId!, active: true, showInPaymentReceived: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        purposeCode: true,
        defaultAmountPaise: true,
        donorEligibility: true,
        settlementPolicy: true,
        frequency: true,
        amountType: true,
        baseCategory: { select: { code: true } }
      },
    }),
    // Collection events (category-level scheduling)
    prisma.collectionEvent.findMany({
      where: { masjidId: user.masjidId!, status: { in: ["SCHEDULED", "OPEN"] } },
      orderBy: { dueDate: "asc" },
      take: 3000,
      include: {
        collectionDefinition: { select: { id: true, name: true } },
        assignments: {
          where: { status: { in: ["PENDING", "PARTIAL"] } },
          select: { expectedAmountPaise: true },
        },
      },
    }),
    // Legacy DuesPeriods (for backward compatibility)
    // Include both plan (legacy) and collectionDefinition (new direct FK) paths
    prisma.duesPeriod.findMany({
      where: { masjidId: user.masjidId!, status: { in: ["PENDING", "PARTIAL"] } },
      orderBy: { dueDate: "asc" },
      take: 3000,
      include: {
        plan: { include: { collectionDefinition: { select: { id: true, name: true } } } },
        collectionDefinition: { select: { id: true, name: true } },
        allocations: { where: { payment: { status: "SUCCESS" } }, select: { allocatedAmountPaise: true } },
      },
    }),
  ]);

  if (!masjid) redirect("/dashboard");

  // Transform collection events to match period-like structure for the form
  const eventOptions = collectionEvents.map((e) => {
    const expected = e.expectedAmountPaise ?? 0;
    return {
      id: e.id,
      type: "collectionEvent" as const,
      memberId: null, // Category-level, not member-specific
      planId: "",
      categoryId: e.collectionDefinition.id,
      categoryName: e.collectionDefinition.name,
      name: e.name,
      periodStart: e.startDate.toISOString(),
      periodEnd: e.endDate?.toISOString() ?? null,
      dueDate: e.dueDate.toISOString(),
      expectedPaise: expected,
      allocatedPaise: 0, // Would need payment allocations query for exact
      outstandingPaise: Math.max(expected, 0),
      applicableMonth: e.applicableMonth,
      applicableYear: e.applicableYear,
    };
  });

  // Transform dues periods for backward compatibility
  const periodOptions = duesPeriods
    .map((p) => {
      const allocated = p.allocations.reduce((s, a) => s + a.allocatedAmountPaise, 0);
      return {
        id: p.id,
        type: "duesPeriod" as const,
        memberId: p.memberId,
        planId: p.planId ?? "",
        categoryId: (p.collectionDefinition?.id ?? p.plan?.collectionDefinition.id) ?? "",
        categoryName: (p.collectionDefinition?.name ?? p.plan?.collectionDefinition.name) ?? "",
        periodStart: p.periodStart.toISOString(),
        periodEnd: p.periodEnd?.toISOString() ?? null,
        dueDate: p.dueDate.toISOString(),
        expectedPaise: p.expectedAmountPaise,
        allocatedPaise: allocated,
        outstandingPaise: Math.max(p.expectedAmountPaise - allocated, 0),
      };
    })
    .filter((p) => p.outstandingPaise > 0);

  // Events and legacy periods share one list; the form tells them apart by `type`.
  const allocationTargets = [...eventOptions, ...periodOptions];

  // Quick amounts from category defaults or fallback
  const quickAmounts = collectionDefinitions
    .filter((c) => c.defaultAmountPaise && c.defaultAmountPaise > 0)
    .map((c) => c.defaultAmountPaise!);
  const defaultQuickAmounts = quickAmounts.length > 0 ? quickAmounts : [50000, 100000, 210000, 500000]; // ₹500, ₹1000, ₹2100, ₹5000

  const labels: Record<string, string> = {
    receivedFrom: t("receivedFrom"),
    chooseMember: t("chooseMember"),
    walkInDonor: t("walkInDonor"),
    anonymousDonor: t("anonymousDonor"),
    amount: t("amount"),
    date: t("date"),
    mode: t("mode"),
    cash: t("cash"),
    upi: t("upi"),
    bankTransfer: t("bankTransfer"),
    other: t("other"),
    reference: t("reference"),
    optional: t("optional"),
    verification: t("verification"),
    manualEntry: t("manualEntry"),
    verified: t("verified"),
    notes: t("notes"),
    purpose: t("purpose"),
    addAllocation: t("addAllocation"),
    allocateToPeriod: t("allocateToPeriod"),
    category: t("category"),
    chooseCategory: t("chooseCategory"),
    total: t("total"),
    allocated: t("allocated"),
    unallocated: t("unallocated"),
    paymentDetails: t("paymentDetails"),
    confirmPayment: t("confirmPayment"),
    idempotencyNote: t("idempotencyNote"),
    required: t("required"),
    cancel: t("cancel"),
    loading: t("loading"),
    errorGeneric: t("errorGeneric"),
    referenceLabel: t("reference"),
    txnRefCheque: t("reference") + " / Cheque no.",
    details: t("details") || "Details",
    print: t("print"),
    share: t("shareWhatsApp") || "Share",
  };

  return (
    <>
      <PageHeader title={t("receivePayment")} description={t("idempotencyNote")} />
      <CollectionForm
        labels={labels}
        masjidName={masjid.name}
        masjidAddress={masjid.address}
        masjidPhone={masjid.phone}
        members={members}
        categories={collectionDefinitions}
        periods={allocationTargets}
        initialMemberId={params.memberId}
        quickAmounts={defaultQuickAmounts}
      />
    </>
  );
}
