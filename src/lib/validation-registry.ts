import { z } from "zod";
import { FREQUENCIES, PAYMENT_MODES, CATEGORY_FREQUENCIES, COLLECTION_MODES, EVENT_STATUS } from "@/lib/constants";
import { UPI_ID_PATTERN } from "./upi";

// ============================================
// CENTRAL VALIDATION REGISTRY
// ============================================
// Define ALL validation rules HERE ONLY.
// Everything else (Zod schema, TS types, form fields) auto-generates.

/**
 * Shape of a reusable rule. Every field in `VALIDATION_RULES.entities` either
 * points at one of these by name (`rule: "name"`) or declares its own
 * constraints inline (`type: "string" | "number" | "enum" | ...`).
 */
export interface CommonRuleBase {
  label: string;
}

export interface StringRule extends CommonRuleBase {
  min?: number;
  max?: number;
  pattern?: RegExp;
  patternMsg?: string;
}

export interface NumberRule extends CommonRuleBase {
  min: number;
}

export interface PatternRule extends CommonRuleBase {
  pattern: RegExp;
  patternMsg: string;
  /** How the input should filter keystrokes: "letters" or "digits". */
  filter?: InputFilter;
}

/**
 * Which characters a field accepts at the keystroke level. This mirrors the
 * rule's regex so the browser never lets an invalid character into the form.
 */
export type InputFilter = "letters" | "digits";

export type CommonRule =
  | (StringRule & { pattern: RegExp; patternMsg: string }) // name, phone, email, upiId, date
  | (StringRule & { max: number }) // address, notes
  | (NumberRule) // amount
  | (StringRule & { min: number; max: number }) // password
  ;

export const COMMON_RULES = {
  name: { label: "Name", min: 1, max: 200, pattern: /^[\p{L}\p{M}\s.\-'']+$/u, patternMsg: "Only letters, spaces, dots, hyphens, apostrophes", filter: "letters" as InputFilter },
  phone: { label: "Mobile", pattern: /^[6-9]\d{9}$/, patternMsg: "10-digit Indian mobile (starts 6-9)", filter: "digits" as InputFilter, max: 10 },
  email: { label: "Email", pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, patternMsg: "Valid email" },
  address: { label: "Address", max: 400 },
  notes: { label: "Notes", max: 1000 },
  upiId: { label: "UPI ID", pattern: UPI_ID_PATTERN, patternMsg: "Valid UPI ID (name@upi or 9876543210@ybl)" },
  amount: { label: "Amount", min: 1 },
  date: { label: "Date", pattern: /^\d{4}-\d{2}-\d{2}$/, patternMsg: "YYYY-MM-DD format" },
  password: { label: "Password", min: 8, max: 100 },
} as const;

