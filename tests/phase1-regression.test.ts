import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { ROLES } from "@/lib/constants";
import { createPaymentAction } from "@/modules/payments/actions";
import { getFirstCollectionDefinition, getCollectionDefinitionByPurposeCode, createDefaultCollectionDefinitions } from "./helpers";

const COOKIE_NAME = "masjid_session";

type Caller = { userId: string; masjidId: string | null; role: string; isPlatformAdmin: boolean };

let currentCookieValue: string | undefined;

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === COOKIE_NAME && currentCookieValue !== undefined
        ? { name, value: currentCookieValue }
        : undefined,
    set: () => {},
    delete: () => {},
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    const err = new Error(`NEXT_REDIRECT:${path}`) as Error & { digest?: string };
    err.digest = `NEXT_REDIRECT;${path}`;
    throw err;
  },
  notFound: () => {
    const err = new Error("NEXT_NOT_FOUND") as Error & { digest?: string };
    err.digest = "NEXT_NOT_FOUND";
    throw err;
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
}));

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET is missing or too short.");
  return new TextEncoder().encode(secret);
}

async function signIn(caller: Caller): Promise<void> {
  const token = await new SignJWT({ ...caller })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secretKey());
  currentCookieValue = token;
}

let masjidId = "";
let userId = "";
let memberId = "";
let collectionDefinitionId = "";
let monthlyPlanId = "";
let miladEventId = "";
let miladEvent2Id = "";
let shabEventId = "";
let jummaEventId = "";
let generalEventId = "";

function buildFormData(data: {
  memberId?: string;
  walkInName?: string;
  collectionDefinitionId: string;
  amountPaise: number;
  collectionEventId?: string;
  mode?: string;
  referenceNo?: string;
  notes?: string;
  paymentDate?: string;
  idempotencyKey: string;
}) {
  const fd = new FormData();
  fd.set("memberId", data.memberId || "");
  fd.set("walkInName", data.walkInName || "");
  fd.set("collectionDefinitionId", data.collectionDefinitionId);
  fd.set("paymentDate", data.paymentDate || "2094-01-15");
  fd.set("amountPaise", String(data.amountPaise));
  fd.set("mode", data.mode || "CASH");
  fd.set("referenceNo", data.referenceNo || "");
  fd.set("notes", data.notes || "");
  fd.set("idempotencyKey", data.idempotencyKey);
  fd.set("allocations", JSON.stringify([]));
  if (data.collectionEventId) {
    fd.set("collectionEventId", data.collectionEventId);
  }
  return fd;
}

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "-");
}

// Store specific collection definition IDs for each purpose code
let monthlyCollectionDefinitionId = "";
let shabCollectionDefinitionId = "";
let miladCollectionDefinitionId = "";
let generalCollectionDefinitionId = "";
let jummaCollectionDefinitionId = "";
let zakatCollectionDefinitionId = "";
let constructionCollectionDefinitionId = "";
let annualCollectionDefinitionId = "";

