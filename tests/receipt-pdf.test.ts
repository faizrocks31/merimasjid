import { describe, expect, it } from "vitest";
import { renderReceiptPdf } from "@/modules/receipts/pdf";
import { buildReceiptView } from "@/modules/receipts/view";
import { parseISODate } from "@/lib/dates";
import { extractPdfText } from "./helpers/pdf-text";

/**
 * The receipt PDF is the document a donor physically keeps, so these tests
 * assert what a reader sees rather than that a byte stream was produced. They
 * would have caught the missing fontkit registration, where embedding the
 * Unicode font threw and every download returned 500.
 */
function payment(overrides: Record<string, unknown> = {}) {
  const paymentDate = parseISODate("2026-10-19");
  if (!paymentDate) throw new Error("test fixture date failed to parse");
  return {
    receiptNo: "MSA-2026-27-000007",
    status: "SUCCESS",
    donorNameSnapshot: "Abdul Rahman",
    paymentDate,
    createdAt: new Date("2026-10-19T10:05:00+05:30"),
    amountPaise: 125050,
    mode: "UPI",
    referenceNo: "UPI-REF-9931",
    verificationStatus: "MANUAL",
    notes: "Ramzan collection",
    donorMember: { memberNo: "MAS-000042", fullName: "Abdul Rahman" },
    enteredByUser: { name: "Masjid Admin" },
    allocations: [
      { allocatedAmountPaise: 100000, collectionDefinition: { name: "Monthly Chanda" } },
      { allocatedAmountPaise: 25050, collectionDefinition: { name: "Construction Fund" } },
    ],
    masjid: {
      name: "Jama Masjid",
      address: "12 Market Road, Pune",
      phone: "9000000000",
      email: "office@jamamasjid.test",
      receiptFooter: "Jazak Allah Khair for your contribution.",
    },
    reversalFor: null,
    ...overrides,
  };
}

const opts = { duplicate: false, footerText: "Thank you", taxNote: "System generated" };

describe("receipt PDF", () => {
  it("renders the receipt number, donor and amount", async () => {
    const view = buildReceiptView(payment(), opts);
    const text = extractPdfText(Buffer.from(await renderReceiptPdf(view, "System generated")));

    expect(text).toContain("MSA-2026-27-000007");
    expect(text).toContain("Abdul Rahman");
    expect(text).toContain("MAS-000042");
    expect(text).toContain("19-10-2026");
    expect(text).toContain("Jama Masjid");
  });

  it("renders the rupee sign rather than a fallback", async () => {
    const view = buildReceiptView(payment(), opts);
    const text = extractPdfText(Buffer.from(await renderReceiptPdf(view, "System generated")));
    expect(text).toContain("₹");
    expect(text).not.toContain("Rs.");
  });

  it("lists every allocation separately so purposes reconcile", async () => {
    const view = buildReceiptView(payment(), opts);
    const text = extractPdfText(Buffer.from(await renderReceiptPdf(view, "System generated")))
      .split("\n");
    expect(text).toContain("Monthly Chanda");
    expect(text).toContain("Construction Fund");
    expect(text.filter((l) => l.includes("₹"))).toHaveLength(3); // amount box + two purposes
  });

  it("marks a reprint as DUPLICATE COPY and keeps the original number", async () => {
    const view = buildReceiptView(payment(), { ...opts, duplicate: true });
    const text = extractPdfText(Buffer.from(await renderReceiptPdf(view, "System generated")));
    expect(text).toContain("DUPLICATE COPY");
    expect(text).toContain("MSA-2026-27-000007");
  });

  it("does not mark an original as a duplicate", async () => {
    const view = buildReceiptView(payment(), opts);
    const text = extractPdfText(Buffer.from(await renderReceiptPdf(view, "System generated")));
    expect(text).not.toContain("DUPLICATE COPY");
  });

  it("shows CANCELLED and the reason on a reversed payment", async () => {
    const view = buildReceiptView(
      payment({ status: "REVERSED", reversalFor: { reason: "Duplicate entry" } }),
      opts,
    );
    const text = extractPdfText(Buffer.from(await renderReceiptPdf(view, "System generated")));
    expect(text).toContain("CANCELLED");
    expect(text).toContain("Duplicate entry");
  });

  it("states that a UPI payment was manually recorded, never verified", async () => {
    const view = buildReceiptView(payment(), opts);
    const text = extractPdfText(Buffer.from(await renderReceiptPdf(view, "System generated")));
    expect(text).toContain("Manually recorded");
    expect(text).not.toContain("Verified");
  });
});