export const VALIDATION_RULES = {
  common: COMMON_RULES,

  entities: {
    member: {
      fullName: { rule: "name", required: true },
      fatherName: { rule: "name", required: false, max: 150 },
      phone: { rule: "phone", required: false },
      alternatePhone: { rule: "phone", required: false, label: "Alternate Mobile" },
      email: { rule: "email", required: false },
      address: { rule: "address", required: false },
      joinDate: { rule: "date", required: false },
      status: { type: "enum", values: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
      notes: { rule: "notes", required: false },
      createPortalAccount: { type: "boolean", default: false },
      portalEmail: { rule: "email", required: false },
      portalPassword: { rule: "password", required: false },
      idempotencyKey: { type: "hidden", required: true, min: 8 },
    },

    plan: {
      memberId: { type: "ref", ref: "member", required: true, label: "Member" },
      categoryId: { type: "ref", ref: "contributionCategory", required: true, label: "Category" },
      frequency: { type: "enum", values: [FREQUENCIES.MONTHLY, FREQUENCIES.SEMI_ANNUAL, FREQUENCIES.ANNUAL, FREQUENCIES.ONE_TIME], required: true },
      amountPaise: { rule: "amount", required: true },
      startDate: { rule: "date", required: true },
      endDate: { rule: "date", required: false },
      dueDay: { type: "number", min: 1, max: 28, default: 10 },
      graceDays: { type: "number", min: 0, max: 60, default: 0 },
    },

    payment: {
      memberId: { type: "ref", ref: "member", required: false, label: "Member" },
      walkInName: { rule: "name", required: false, max: 150 },
      categoryId: { type: "ref", ref: "contributionCategory", required: true, label: "Category" },
      paymentDate: { rule: "date", required: true },
      amountPaise: { rule: "amount", required: true },
      mode: { type: "enum", values: [PAYMENT_MODES.CASH, PAYMENT_MODES.UPI, PAYMENT_MODES.BANK_TRANSFER, PAYMENT_MODES.OTHER], required: true },
      referenceNo: { type: "string", required: false, max: 120 },
      verificationStatus: { type: "enum", values: ["MANUAL", "VERIFIED"], default: "MANUAL" },
      notes: { rule: "notes", required: false },
      idempotencyKey: { type: "string", required: true, min: 8 },
      allocations: { type: "array", itemType: "allocation" },
    },

    expense: {
      categoryId: { type: "ref", ref: "expenseCategory", required: true, label: "Category" },
      date: { rule: "date", required: true },
      payee: { rule: "name", required: true, max: 200 },
      amountPaise: { rule: "amount", required: true },
      mode: { type: "enum", values: [PAYMENT_MODES.CASH, PAYMENT_MODES.UPI, PAYMENT_MODES.BANK_TRANSFER, PAYMENT_MODES.OTHER], required: true },
      referenceNo: { type: "string", required: false, max: 120 },
      description: { rule: "notes", required: false },
    },

    settings: {
      name: { rule: "name", required: true },
      address: { rule: "address", required: false },
      phone: { rule: "phone", required: false },
      email: { rule: "email", required: false },
      receiptPrefix: { type: "string", required: true, min: 2, max: 8, pattern: /^[A-Z0-9]+$/, patternMsg: "Capital letters and digits only" },
      financialYearStartMonth: { type: "number", min: 1, max: 12, required: true },
      receiptFooter: { rule: "notes", required: false, max: 300 },
      // Prayer times (stored as HH:mm 24-hour format)
      fajrTime: { type: "string", required: false, min: 5, max: 5, pattern: /^([01]\d|2[0-3]):[0-5]\d$/, patternMsg: "Format: HH:MM (24-hour)", label: "Fajr" },
      sunriseTime: { type: "string", required: false, min: 5, max: 5, pattern: /^([01]\d|2[0-3]):[0-5]\d$/, patternMsg: "Format: HH:MM (24-hour)", label: "Sunrise" },
      dhuhrTime: { type: "string", required: false, min: 5, max: 5, pattern: /^([01]\d|2[0-3]):[0-5]\d$/, patternMsg: "Format: HH:MM (24-hour)", label: "Dhuhr" },
      asrTime: { type: "string", required: false, min: 5, max: 5, pattern: /^([01]\d|2[0-3]):[0-5]\d$/, patternMsg: "Format: HH:MM (24-hour)", label: "Asr" },
      maghribTime: { type: "string", required: false, min: 5, max: 5, pattern: /^([01]\d|2[0-3]):[0-5]\d$/, patternMsg: "Format: HH:MM (24-hour)", label: "Maghrib" },
      ishaTime: { type: "string", required: false, min: 5, max: 5, pattern: /^([01]\d|2[0-3]):[0-5]\d$/, patternMsg: "Format: HH:MM (24-hour)", label: "Isha" },
      jummahTime: { type: "string", required: false, min: 5, max: 5, pattern: /^([01]\d|2[0-3]):[0-5]\d$/, patternMsg: "Format: HH:MM (24-hour)", label: "Jummah" },
    },

    category: {
      name: { rule: "name", required: true },
      code: { type: "string", required: true, min: 2, max: 20, pattern: /^[A-Z0-9_]+$/, patternMsg: "Capital letters, digits, underscores" },
      restrictedPurpose: { type: "boolean", default: false },
      reportingGroup: { type: "string", required: false, max: 60 },
      description: { rule: "notes", required: false },
      defaultAmountPaise: { type: "number", required: false, min: 1, label: "Default Amount (Paise)" },
      frequency: { type: "enum", values: Object.values(CATEGORY_FREQUENCIES), required: false },
      collectionMode: { type: "enum", values: Object.values(COLLECTION_MODES), required: false },
      schedulingRules: { type: "hidden", required: false },
      defaultDueDay: { type: "number", min: 1, max: 28, required: false },
      defaultGraceDays: { type: "number", min: 0, max: 60, required: false, default: 0 },
    },

    expenseCategory: {
      name: { rule: "name", required: true },
      active: { type: "boolean", default: true },
    },

    collectionEvent: {
      categoryId: { type: "ref", ref: "contributionCategory", required: true, label: "Category" },
      name: { rule: "name", required: true },
      startDate: { rule: "date", required: true },
      endDate: { rule: "date", required: false },
      dueDate: { rule: "date", required: true },
      expectedAmountPaise: { type: "number", required: false, min: 1, label: "Expected Amount (Paise)" },
      status: { type: "enum", values: Object.values(EVENT_STATUS), default: "SCHEDULED" },
      applicableMonth: { type: "number", min: 1, max: 12, required: false },
      applicableYear: { type: "number", min: 2020, max: 2100, required: false },
      notes: { rule: "notes", required: false },
    },

    collectionEventAssignment: {
      eventId: { type: "ref", ref: "collectionEvent", required: true, label: "Collection Event" },
      memberId: { type: "ref", ref: "member", required: true, label: "Member" },
      expectedAmountPaise: { rule: "amount", required: true },
      status: { type: "enum", values: ["PENDING", "PARTIAL", "PAID", "WAIVED"], default: "PENDING" },
    },

    staff: {
      name: { rule: "name", required: true, max: 120 },
      email: { rule: "email", required: true },
      password: { rule: "password", required: false },
      role: { type: "enum", values: ["ADMIN", "COLLECTOR", "AUDITOR"], required: true },
      phone: { type: "phone", required: false },
      upiId: { rule: "upiId", required: false },
    },

    login: {
      email: { rule: "email", required: true },
      // `rule: "password"` gives the right input type; `min: 1` overrides the
      // rule's 8-char policy — login only checks that a password was entered.
      password: { rule: "password", required: true, min: 1 },
    },

    masjid: {
      name: { rule: "name", required: true },
      slug: { type: "slug", required: true },
      receiptPrefix: { type: "string", required: true, min: 2, max: 8, pattern: /^[A-Z0-9]+$/, patternMsg: "Capital letters and digits only" },
      address: { rule: "address", required: false },
      phone: { rule: "phone", required: false },
      email: { rule: "email", required: false },
      financialYearStartMonth: { type: "number", min: 1, max: 12, required: true, default: 4 },
      receiptFooter: { rule: "notes", required: false, max: 300, default: "Jazak Allah Khair for your contribution." },
      status: { type: "enum", values: ["ACTIVE", "SUSPENDED"], default: "ACTIVE" },
    },

    allocation: {
      duesPeriodId: { type: "ref", ref: "duesPeriod", required: false, label: "Due Period" },
      categoryId: { type: "ref", ref: "contributionCategory", required: true, label: "Category" },
      amountPaise: { rule: "amount", required: true },
      purposeNote: { rule: "notes", required: false, max: 200 },
    },
  },
} as const;

// ============================================
// ZOD SCHEMA GENERATOR (single source of truth)
// ============================================

function getCommonRule(name: keyof typeof COMMON_RULES): z.ZodTypeAny {
  const r = COMMON_RULES[name];
  let schema: z.ZodTypeAny;

  switch (name) {
    case "name": {
      const rule = r as { label: string; min: number; max: number; pattern: RegExp; patternMsg: string };
      schema = z.string().trim().min(rule.min, `${rule.label} is required`).max(rule.max, `${rule.label} too long`)
        .refine((v) => rule.pattern.test(v), rule.patternMsg);
      break;
    }
    case "phone": {
      const rule = r as { label: string; pattern: RegExp; patternMsg: string };
      schema = z.string().trim().regex(rule.pattern, rule.patternMsg).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v));
      break;
    }
    case "email": {
      const rule = r as { label: string; pattern: RegExp; patternMsg: string };
      schema = z.string().trim().toLowerCase().email(rule.patternMsg).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v));
      break;
    }
    case "address":
    case "notes": {
      const rule = r as { label: string; max: number };
      schema = z.string().trim().max(rule.max).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v));
      break;
    }
    case "upiId": {
      const rule = r as { label: string; pattern: RegExp; patternMsg: string };
      schema = z.string().trim().toLowerCase().refine((v) => v === "" || rule.pattern.test(v), rule.patternMsg)
        .transform((v) => (v === "" ? undefined : v)).optional();
      break;
    }
    case "amount": {
      const rule = r as { label: string; min: number };
      schema = z.number().int().positive(`${rule.label} must be > 0`);
      break;
    }
    case "date": {
      const rule = r as { label: string; pattern: RegExp; patternMsg: string };
      schema = z.string().regex(rule.pattern, rule.patternMsg);
      break;
    }
    case "password": {
      const rule = r as { label: string; min: number; max: number };
      schema = z.string().min(rule.min, `${rule.label} min ${rule.min} chars`).max(rule.max).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v));
      break;
    }
    default:
      schema = z.string();
  }
  return schema;
}