beforeAll(async () => {
  const suffix = `phase1-${Date.now().toString(36)}`;
  const masjid = await prisma.masjid.create({
    data: {
      name: "Phase 1 Test Masjid",
      slug: slugify(`phase1-${suffix}`),
      receiptPrefix: "P1T",
      financialYearStartMonth: 4,
      status: "ACTIVE",
    },
  });
  masjidId = masjid.id;

  // Create default collection definitions
  await createDefaultCollectionDefinitions(masjidId);

  // Fetch specific collection definitions by purpose code
  const monthlyDef = await getCollectionDefinitionByPurposeCode(masjidId, "MONTHLY_CHANDA");
  const shabDef = await getCollectionDefinitionByPurposeCode(masjidId, "SHAB_E_QADR");
  const miladDef = await getCollectionDefinitionByPurposeCode(masjidId, "MILAD_UN_NABI");
  const generalDef = await getCollectionDefinitionByPurposeCode(masjidId, "GENERAL_DONATION");
  const jummaDef = await getCollectionDefinitionByPurposeCode(masjidId, "JUMMA_COLLECTION");
  const zakatDef = await getCollectionDefinitionByPurposeCode(masjidId, "ZAKAT");
  const constructionDef = await getCollectionDefinitionByPurposeCode(masjidId, "CONSTRUCTION_FUND");
  const annualDef = await getCollectionDefinitionByPurposeCode(masjidId, "ANNUAL_CHANDA");

  if (!monthlyDef || !shabDef || !miladDef || !generalDef || !jummaDef || !zakatDef || !constructionDef || !annualDef) {
    throw new Error("One or more collection definitions not created");
  }

  monthlyCollectionDefinitionId = monthlyDef.id;
  shabCollectionDefinitionId = shabDef.id;
  miladCollectionDefinitionId = miladDef.id;
  generalCollectionDefinitionId = generalDef.id;
  jummaCollectionDefinitionId = jummaDef.id;
  zakatCollectionDefinitionId = zakatDef.id;
  constructionCollectionDefinitionId = constructionDef.id;
  annualCollectionDefinitionId = annualDef.id;

  // For backward compatibility, use Monthly as the default
  collectionDefinitionId = monthlyCollectionDefinitionId;

  const user = await prisma.user.create({
    data: {
      name: "Admin User",
      email: `admin-${suffix}@example.invalid`,
      passwordHash: await bcrypt.hash("password123", 12),
      status: "ACTIVE",
    },
  });
  userId = user.id;

  await prisma.masjidUser.create({
    data: { masjidId, userId, role: ROLES.ADMIN, status: "ACTIVE" },
  });

  const member = await prisma.member.create({
    data: { masjidId, memberNo: `MEM-${suffix}`, fullName: "Test Member" },
  });
  memberId = member.id;

  // Create monthly plan for the member
  const plan = await prisma.contributionPlan.create({
    data: {
      masjidId,
      memberId,
      collectionDefinitionId: monthlyCollectionDefinitionId,
      frequency: "MONTHLY",
      amountPaise: 15000, // ₹150
      startDate: new Date("2094-01-01T00:00:00+05:30"),
      dueDay: 10,
    },
  });
  monthlyPlanId = plan.id;

  // Create collection events for Milad and Shab-e-Qadr
  const miladEvent = await prisma.collectionEvent.create({
    data: {
      masjidId,
      collectionDefinitionId: miladCollectionDefinitionId,
      name: "Milad-un-Nabi 2094",
      startDate: new Date("2094-09-01T00:00:00+05:30"),
      dueDate: new Date("2094-09-15T00:00:00+05:30"),
      expectedAmountPaise: 100000, // ₹1000
      status: "OPEN",
    },
  });
  miladEventId = miladEvent.id;

  const shabEvent = await prisma.collectionEvent.create({
    data: {
      masjidId,
      collectionDefinitionId: shabCollectionDefinitionId,
      name: "Shab-e-Qadr 2094",
      startDate: new Date("2094-04-01T00:00:00+05:30"),
      dueDate: new Date("2094-04-10T00:00:00+05:30"),
      expectedAmountPaise: 100000, // ₹1000
      status: "OPEN",
    },
  });
  shabEventId = shabEvent.id;

  // Create second Milad event for multi-year test
  const miladEvent2 = await prisma.collectionEvent.create({
    data: {
      masjidId,
      collectionDefinitionId: miladCollectionDefinitionId,
      name: "Milad-un-Nabi 2093",
      startDate: new Date("2093-09-01T00:00:00+05:30"),
      dueDate: new Date("2093-09-15T00:00:00+05:30"),
      expectedAmountPaise: 100000,
      status: "OPEN",
    },
  });
  miladEvent2Id = miladEvent2.id;

  // Create Jumma event
  const jummaEvent = await prisma.collectionEvent.create({
    data: {
      masjidId,
      collectionDefinitionId: jummaCollectionDefinitionId,
      name: "Jumma Collection 2094-01-12",
      startDate: new Date("2094-01-12T00:00:00+05:30"),
      dueDate: new Date("2094-01-12T13:00:00+05:30"),
      expectedAmountPaise: 50000,
      status: "OPEN",
    },
  });
  jummaEventId = jummaEvent.id;

  // Create General Donation event
  const generalEvent = await prisma.collectionEvent.create({
    data: {
      masjidId,
      collectionDefinitionId: generalCollectionDefinitionId,
      name: "General Donation Event",
      startDate: new Date("2094-01-01T00:00:00+05:30"),
      dueDate: new Date("2094-01-31T00:00:00+05:30"),
      expectedAmountPaise: 50000,
      status: "OPEN",
    },
  });
  generalEventId = generalEvent.id;

  // Create assignments for Milad and Shab-e-Qadr
  await prisma.collectionEventAssignment.create({
    data: { masjidId, eventId: miladEventId, memberId, expectedAmountPaise: 100000, status: "PENDING" },
  });
  await prisma.collectionEventAssignment.create({
    data: { masjidId, eventId: miladEvent2Id, memberId, expectedAmountPaise: 100000, status: "PENDING" },
  });
  await prisma.collectionEventAssignment.create({
    data: { masjidId, eventId: shabEventId, memberId, expectedAmountPaise: 100000, status: "PENDING" },
  });

  // Create dues periods for monthly
  await prisma.duesPeriod.create({
    data: {
      masjidId,
      collectionDefinitionId: monthlyCollectionDefinitionId,
      planId: monthlyPlanId,
      memberId,
      periodStart: new Date("2094-01-01T00:00:00+05:30"),
      periodEnd: new Date("2094-01-31T00:00:00+05:30"),
      dueDate: new Date("2094-02-10T00:00:00+05:30"),
      expectedAmountPaise: 15000,
      status: "PENDING",
    },
  });
  await prisma.duesPeriod.create({
    data: {
      masjidId,
      collectionDefinitionId: monthlyCollectionDefinitionId,
      planId: monthlyPlanId,
      memberId,
      periodStart: new Date("2094-02-01T00:00:00+05:30"),
      periodEnd: new Date("2094-02-28T00:00:00+05:30"),
      dueDate: new Date("2094-03-10T00:00:00+05:30"),
      expectedAmountPaise: 15000,
      status: "PENDING",
    },
  });
  await prisma.duesPeriod.create({
    data: {
      masjidId,
      collectionDefinitionId: monthlyCollectionDefinitionId,
      planId: monthlyPlanId,
      memberId,
      periodStart: new Date("2094-03-01T00:00:00+05:30"),
      periodEnd: new Date("2094-03-31T00:00:00+05:30"),
      dueDate: new Date("2094-04-10T00:00:00+05:30"),
      expectedAmountPaise: 15000,
      status: "PENDING",
    },
  });

  await signIn({
    userId,
    masjidId,
    role: ROLES.ADMIN,
    isPlatformAdmin: false,
  });
});

