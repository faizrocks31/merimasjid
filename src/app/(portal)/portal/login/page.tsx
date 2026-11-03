import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { getDictionary } from "@/i18n";
import { PortalLoginForm } from "./portal-login-form";

export default async function PortalLoginPage() {
  const user = await getCurrentUser();
  if (user) {
    if (user.role === ROLES.MEMBER) redirect("/portal");
    if (user.role === ROLES.SUPER_ADMIN && user.isPlatformAdmin) redirect("/platform");
    redirect("/dashboard");
  }

  const { locale, t } = await getDictionary();

  const labels: Record<string, string> = {
    appName: t("appName"),
    signIn: t("signIn"),
    email: t("email"),
    password: t("password"),
    loading: t("loading"),
    back: t("back"),
    memberPortal: t("memberPortal"),
    portalSignIn: t("portalSignIn"),
    noAccount: t("noAccount"),
    contactAdmin: t("contactAdmin"),
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <PortalLoginForm locale={locale} labels={labels} />
    </main>
  );
}