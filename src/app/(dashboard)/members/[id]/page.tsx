import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, HandCoins, Phone, MapPin, CalendarDays, UserRound } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { getDictionary } from "@/i18n";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { formatPaise } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/dates";
import { Button, Card, CardBody, CardHeader, CardTitle, EmptyState, PageHeader, Badge } from "@/components/ui";
import { MemberStatusBadge, PaymentStatusBadge, PeriodStatusBadge } from "@/components/status-badges";
import { FREQUENCY_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function MemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaff();
  const { t } = await getDictionary();
  const { id } = await params;

  // Tenant isolation: the member must belong to the signed-in user's Masjid.
  const member = await prisma.member.findFirst({
    where: { id, masjidId: user.masjidId! },
    include: {
      user: true,
      plans: { include: { category: true }, orderBy: { createdAt: "desc" } },
      payments: { orderBy: { paymentDate: "desc" }, take: 50 },
      duesPeriods: {
        include: {
          plan: { include: { category: true } },
          allocations: { where: { payment: { status: "SUCCESS" } }, select: { allocatedAmountPaise: true } },
        },
        orderBy: { dueDate: "asc" },
      },
    },
  });

  if (!member) notFound();

  const outstanding = member.duesPeriods.reduce((sum, p) => {
    if (p.status === "WAIVED") return sum;
    const allocated = p.allocations.reduce((s, a) => s + a.allocatedAmountPaise, 0);
    return sum + Math.max(p.expectedAmountPaise - allocated, 0);
  }, 0);

  const totalPaid = member.payments
    .filter((p) => p.status === "SUCCESS")
    .reduce((s, p) => s + p.amountPaise, 0);

  return (
    <>
      <div className="mb-4">
        <Link href="/members" className="inline-flex items-center gap-1 text-xs text-[var(--ink-muted)] hover:text-[var(--ink)]">
          <ArrowLeft className="h-3.5 w-3.5" /> {t("members")}
        </Link>
      </div>

      <PageHeader
        title={member.fullName}
        description={`${member.memberNo}${member.fatherName ? ` · s/o ${member.fatherName}` : ""}`}
        actions={
          <>
            {can(user.role, "member:write") ? (
              <Link href={`/members/${member.id}/edit`}>
                <Button variant="secondary" size="sm">{t("edit")}</Button>
              </Link>
            ) : null}
            {can(user.role, "payment:create") ? (
              <Link href={`/collections/new?memberId=${member.id}`}>
                <Button size="sm"><HandCoins className="h-4 w-4" /> {t("newPayment")}</Button>
              </Link>
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>{t("profile")}</CardTitle><MemberStatusBadge status={member.status} /></CardHeader>
            <CardBody className="space-y-3 text-sm">
              <div className="flex items-start gap-2.5">
                <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ink-muted)]" />
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">{t("memberNo")}</p>
                  <p className="num">{member.memberNo}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ink-muted)]" />
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">{t("phone")}</p>
                  <p className="num">{member.phone ?? "—"}</p>
                  {member.alternatePhone ? <p className="num text-xs text-[var(--ink-muted)]">{member.alternatePhone}</p> : null}
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ink-muted)]" />
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">{t("address")}</p>
                  <p className="whitespace-pre-line">{member.address ?? "—"}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ink-muted)]" />
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">{t("startDate")}</p>
                  <p className="num">{formatDate(member.joinDate)}</p>
                </div>
              </div>
              {member.notes ? (
                <div className="border-t border-[var(--border-subtle)] pt-3">
                  <p className="text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">{t("notes")}</p>
                  <p className="whitespace-pre-line text-xs">{member.notes}</p>
                </div>
              ) : null}
              {member.userId ? <Badge tone="brand">{t("portalAccount")}</Badge> : null}
              {can(user.role, "member:view-credentials") && member.userId ? (
                <div className="border-t border-[var(--border-subtle)] pt-3">
                  <p className="text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">{t("portalCredentials")}</p>
                  <p className="text-xs text-[var(--ink)]">Email: {member.user?.email ?? "—"}</p>
                  <p className="text-xs text-[var(--ink-muted)]">Password: (hidden - reset via admin panel)</p>
                </div>
              ) : null}
            </CardBody>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Card><CardBody className="py-3">
              <p className="text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">{t("total")} {t("paid")}</p>
              <p className="num mt-1 text-lg font-semibold text-[var(--success)]">{formatPaise(totalPaid)}</p>
            </CardBody></Card>
            <Card><CardBody className="py-3">
              <p className="text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">{t("outstandingDues")}</p>
              <p className={`num mt-1 text-lg font-semibold ${outstanding > 0 ? "text-[var(--warning)]" : "text-[var(--ink)]"}`}>
                {formatPaise(outstanding)}
              </p>
            </CardBody></Card>
          </div>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("plans")}</CardTitle>
              {can(user.role, "plan:write") ? (
                <Link href={`/plans/new?memberId=${member.id}`} className="text-[11px] font-medium text-[var(--brand)] hover:underline">
                  + {t("plans")}
                </Link>
              ) : null}
            </CardHeader>
            {member.plans.length === 0 ? (
              <EmptyState title={t("noPlan")} />
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {member.plans.map((plan) => {
                  const planPeriods = member.duesPeriods.filter((p) => p.planId === plan.id);
                  const paid = planPeriods.filter((p) => p.status === "PAID").length;
                  return (
                    <div key={plan.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                      <div>
                        <p className="text-sm font-medium">{plan.category.name}</p>
                        <p className="text-[11px] text-[var(--ink-muted)]">
                          {FREQUENCY_LABELS[plan.frequency]} · {t("dueDay")} {plan.dueDay} · {t("startDate")} {formatDate(plan.startDate)}
                        </p>
                      </div>
                      <div className="text-end">
                        <p className="num text-sm font-semibold">{formatPaise(plan.amountPaise)}</p>
                        <p className="text-[11px] text-[var(--ink-muted)]">{paid}/{planPeriods.length} {t("paid").toLowerCase()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader><CardTitle>{t("dues")}</CardTitle></CardHeader>
            {member.duesPeriods.length === 0 ? (
              <EmptyState title={t("noData")} />
            ) : (
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[var(--surface-raised)]">
                    <tr className="border-b border-[var(--border-subtle)] text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">
                      <th className="px-5 py-2 text-start font-medium">{t("periodCovered")}</th>
                      <th className="px-3 py-2 text-start font-medium">{t("dueDate")}</th>
                      <th className="px-3 py-2 text-end font-medium">{t("expected")}</th>
                      <th className="px-5 py-2 text-end font-medium">{t("status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {member.duesPeriods.map((p) => (
                      <tr key={p.id} className="border-b border-[var(--border-subtle)] last:border-0">
                        <td className="num px-5 py-2">{formatDate(p.periodStart)} – {formatDate(p.periodEnd)}</td>
                        <td className="num px-3 py-2 text-[var(--ink-muted)]">{formatDate(p.dueDate)}</td>
                        <td className="num px-3 py-2 text-end">{formatPaise(p.expectedAmountPaise)}</td>
                        <td className="px-5 py-2 text-end"><PeriodStatusBadge status={p.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader><CardTitle>{t("paymentTimeline")}</CardTitle></CardHeader>
            {member.payments.length === 0 ? (
              <EmptyState title={t("noData")} />
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {member.payments.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                    <div className="min-w-0">
                      <Link href={`/receipts/${p.id}`} className="num text-sm font-medium text-[var(--brand)] hover:underline">
                        {p.receiptNo}
                      </Link>
                      <p className="num text-[11px] text-[var(--ink-muted)]">
                        {formatDateTime(p.createdAt)} · {p.mode}
                        {p.referenceNo ? ` · ${p.referenceNo}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="num text-sm font-semibold">{formatPaise(p.amountPaise)}</span>
                      <PaymentStatusBadge status={p.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
