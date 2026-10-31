import { NextResponse } from "next/server";
import { syncAllSubscriptionStatuses } from "@/lib/subscription";

/**
 * Vercel Cron endpoint – runs periodically to update subscription status and denormalized fields.
 * Returns a simple JSON report of how many masjids were updated and any errors.
 */
export async function GET() {
  try {
    const { updated, errors } = await syncAllSubscriptionStatuses();
    return NextResponse.json({ success: true, updated, errors });
  } catch (e) {
    console.error("Subscription sync failed", e);
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
  }
}
