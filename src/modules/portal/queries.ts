import "server-only";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";

/**
 * The member portal only ever reads the signed-in member's own row.
 * The member id comes from the session-resolved user, never the URL.
 */
export async function requirePortalMember() {
  const user = await requireUser();
  if (user.role !== ROLES.MEMBER || !user.memberId || !user.masjidId) notFound();

  const member = await prisma.member.findFirst({
    where: { id: user.memberId, masjidId: user.masjidId },
    include: {
      masjid: {
        select: {
          name: true,
          address: true,
          phone: true,
          email: true,
          fajrTime: true,
          sunriseTime: true,
          dhuhrTime: true,
          asrTime: true,
          maghribTime: true,
          ishaTime: true,
          jummahTime: true,
          prayerTimesUpdatedAt: true,
        }
      }
    },
  });
  if (!member) notFound();
  return { user, member };
}

export async function portalSummary(memberId: string, masjidId: string) {
  const [periods, payments] = await Promise.all([
    prisma.duesPeriod.findMany({
      where: { memberId, masjidId },
      include: {
        plan: { include: { category: { select: { name: true } } } },
        allocations: { where: { payment: { status: "SUCCESS" } }, select: { allocatedAmountPaise: true } },
      },
      orderBy: { dueDate: "asc" },
    }),
    prisma.payment.findMany({
      where: { donorMemberId: memberId, masjidId },
      orderBy: { paymentDate: "desc" },
      take: 100,
      include: { allocations: { include: { category: { select: { name: true } } } } },
    }),
  ]);

  const open = periods
    .filter((p) => p.status === "PENDING" || p.status === "PARTIAL")
    .map((p) => {
      const allocated = p.allocations.reduce((s, a) => s + a.allocatedAmountPaise, 0);
      return { ...p, allocatedPaise: allocated, outstandingPaise: Math.max(p.expectedAmountPaise - allocated, 0) };
    })
    .filter((p) => p.outstandingPaise > 0);

  const outstandingPaise = open.reduce((s, p) => s + p.outstandingPaise, 0);
  const paidPaise = payments
    .filter((p) => p.status === "SUCCESS")
    .reduce((s, p) => s + p.amountPaise, 0);
  const nextDue = open[0] ?? null;

  return { periods, open, outstandingPaise, paidPaise, payments, nextDue };
}
