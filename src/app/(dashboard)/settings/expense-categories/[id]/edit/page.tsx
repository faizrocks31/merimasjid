import { notFound, redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getDictionary } from "@/i18n";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui";
import { ExpenseCategoryFormClient } from "./edit-form";

export const dynamic = "force-dynamic";

export default async function EditExpenseCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireStaff();
  if (!can(user.role, "settings:write")) redirect("/settings");
  const { t } = await getDictionary();
  const { id } = await params;

  const category = await prisma.expenseCategory.findFirst({
    where: { id, masjidId: user.masjidId! },
  });
  if (!category) notFound();

  const labels: Record<string, string> = {
    name: t("name"),
    active: t("active"),
    save: t("save"),
    update: t("update"),
    cancel: t("cancel"),
    loading: t("loading"),
    saved: t("saved"),
  };

  const editingCategory = {
    id: category.id,
    name: category.name,
    active: category.active,
  };

  return (
    <>
      <PageHeader title={`${t("edit")} · ${category.name}`} description={category.active ? t("active") : t("inactive")} />
      <div className="max-w-2xl">
        <ExpenseCategoryFormClient
          labels={labels}
          editingCategory={editingCategory}
        />
      </div>
    </>
  );
}