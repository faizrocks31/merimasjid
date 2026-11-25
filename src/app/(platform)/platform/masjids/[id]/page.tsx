import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { getDictionary } from "@/i18n";
import { prisma } from "@/lib/db";
import { Card, CardHeader, CardTitle, CardBody, PageHeader, Badge, Button } from "@/components/ui";
import { Building2, Mail, Phone, MapPin, Users, Calendar, Edit, Trash2, PauseCircle, PlayCircle, CreditCard, Clock, AlertCircle, CheckCircle, XCircle, Lock } from "lucide-react";
import Link from "next/link";
import { MasjidActions } from "../../platform-masjid-actions";
import { SUBSCRIPTION_PLANS, type SubscriptionPlanCode, getSubscriptionTone, SUBSCRIPTION_STATUS_LABELS } from "@/lib/subscription-plans";

export const dynamic = "force-dynamic";

export default async function MasjidDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) redirect("/login");
  if (user.role !== ROLES.SUPER_ADMIN || !user.isPlatformAdmin) redirect("/dashboard");

  const { id } = await params;
  const { t } = await getDictionary();

  const masjid = await prisma.masjid.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          users: true,
          members: true,
          payments: true,
          collectionDefinitions: true,
          expenseCategories: true,
          plans: true
        },
      },
      users: {
        include: { user: { select: { id: true, name: true, email: true, lastLoginAt: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!masjid) redirect("/platform");

  return (
    <>
      <PageHeader
        title={masjid.name}
        description={masjid.slug}
        actions={
          <div className="flex gap-2">
            <Link href={`/platform/masjids/${masjid.id}/edit`}>
              <Button variant="secondary" size="sm">
                <Edit className="h-4 w-4" /> Edit
              </Button>
            </Link>
            <MasjidActions masjidId={masjid.id} status={masjid.status} />
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--ink-muted)]">Status</CardTitle>
          </CardHeader>
          <CardBody>
            <Badge tone={masjid.status === "ACTIVE" ? "success" : "warning"} className="text-base">
              {masjid.status}
            </Badge>
          </CardBody>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--ink-muted)]">Receipt Prefix</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="font-mono text-[var(--brand)] text-lg">{masjid.receiptPrefix}</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--ink-muted)]">Members</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-2xl font-semibold">{masjid._count.members}</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--ink-muted)]">Staff</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-2xl font-semibold">{masjid._count.users}</p>
          </CardBody>
        </Card>
      </div>

      {/* Subscription Detail Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription
            </CardTitle>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">Plan</p>
              <p className="font-semibold text-lg">
                {masjid.subscriptionStatus && SUBSCRIPTION_PLANS[masjid.subscriptionStatus as SubscriptionPlanCode]
                  ? SUBSCRIPTION_PLANS[masjid.subscriptionStatus as SubscriptionPlanCode].name
                  : "—"
                }
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">Status</p>
              <p className="font-semibold text-lg">
                <Badge tone={masjid.subscriptionStatus ? getSubscriptionTone(masjid.subscriptionStatus) : "trial"} className="text-base">
                  {masjid.subscriptionStatus ? SUBSCRIPTION_STATUS_LABELS[masjid.subscriptionStatus as keyof typeof SUBSCRIPTION_STATUS_LABELS] : "—"}
                </Badge>
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">Ends At</p>
              <p className="font-semibold text-lg">
                {masjid.subscriptionEndsAt ? new Date(masjid.subscriptionEndsAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">Monthly</p>
              <p className="font-semibold text-lg">
                {masjid.subscriptionStatus && SUBSCRIPTION_PLANS[masjid.subscriptionStatus as SubscriptionPlanCode]
                  ? `₹${(SUBSCRIPTION_PLANS[masjid.subscriptionStatus as SubscriptionPlanCode].priceMonthlyPaise / 100).toLocaleString()}`
                  : "—"
                }
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border-subtle)]">
            <p className="text-[11px] uppercase tracking-wide text-[var(--ink-muted)] mb-3">Limits & Usage</p>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--ink-muted)]">Members</span>
                  <span className="font-medium">
                    {masjid._count.members} / {masjid.maxMembers ?? "—"}
                  </span>
                </div>
                <div className="h-2 bg-[var(--surface)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--brand)] transition-all"
                    style={{
                      width: `${masjid.maxMembers ? Math.min(100, (masjid._count.members / masjid.maxMembers) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--ink-muted)]">Staff</span>
                  <span className="font-medium">
                    {masjid._count.users} / {masjid.maxStaff ?? "—"}
                  </span>
                </div>
                <div className="h-2 bg-[var(--surface)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--brand)] transition-all"
                    style={{
                      width: `${masjid.maxStaff ? Math.min(100, (masjid._count.users / masjid.maxStaff) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--ink-muted)]">Collection Definitions</span>
                  <span className="font-medium">
                    {masjid._count.collectionDefinitions} / {masjid.maxCategories ?? "—"}
                  </span>
                </div>
                <div className="h-2 bg-[var(--surface)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--brand)] transition-all"
                    style={{
                      width: `${masjid.maxCategories ? Math.min(100, (masjid._count.collectionDefinitions / masjid.maxCategories) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {masjid.subscriptionStatus && (
            <div className="pt-4 border-t border-[var(--border-subtle)] space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">Features</p>
              <div className="flex flex-wrap gap-2">
                {masjid.subscriptionStatus && SUBSCRIPTION_PLANS[masjid.subscriptionStatus as SubscriptionPlanCode] && (
                  <>
                    {Object.entries(SUBSCRIPTION_PLANS[masjid.subscriptionStatus as SubscriptionPlanCode].features).map(([key, enabled]) => (
                      <Badge key={key} tone={enabled ? "success" : "neutral"} className="gap-1">
                        {enabled ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </Badge>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Details</CardTitle>
              <Link href={`/platform/masjids/${masjid.id}/edit`}>
                <Button variant="ghost" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            <dl className="grid gap-2 md:grid-cols-2 text-sm">
              <dt className="text-[var(--ink-muted)]">Name</dt>
              <dd className="font-medium">{masjid.name}</dd>
              <dt className="text-[var(--ink-muted)]">Slug</dt>
              <dd className="font-mono">{masjid.slug}</dd>
              <dt className="text-[var(--ink-muted)]">Address</dt>
              <dd className="md:col-span-2">{masjid.address ?? "—"}</dd>
              <dt className="text-[var(--ink-muted)]">Phone</dt>
              <dd>{masjid.phone ?? "—"}</dd>
              <dt className="text-[var(--ink-muted)]">Email</dt>
              <dd>{masjid.email ?? "—"}</dd>
              <dt className="text-[var(--ink-muted)]">Financial Year Start</dt>
              <dd>
                {new Date(2000, masjid.financialYearStartMonth - 1).toLocaleString("en", { month: "long" })}
              </dd>
              <dt className="text-[var(--ink-muted)]">Timezone</dt>
              <dd>{masjid.timezone}</dd>
              <dt className="text-[var(--ink-muted)]">Currency</dt>
              <dd>{masjid.currency}</dd>
              <dt className="text-[var(--ink-muted)]">Receipt Footer</dt>
              <dd className="md:col-span-2 text-[var(--ink-muted)] text-sm">{masjid.receiptFooter}</dd>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Counts</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <dl className="grid gap-2 md:grid-cols-2 text-sm">
              <dt className="text-[var(--ink-muted)]">Collection Definitions</dt>
              <dd className="font-medium">{masjid._count.collectionDefinitions}</dd>
              <dt className="text-[var(--ink-muted)]">Expense Categories</dt>
              <dd className="font-medium">{masjid._count.expenseCategories}</dd>
              <dt className="text-[var(--ink-muted)]">Contribution Plans</dt>
              <dd className="font-medium">{masjid._count.plans}</dd>
              <dt className="text-[var(--ink-muted)]">Payments</dt>
              <dd className="font-medium">{masjid._count.payments}</dd>
            </dl>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Staff</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-start text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">
                  <th className="px-5 py-3 text-start font-medium">Name</th>
                  <th className="px-3 py-3 text-start font-medium">Email</th>
                  <th className="px-3 py-3 text-start font-medium">Role</th>
                  <th className="px-3 py-3 text-start font-medium">Status</th>
                  <th className="px-3 py-3 text-start font-medium">Last Login</th>
                </tr>
              </thead>
              <tbody>
                {masjid.users.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-[var(--ink-muted)]" colSpan={5}>
                      No staff members
                    </td>
                  </tr>
                ) : (
                  masjid.users.map((mu) => (
                    <tr key={mu.id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface)]">
                      <td className="px-5 py-3 font-medium">{mu.user.name}</td>
                      <td className="px-3 py-3 text-[var(--ink-muted)]">{mu.user.email}</td>
                      <td className="px-3 py-3">
                        <Badge tone={mu.role === "ADMIN" ? "brand" : mu.role === "SUPER_ADMIN" ? "warning" : "neutral"}>
                          {mu.role}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">
                        <Badge tone={mu.status === "ACTIVE" ? "success" : "neutral"}>{mu.status}</Badge>
                      </td>
                      <td className="px-3 py-3 text-[var(--ink-muted)]">
                        {mu.user.lastLoginAt
                          ? new Date(mu.user.lastLoginAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "Never"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </>
  );
}