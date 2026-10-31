/**
 * Portable Validation Registry Template
 *
 * Drop this into any Next.js (App Router) + Zod v4 project.
 * Adjust COMMON_RULES and VALIDATION_RULES.entities for your domain.
 *
 * Usage:
 *   import { getFormFields, getZodSchema, validateForm } from "@/lib/validation-registry";
 *
 *   // In a client component:
 *   const fields = getFormFields("user");
 *   <SimpleForm fields={fields} values={} uncontrolled />
 *
 *   // In a server action:
 *   const result = validateForm("user", formData);
 */

import { z } from "zod";

// ============================================
// COMMON RULES (reusable building blocks)
// ============================================

export interface StringRule {
  label: string;
  min?: number;
  max?: number;
  pattern?: RegExp;
  patternMsg?: string;
}

export interface NumberRule {
  label: string;
  min: number;
  max?: number;
}

/**
 * Which characters a field accepts at the keystroke level. This mirrors the
 * rule's regex so the browser never lets an invalid character into the form.
 */
export type InputFilter = "letters" | "digits";

export type CommonRule = StringRule | NumberRule;

export const COMMON_RULES = {
  name: { label: "Name", min: 1, max: 100, pattern: /^[\p{L}\p{M}\s.\-'']+$/u, patternMsg: "Letters, spaces, dots, hyphens, apostrophes only", filter: "letters" as InputFilter },
  email: { label: "Email", pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, patternMsg: "Valid email required" },
  phone: { label: "Mobile", pattern: /^\+?\d{10,15}$/, patternMsg: "Valid phone number (10-15 digits)", filter: "digits" as InputFilter },
  address: { label: "Address", max: 300 },
  notes: { label: "Notes", max: 1000 },
  password: { label: "Password", min: 8, max: 100 },
  url: { label: "URL", pattern: /^https?:\/\/.+/, patternMsg: "Valid URL (http/https)" },
  slug: { label: "Slug", pattern: /^[a-z0-9-]+$/, patternMsg: "Lowercase, numbers, hyphens only" },
} as const;

// ============================================
// ENTITY DEFINITIONS (single source of truth)
// ============================================

export interface FieldConfig {
  rule?: keyof typeof COMMON_RULES;
  type?: "enum" | "number" | "boolean" | "string" | "ref" | "slug" | "array";
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
  format?: "money" | "date";
  filter?: InputFilter;
}

export const VALIDATION_RULES = {
  common: COMMON_RULES,

  entities: {
    // Example: User entity — replace with your own
    user: {
      email: { rule: "email", required: true },
      name: { rule: "name", required: true },
      password: { rule: "password", required: true, min: 1 }, // login: only require presence
      role: { type: "enum", values: ["ADMIN", "MEMBER", "VIEWER"], required: true, default: "MEMBER" },
      phone: { rule: "phone", required: false },
      bio: { rule: "notes", required: false },
      isActive: { type: "boolean", default: true },
    },

    // Example: Product entity
    product: {
      name: { rule: "name", required: true },
      slug: { type: "slug", required: true },
      description: { rule: "notes", required: false },
      priceCents: { type: "number", min: 0, required: true, format: "money" },
      categoryId: { type: "ref", ref: "category", required: true, label: "Category" },
      isPublished: { type: "boolean", default: false },
    },

    // Example: Category entity
    category: {
      name: { rule: "name", required: true },
      code: { type: "string", required: true, min: 2, max: 20, pattern: /^[A-Z0-9_]+$/, patternMsg: "Uppercase, numbers, underscores" },
      parentId: { type: "ref", ref: "category", required: false, label: "Parent Category" },
    },

    // Example: Login entity (minimal)
    login: {
      email: { rule: "email", required: true },
      password: { rule: "password", required: true, min: 1 },
      rememberMe: { type: "boolean", default: false },
    },
  },
} as const;

// ============================================
// ZOD SCHEMA GENERATOR (internal helper)
// ============================================

