"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/portal", key: "overview" },
  { href: "/portal/dues", key: "dues" },
  { href: "/portal/receipts", key: "receipts" },
  { href: "/portal/notifications", key: "notifications" },
  { href: "/portal/profile", key: "profile" },
];

export function PortalNav({ labels }: { labels: Record<string, string> }) {
  const pathname = usePathname();
  return (
    <nav className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-3 pb-2" aria-label="Portal">
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs transition-colors",
              active
                ? "bg-[var(--brand-soft)] font-medium text-[var(--brand-deep)]"
                : "text-[var(--ink-muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]",
            )}
          >
            {labels[item.key]}
          </Link>
        );
      })}
    </nav>
  );
}
