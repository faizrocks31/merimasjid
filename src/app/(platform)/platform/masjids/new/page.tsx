import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { getDictionary } from "@/i18n";
import { Card, CardHeader, CardTitle, CardBody, PageHeader, Button } from "@/components/ui";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PlatformMasjidStep1Form } from "../masjid-form-step1";

export const dynamic = "force-dynamic";

export default async function NewMasjidPage() {
  const user = await requireUser();
  if (!user || user.role !== ROLES.SUPER_ADMIN || !user.isPlatformAdmin) redirect("/dashboard");

  const { t } = await getDictionary();

  const labels: Record<string, string> = {
    masjidRegistration: t("masjidRegistration"),
    step1Title: t("step1Title"),
    step2Title: t("step2Title"),
    masjidName: t("masjidName"),
    slug: "Slug",
    receiptPrefix: t("receiptPrefix"),
    address: t("address"),
    phone: t("phone"),
    email: t("email"),
    financialYear: t("financialYear"),
    receiptFooter: t("receiptFooter"),
    planSelection: t("planSelection"),
    planTrial: t("planTrial"),
    planStarter: t("planStarter"),
    planProfessional: t("planProfessional"),
    planEnterprise: t("planEnterprise"),
    emailRequired: t("emailRequired"),
    phoneRequiredAdmin: t("phoneRequiredAdmin"),
    nextStep: t("nextStep"),
    loading: t("loading"),
  };

  return (
    <>
      <PageHeader
        title={t("masjidRegistration")}
        description="Create a new masjid on the platform in two steps"
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
          <CardTitle>{t("step1Title")}</CardTitle>
        </CardHeader>
        <CardBody>
          <PlatformMasjidStep1Form t={labels} />
        </CardBody>
      </Card>
    </>
  );
}