import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { getDictionary } from "@/i18n";
import { Logo } from "@/components/logo";
import { UserMenu } from "@/components/layout/user-menu";
import Link from "next/link";
import { LayoutDashboard, LogOut } from "lucide-react";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== ROLES.SUPER_ADMIN) redirect("/dashboard");
  if (!user.isPlatformAdmin) redirect("/login");

  const { locale, t } = await getDictionary();

  const navLabels = {
    dashboard: "Masjids",
    signOut: t("signOut"),
  };

  return (
    <div className="flex min-h-screen bg-[var(--surface)]">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-e border-[var(--border-subtle)] bg-[var(--surface-raised)] lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <Logo size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--ink)]">Platform Admin</p>
            <p className="truncate text-[11px] text-[var(--ink-muted)]">Masjid Management</p>
          </div>
        </div>
        <nav className="flex flex-col gap-0.5 px-3 py-4" aria-label="Platform">
          <Link
            href="/platform"
            className="flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-base transition-colors text-[var(--brand-deep)] bg-[var(--brand-soft)] font-medium"
            aria-current="page"
          >
            <LayoutDashboard className="h-5 w-5 shrink-0" />
            <span className="truncate">{navLabels.dashboard}</span>
          </Link>
        </nav>
        <div className="mt-auto border-t border-[var(--border-subtle)] p-3">
          <div className="flex items-center gap-2">
            <Link
              href="/logout"
              className="flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm text-[var(--ink-muted)] hover:bg-[var(--surface)] hover:text-[var(--danger)] transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>{navLabels.signOut}</span>
            </Link>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface)]/95 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="truncate text-sm font-semibold text-[var(--ink)]">Platform Admin — {user.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-[var(--ink-muted)] lg:block">
              {new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" })}
            </span>
            <UserMenu name={user.name} role={user.role} signOutLabel={navLabels.signOut} />
          </div>
        </header>

        <main className="flex-1 px-4 pb-24 pt-6 lg:px-8 lg:pb-10">{children}</main>
      </div>
    </div>
  );
}