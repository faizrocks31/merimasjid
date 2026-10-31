"use client";

import { useActionState, useMemo, useState } from "react";
import { UserPlus } from "lucide-react";
import { createStaffAction, type SettingsState } from "@/modules/settings/actions";
import { getFormFields } from "@/lib/validation";
import { isKnownUpiHandle, upiBankHandle } from "@/lib/upi";
import { Button } from "@/components/ui";
import { SimpleForm } from "@/components/forms/auto-form";

type FormValue = string | number | boolean | undefined | null;

export function AddStaffForm({ labels }: { labels: Record<string, string> }) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(createStaffAction, undefined);
  const [upiWarning, setUpiWarning] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, FormValue>>({});

  const fields = useMemo(
    () => getFormFields("staff").map((f) => {
      const mapped = { ...f, label: labels[f.name] ?? f.label };
      if (mapped.name === "role") {
        mapped.options = [
          { value: "COLLECTOR", label: labels.roleCollector ?? "Collector" },
          { value: "ADMIN", label: labels.roleAdmin ?? "Admin" },
          { value: "AUDITOR", label: labels.roleAuditor ?? "Auditor" },
        ];
        mapped.defaultValue = "COLLECTOR";
      }
      if (mapped.name === "upiId") {
        mapped.placeholder = "name@upi or 9876543210@ybl";
        mapped.helpText = upiWarning ? `${labels.upiIdHint} — ${upiWarning}` : labels.upiIdHint;
      }
      if (mapped.name === "phone") {
        mapped.placeholder = "9876543210";
      }
      return mapped;
    }),
    [labels, upiWarning]
  );

  /**
   * The server rejects a malformed UPI ID outright, but a well-formed ID with
   * an unfamiliar bank handle is only *warned* about — NPCI adds banks often
   * enough that a hard reject would block valid IDs.
   */
  function handleFieldChange(name: string, value: FormValue) {
    setValues((prev) => ({ ...prev, [name]: value }));

    if (name !== "upiId") return;
    const raw = String(value ?? "").toLowerCase().trim();
    if (!raw) {
      setUpiWarning(null);
      return;
    }
    const handle = upiBankHandle(raw);
    setUpiWarning(!handle || !isKnownUpiHandle(handle) ? labels.upiUnknownHandle : null);
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    formAction(new FormData(e.currentTarget));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <SimpleForm
          fields={fields}
          values={values}
          onChange={handleFieldChange}
          disabled={pending}
          fieldsOnly={true}
        />
      </div>

      {state?.error ? (
        <p role="alert" className="rounded-lg border border-[#f0cfcf] bg-[var(--danger-soft)] px-3 py-2 text-[11px] font-medium text-[var(--danger)]">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="rounded-lg border border-[#cfe6da] bg-[var(--success-soft)] px-3 py-2 text-[11px] font-medium text-[var(--success)]">
          {labels.saved} ✓
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          <UserPlus className="h-4 w-4" /> {pending ? labels.loading : labels.save}
        </Button>
      </div>
      <p className="text-[11px] text-[var(--ink-muted)]">
        If the email already has an account, that person is added to this Masjid instead of a new account being created.
      </p>
    </form>
  );
}