"use client";

import React, { useActionState, useMemo, useEffect } from "react";
import Link from "next/link";
import { LogIn, UserRound } from "lucide-react";
import { portalLoginAction, type PortalLoginState } from "@/modules/portal/auth-actions";
import { getFormFields } from "@/lib/validation";
import { Button } from "@/components/ui";
import { Logo } from "@/components/logo";
import { SimpleForm } from "@/components/forms/auto-form";
import type { Locale } from "@/i18n/config";

export function PortalLoginForm({ locale, labels }: { locale: Locale; labels: Record<string, string> }) {
  const [state, formAction, pending] = useActionState<PortalLoginState, FormData>(portalLoginAction, undefined);

  const fields = useMemo(
    () => getFormFields("login").map((f) => ({
      ...f,
      label: labels[f.name] ?? f.label,
      placeholder: f.name === "email" ? "member@example.com" : f.placeholder,
    })),
    [labels]
  );

  // Handle redirect on successful login
  useEffect(() => {
    if (state?.redirect) {
      window.location.href = state.redirect;
    }
  }, [state]);

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center text-center">
        <Logo size="lg" />
        <h1 className="mt-5 text-xl font-semibold tracking-tight text-[var(--ink)]">{labels.appName}</h1>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">{labels.memberPortal}</p>
        <p className="mt-1 text-sm text-[var(--brand)]">{labels.portalSignIn}</p>
      </div>

      <form action={formAction} className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6 shadow-sm">
        <SimpleForm fields={fields} values={{}} disabled={pending} fieldsOnly={true} uncontrolled={true} />

        {state?.error ? (
          <p role="alert" className="rounded-lg border border-[#f0cfcf] bg-[var(--danger-soft)] px-3 py-2 text-xs font-medium text-[var(--danger)]">
            {state.error}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={pending}>
          <LogIn className="h-4 w-4" aria-hidden="true" />
          {pending ? labels.loading : labels.signIn}
        </Button>
      </form>

      <p className="mt-6 text-center text-[11px] text-[var(--ink-muted)]">
        {labels.noAccount} <br /> {labels.contactAdmin}
      </p>
      <p className="mt-2 text-center text-[11px]">
        <Link href="/login" className="text-[var(--brand)] underline-offset-2 hover:underline">
          ← {labels.back}
        </Link>
      </p>
    </div>
  );
}