function getCommonRule(name: keyof typeof COMMON_RULES): z.ZodTypeAny {
  const r = COMMON_RULES[name];
  let schema: z.ZodTypeAny;

  switch (name) {
    case "name": {
      const rule = r as StringRule & { pattern: RegExp; patternMsg: string; min: number; max: number };
      schema = z.string().trim().min(rule.min, `${rule.label} is required`).max(rule.max, `${rule.label} too long`)
        .refine((v) => rule.pattern.test(v), rule.patternMsg);
      break;
    }
    case "phone":
    case "email":
    case "url": {
      const rule = r as StringRule & { pattern: RegExp; patternMsg: string };
      schema = z.string().trim().regex(rule.pattern, rule.patternMsg).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v));
      break;
    }
    case "address":
    case "notes": {
      const rule = r as StringRule & { max: number };
      schema = z.string().trim().max(rule.max).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v));
      break;
    }
    case "password": {
      const rule = r as StringRule & { min: number; max: number };
      schema = z.string().min(rule.min, `${rule.label} min ${rule.min} chars`).max(rule.max).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v));
      break;
    }
    case "slug": {
      const rule = r as StringRule & { pattern: RegExp; patternMsg: string };
      schema = z.string().trim().toLowerCase().min(1).regex(rule.pattern, rule.patternMsg)
        .transform((v) => v.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
      break;
    }
    default:
      schema = z.string();
  }
  return schema;
}

function buildFieldSchema(_entity: string, field: string, config: FieldConfig): z.ZodTypeAny {
  if (config.rule && COMMON_RULES[config.rule]) {
    let schema = getCommonRule(config.rule);
    if (!config.required) schema = schema.optional();
    if (config.default !== undefined) schema = schema.default(config.default);
    return schema;
  }

  const type = config.type;
  const values = config.values as readonly string[] | undefined;
  const min = config.min;
  const max = config.max;
  const pattern = config.pattern;
  const patternMsg = config.patternMsg;
  const label = config.label;
  const defaultVal = config.default;

  switch (type) {
    case "enum": {
      const opts = (values ?? []) as [string, ...string[]];
      return z.enum(opts).default((defaultVal as string | undefined) ?? opts[0]);
    }
    case "number":
      return z.coerce.number().int().min(min ?? 0).max(max ?? 999999).default((defaultVal as number | undefined) ?? 0);
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
    case "array":
      return z.array(z.string());
    default:
      return z.any();
  }
}

// ============================================
// EXPLICIT SCHEMAS (for type inference)
// ============================================

// Define shapes matching VALIDATION_RULES.entities above
// Add your own entities here — keep in sync with VALIDATION_RULES!

const userShape = {
  email: z.string().trim().toLowerCase().email("Valid email required"),
  name: z.string().trim().min(1, "Name is required").max(100).refine((v) => /^[\p{L}\p{M}\s.\-'']+$/u.test(v), "Letters only"),
  password: z.string().min(1, "Password required").max(100).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]).default("MEMBER"),
  phone: z.string().trim().regex(/^\+?\d{10,15}$/, "Valid phone").optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  bio: z.string().trim().max(1000).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  isActive: z.coerce.boolean().default(true),
};

