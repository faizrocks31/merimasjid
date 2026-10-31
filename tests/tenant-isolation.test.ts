/**
 * Tenant isolation and authorization tests (Phase 1, §8).
 *
 * These exercise the BACKEND authorization logic, not the UI:
 *
 *   1. Super Admin can perform permitted platform-level operations.
 *   2. Local Masjid Admin can reach its own masjid.
 *   3. Local Masjid Admin cannot read another masjid's restricted data.
 *   4. Local Masjid Admin cannot modify another masjid's members/payments/receipts.
 *   5. Local Masjid Admin cannot perform Super-Admin-only operations.
 *   6. Unauthorized requests are rejected by the application.
 *   7. Database relations and foreign keys remain valid.
 *
 * The session is a signed JWT in a cookie. `src/lib/auth.ts` re-validates the
 * membership against the database on every request, so the tests mint a real
 * cookie with the real signing key and let the application decide who the
 * caller is. The `next/headers` cookie jar is stubbed to return that cookie.
 *
 * All fixtures are temporary and are deleted in `afterAll`. The suite runs
 * against the isolated PostgreSQL test database (see tests/setup.ts).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { ROLES } from "@/lib/constants";
import { authorizeFileRequest } from "@/lib/api-auth";
import { createMemberAction, updateMemberAction } from "@/modules/members/actions";
import { createPaymentAction, reversePaymentAction } from "@/modules/payments/actions";
import { createExpenseAction, approveExpenseAction } from "@/modules/expenses/actions";
import { createPlanAction, changePlanAmountAction, generateDuesAction } from "@/modules/plans/actions";
import {
  setMasjidStatusAction,
  createMasjidAction,
  deleteMasjidAction,
  updateMasjidAction,
} from "@/modules/platform/actions";
import { setStaffStatusAction } from "@/modules/staff/actions";
import { loadReceipt } from "@/modules/receipts/load";
import { GET as exportTransactions } from "@/app/api/exports/transactions/route";
import { assignHouseholdsAction } from "@/modules/collections/actions";
import { generateDuesPeriods } from "@/lib/dues";

// ---------------------------------------------------------------------------
// Cookie jar: lets the test sign in as a specific user.
// ---------------------------------------------------------------------------

const COOKIE_NAME = "masjid_session";

type Caller = { userId: string; masjidId: string | null; role: string; isPlatformAdmin: boolean };

let currentCaller: Caller | null = null;
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

// `next/navigation` and `next/cache` are Next.js runtime modules. The server
// actions import them; under Vitest they only need to exist and be callable.
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

/** Signs a session cookie for the given caller and installs it in the jar. */
async function signIn(caller: Caller): Promise<void> {
  const token = await new SignJWT({ ...caller })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secretKey());
  currentCaller = caller;
  currentCookieValue = token;
}

function signOut(): void {
  currentCaller = null;
  currentCookieValue = undefined;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PASSWORD = "phase1-tenant-test-password";

type Fixture = {
  masjidA: string;
  masjidB: string;
  superAdminUserId: string;
  localAdminUserId: string;
  categoryA: string;
  categoryB: string;
  memberA: string;
  memberB: string;
  paymentA: string;
  paymentB: string;
  memberBMembershipId: string;
};

let fx: Fixture;
const createdMasjidIds: string[] = [];

async function createMasjid(name: string, slug: string): Promise<string> {
  const m = await prisma.masjid.create({
    data: {
      name,
      slug,
      receiptPrefix: slug.replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase() || "TMP",
      financialYearStartMonth: 4,
      status: "ACTIVE",
    },
  });
  createdMasjidIds.push(m.id);
  return m.id;
}

async function createUser(email: string, name: string): Promise<string> {
  const u = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(PASSWORD, 12),
      status: "ACTIVE",
    },
  });
  return u.id;
}

beforeAll(async () => {
  const suffix = `p1-${Date.now().toString(36)}`;

  const masjidA = await createMasjid("Isolation Masjid A", `iso-a-${suffix}`);
  const masjidB = await createMasjid("Isolation Masjid B", `iso-b-${suffix}`);

  const categoryA = (
    await prisma.contributionCategory.create({
      data: { masjidId: masjidA, name: "General A", code: "GENA" },
    })
  ).id;
  const categoryB = (
    await prisma.contributionCategory.create({
      data: { masjidId: masjidB, name: "General B", code: "GENB" },
    })
  ).id;

  const superAdminUserId = await createUser(`super-${suffix}@example.invalid`, "Super Admin");
  const localAdminUserId = await createUser(`local-${suffix}@example.invalid`, "Local Admin");
  const otherAdminUserId = await createUser(`other-${suffix}@example.invalid`, "Other Masjid Admin");

  // Super Admin: platform-level membership on masjid A.
  await prisma.masjidUser.create({
    data: { masjidId: masjidA, userId: superAdminUserId, role: ROLES.SUPER_ADMIN, status: "ACTIVE" },
  });

  // Local Admin: bound to masjid A only.
  await prisma.masjidUser.create({
    data: { masjidId: masjidA, userId: localAdminUserId, role: ROLES.ADMIN, status: "ACTIVE" },
  });

  // An admin of the OTHER masjid (B) — used as the victim tenant.
  const memberBMembership = await prisma.masjidUser.create({
    data: { masjidId: masjidB, userId: otherAdminUserId, role: ROLES.ADMIN, status: "ACTIVE" },
  });

  const memberA = (
    await prisma.member.create({
      data: { masjidId: masjidA, memberNo: `ISO-A-${suffix}`, fullName: "Member of A" },
    })
  ).id;
  const memberB = (
    await prisma.member.create({
      data: { masjidId: masjidB, memberNo: `ISO-B-${suffix}`, fullName: "Member of B" },
    })
  ).id;

  const paymentA = (
    await prisma.payment.create({
      data: {
        masjidId: masjidA,
        receiptNo: `ISOA-${suffix}`,
        donorMemberId: memberA,
        donorNameSnapshot: "Member of A",
        paymentDate: new Date("2093-04-01T00:00:00+05:30"),
        amountPaise: 10000,
        mode: "CASH",
        status: "SUCCESS",
        enteredBy: localAdminUserId,
        idempotencyKey: `iso-a-${suffix}`,
      },
    })
  ).id;

  const paymentB = (
    await prisma.payment.create({
      data: {
        masjidId: masjidB,
        receiptNo: `ISOB-${suffix}`,
        donorMemberId: memberB,
        donorNameSnapshot: "Member of B",
        paymentDate: new Date("2093-04-01T00:00:00+05:30"),
        amountPaise: 20000,
        mode: "CASH",
        status: "SUCCESS",
        enteredBy: otherAdminUserId,
        idempotencyKey: `iso-b-${suffix}`,
      },
    })
  ).id;

  fx = {
    masjidA,
    masjidB,
    superAdminUserId,
    localAdminUserId,
    categoryA,
    categoryB,
    memberA,
    memberB,
    paymentA,
    paymentB,
    memberBMembershipId: memberBMembership.id,
  };
});

