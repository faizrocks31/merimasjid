import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { ROLES, type Role } from "@/lib/constants";
import { getEffectiveSubscription, type EffectiveSubscription, canPerformFinancialWrites } from "@/lib/subscription";

const COOKIE_NAME = "masjid_session";
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET is missing or too short. Set a random 32+ character value in .env",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export type SessionPayload = {
  userId: string;
  masjidId: string | null;
  role: Role;
  isPlatformAdmin: boolean;
};

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.userId !== "string") return null;
    return {
      userId: payload.userId,
      masjidId: typeof payload.masjidId === "string" ? payload.masjidId : null,
      role: (payload.role as Role) ?? ROLES.MEMBER,
      isPlatformAdmin: payload.isPlatformAdmin === true,
    };
  } catch {
    return null;
  }
}

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  masjidId: string | null;
  isPlatformAdmin: boolean;
  masjid: {
    id: string;
    name: string;
    slug: string;
    receiptPrefix: string;
    financialYearStartMonth: number;
    status: string;
    subscriptionStatus: string | null;
    subscriptionEndsAt: Date | null;
    maxMembers: number | null;
    maxStaff: number | null;
    maxCategories: number | null;
  } | null;
  memberId: string | null;
  subscription: EffectiveSubscription | null;
};

/**
 * Resolves the signed-in user and re-validates their membership against the
 * database on every call. Never trust the role or masjidId in the cookie alone.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await readSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      memberships: { include: { masjid: true } },
      memberProfiles: true,
    },
  });
  if (!user || user.status !== "ACTIVE") return null;

  // Platform admin is the SUPER_ADMIN membership on the masjid named as the
  // platform tenant; otherwise resolve the first active masjid membership.
  // Only ACTIVE memberships are eligible — deactivated memberships are never
  // used for role/masjid resolution, so removing staff access takes effect on
  // the very next request.
  const activeMemberships = user.memberships.filter((m) => m.status === "ACTIVE");
  const membership =
    activeMemberships.find((m) => m.masjidId === session.masjidId) ??
    activeMemberships.find((m) => m.masjid.status === "ACTIVE") ??
    activeMemberships[0] ??
    null;

  const isPlatformAdmin = activeMemberships.some((m) => m.role === ROLES.SUPER_ADMIN);

  if (!membership) {
    // A member-portal-only account.
    if (user.memberProfiles.length > 0) {
      const profile = user.memberProfiles[0];
      const masjid = await prisma.masjid.findUnique({ where: { id: profile.masjidId } });
      const subscription = masjid ? await getEffectiveSubscription(masjid.id) : null;
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: ROLES.MEMBER,
        masjidId: profile.masjidId,
        isPlatformAdmin: false,
        masjid: masjid
          ? {
              id: masjid.id,
              name: masjid.name,
              slug: masjid.slug,
              receiptPrefix: masjid.receiptPrefix,
              financialYearStartMonth: masjid.financialYearStartMonth,
              status: masjid.status,
              subscriptionStatus: masjid.subscriptionStatus,
              subscriptionEndsAt: masjid.subscriptionEndsAt,
              maxMembers: masjid.maxMembers,
              maxStaff: masjid.maxStaff,
              maxCategories: masjid.maxCategories,
            }
          : null,
        memberId: profile.id,
        subscription,
      };
    }
    return null;
  }

  const m = membership.masjid;

  // Fetch subscription info for this masjid
  const subscription = await getEffectiveSubscription(m.id);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: membership.role as Role,
    masjidId: m.id,
    isPlatformAdmin,
    masjid: {
      id: m.id,
      name: m.name,
      slug: m.slug,
      receiptPrefix: m.receiptPrefix,
      financialYearStartMonth: m.financialYearStartMonth,
      status: m.status,
      subscriptionStatus: m.subscriptionStatus,
      subscriptionEndsAt: m.subscriptionEndsAt,
      maxMembers: m.maxMembers,
      maxStaff: m.maxStaff,
      maxCategories: m.maxCategories,
    },
    memberId: user.memberProfiles.find((p) => p.masjidId === m.id)?.id ?? null,
    subscription,
  };
}

/** Throws for unauthenticated access. Use inside server actions and pages. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

/** Requires a staff role (not a member-portal account). */
export async function requireStaff(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role === ROLES.MEMBER || !user.masjidId) throw new Error("FORBIDDEN");
  if (user.masjid?.status === "SUSPENDED" && user.role !== ROLES.SUPER_ADMIN) {
    // Treat suspended masjid as a forbidden error for all non‑super‑admin staff
    throw new Error("FORBIDDEN");
  }
  // Check subscription status - block writes for SUSPENDED/CANCELLED subscriptions
  if (user.subscription && !canPerformFinancialWrites(user.subscription.status) && user.role !== ROLES.SUPER_ADMIN) {
    throw new Error("SUBSCRIPTION_SUSPENDED");
  }
  return user;
}

export async function requireRole(allowed: Role[]): Promise<CurrentUser> {
  const user = await requireStaff();
  if (!allowed.includes(user.role)) throw new Error("FORBIDDEN");
  return user;
}
