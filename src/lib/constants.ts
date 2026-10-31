export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  COLLECTOR: "COLLECTOR",
  AUDITOR: "AUDITOR",
  MEMBER: "MEMBER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/** Staff roles that may be assigned through the staff-management screen. */
export const STAFF_ROLES: Role[] = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.COLLECTOR,
  ROLES.AUDITOR,
];

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Platform Super Admin",
  ADMIN: "Masjid Admin / Treasurer",
  COLLECTOR: "Collector",
  AUDITOR: "Auditor / Viewer",
  MEMBER: "Member",
};

export const FREQUENCIES = {
  MONTHLY: "MONTHLY",
  SEMI_ANNUAL: "SEMI_ANNUAL",
  ANNUAL: "ANNUAL",
  ONE_TIME: "ONE_TIME",
} as const;

export type Frequency = (typeof FREQUENCIES)[keyof typeof FREQUENCIES];

export const FREQUENCY_LABELS: Record<string, string> = {
  MONTHLY: "Monthly",
  SEMI_ANNUAL: "Semi-annual",
  ANNUAL: "Annual",
  ONE_TIME: "One-time",
};

export const PAYMENT_MODES = {
  CASH: "CASH",
  UPI: "UPI",
  BANK_TRANSFER: "BANK_TRANSFER",
  OTHER: "OTHER",
} as const;

export const PAYMENT_MODE_LABELS: Record<string, string> = {
  CASH: "Cash",
  UPI: "UPI",
  BANK_TRANSFER: "Bank transfer",
  OTHER: "Other",
};

export const PAYMENT_STATUS = {
  SUCCESS: "SUCCESS",
  REVERSED: "REVERSED",
} as const;

export const VERIFICATION_STATUS = {
  MANUAL: "MANUAL",
  VERIFIED: "VERIFIED",
} as const;

export const PERIOD_STATUS = {
  PENDING: "PENDING",
  PARTIAL: "PARTIAL",
  PAID: "PAID",
  WAIVED: "WAIVED",
} as const;

/** How a collection event is scheduled. */
export const CATEGORY_FREQUENCIES = {
  WEEKLY: "WEEKLY",
  MONTHLY: "MONTHLY",
  SEMI_ANNUAL: "SEMI_ANNUAL",
  ANNUAL: "ANNUAL",
  YEARLY: "YEARLY",
  EVENT_BASED: "EVENT_BASED",
  OCCASIONAL: "OCCASIONAL",
} as const;

export type CategoryFrequency = (typeof CATEGORY_FREQUENCIES)[keyof typeof CATEGORY_FREQUENCIES];

export const CATEGORY_FREQUENCY_LABELS: Record<string, string> = {
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  SEMI_ANNUAL: "Semi-annual",
  ANNUAL: "Annual",
  YEARLY: "Yearly",
  EVENT_BASED: "Event-based",
  OCCASIONAL: "Occasional",
};

/** How a category's collections are gathered. */
export const COLLECTION_MODES = {
  HOUSEHOLD_WISE: "HOUSEHOLD_WISE",
  COMBINED: "COMBINED",
} as const;

export type CollectionMode = (typeof COLLECTION_MODES)[keyof typeof COLLECTION_MODES];

export const COLLECTION_MODE_LABELS: Record<string, string> = {
  HOUSEHOLD_WISE: "Household-wise",
  COMBINED: "Combined",
};

/** Lifecycle of a collection event. */
export const EVENT_STATUS = {
  SCHEDULED: "SCHEDULED",
  OPEN: "OPEN",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export type EventStatus = (typeof EVENT_STATUS)[keyof typeof EVENT_STATUS];

export const EVENT_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Scheduled",
  OPEN: "Open",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const MEMBER_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;

export const EXPENSE_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export const MASJID_STATUS = {
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
} as const;

export const DEFAULT_CATEGORIES = [
  { name: "Monthly Chanda", code: "MONTHLY", reportingGroup: "Recurring", restrictedPurpose: false },
  { name: "Annual Chanda", code: "ANNUAL", reportingGroup: "Recurring", restrictedPurpose: false },
  { name: "General Donation", code: "GENERAL", reportingGroup: "General", restrictedPurpose: false },
  { name: "Zakat", code: "ZAKAT", reportingGroup: "Restricted", restrictedPurpose: true },
  { name: "Sadaqah", code: "SADAQAH", reportingGroup: "General", restrictedPurpose: false },
  { name: "Construction Fund", code: "CONSTRUCTION", reportingGroup: "Restricted", restrictedPurpose: true },
];

export const DEFAULT_EXPENSE_CATEGORIES = [
  "Utilities",
  "Maintenance",
  "Salaries",
  "Events",
  "Education",
  "Other",
];
