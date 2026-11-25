import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { COLLECTION_FREQUENCY } from "@/lib/constants";
import { formatPeriodLabel } from "@/lib/dates";

// Force dynamic rendering - this route requires DATABASE_URL at runtime
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ periodKey: string }> }
) {
  try {
    const user = await requireStaff();
    if (!can(user.role, "collection:read")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const masjidId = user.masjidId!;
    const { periodKey } = await params;

    const { searchParams } = new URL(request.url);
    const collectionId = searchParams.get("collectionId");
    const year = searchParams.get("year");
    const search = searchParams.get("search");
    const memberStatus = searchParams.get("memberStatus");

    if (!collectionId || !year) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // Verify collection belongs to this masjid
    const collection = await prisma.collectionDefinition.findFirst({
      where: { id: collectionId, masjidId, active: true },
      select: {
        id: true,
        name: true,
        frequency: true,
        amountType: true,
        defaultAmountPaise: true,
        memberAssignment: true,
        dueGeneration: true,
        settlementPolicy: true,
        baseCategory: { select: { name: true, code: true } },
        subcategory: { select: { name: true, code: true } },
      },
    });

    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    // Build year boundaries
    const yearStart = new Date(`${year}-01-01`);
    const yearEnd = new Date(`${parseInt(year) + 1}-01-01`);

    // Parse periodKey to determine what to fetch
    // Format: month-YYYY-MM, quarter-YYYY-Q, semiannual-YYYY-H, annual-YYYY, event-{eventId}, onetime-{periodId}, week-YYYY-W
    const [periodType, ...keyParts] = periodKey.split("-");

    // Build query for dues periods
    const where: any = {
      masjidId,
      collectionDefinitionId: collectionId,
    };

    if (periodKey.startsWith("month-")) {
      // month-YYYY-MM
      const [, yearStr, monthStr] = periodKey.split("-");
      const month = parseInt(monthStr) - 1; // 0-indexed
      const periodStart = new Date(`${yearStr}-${String(month + 1).padStart(2, "0")}-01`);
      const periodEnd = new Date(periodStart.getFullYear(), month + 1, 0);
      where.periodStart = { gte: periodStart, lt: new Date(periodEnd.getTime() + 1) };
    } else if (periodKey.startsWith("quarter-")) {
      // quarter-YYYY-Q
      const [, yearStr, quarterStr] = periodKey.split("-");
      const quarter = parseInt(quarterStr);
      const startMonth = (quarter - 1) * 3;
      const periodStart = new Date(`${yearStr}-${String(startMonth + 1).padStart(2, "0")}-01`);
      const periodEnd = new Date(periodStart.getFullYear(), startMonth + 3, 0);
      where.periodStart = { gte: periodStart, lt: new Date(periodEnd.getTime() + 1) };
    } else if (periodKey.startsWith("semiannual-")) {
      // semiannual-YYYY-H
      const [, yearStr, halfStr] = periodKey.split("-");
      const half = parseInt(halfStr);
      const startMonth = half === 0 ? 0 : 6;
      const periodStart = new Date(`${yearStr}-${String(startMonth + 1).padStart(2, "0")}-01`);
      const periodEnd = new Date(periodStart.getFullYear(), startMonth + 6, 0);
      where.periodStart = { gte: periodStart, lt: new Date(periodEnd.getTime() + 1) };
    } else if (periodKey.startsWith("annual-")) {
      // annual-YYYY
      const [, yearStr] = periodKey.split("-");
      const periodStart = new Date(`${yearStr}-01-01`);
      const periodEnd = new Date(`${parseInt(yearStr) + 1}-01-01`);
      where.periodStart = { gte: periodStart, lt: periodEnd };
    } else if (periodKey.startsWith("week-")) {
      // week-YYYY-W
      const [, yearStr, weekStr] = periodKey.split("-");
      const week = parseInt(weekStr);
      const yearNum = parseInt(yearStr);
      // Approximate: find the first day of the year, add weeks
      const periodStart = new Date(`${yearStr}-01-01`);
      periodStart.setDate(periodStart.getDate() + (week - 1) * 7);
      const periodEnd = new Date(periodStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      where.periodStart = { gte: periodStart, lt: periodEnd };
    } else if (periodKey.startsWith("event-")) {
      // event-{eventId}
      const eventId = periodKey.replace("event-", "");
      where.collectionEventId = eventId;
    } else if (periodKey.startsWith("onetime-")) {
      // onetime-{periodId}
      where.id = periodKey.replace("onetime-", "");
    } else if (periodKey.startsWith("period-")) {
      // period-{periodId}
      where.id = periodKey.replace("period-", "");
    } else {
      // Default: use year boundaries
      const yearStart = new Date(`${year}-01-01`);
      const yearEnd = new Date(`${parseInt(year) + 1}-01-01`);
      where.periodStart = { gte: yearStart, lt: yearEnd };
    }

    // Get all dues periods for this period
    const duesPeriods = await prisma.duesPeriod.findMany({
      where,
      include: {
        member: {
          select: {
            id: true,
            fullName: true,
            memberNo: true,
            status: true,
          },
        },
      },
      orderBy: { periodStart: "asc" },
    });

    // Get member details with payment info
    const members: Array<{
      memberId: string;
      memberName: string;
      memberNo: string;
      memberStatus: string;
      periodId: string;
      periodStart: string;
      periodEnd: string;
      dueDate: string;
      expectedAmountPaise: number;
      paidAmountPaise: number;
      outstandingAmountPaise: number;
      status: "PAID" | "PENDING" | "PARTIAL";
      periodLabel: string;
    }> = [];

    for (const period of duesPeriods) {
      if (!period.member) continue;

      // Calculate paid amount
      const payments = await prisma.paymentAllocation.findMany({
        where: { duesPeriodId: period.id },
        select: { allocatedAmountPaise: true },
      });

      const paidAmount = payments.reduce((sum, p) => sum + p.allocatedAmountPaise, 0);

      let periodStatus: "PAID" | "PENDING" | "PARTIAL";
      if (paidAmount === 0) {
        periodStatus = "PENDING";
      } else if (paidAmount >= period.expectedAmountPaise) {
        periodStatus = "PAID";
      } else {
        periodStatus = "PARTIAL";
      }

      // Generate period label
      let periodLabel = "";
      const periodDate = new Date(period.periodStart);
      const collectionFreq = collection.frequency ?? "MONTHLY";

      switch (collectionFreq) {
        case "MONTHLY":
          periodLabel = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(period.periodStart));
          break;
        case "QUARTERLY":
          periodLabel = `Q${Math.floor(periodDate.getMonth() / 3) + 1} ${periodDate.getFullYear()}`;
          break;
        case "SEMI_ANNUAL":
          periodLabel = periodDate.getMonth() < 6 ? `First Half ${periodDate.getFullYear()}` : `Second Half ${periodDate.getFullYear()}`;
          break;
        case "ANNUAL":
          periodLabel = `Annual ${periodDate.getFullYear()}`;
          break;
        case "WEEKLY":
          periodLabel = `Week ${Math.ceil((period.periodStart.getDate() + periodDate.getDay()) / 7)} ${periodDate.getFullYear()}`;
          break;
        case "ONE_TIME":
          periodLabel = `One-Time ${new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(period.periodStart))}`;
          break;
        default:
          periodLabel = `Period ${period.id}`;
      }

      members.push({
        memberId: period.member.id,
        memberName: period.member.fullName,
        memberNo: period.member.memberNo,
        memberStatus: period.member.status,
        periodId: period.id,
        periodStart: period.periodStart.toISOString(),
        periodEnd: period.periodEnd.toISOString(),
        dueDate: period.dueDate.toISOString(),
        expectedAmountPaise: period.expectedAmountPaise,
        paidAmountPaise: paidAmount,
        outstandingAmountPaise: period.expectedAmountPaise - paidAmount,
        status: periodStatus,
        periodLabel: periodLabel,
      });
    }

    // Sort by member name
    members.sort((a, b) => a.memberName.localeCompare(b.memberName));

    return NextResponse.json({ members, periodKey });
  } catch (err) {
    console.error("Due status period members API error:", err);
    return NextResponse.json({ error: "Failed to fetch period members" }, { status: 500 });
  }
}