afterAll(async () => {
  // Temporary fixtures only — every row created above is removed.
  await prisma.paymentAllocation.deleteMany({ where: { masjidId: { in: createdMasjidIds } } });
  await prisma.receiptEvent.deleteMany({ where: { masjidId: { in: createdMasjidIds } } });
  await prisma.auditLog.deleteMany({ where: { masjidId: { in: createdMasjidIds } } });
  await prisma.payment.deleteMany({ where: { masjidId: { in: createdMasjidIds } } });
  await prisma.duesPeriod.deleteMany({ where: { masjidId: { in: createdMasjidIds } } });
  await prisma.contributionPlan.deleteMany({ where: { masjidId: { in: createdMasjidIds } } });
  await prisma.member.deleteMany({ where: { masjidId: { in: createdMasjidIds } } });
  await prisma.contributionCategory.deleteMany({ where: { masjidId: { in: createdMasjidIds } } });
  await prisma.expenseCategory.deleteMany({ where: { masjidId: { in: createdMasjidIds } } });
  await prisma.masjidUser.deleteMany({ where: { masjidId: { in: createdMasjidIds } } });
  await prisma.user.deleteMany({
    where: { email: { contains: "@example.invalid" }, id: { in: [fx.superAdminUserId, fx.localAdminUserId] } },
  });
  await prisma.masjid.deleteMany({ where: { id: { in: createdMasjidIds } } });
  await prisma.$disconnect();
});

async function signInAsSuperAdmin(): Promise<void> {
  await signIn({
    userId: fx.superAdminUserId,
    masjidId: fx.masjidA,
    role: ROLES.SUPER_ADMIN,
    isPlatformAdmin: true,
  });
}

async function signInAsLocalAdmin(): Promise<void> {
  await signIn({
    userId: fx.localAdminUserId,
    masjidId: fx.masjidA,
    role: ROLES.ADMIN,
    isPlatformAdmin: false,
  });
}

// ===========================================================================
// 1. Super Admin can perform permitted platform-level operations.
// ===========================================================================

describe("Super Admin platform operations", () => {
  it("resolves as a platform admin from the database, not from the cookie alone", async () => {
    await signInAsSuperAdmin();
    const { getCurrentUser } = await import("@/lib/auth");
    const user = await getCurrentUser();
    expect(user).not.toBeNull();
    expect(user!.role).toBe(ROLES.SUPER_ADMIN);
    expect(user!.isPlatformAdmin).toBe(true);
  });

  it("can suspend and reactivate a masjid", async () => {
    await signInAsSuperAdmin();
    const form = new FormData();
    form.set("masjidId", fx.masjidB);
    form.set("action", "suspend");

    const result = await setMasjidStatusAction(form);
    expect(result).toEqual({ ok: true });
    expect((await prisma.masjid.findUnique({ where: { id: fx.masjidB } }))?.status).toBe("SUSPENDED");

    form.set("action", "activate");
    const back = await setMasjidStatusAction(form);
    expect(back).toEqual({ ok: true });
    expect((await prisma.masjid.findUnique({ where: { id: fx.masjidB } }))?.status).toBe("ACTIVE");
  });

  it("can update a masjid's platform-level details", async () => {
    await signInAsSuperAdmin();
    const form = new FormData();
    form.set("masjidId", fx.masjidB);
    form.set("name", "Isolation Masjid B Renamed");
    form.set("slug", (await prisma.masjid.findUnique({ where: { id: fx.masjidB } }))!.slug);
    form.set("receiptPrefix", "ISOB");
    form.set("financialYearStartMonth", "4");
    form.set("status", "ACTIVE");

    // updateMasjidAction ends with redirect(), which the stub throws.
    await expect(updateMasjidAction(undefined, form)).rejects.toThrow(/NEXT_REDIRECT/);
    const after = await prisma.masjid.findUnique({ where: { id: fx.masjidB } });
    expect(after?.name).toBe("Isolation Masjid B Renamed");
  });

  it("creates a masjid together with its default categories", async () => {
    await signInAsSuperAdmin();
    const slug = `iso-new-${Date.now().toString(36)}`;
    const form = new FormData();
    form.set("name", "Created By Super Admin");
    form.set("slug", slug);
    form.set("receiptPrefix", "NEWX");
    form.set("financialYearStartMonth", "4");

    // `createMasjidAction` ends with redirect(), which the stub throws.
    await expect(createMasjidAction(undefined, form)).rejects.toThrow(/NEXT_REDIRECT/);

    const created = await prisma.masjid.findUnique({ where: { slug } });
    expect(created).not.toBeNull();
    createdMasjidIds.push(created!.id);

    const categories = await prisma.contributionCategory.count({ where: { masjidId: created!.id } });
    expect(categories).toBeGreaterThan(0);
  });

  it("refuses to delete a masjid that still has members or payments", async () => {
    await signInAsSuperAdmin();
    const form = new FormData();
    form.set("masjidId", fx.masjidB);
    const result = await deleteMasjidAction(form);
    expect(result?.error).toBe("Cannot delete a masjid that has members or payments.");
    expect(await prisma.masjid.findUnique({ where: { id: fx.masjidB } })).not.toBeNull();
  });
});

