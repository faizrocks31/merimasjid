import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getDictionary } from "@/i18n";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { PaymentReviewPage } from "./review-page";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const user = await requireStaff();
  if (!can(user.role, "payment:create")) redirect("/transactions");
  const { t } = await getDictionary();

  const [members, collectionDefinitions, staffUpiData] = await Promise.all([
    prisma.member.findMany({
      where: { masjidId: user.masjidId!, status: "ACTIVE" },
      orderBy: { fullName: "asc" },
      select: { id: true, memberNo: true, fullName: true, phone: true },
      take: 2000,
    }),
    prisma.collectionDefinition.findMany({
      where: { masjidId: user.masjidId!, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, purposeCode: true },
    }),
    prisma.masjidUser.findFirst({
      where: {
        masjidId: user.masjidId!,
        status: "ACTIVE",
        role: { in: ["ADMIN", "COLLECTOR", "SUPER_ADMIN"] },
        user: { upiId: { not: null } },
      },
      include: { user: { select: { upiId: true, name: true } } },
      orderBy: { role: "asc" },
    }),
  ]);

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
    back: t("back"),
    loading: t("loading"),
    errorGeneric: t("errorGeneric"),
    searchMember: t("searchMember"),
    reviewPayment: t("reviewPayment") || "Review Payment",
    reviewDetails: t("reviewDetails") || "Review Details",
    allocations: t("allocations") || "Allocations",
    upiQrCode: t("upiQrCode") || "UPI QR Code",
    collectorUpiId: t("collectorUpiId") || "Collector UPI ID",
    amountToPay: t("amountToPay") || "Amount to pay",
    scanToPay: t("scanToPay") || "Scan with any UPI app to pay",
    generatingQr: t("generatingQr") || "Generating QR code...",
    staffUpiNotConfigured: t("staffUpiNotConfigured") || "Staff UPI ID not configured.",
    noStaffUpiConfigured: t("noStaffUpiConfigured") || "No staff member with UPI ID found.",
  };

  return (
    <PaymentReviewPage
      labels={labels}
      members={members}
      categories={collectionDefinitions}
      staffUpiId={staffUpiData?.user.upiId ?? null}
      staffName={staffUpiData?.user.name ?? ""}
    />
  );
}