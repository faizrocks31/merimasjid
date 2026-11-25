import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { getDictionary } from "@/i18n";
import { Card, CardHeader, CardTitle, CardBody, PageHeader, Button } from "@/components/ui";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PlatformMasjidStep2Form } from "../../masjid-form-step2";

export const dynamic = "force-dynamic";

export default async function NewMasjidStep2Page({ searchParams }: { searchParams: Promise<{ masjidId?: string }> }) {
  const user = await requireUser();
  if (!user || user.role !== ROLES.SUPER_ADMIN || !user.isPlatformAdmin) redirect("/dashboard");

  const params = await searchParams;
  const masjidId = params.masjidId;

  if (!masjidId) {
    redirect("/platform/masjids/new");
  }

  // Verify masjid exists
  const { prisma } = await import("@/lib/db");
  const masjid = await prisma.masjid.findUnique({ where: { id: masjidId }, select: { id: true, name: true } });
  if (!masjid) {
    redirect("/platform/masjids/new");
  }

  const { t } = await getDictionary();

  const labels: Record<string, string> = {
    masjidRegistration: t("masjidRegistration"),
    step1Title: t("step1Title"),
    step2Title: t("step2Title"),
    adminName: t("adminName"),
    adminEmail: t("adminEmail"),
    adminPhone: t("adminPhone"),
    adminPassword: t("adminPassword"),
    confirmPassword: t("confirmPassword"),
    passwordHint: t("passwordHint"),
    registrationComplete: t("registrationComplete"),
    prevStep: t("prevStep"),
    loading: t("loading"),
    createAdmin: t("createAdmin"),
  };

  return (
    <>
      <PageHeader
        title={t("masjidRegistration")}
        description={t("step2Title")}
        actions={
          <Link href="/platform">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
        }
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{t("step2Title")} — {masjid.name}</CardTitle>
        </CardHeader>
        <CardBody>
          <PlatformMasjidStep2Form t={labels} />
        </CardBody>
      </Card>
    </>
  );
}