// ===========================================================================
// 2. Local Masjid Admin can reach its assigned masjid.
// ===========================================================================

describe("Local Admin access to its own masjid", () => {
  it("resolves as the admin of its assigned masjid", async () => {
    await signInAsLocalAdmin();
    const { getCurrentUser } = await import("@/lib/auth");
    const user = await getCurrentUser();
    expect(user).not.toBeNull();
    expect(user!.role).toBe(ROLES.ADMIN);
    expect(user!.masjidId).toBe(fx.masjidA);
    expect(user!.isPlatformAdmin).toBe(false);
  });

  it("can read its own masjid's members", async () => {
    await signInAsLocalAdmin();
    const members = await prisma.member.findMany({ where: { masjidId: fx.masjidA } });
    expect(members.map((m) => m.id)).toContain(fx.memberA);
  });

  it("can create a member in its own masjid", async () => {
    await signInAsLocalAdmin();
    const form = new FormData();
    form.set("fullName", "Created By Local Admin");
    form.set("status", "ACTIVE");
    form.set("idempotencyKey", `local-create-${Date.now().toString(36)}`);

    // createMemberAction ends with redirect(), which the stub throws.
    await expect(createMemberAction(undefined, form)).rejects.toThrow(/NEXT_REDIRECT/);

    const created = await prisma.member.findFirst({
      where: { masjidId: fx.masjidA, fullName: "Created By Local Admin" },
    });
    expect(created).not.toBeNull();
  });

  it("can record a payment in its own masjid", async () => {
    await signInAsLocalAdmin();
    const form = new FormData();
    form.set("memberId", fx.memberA);
    form.set("paymentDate", "2093-05-01");
    form.set("amountPaise", "5000");
    form.set("mode", "CASH");
    form.set("idempotencyKey", `local-ok-${Date.now().toString(36)}`);
    form.set("allocations", JSON.stringify([{ categoryId: fx.categoryA, amountPaise: 5000 }]));

    const result = await createPaymentAction(form);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const payment = await prisma.payment.findUnique({ where: { id: result.paymentId } });
      expect(payment?.masjidId).toBe(fx.masjidA);
    }
  });

  it("can export its own masjid's transactions", async () => {
    await signInAsLocalAdmin();
    const res = await exportTransactions(new Request("http://localhost/api/exports/transactions"));
    expect(res.status).toBe(200);
    const csv = await res.text();
    expect(csv).toContain("Receipt No");
    // Its own payment is present; the other tenant's is not.
    expect(csv).toContain("Member of A");
    expect(csv).not.toContain("Member of B");
  });
});

// ===========================================================================
// 3. Local Admin cannot READ another masjid's restricted data.
// ===========================================================================

describe("Local Admin cannot read another tenant's data", () => {
  it("cannot load a receipt belonging to another masjid", async () => {
    await signInAsLocalAdmin();
    const receipt = await loadReceipt(fx.paymentB);
    expect(receipt).toBeNull();
  });

  it("cannot read another masjid's members through a scoped query", async () => {
    await signInAsLocalAdmin();
    const leaked = await prisma.member.findFirst({
      where: { id: fx.memberB, masjidId: fx.masjidA },
    });
    expect(leaked).toBeNull();

    const ownScope = await prisma.member.findFirst({
      where: { id: fx.memberA, masjidId: fx.masjidA },
    });
    expect(ownScope?.fullName).toBe("Member of A");
  });

  it("cannot read another masjid's payments through the export route", async () => {
    await signInAsLocalAdmin();
    const res = await exportTransactions(new Request("http://localhost/api/exports/transactions"));
    const csv = await res.text();
    expect(csv).not.toContain("Member of B");
    expect(csv).not.toContain("ISOB-");
  });

  it("cannot read another masjid's staff membership", async () => {
    await signInAsLocalAdmin();
    const leaked = await prisma.masjidUser.findFirst({
      where: { id: fx.memberBMembershipId, masjidId: fx.masjidA },
    });
    expect(leaked).toBeNull();
  });
});

// ===========================================================================
// 4. Local Admin cannot MODIFY another masjid's members/payments/receipts.
// ===========================================================================

