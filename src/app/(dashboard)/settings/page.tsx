import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { getDictionary } from "@/i18n";
import { SettingsPageClient } from "./settings-client";

export const dynamic = "force-dynamic";

const SETTINGS_TAB_KEYS = [
  "masjid",
  "contributionCategories",
  "expenseCategories",
  "notifications",
  "staff",
  "prayerTimes",
] as const;

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { t } = await getDictionary();
  const user = await requireStaff();
  if (!can(user.role, "settings:write")) redirect("/dashboard");
  const masjidId = user.masjidId!;

  // The active tab lives in the URL so that a page coming back from a
  // sub-page (e.g. cancelling a category edit) reopens on the same tab.
  const { tab } = await searchParams;
  const initialTab = (SETTINGS_TAB_KEYS as readonly string[]).includes(tab ?? "")
    ? (tab as (typeof SETTINGS_TAB_KEYS)[number])
    : "masjid";

  const [masjid, categories, expenseCategories, memberships, notificationSettings, collectionEvents, members, assignments] = await Promise.all([
    prisma.masjid.findUnique({
      where: { id: masjidId },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        email: true,
        receiptPrefix: true,
        financialYearStartMonth: true,
        receiptFooter: true,
        fajrTime: true,
        sunriseTime: true,
        dhuhrTime: true,
        asrTime: true,
        maghribTime: true,
        ishaTime: true,
        jummahTime: true,
        prayerTimesUpdatedAt: true,
      }
    }),
    prisma.contributionCategory.findMany({ where: { masjidId }, orderBy: { name: "asc" } }),
    prisma.expenseCategory.findMany({ where: { masjidId }, orderBy: { name: "asc" } }),
    prisma.masjidUser.findMany({
      where: { masjidId },
      include: { user: { select: { id: true, name: true, email: true, lastLoginAt: true, status: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.masjidNotificationSettings.findUnique({ where: { masjidId } }),
    prisma.collectionEvent.findMany({
      where: { masjidId },
      include: { category: true },
      orderBy: { dueDate: "desc" },
    }),
    prisma.member.findMany({
      where: { masjidId, status: "ACTIVE" },
      select: { id: true, memberNo: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.collectionEventAssignment.findMany({
      where: { event: { masjidId } },
      include: { member: { select: { id: true, memberNo: true, fullName: true } }, event: { select: { id: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  if (!masjid) redirect("/dashboard");

  // Default settings if not found
  const settings = notificationSettings ?? {
    telegramEnabled: true,
    emailEnabled: false,
    inAppEnabled: true,
  };

  // Get bot username if token exists
  let botUsername: string | null = null;
  if (process.env.TELEGRAM_BOT_TOKEN) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`);
      const data = await res.json();
      if (data.ok) botUsername = data.result.username;
    } catch {}
  }

  // Extract all translated strings (functions cannot be passed to client components)
  const labels: Record<string, string> = {
    masjidName: t("masjidName"),
    address: t("address"),
    phone: t("phone"),
    email: t("email"),
    receiptPrefix: t("receiptPrefix"),
    financialYear: t("financialYear"),
    receiptFooter: t("receiptFooter"),
    settingsSaved: t("settingsSaved"),
    save: t("save"),
    loading: t("loading"),
    name: t("name"),
    category: t("category"),
    saved: t("saved"),
    // Prayer times labels
    prayerTimes: t("prayerTimes"),
    prayerTimesDesc: t("prayerTimesDesc"),
    fajrTime: t("fajrTime"),
    sunriseTime: t("sunriseTime"),
    dhuhrTime: t("dhuhrTime"),
    asrTime: t("asrTime"),
    maghribTime: t("maghribTime"),
    ishaTime: t("ishaTime"),
    jummahTime: t("jummahTime"),
    prayerTimeFormat: t("prayerTimeFormat"),
    prayerTimesSaved: t("prayerTimesSaved"),
    staff: t("staff"),
    notifications: t("notifications"),
    telegramNotifications: t("telegramNotifications"),
    telegramNotificationsDesc: t("telegramNotificationsDesc"),
    emailNotifications: t("emailNotifications"),
    emailNotificationsDesc: t("emailNotificationsDesc"),
    inAppNotifications: t("inAppNotifications"),
    inAppNotificationsDesc: t("inAppNotificationsDesc"),
    notificationsEnabled: t("notificationsEnabled"),
    notificationsDisabled: t("notificationsDisabled"),
    botConnected: t("botConnected"),
    botNotConfigured: t("botNotConfigured"),
    channelConfigured: t("channelConfigured"),
    channelNotConfigured: t("channelNotConfigured"),
    smtpConfigured: t("smtpConfigured"),
    smtpNotConfigured: t("smtpNotConfigured"),
    saveNotificationSettings: t("saveNotificationSettings"),
    notificationSettingsSaved: t("notificationSettingsSaved"),
    // Announcement labels
    sendAnnouncement: t("sendAnnouncement"),
    announcementTitle: t("announcementTitle"),
    announcementTitlePlaceholder: t("announcementTitlePlaceholder"),
    announcementBody: t("announcementBody"),
    announcementBodyPlaceholder: t("announcementBodyPlaceholder"),
    sendToTelegramChannel: t("sendToTelegramChannel"),
    announcementSent: t("announcementSent"),
    announcementFailed: t("announcementFailed"),
    announcementDescription: t("announcementDescription"),
    // Category-specific labels
    edit: t("edit"),
    delete: t("delete"),
    cancel: t("cancel"),
    update: t("update"),
    addCategory: t("addCategory"),
    addExpenseCategory: t("addExpenseCategory"),
    code: t("code"),
    restrictedPurpose: t("restrictedPurpose"),
    reportingGroup: t("reportingGroup"),
    active: t("active"),
    inactive: t("inactive"),
    confirmDelete: t("confirmDelete"),
    // Enhanced category fields
    description: t("description"),
    defaultAmount: t("defaultAmount"),
    defaultAmountHint: t("defaultAmountHint"),
    collectionMode: t("collectionMode"),
    collectionModeHint: t("collectionModeHint"),
    defaultDueDay: t("defaultDueDay"),
    defaultGraceDays: t("defaultGraceDays"),
    frequency: t("frequency"),
    weekly: t("weekly"),
    monthly: t("monthly"),
    semiAnnual: t("semiAnnual"),
    annual: t("annual"),
    yearly: t("yearly"),
    eventBased: t("eventBased"),
    occasional: t("occasional"),
    householdWise: t("householdWise"),
    combined: t("combined"),
    // Collection events
    collectionEvents: t("collectionEvents"),
    addCollectionEvent: t("addCollectionEvent"),
    collectionEvent: t("collectionEvent"),
    eventName: t("eventName"),
    eventStartDate: t("eventStartDate"),
    eventEndDate: t("eventEndDate"),
    eventDueDate: t("eventDueDate"),
    eventExpectedAmount: t("eventExpectedAmount"),
    eventStatus: t("eventStatus"),
    eventApplicableMonth: t("eventApplicableMonth"),
    eventApplicableYear: t("eventApplicableYear"),
    eventNotes: t("eventNotes"),
    scheduled: t("scheduled"),
    open: t("open"),
    completed: t("completed"),
    cancelled: t("cancelled"),
    generateEvents: t("generateEvents"),
    generateEventsHint: t("generateEventsHint"),
    generateFromDate: t("generateFromDate"),
    generateToDate: t("generateToDate"),
    eventsGenerated: t("eventsGenerated"),
    noEvents: t("noEvents"),
    assignHouseholds: t("assignHouseholds"),
    assignHouseholdsHint: t("assignHouseholdsHint"),
    selectMembers: t("selectMembers"),
    assignedHouseholds: t("assignedHouseholds"),
    removeAssignment: t("removeAssignment"),
    expectedAmountPerHousehold: t("expectedAmountPerHousehold"),
    generateEventsAction: t("generateEventsAction"),
    viewEvents: t("viewEvents"),
    addEvent: t("addEvent"),
    editEvent: t("editEvent"),
    deleteEvent: t("deleteEvent"),
    confirmDeleteEvent: t("confirmDeleteEvent"),
    eventHasAllocations: t("eventHasAllocations"),
    eventHasAssignments: t("eventHasAssignments"),
    assignmentStatus: t("assignmentStatus"),
    assignmentExpected: t("assignmentExpected"),
    assignmentReceived: t("assignmentReceived"),
    assignmentOutstanding: t("assignmentOutstanding"),
  };

  const contributionCategoryItems = categories.map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code,
    restrictedPurpose: c.restrictedPurpose,
    reportingGroup: c.reportingGroup,
    description: c.description,
    defaultAmountPaise: c.defaultAmountPaise,
    frequency: c.frequency,
    collectionMode: c.collectionMode,
    defaultDueDay: c.defaultDueDay,
    defaultGraceDays: c.defaultGraceDays,
    meta: [c.code, c.reportingGroup].filter(Boolean).join(" · "),
    restricted: c.restrictedPurpose,
    active: c.active,
  }));

  const expenseCategoryItems = expenseCategories.map((c) => ({
    id: c.id,
    name: c.name,
    active: c.active,
  }));

  const collectionEventItems = collectionEvents.map((e) => ({
    id: e.id,
    categoryId: e.categoryId,
    categoryName: e.category.name,
    name: e.name,
    startDate: e.startDate.toISOString(),
    endDate: e.endDate?.toISOString() ?? null,
    dueDate: e.dueDate.toISOString(),
    expectedAmountPaise: e.expectedAmountPaise,
    status: e.status,
    applicableMonth: e.applicableMonth,
    applicableYear: e.applicableYear,
    notes: e.notes,
  }));

  const memberOptions = members.map((m) => ({
    id: m.id,
    memberNo: m.memberNo,
    fullName: m.fullName,
  }));

  const assignmentItems = assignments.map((a) => ({
    id: a.id,
    eventId: a.eventId,
    memberId: a.memberId,
    memberName: a.member.fullName,
    memberNo: a.member.memberNo,
    expectedAmountPaise: a.expectedAmountPaise,
    status: a.status,
  }));

  const staffMembers = memberships
    .filter((m) => m.role !== "SUPER_ADMIN")
    .map((m) => ({
      id: m.id,
      user: {
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        lastLoginAt: m.user.lastLoginAt?.toISOString() ?? null,
      },
      role: m.role,
      status: m.status as "ACTIVE" | "INACTIVE",
      isSelf: m.user.id === user.id,
    }));

  const staffLabels = {
    name: t("name"),
    email: t("email"),
    password: t("password"),
    phone: t("phone"),
    upiId: t("upiId"),
    role: t("role"),
    roleAdmin: t("roleAdmin"),
    roleCollector: t("roleCollector"),
    roleAuditor: t("roleAuditor"),
    roleSuperAdmin: t("roleSuperAdmin"),
    save: t("save"),
    loading: t("loading"),
    saved: t("saved"),
    addStaff: t("addStaff"),
    activeStaff: t("activeStaff"),
    inactiveStaff: t("inactiveStaff"),
    remove: t("remove"),
    deactivateStaff: t("deactivateStaff"),
    deactivateStaffHint: t("deactivateStaffHint"),
    reactivate: t("reactivate"),
    yesRemove: t("yesRemove"),
    cancel: t("cancel"),
    neverSignedIn: t("neverSignedIn"),
    lastSignIn: t("lastSignIn"),
    you: t("you"),
    active: t("active"),
    inactive: t("inactive"),
    phoneRequired: t("phoneRequired"),
    upiIdHint: t("upiIdHint"),
    newStaffAccount: t("newStaffAccount"),
  };

  const roleLabels = {
    SUPER_ADMIN: t("roleSuperAdmin"),
    ADMIN: t("roleAdmin"),
    COLLECTOR: t("roleCollector"),
    AUDITOR: t("roleAuditor"),
  };

  return (
    <SettingsPageClient
      labels={labels}
      initialTab={initialTab}
      masjid={masjid}
      contributionCategoryItems={contributionCategoryItems}
      collectionEventItems={collectionEventItems}
      memberOptions={memberOptions}
      assignmentItems={assignmentItems}
      expenseCategoryItems={expenseCategoryItems}
      staffMembers={staffMembers}
      staffLabels={staffLabels}
      roleLabels={roleLabels}
      notificationSettings={settings}
      botUsername={botUsername}
    />
  );
}