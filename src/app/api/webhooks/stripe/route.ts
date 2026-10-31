import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSubscriptionForMasjid, updateSubscription, cancelSubscription, changePlan, findSubscriptionByBillingReference } from "@/lib/subscription";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

/**
 * Stripe webhook handler – verifies signature and processes subscription events.
 * Requires STRIPE_WEBHOOK_SECRET and STRIPE_SECRET_KEY environment variables.
 */
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  if (!signature) {
    console.error("[webhook:stripe] Missing stripe-signature header");
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("[webhook:stripe] STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[webhook:stripe] Signature verification failed:", message);
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
  }

  console.log(`[webhook:stripe] Processing event: ${event.type}`, { id: event.id });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      default:
        console.log(`[webhook:stripe] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[webhook:stripe] Error processing ${event.type}:`, message);
    return NextResponse.json({ error: `Event processing failed: ${message}` }, { status: 500 });
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  // Retrieve the subscription from the checkout session
  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;

  if (!subscriptionId) {
    console.warn("[webhook:stripe] checkout.session.completed - no subscription ID");
    return;
  }

  // Fetch the subscription to get plan details
  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = stripeSubscription.items.data[0]?.price.id;
  const status = stripeSubscription.status; // active, trialing, past_due, canceled, etc.

  // Find masjid by billing reference (customer ID)
  const subscription = await findSubscriptionByBillingReference(customerId);
  if (!subscription) {
    console.warn("[webhook:stripe] No subscription found for customer:", customerId);
    return;
  }

  // Map Stripe price ID to our plan code
  const planCode = mapPriceIdToPlanCode(priceId);
  if (!planCode) {
    console.warn("[webhook:stripe] Unknown price ID:", priceId);
    return;
  }

  const startsAt = new Date(stripeSubscription.current_period_start * 1000);
  const endsAt = new Date(stripeSubscription.current_period_end * 1000);

  // Create or update subscription
  await createSubscriptionForMasjid(subscription.masjidId, planCode, startsAt, endsAt, customerId);

  // If subscription is trialing, update status to TRIAL
  if (status === "trialing") {
    await updateSubscription(subscription.id, { status: "TRIAL" });
  } else if (status === "active") {
    await updateSubscription(subscription.id, { status: "ACTIVE" });
  }

  console.log("[webhook:stripe] Checkout session completed for masjid:", subscription.masjidId);
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) return;

  // Find subscription by customer ID (billing reference)
  const subscription = await findSubscriptionByBillingReference(customerId);
  if (!subscription) {
    console.warn("[webhook:stripe] No subscription found for customer:", customerId);
    return;
  }

  // Extend subscription end date
  const periodEnd = new Date(invoice.period_end * 1000);
  await updateSubscription(subscription.id, { endsAt: periodEnd, status: "ACTIVE" });

  console.log("[webhook:stripe] Invoice payment succeeded, extended subscription for masjid:", subscription.masjidId);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) return;

  const subscription = await findSubscriptionByBillingReference(customerId);
  if (!subscription) {
    console.warn("[webhook:stripe] No subscription found for customer:", customerId);
    return;
  }

  // Move to SUSPENDED - the grace period logic in getEffectiveSubscription will handle the transition
  await updateSubscription(subscription.id, { status: "SUSPENDED" });

  console.log("[webhook:stripe] Invoice payment failed, suspended subscription for masjid:", subscription.masjidId);
}

async function handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription) {
  const customerId = stripeSubscription.customer as string;
  const priceId = stripeSubscription.items.data[0]?.price.id;

  const subscription = await findSubscriptionByBillingReference(customerId);
  if (!subscription) {
    console.warn("[webhook:stripe] No subscription found for customer:", customerId);
    return;
  }

  const planCode = mapPriceIdToPlanCode(priceId);
  if (!planCode) {
    console.warn("[webhook:stripe] Unknown price ID:", priceId);
    return;
  }

  const status = stripeSubscription.status;
  const endsAt = new Date(stripeSubscription.current_period_end * 1000);

  let effectiveStatus: "ACTIVE" | "TRIAL" | "SUSPENDED" | "CANCELLED";
  if (status === "active") effectiveStatus = "ACTIVE";
  else if (status === "trialing") effectiveStatus = "TRIAL";
  else if (status === "past_due") effectiveStatus = "SUSPENDED";
  else if (status === "canceled") effectiveStatus = "CANCELLED";
  else if (status === "unpaid") effectiveStatus = "SUSPENDED";
  else effectiveStatus = "SUSPENDED";

  // Check if plan changed
  if (planCode !== subscription.planCode) {
    await changePlan(subscription.id, planCode, endsAt);
  } else {
    await updateSubscription(subscription.id, {
      status: effectiveStatus,
      endsAt,
      billingReference: customerId,
    });
  }

  console.log("[webhook:stripe] Subscription updated for masjid:", subscription.masjidId, { planCode, status: effectiveStatus });
}

async function handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
  const customerId = stripeSubscription.customer as string;

  const subscription = await findSubscriptionByBillingReference(customerId);
  if (!subscription) {
    console.warn("[webhook:stripe] No subscription found for customer:", customerId);
    return;
  }

  await cancelSubscription(subscription.id);

  console.log("[webhook:stripe] Subscription deleted for masjid:", subscription.masjidId);
}

function mapPriceIdToPlanCode(priceId: string | undefined): "TRIAL" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE" | null {
  if (!priceId) return null;

  // Map Stripe price IDs to our plan codes
  // These should match the price IDs created in Stripe dashboard
  const priceMap: Record<string, "TRIAL" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE"> = {
    // Add your actual Stripe price IDs here
    // Example: "price_123": "STARTER",
    // For now, use a convention based on price ID prefix or metadata
    [process.env.STRIPE_PRICE_STARTER ?? "price_starter"]: "STARTER",
    [process.env.STRIPE_PRICE_PROFESSIONAL ?? "price_professional"]: "PROFESSIONAL",
    [process.env.STRIPE_PRICE_ENTERPRISE ?? "price_enterprise"]: "ENTERPRISE",
  };

  return priceMap[priceId] ?? null;
}