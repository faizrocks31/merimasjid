import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getDictionary } from "@/i18n";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { Button } from "@/components/ui";
import { MembersPageClient } from "./members-client";

export const dynamic = "force-dynamic";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; size?: string }>;
}) {
  const user = await requireStaff();
  const { t } = await getDictionary();
  const params = await searchParams;
  const status = params.status === "INACTIVE" ? "INACTIVE" : params.status === "ACTIVE" ? "ACTIVE" : undefined;

  // Fetch ALL active members (with dues info) for client-side search
  // Similar to collections/new page - load upfront, filter client-side
  const [members, total] = await Promise.all([
    prisma.member.findMany({
      where: { masjidId: user.masjidId!, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 2000,
      include: {
        _count: { select: { payments: true } },
        duesPeriods: {
          where: { status: { in: ["PENDING", "PARTIAL"] } },
          select: { expectedAmountPaise: true, allocations: { where: { payment: { status: "SUCCESS" } }, select: { allocatedAmountPaise: true } } },
        },
      },
    }),
    prisma.member.count({ where: { masjidId: user.masjidId!, status: "ACTIVE" } }),
  ]);

  // Transform members for client component
  const memberOptions = members.map((m) => {
    const outstanding = m.duesPeriods.reduce((sum, p) => {
      const allocated = p.allocations.reduce((s, a) => s + a.allocatedAmountPaise, 0);
      return sum + Math.max(p.expectedAmountPaise - allocated, 0);
    }, 0);
    return {
      id: m.id,
      memberNo: m.memberNo,
      fullName: m.fullName,
      phone: m.phone,
      fatherName: m.fatherName,
      status: m.status,
      joinDate: m.joinDate.toISOString().split("T")[0],
      outstanding,
    };
  });

  // Default pagination values (client will handle actual pagination)
  const defaultPage = 1;
  const defaultPageSize = 10;
  const totalPages = Math.max(1, Math.ceil(memberOptions.length / defaultPageSize));

  return (
    <>
      <MembersPageClient
        labels={{
          members: t("members"),
          newMember: t("newMember"),
          searchMember: t("searchMember"),
          status: t("status"),
          viewAll: t("viewAll"),
          noResults: t("noResults"),
          searchMembers: t("searchMembers"),
          memberNo: t("memberNo"),
          name: t("name"),
          phone: t("phone"),
          date: t("date"),
          dues: t("dues"),
          active: t("active"),
          inactive: t("inactive"),
          show: t("show"),
          perPage: t("perPage"),
          back: t("back"),
        }}
        initialMembers={memberOptions}
        total={total}
        canWrite={can(user.role, "member:write")}
        initialStatusFilter={status ?? ""}
        initialPage={defaultPage}
        initialPageSize={defaultPageSize}
        totalPages={totalPages}
        isSearching={false}
      />
    </>
  );
}