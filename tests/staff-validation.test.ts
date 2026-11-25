import { describe, expect, it } from "vitest";
import { staffSchema, memberSchema } from "@/lib/validation";
import { isKnownUpiHandle, upiBankHandle } from "@/lib/upi";

/**
 * The staff form's validation rules are the part of the staff screen a user
 * feels first, so they are pinned here rather than only exercised by hand.
 */
describe("staff phone", () => {
  const phone = (v: string) => {
    const parsed = staffSchema.safeParse({
      name: "Ahmed Khan",
      email: "ahmed@example.com",
      password: "password123",
      role: "COLLECTOR",
      phone: v,
      upiId: "",
    });
    return parsed.success ? parsed.data.phone : undefined;
  };

  it("normalises 10 digits to the +91 form", () => {
    expect(phone("9876543210")).toBe("+919876543210");
  });

  it("accepts a spaced, prefixed number and normalises it", () => {
    expect(phone("+91 98765 43210")).toBe("+919876543210");
  });

  it("rejects a number that does not start with 6-9", () => {
    expect(phone("1234567890")).toBeUndefined();
  });

  it("rejects a short number", () => {
    expect(phone("98765")).toBeUndefined();
  });

  it("treats a blank value as no phone", () => {
    expect(phone("")).toBeUndefined();
  });
});

describe("staff name", () => {
  const name = (v: string) =>
    staffSchema.safeParse({
      name: v,
      email: "ahmed@example.com",
      password: "password123",
      role: "COLLECTOR",
      phone: "",
      upiId: "",
    }).success;

  it("accepts Latin names", () => {
    expect(name("Ahmed Khan")).toBe(true);
  });

  it("accepts Devanagari names", () => {
    expect(name("राजेश कुमार")).toBe(true);
  });

  it("accepts Arabic-script names", () => {
    expect(name("محمد احمد")).toBe(true);
  });

  it("rejects digits in a name", () => {
    expect(name("John3")).toBe(false);
  });
});

describe("staff email", () => {
  const email = (v: string) =>
    staffSchema.safeParse({
      name: "Ahmed Khan",
      email: v,
      password: "password123",
      role: "COLLECTOR",
      phone: "",
      upiId: "",
    });

  it("lowercases and trims the email", () => {
    const parsed = email("  Ahmed@Example.COM  ");
    expect(parsed.success && parsed.data.email).toBe("ahmed@example.com");
  });

  it("rejects a malformed email", () => {
    expect(email("not-an-email").success).toBe(false);
  });
});

describe("staff UPI ID", () => {
  const upi = (v: string) => {
    const parsed = staffSchema.safeParse({
      name: "Ahmed Khan",
      email: "ahmed@example.com",
      password: "password123",
      role: "COLLECTOR",
      phone: "",
      upiId: v,
    });
    return parsed.success ? parsed.data.upiId : undefined;
  };

  it("lowercases a known UPI ID", () => {
    expect(upi("Masjid@YBL")).toBe("masjid@ybl");
  });

  it("accepts a mobile handle", () => {
    expect(upi("9876543210@ybl")).toBe("9876543210@ybl");
  });

  it("rejects an ID without a bank handle", () => {
    expect(upi("nameupi")).toBeUndefined();
  });

  it("rejects a handle that is too short", () => {
    expect(upi("a@upi")).toBeUndefined();
  });

  it("treats a blank value as no UPI ID", () => {
    expect(upi("")).toBeUndefined();
  });
});

describe("UPI handle helpers", () => {
  it("recognises common bank handles", () => {
    expect(isKnownUpiHandle("ybl")).toBe(true);
    expect(isKnownUpiHandle("upi")).toBe(true);
    expect(isKnownUpiHandle("okhdfcbank")).toBe(true);
  });

  it("does not recognise an unknown handle", () => {
    expect(isKnownUpiHandle("notabank")).toBe(false);
  });

  it("extracts the bank handle", () => {
    expect(upiBankHandle("masjid@YBL")).toBe("ybl");
    expect(upiBankHandle("masjid")).toBe("");
  });
});

describe("member name", () => {
  it("accepts non-Latin names", () => {
    const parsed = memberSchema.safeParse({
      fullName: "राजेश कुमार",
      fatherName: "मोहन कुमार",
      phone: "",
      alternatePhone: "",
      address: "",
      joinDate: "2025-01-01",
      status: "ACTIVE",
      notes: "",
      createPortalAccount: false,
      portalEmail: "",
      portalPassword: "",
      idempotencyKey: "test-idempotency-key",
    });
    expect(parsed.success).toBe(true);
  });
});
