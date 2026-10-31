import { prisma } from "@/lib/db";
import { formatPaise } from "@/lib/money";
import { paiseToHindiWords } from "@/lib/hindi-number-words";
import { formatDate, formatDateTime } from "@/lib/dates";
import { PAYMENT_MODE_LABELS } from "@/lib/constants";

export type ReceiptView = {
  masjid: {
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    footer: string | null;
  };
  receiptNo: string;
  status: string;
  isDuplicate: boolean;
  donorName: string;
  memberNo: string | null;
  paymentDate: string;
  createdAt: string;
  amountText: string;
  amountWords: string;
  mode: string;
  referenceNo: string | null;
  verification: string;
  collector: string;
  notes: string | null;
  lines: { label: string; value: string }[];
  purposes: { name: string; amountText: string }[];
  reversalReason: string | null;
  footer: string;
};

/** Builds a deterministic view model from persisted data only. */
export function buildReceiptView(payment: {
  receiptNo: string;
  status: string;
  donorNameSnapshot: string;
  paymentDate: Date;
  createdAt: Date;
  amountPaise: number;
  mode: string;
  referenceNo: string | null;
  verificationStatus: string;
  notes: string | null;
  donorMember: { memberNo: string; fullName: string } | null;
  enteredByUser: { name: string };
  allocations: { allocatedAmountPaise: number; category: { name: string } }[];
  masjid: { name: string; address: string | null; phone: string | null; email: string | null; receiptFooter: string | null };
  reversalFor: { reason: string } | null;
}, opts: { duplicate: boolean; periodText?: string | null; footerText: string; taxNote: string }): ReceiptView {
  return {
    masjid: {
      name: payment.masjid.name,
      address: payment.masjid.address,
      phone: payment.masjid.phone,
      email: payment.masjid.email,
      footer: payment.masjid.receiptFooter,
    },
    receiptNo: payment.receiptNo,
    status: payment.status,
    isDuplicate: opts.duplicate,
    donorName: payment.donorNameSnapshot,
    memberNo: payment.donorMember?.memberNo ?? null,
    paymentDate: formatDate(payment.paymentDate),
    createdAt: formatDateTime(payment.createdAt),
    amountText: formatPaise(payment.amountPaise),
    amountWords: paiseToHindiWords(payment.amountPaise),
    mode: PAYMENT_MODE_LABELS[payment.mode] ?? payment.mode,
    referenceNo: payment.referenceNo,
    verification: payment.verificationStatus,
    collector: payment.enteredByUser.name,
    notes: payment.notes,
    lines: [],
    purposes: payment.allocations.map((a) => ({
      name: a.category.name,
      amountText: formatPaise(a.allocatedAmountPaise),
    })),
    reversalReason: payment.reversalFor?.reason ?? null,
    footer: payment.masjid.receiptFooter ?? opts.footerText,
  };
}

/** Records the ISSUED event exactly once, for display in the audit trail. */
export async function ensureIssuedEvent(paymentId: string, masjidId: string, actorId: string) {
  const existing = await prisma.receiptEvent.findFirst({
    where: { paymentId, eventType: "ISSUED" },
    select: { id: true },
  });
  if (existing) return;
  await prisma.receiptEvent.create({
    data: { masjidId, paymentId, eventType: "ISSUED", actorUserId: actorId },
  });
}
