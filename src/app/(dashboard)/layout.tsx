import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { getDictionary } from "@/i18n";
import { SidebarNav, MobileNav } from "@/components/layout/nav";
import { UserMenu } from "@/components/layout/user-menu";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { Logo } from "@/components/logo";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === ROLES.MEMBER) redirect("/portal");
  if (user.role === ROLES.SUPER_ADMIN && user.isPlatformAdmin) redirect("/platform");

  const { locale, t } = await getDictionary();

  const navLabels = {
    dashboard: t("dashboard"),
    members: t("members"),
    plans: t("plans"),
    receivePayment: t("receivePayment"),
    transactions: t("transactions"),
    expenses: t("expenses"),
    reports: t("reports"),
    settings: t("settings"),
    staff: t("staff"),
    auditLog: t("auditLog"),
    signOut: t("signOut"),
  };

  return (
    <div className="flex min-h-screen">
      {/* Slim 112px icon rail sidebar on desktop - only nav icons */}
      <aside className="no-print sticky top-0 hidden h-screen w-28 shrink-0 flex-col border-e border-[var(--border-tile)] bg-[var(--brand-hero)] lg:flex flex-col justify-center">
        <SidebarNav role={user.role} labels={navLabels} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-[var(--border-tile)] bg-[var(--surface-card)]/95 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <Logo size="sm" />
            <span className="truncate text-sm font-semibold text-[var(--ink-primary)]">{user.masjid?.name ?? t("appName")}</span>
          </div>
          <div className="hidden lg:flex flex-1 items-center justify-center gap-4">
            <Logo size="sm" className="shrink-0" />
            <span className="text-sm font-semibold text-[var(--ink-primary)] truncate max-w-[200px]">{user.masjid?.name ?? t("appName")}</span>
            <span className="num font-manrope text-xs text-[var(--ink-muted-new)] whitespace-nowrap">{new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" })}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-2">
              <LocaleSwitcher current={locale} label={t("language")} compact={false} />
            </div>
            <div className="lg:hidden">
              <LocaleSwitcher current={locale} label={t("language")} compact />
            </div>
            <UserMenu name={user.name} role={user.role} signOutLabel={t("signOut")} />
          </div>
        </header>

        {user.masjid?.status === "SUSPENDED" ? (
          <div className="no-print border-b border-[#efdcb8] bg-[var(--warning-soft)] px-4 py-2 text-xs font-medium text-[var(--warning)] lg:px-8">
            {t("tenantSuspended")}
          </div>
        ) : null}

        <main className="flex-1 px-4 pb-24 pt-6 lg:px-8 lg:pb-10">{children}</main>
      </div>

      <MobileNav role={user.role} labels={navLabels} />
    </div>
  );
}
