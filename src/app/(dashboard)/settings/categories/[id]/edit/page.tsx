import { notFound, redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getDictionary } from "@/i18n";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui";
import { ContributionCategoryFormClient } from "./edit-form";

export const dynamic = "force-dynamic";

export default async function EditContributionCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireStaff();
  if (!can(user.role, "settings:write")) redirect("/settings");
  const { t } = await getDictionary();
  const { id } = await params;

  const category = await prisma.contributionCategory.findFirst({
    where: { id, masjidId: user.masjidId! },
  });
  if (!category) notFound();

  const labels: Record<string, string> = {
    name: t("name"),
    code: t("code"),
    restrictedPurpose: t("restrictedPurpose"),
    reportingGroup: t("reportingGroup"),
    save: t("save"),
    update: t("update"),
    cancel: t("cancel"),
    loading: t("loading"),
    saved: t("saved"),
  };

  const editingCategory = {
    id: category.id,
    name: category.name,
    code: category.code,
    restrictedPurpose: category.restrictedPurpose,
    reportingGroup: category.reportingGroup,
  };

  return (
    <>
      <PageHeader title={`${t("edit")} · ${category.name}`} description={category.code} />
      <div className="max-w-2xl">
        <ContributionCategoryFormClient
          labels={labels}
          editingCategory={editingCategory}
        />
      </div>
    </>
  );
}