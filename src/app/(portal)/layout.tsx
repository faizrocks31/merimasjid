import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { getDictionary } from "@/i18n";
import { UserMenu } from "@/components/layout/user-menu";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { Logo } from "@/components/logo";
import { PortalNav } from "./portal-nav";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // Staff use the operational dashboard; the portal is for member accounts only.
  if (user.role !== ROLES.MEMBER) redirect("/dashboard");
  if (!user.masjidId) redirect("/login");

  const { locale, t } = await getDictionary();

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <header className="no-print sticky top-0 z-20 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)]">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-3 px-4 lg:px-6">
          <Link href="/portal" className="flex min-w-0 items-center gap-2">
            <Logo size="sm" />
            <span className="truncate text-sm font-semibold">{user.masjid?.name ?? t("appName")}</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <LocaleSwitcher current={locale} label={t("language")} compact />
            </div>
            <UserMenu name={user.name} role={user.role} signOutLabel={t("signOut")} />
          </div>
        </div>
        <PortalNav
          labels={{
            overview: t("memberPortal"),
            dues: t("dues"),
            receipts: t("myReceipts"),
            notifications: t("portalNotifications"),
            profile: t("profile"),
          }}
        />
      </header>
      <main className="mx-auto max-w-4xl px-4 pb-16 pt-6 lg:px-6">{children}</main>
    </div>
  );
}
