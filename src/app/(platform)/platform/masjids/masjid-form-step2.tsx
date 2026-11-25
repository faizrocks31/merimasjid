"use client";

import { useActionState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, ChevronRight, Check } from "lucide-react";
import {
  createMasjidStep2Action,
  type MasjidStep2State,
} from "@/modules/platform/actions";
import { Button, Field, Input } from "@/components/ui";

function createMasjidStep2ActionWrapper(_prev: MasjidStep2State, formData: FormData): Promise<MasjidStep2State> {
  return createMasjidStep2Action(undefined, formData);
}

type Labels = Record<string, string>;

export function PlatformMasjidStep2Form({ t }: { t: Labels }) {
  const get = (key: string) => t[key] ?? key;
  const router = useRouter();
  const searchParams = useSearchParams();
  const masjidId = searchParams.get("masjidId") ?? "";
  const [state, formAction, pending] = useActionState(
    createMasjidStep2ActionWrapper,
    undefined,
  );

  const handleSuccess = () => {
    // Redirect to masjid detail page or platform list
    router.push(`/platform/masjids/${masjidId}`);
    router.refresh();
  };

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

      {state?.ok && (
        <p
          role="status"
          className="rounded-lg border border-[#cfe8d0] bg-[var(--success-soft)] px-3 py-2 text-[11px] font-medium text-[var(--success)]"
        >
          {get("registrationComplete")}
        </p>
      )}

      <div className="flex items-center gap-2 text-sm text-[var(--ink-muted)] mb-4">
        <span className="flex items-center gap-1 text-[var(--success)]">
          <Check className="h-4 w-4" /> {get("step1Title")}
        </span>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-[var(--ink)]">{get("step2Title")}</span>
      </div>

      <input type="hidden" name="masjidId" value={masjidId} />

      <Field label={get("adminName")} htmlFor="adminName">
        <Input
          id="adminName"
          name="adminName"
          required
          maxLength={200}
          placeholder="e.g., Ahmed Khan"
          autoFocus
          aria-invalid={!!state?.fieldErrors?.adminName}
        />
        {state?.fieldErrors?.adminName && (
          <p className="text-[11px] text-[var(--danger)] mt-1">{state.fieldErrors.adminName}</p>
        )}
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label={get("adminEmail")} htmlFor="adminEmail">
          <Input
            id="adminEmail"
            name="adminEmail"
            type="email"
            required
            placeholder="admin@example.com"
            aria-invalid={!!state?.fieldErrors?.adminEmail}
          />
          <p className="text-[11px] text-[var(--ink-muted)]">Required — globally unique, used for login</p>
          {state?.fieldErrors?.adminEmail && (
            <p className="text-[11px] text-[var(--danger)] mt-1">{state.fieldErrors.adminEmail}</p>
          )}
        </Field>
        <Field label={get("adminPhone")} htmlFor="adminPhone">
          <Input
            id="adminPhone"
            name="adminPhone"
            type="tel"
            required
            placeholder="+91 98765 43210"
            aria-invalid={!!state?.fieldErrors?.adminPhone}
          />
          <p className="text-[11px] text-[var(--ink-muted)]">Required — globally unique</p>
          {state?.fieldErrors?.adminPhone && (
            <p className="text-[11px] text-[var(--danger)] mt-1">{state.fieldErrors.adminPhone}</p>
          )}
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label={get("adminPassword")} htmlFor="password">
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="••••••••"
            aria-invalid={!!state?.fieldErrors?.password}
          />
          <p className="text-[11px] text-[var(--ink-muted)]">{get("passwordHint")}</p>
          {state?.fieldErrors?.password && (
            <p className="text-[11px] text-[var(--danger)] mt-1">{state.fieldErrors.password}</p>
          )}
        </Field>
        <Field label={get("confirmPassword")} htmlFor="confirmPassword">
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            placeholder="••••••••"
            aria-invalid={!!state?.fieldErrors?.confirmPassword}
          />
          {state?.fieldErrors?.confirmPassword && (
            <p className="text-[11px] text-[var(--danger)] mt-1">{state.fieldErrors.confirmPassword}</p>
          )}
        </Field>
      </div>

      <div className="flex justify-end gap-3 border-t border-[var(--border-subtle)] pt-4">
        <a href={`/platform/masjids/new?masjidId=${masjidId}`}>
          <Button type="button" variant="secondary">
            <ArrowLeft className="h-4 w-4" /> {get("prevStep")}
          </Button>
        </a>
        <Button type="submit" disabled={pending || state?.ok}>
          <Save className="h-4 w-4" /> {pending ? get("loading") : get("createAdmin")}
        </Button>
      </div>

      {state?.ok && (
        <script
          dangerouslySetInnerHTML={{
            __html: `setTimeout(() => { window.location.href = '/platform/masjids/${masjidId}'; }, 1500);`,
          }}
        />
      )}
    </form>
  );
}