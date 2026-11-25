import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { getDictionary } from "@/i18n";
import { Button } from "@/components/ui";
import { Logo } from "@/components/logo";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) {
    if (user.role === ROLES.MEMBER) redirect("/portal");
    if (user.role === ROLES.SUPER_ADMIN && user.isPlatformAdmin) redirect("/platform");
    redirect("/dashboard");
  }

  const { t } = await getDictionary();
  const labels = {
    appName: t("appName"),
    appTagline: t("appTagline"),
    signIn: t("signIn"),
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{
          background:
            "radial-gradient(60rem 30rem at 50% -10%, #e6efe9 0%, transparent 70%), radial-gradient(40rem 24rem at 90% 110%, #f6eeda 0%, transparent 70%)",
        }}
      />
      <div className="relative flex w-full max-w-md flex-col items-center text-center">
        <Logo size="lg" />
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-[var(--ink)]">{labels.appName}</h1>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">{labels.appTagline}</p>
        <div className="mt-8 flex w-full flex-col gap-2">
          <Link href="/login" className="w-full">
            <Button className="w-full">{labels.signIn}</Button>
          </Link>
        </div>
        <p className="mt-10 text-[11px] text-[var(--ink-muted)]">
          Local deployment · INR · Asia/Kolkata
        </p>
      </div>
    </main>
  );
}