const productShape = {
  name: z.string().trim().min(1, "Name required").max(100),
  slug: z.string().trim().toLowerCase().min(1).regex(/^[a-z0-9-]+$/, "Lowercase, numbers, hyphens").transform((v) => v.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")),
  description: z.string().trim().max(1000).optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  priceCents: z.number().int().min(0, "Price must be >= 0"),
  categoryId: z.string().min(1, "Category required"),
  isPublished: z.coerce.boolean().default(false),
};

const categoryShape = {
  name: z.string().trim().min(1, "Name required").max(100),
  code: z.string().trim().min(2).max(20).regex(/^[A-Z0-9_]+$/, "Uppercase, numbers, underscores"),
  parentId: z.string().optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
};

const loginShape = {
  email: z.string().trim().toLowerCase().email("Valid email required"),
  password: z.string().min(1, "Password required"),
  rememberMe: z.coerce.boolean().default(false),
};

export const userSchema = z.object(userShape);
export const productSchema = z.object(productShape);
export const categorySchema = z.object(categoryShape);
export const loginSchema = z.object(loginShape);

// ============================================
// TYPE EXPORTS (auto from Zod)
// ============================================

export type UserInput = z.infer<typeof userSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type LoginInput = z.infer<typeof loginSchema>;

// ============================================
// FORM FIELD METADATA (for auto-generating forms)
// ============================================

export type FieldType =
  | "text" | "email" | "password" | "tel" | "number"
  | "date" | "select" | "textarea" | "checkbox" | "hidden" | "url";

export interface FormFieldMeta {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  dependsOn?: string;
  disabledWhen?: { field: string; value: string }[];
  defaultValue?: FormValue;
  helpText?: string;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  inputMode?: string;
  format?: "money" | "date";
  synthetic?: boolean;
  /** Live keystroke filter: "letters" or "digits" */
  filter?: InputFilter;
  /** A static prefix rendered inside the input (e.g. "+91 " for a mobile number). */
  prefix?: string;
}

export type FormValue = string | number | boolean | undefined | null;

function humanize(name: string): string {
  return name
    .replace(/Id$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

interface ResolvedRule {
  label: string;
  min?: number;
  max?: number;
  pattern?: RegExp;
  patternMsg?: string;
  filter?: InputFilter;
}

function ruleOf(config: FieldConfig): ResolvedRule | undefined {
  if (!config.rule) return undefined;
  return COMMON_RULES[config.rule] as ResolvedRule;
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
      fieldType = "select";
    } else if (type === "number") {
      fieldType = "number";
    } else if (type === "hidden") {
      fieldType = "hidden";
    } else if (type === "array") {
      fieldType = "hidden";
    } else if (cfg.rule === "date" || cfg.format === "date") {
      fieldType = "date";
    } else if (cfg.rule === "password") {
      fieldType = "password";
    } else if (cfg.rule === "phone") {
      fieldType = "tel";
    } else if (cfg.rule === "email") {
      fieldType = "email";
    } else if (cfg.rule === "notes" || cfg.rule === "address") {
      fieldType = "textarea";
    } else if (cfg.rule === "url") {
      fieldType = "url";
    } else if (cfg.format === "money") {
      fieldType = "number";
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
      format: cfg.format,
      inputMode: fieldType === "number" && cfg.format === "money" ? "decimal" : fieldType === "tel" ? "numeric" : undefined,
      synthetic: type === "array",
      filter: cfg.filter ?? rule?.filter,
    };

    fields.push(meta);
  }

  return fields;
}

// ============================================
// VALIDATION HELPERS FOR SERVER ACTIONS
// ============================================

export type EntityName = keyof typeof VALIDATION_RULES.entities;

const SCHEMAS: Record<EntityName, z.ZodTypeAny> = {
  user: userSchema,
  product: productSchema,
  category: categorySchema,
  login: loginSchema,
  // Add more as you define explicit schemas above
};

/** Get the Zod schema registered for an entity. */
export function getZodSchema(entity: EntityName): z.ZodTypeAny {
  const schema = SCHEMAS[entity];
  if (!schema) throw new Error(`No schema for entity: ${entity}`);
  return schema;
}

/**
 * Validates a FormData payload against an entity's schema.
 * Unknown keys are ignored. Checkbox values ("on") become booleans.
 */
export function validateForm(entity: EntityName, formData: FormData) {
  const schema = getZodSchema(entity);

  type FormDataValue = string | number | boolean | object | null | undefined;
  const data: Record<string, FormDataValue> = {};

  for (const [key, value] of formData.entries()) {
    if (value === "on") {
      data[key] = true;
    } else {
      data[key] = value;
    }
  }

  return schema.safeParse(data);
}

// ============================================
// LIVE INPUT FILTERING (keeps invalid characters out)
// ============================================

/**
 * Strips characters the field does not accept, so the browser never lets an
 * invalid character into the form in the first place.
 */
export function filterInputValue(value: string, filter?: InputFilter): string {
  if (!filter) return value;
  if (filter === "digits") return value.replace(/[^\d]/g, "");
  // "letters" — keep letters, marks (accents), spaces and name punctuation
  return value.replace(/[^\p{L}\p{M}\s.\-'']/gu, "");
}