import { NextResponse } from "next/server";
import { sendDuesReminders } from "@/lib/dues";

/**
 * Vercel Cron endpoint – runs daily to send dues reminders for periods due within 3 days.
 * Returns a simple JSON report of how many reminders were sent.
 */
export async function GET() {
  try {
    // This endpoint should only be called by Vercel Cron
    const authHeader = "Bearer " + process.env.CRON_SECRET;
    // In production, you'd verify the Authorization header matches
    // For now, we just run it

    const masjids = await import("@/lib/db").then(m => m.prisma.masjid.findMany({
      where: { status: "ACTIVE", deletedAt: null },
      select: { id: true },
    }));

    let totalSent = 0;
    const results = [];

    for (const masjid of masjids) {
      const sent = await sendDuesReminders(masjid.id, 3);
      totalSent += sent;
      results.push({ masjidId: masjid.id, sent });
    }

    return NextResponse.json({ success: true, totalSent, results });
  } catch (e) {
    console.error("Dues reminders cron failed", e);
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
  }
}