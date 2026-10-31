import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { getDictionary } from "@/i18n";
import { Card, CardHeader, CardTitle, PageHeader } from "@/components/ui";
import { AddStaffForm } from "./staff-forms";
import { StaffList } from "./staff-list";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const user = await requireStaff();
  if (!can(user.role, "staff:manage")) redirect("/dashboard");
  const { t } = await getDictionary();

  const memberships = await prisma.masjidUser.findMany({
    where: { masjidId: user.masjidId! },
    include: { user: { select: { id: true, name: true, email: true, lastLoginAt: true, status: true } } },
    orderBy: { createdAt: "asc" },
  });

  const labels: Record<string, string> = {
    name: t("name"),
    email: t("email"),
    password: t("password"),
    phone: t("phone"),
    upiId: t("upiId"),
    role: t("role"),
    roleAdmin: t("roleAdmin"),
    roleCollector: t("roleCollector"),
    roleAuditor: t("roleAuditor"),
    roleSuperAdmin: t("roleSuperAdmin"),
    save: t("save"),
    loading: t("loading"),
    saved: t("saved"),
    addStaff: t("addStaff"),
    activeStaff: t("activeStaff"),
    inactiveStaff: t("inactiveStaff"),
    remove: t("remove"),
    deactivateStaff: t("deactivateStaff"),
    deactivateStaffHint: t("deactivateStaffHint"),
    reactivate: t("reactivate"),
    yesRemove: t("yesRemove"),
    cancel: t("cancel"),
    neverSignedIn: t("neverSignedIn"),
    lastSignIn: t("lastSignIn"),
    you: t("you"),
    active: t("active"),
    inactive: t("inactive"),
    phoneRequired: t("phoneRequired"),
    upiIdHint: t("upiIdHint"),
    newStaffAccount: t("newStaffAccount"),
  };

  const roleLabels: Record<string, string> = {
    SUPER_ADMIN: t("roleSuperAdmin"),
    ADMIN: t("roleAdmin"),
    COLLECTOR: t("roleCollector"),
    AUDITOR: t("roleAuditor"),
  };

  // For Staff page: read-only list (no actions), filter out SUPER_ADMIN
  const readOnlyMembers = memberships
    .filter((m) => m.role !== "SUPER_ADMIN")
    .map((m) => ({
      id: m.id,
      user: {
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        lastLoginAt: m.user.lastLoginAt?.toISOString() ?? null,
      },
      role: m.role,
      status: m.status as "ACTIVE" | "INACTIVE",
      isSelf: m.user.id === user.id,
    }));

  return (
    <>
      <PageHeader title={t("staff")} description={t("appTagline")} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <CardHeader>
            <CardTitle>{t("staffList")}</CardTitle>
          </CardHeader>
          <StaffList
            members={readOnlyMembers}
            labels={labels}
            roleLabels={roleLabels}
            readOnly={true}
          />
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("addStaff")}</CardTitle></CardHeader>
          <AddStaffForm labels={labels} />
        </Card>
      </div>
    </>
  );
}