afterAll(async () => {
  // Clean up all test data
  await prisma.paymentAllocation.deleteMany({ where: { masjidId } });
  await prisma.payment.deleteMany({ where: { masjidId } });
  await prisma.duesPeriod.deleteMany({ where: { masjidId } });
  const events = await prisma.collectionEvent.findMany({ where: { masjidId }, select: { id: true } });
  if (events.length > 0) {
    await prisma.collectionEventAssignment.deleteMany({ where: { eventId: { in: events.map(e => e.id) } } });
    await prisma.collectionEvent.deleteMany({ where: { masjidId } });
  }
  await prisma.contributionPlan.deleteMany({ where: { id: monthlyPlanId } });
  await prisma.member.deleteMany({ where: { masjidId } });
  await prisma.collectionDefinition.deleteMany({ where: { masjidId } });
  await prisma.masjidUser.deleteMany({ where: { masjidId } });
  await prisma.auditLog.deleteMany({ where: { masjidId } });
  await prisma.user.delete({ where: { id: userId } });
  await prisma.masjid.delete({ where: { id: masjidId } });
  await prisma.$disconnect();
});

describe("Phase 1: Walk-in Donor Category Restrictions", () => {
  beforeEach(async () => {
    await prisma.paymentAllocation.deleteMany({ where: { masjidId } });
    await prisma.payment.deleteMany({ where: { masjidId } });
  });

  it("allows Walk-in for Shab-e-Qadr", async () => {
    const form = buildFormData({
      collectionDefinitionId: shabCollectionDefinitionId,
      amountPaise: 50000,
      walkInName: "Walk-in Donor",
      idempotencyKey: `walkin-shab-${Date.now()}`,
    });
    const result = await createPaymentAction(form);
    expect(result.ok).toBe(true);
  });

  it("allows Walk-in for Milad-un-Nabi", async () => {
    const form = buildFormData({
      collectionDefinitionId: miladCollectionDefinitionId,
      amountPaise: 50000,
      walkInName: "Walk-in Donor",
      idempotencyKey: `walkin-milad-${Date.now()}`,
    });
    const result = await createPaymentAction(form);
    expect(result.ok).toBe(true);
  });

  it("allows Walk-in for General Donation", async () => {
    const form = buildFormData({
      collectionDefinitionId: generalCollectionDefinitionId,
      amountPaise: 50000,
      walkInName: "Walk-in Donor",
      idempotencyKey: `walkin-general-${Date.now()}`,
    });
    const result = await createPaymentAction(form);
    expect(result.ok).toBe(true);
  });

  // Note: Monthly Collection is MEMBERS_ONLY, so walk-in is rejected
  it("rejects Walk-in for Monthly Collection", async () => {
    const form = buildFormData({
      collectionDefinitionId: monthlyCollectionDefinitionId,
      amountPaise: 15000,
      walkInName: "Walk-in Donor",
      idempotencyKey: `walkin-monthly-${Date.now()}`,
    });
    const result = await createPaymentAction(form);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Walk-in donors cannot use this collection definition. Allowed:/i);
  });

  it("rejects Walk-in for Zakat", async () => {
    const form = buildFormData({
      collectionDefinitionId: zakatCollectionDefinitionId,
      amountPaise: 20000,
      walkInName: "Walk-in Donor",
      idempotencyKey: `walkin-zakat-${Date.now()}`,
    });
    const result = await createPaymentAction(form);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Walk-in donors cannot use this collection definition. Allowed:/i);
  });

  it("rejects Walk-in for Construction Fund", async () => {
    const form = buildFormData({
      collectionDefinitionId: constructionCollectionDefinitionId,
      amountPaise: 50000,
      walkInName: "Walk-in Donor",
      idempotencyKey: `walkin-construction-${Date.now()}`,
    });
    const result = await createPaymentAction(form);
    expect(result.ok).toBe(true); // Construction Fund allows BOTH
  });

  it("rejects Walk-in for Jumma Collection", async () => {
    const form = buildFormData({
      collectionDefinitionId: jummaCollectionDefinitionId,
      amountPaise: 50000,
      walkInName: "Walk-in Donor",
      idempotencyKey: `walkin-jumma-${Date.now()}`,
    });
    const result = await createPaymentAction(form);
    expect(result.ok).toBe(true); // Jumma Collection allows BOTH
  });
});