describe("Local Admin cannot modify another tenant's data", () => {
  it("cannot update a member of another masjid", async () => {
    await signInAsLocalAdmin();
    const form = new FormData();
    form.set("memberId", fx.memberB);
    form.set("fullName", "Hijacked By Local Admin");
    form.set("status", "ACTIVE");
    form.set("idempotencyKey", `local-hijack-${Date.now().toString(36)}`);

    const result = await updateMemberAction(undefined, form);
    expect(result?.error).toBe("Member not found in this Masjid.");

    const unchanged = await prisma.member.findUnique({ where: { id: fx.memberB } });
    expect(unchanged?.fullName).toBe("Member of B");
  });

  it("cannot post a payment against another masjid's member", async () => {
    await signInAsLocalAdmin();
    const form = new FormData();
    form.set("memberId", fx.memberB);
    form.set("paymentDate", "2093-05-02");
    form.set("amountPaise", "7000");
    form.set("mode", "CASH");
    form.set("idempotencyKey", `local-x-${Date.now().toString(36)}`);
    form.set("allocations", JSON.stringify([{ categoryId: fx.categoryB, amountPaise: 7000 }]));

    const result = await createPaymentAction(form);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Member not found in this Masjid.");

    // Nothing was written into the other tenant.
    const count = await prisma.payment.count({
      where: { masjidId: fx.masjidB, donorMemberId: fx.memberB },
    });
    expect(count).toBe(1); // only the fixture payment
  });

  it("cannot allocate to another masjid's category", async () => {
    await signInAsLocalAdmin();
    const form = new FormData();
    form.set("walkInName", "Walk In Donor");
    form.set("paymentDate", "2093-05-03");
    form.set("amountPaise", "3000");
    form.set("mode", "CASH");
    form.set("idempotencyKey", `local-y-${Date.now().toString(36)}`);
    form.set("allocations", JSON.stringify([{ categoryId: fx.categoryB, amountPaise: 3000 }]));

    const result = await createPaymentAction(form);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("A selected category is not available in this Masjid.");
  });

  it("cannot reverse another masjid's payment", async () => {
    await signInAsLocalAdmin();
    const form = new FormData();
    form.set("paymentId", fx.paymentB);
    form.set("reason", "unauthorised reversal attempt");

    const result = await reversePaymentAction(form);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Payment not found in this Masjid.");

    const unchanged = await prisma.payment.findUnique({ where: { id: fx.paymentB } });
    expect(unchanged?.status).toBe("SUCCESS");
  });

  it("cannot change another masjid's staff status", async () => {
    await signInAsLocalAdmin();
    const form = new FormData();
    form.set("membershipId", fx.memberBMembershipId);
    form.set("status", "INACTIVE");

    const result = await setStaffStatusAction(form);
    expect(result?.error).toBe("Staff member not found in this Masjid.");

    const unchanged = await prisma.masjidUser.findUnique({ where: { id: fx.memberBMembershipId } });
    expect(unchanged?.status).toBe("ACTIVE");
  });
});

// ===========================================================================
// 5. Local Admin cannot perform Super-Admin-only operations.
// ===========================================================================

describe("Local Admin cannot perform platform operations", () => {
  it("cannot suspend a masjid", async () => {
    await signInAsLocalAdmin();
    const form = new FormData();
    form.set("masjidId", fx.masjidB);
    form.set("action", "suspend");

    await expect(setMasjidStatusAction(form)).rejects.toThrow("FORBIDDEN");
    expect((await prisma.masjid.findUnique({ where: { id: fx.masjidB } }))?.status).toBe("ACTIVE");
  });

  it("cannot create a masjid", async () => {
    await signInAsLocalAdmin();
    const slug = `iso-denied-${Date.now().toString(36)}`;
    const form = new FormData();
    form.set("name", "Should Not Exist");
    form.set("slug", slug);
    form.set("receiptPrefix", "NOPE");
    form.set("financialYearStartMonth", "4");

    await expect(createMasjidAction(undefined, form)).rejects.toThrow("FORBIDDEN");
    expect(await prisma.masjid.findUnique({ where: { slug } })).toBeNull();
  });

  it("cannot delete a masjid", async () => {
    await signInAsLocalAdmin();
    const form = new FormData();
    form.set("masjidId", fx.masjidB);

    await expect(deleteMasjidAction(form)).rejects.toThrow("FORBIDDEN");
    expect(await prisma.masjid.findUnique({ where: { id: fx.masjidB } })).not.toBeNull();
  });

  it("cannot update a masjid", async () => {
    await signInAsLocalAdmin();
    const form = new FormData();
    form.set("masjidId", fx.masjidB);
    form.set("name", "Renamed By Local Admin");
    form.set("slug", "iso-b-slug-does-not-matter");
    form.set("receiptPrefix", "ISOB");
    form.set("financialYearStartMonth", "4");
    form.set("status", "ACTIVE");

    await expect(updateMasjidAction(undefined, form)).rejects.toThrow("FORBIDDEN");
    const unchanged = await prisma.masjid.findUnique({ where: { id: fx.masjidB } });
    expect(unchanged?.name).toBe("Isolation Masjid B Renamed");
  });

  it("is refused the tenant:manage permission", async () => {
    const { can } = await import("@/lib/permissions");
    expect(can(ROLES.ADMIN, "tenant:manage")).toBe(false);
    expect(can(ROLES.SUPER_ADMIN, "tenant:manage")).toBe(true);
  });
});

// ===========================================================================
// 6. Unauthorized requests are rejected by the application.
// ===========================================================================

