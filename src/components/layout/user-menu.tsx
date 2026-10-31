"use client";

import { useState, useTransition } from "react";
import { LogOut, ChevronDown } from "lucide-react";
import { logoutAction } from "@/modules/auth/actions";
import { ROLE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/cn";

export function UserMenu({ name, role, signOutLabel }: { name: string; role: string; signOutLabel: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-white px-2 py-1.5 text-xs hover:bg-[var(--surface)]"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--brand)] text-[10px] font-semibold text-white">
          {initials || "?"}
        </span>
        <span className="hidden max-w-32 truncate font-medium text-[var(--ink)] sm:block">{name}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-[var(--ink-muted)] transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setOpen(false)}
            tabIndex={-1}
          />
          <div
            role="menu"
            className="absolute end-0 z-40 mt-1.5 w-56 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-white shadow-lg"
          >
            <div className="border-b border-[var(--border-subtle)] px-3 py-2.5">
              <p className="truncate text-xs font-medium text-[var(--ink)]">{name}</p>
              <p className="text-[11px] text-[var(--ink-muted)]">{ROLE_LABELS[role] ?? role}</p>
            </div>
            <button
              type="button"
              role="menuitem"
              disabled={pending}
              onClick={() => startTransition(() => logoutAction())}
              className="flex w-full items-center gap-2 px-3 py-2 text-start text-xs text-[var(--danger)] hover:bg-[var(--danger-soft)]"
            >
              <LogOut className="h-3.5 w-3.5" /> {signOutLabel}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