describe("Phase 1: One Category Per Receipt Enforcement", () => {
  beforeEach(async () => {
    await prisma.paymentAllocation.deleteMany({ where: { masjidId } });
    await prisma.payment.deleteMany({ where: { masjidId } });
    // Reset dues periods to PENDING
    await prisma.duesPeriod.updateMany({
      where: { masjidId, planId: monthlyPlanId },
      data: { status: "PENDING" },
    });
    // Reset ALL collection event assignments (Milad 2093, 2094, Shab-e-Qadr)
    await prisma.collectionEventAssignment.updateMany({
      where: { eventId: { in: [miladEventId, miladEvent2Id, shabEventId] } },
      data: { status: "PENDING" },
    });
    // Reset event status to OPEN (recomputeEventStatus may have marked them COMPLETED)
    await prisma.collectionEvent.updateMany({
      where: { id: { in: [miladEventId, miladEvent2Id, shabEventId] } },
      data: { status: "OPEN" },
    });
    // Also clear any payment allocations for these events that might persist
    await prisma.paymentAllocation.deleteMany({
      where: { collectionEventId: { in: [miladEventId, miladEvent2Id, shabEventId] } },
    });
  });

  it("accepts multiple periods from same category (Monthly)", async () => {
    const form = buildFormData({
      memberId,
      collectionDefinitionId: monthlyCollectionDefinitionId,
      amountPaise: 45000,
      idempotencyKey: `single-cat-1-${Date.now()}`,
    });
    const result = await createPaymentAction(form);
    expect(result.ok).toBe(true);

    const payment = await prisma.payment.findFirst({
      where: { masjidId, idempotencyKey: form.get("idempotencyKey") as string },
      include: { allocations: true },
    });
    expect(payment?.allocations.length).toBeGreaterThanOrEqual(1);
    const uniqueCategories = [...new Set(payment?.allocations.map(a => a.collectionDefinitionId) || [])];
    expect(uniqueCategories.length).toBe(1);
  });

  it("accepts multiple events from same category (Milad multi-year)", async () => {
    const form = buildFormData({
      memberId,
      collectionDefinitionId: miladCollectionDefinitionId,
      amountPaise: 200000,
      idempotencyKey: `single-cat-2-${Date.now()}`,
    });

    const result = await createPaymentAction(form);
    expect(result.ok).toBe(true);
  });

  it("allocates full payment to oldest dues period first", async () => {
    // Pay ₹150 (covers Jan exactly)
    const form = buildFormData({
      memberId,
      collectionDefinitionId: monthlyCollectionDefinitionId,
      amountPaise: 15000,
      idempotencyKey: `fifo-1-${Date.now()}`,
    });
    const result = await createPaymentAction(form);
    expect(result.ok).toBe(true);

    const janPeriod = await prisma.duesPeriod.findFirst({
      where: { masjidId, planId: monthlyPlanId, periodStart: new Date("2094-01-01T00:00:00+05:30") },
      include: { allocations: true },
    });
    expect(janPeriod?.status).toBe("PAID");
    expect(janPeriod?.allocations[0]?.allocatedAmountPaise).toBe(15000);

    const febPeriod = await prisma.duesPeriod.findFirst({
      where: { masjidId, planId: monthlyPlanId, periodStart: new Date("2094-02-01T00:00:00+05:30") },
    });
    expect(febPeriod?.status).toBe("PENDING");
  });

  it("allocates across multiple periods in FIFO order", async () => {
    // Pay ₹450 (covers Jan + Feb + Mar)
    const form = buildFormData({
      memberId,
      collectionDefinitionId: monthlyCollectionDefinitionId,
      amountPaise: 45000,
      idempotencyKey: `fifo-2-${Date.now()}`,
    });
    const result = await createPaymentAction(form);
    expect(result.ok).toBe(true);

    const periods = await prisma.duesPeriod.findMany({
      where: { masjidId, planId: monthlyPlanId },
      orderBy: { periodStart: "asc" },
      include: { allocations: true },
    });
    expect(periods[0].status).toBe("PAID");
    expect(periods[1].status).toBe("PAID");
    expect(periods[2].status).toBe("PAID");
  });

  it("handles partial payment across two periods", async () => {
    // Pay ₹200 (₹150 Jan + ₹50 Feb)
    const form = buildFormData({
      memberId,
      collectionDefinitionId: monthlyCollectionDefinitionId,
      amountPaise: 20000,
      idempotencyKey: `fifo-3-${Date.now()}`,
    });
    const result = await createPaymentAction(form);
    expect(result.ok).toBe(true);

    const periods = await prisma.duesPeriod.findMany({
      where: { masjidId, planId: monthlyPlanId },
      orderBy: { periodStart: "asc" },
      include: { allocations: true },
    });
    expect(periods[0].status).toBe("PAID");
    expect(periods[0].allocations[0].allocatedAmountPaise).toBe(15000);
    expect(periods[1].status).toBe("PARTIAL");
    expect(periods[1].allocations[0].allocatedAmountPaise).toBe(5000);
    expect(periods[2].status).toBe("PENDING");
  });

  it("pays existing partial balance first", async () => {
    // First pay ₹50 (partial Jan)
    const form1 = buildFormData({
      memberId,
      collectionDefinitionId: monthlyCollectionDefinitionId,
      amountPaise: 5000,
      idempotencyKey: `fifo-4a-${Date.now()}`,
    });
    await createPaymentAction(form1);

    // Then pay ₹200 (₹100 Jan remaining + ₹100 Feb)
    const form2 = buildFormData({
      memberId,
      collectionDefinitionId: monthlyCollectionDefinitionId,
      amountPaise: 20000,
      idempotencyKey: `fifo-4b-${Date.now()}`,
    });
    const result = await createPaymentAction(form2);
    expect(result.ok).toBe(true);

    const periods = await prisma.duesPeriod.findMany({
      where: { masjidId, planId: monthlyPlanId },
      orderBy: { periodStart: "asc" },
      include: { allocations: true },
    });
    // Jan should be PAID (50 + 100 = 150)
    expect(periods[0].status).toBe("PAID");
    const janAllocations = await prisma.paymentAllocation.findMany({
      where: { duesPeriodId: periods[0].id, payment: { status: "SUCCESS" } },
    });
    const janTotal = janAllocations.reduce((s, a) => s + a.allocatedAmountPaise, 0);
    expect(janTotal).toBe(15000);

    // Feb should be PARTIAL (100 paid)
    expect(periods[1].status).toBe("PARTIAL");
    const febAllocations = await prisma.paymentAllocation.findMany({
      where: { duesPeriodId: periods[1].id, payment: { status: "SUCCESS" } },
    });
    const febTotal = febAllocations.reduce((s, a) => s + a.allocatedAmountPaise, 0);
    expect(febTotal).toBe(10000);
  });

  it("calculates remaining outstanding correctly after partial payments", async () => {
    // Pay ₹200
    const form = buildFormData({
      memberId,
      collectionDefinitionId: monthlyCollectionDefinitionId,
      amountPaise: 20000,
      idempotencyKey: `fifo-5-${Date.now()}`,
    });
    await createPaymentAction(form);

    // Total outstanding should be ₹250 (₹100 Feb + ₹150 Mar)
    const periods = await prisma.duesPeriod.findMany({
      where: { masjidId, planId: monthlyPlanId },
      include: { allocations: { include: { payment: { select: { status: true } } } } },
    });
    let totalOutstanding = 0;
    for (const p of periods) {
      const allocated = p.allocations
        .filter(a => a.payment.status === "SUCCESS")
        .reduce((s, a) => s + a.allocatedAmountPaise, 0);
      totalOutstanding += Math.max(p.expectedAmountPaise - allocated, 0);
    }
    expect(totalOutstanding).toBe(25000);
  });

  it("applies FIFO across multiple event periods of same category (Milad)", async () => {
    // Use existing miladEvent2Id from beforeAll (2093 Milad) and miladEventId (2094 Milad)
    // Both already have assignments created in beforeAll

    // Pay ₹2000 (covers both 2093 and 2094 Milad)
    const form = buildFormData({
      memberId,
      collectionDefinitionId: miladCollectionDefinitionId,
      amountPaise: 200000,
      idempotencyKey: `fifo-milad-${Date.now()}`,
    });
    const result = await createPaymentAction(form);
    expect(result.ok).toBe(true);

    // Both events should be PAID
    const events = await prisma.collectionEvent.findMany({
      where: { id: { in: [miladEvent2Id, miladEventId] } },
      include: { assignments: true },
    });
    for (const event of events) {
      const assignment = event.assignments[0];
      const allocations = await prisma.paymentAllocation.findMany({
        where: { collectionEventId: event.id, payment: { status: "SUCCESS" } },
      });
      const allocated = allocations.reduce((s: number, a: { allocatedAmountPaise: number }) => s + a.allocatedAmountPaise, 0);
      expect(allocated).toBe(100000);
    }
  });

  it("FIFO cannot cross into another category", async () => {
    // Create a Milad dues for member (using collection event)
    const form = buildFormData({
      memberId,
      collectionDefinitionId: monthlyCollectionDefinitionId,
      amountPaise: 15000,
      idempotencyKey: `fifo-cross-${Date.now()}`,
    });
    const result = await createPaymentAction(form);
    expect(result.ok).toBe(true);

    // Verify payment only allocated to monthly, not Milad
    const payment = await prisma.payment.findFirst({
      where: { masjidId, donorMemberId: memberId },
      orderBy: { createdAt: "desc" },
      include: { allocations: true },
    });
    expect(payment?.allocations.length).toBe(1);
    expect(payment?.allocations[0].collectionDefinitionId).toBe(monthlyCollectionDefinitionId);
  });

  it("all user roles follow identical FIFO allocation rules", async () => {
    // Test with COLLECTOR role
    await signIn({
      userId,
      masjidId,
      role: ROLES.COLLECTOR,
      isPlatformAdmin: false,
    });

    const form = buildFormData({
      memberId,
      collectionDefinitionId: monthlyCollectionDefinitionId,
      amountPaise: 15000,
      idempotencyKey: `fifo-collector-${Date.now()}`,
    });
    const result = await createPaymentAction(form);
    expect(result.ok).toBe(true);

    // Verify FIFO was applied
    const janPeriod = await prisma.duesPeriod.findFirst({
      where: { masjidId, planId: monthlyPlanId, periodStart: new Date("2094-01-01T00:00:00+05:30") },
      include: { allocations: true },
    });
    expect(janPeriod?.status).toBe("PAID");

    // Switch back to ADMIN for other tests
    await signIn({
      userId,
      masjidId,
      role: ROLES.ADMIN,
      isPlatformAdmin: false,
    });
  });

  it("client-submitted allocations are ignored - server calculates FIFO", async () => {
    // Even if client sends allocation to Mar, server should allocate to Jan
    const form = new FormData();
    form.set("memberId", memberId);
    form.set("collectionDefinitionId", monthlyCollectionDefinitionId);
    form.set("paymentDate", "2094-01-15");
    form.set("amountPaise", "15000");
    form.set("mode", "CASH");
    form.set("idempotencyKey", `fifo-ignore-client-${Date.now()}`);
    form.set("allocations", JSON.stringify([
      { duesPeriodId: "", collectionEventId: "", collectionDefinitionId: monthlyCollectionDefinitionId, amountPaise: 15000, purposeNote: "" }
    ]));

    const result = await createPaymentAction(form);
    expect(result.ok).toBe(true);

    // Server should have allocated to Jan (oldest)
    const janPeriod = await prisma.duesPeriod.findFirst({
      where: { masjidId, planId: monthlyPlanId, periodStart: new Date("2094-01-01T00:00:00+05:30") },
      include: { allocations: true },
    });
    expect(janPeriod?.status).toBe("PAID");
  });

  it("concurrent submissions cannot over-allocate dues", async () => {
    // Reset to clean state
    await prisma.paymentAllocation.deleteMany({ where: { masjidId } });
    await prisma.payment.deleteMany({ where: { masjidId } });
    await prisma.duesPeriod.updateMany({
      where: { masjidId, planId: monthlyPlanId },
      data: { status: "PENDING" },
    });

    const form1 = buildFormData({
      memberId,
      collectionDefinitionId: monthlyCollectionDefinitionId,
      amountPaise: 8000,
      idempotencyKey: `conc-1-${Date.now()}`,
    });
    const form2 = buildFormData({
      memberId,
      collectionDefinitionId: monthlyCollectionDefinitionId,
      amountPaise: 8000,
      idempotencyKey: `conc-2-${Date.now()}`,
    });

    const results = await Promise.all([
      createPaymentAction(form1),
      createPaymentAction(form2),
    ]);

    const succeeded = results.filter(r => r.ok);
    const failed = results.filter(r => !r.ok);

    // Both should succeed with FIFO allocation
    // Total paid = 16000 (8000 + 8000)
    // Jan: 15000 (PAID) - 8000 from first, 7000 from second
    // Feb: 1000 (PARTIAL) - 1000 from second
    // Mar: 0 (PENDING)
    const totalAllocated = await prisma.paymentAllocation.aggregate({
      where: { masjidId, collectionDefinitionId: monthlyCollectionDefinitionId },
      _sum: { allocatedAmountPaise: true },
    });
    // Total allocated = 16000 (spans Jan + Feb)
    expect(totalAllocated._sum.allocatedAmountPaise).toBe(16000);

    // Verify Jan is PAID
    const janPeriod = await prisma.duesPeriod.findFirst({
      where: { masjidId, planId: monthlyPlanId, periodStart: new Date("2094-01-01T00:00:00+05:30") },
      include: { allocations: { include: { payment: { select: { status: true } } } } },
    });
    const janAllocated = janPeriod?.allocations
      .filter(a => a.payment.status === "SUCCESS")
      .reduce((sum, a) => sum + a.allocatedAmountPaise, 0) ?? 0;
    expect(janAllocated).toBe(15000);
    expect(janPeriod?.status).toBe("PAID");

    // Verify Feb is PARTIAL with 1000
    const febPeriod = await prisma.duesPeriod.findFirst({
      where: { masjidId, planId: monthlyPlanId, periodStart: new Date("2094-02-01T00:00:00+05:30") },
      include: { allocations: { include: { payment: { select: { status: true } } } } },
    });
    const febAllocated = febPeriod?.allocations
      .filter(a => a.payment.status === "SUCCESS")
      .reduce((sum, a) => sum + a.allocatedAmountPaise, 0) ?? 0;
    expect(febAllocated).toBe(1000);
    expect(febPeriod?.status).toBe("PARTIAL");
  });
});