function buildFieldSchema(entity: string, field: string, config: Record<string, unknown>): z.ZodTypeAny {
  if (config.rule && COMMON_RULES[config.rule as keyof typeof COMMON_RULES]) {
    let schema = getCommonRule(config.rule as keyof typeof COMMON_RULES);
    if (!config.required) schema = schema.optional();
    if (config.default !== undefined) schema = schema.default(config.default);
    return schema;
  }

  const type = config.type as string | undefined;
  const values = config.values as readonly string[] | undefined;
  const min = config.min as number | undefined;
  const max = config.max as number | undefined;
  const pattern = config.pattern as RegExp | undefined;
  const patternMsg = config.patternMsg as string | undefined;
  const label = config.label as string | undefined;
  const defaultVal = config.default;

  switch (type) {
    case "enum": {
      const opts = (values ?? []) as [string, ...string[]];
      return z.enum(opts).default((defaultVal as string | undefined) ?? opts[0]);
    }
    case "number":
      return z.coerce.number().int().min(min ?? 0).max(max ?? 9999).default((defaultVal as number | undefined) ?? 0);
    case "boolean":
      return z.coerce.boolean().default((defaultVal as boolean | undefined) ?? false);
    case "string": {
      let base = z.string().trim();
      if (min) base = base.min(min, `${label || field} min ${min} chars`);
      if (max) base = base.max(max, `${label || field} max ${max} chars`);
      if (pattern) base = base.regex(pattern, patternMsg || "Invalid format");
      let s: z.ZodTypeAny = base;
      if (!config.required) s = base.optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v));
      if (defaultVal !== undefined) s = s.default(defaultVal);
      return s;
    }
    case "ref":
      return z.string().min(1, `${label || field} required`);
    case "slug":
      return z.string().trim().toLowerCase().min(1).transform((v) => v.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    case "phone":
      return z.string().trim().transform((v) => v.replace(/[\s\-()]/g, "").replace(/^\+?91/, ""))
        .refine((v) => v === "" || /^[6-9]\d{9}$/.test(v), "10-digit Indian mobile (starts 6-9)")
        .transform((v) => (v === "" ? undefined : `+91${v}`)).optional();
    case "array":
      if (config.itemType === "allocation") {
        return z.array(z.object({
          duesPeriodId: z.string().optional().or(z.literal("")),
          categoryId: z.string().min(1, "Category required"),
          amountPaise: z.number().int().positive(),
          purposeNote: z.string().trim().max(200).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
        })).default([]);
      }
      return z.array(z.string());
    default:
      return z.any();
  }
}

