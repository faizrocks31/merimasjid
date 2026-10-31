"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/i18n/config";
import { setLocaleAction } from "@/modules/settings/locale-action";
import { cn } from "@/lib/cn";

export function LocaleSwitcher({ current, label, compact = false }: { current: Locale; label: string; compact?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function change(locale: Locale) {
    if (locale === current) return;
    startTransition(async () => {
      await setLocaleAction(locale);
      router.refresh();
    });
  }

  // Short labels for compact sidebar mode
  const SHORT_LABELS: Record<Locale, string> = {
    en: "EN",
    hi: "हि",
    ur: "ار",
  };

  return (
    <div className={cn("flex items-center gap-1", compact && "gap-0.5")}>
      {!compact ? (
        <span className="me-1 flex items-center gap-1 text-[11px] text-[var(--ink-muted)]">
          <Languages className="h-3.5 w-3.5" />
          {label}
        </span>
      ) : null}
      <div className="flex rounded-lg border border-[var(--border-tile)] bg-[var(--surface-card)] p-0.5">
        {LOCALES.map((locale) => (
          <button
            key={locale}
            type="button"
            disabled={pending}
            onClick={() => change(locale)}
            aria-pressed={locale === current}
            aria-label={LOCALE_LABELS[locale]}
            className={cn(
              "rounded-md px-2 py-1 text-[11px] transition-colors whitespace-nowrap",
              locale === current
                ? "bg-[var(--brand-primary)] font-medium text-white"
                : "text-[var(--ink-primary)] hover:bg-[var(--surface-field)]",
            )}
          >
            {compact ? SHORT_LABELS[locale] : LOCALE_LABELS[locale]}
          </button>
        ))}
      </div>
    </div>
  );
}
