import { describe, expect, it } from "vitest";
import { getFormFields, getZodSchema, validateForm, loginSchema } from "@/lib/validation";

/**
 * The central validation registry (src/lib/validation-registry.ts) is the
 * single source of truth for all validation rules, Zod schemas, and form-field
 * metadata. These tests lock in that invariant so refactors can't silently
 * diverge.
 */
describe("validation-registry single source of truth", () => {
  it("exposes login entity with email and password fields", () => {
    const fields = getFormFields("login");
    const names = fields.map((f) => f.name).sort();
    expect(names).toEqual(["email", "password"]);
  });

  it("login fields have correct types from COMMON_RULES", () => {
    const fields = getFormFields("login");
    const email = fields.find((f) => f.name === "email")!;
    const password = fields.find((f) => f.name === "password")!;

    expect(email.type).toBe("email");
    expect(email.required).toBe(true);
    expect(password.type).toBe("password");
    expect(password.required).toBe(true);
  });

  it("getZodSchema returns the same schema used by validateForm", () => {
    const schema = getZodSchema("login");
    expect(schema).toBeDefined();
    expect(schema.safeParse({ email: "a@b.com", password: "secret123" }).success).toBe(true);
  });

  it("validateForm produces the same result as the schema directly", () => {
    const formData = new FormData();
    formData.append("email", "admin@masjid.local");
    formData.append("password", "password123");

    const direct = loginSchema.safeParse({ email: "admin@masjid.local", password: "password123" });
    const viaRegistry = validateForm("login", formData);

    expect(viaRegistry.success).toBe(direct.success);
    if (viaRegistry.success && direct.success) {
      expect(viaRegistry.data).toEqual(direct.data);
    }
  });

  it("rejects invalid email via registry", () => {
    const formData = new FormData();
    formData.append("email", "not-an-email");
    formData.append("password", "password123");

    const result = validateForm("login", formData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain("email");
  });

  it("rejects empty password via registry", () => {
    const formData = new FormData();
    formData.append("email", "admin@masjid.local");
    formData.append("password", "");

    const result = validateForm("login", formData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain("password");
  });

  it("member entity includes all expected fields", () => {
    const fields = getFormFields("member");
    const names = fields.map((f) => f.name).sort();
    expect(names).toEqual([
      "address",
      "alternatePhone",
      "createPortalAccount",
      "email",
      "fatherName",
      "fullName",
      "idempotencyKey",
      "joinDate",
      "notes",
      "phone",
      "portalEmail",
      "portalPassword",
      "status",
    ]);
  });

  it("expense entity marks amountPaise as money format", () => {
    const fields = getFormFields("expense");
    const amount = fields.find((f) => f.name === "amountPaise")!;
    expect(amount.type).toBe("decimal");
    expect(amount.format).toBe("money");
  });

  it("staff entity includes UPI ID with pattern", () => {
    const fields = getFormFields("staff");
    const upi = fields.find((f) => f.name === "upiId")!;
    expect(upi.type).toBe("text");
    expect(upi.pattern).toBeDefined();
    expect(upi.pattern?.length).toBeGreaterThan(0);
  });

  it("settings entity has receiptPrefix with pattern", () => {
    const fields = getFormFields("settings");
    const prefix = fields.find((f) => f.name === "receiptPrefix")!;
    expect(prefix.type).toBe("text");
    expect(prefix.pattern).toContain("A-Z0-9");
  });
});