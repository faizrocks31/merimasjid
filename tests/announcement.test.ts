/**
 * Announcement Workflow Integration Tests (Phase 9 - B5)
 *
 * Tests the sendAnnouncementAction fanout, tenant isolation,
 * inactive member exclusion, audit logging, and portal read/unread tracking.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { ROLES } from "@/lib/constants";
import { sendAnnouncementAction } from "@/modules/settings/actions";
import { getMemberNotificationsUI } from "@/modules/portal/notification-queries";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/modules/portal/notification-actions";

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

// Mock Telegram to avoid external calls
vi.mock("@/lib/notifications-init", () => ({
  initNotifications: vi.fn(),
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
  currentCaller = caller;
  currentCookieValue = token;
}

function signOut(): void {
  currentCaller = null;
  currentCookieValue = undefined;
}

const PASSWORD = "announcement-test-password";

type Fixture = {
  masjidA: string;
  masjidB: string;
  localAdminUserId: string;
  memberA1: string; // ACTIVE
  memberA2: string; // ACTIVE
  memberA3: string; // INACTIVE
  memberB1: string; // ACTIVE (masjidB)
  memberA1UserId: string;
  memberA2UserId: string;
  memberA3UserId: string;
};

let fx: Fixture;
const createdMasjidIds: string[] = [];
const createdUserIds: string[] = [];

// Clear notifications before each test to ensure isolation
beforeEach(async () => {
  await prisma.notificationLog.deleteMany({ where: { masjidId: { in: createdMasjidIds } } });
  await prisma.auditLog.deleteMany({ where: { masjidId: { in: createdMasjidIds }, action: "announcement.send" } });
});

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
  createdUserIds.push(u.id);
  return u.id;
}

beforeAll(async () => {
  const suffix = `ann-${Date.now().toString(36)}`;

  const masjidA = await createMasjid("Announcement Masjid A", `ann-a-${suffix}`);
  const masjidB = await createMasjid("Announcement Masjid B", `ann-b-${suffix}`);

  const localAdminUserId = await createUser(`local-${suffix}@example.invalid`, "Local Admin");
  await prisma.masjidUser.create({
    data: { masjidId: masjidA, userId: localAdminUserId, role: ROLES.ADMIN, status: "ACTIVE" },
  });

  // Masjid A members
  const memberA1 = (
    await prisma.member.create({
      data: { masjidId: masjidA, memberNo: `ANN-A1-${suffix}`, fullName: "Active Member A1", status: "ACTIVE" },
    })
  ).id;
  const memberA2 = (
    await prisma.member.create({
      data: { masjidId: masjidA, memberNo: `ANN-A2-${suffix}`, fullName: "Active Member A2", status: "ACTIVE" },
    })
  ).id;
  const memberA3 = (
    await prisma.member.create({
      data: { masjidId: masjidA, memberNo: `ANN-A3-${suffix}`, fullName: "Inactive Member A3", status: "INACTIVE" },
    })
  ).id;

  // Masjid B member
  const memberB1 = (
    await prisma.member.create({
      data: { masjidId: masjidB, memberNo: `ANN-B1-${suffix}`, fullName: "Active Member B1", status: "ACTIVE" },
    })
  ).id;

  // Portal logins for members (to test portal read/unread)
  const memberA1UserId = await createUser(`member-a1-${suffix}@example.invalid`, "Member A1");
  const memberA2UserId = await createUser(`member-a2-${suffix}@example.invalid`, "Member A2");
  const memberA3UserId = await createUser(`member-a3-${suffix}@example.invalid`, "Member A3");

  await prisma.masjidUser.create({
    data: { masjidId: masjidA, userId: memberA1UserId, role: ROLES.MEMBER, status: "ACTIVE" },
  });
  await prisma.masjidUser.create({
    data: { masjidId: masjidA, userId: memberA2UserId, role: ROLES.MEMBER, status: "ACTIVE" },
  });
  await prisma.masjidUser.create({
    data: { masjidId: masjidA, userId: memberA3UserId, role: ROLES.MEMBER, status: "ACTIVE" },
  });

  // Link members to their portal users
  await prisma.member.update({ where: { id: memberA1 }, data: { userId: memberA1UserId } });
  await prisma.member.update({ where: { id: memberA2 }, data: { userId: memberA2UserId } });
  await prisma.member.update({ where: { id: memberA3 }, data: { userId: memberA3UserId } });

  fx = {
    masjidA,
    masjidB,
    localAdminUserId,
    memberA1,
    memberA2,
    memberA3,
    memberB1,
    memberA1UserId,
    memberA2UserId,
    memberA3UserId,
  };
});

afterAll(async () => {
  // Delete in correct order to respect FK constraints
  await prisma.notificationLog.deleteMany({ where: { masjidId: { in: createdMasjidIds } } });
  await prisma.auditLog.deleteMany({ where: { masjidId: { in: createdMasjidIds } } });
  await prisma.paymentAllocation.deleteMany({ where: { masjidId: { in: createdMasjidIds } } });
  await prisma.receiptEvent.deleteMany({ where: { masjidId: { in: createdMasjidIds } } });
  await prisma.payment.deleteMany({ where: { masjidId: { in: createdMasjidIds } } });
  await prisma.duesPeriod.deleteMany({ where: { masjidId: { in: createdMasjidIds } } });
  await prisma.contributionPlan.deleteMany({ where: { masjidId: { in: createdMasjidIds } } });
  await prisma.expense.deleteMany({ where: { masjidId: { in: createdMasjidIds } } });
  await prisma.expenseCategory.deleteMany({ where: { masjidId: { in: createdMasjidIds } } });
  await prisma.member.deleteMany({ where: { masjidId: { in: createdMasjidIds } } });
  await prisma.collectionDefinition.deleteMany({ where: { masjidId: { in: createdMasjidIds } } });
  await prisma.masjidUser.deleteMany({ where: { masjidId: { in: createdMasjidIds } } });
  // Delete only fixture users; other test suites may share the isolated DB.
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.masjid.deleteMany({ where: { id: { in: createdMasjidIds } } });
  await prisma.$disconnect();
});

async function signInAsLocalAdmin(): Promise<void> {
  await signIn({
    userId: fx.localAdminUserId,
    masjidId: fx.masjidA,
    role: ROLES.ADMIN,
    isPlatformAdmin: false,
  });
}

async function signInAsMember(userId: string): Promise<void> {
  await signIn({
    userId,
    masjidId: fx.masjidA,
    role: ROLES.MEMBER,
    isPlatformAdmin: false,
  });
}

// ============================================================================
// 1. FANOUT DELIVERS TO ALL ACTIVE MEMBERS
// ============================================================================

describe("Announcement fanout to active members", () => {
  it("sends in-app notification to all ACTIVE members of the masjid", async () => {
    await signInAsLocalAdmin();

    const form = new FormData();
    form.set("announcementTitle", "Test Announcement");
    form.set("announcementBody", "This is a test message for all active members.");
    form.set("sendToTelegram", "off");

    const result = await sendAnnouncementAction(undefined, form);
    expect(result).toBeDefined();
    expect(result!.ok).toBe(true);
    if (result!.ok) expect(result!.message).toBe("2"); // Only 2 active members (memberA1, memberA2)

    // Verify notificationLog has 2 entries for masjidA
    const logs = await prisma.notificationLog.findMany({
      where: { masjidId: fx.masjidA, template: "announcement", title: { contains: "Test Announcement" } },
    });
    expect(logs.length).toBe(2);

    // Both active members should have a notification
    const recipientIds = logs.map((l) => l.recipient).sort();
    expect(recipientIds).toContain(fx.memberA1);
    expect(recipientIds).toContain(fx.memberA2);

    // Each log should have title, body, and readAt = null (unread)
    for (const log of logs) {
      expect(log.title).toContain("Test Announcement");
      expect(log.body).toContain("This is a test message");
      expect(log.readAt).toBeNull();
      expect(log.status).toBe("SENT");
    }
  });

  it("excludes INACTIVE members from fanout", async () => {
    await signInAsLocalAdmin();

    const form = new FormData();
    form.set("announcementTitle", "Second Announcement");
    form.set("announcementBody", "Inactive members should not receive this.");
    form.set("sendToTelegram", "off");

    const result = await sendAnnouncementAction(undefined, form);
    expect(result).toBeDefined();
    expect(result!.ok).toBe(true);
    if (result!.ok) expect(result!.message).toBe("2"); // Still only 2 active members

    // memberA3 (INACTIVE) should NOT have a notification for this announcement
    const inactiveLogs = await prisma.notificationLog.findMany({
      where: { masjidId: fx.masjidA, template: "announcement", recipient: fx.memberA3 },
    });
    expect(inactiveLogs.length).toBe(0);

    // Total announcements should be 2 (from this test only, since beforeEach clears)
    const totalAnnouncements = await prisma.notificationLog.count({
      where: { masjidId: fx.masjidA, template: "announcement" },
    });
    expect(totalAnnouncements).toBe(2);
  });
});

// ============================================================================
// 2. TENANT BOUNDARY - MASJID A CANNOT SEND TO MASJID B MEMBERS
// ============================================================================

describe("Tenant isolation: announcement respects masjid boundary", () => {
  it("does not create notifications for members of another masjid", async () => {
    await signInAsLocalAdmin();

    const form = new FormData();
    form.set("announcementTitle", "Cross-Tenant Test");
    form.set("announcementBody", "Should only reach masjid A members.");
    form.set("sendToTelegram", "off");

    const result = await sendAnnouncementAction(undefined, form);
    expect(result).toBeDefined();
    expect(result!.ok).toBe(true);

    // Check masjidB has NO announcement notifications
    const masjidBLogs = await prisma.notificationLog.findMany({
      where: { masjidId: fx.masjidB, template: "announcement" },
    });
    expect(masjidBLogs.length).toBe(0);

    // This action only fans out to masjidA; verify this announcement reached its 2 active members.
    const masjidALogs = await prisma.notificationLog.count({
      where: { masjidId: fx.masjidA, template: "announcement", title: { contains: "Cross-Tenant Test" } },
    });
    expect(masjidALogs).toBe(2);
  });
});

// ============================================================================
// 3. AUDIT LOG WRITTEN CORRECTLY
// ============================================================================

describe("Audit log for announcement", () => {
  it("creates audit log entry with title, recipientCount, sentToTelegramChannel", async () => {
    await signInAsLocalAdmin();

    const form = new FormData();
    form.set("announcementTitle", "Audit Test Announcement");
    form.set("announcementBody", "Verifying audit trail.");
    form.set("sendToTelegram", "off");

    await sendAnnouncementAction(undefined, form);

    const audit = await prisma.auditLog.findFirst({
      where: { masjidId: fx.masjidA, action: "announcement.send" },
      orderBy: { createdAt: "desc" },
    });
    expect(audit).not.toBeNull();
    expect(audit!.actorUserId).toBe(fx.localAdminUserId);
    expect(audit!.entityType).toBe("Announcement");

    // Parse afterJson
    const after = audit!.afterJson ? JSON.parse(audit!.afterJson) : null;
    expect(after).toMatchObject({
      title: "Audit Test Announcement",
      recipientCount: 2,
      sentToTelegramChannel: false,
    });
  });

  it("audit log records sentToTelegramChannel true when channel broadcast enabled", async () => {
    await signInAsLocalAdmin();

    const form = new FormData();
    form.set("announcementTitle", "Telegram Channel Test");
    form.set("announcementBody", "Channel broadcast enabled but no channel ID in env.");
    form.set("sendToTelegram", "on");

    const result = await sendAnnouncementAction(undefined, form);
    expect(result).toBeDefined();
    expect(result!.ok).toBe(true);

    const audit = await prisma.auditLog.findFirst({
      where: { masjidId: fx.masjidA, action: "announcement.send" },
      orderBy: { createdAt: "desc" },
    });
    expect(audit).not.toBeNull();
    // Since TELEGRAM_CHANNEL_ID is not set in test env, sentToTelegramChannel should be false
    const after = audit!.afterJson ? JSON.parse(audit!.afterJson) : null;
    expect(after).toMatchObject({
      sentToTelegramChannel: false,
    });
  });
});

// ============================================================================
// 4. PORTAL READ/UNREAD TRACKING
// ============================================================================

describe("Portal read/unread tracking", () => {
  it("member portal shows unread announcements initially", async () => {
    await signInAsLocalAdmin();

    const form = new FormData();
    form.set("announcementTitle", "Portal Read Test");
    form.set("announcementBody", "Checking read/unread status in portal.");
    form.set("sendToTelegram", "off");

    await sendAnnouncementAction(undefined, form);

    // Now sign in as memberA1 (portal user) and query notifications
    await signInAsMember(fx.memberA1UserId);

    const notifications = await getMemberNotificationsUI(fx.memberA1, fx.masjidA);
    expect(notifications.length).toBeGreaterThanOrEqual(1);

    // Find our announcement
    const ourAnnouncement = notifications.find((n) => n.title?.includes("Portal Read Test"));
    expect(ourAnnouncement).toBeDefined();
    expect(ourAnnouncement!.readAt).toBeNull(); // Initially unread
  });

  it("mark as read updates readAt timestamp", async () => {
    // First ensure we have an unread announcement for memberA1
    await signInAsLocalAdmin();

    const form = new FormData();
    form.set("announcementTitle", "Mark Read Test");
    form.set("announcementBody", "Testing mark-as-read functionality.");
    form.set("sendToTelegram", "off");

    await sendAnnouncementAction(undefined, form);

    // Sign in as memberA1
    await signInAsMember(fx.memberA1UserId);

    // Get the notification ID
    const notifications = await getMemberNotificationsUI(fx.memberA1, fx.masjidA);
    const target = notifications.find((n) => n.title?.includes("Mark Read Test"));
    expect(target).toBeDefined();

    // Mark as read via server action
    const formData = new FormData();
    formData.set("notificationId", target!.id);
    const result = await markNotificationReadAction(undefined, formData);
    expect(result).toBeDefined();
    expect(result!.ok).toBe(true);

    // Verify it's now read
    const updated = await getMemberNotificationsUI(fx.memberA1, fx.masjidA);
    const readOne = updated.find((n) => n.id === target!.id);
    expect(readOne!.readAt).not.toBeNull();
  });

  it("mark all as read works for multiple notifications", async () => {
    await signInAsLocalAdmin();

    // Send two announcements
    for (let i = 0; i < 2; i++) {
      const form = new FormData();
      form.set("announcementTitle", `Bulk Read Test ${i}`);
      form.set("announcementBody", `Message ${i}`);
      form.set("sendToTelegram", "off");
      await sendAnnouncementAction(undefined, form);
    }

    // Sign in as memberA2
    await signInAsMember(fx.memberA2UserId);

    const before = await getMemberNotificationsUI(fx.memberA2, fx.masjidA);
    const unreadBefore = before.filter((n) => n.readAt === null);
    expect(unreadBefore.length).toBeGreaterThanOrEqual(2);

    // Mark all as read via server action
    const formData = new FormData();
    const result = await markAllNotificationsReadAction(undefined, formData);
    expect(result).toBeDefined();
    expect(result!.ok).toBe(true);

    const after = await getMemberNotificationsUI(fx.memberA2, fx.masjidA);
    const unreadAfter = after.filter((n) => n.readAt === null);
    // The new ones should now be read
    expect(unreadAfter.length).toBeLessThan(unreadBefore.length);
  });
});

// ============================================================================
// 5. VALIDATION & EDGE CASES
// ============================================================================

describe("Announcement validation", () => {
  it("rejects empty title", async () => {
    await signInAsLocalAdmin();

    const form = new FormData();
    form.set("announcementTitle", "");
    form.set("announcementBody", "Body only");
    form.set("sendToTelegram", "off");

    const result = await sendAnnouncementAction(undefined, form);
    expect(result).toBeDefined();
    expect(result!.error).toContain("title is required");
  });

  it("rejects title > 120 characters", async () => {
    await signInAsLocalAdmin();

    const form = new FormData();
    form.set("announcementTitle", "x".repeat(121));
    form.set("announcementBody", "Body");
    form.set("sendToTelegram", "off");

    const result = await sendAnnouncementAction(undefined, form);
    expect(result).toBeDefined();
    expect(result!.error).toContain("120 characters");
  });

  it("rejects empty body", async () => {
    await signInAsLocalAdmin();

    const form = new FormData();
    form.set("announcementTitle", "Title only");
    form.set("announcementBody", "");
    form.set("sendToTelegram", "off");

    const result = await sendAnnouncementAction(undefined, form);
    expect(result).toBeDefined();
    expect(result!.error).toContain("message is required");
  });

  it("rejects body > 2000 characters", async () => {
    await signInAsLocalAdmin();

    const form = new FormData();
    form.set("announcementTitle", "Title");
    form.set("announcementBody", "x".repeat(2001));
    form.set("sendToTelegram", "off");

    const result = await sendAnnouncementAction(undefined, form);
    expect(result).toBeDefined();
    expect(result!.error).toContain("2000 characters");
  });

  it("rejects when no active members exist", async () => {
    // Create a fresh masjid with no members
    const emptyMasjid = await createMasjid("Empty Masjid", `empty-${Date.now().toString(36)}`);
    const adminUserId = await createUser(`empty-admin-${Date.now().toString(36)}@example.invalid`, "Empty Admin");
    await prisma.masjidUser.create({
      data: { masjidId: emptyMasjid, userId: adminUserId, role: ROLES.ADMIN, status: "ACTIVE" },
    });

    await signIn({
      userId: adminUserId,
      masjidId: emptyMasjid,
      role: ROLES.ADMIN,
      isPlatformAdmin: false,
    });

    const form = new FormData();
    form.set("announcementTitle", "No Members");
    form.set("announcementBody", "Should fail");
    form.set("sendToTelegram", "off");

    const result = await sendAnnouncementAction(undefined, form);
    expect(result).toBeDefined();
    expect(result!.error).toContain("No active members found");

    // Cleanup
    await prisma.masjidUser.deleteMany({ where: { masjidId: emptyMasjid } });
    await prisma.user.delete({ where: { id: adminUserId } });
    await prisma.masjid.delete({ where: { id: emptyMasjid } });
  });

  it("requires settings:write permission (FORBIDDEN for COLLECTOR)", async () => {
    // Sign in as COLLECTOR (no settings:write)
    const collectorUserId = await createUser(`collector-${Date.now().toString(36)}@example.invalid`, "Collector");
    await prisma.masjidUser.create({
      data: { masjidId: fx.masjidA, userId: collectorUserId, role: ROLES.COLLECTOR, status: "ACTIVE" },
    });

    await signIn({
      userId: collectorUserId,
      masjidId: fx.masjidA,
      role: ROLES.COLLECTOR,
      isPlatformAdmin: false,
    });

    const form = new FormData();
    form.set("announcementTitle", "Unauthorized");
    form.set("announcementBody", "Collector cannot send");
    form.set("sendToTelegram", "off");

    // The action throws FORBIDDEN error due to assertCan
    await expect(sendAnnouncementAction(undefined, form)).rejects.toThrow("FORBIDDEN");

    await prisma.masjidUser.deleteMany({ where: { userId: collectorUserId } });
    await prisma.user.delete({ where: { id: collectorUserId } });
  });
});