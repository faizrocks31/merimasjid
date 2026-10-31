import { NextResponse } from "next/server";
import { createSubscriptionForMasjid, updateSubscription, cancelSubscription, changePlan, findSubscriptionByBillingReference } from "@/lib/subscription";
import { createHmac } from "crypto";

/**
 * Paddle webhook handler – verifies signature and processes subscription events.
 * Requires PADDLE_WEBHOOK_SECRET and PADDLE_API_KEY environment variables.
 */
export async function POST(req: Request) {
  const signature = req.headers.get("paddle-signature");
  const body = await req.text();

  if (!signature) {
    console.error("[webhook:paddle] Missing paddle-signature header");
    return NextResponse.json({ error: "Missing paddle-signature header" }, { status: 400 });
  }

  if (!process.env.PADDLE_WEBHOOK_SECRET) {
    console.error("[webhook:paddle] PADDLE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: PaddleWebhookEvent;

  try {
    // Paddle webhook verification
    // The Paddle SDK doesn't have a built-in constructEvent like Stripe
    // We need to verify the signature manually using the webhook secret
    event = verifyPaddleSignature(body, signature, process.env.PADDLE_WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[webhook:paddle] Signature verification failed:", message);
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
  }

  console.log(`[webhook:paddle] Processing event: ${event.event_type}`, { event_id: event.event_id });

  try {
    switch (event.event_type) {
      case "subscription.created": {
        await handleSubscriptionCreated(event.data);
        break;
      }

      case "subscription.updated": {
        await handleSubscriptionUpdated(event.data);
        break;
      }

      case "subscription.cancelled": {
        await handleSubscriptionCancelled(event.data);
        break;
      }

      case "transaction.completed": {
        await handleTransactionCompleted(event.data);
        break;
      }

      case "transaction.failed": {
        await handleTransactionFailed(event.data);
        break;
      }

      default:
        console.log(`[webhook:paddle] Unhandled event type: ${event.event_type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[webhook:paddle] Error processing ${event.event_type}:`, message);
    return NextResponse.json({ error: `Event processing failed: ${message}` }, { status: 500 });
  }
}

interface PaddleWebhookEvent {
  event_type: string;
  event_id: string;
  data: PaddleWebhookData;
}

interface PaddleWebhookData {
  id: string;
  customer_id: string;
  items?: Array<{ price?: { id: string } }>;
  status?: string;
  current_billing_period?: {
    starts_at?: string;
    ends_at?: string;
  };
  subscription_id?: string;
  details?: {
    next_billing_at?: string;
  };
}

/**
 * Verify Paddle webhook signature
 * Paddle uses a different signature format than Stripe
 * See: https://developer.paddle.com/webhooks/verifying-webhooks
 */
function verifyPaddleSignature(body: string, signature: string, webhookSecret: string): PaddleWebhookEvent {
  // Paddle signature format: "ts=<timestamp>,h1=<hash>"
  const parts = signature.split(",");
  const timestampPart = parts.find(p => p.startsWith("ts="));
  const hashPart = parts.find(p => p.startsWith("h1="));

  if (!timestampPart || !hashPart) {
    throw new Error("Invalid signature format");
  }

  const timestamp = timestampPart.slice(3);
  const hash = hashPart.slice(3);

  // Verify timestamp is recent (within 5 minutes)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) {
    throw new Error("Signature timestamp too old");
  }

  // Verify HMAC signature
  const expectedHash = createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  if (hash !== expectedHash) {
    throw new Error("Invalid signature");
  }

  // Parse and return the event
  return JSON.parse(body) as PaddleWebhookEvent;
}

async function handleSubscriptionCreated(data: PaddleWebhookData) {
  const customerId = data.customer_id;
  const priceId = data.items?.[0]?.price?.id;
  const status = data.status; // active, trialing, paused, cancelled
  const currentPeriodStart = data.current_billing_period?.starts_at ? new Date(data.current_billing_period.starts_at) : new Date();
  const currentPeriodEnd = data.current_billing_period?.ends_at ? new Date(data.current_billing_period.ends_at) : null;

  // Find masjid by billing reference (customer ID)
  const subscription = await findSubscriptionByBillingReference(customerId);
  if (!subscription) {
    console.warn("[webhook:paddle] No subscription found for customer:", customerId);
    return;
  }

  // Map Paddle price ID to our plan code
  const planCode = mapPaddlePriceIdToPlanCode(priceId);
  if (!planCode) {
    console.warn("[webhook:paddle] Unknown price ID:", priceId);
    return;
  }

  let effectiveStatus: "ACTIVE" | "TRIAL" | "SUSPENDED" | "CANCELLED";
  if (status === "active") effectiveStatus = "ACTIVE";
  else if (status === "trialing") effectiveStatus = "TRIAL";
  else if (status === "paused") effectiveStatus = "SUSPENDED";
  else effectiveStatus = "CANCELLED";

  await createSubscriptionForMasjid(subscription.masjidId, planCode, currentPeriodStart, currentPeriodEnd ?? undefined, customerId);

  // Update status if needed
  if (effectiveStatus !== "ACTIVE") {
    await updateSubscription(subscription.id, { status: effectiveStatus });
  }

  console.log("[webhook:paddle] Subscription created for masjid:", subscription.masjidId, { planCode, status: effectiveStatus });
}

async function handleSubscriptionUpdated(data: PaddleWebhookData) {
  const customerId = data.customer_id;
  const priceId = data.items?.[0]?.price?.id;
  const status = data.status;
  const currentPeriodEnd = data.current_billing_period?.ends_at ? new Date(data.current_billing_period.ends_at) : null;

  const subscription = await findSubscriptionByBillingReference(customerId);
  if (!subscription) {
    console.warn("[webhook:paddle] No subscription found for customer:", customerId);
    return;
  }

  const planCode = mapPaddlePriceIdToPlanCode(priceId);
  if (!planCode) {
    console.warn("[webhook:paddle] Unknown price ID:", priceId);
    return;
  }

  let effectiveStatus: "ACTIVE" | "TRIAL" | "SUSPENDED" | "CANCELLED";
  if (status === "active") effectiveStatus = "ACTIVE";
  else if (status === "trialing") effectiveStatus = "TRIAL";
  else if (status === "paused") effectiveStatus = "SUSPENDED";
  else effectiveStatus = "CANCELLED";

  // Check if plan changed
  if (planCode !== subscription.planCode) {
    await changePlan(subscription.id, planCode, currentPeriodEnd ?? undefined);
  } else {
    await updateSubscription(subscription.id, {
      status: effectiveStatus,
      endsAt: currentPeriodEnd,
      billingReference: customerId,
    });
  }

  console.log("[webhook:paddle] Subscription updated for masjid:", subscription.masjidId, { planCode, status: effectiveStatus });
}

async function handleSubscriptionCancelled(data: PaddleWebhookData) {
  const customerId = data.customer_id;

  const subscription = await findSubscriptionByBillingReference(customerId);
  if (!subscription) {
    console.warn("[webhook:paddle] No subscription found for customer:", customerId);
    return;
  }

  await cancelSubscription(subscription.id);

  console.log("[webhook:paddle] Subscription cancelled for masjid:", subscription.masjidId);
}

async function handleTransactionCompleted(data: PaddleWebhookData) {
  const customerId = data.customer_id;
  const subscriptionId = data.subscription_id;

  if (!subscriptionId) return;

  const subscription = await findSubscriptionByBillingReference(customerId);
  if (!subscription) {
    console.warn("[webhook:paddle] No subscription found for customer:", customerId);
    return;
  }

  // Extend subscription end date if available
  const nextBillingAt = data.details?.next_billing_at ? new Date(data.details.next_billing_at) : null;
  if (nextBillingAt) {
    await updateSubscription(subscription.id, { endsAt: nextBillingAt, status: "ACTIVE" });
  } else {
    await updateSubscription(subscription.id, { status: "ACTIVE" });
  }

  console.log("[webhook:paddle] Transaction completed for masjid:", subscription.masjidId);
}

async function handleTransactionFailed(data: PaddleWebhookData) {
  const customerId = data.customer_id;
  const subscriptionId = data.subscription_id;

  if (!subscriptionId) return;

  const subscription = await findSubscriptionByBillingReference(customerId);
  if (!subscription) {
    console.warn("[webhook:paddle] No subscription found for customer:", customerId);
    return;
  }

  // Move to SUSPENDED
  await updateSubscription(subscription.id, { status: "SUSPENDED" });

  console.log("[webhook:paddle] Transaction failed for masjid:", subscription.masjidId);
}

function mapPaddlePriceIdToPlanCode(priceId: string | undefined): "TRIAL" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE" | null {
  if (!priceId) return null;

  // Map Paddle price IDs to our plan codes
  const priceMap: Record<string, "TRIAL" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE"> = {
    [process.env.PADDLE_PRICE_STARTER ?? "pri_starter"]: "STARTER",
    [process.env.PADDLE_PRICE_PROFESSIONAL ?? "pri_professional"]: "PROFESSIONAL",
    [process.env.PADDLE_PRICE_ENTERPRISE ?? "pri_enterprise"]: "ENTERPRISE",
  };

  return priceMap[priceId] ?? null;
}