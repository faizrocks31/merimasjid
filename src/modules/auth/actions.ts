"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession, destroySession, verifyPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { ROLES } from "@/lib/constants";

export type LoginState = { error?: string; redirect?: string } | undefined;

/** Simple in-memory brute-force throttle, adequate for a single local server. */
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;

function throttled(key: string): boolean {
  const entry = attempts.get(key);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    attempts.delete(key);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function recordFailure(key: string) {
  const entry = attempts.get(key);
  if (!entry || Date.now() > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: Date.now() + WINDOW_MS });
  } else {
    entry.count++;
  }
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid credentials" };
  }

  const { email, password } = parsed.data;
  if (throttled(email)) {
    return { error: "Too many attempts. Please wait a few minutes and try again." };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: { include: { masjid: true } },
      memberProfiles: true,
    },
  });

  // Constant-ish response: always run a comparison so a missing user and a
  // wrong password are not trivially distinguishable by timing.
  const hash = user?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv";
  const ok = await verifyPassword(password, hash);

  if (!user || !ok || user.status !== "ACTIVE") {
    recordFailure(email);
    return { error: "Invalid email or password." };
  }

  // Successful login – clear any throttling state
  attempts.delete(email);

  // Only ACTIVE memberships are eligible — deactivated memberships are never
  // used for role/masjid resolution, so removing staff access takes effect on
  // the very next request.
  const activeMemberships = user.memberships.filter((m) => m.status === "ACTIVE");
  const membership =
    activeMemberships.find((m) => m.masjid.status === "ACTIVE") ?? activeMemberships[0] ?? null;

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const isPlatformAdmin = activeMemberships.some((m) => m.role === ROLES.SUPER_ADMIN);
  const isMemberOnly = !membership && user.memberProfiles.length > 0;

  await createSession({
    userId: user.id,
    masjidId: membership?.masjidId ?? user.memberProfiles[0]?.masjidId ?? null,
    role: (membership?.role as typeof ROLES.ADMIN) ?? ROLES.MEMBER,
    isPlatformAdmin,
  });

  // A platform super admin has no masjid-scoped work; send them to the tenant
  // management screen instead of an operational dashboard.
  const redirectTo = isPlatformAdmin ? "/platform" : isMemberOnly ? "/portal" : "/dashboard";

  return { redirect: redirectTo };
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