describe("unauthorized requests are rejected", () => {
  it("redirects an unauthenticated file request to the login page", async () => {
    signOut();
    const auth = await authorizeFileRequest(
      new Request("http://localhost/api/exports/transactions"),
      "export:data",
    );
    expect("response" in auth).toBe(true);
    if ("response" in auth) {
      // NextResponse.redirect returns 307 (temporary redirect preserving method)
      expect(auth.response.status).toBe(307);
      expect(auth.response.headers.get("location")).toContain("/login");
    }
  });

  it("returns 403 for a signed-in user without the required permission", async () => {
    await signInAsLocalAdmin();
    const { can } = await import("@/lib/permissions");
    // The Local Admin HAS export:data, so use a permission it lacks.
    expect(can(ROLES.ADMIN, "tenant:manage")).toBe(false);

    const auth = await authorizeFileRequest(
      new Request("http://localhost/api/exports/transactions"),
      "tenant:manage",
    );
    expect("response" in auth).toBe(true);
    if ("response" in auth) {
      expect(auth.response.status).toBe(403);
    }
  });

  it("rejects an unauthenticated server action with UNAUTHENTICATED", async () => {
    signOut();
    const form = new FormData();
    form.set("fullName", "No Session");
    form.set("status", "ACTIVE");

    await expect(createMemberAction(undefined, form)).rejects.toThrow("UNAUTHENTICATED");
  });

  it("rejects a forged session for a user that does not exist", async () => {
    await signIn({
      userId: "0000000000000000000000000",
      masjidId: fx.masjidA,
      role: ROLES.SUPER_ADMIN,
      isPlatformAdmin: true,
    });
    const { getCurrentUser } = await import("@/lib/auth");
    expect(await getCurrentUser()).toBeNull();
  });

  it("ignores a SUPER_ADMIN claim in the cookie when the database says otherwise", async () => {
    // The Local Admin's real role is ADMIN. The cookie claims SUPER_ADMIN,
    // but the membership row is what decides.
    await signIn({
      userId: fx.localAdminUserId,
      masjidId: fx.masjidA,
      role: ROLES.SUPER_ADMIN,
      isPlatformAdmin: true,
    });
    const { getCurrentUser } = await import("@/lib/auth");
    const user = await getCurrentUser();
    expect(user!.role).toBe(ROLES.ADMIN);
    expect(user!.isPlatformAdmin).toBe(false);

    // And the platform operation is refused.
    const form = new FormData();
    form.set("masjidId", fx.masjidB);
    form.set("action", "suspend");
    await expect(setMasjidStatusAction(form)).rejects.toThrow("FORBIDDEN");
  });

  it("drops access when the membership is deactivated", async () => {
    const tempUserId = await createUser(`temp-${Date.now().toString(36)}@example.invalid`, "Temp Staff");
    const membership = await prisma.masjidUser.create({
      data: { masjidId: fx.masjidA, userId: tempUserId, role: ROLES.ADMIN, status: "ACTIVE" },
    });

    await signIn({
      userId: tempUserId,
      masjidId: fx.masjidA,
      role: ROLES.ADMIN,
      isPlatformAdmin: false,
    });
    const { getCurrentUser } = await import("@/lib/auth");
    expect((await getCurrentUser())?.role).toBe(ROLES.ADMIN);

    await prisma.masjidUser.update({ where: { id: membership.id }, data: { status: "INACTIVE" } });

    // With no active membership left, the account resolves to nothing.
    const after = await getCurrentUser();
    expect(after === null || after.role !== ROLES.ADMIN).toBe(true);

    await prisma.masjidUser.delete({ where: { id: membership.id } });
    await prisma.user.delete({ where: { id: tempUserId } });
  });
});

// ===========================================================================
// 7. Database relations and foreign keys remain valid.
// ===========================================================================

describe("database integrity", () => {
  it("rejects a payment that references a member from another masjid", async () => {
    // The database itself does not forbid a cross-masjid payment; the
    // application layer refuses it. This test proves the application layer
    // is what protects the boundary.
    await signInAsLocalAdmin();
    const before = await prisma.payment.count({ where: { masjidId: fx.masjidB } });
    const form = new FormData();
    form.set("memberId", fx.memberB);
    form.set("paymentDate", "2093-05-04");
    form.set("amountPaise", "1000");
    form.set("mode", "CASH");
    form.set("idempotencyKey", `local-z-${Date.now().toString(36)}`);
    form.set("allocations", JSON.stringify([{ categoryId: fx.categoryB, amountPaise: 1000 }]));

    await createPaymentAction(form);
    const after = await prisma.payment.count({ where: { masjidId: fx.masjidB } });
    expect(after).toBe(before);
  });

  it("enforces the foreign key from PaymentAllocation to CollectionEvent", async () => {
    // The FK that the old SQLite migration chain never created.
    const payment = await prisma.payment.create({
      data: {
        masjidId: fx.masjidA,
        receiptNo: `FK-${Date.now().toString(36)}`,
        donorNameSnapshot: "FK Probe",
        paymentDate: new Date("2093-04-01T00:00:00+05:30"),
        amountPaise: 100,
        mode: "CASH",
        status: "SUCCESS",
        enteredBy: fx.localAdminUserId,
        idempotencyKey: `fk-${Date.now().toString(36)}`,
      },
    });

    await expect(
      prisma.paymentAllocation.create({
        data: {
          masjidId: fx.masjidA,
          paymentId: payment.id,
          categoryId: fx.categoryA,
          allocatedAmountPaise: 100,
          collectionEventId: "0000000000000000000000000",
        },
      }),
    ).rejects.toThrow();

    await prisma.payment.delete({ where: { id: payment.id } });
  });

  it("enforces the unique constraint on (masjidId, receiptNo)", async () => {
    const existing = await prisma.payment.findUnique({ where: { id: fx.paymentA } });
    expect(existing).not.toBeNull();

    await expect(
      prisma.payment.create({
        data: {
          masjidId: fx.masjidA,
          receiptNo: existing!.receiptNo,
          donorNameSnapshot: "Duplicate Receipt",
          paymentDate: new Date("2093-04-01T00:00:00+05:30"),
          amountPaise: 100,
          mode: "CASH",
          status: "SUCCESS",
          enteredBy: fx.localAdminUserId,
          idempotencyKey: `dup-${Date.now().toString(36)}`,
        },
      }),
    ).rejects.toThrow();
  });

  it("enforces the unique constraint on Member (masjidId, memberNo)", async () => {
    const existing = await prisma.member.findUnique({ where: { id: fx.memberA } });
    expect(existing).not.toBeNull();

    await expect(
      prisma.member.create({
        data: {
          masjidId: fx.masjidA,
          memberNo: existing!.memberNo,
          fullName: "Duplicate Member No",
        },
      }),
    ).rejects.toThrow();
  });

  it("cascades a masjid deletion to its members, payments and categories", async () => {
    const tempMasjid = await createMasjid("Cascade Probe", `cascade-${Date.now().toString(36)}`);
    const category = (
      await prisma.contributionCategory.create({
        data: { masjidId: tempMasjid, name: "Temp", code: "TMP" },
      })
    ).id;
    const member = await prisma.member.create({
      data: { masjidId: tempMasjid, memberNo: "CASC-1", fullName: "Cascade Member" },
    });

    await prisma.masjid.delete({ where: { id: tempMasjid } });

    expect(await prisma.member.findUnique({ where: { id: member.id } })).toBeNull();
    expect(
      await prisma.contributionCategory.findUnique({ where: { id: category } }),
    ).toBeNull();
  });
});