// ============================================
// EXPORT: Explicitly typed schemas (for type inference)
// ============================================

// We define schemas explicitly so TS can infer proper types
const memberShape = {
  fullName: z.string().trim().min(1, "Full name is required").max(200, "Full name too long").refine((v) => /^[\p{L}\p{M}\s.\-'']+$/u.test(v), "Only letters, spaces, dots, hyphens, apostrophes"),
  fatherName: z.string().trim().max(150).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "10-digit Indian mobile (starts 6-9)").optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  alternatePhone: z.string().trim().regex(/^[6-9]\d{9}$/, "10-digit Indian mobile (starts 6-9)").optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  email: z.string().trim().toLowerCase().email("Valid email").optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  address: z.string().trim().max(400).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  joinDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD format").optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  notes: z.string().trim().max(1000).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  createPortalAccount: z.coerce.boolean().default(false),
  portalEmail: z.string().trim().toLowerCase().email("Valid email").optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  portalPassword: z.string().min(8, "Password min 8 chars").max(100).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  idempotencyKey: z.string().min(8, "Missing idempotency key"),
};

const planShape = {
  memberId: z.string().min(1, "Member required"),
  categoryId: z.string().min(1, "Category required"),
  frequency: z.enum([FREQUENCIES.MONTHLY, FREQUENCIES.SEMI_ANNUAL, FREQUENCIES.ANNUAL, FREQUENCIES.ONE_TIME]),
  amountPaise: z.number().int().positive("Amount must be > 0"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD format"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD format").optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  dueDay: z.coerce.number().int().min(1).max(28).default(10),
  graceDays: z.coerce.number().int().min(0).max(60).default(0),
  idempotencyKey: z.string().min(8, "Missing idempotency key"),
};

