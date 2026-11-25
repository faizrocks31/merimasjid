import { notFound, redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getDictionary } from "@/i18n";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui";
import { EditMemberForm } from "./edit-form";

export const dynamic = "force-dynamic";

export default async function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaff();
  if (!can(user.role, "member:write")) redirect("/members");
  const { t } = await getDictionary();
  const { id } = await params;

  const member = await prisma.member.findFirst({ where: { id, masjidId: user.masjidId! } });
  if (!member) notFound();

  const labels: Record<string, string> = {
    memberProfile: t("edit"),
    name: t("name"),
    phone: t("phone"),
    alternateMobile: t("alternateMobile"),
    email: t("email"),
    address: t("address"),
    startDate: t("startDate"),
    status: t("status"),
    active: t("active"),
    inactive: t("inactive"),
    notes: t("notes"),
    optional: t("optional"),
    save: t("save"),
    back: t("back"),
    loading: t("loading"),
  };

  return (
    <>
      <PageHeader title={`${t("edit")} · ${member.fullName}`} description={member.memberNo} />
      <div className="max-w-3xl">
        <EditMemberForm
          member={{
            id: member.id,
            fullName: member.fullName,
            fatherName: member.fatherName,
            phone: member.phone,
            alternatePhone: member.alternatePhone,
            email: member.email,
            address: member.address,
            joinDate: member.joinDate.toISOString(),
            status: member.status,
            notes: member.notes,
            idempotencyKey: member.idempotencyKey,
          }}
          labels={labels}
        />
      </div>
    </>
  );
}