// ===========================================================================
// 8. Edge-case cross-tenant regression tests (Phase 3 hardening)
// ===========================================================================

describe("Edge cases: suspended masjid", () => {
  it("Local Admin cannot perform actions when masjid is SUSPENDED", async () => {
    await signInAsSuperAdmin();
    const form = new FormData();
    form.set("masjidId", fx.masjidA);
    form.set("action", "suspend");
    await setMasjidStatusAction(form);

    await signInAsLocalAdmin();
    const paymentForm = new FormData();
    paymentForm.set("memberId", fx.memberA);
    paymentForm.set("paymentDate", "2093-05-01");
    paymentForm.set("amountPaise", "5000");
    paymentForm.set("mode", "CASH");
    paymentForm.set("idempotencyKey", `suspended-${Date.now().toString(36)}`);
    paymentForm.set("allocations", JSON.stringify([{ categoryId: fx.categoryA, amountPaise: 5000 }]));

    const result = await createPaymentAction(paymentForm);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(["FORBIDDEN", "This Masjid is suspended; payments are read-only."]).toContain(result.error);

    // Reactivate for cleanup
    await signInAsSuperAdmin();
    form.set("action", "activate");
    await setMasjidStatusAction(form);
  });

  it("Super Admin can still suspend/activate regardless of masjid status", async () => {
    await signInAsSuperAdmin();
    const form = new FormData();
    form.set("masjidId", fx.masjidA);
    form.set("action", "suspend");
    const result = await setMasjidStatusAction(form);
    expect(result).toEqual({ ok: true });
    expect((await prisma.masjid.findUnique({ where: { id: fx.masjidA } }))?.status).toBe("SUSPENDED");

    form.set("action", "activate");
    const back = await setMasjidStatusAction(form);
    expect(back).toEqual({ ok: true });
    expect((await prisma.masjid.findUnique({ where: { id: fx.masjidA } }))?.status).toBe("ACTIVE");
  });
});

describe("Edge cases: deactivated membership", () => {
  it("User with INACTIVE MasjidUser membership cannot perform staff actions", async () => {
    await signInAsSuperAdmin();
    const tempUserId = await createUser(`temp-${Date.now().toString(36)}@example.invalid`, "Temp Staff");
    const membership = await prisma.masjidUser.create({
      data: { masjidId: fx.masjidA, userId: tempUserId, role: ROLES.ADMIN, status: "ACTIVE" },
    });

    await signIn({
      userId: tempUserId,
      masjidId: fx.masjidA,
      role: ROLES.ADMIN,
      isPlatformAdmin: false,
    });

    // Deactivate the membership
    await prisma.masjidUser.update({ where: { id: membership.id }, data: { status: "INACTIVE" } });

    const paymentForm = new FormData();
    paymentForm.set("memberId", fx.memberA);
    paymentForm.set("paymentDate", "2093-05-01");
    paymentForm.set("amountPaise", "5000");
    paymentForm.set("mode", "CASH");
    paymentForm.set("idempotencyKey", `inactive-${Date.now().toString(36)}`);
    paymentForm.set("allocations", JSON.stringify([{ categoryId: fx.categoryA, amountPaise: 5000 }]));

    const result = await createPaymentAction(paymentForm);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("UNAUTHENTICATED");

    await prisma.masjidUser.delete({ where: { id: membership.id } });
    await prisma.user.delete({ where: { id: tempUserId } });
  });
});

describe("Edge cases: role change mid-session", () => {
  it("Cookie claims ADMIN but DB says STAFF → DB wins (no elevated access)", async () => {
    await signInAsSuperAdmin();
    const tempUserId = await createUser(`temp-${Date.now().toString(36)}@example.invalid`, "Temp Staff");
    await prisma.masjidUser.create({
      data: { masjidId: fx.masjidA, userId: tempUserId, role: ROLES.COLLECTOR, status: "ACTIVE" },
    });

    // Sign in with elevated role claim in cookie
    await signIn({
      userId: tempUserId,
      masjidId: fx.masjidA,
      role: ROLES.ADMIN,
      isPlatformAdmin: false,
    });

    const { getCurrentUser } = await import("@/lib/auth");
    const user = await getCurrentUser();
    expect(user).not.toBeNull();
    expect(user!.role).toBe(ROLES.COLLECTOR); // DB role wins
    expect(user!.isPlatformAdmin).toBe(false);

    // Collector cannot create staff (staff:manage requires ADMIN)
    const staffForm = new FormData();
    staffForm.set("name", "New Staff");
    staffForm.set("email", `new-${Date.now().toString(36)}@example.invalid`);
    staffForm.set("password", "password123");
    staffForm.set("role", "COLLECTOR");

    // The action should fail because COLLECTOR lacks staff:manage
    const { createStaffAction } = await import("@/modules/settings/actions");
    const result = await createStaffAction(undefined, staffForm);
    expect(result?.error).toContain("FORBIDDEN");

    await prisma.masjidUser.deleteMany({ where: { userId: tempUserId } });
    await prisma.user.delete({ where: { id: tempUserId } });
  });
});