const paymentShape = {
  memberId: z.string().optional().or(z.literal("")),
  walkInName: z.string().trim().max(150).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  categoryId: z.string().min(1, "Category required"),
  collectionEventId: z.string().optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD format"),
  amountPaise: z.number().int().positive("Amount must be > 0"),
  mode: z.enum([PAYMENT_MODES.CASH, PAYMENT_MODES.UPI, PAYMENT_MODES.BANK_TRANSFER, PAYMENT_MODES.OTHER]),
  referenceNo: z.string().trim().max(120).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  verificationStatus: z.enum(["MANUAL", "VERIFIED"]).default("MANUAL"),
  notes: z.string().trim().max(1000).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  idempotencyKey: z.string().min(8, "Missing idempotency key"),
  allocations: z.array(z.object({
    duesPeriodId: z.string().optional().or(z.literal("")),
    collectionEventId: z.string().optional().or(z.literal("")),
    categoryId: z.string().min(1, "Category required"),
    amountPaise: z.number().int().positive(),
    purposeNote: z.string().trim().max(200).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  })).default([]),
};

const expenseShape = {
  categoryId: z.string().min(1, "Category required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD format"),
  payee: z.string().trim().min(1, "Payee required").max(200),
  amountPaise: z.number().int().positive("Amount must be > 0"),
  mode: z.enum([PAYMENT_MODES.CASH, PAYMENT_MODES.UPI, PAYMENT_MODES.BANK_TRANSFER, PAYMENT_MODES.OTHER]),
  referenceNo: z.string().trim().max(120).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  description: z.string().trim().max(1000).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  idempotencyKey: z.string().min(8, "Missing idempotency key"),
};

const settingsShape = {
  name: z.string().trim().min(1, "Masjid name required").max(200).refine((v) => /^[\p{L}\p{M}\s.\-'']+$/u.test(v), "Only letters, spaces, dots, hyphens, apostrophes"),
  address: z.string().trim().max(400).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  phone: z.string().trim().regex(/^(\+91)?[6-9]\d{9}$/, "Valid Indian mobile (+91XXXXXXXXXX, starts 6-9)").optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  email: z.string().trim().toLowerCase().email("Valid email").optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  receiptPrefix: z.string().trim().min(2, "Prefix min 2 chars").max(8, "Prefix max 8 chars").regex(/^[A-Z0-9]+$/, "Capital letters and digits only"),
  financialYearStartMonth: z.coerce.number().int().min(1).max(12),
  receiptFooter: z.string().trim().max(300).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  // Prayer times (stored as HH:mm 24-hour format)
  fajrTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format: HH:MM (24-hour)").optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  sunriseTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format: HH:MM (24-hour)").optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  dhuhrTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format: HH:MM (24-hour)").optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  asrTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format: HH:MM (24-hour)").optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  maghribTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format: HH:MM (24-hour)").optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  ishaTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format: HH:MM (24-hour)").optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  jummahTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format: HH:MM (24-hour)").optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
};

