/**
 * Subscription plan definitions for the SaaS platform.
 * All prices in paise (1 INR = 100 paise).
 * Limits: -1 means unlimited.
 */

export type SubscriptionPlanCode =
  | "TRIAL"
  | "STARTER"
  | "PROFESSIONAL"
  | "ENTERPRISE";

export type SubscriptionStatus =
  | "TRIAL"
  | "ACTIVE"
  | "GRACE"
  | "SUSPENDED"
  | "CANCELLED";

export interface PlanLimits {
  maxMembers: number;
  maxStaff: number;
  maxCategories: number;
}

export interface PlanFeatures {
  payments: boolean;
  receipts: boolean;
  portal: boolean;
  reports: boolean;
  api: boolean;
}

export interface SubscriptionPlan {
  code: SubscriptionPlanCode;
  name: string;
  priceMonthlyPaise: number;
  limits: PlanLimits;
  features: PlanFeatures;
  trialDays: number;
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanCode, SubscriptionPlan> = {
  TRIAL: {
    code: "TRIAL",
    name: "Trial",
    priceMonthlyPaise: 0,
    limits: { maxMembers: 100, maxStaff: 3, maxCategories: 10 },
    features: { payments: true, receipts: true, portal: true, reports: true, api: false },
    trialDays: 30,
  },
  STARTER: {
    code: "STARTER",
    name: "Starter",
    priceMonthlyPaise: 99900, // ₹999
    limits: { maxMembers: 500, maxStaff: 5, maxCategories: 20 },
    features: { payments: true, receipts: true, portal: true, reports: true, api: false },
    trialDays: 0,
  },
  PROFESSIONAL: {
    code: "PROFESSIONAL",
    name: "Professional",
    priceMonthlyPaise: 249900, // ₹2,499
    limits: { maxMembers: 2000, maxStaff: 15, maxCategories: 50 },
    features: { payments: true, receipts: true, portal: true, reports: true, api: true },
    trialDays: 0,
  },
  ENTERPRISE: {
    code: "ENTERPRISE",
    name: "Enterprise",
    priceMonthlyPaise: 499900, // ₹4,999
    limits: { maxMembers: -1, maxStaff: -1, maxCategories: -1 },
    features: { payments: true, receipts: true, portal: true, reports: true, api: true },
    trialDays: 0,
  },
} as const;

export const PLAN_CODES: SubscriptionPlanCode[] = [
  "TRIAL",
  "STARTER",
  "PROFESSIONAL",
  "ENTERPRISE",
];

export function getPlan(code: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS[code as SubscriptionPlanCode];
}

export function getPlanOrThrow(code: string): SubscriptionPlan {
  const plan = getPlan(code);
  if (!plan) throw new Error(`Unknown subscription plan: ${code}`);
  return plan;
}

export function getDefaultPlan(): SubscriptionPlan {
  return SUBSCRIPTION_PLANS.TRIAL;
}

export function isValidPlanCode(code: string): code is SubscriptionPlanCode {
  return code in SUBSCRIPTION_PLANS;
}

export const GRACE_PERIOD_DAYS = 7;

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  TRIAL: "Trial",
  ACTIVE: "Active",
  GRACE: "Grace Period",
  SUSPENDED: "Suspended",
  CANCELLED: "Cancelled",
};

export const SUBSCRIPTION_STATUS_TONES: Record<SubscriptionStatus, "trial" | "success" | "grace" | "warning" | "danger" | "neutral"> = {
  TRIAL: "trial",
  ACTIVE: "success",
  GRACE: "grace",
  SUSPENDED: "warning",
  CANCELLED: "danger",
};

export function getSubscriptionTone(status: string | null | undefined): "trial" | "success" | "grace" | "warning" | "danger" | "neutral" {
  if (!status) return "trial";
  return SUBSCRIPTION_STATUS_TONES[status as SubscriptionStatus] ?? "neutral";
}