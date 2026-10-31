import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { getDictionary } from "@/i18n";
import { prisma } from "@/lib/db";
import { Card, CardBody, CardHeader, CardTitle, PageHeader, StatCard, EmptyState, Button, Badge } from "@/components/ui";
import { PlusCircle, Building2, Eye, Settings, PauseCircle, PlayCircle, Trash2, XCircle } from "lucide-react";
import Link from "next/link";
import { MasjidActions } from "./platform-masjid-actions";
import { getSubscriptionStatusLabel } from "@/lib/subscription";
import { getSubscriptionTone, type SubscriptionStatus } from "@/lib/subscription-plans";

export const dynamic = "force-dynamic";

export default async function PlatformDashboard() {
  const user = await requireUser();
  if (!user) redirect("/login");
  if (user.role !== ROLES.SUPER_ADMIN || !user.isPlatformAdmin) redirect("/dashboard");

  const { t } = await getDictionary();

  const masjids = await prisma.masjid.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { users: true, members: true, payments: true },
      },
    },
  });

  return (
    <>
      <PageHeader
        title="Masjids"
        description="Manage all masjids on the platform"
        actions={
          <Link href="/platform/masjids/new">
            <Button size="sm">
              <PlusCircle className="h-4 w-4" /> Add Masjid
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
        <StatCard label="Total Masjids" value={String(masjids.length)} tone="brand" />
        <StatCard label="Active" value={String(masjids.filter(m => m.status === "ACTIVE").length)} tone="success" />
        <StatCard label="Suspended" value={String(masjids.filter(m => m.status === "SUSPENDED").length)} tone="warning" />
        <StatCard label="Total Members" value={String(masjids.reduce((sum, m) => sum + m._count.members, 0))} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Masjids</CardTitle>
        </CardHeader>
        {masjids.length === 0 ? (
          <EmptyState
            title="No masjids yet"
            description="Create your first masjid to get started"
            action={<Link href="/platform/masjids/new"><Button>Add Masjid</Button></Link>}
          />
        ) : (
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-start text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">
                    <th className="px-5 py-3 text-start font-medium">Masjid</th>
                    <th className="px-3 py-3 text-start font-medium">Prefix</th>
                    <th className="px-3 py-3 text-start font-medium">Members</th>
                    <th className="px-3 py-3 text-start font-medium">Staff</th>
                    <th className="px-3 py-3 text-start font-medium">Payments</th>
                    <th className="px-3 py-3 text-start font-medium">Status</th>
                    <th className="px-3 py-3 text-start font-medium">Subscription</th>
                    <th className="px-5 py-3 text-end font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {masjids.map((m) => (
                    <tr key={m.id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface)]">
                      <td className="px-5 py-3">
                        <div>
                          <p className="font-medium text-[var(--ink)]">{m.name}</p>
                          <p className="text-[11px] text-[var(--ink-muted)]">{m.address ?? "No address"}</p>
                          <p className="text-[11px] text-[var(--ink-muted)]">{m.slug}</p>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-mono text-[var(--brand)]">{m.receiptPrefix}</span>
                      </td>
                      <td className="px-3 py-3 text-[var(--ink)]">{m._count.members}</td>
                      <td className="px-3 py-3 text-[var(--ink)]">{m._count.users}</td>
                      <td className="px-3 py-3 text-[var(--ink)]">{m._count.payments}</td>
                      <td className="px-3 py-3">
                        <Badge tone={m.status === "ACTIVE" ? "success" : "warning"}>
                          {m.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">
                        <Badge tone={getSubscriptionTone(m.subscriptionStatus)}>
                          {getSubscriptionStatusLabel((m.subscriptionStatus ?? "TRIAL") as any as SubscriptionStatus)}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-end">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/platform/masjids/${m.id}`}
                            className="text-[var(--brand)] hover:underline text-sm"
                            title="View details"
                          >
                            <Eye className="h-4 w-4 inline" />
                          </Link>

                          <MasjidActions masjidId={m.id} status={m.status} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        )}
      </Card>
    </>
  );
}