const categoryShape = {
  name: z.string().trim().min(1, "Category name required").max(200).refine((v) => /^[\p{L}\p{M}\s.\-'']+$/u.test(v), "Only letters, spaces, dots, hyphens, apostrophes"),
  code: z.string().trim().min(2).max(20).regex(/^[A-Z0-9_]+$/, "Capital letters, digits, underscores"),
  restrictedPurpose: z.coerce.boolean().default(false),
  reportingGroup: z.string().trim().max(60).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  description: z.string().trim().max(500).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  defaultAmountPaise: z.coerce.number().int().min(1).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : Number(v))).optional(),
  frequency: z.enum(["WEEKLY", "MONTHLY", "SEMI_ANNUAL", "ANNUAL", "YEARLY", "EVENT_BASED", "OCCASIONAL"]).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  collectionMode: z.enum(["HOUSEHOLD_WISE", "COMBINED"]).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  schedulingRules: z.string().trim().max(2000).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  defaultDueDay: z.coerce.number().int().min(1).max(28).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : Number(v))).optional(),
  defaultGraceDays: z.coerce.number().int().min(0).max(60).default(0),
};

const collectionEventShape = {
  categoryId: z.string().min(1, "Category required"),
  name: z.string().trim().min(1, "Event name required").max(200).refine((v) => /^[\p{L}\p{M}\s.\-''()0-9]+$/u.test(v), "Only letters, numbers, spaces and punctuation"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD format"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD format").optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD format"),
  expectedAmountPaise: z.coerce.number().int().min(1).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : Number(v))).optional(),
  status: z.enum(["SCHEDULED", "OPEN", "COMPLETED", "CANCELLED"]).default("SCHEDULED"),
  applicableMonth: z.coerce.number().int().min(1).max(12).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : Number(v))).optional(),
  applicableYear: z.coerce.number().int().min(2020).max(2100).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : Number(v))).optional(),
  notes: z.string().trim().max(500).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
};

const collectionEventAssignmentShape = {
  eventId: z.string().min(1, "Collection event required"),
  memberId: z.string().min(1, "Member required"),
  expectedAmountPaise: z.number().int().positive("Amount must be > 0"),
  status: z.enum(["PENDING", "PARTIAL", "PAID", "WAIVED"]).default("PENDING"),
};

const expenseCategoryShape = {
  name: z.string().trim().min(1, "Category name required").max(200).refine((v) => /^[\p{L}\p{M}\s.\-'']+$/u.test(v), "Only letters, spaces, dots, hyphens, apostrophes"),
  active: z.coerce.boolean().default(true),
};

const staffShape = {
  name: z.string().trim().min(1, "Name required").max(120).refine((v) => /^[\p{L}\p{M}\s.\-'']+$/u.test(v), "Only letters, spaces, dots, hyphens, apostrophes"),
  email: z.string().trim().toLowerCase().email("Valid email"),
  password: z.string().min(8, "Password min 8 chars").max(100).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  role: z.enum(["ADMIN", "COLLECTOR", "AUDITOR"]),
  phone: z.string().trim().transform((v) => v.replace(/[\s\-()]/g, "").replace(/^\+?91/, ""))
    .refine((v) => v === "" || /^[6-9]\d{9}$/.test(v), "10-digit Indian mobile (starts 6-9)")
    .transform((v) => (v === "" ? undefined : `+91${v}`)).optional(),
  upiId: z.string().trim().toLowerCase().refine((v) => v === "" || UPI_ID_PATTERN.test(v), "Valid UPI ID (name@upi or 9876543210@ybl)")
    .transform((v) => (v === "" ? undefined : v)).optional(),
};

const masjidShape = {
  name: z.string().trim().min(1, "Masjid name required").max(200).refine((v) => /^[\p{L}\p{M}\s.\-'']+$/u.test(v), "Only letters, spaces, dots, hyphens, apostrophes"),
  slug: z.string().trim().toLowerCase().min(1).transform((v) => v.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")),
  receiptPrefix: z.string().trim().min(2).max(8).regex(/^[A-Z0-9]+$/, "Capital letters and digits only"),
  address: z.string().trim().max(400).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  phone: z.string().trim().regex(/^(\+91)?[6-9]\d{9}$/, "Valid Indian mobile (+91XXXXXXXXXX, starts 6-9)").optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  email: z.string().trim().toLowerCase().email("Valid email").optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  financialYearStartMonth: z.coerce.number().int().min(1).max(12).default(4),
  receiptFooter: z.string().trim().max(300).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)).default("Jazak Allah Khair for your contribution."),
  status: z.enum(["ACTIVE", "SUSPENDED"]).default("ACTIVE"),
};

