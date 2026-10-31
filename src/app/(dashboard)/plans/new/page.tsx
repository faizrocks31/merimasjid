import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getDictionary } from "@/i18n";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui";
import { PlanForm } from "./plan-form";

export const dynamic = "force-dynamic";

export default async function NewPlanPage({ searchParams }: { searchParams: Promise<{ memberId?: string }> }) {
  const user = await requireStaff();
  if (!can(user.role, "plan:write")) redirect("/plans");
  const { t } = await getDictionary();
  const params = await searchParams;

  const [members, categories] = await Promise.all([
    prisma.member.findMany({
      where: { masjidId: user.masjidId!, status: "ACTIVE" },
      orderBy: { fullName: "asc" },
      select: { id: true, memberNo: true, fullName: true, phone: true },
      take: 2000,
    }),
    prisma.contributionCategory.findMany({
      where: { masjidId: user.masjidId!, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const labels: Record<string, string> = {
    plans: t("plans"),
    chooseMember: t("chooseMember"),
    searchMember: t("searchMember"),
    category: t("category"),
    frequency: t("frequency"),
    monthly: t("monthly"),
    semiAnnual: t("semiAnnual"),
    annual: t("annual"),
    oneTime: t("oneTime"),
    planAmount: t("planAmount"),
    startDate: t("startDate"),
    dueDate: t("dueDate"),
    dueDay: t("dueDay"),
    graceDays: t("graceDays"),
    optional: t("optional"),
    save: t("save"),
    back: t("back"),
    loading: t("loading"),
  };

  return (
    <>
      <PageHeader title={t("plans")} />
      <div className="max-w-3xl">
        <PlanForm labels={labels} members={members} categories={categories} initialMemberId={params.memberId} />
      </div>
    </>
  );
}
