import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getDictionary } from "@/i18n";
import { ROLES } from "@/lib/constants";
import { UserMenu } from "@/components/layout/user-menu";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { Logo } from "@/components/logo";

/**
 * Receipts are reachable by staff and by the member who owns them, so this
 * route sits outside the staff-only dashboard layout.
 */
export default async function ReceiptLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { locale, t } = await getDictionary();
  const isMember = user.role === ROLES.MEMBER;

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <header className="no-print sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={isMember ? "/portal" : "/transactions"}
            className="inline-flex items-center gap-1 text-xs text-[var(--ink-muted)] hover:text-[var(--ink)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{isMember ? t("memberPortal") : t("transactions")}</span>
          </Link>
          <div className="flex min-w-0 items-center gap-2">
            <Logo size="sm" />
            <span className="truncate text-sm font-semibold">{user.masjid?.name ?? t("appName")}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <LocaleSwitcher current={locale} label={t("language")} compact />
          </div>
          <div className="lg:hidden">
            <LocaleSwitcher current={locale} label={t("language")} compact />
          </div>
          <UserMenu name={user.name} role={user.role} signOutLabel={t("signOut")} />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-6 lg:px-8">{children}</main>
    </div>
  );
}
