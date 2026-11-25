import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ROLES } from "@/lib/constants";

export type ReceiptData = Awaited<ReturnType<typeof loadReceipt>>;

/**
 * Loads a receipt with tenant + ownership checks.
 * Members may only load their own receipts.
 */
export async function loadReceipt(paymentId: string) {
  const user = await requireUser();
  if (!user.masjidId) return null;

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, masjidId: user.masjidId },
    include: {
      donorMember: { select: { id: true, memberNo: true, fullName: true } },
      enteredByUser: { select: { name: true } },
      allocations: { include: { collectionDefinition: { select: { name: true, purposeCode: true } } } },
      masjid: {
        select: {
          name: true, address: true, phone: true, email: true,
          receiptPrefix: true, receiptFooter: true, logoUrl: true,
        },
      },
      receiptEvents: { orderBy: { createdAt: "desc" }, take: 20 },
      reversalFor: { select: { reason: true, createdAt: true } },
    },
  });

  if (!payment) return null;

  if (user.role === ROLES.MEMBER) {
    if (!user.memberId || payment.donorMemberId !== user.memberId) return null;
  }

  return payment;
}

export async function requireReceipt(paymentId: string) {
  const receipt = await loadReceipt(paymentId);
  if (!receipt) notFound();
  return receipt;
}
