"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { reversePaymentAction } from "@/modules/payments/actions";
import { Button, Field, Textarea } from "@/components/ui";

export function ReversePayment({
  paymentId,
  receiptNo,
  amountText,
  labels,
}: {
  paymentId: string;
  receiptNo: string;
  amountText: string;
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (reason.trim().length === 0) {
      setError(labels.reverseReason + ": " + labels.required);
      return;
    }
    const fd = new FormData();
    fd.set("paymentId", paymentId);
    fd.set("reason", reason.trim());
    startTransition(async () => {
      const result = await reversePaymentAction(fd);
      if (!result.ok) {
        setError(result.error ?? labels.errorGeneric);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="no-print">
      {!open ? (
        <Button type="button" size="sm" variant="danger" onClick={() => setOpen(true)}>
          <Ban className="h-4 w-4" /> {labels.reverse}
        </Button>
      ) : (
        <div className="w-full max-w-md rounded-lg border border-[#f0cfcf] bg-[var(--danger-soft)] p-3">
          <p className="mb-2 text-xs font-medium text-[var(--danger)]">
            {labels.reversePayment}: <span className="num">{receiptNo}</span> · <span className="num">{amountText}</span>
          </p>
          <Field label={labels.reverseReason} htmlFor="reason">
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              autoFocus
              className="bg-white"
            />
          </Field>
          {error ? <p className="mt-1 text-[11px] font-medium text-[var(--danger)]">{error}</p> : null}
          <div className="mt-2 flex gap-2">
            <Button type="button" size="sm" variant="danger" onClick={submit} disabled={pending}>
              {pending ? labels.loading : labels.reverse}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              {labels.cancel}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
