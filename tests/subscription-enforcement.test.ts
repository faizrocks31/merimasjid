import { describe, expect, it, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { getEffectiveSubscription, checkLimit, createSubscriptionForMasjid } from "@/lib/subscription";
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-plans";

/**
 * Tests for Phase 7 subscription enforcement logic
 */
describe("Subscription enforcement", () => {
  const testMasjidId = "test-masjid-sub-enforcement";

  beforeEach(async () => {
    // Clean up any existing test data
    await prisma.subscription.deleteMany({ where: { masjidId: testMasjidId } });
    await prisma.masjid.deleteMany({ where: { id: testMasjidId } });
    await prisma.masjid.create({
      data: {
        id: testMasjidId,
        name: "Test Masjid Subscription",
        slug: "test-masjid-sub-enforcement",
        receiptPrefix: "TEST",
        status: "ACTIVE",
      },
    });
  });

  it("creates a TRIAL subscription and sets denormalized fields", async () => {
    const sub = await createSubscriptionForMasjid(prisma, testMasjidId, "TRIAL");
    expect(sub.planCode).toBe("TRIAL");
    expect(sub.status).toBe("TRIAL");

    const masjid = await prisma.masjid.findUnique({ where: { id: testMasjidId } });
    expect(masjid?.subscriptionStatus).toBe("TRIAL");
    expect(masjid?.maxMembers).toBe(SUBSCRIPTION_PLANS.TRIAL.limits.maxMembers);
    expect(masjid?.maxStaff).toBe(SUBSCRIPTION_PLANS.TRIAL.limits.maxStaff);
    expect(masjid?.maxCategories).toBe(SUBSCRIPTION_PLANS.TRIAL.limits.maxCategories);
  });

  it("computes TRIAL status correctly within trial period", async () => {
    await createSubscriptionForMasjid(prisma, testMasjidId, "TRIAL");
    const effective = await getEffectiveSubscription(testMasjidId);
    expect(effective.status).toBe("TRIAL");
    expect(effective.trialEndsAt).toBeInstanceOf(Date);
  });

  it("computes ACTIVE status for paid plan within period", async () => {
    const startsAt = new Date();
    const endsAt = new Date(startsAt);
    endsAt.setMonth(endsAt.getMonth() + 1);

    await createSubscriptionForMasjid(prisma, testMasjidId, "STARTER", startsAt, endsAt);
    const effective = await getEffectiveSubscription(testMasjidId);
    expect(effective.status).toBe("ACTIVE");
    expect(effective.plan.code).toBe("STARTER");
  });

  it("computes GRACE status when subscription expired but within grace period", async () => {
    const startsAt = new Date();
    const endsAt = new Date(startsAt);
    endsAt.setDate(endsAt.getDate() - 3); // Expired 3 days ago

    await createSubscriptionForMasjid(prisma, testMasjidId, "STARTER", startsAt, endsAt);
    const effective = await getEffectiveSubscription(testMasjidId);
    expect(effective.status).toBe("GRACE");
    expect(effective.graceEndsAt).toBeInstanceOf(Date);
  });

  it("computes SUSPENDED status when past grace period", async () => {
    const startsAt = new Date();
    const endsAt = new Date(startsAt);
    endsAt.setDate(endsAt.getDate() - 10); // Expired 10 days ago (past 7-day grace)

    await createSubscriptionForMasjid(prisma, testMasjidId, "STARTER", startsAt, endsAt);
    const effective = await getEffectiveSubscription(testMasjidId);
    expect(effective.status).toBe("SUSPENDED");
  });

  it("checkLimit allows within limit", async () => {
    await createSubscriptionForMasjid(prisma, testMasjidId, "STARTER");
    const result = await checkLimit(testMasjidId, "members", 100);
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(500);
  });

  it("checkLimit rejects when limit exceeded", async () => {
    await createSubscriptionForMasjid(prisma, testMasjidId, "STARTER");
    const result = await checkLimit(testMasjidId, "members", 600);
    expect(result.allowed).toBe(false);
    expect(result.limit).toBe(500);
  });

  it("checkLimit returns true for unlimited (ENTERPRISE)", async () => {
    await createSubscriptionForMasjid(prisma, testMasjidId, "ENTERPRISE");
    const result = await checkLimit(testMasjidId, "members", 10000);
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(-1);
  });

  it("syncAllSubscriptionStatuses updates denormalized fields", async () => {
    await createSubscriptionForMasjid(prisma, testMasjidId, "STARTER");
    const { updated, errors } = await import("@/lib/subscription").then(m => m.syncAllSubscriptionStatuses());
    expect(updated).toBeGreaterThanOrEqual(1);
    expect(errors).toBe(0);

    const masjid = await prisma.masjid.findUnique({ where: { id: testMasjidId } });
    expect(masjid?.subscriptionStatus).toBe("ACTIVE");
    expect(masjid?.maxMembers).toBe(500);
  });

  it("createSubscriptionForMasjid cancels previous subscription", async () => {
    await createSubscriptionForMasjid(prisma, testMasjidId, "STARTER");
    await createSubscriptionForMasjid(prisma, testMasjidId, "PROFESSIONAL");

    const subs = await prisma.subscription.findMany({ where: { masjidId: testMasjidId } });
    expect(subs.length).toBe(2);

    const activeSub = subs.find(s => s.status !== "CANCELLED");
    const cancelledSub = subs.find(s => s.status === "CANCELLED");

    expect(activeSub?.planCode).toBe("PROFESSIONAL");
    expect(cancelledSub?.planCode).toBe("STARTER");
  });
});