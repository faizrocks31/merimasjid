"use client";

import { useActionState, useMemo, useEffect, useState } from "react";
import { Save } from "lucide-react";
import { createExpenseAction, type ExpenseState } from "@/modules/expenses/actions";
import { getFormFields } from "@/lib/validation";
import { Button } from "@/components/ui";
import { SimpleForm } from "@/components/forms/auto-form";
import { parseRupeesToPaise } from "@/lib/money";

export function ExpenseForm({
  labels,
  categories,
}: {
  labels: Record<string, string>;
  categories: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<ExpenseState, FormData>(createExpenseAction, undefined);
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");

  // Generate idempotency key on mount
  useEffect(() => {
    setIdempotencyKey(crypto.randomUUID());
  }, []);

  // Get field metadata from the central validation registry
  const fields = useMemo(
    () => {
      // Add a virtual "amount" field for rupees input (converted to amountPaise in handler)
      const amountField = {
        name: "amount",
        label: labels.amount ?? "Amount",
        type: "decimal" as const,
        required: true,
        placeholder: "0.00",
      };
      const baseFields = getFormFields("expense");
      return baseFields
        .map((f) => {
          const mapped = { ...f, label: labels[f.name] ?? f.label };
          if (mapped.name === "categoryId") {
            mapped.options = categories.map((c) => ({ value: c.id, label: c.name }));
          }
          if (mapped.name === "mode") {
            mapped.options = [
              { value: "CASH", label: labels.cash ?? "Cash" },
              { value: "UPI", label: labels.upi ?? "UPI" },
              { value: "BANK_TRANSFER", label: labels.bankTransfer ?? "Bank Transfer" },
              { value: "OTHER", label: labels.other ?? "Other" },
            ];
          }
          // Remove amountPaise from visible fields since we use virtual "amount" field
          if (mapped.name === "amountPaise") {
            return null;
          }
          return mapped;
        })
        .filter((f): f is NonNullable<typeof f> => f !== null)
        .concat(amountField);
    },
    [labels, categories]
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const rupees = String(formData.get("amount") ?? "");
    formData.set("amountPaise", String(parseRupeesToPaise(rupees) ?? 0));
    formData.delete("amount");
    // idempotencyKey is already included via SimpleForm (hidden field from validation registry)
    formAction(formData);
  };

  // Reset idempotency key after successful submission
  useEffect(() => {
    if (state?.ok) {
      setIdempotencyKey(crypto.randomUUID());
    }
  }, [state?.ok]);

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <SimpleForm fields={fields} values={{ idempotencyKey }} disabled={pending} fieldsOnly uncontrolled={true} />
      {state?.error ? (
        <p role="alert" className="rounded-lg border border-[#f0cfcf] bg-[var(--danger-soft)] px-3 py-2 text-[11px] font-medium text-[var(--danger)]">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="rounded-lg border border-[#cfe6da] bg-[var(--success-soft)] px-3 py-2 text-[11px] font-medium text-[var(--success)]">
          {labels.save} ✓
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        <Save className="h-4 w-4" /> {pending ? labels.loading : labels.save}
      </Button>
    </form>
  );
}