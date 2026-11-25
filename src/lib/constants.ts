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

/** CollectionDefinition frequency enum */
export const COLLECTION_FREQUENCY = {
  WEEKLY: "WEEKLY",
  MONTHLY: "MONTHLY",
  QUARTERLY: "QUARTERLY",
  SEMI_ANNUAL: "SEMI_ANNUAL",
  ANNUAL: "ANNUAL",
  EVENT_BASED: "EVENT_BASED",
  ONE_TIME: "ONE_TIME",
} as const;

export type CollectionFrequency = (typeof COLLECTION_FREQUENCY)[keyof typeof COLLECTION_FREQUENCY];

export const COLLECTION_FREQUENCY_LABELS: Record<string, string> = {
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  SEMI_ANNUAL: "Semi-annual",
  ANNUAL: "Annual",
  EVENT_BASED: "Event-based",
  ONE_TIME: "One-time",
};

/** CollectionDefinition amount type enum */
export const AMOUNT_TYPE = {
  FIXED: "FIXED",
  VARIABLE: "VARIABLE",
} as const;

export type AmountType = (typeof AMOUNT_TYPE)[keyof typeof AMOUNT_TYPE];

export const AMOUNT_TYPE_LABELS: Record<string, string> = {
  FIXED: "Fixed amount",
  VARIABLE: "Variable amount",
};

/** CollectionDefinition donor eligibility enum */
export const DONOR_ELIGIBILITY = {
  MEMBERS_ONLY: "MEMBERS_ONLY",
  WALKIN_ONLY: "WALKIN_ONLY",
  BOTH: "BOTH",
} as const;

export type DonorEligibility = (typeof DONOR_ELIGIBILITY)[keyof typeof DONOR_ELIGIBILITY];

export const DONOR_ELIGIBILITY_LABELS: Record<string, string> = {
  MEMBERS_ONLY: "Members only",
  WALKIN_ONLY: "Walk-ins only",
  BOTH: "Members & walk-ins",
};

/** CollectionDefinition member assignment enum */
export const MEMBER_ASSIGNMENT = {
  ALL_ELIGIBLE: "ALL_ELIGIBLE",
  SELECTED: "SELECTED",
} as const;

export type MemberAssignment = (typeof MEMBER_ASSIGNMENT)[keyof typeof MEMBER_ASSIGNMENT];

export const MEMBER_ASSIGNMENT_LABELS: Record<string, string> = {
  ALL_ELIGIBLE: "All eligible members",
  SELECTED: "Selected members only",
};

/** CollectionDefinition due generation enum */
export const DUE_GENERATION = {
  ADMIN: "ADMIN",
  AUTOMATIC: "AUTOMATIC",
} as const;

export type DueGeneration = (typeof DUE_GENERATION)[keyof typeof DUE_GENERATION];

export const DUE_GENERATION_LABELS: Record<string, string> = {
  ADMIN: "Admin creates dues",
  AUTOMATIC: "Auto-generate dues",
};

/** CollectionDefinition settlement policy enum */
export const SETTLEMENT_POLICY = {
  OLDEST_FIRST: "OLDEST_FIRST",
  ANY_PENDING_PERIOD: "ANY_PENDING_PERIOD",
} as const;

export type SettlementPolicy = (typeof SETTLEMENT_POLICY)[keyof typeof SETTLEMENT_POLICY];

export const SETTLEMENT_POLICY_LABELS: Record<string, string> = {
  OLDEST_FIRST: "Oldest due first (FIFO)",
  ANY_PENDING_PERIOD: "Any pending period",
};

export const DEFAULT_EXPENSE_CATEGORIES = [
  "Utilities",
  "Maintenance",
  "Salaries",
  "Events",
  "Education",
  "Other",
];