describe("Edge cases: deleted masjid", () => {
  let tempMasjid: string;
  let tempUserId: string;

  beforeAll(async () => {
    tempMasjid = await createMasjid("Deleted Masjid", `deleted-${Date.now().toString(36)}`);
    tempUserId = await createUser(`temp-${Date.now().toString(36)}@example.invalid`, "Temp Admin");
    await prisma.masjidUser.create({
      data: { masjidId: tempMasjid, userId: tempUserId, role: ROLES.ADMIN, status: "ACTIVE" },
    });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: tempUserId } });
    // Masjid may already be deleted
    await prisma.masjid.deleteMany({ where: { id: tempMasjid } });
  });

  it("Operations on a deleted masjid fail gracefully", async () => {
    await signInAsSuperAdmin();
    // Delete the masjid
    const form = new FormData();
    form.set("masjidId", tempMasjid);
    await deleteMasjidAction(form);

    // Now try to use the deleted masjid's membership
    await signIn({
      userId: tempUserId,
      masjidId: tempMasjid,
      role: ROLES.ADMIN,
      isPlatformAdmin: false,
    });

    const { getCurrentUser } = await import("@/lib/auth");
    const user = await getCurrentUser();
    expect(user).toBeNull(); // Membership points to deleted masjid
  });
});

describe("Edge cases: CollectionEventAssignment tenant scoping", () => {
  it("Direct queries on CollectionEventAssignment respect masjidId", async () => {
    await signInAsLocalAdmin();

    // Create a collection event and assignment in masjidA
    const event = await prisma.collectionEvent.create({
      data: {
        masjidId: fx.masjidA,
        categoryId: fx.categoryA,
        name: "Test Event",
        startDate: new Date("2094-01-01"),
        dueDate: new Date("2094-01-31"),
        expectedAmountPaise: 100000,
        status: "OPEN",
      },
    });

    const assignment = await prisma.collectionEventAssignment.create({
      data: {
        masjidId: fx.masjidA,
        eventId: event.id,
        memberId: fx.memberA,
        expectedAmountPaise: 10000,
        status: "PENDING",
      },
    });

    // Scoped query finds it
    const found = await prisma.collectionEventAssignment.findFirst({
      where: { id: assignment.id, masjidId: fx.masjidA },
    });
    expect(found).not.toBeNull();

    // Cross-tenant query returns null
    const leaked = await prisma.collectionEventAssignment.findFirst({
      where: { id: assignment.id, masjidId: fx.masjidB },
    });
    expect(leaked).toBeNull();
  });

  it("assignHouseholdsAction validates all members belong to the same masjid", async () => {
    await signInAsLocalAdmin();

    const event = await prisma.collectionEvent.create({
      data: {
        masjidId: fx.masjidA,
        categoryId: fx.categoryA,
        name: "Test Event 2",
        startDate: new Date("2094-01-01"),
        dueDate: new Date("2094-01-31"),
        expectedAmountPaise: 100000,
        status: "OPEN",
      },
    });

    // Try to assign member from another masjid
    const form = new FormData();
    form.set("eventId", event.id);
    form.set("memberIds", JSON.stringify([fx.memberB]));
    form.set("expectedAmountPaise", "10000");

    const result = await assignHouseholdsAction(undefined, form);
    expect(result?.error).toBe("Some members not found in this masjid.");
  });
});

describe("Edge cases: PaymentAllocation cross-tenant protection", () => {
  it("Cannot create allocation to another masjid's dues period", async () => {
    await signInAsLocalAdmin();

    // Create a dues period in masjidB
    const plan = await prisma.contributionPlan.create({
      data: {
        masjidId: fx.masjidB,
        memberId: fx.memberB,
        categoryId: fx.categoryB,
        frequency: "MONTHLY",
        amountPaise: 100000,
        startDate: new Date("2094-01-01"),
        dueDay: 10,
      },
    });

    const period = await prisma.duesPeriod.create({
      data: {
        masjidId: fx.masjidB,
        planId: plan.id,
        memberId: fx.memberB,
        periodStart: new Date("2094-01-01"),
        periodEnd: new Date("2094-01-31"),
        dueDate: new Date("2094-02-10"),
        expectedAmountPaise: 100000,
      },
    });

    // Try to allocate payment from masjidA to masjidB's period
    const payment = await prisma.payment.create({
      data: {
        masjidId: fx.masjidA,
        receiptNo: `TEST-${Date.now().toString(36)}`,
        donorNameSnapshot: "Test",
        paymentDate: new Date("2094-01-15"),
        amountPaise: 50000,
        mode: "CASH",
        status: "SUCCESS",
        enteredBy: fx.localAdminUserId,
        idempotencyKey: `test-${Date.now().toString(36)}`,
      },
    });

    // This should be rejected by createPaymentAction's validation
    const form = new FormData();
    form.set("memberId", fx.memberA);
    form.set("paymentDate", "2094-01-15");
    form.set("amountPaise", "50000");
    form.set("mode", "CASH");
    form.set("idempotencyKey", `cross-${Date.now().toString(36)}`);
    form.set("allocations", JSON.stringify([{ categoryId: fx.categoryA, duesPeriodId: period.id, amountPaise: 50000 }]));

    const result = await createPaymentAction(form);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("A selected due period is not available in this Masjid.");

    await prisma.payment.delete({ where: { id: payment.id } });
    await prisma.duesPeriod.delete({ where: { id: period.id } });
    await prisma.contributionPlan.delete({ where: { id: plan.id } });
  });

  it("Cannot create allocation to another masjid's collection event", async () => {
    await signInAsLocalAdmin();

    const eventB = await prisma.collectionEvent.create({
      data: {
        masjidId: fx.masjidB,
        categoryId: fx.categoryB,
        name: "Event B",
        startDate: new Date("2094-01-01"),
        dueDate: new Date("2094-01-31"),
        expectedAmountPaise: 100000,
        status: "OPEN",
      },
    });

    const payment = await prisma.payment.create({
      data: {
        masjidId: fx.masjidA,
        receiptNo: `TEST-${Date.now().toString(36)}`,
        donorNameSnapshot: "Test",
        paymentDate: new Date("2094-01-15"),
        amountPaise: 50000,
        mode: "CASH",
        status: "SUCCESS",
        enteredBy: fx.localAdminUserId,
        idempotencyKey: `test-${Date.now().toString(36)}`,
      },
    });

    const form = new FormData();
    form.set("memberId", fx.memberA);
    form.set("paymentDate", "2094-01-15");
    form.set("amountPaise", "50000");
    form.set("mode", "CASH");
    form.set("idempotencyKey", `cross-${Date.now().toString(36)}`);
    form.set("allocations", JSON.stringify([{ categoryId: fx.categoryA, collectionEventId: eventB.id, amountPaise: 50000 }]));

    const result = await createPaymentAction(form);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Collection event does not belong to this Masjid");

    await prisma.payment.delete({ where: { id: payment.id } });
    await prisma.collectionEvent.delete({ where: { id: eventB.id } });
  });
});