const allocationShape = {
  duesPeriodId: z.string().optional().or(z.literal("")),
  collectionEventId: z.string().optional().or(z.literal("")),
  categoryId: z.string().min(1, "Category required"),
  amountPaise: z.number().int().positive("Amount must be > 0"),
  purposeNote: z.string().trim().max(200).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
};

// ============================================
// EXPORT: Explicit schemas with proper types
// ============================================

export const memberSchema = z.object(memberShape);
export const planSchema = z.object(planShape);
export const paymentSchema = z.object(paymentShape);
export const expenseSchema = z.object(expenseShape);
export const settingsSchema = z.object(settingsShape);
export const categorySchema = z.object(categoryShape);
export const expenseCategorySchema = z.object(expenseCategoryShape);
export const staffSchema = z.object(staffShape);
export const masjidSchema = z.object(masjidShape);
export const allocationSchema = z.object(allocationShape);
export const collectionEventSchema = z.object(collectionEventShape);
export const collectionEventAssignmentSchema = z.object(collectionEventAssignmentShape);

export const reversalSchema = z.object({
  paymentId: z.string().min(1, "Payment required"),
  reason: z.string().trim().min(1, "Reason required").max(500),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Password min 8 chars"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Valid email required"),
  password: z.string().min(1, "Password required"),
});

// ============================================
// TYPE EXPORTS (auto from Zod)
// ============================================

export type MemberInput = z.infer<typeof memberSchema>;
export type PlanInput = z.infer<typeof planSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type ExpenseCategoryInput = z.infer<typeof expenseCategorySchema>;
export type StaffInput = z.infer<typeof staffSchema>;
export type MasjidInput = z.infer<typeof masjidSchema>;
export type AllocationInput = z.infer<typeof allocationSchema>;
export type CollectionEventInput = z.infer<typeof collectionEventSchema>;
export type CollectionEventAssignmentInput = z.infer<typeof collectionEventAssignmentSchema>;

// ============================================
// FORM FIELD METADATA (for auto-generating forms)
// ============================================

export type FieldType =
  | "text" | "email" | "password" | "tel" | "number" | "decimal"
  | "date" | "select" | "textarea" | "checkbox" | "search" | "hidden";

/** A value a form field can hold. */
export type FormValue = string | number | boolean | undefined | null;

export interface FormFieldMeta {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  dependsOn?: string;
  disabledWhen?: { field: string; value: string }[];
  /** Whether the field should be rendered as disabled. */
  disabled?: boolean;
  /** The default value for the field (used in uncontrolled mode). */
  defaultValue?: FormValue;
  helpText?: string;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  inputMode?: string;
  /** Money fields are entered in rupees; the server action converts to paise. */
  format?: "money";
  /** Free-text content that is not rendered as an input (arrays, ids). */
  synthetic?: boolean;
  /** Live keystroke filter: "letters" or "digits" */
  filter?: InputFilter;
  /** A static prefix rendered inside the input (e.g. "+91 " for a mobile number). */
  prefix?: string;
}

