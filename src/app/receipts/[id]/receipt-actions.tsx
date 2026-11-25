"use client";

import { Printer, Download, Share2, RotateCcw } from "lucide-react";
import { useTransition, useState } from "react";
import { recordReprintAction } from "@/modules/payments/actions";
import { Button } from "@/components/ui";

export function ReceiptActions({
  paymentId,
  receiptNo,
  donorName,
  amountText,
  whatsappText,
  canReprint,
  isDuplicateCopy,
  labels,
}: {
  paymentId: string;
  receiptNo: string;
  donorName: string;
  amountText: string;
  whatsappText: string;
  canReprint: boolean;
  /** True when this view already is a duplicate copy, so its PDF matches. */
  isDuplicateCopy: boolean;
  labels: Record<string, string>;
}) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  function print() {
    // The printable area is styled via @media print in globals.css.
    window.print();
  }

  /**
   * A reprint is recorded first, then opened as a marked DUPLICATE COPY view —
   * printing the same unmarked sheet again would make the two copies
   * indistinguishable on paper.
   */
  function reprint() {
    setNote(null);
    startTransition(async () => {
      await recordReprintAction(paymentId);
      window.open(`/receipts/${paymentId}?duplicate=1&print=1`, "_blank", "noopener,noreferrer");
    });
  }

  function share() {
    const url = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function downloadPdf() {
    setNote(null);
    const suffix = isDuplicateCopy ? "?duplicate=1" : "";
    window.open(`/api/receipts/${paymentId}/pdf${suffix}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" onClick={print}>
        <Printer className="h-4 w-4" /> {labels.print}
      </Button>
      <Button type="button" size="sm" variant="secondary" onClick={downloadPdf}>
        <Download className="h-4 w-4" /> {labels.downloadPdf}
      </Button>
      <Button type="button" size="sm" variant="secondary" onClick={share}>
        <Share2 className="h-4 w-4" /> {labels.shareWhatsApp}
      </Button>
      {canReprint ? (
        <Button
          type="button"
          size="sm"
          variant="gold"
          disabled={pending}
          onClick={reprint}
          title={labels.duplicate}
        >
          <RotateCcw className="h-4 w-4" /> {labels.reprint}
        </Button>
      ) : null}
      <span className="sr-only">{`${receiptNo} ${donorName} ${amountText}`}</span>
      {note ? <span className="text-[11px] text-[var(--ink-muted)]">{note}</span> : null}
    </div>
  );
}
