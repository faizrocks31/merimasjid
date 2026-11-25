import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { COLLECTION_FREQUENCY } from "@/lib/constants";

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
        baseCategory: { select: { name: true } },
        subcategory: { select: { name: true } },
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

    // Group by member
    const memberMap = new Map<string, {
      memberId: string;
      memberName: string;
      memberNo: string;
      status: string;
      periods: Array<{
        periodStart: Date;
        periodEnd: Date;
        dueDate: Date;
        expectedAmountPaise: number;
        status: string;
        paidAmountPaise: number;
      }>;
    }>();

    for (const period of duesPeriods) {
      if (!period.member) continue;

      // Apply member search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const nameMatch = period.member.fullName.toLowerCase().includes(searchLower);
        const noMatch = period.member.memberNo.toLowerCase().includes(searchLower);
        if (!nameMatch && !noMatch) continue;
      }

      // Apply member status filter
      if (memberStatus && memberStatus !== "ALL") {
        if (period.member.status !== memberStatus) continue;
      }

      const memberKey = period.member.id;
      if (!memberMap.has(memberKey)) {
        memberMap.set(memberKey, {
          memberId: period.member.id,
          memberName: period.member.fullName,
          memberNo: period.member.memberNo,
          status: period.member.status,
          periods: [],
        });
      }

      // Calculate paid amount - fetch payments for this period
      // PaymentAllocation links to Payment via paymentId, and Payment has status field
      const payments = await prisma.paymentAllocation.findMany({
        where: {
          duesPeriodId: period.id,
        },
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

      memberMap.get(memberKey)!.periods.push({
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        dueDate: period.dueDate,
        expectedAmountPaise: period.expectedAmountPaise,
        status: periodStatus,
        paidAmountPaise: paidAmount,
      });
    }

    // Convert to array and sort by member name
    const members = Array.from(memberMap.values()).sort((a, b) =>
      a.memberName.localeCompare(b.memberName)
    );

    return NextResponse.json({ members, collection });
  } catch (err) {
    console.error("Due status API error:", err);
    return NextResponse.json({ error: "Failed to fetch due status" }, { status: 500 });
  }
}