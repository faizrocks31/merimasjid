import { requireStaff } from "@/lib/auth";
import { getDictionary } from "@/i18n";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { MemberForm } from "./member-form";

export const dynamic = "force-dynamic";

export default async function NewMemberPage() {
  const user = await requireStaff();
  if (!can(user.role, "member:write")) redirect("/members");
  const { t } = await getDictionary();

  const labels: Record<string, string> = {
    memberProfile: t("memberProfile"),
    fullName: t("fullName"),
    fatherName: t("fatherName"),
    phone: t("phone"),
    alternateMobile: t("alternateMobile"),
    email: t("email"),
    address: t("address"),
    joinDate: t("joinDate"),
    status: t("status"),
    active: t("active"),
    inactive: t("inactive"),
    save: t("save"),
    back: t("back"),
    loading: t("loading"),
  };

  return (
    <>
      <PageHeader title={t("newMember")} description={t("memberProfile")} />
      <div className="max-w-3xl">
        <MemberForm labels={labels} />
      </div>
    </>
  );
}