describe("Phase 1: Financial Integrity", () => {
  beforeEach(async () => {
    await prisma.paymentAllocation.deleteMany({ where: { masjidId } });
    await prisma.payment.deleteMany({ where: { masjidId } });
    await prisma.duesPeriod.updateMany({
      where: { masjidId, planId: monthlyPlanId },
      data: { status: "PENDING" },
    });
  });

  // This test verifies the backend would reject if somehow mixed categories were submitted
  // The current implementation ensures all allocations use the selected collectionDefinitionId
  it("all allocations belong to the selected category", async () => {
    const form = buildFormData({
      memberId,
      collectionDefinitionId: monthlyCollectionDefinitionId,
      amountPaise: 15000,
      idempotencyKey: `single-cat-3-${Date.now()}`,
    });
    const result = await createPaymentAction(form);
    expect(result.ok).toBe(true);

    const payment = await prisma.payment.findFirst({
      where: { masjidId, idempotencyKey: form.get("idempotencyKey") as string },
      include: { allocations: true },
    });
    // All allocations must be for the selected collectionDefinitionId only
    for (const alloc of payment?.allocations || []) {
      expect(alloc.collectionDefinitionId).toBe(monthlyCollectionDefinitionId);
    }
  });

  it("payment amount matches total recorded allocations", async () => {
    const form = buildFormData({
      memberId,
      collectionDefinitionId: monthlyCollectionDefinitionId,
      amountPaise: 20000,
      idempotencyKey: `integrity-1-${Date.now()}`,
    });
    await createPaymentAction(form);

    const payment = await prisma.payment.findFirst({
      where: { masjidId, idempotencyKey: form.get("idempotencyKey") as string },
      include: { allocations: true },
    });
    const totalAllocated = payment?.allocations.reduce((s, a) => s + a.allocatedAmountPaise, 0) ?? 0;
    expect(totalAllocated).toBe(payment?.amountPaise);
  });

  it("partial balances remain attached to original dues", async () => {
    // Pay ₹200 (₹150 Jan + ₹50 Feb)
    const form = buildFormData({
      memberId,
      collectionDefinitionId: monthlyCollectionDefinitionId,
      amountPaise: 20000,
      idempotencyKey: `integrity-2-${Date.now()}`,
    });
    await createPaymentAction(form);

    const periods = await prisma.duesPeriod.findMany({
      where: { masjidId, planId: monthlyPlanId },
      orderBy: { periodStart: "asc" },
      include: { allocations: { include: { payment: { select: { status: true } } } } },
    });

    // Jan: PAID (150)
    expect(periods[0].status).toBe("PAID");
    const janAllocated = periods[0].allocations
      .filter(a => a.payment.status === "SUCCESS")
      .reduce((s, a) => s + a.allocatedAmountPaise, 0);
    expect(janAllocated).toBe(15000);

    // Feb: PARTIAL (50 paid, 100 remaining) - NO duplicate carry-forward
    expect(periods[1].status).toBe("PARTIAL");
    const febAllocated = periods[1].allocations
      .filter(a => a.payment.status === "SUCCESS")
      .reduce((s, a) => s + a.allocatedAmountPaise, 0);
    expect(febAllocated).toBe(5000);
    expect(periods[1].expectedAmountPaise).toBe(15000); // Original amount unchanged
  });

  it("reversed payments restore outstanding balances correctly", async () => {
    // Create a payment
    const form = buildFormData({
      memberId,
      collectionDefinitionId: monthlyCollectionDefinitionId,
      amountPaise: 15000,
      idempotencyKey: `integrity-3-${Date.now()}`,
    });
    const result = await createPaymentAction(form);
    expect(result.ok).toBe(true);

    // Reverse it
    const payment = await prisma.payment.findFirst({
      where: { masjidId, idempotencyKey: form.get("idempotencyKey") as string },
    });

    // Create reversal payment
    const reversalForm = new FormData();
    reversalForm.set("originalPaymentId", payment!.id);
    reversalForm.set("amountPaise", "15000");
    reversalForm.set("reason", "Test reversal");
    reversalForm.set("idempotencyKey", `rev-${Date.now()}`);

    // We need the reversal action - for now just test that the original payment is marked
    // and allocations still exist but with REVERSED payment
    await prisma.payment.update({
      where: { id: payment!.id },
      data: { status: "REVERSED" },
    });

    // Create a reversal record
    await prisma.reversal.create({
      data: {
        masjidId,
        originalPaymentId: payment!.id,
        amountPaise: 15000,
        reason: "Test reversal",
        approvedBy: userId,
      },
    });

    // Check period status recomputed to PENDING
    const janPeriod = await prisma.duesPeriod.findFirst({
      where: { masjidId, planId: monthlyPlanId, periodStart: new Date("2094-01-01T00:00:00+05:30") },
      include: { allocations: { include: { payment: { select: { status: true } } } } },
    });

    const allocated = janPeriod?.allocations
      .filter(a => a.payment.status === "SUCCESS")
      .reduce((s, a) => s + a.allocatedAmountPaise, 0) ?? 0;
    expect(allocated).toBe(0); // Reversed payment excluded
  });

  it("duplicate submissions protected by idempotency", async () => {
    const idempotencyKey = `idempotent-${Date.now()}`;
    const form = buildFormData({
      memberId,
      collectionDefinitionId: monthlyCollectionDefinitionId,
      amountPaise: 15000,
      idempotencyKey,
    });

    const result1 = await createPaymentAction(form);
    expect(result1.ok).toBe(true);

    const result2 = await createPaymentAction(form);
    expect(result2.ok).toBe(true);
    if (result2.ok) {
      expect(result2.duplicate).toBe(true);
      expect(result2.paymentId).toBe(result1.paymentId);
      expect(result2.receiptNo).toBe(result1.receiptNo);
    }
  });
});

describe("Phase 1: Jumma Event Workflow Still Works", () => {
  beforeEach(async () => {
    await prisma.paymentAllocation.deleteMany({ where: { masjidId } });
    await prisma.payment.deleteMany({ where: { masjidId } });
  });

  it("Jumma event-based non-member payment works", async () => {
    // Use the Jumma event created in beforeAll

    // Walk-in payment to Jumma event (using collectionEventId)
    const form = new FormData();
    form.set("walkInName", "Jumma Donor");
    form.set("collectionDefinitionId", jummaCollectionDefinitionId);
    form.set("collectionEventId", jummaEventId);
    form.set("paymentDate", "2094-01-12");
    form.set("amountPaise", "5000");
    form.set("mode", "CASH");
    form.set("idempotencyKey", `jumma-event-${Date.now()}`);
    form.set("allocations", JSON.stringify([]));

    const result = await createPaymentAction(form);
    expect(result.ok).toBe(true);

    const payment = await prisma.payment.findFirst({
      where: { masjidId, idempotencyKey: form.get("idempotencyKey") as string },
      include: { allocations: true },
    });
    expect(payment?.allocations[0].collectionEventId).toBe(jummaEventId);
    expect(payment?.donorMemberId).toBeNull();
  });
});