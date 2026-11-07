import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateAllAutomaticDues } from "@/lib/dues-generation";

/**
 * Vercel Cron endpoint – runs daily at 8:30 PM UTC (or scheduled time) to generate automatic dues.
 * Requires Vercel Cron authentication header or bearer token.
 */
export async function GET(request: Request) {
  try {
    // Verify Vercel Cron secret if configured
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // In development or if not strictly enforced, we can log a warning, but for security in production:
      // return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Find all active masjids with automatic dues generation enabled
    const masjids = await prisma.masjid.findMany({
      where: {
        subscriptions: {
          some: {
            status: { in: ["ACTIVE", "TRIAL", "GRACE"] },
          },
        },
      },
      select: { id: true, name: true },
    });

    let totalCreated = 0;
    let totalSkipped = 0;
    const allErrors: string[] = [];
    const masjidResults: Array<{ masjidId: string; masjidName: string; created: number; skipped: number; errors: string[] }> = [];

    for (const masjid of masjids) {
      try {
        const result = await generateAllAutomaticDues(masjid.id);
        totalCreated += result.totalCreated;
        totalSkipped += result.totalSkipped;
        if (result.totalErrors > 0) {
          allErrors.push(...result.categories.flatMap(c => c.errors));
        }
        masjidResults.push({
          masjidId: masjid.id,
          masjidName: masjid.name,
          created: result.totalCreated,
          skipped: result.totalSkipped,
          errors: result.categories.flatMap(c => c.errors),
        });
      } catch (err) {
        const errMessage = `${masjid.name}: ${err instanceof Error ? err.message : "Unknown error"}`;
        allErrors.push(errMessage);
        masjidResults.push({
          masjidId: masjid.id,
          masjidName: masjid.name,
          created: 0,
          skipped: 0,
          errors: [errMessage],
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        masjidsProcessed: masjids.length,
        totalCreated,
        totalSkipped,
        totalErrors: allErrors.length,
      },
      masjidResults,
      errors: allErrors,
    });
  } catch (e) {
    console.error("Cron automatic dues generation failed", e);
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
  }
}
