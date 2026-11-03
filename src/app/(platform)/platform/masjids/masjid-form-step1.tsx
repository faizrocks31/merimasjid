"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, ChevronRight } from "lucide-react";
import {
  createMasjidStep1Action,
  type MasjidStep1State,
} from "@/modules/platform/actions";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";

const MONTHS = [
  ["1", "January"], ["2", "February"], ["3", "March"], ["4", "April"],
  ["5", "May"], ["6", "June"], ["7", "July"], ["8", "August"],
  ["9", "September"], ["10", "October"], ["11", "November"], ["12", "December"],
];

const PLANS = [
  ["TRIAL", "planTrial"],
  ["STARTER", "planStarter"],
  ["PROFESSIONAL", "planProfessional"],
  ["ENTERPRISE", "planEnterprise"],
] as const;

function createMasjidStep1ActionWrapper(_prev: MasjidStep1State, formData: FormData): Promise<MasjidStep1State> {
  return createMasjidStep1Action(undefined, formData);
}

type Labels = Record<string, string>;

export function PlatformMasjidStep1Form({ t }: { t: Labels }) {
  const get = (key: string) => t[key] ?? key;
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    createMasjidStep1ActionWrapper,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-5 p-5">
      {state?.error ? (
        <p
          role="alert"
          className="rounded-lg border border-[#f0cfcf] bg-[var(--danger-soft)] px-3 py-2 text-[11px] font-medium text-[var(--danger)]"
        >
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center gap-2 text-sm text-[var(--ink-muted)] mb-4">
        <span className="font-medium text-[var(--ink)]">{get("step1Title")}</span>
        <ChevronRight className="h-4 w-4" />
        <span>{get("step2Title")}</span>
      </div>

      <Field label={get("masjidName")} htmlFor="name">
        <Input
          id="name"
          name="name"
          required
          maxLength={200}
          placeholder="e.g., Madina Masjid"
          autoFocus
          aria-invalid={!!state?.fieldErrors?.name}
        />
        {state?.fieldErrors?.name && (
          <p className="text-[11px] text-[var(--danger)] mt-1">{state.fieldErrors.name}</p>
        )}
      </Field>

      <Field label={get("slug")} htmlFor="slug">
        <Input
          id="slug"
          name="slug"
          required
          placeholder="e.g., madina-masjid"
          aria-invalid={!!state?.fieldErrors?.slug}
        />
        <p className="text-[11px] text-[var(--ink-muted)]">URL-friendly identifier (lowercase, hyphens only)</p>
        {state?.fieldErrors?.slug && (
          <p className="text-[11px] text-[var(--danger)] mt-1">{state.fieldErrors.slug}</p>
        )}
      </Field>

      <Field label={get("receiptPrefix")} htmlFor="receiptPrefix">
        <Input
          id="receiptPrefix"
          name="receiptPrefix"
          required
          maxLength={8}
          minLength={2}
          placeholder="MMA"
          aria-invalid={!!state?.fieldErrors?.receiptPrefix}
        />
        <p className="text-[11px] text-[var(--ink-muted)]">2-8 uppercase letters/digits for receipt numbers</p>
        {state?.fieldErrors?.receiptPrefix && (
          <p className="text-[11px] text-[var(--danger)] mt-1">{state.fieldErrors.receiptPrefix}</p>
        )}
      </Field>

      <Field label={get("address")} htmlFor="address">
        <Textarea id="address" name="address" rows={3} placeholder="Full address" />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label={get("phone")} htmlFor="phone">
          <Input
            id="phone"
            name="phone"
            type="tel"
            required
            placeholder="+91 98765 43210"
            aria-invalid={!!state?.fieldErrors?.phone}
          />
          <p className="text-[11px] text-[var(--ink-muted)]">{get("phoneRequiredAdmin")}</p>
          {state?.fieldErrors?.phone && (
            <p className="text-[11px] text-[var(--danger)] mt-1">{state.fieldErrors.phone}</p>
          )}
        </Field>
        <Field label={get("email")} htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="masjid@example.com"
            aria-invalid={!!state?.fieldErrors?.email}
          />
          <p className="text-[11px] text-[var(--ink-muted)]">{get("emailRequired")}</p>
          {state?.fieldErrors?.email && (
            <p className="text-[11px] text-[var(--danger)] mt-1">{state.fieldErrors.email}</p>
          )}
        </Field>
      </div>

      <Field label={get("financialYear")} htmlFor="financialYearStartMonth">
        <Select
          id="financialYearStartMonth"
          name="financialYearStartMonth"
          defaultValue="4"
          aria-invalid={!!state?.fieldErrors?.financialYearStartMonth}
        >
          {MONTHS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        {state?.fieldErrors?.financialYearStartMonth && (
          <p className="text-[11px] text-[var(--danger)] mt-1">{state.fieldErrors.financialYearStartMonth}</p>
        )}
      </Field>

      <Field label={get("receiptFooter")} htmlFor="receiptFooter">
        <Textarea
          id="receiptFooter"
          name="receiptFooter"
          rows={2}
          placeholder="Jazak Allah Khair for your contribution."
        />
      </Field>

      <Field label={get("planSelection")} htmlFor="planCode">
        <Select
          id="planCode"
          name="planCode"
          defaultValue="TRIAL"
          aria-invalid={!!state?.fieldErrors?.planCode}
        >
          {PLANS.map(([value, labelKey]) => (
            <option key={value} value={value}>
              {get(labelKey)}
            </option>
          ))}
        </Select>
        <p className="text-[11px] text-[var(--ink-muted)]">Trial: 30 days free, 100 members, 3 staff. Upgrade anytime.</p>
        {state?.fieldErrors?.planCode && (
          <p className="text-[11px] text-[var(--danger)] mt-1">{state.fieldErrors.planCode}</p>
        )}
      </Field>

      <div className="flex justify-end gap-3 border-t border-[var(--border-subtle)] pt-4">
        <a href="/platform">
          <Button type="button" variant="secondary">
            <ArrowLeft className="h-4 w-4" /> Cancel
          </Button>
        </a>
        <Button type="submit" disabled={pending}>
          <Save className="h-4 w-4" /> {pending ? get("loading") : get("nextStep")}
        </Button>
      </div>
    </form>
  );
}