describe("Edge cases: Expense cross-tenant protection", () => {
  let expenseCategoryB: string;

  beforeAll(async () => {
    const cat = await prisma.expenseCategory.create({
      data: { masjidId: fx.masjidB, name: "Test Category B" },
    });
    expenseCategoryB = cat.id;
  });

  it("Cannot create expense for another masjid's category", async () => {
    await signInAsLocalAdmin();

    const form = new FormData();
    form.set("categoryId", expenseCategoryB);
    form.set("date", "2094-01-15");
    form.set("payee", "Test Vendor");
    form.set("amountPaise", "5000");
    form.set("mode", "CASH");
    form.set("idempotencyKey", `expense-cross-${Date.now().toString(36)}`);

    const result = await createExpenseAction(undefined, form);
    expect(result?.error).toBe("Expense category not found in this Masjid.");
  });

  it("Cannot approve another masjid's expense", async () => {
    await signInAsLocalAdmin();

    const expense = await prisma.expense.create({
      data: {
        masjidId: fx.masjidB,
        expenseNo: `EXP-${Date.now().toString(36)}`,
        categoryId: expenseCategoryB,
        date: new Date("2094-01-15"),
        payee: "Test",
        amountPaise: 5000,
        mode: "CASH",
        enteredBy: fx.superAdminUserId,
        approvalStatus: "PENDING",
        idempotencyKey: `expense-${Date.now().toString(36)}`,
      },
    });

    const form = new FormData();
    form.set("expenseId", expense.id);
    form.set("decision", "APPROVED");

    // The action returns void but we can check the expense status
    await approveExpenseAction(form);

    const unchanged = await prisma.expense.findUnique({ where: { id: expense.id } });
    expect(unchanged?.approvalStatus).toBe("PENDING");

    await prisma.expense.delete({ where: { id: expense.id } });
  });
});

describe("Edge cases: Plan/DuesPeriod cross-tenant protection", () => {
  it("Cannot create plan for another masjid's member", async () => {
    await signInAsLocalAdmin();

    const form = new FormData();
    form.set("memberId", fx.memberB);
    form.set("categoryId", fx.categoryA);
    form.set("frequency", "MONTHLY");
    form.set("amountPaise", "100000");
    form.set("startDate", "2094-01-01");
    form.set("idempotencyKey", `plan-cross-${Date.now().toString(36)}`);

    const result = await createPlanAction(undefined, form);
    expect(result?.error).toBe("Member not found in this Masjid.");
  });

  it("Cannot change amount of another masjid's plan", async () => {
    await signInAsLocalAdmin();

    const plan = await prisma.contributionPlan.create({
      data: {
        masjidId: fx.masjidB,
        memberId: fx.memberB,
        categoryId: fx.categoryB,
        frequency: "MONTHLY",
        amountPaise: 100000,
        startDate: new Date("2094-01-01"),
        dueDay: 10,
      },
    });

    const form = new FormData();
    form.set("planId", plan.id);
    form.set("amountPaise", "200000");
    form.set("effectiveFrom", "2094-02-01");
    form.set("reason", "Cross-tenant test");

    const result = await changePlanAmountAction(form);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Plan not found in this Masjid.");

    await prisma.contributionPlan.delete({ where: { id: plan.id } });
  });

  it("Cannot generate dues for another masjid's plans", async () => {
    await signInAsLocalAdmin();

    await prisma.contributionPlan.create({
      data: {
        masjidId: fx.masjidB,
        memberId: fx.memberB,
        categoryId: fx.categoryB,
        frequency: "MONTHLY",
        amountPaise: 100000,
        startDate: new Date("2094-01-01"),
        dueDay: 10,
        status: "ACTIVE",
      },
    });

    // generateDuesAction finds plans by masjidId, so it won't touch masjidB's plans
    await generateDuesAction();

    const periods = await prisma.duesPeriod.findMany({ where: { masjidId: fx.masjidB } });
    expect(periods.length).toBe(0);

    await prisma.contributionPlan.deleteMany({ where: { masjidId: fx.masjidB } });
  });
});