/** Human-readable label for a field name when nothing better is declared. */
function humanize(name: string): string {
  return name
    .replace(/Id$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

/** The declarative shape of a single field entry in `VALIDATION_RULES.entities`. */
interface FieldConfig {
  rule?: string;
  type?: string;
  ref?: string;
  itemType?: string;
  values?: readonly string[];
  default?: unknown;
  required?: boolean;
  label?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  pattern?: RegExp;
  patternMsg?: string;
  format?: "money";
  filter?: InputFilter;
  prefix?: string;
}

/** The resolved shape of a common rule, as read by the form-field builder. */
interface ResolvedRule {
  label: string;
  min?: number;
  max?: number;
  pattern?: RegExp;
  patternMsg?: string;
  filter?: InputFilter;
  prefix?: string;
}

/** The `rule` a field points at, if any. */
function ruleOf(config: FieldConfig): ResolvedRule | undefined {
  if (!config.rule) return undefined;
  return (COMMON_RULES as Record<string, ResolvedRule>)[config.rule];
}

export function getFormFields(entity: keyof typeof VALIDATION_RULES.entities): FormFieldMeta[] {
  const config = VALIDATION_RULES.entities[entity];
  const fields: FormFieldMeta[] = [];

  for (const [fieldName, fieldConfig] of Object.entries(config)) {
    const cfg = fieldConfig as unknown as FieldConfig;
    const rule = ruleOf(cfg);
    const type = cfg.type;

    let fieldType: FieldType = "text";
    let options: FormFieldMeta["options"] = undefined;

    if (type === "enum") {
      fieldType = "select";
      options = (cfg.values ?? []).map((v) => ({ value: v, label: v }));
    } else if (type === "boolean") {
      fieldType = "checkbox";
    } else if (type === "ref") {
      // A reference to another record — rendered as a select unless the page
      // supplies a richer widget (the member picker, for instance).
      fieldType = "select";
    } else if (type === "number") {
      fieldType = "number";
    } else if (type === "hidden") {
      fieldType = "hidden";
    } else if (type === "array") {
      fieldType = "hidden";
    } else if (cfg.rule === "date") {
      fieldType = "date";
    } else if (cfg.rule === "password") {
      fieldType = "password";
    } else if (cfg.rule === "phone") {
      fieldType = "tel";
    } else if (cfg.rule === "email") {
      fieldType = "email";
    } else if (cfg.rule === "notes" || cfg.rule === "address") {
      fieldType = "textarea";
    } else if (cfg.rule === "amount") {
      // Entered in rupees, converted to paise before it reaches the server.
      fieldType = "decimal";
    }

    const meta: FormFieldMeta = {
      name: fieldName,
      label: cfg.label ?? rule?.label ?? humanize(fieldName),
      type: fieldType,
      required: cfg.required ?? false,
      placeholder: cfg.placeholder,
      options,
      defaultValue: cfg.default as FormValue,
      helpText: cfg.patternMsg ?? rule?.patternMsg,
      maxLength: cfg.max ?? rule?.max,
      min: cfg.min ?? rule?.min,
      max: cfg.max ?? rule?.max,
      pattern: rule?.pattern?.source ?? cfg.pattern?.source,
      format: cfg.rule === "amount" || cfg.format === "money" ? "money" : undefined,
      inputMode: fieldType === "decimal" ? "decimal" : fieldType === "tel" ? "numeric" : undefined,
      synthetic: type === "array",
      filter: cfg.filter ?? rule?.filter,
      prefix: cfg.prefix ?? rule?.prefix,
    };

    if (entity === "payment" && fieldName === "referenceNo") {
      meta.disabledWhen = [{ field: "mode", value: "CASH" }];
    }
    if (entity === "payment" && fieldName === "verificationStatus") {
      meta.disabledWhen = [{ field: "mode", value: "CASH" }];
    }

    fields.push(meta);
  }

  return fields;
}

// ============================================
// VALIDATION HELPERS FOR SERVER ACTIONS
// ============================================

export type EntityName = keyof typeof VALIDATION_RULES.entities;

const SCHEMAS: Record<EntityName, z.ZodTypeAny> = {
  member: memberSchema,
  plan: planSchema,
  payment: paymentSchema,
  expense: expenseSchema,
  settings: settingsSchema,
  category: categorySchema,
  expenseCategory: expenseCategorySchema,
  staff: staffSchema,
  login: loginSchema,
  masjid: masjidSchema,
  allocation: allocationSchema,
  collectionEvent: collectionEventSchema,
  collectionEventAssignment: collectionEventAssignmentSchema,
};

/** The Zod schema registered for an entity. */
export function getZodSchema(entity: EntityName): z.ZodTypeAny {
  const schema = SCHEMAS[entity];
  if (!schema) throw new Error(`No schema for entity: ${entity}`);
  return schema;
}

/**
 * Validates a FormData payload against an entity's schema.
 * Unknown keys are ignored, `allocations` is JSON-parsed, and checkbox values
 * ("on") become booleans.
 */
export function validateForm(entity: EntityName, formData: FormData) {
  const schema = getZodSchema(entity);

  type FormDataValue = string | number | boolean | object | null | undefined;
  const data: Record<string, FormDataValue> = {};

  for (const [key, value] of formData.entries()) {
    if (key === "allocations") {
      try {
        data[key] = JSON.parse(value as string);
      } catch {
        data[key] = [];
      }
    } else if (value === "on") {
      data[key] = true;
    } else {
      data[key] = value;
    }
  }

  return schema.safeParse(data);
}