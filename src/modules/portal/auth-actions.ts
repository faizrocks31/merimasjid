"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession, destroySession, verifyPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { ROLES } from "@/lib/constants";

export type PortalLoginState = { error?: string; redirect?: string } | undefined;

// Simple in-memory brute-force throttle for portal login
const portalAttempts = new Map<string, { count: number; resetAt: number }>();
const PORTAL_MAX_ATTEMPTS = 8;
const PORTAL_WINDOW_MS = 10 * 60 * 1000;

function portalThrottled(key: string): boolean {
  const entry = portalAttempts.get(key);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    portalAttempts.delete(key);
    return false;
  }
  return entry.count >= PORTAL_MAX_ATTEMPTS;
}

function recordPortalFailure(key: string) {
  const entry = portalAttempts.get(key);
  if (!entry || Date.now() > entry.resetAt) {
    portalAttempts.set(key, { count: 1, resetAt: Date.now() + PORTAL_WINDOW_MS });
  } else {
    entry.count++;
  }
}

/**
 * Member portal login action.
 * Authenticates a member via their linked User account (email/password).
 * Only works for users who have a Member profile linked (memberProfiles.length > 0).
 */
export async function portalLoginAction(_prev: PortalLoginState, formData: FormData): Promise<PortalLoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid credentials" };
  }

  const { email, password } = parsed.data;
  if (portalThrottled(email)) {
    return { error: "Too many attempts. Please wait a few minutes and try again." };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: { include: { masjid: true } },
      memberProfiles: { include: { masjid: true } },
    },
  });

  // Constant-ish response: always run a comparison so a missing user and a
  // wrong password are not trivially distinguishable by timing.
  const hash = user?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv";
  const ok = await verifyPassword(password, hash);

  if (!user || !ok || user.status !== "ACTIVE") {
    recordPortalFailure(email);
    return { error: "Invalid email or password." };
  }

  // Must have a member profile to access the portal
  if (user.memberProfiles.length === 0) {
    recordPortalFailure(email);
    return { error: "This account does not have member portal access. Please contact your masjid admin." };
  }

  // Successful login – clear any throttling state
  portalAttempts.delete(email);

  // Only ACTIVE memberships are eligible
  const activeMemberships = user.memberships.filter((m) => m.status === "ACTIVE");
  const membership =
    activeMemberships.find((m) => m.masjid.status === "ACTIVE") ?? activeMemberships[0] ?? null;

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const isPlatformAdmin = activeMemberships.some((m) => m.role === ROLES.SUPER_ADMIN);

  // Use the first member profile's masjid for the session
  const primaryMember = user.memberProfiles[0];

  await createSession({
    userId: user.id,
    masjidId: primaryMember.masjidId,
    role: ROLES.MEMBER,
    isPlatformAdmin,
  });

  // Redirect to member portal home
  return { redirect: "/portal" };
}

/**
 * Member portal logout action.
 */
export async function portalLogoutAction(): Promise<void> {
  await destroySession();
  redirect("/portal/login");
}