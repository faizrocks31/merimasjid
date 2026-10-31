"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, CalendarClock, HandCoins, ReceiptText, Wallet,
  BarChart3, Settings, ShieldCheck, ScrollText,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { ROLES, type Role } from "@/lib/constants";
import { can, type Permission } from "@/lib/permissions";

type Labels = Record<string, string>;

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: Permission;
  staffOnly?: boolean;
  color?: string;
  hoverBg?: string;
  activeBg?: string;
};

function items(labels: Labels): NavItem[] {
  return [
    { href: "/dashboard", label: labels.dashboard, icon: LayoutDashboard, color: "text-[var(--brand-primary)]", hoverBg: "hover:bg-[var(--brand-primary)]/15", activeBg: "bg-[var(--brand-primary)]/20" },
    { href: "/members", label: labels.members, icon: Users, permission: "member:read", color: "text-emerald-400", hoverBg: "hover:bg-emerald-500/15", activeBg: "bg-emerald-500/20" },
    { href: "/plans", label: labels.plans, icon: CalendarClock, permission: "plan:write", color: "text-blue-400", hoverBg: "hover:bg-blue-500/15", activeBg: "bg-blue-500/20" },
    { href: "/collections/new", label: labels.receivePayment, icon: HandCoins, permission: "payment:create", color: "text-amber-400", hoverBg: "hover:bg-amber-500/15", activeBg: "bg-amber-500/20" },
    { href: "/transactions", label: labels.transactions, icon: ReceiptText, permission: "payment:read", color: "text-violet-400", hoverBg: "hover:bg-violet-500/15", activeBg: "bg-violet-500/20" },
    { href: "/expenses", label: labels.expenses, icon: Wallet, permission: "expense:create", color: "text-rose-400", hoverBg: "hover:bg-rose-500/15", activeBg: "bg-rose-500/20" },
    { href: "/reports", label: labels.reports, icon: BarChart3, permission: "report:read", color: "text-cyan-400", hoverBg: "hover:bg-cyan-500/15", activeBg: "bg-cyan-500/20" },
    { href: "/settings", label: labels.settings, icon: Settings, permission: "settings:write", color: "text-slate-400", hoverBg: "hover:bg-slate-500/15", activeBg: "bg-slate-500/20" },
    { href: "/staff", label: labels.staff, icon: ShieldCheck, permission: "staff:manage", color: "text-indigo-400", hoverBg: "hover:bg-indigo-500/15", activeBg: "bg-indigo-500/20" },
    { href: "/audit", label: labels.auditLog, icon: ScrollText, permission: "audit:read", color: "text-orange-400", hoverBg: "hover:bg-orange-500/15", activeBg: "bg-orange-500/20" },
  ];
}

function visible(role: Role, labels: Labels) {
  return items(labels).filter((i) => !i.permission || can(role, i.permission));
}

function renderNavIcon({ Icon, color, active }: { Icon: React.ComponentType<{ className?: string }>; color: string; active: boolean }) {
  return (
    <div className={cn(
      "relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200",
      color,
      active && "text-white scale-110",
    )}>
      <Icon className={cn("h-5 w-5 shrink-0", active && "text-white")} />
      {active && (
        <div className="absolute inset-0 rounded-xl bg-white/10 blur-[2px]" aria-hidden="true" />
      )}
    </div>
  );
}

export function SidebarNav({ role, labels }: { role: Role; labels: Labels }) {
  const pathname = usePathname();
  const list = visible(role, labels);
  return (
    <nav className="flex flex-col gap-0.5 px-1.5 pb-3 flex-1 min-h-0" aria-label="Main">
      {list.map(({ href, label, icon: Icon, color, hoverBg, activeBg }) => {
        const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex flex-col items-center gap-0.5 rounded-xl px-1.5 py-2 transition-all duration-200",
              "group",
              active
                ? "text-white shadow-lg"
                : "text-white/70",
              hoverBg,
              active && activeBg,
            )}
            title={label}
          >
            <div className={cn(
              "relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200",
              color,
              active && "text-white scale-110",
            )}>
              <Icon className="h-5 w-5 shrink-0" />
              {/* Active indicator glow */}
              {active && (
                <div className="absolute inset-0 rounded-xl bg-white/10 blur-[2px]" aria-hidden="true" />
              )}
            </div>
            <span className="text-[9px] font-manrope font-medium leading-snug tracking-[0.02em] whitespace-normal text-center max-w-full line-clamp-2 transition-opacity duration-200 group-hover:opacity-100">
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav({ role, labels }: { role: Role; labels: Labels }) {
  const pathname = usePathname();
  const all = visible(role, labels);
  // Primary destinations only; the rest remain reachable from the header menu.
  const primary = all.filter((i) =>
    ["/dashboard", "/members", "/collections/new", "/transactions", "/reports"].includes(i.href),
  );
  return (
    <nav
      className="no-print fixed inset-x-0 bottom-0 z-30 flex border-t border-[var(--border-tile)] bg-[var(--surface-card)] pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="Primary"
    >
      {primary.map(({ href, label, icon: Icon, color, hoverBg, activeBg }) => {
        const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 px-2 py-2.5 text-xs transition-colors",
              active ? "text-[var(--brand-primary)]" : "text-[var(--ink-muted-new)]",
            )}
          >
            {renderNavIcon({ Icon, color: color!, active })}
            <span className={cn(
              "text-[9px] font-manrope font-medium leading-snug text-center max-w-full truncate",
              active && "text-[var(--brand-primary)]"
            )}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export { ROLES };
