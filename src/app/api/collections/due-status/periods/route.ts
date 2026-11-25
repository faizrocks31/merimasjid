import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { COLLECTION_FREQUENCY } from "@/lib/constants";
import { formatPeriodLabel } from "@/lib/dates";

export async function GET(request: NextRequest) {
  try {
    const user = await requireStaff();
    if (!can(user.role, "collection:read")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const masjidId = user.masjidId!;

    const { searchParams } = new URL(request.url);
    const collectionId = searchParams.get("collectionId");
    const year = searchParams.get("year");
    const frequency = searchParams.get("frequency");
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

    // Build query for dues periods
    const where: any = {
      masjidId,
      collectionDefinitionId: collectionId,
      periodStart: { gte: yearStart, lt: yearEnd },
    };

    // Add frequency filter if specified
    if (frequency && frequency !== "ALL") {
      where.collectionDefinition = { frequency };
    }

    // Get all dues periods for this collection in the year
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

    // For event-based collections, also fetch CollectionEvents that have generated dues
    let collectionEvents: any[] = [];
    if (collection.frequency === COLLECTION_FREQUENCY.EVENT_BASED || collection.frequency === COLLECTION_FREQUENCY.ONE_TIME) {
      collectionEvents = await prisma.collectionEvent.findMany({
        where: {
          masjidId,
          collectionDefinitionId: collectionId,
          startDate: { gte: yearStart, lt: yearEnd },
        },
        select: {
          id: true,
          name: true,
          startDate: true,
        },
        orderBy: { startDate: "asc" },
      });
    }

    // Group periods by period/event
    // For monthly/quarterly/semi-annual/annual: group by periodStart
    // For event-based: group by collectionEventId
    const periodMap = new Map<string, {
      periodKey: string;
      periodLabel: string;
      periodStart: Date;
      periodEnd: Date;
      frequency: string;
      collectionEventId: string | null;
      collectionEventName: string | null;
      eventDate: Date | null;
      memberIds: Set<string>;
      memberDetails: Array<{
        memberId: string;
        memberName: string;
        memberNo: string;
        status: string;
        expectedAmountPaise: number;
        paidAmountPaise: number;
        periodStatus: "PAID" | "PENDING" | "PARTIAL";
        periodId: string;
      }>;
      totalExpectedAmountPaise: number;
      totalPaidAmountPaise: number;
    }>();

    for (const period of duesPeriods) {
      if (!period.member) continue;

      // Apply member search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const nameMatch = period.member.fullName.toLowerCase().includes(search.toLowerCase());
        const noMatch = period.member.memberNo.toLowerCase().includes(search.toLowerCase());
        if (!nameMatch && !noMatch) continue;
      }

      // Apply member status filter
      if (memberStatus && memberStatus !== "ALL") {
        if (period.member.status !== memberStatus) continue;
      }

      // Determine period key and label
      let periodKey: string;
      let periodLabel: string;
      let frequency = collection.frequency;
      let collectionEventId: string | null = null;
      let collectionEventName: string | null = null;
      let eventDate: Date | null = null;

      // Since DuesPeriod doesn't have collectionEvent relation, we treat all as regular periodic
      // The event-based periods are handled separately via collectionEvents
      const periodDate = new Date(period.periodStart);
      switch (collection.frequency) {
        case COLLECTION_FREQUENCY.MONTHLY:
          periodKey = `month-${periodDate.getFullYear()}-${periodDate.getMonth()}`;
          periodLabel = formatPeriodLabel(period.periodStart, COLLECTION_FREQUENCY.MONTHLY);
          break;
        case COLLECTION_FREQUENCY.QUARTERLY:
          periodKey = `quarter-${periodDate.getFullYear()}-${Math.floor(periodDate.getMonth() / 3)}`;
          periodLabel = formatPeriodLabel(period.periodStart, COLLECTION_FREQUENCY.QUARTERLY);
          break;
        case COLLECTION_FREQUENCY.SEMI_ANNUAL:
          periodKey = `semiannual-${periodDate.getFullYear()}-${periodDate.getMonth() < 6 ? 0 : 1}`;
          periodLabel = formatPeriodLabel(period.periodStart, COLLECTION_FREQUENCY.SEMI_ANNUAL);
          break;
        case COLLECTION_FREQUENCY.ANNUAL:
          periodKey = `annual-${periodDate.getFullYear()}`;
          periodLabel = formatPeriodLabel(period.periodStart, COLLECTION_FREQUENCY.ANNUAL);
          break;
        case COLLECTION_FREQUENCY.WEEKLY:
          periodKey = `week-${periodDate.getFullYear()}-${Math.ceil((periodDate.getDate() + periodDate.getDay()) / 7)}`;
          periodLabel = formatPeriodLabel(period.periodStart, COLLECTION_FREQUENCY.WEEKLY);
          break;
        case COLLECTION_FREQUENCY.ONE_TIME:
          periodKey = `onetime-${period.id}`;
          periodLabel = formatPeriodLabel(period.periodStart, COLLECTION_FREQUENCY.ONE_TIME);
          break;
        default:
          periodKey = `period-${period.id}`;
          periodLabel = formatPeriodLabel(period.periodStart, collection.frequency ?? "MONTHLY");
      }

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

      // Get or create period entry
      if (!periodMap.has(periodKey)) {
        periodMap.set(periodKey, {
          periodKey,
          periodLabel,
          periodStart: period.periodStart,
          periodEnd: period.periodEnd,
          frequency,
          collectionEventId,
          collectionEventName,
          eventDate,
          memberIds: new Set(),
          memberDetails: [],
          totalExpectedAmountPaise: 0,
          totalPaidAmountPaise: 0,
        });
      }

      const periodEntry = periodMap.get(periodKey)!;

      // Add member if not already counted for this period
      if (!periodEntry.memberIds.has(period.member.id)) {
        periodEntry.memberIds.add(period.member.id);
      }

      // Add member detail
      periodEntry.memberDetails.push({
        memberId: period.member.id,
        memberName: period.member.fullName,
        memberNo: period.member.memberNo,
        status: period.member.status,
        expectedAmountPaise: period.expectedAmountPaise,
        paidAmountPaise: 0, // Will be calculated per period
        periodStatus,
        periodId: period.id,
      });

      // Update totals
      periodEntry.totalExpectedAmountPaise += period.expectedAmountPaise;
      periodEntry.totalPaidAmountPaise += paidAmount;
    }

    // For event-based collections, also include events that have no generated dues yet
    if ((collection.frequency === COLLECTION_FREQUENCY.EVENT_BASED || collection.frequency === COLLECTION_FREQUENCY.ONE_TIME) && collectionEvents.length > 0) {
      for (const event of collectionEvents) {
        const eventKey = `event-${event.id}`;
        if (!periodMap.has(eventKey)) {
          periodMap.set(eventKey, {
            periodKey: eventKey,
            periodLabel: event.name,
            periodStart: event.startDate,
            periodEnd: event.startDate,
            frequency: COLLECTION_FREQUENCY.EVENT_BASED,
            collectionEventId: event.id,
            collectionEventName: event.name,
            eventDate: event.startDate,
            memberIds: new Set(),
            memberDetails: [],
            totalExpectedAmountPaise: 0,
            totalPaidAmountPaise: 0,
          });
        }
      }
    }

    // Convert to array and sort
    const periods = Array.from(periodMap.values())
      .filter(p => p.memberIds.size > 0 || (collection.frequency === COLLECTION_FREQUENCY.EVENT_BASED || collection.frequency === COLLECTION_FREQUENCY.ONE_TIME))
      .sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime())
      .map(p => ({
        periodKey: p.periodKey,
        periodLabel: p.periodLabel,
        periodStart: p.periodStart.toISOString(),
        periodEnd: p.periodEnd.toISOString(),
        frequency: p.frequency,
        collectionEventId: p.collectionEventId,
        collectionEventName: p.collectionEventName,
        eventDate: p.eventDate?.toISOString() ?? null,
        generatedMemberCount: p.memberIds.size,
        totalExpectedAmountPaise: p.totalExpectedAmountPaise,
        totalPaidAmountPaise: p.totalPaidAmountPaise,
        totalOutstandingPaise: p.totalExpectedAmountPaise - p.totalPaidAmountPaise,
        memberDetails: p.memberDetails.map(m => ({
          ...m,
          outstandingAmountPaise: m.expectedAmountPaise - m.paidAmountPaise,
        }))
      }));

    // Also return collection info
    const collectionInfo = {
      id: collection.id,
      name: collection.name,
      frequency: collection.frequency,
      amountType: collection.amountType,
      defaultAmountPaise: collection.defaultAmountPaise,
      memberAssignment: collection.memberAssignment,
      dueGeneration: collection.dueGeneration,
      baseCategory: collection.baseCategory,
      subcategory: collection.subcategory,
    };

    return NextResponse.json({ periods, collection: collectionInfo });
  } catch (err) {
    console.error("Due status periods API error:", err);
    return NextResponse.json({ error: "Failed to fetch due status periods" }, { status: 500 });
  }
}