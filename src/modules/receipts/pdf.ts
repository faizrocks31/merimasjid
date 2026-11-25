import "regenerator-runtime";
import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ReceiptView } from "@/modules/receipts/view";
import { numberToWordsIndian } from "@/lib/money";

const BRAND = rgb(0.059, 0.318, 0.196);
const INK = rgb(0.078, 0.125, 0.102);
const MUTED = rgb(0.361, 0.42, 0.384);
const RULE = rgb(0.89, 0.882, 0.847);
const DANGER = rgb(0.608, 0.11, 0.11);

let cachedFont: Uint8Array | null = null;

async function loadUnicodeFont(): Promise<Uint8Array | null> {
  if (cachedFont) return cachedFont;
  try {
    const file = path.join(process.cwd(), "assets", "fonts", "NotoSans.ttf");
    cachedFont = new Uint8Array(await readFile(file));
    return cachedFont;
  } catch {
    return null;
  }
}

/**
 * Generates an A4 receipt PDF from the persisted transaction view model.
 * Uses an embedded Unicode font so the ₹ sign renders correctly.
 */
export async function renderReceiptPdf(view: ReceiptView, taxNote: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  // pdf-lib needs a registered fontkit instance to embed a custom (Unicode)
  // font. Without it, embedding NotoSans throws and every PDF download 500s.
  doc.registerFontkit(fontkit);
  doc.setTitle(`Receipt ${view.receiptNo}`);
  doc.setAuthor(view.masjid.name);
  doc.setSubject("Contribution receipt");

  const page = doc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const margin = 48;
  const right = width - margin;

  const unicode = await loadUnicodeFont();
  const font = unicode ? await doc.embedFont(unicode, { subset: true }) : await doc.embedFont(StandardFonts.Helvetica);
  const bold = unicode ? font : await doc.embedFont(StandardFonts.HelveticaBold);

  const text = (
    value: string,
    x: number,
    y: number,
    opts: { size?: number; color?: typeof INK; useBold?: boolean; align?: "left" | "right" } = {},
  ) => {
    const size = opts.size ?? 10;
    const f = opts.useBold ? bold : font;
    // Strip characters the fallback font cannot encode.
    const safe = unicode ? value : value.replace(/[₹]/g, "Rs.");
    const w = f.widthOfTextAtSize(safe, size);
    const px = opts.align === "right" ? x - w : x;
    page.drawText(safe, { x: px, y, size, font: f, color: opts.color ?? INK });
    return w;
  };

  let y = height - margin;

  // Header
  text(view.masjid.name, margin, y, { size: 17, color: BRAND, useBold: true });
  text("RECEIPT", right, y, { size: 9, color: MUTED, align: "right" });
  y -= 16;
  if (view.masjid.address) {
    text(view.masjid.address, margin, y, { size: 9, color: MUTED });
    y -= 12;
  }
  const contact = [view.masjid.phone, view.masjid.email].filter(Boolean).join("  ·  ");
  if (contact) {
    text(contact, margin, y, { size: 9, color: MUTED });
    y -= 12;
  }
  text(view.receiptNo, right, y + 24, { size: 11, useBold: true, align: "right" });

  y -= 8;
  page.drawLine({ start: { x: margin, y }, end: { x: right, y }, thickness: 2, color: BRAND });
  y -= 24;

  // Status flags
  if (view.status === "REVERSED") {
    text("CANCELLED", margin, y, { size: 11, color: DANGER, useBold: true });
    y -= 16;
  }
  if (view.isDuplicate) {
    text("DUPLICATE COPY", margin, y, { size: 11, color: rgb(0.631, 0.475, 0.122), useBold: true });
    y -= 16;
  }

  // Details: two columns
  const col2 = width / 2 + 10;
  const detail = (label: string, value: string, x: number, yy: number) => {
    text(label.toUpperCase(), x, yy, { size: 7.5, color: MUTED });
    text(value, x, yy - 13, { size: 11 });
  };

  let rowY = y;
  detail("Received from", view.donorName, margin, rowY);
  if (view.memberNo) detail("Member no.", view.memberNo, col2, rowY);
  rowY -= 36;
  detail("Payment date", view.paymentDate, margin, rowY);
  detail("Payment mode", view.mode, col2, rowY);
  rowY -= 36;
  detail("Verification", view.verification === "VERIFIED" ? "Verified" : "Manually recorded", margin, rowY);
  detail("Collector", view.collector, col2, rowY);
  rowY -= 36;
  if (view.referenceNo) {
    detail("Reference", view.referenceNo, margin, rowY);
    rowY -= 36;
  }

  // Amount box
  y = rowY - 4;
  page.drawRectangle({ x: margin, y: y - 58, width: right - margin, height: 58, color: rgb(0.969, 0.965, 0.945), borderColor: RULE, borderWidth: 1 });
  text("AMOUNT PAID", margin + 12, y - 18, { size: 8, color: MUTED });
  text(view.amountText, right - 12, y - 20, { size: 20, color: BRAND, useBold: true, align: "right" });
  const words = view.amountWords;
  text(words.length > 95 ? `${words.slice(0, 92)}…` : words, margin + 12, y - 44, { size: 8, color: MUTED });
  y -= 78;

  // Purposes
  text("PURPOSE", margin, y, { size: 8, color: MUTED });
  y -= 16;
  for (const p of view.purposes) {
    page.drawLine({ start: { x: margin, y: y + 10 }, end: { x: right, y: y + 10 }, thickness: 0.5, color: RULE });
    text(p.name, margin, y, { size: 10 });
    text(p.amountText, right, y, { size: 10, align: "right" });
    y -= 18;
  }
  page.drawLine({ start: { x: margin, y: y + 10 }, end: { x: right, y: y + 10 }, thickness: 0.5, color: RULE });
  y -= 10;

  if (view.notes) {
    text("NOTES", margin, y, { size: 8, color: MUTED });
    y -= 13;
    const safeNote = view.notes.length > 160 ? `${view.notes.slice(0, 157)}…` : view.notes;
    text(safeNote.replace(/\n/g, " "), margin, y, { size: 9, color: INK });
    y -= 18;
  }

  if (view.reversalReason) {
    y -= 6;
    text(`Reversed: ${view.reversalReason}`, margin, y, { size: 9, color: DANGER });
    y -= 16;
  }

  // Footer
  const footerY = margin + 62;
  page.drawLine({ start: { x: margin, y: footerY + 26 }, end: { x: right, y: footerY + 26 }, thickness: 0.5, color: RULE });
  text(view.footer, margin, footerY + 8, { size: 9 });
  text(taxNote.length > 120 ? `${taxNote.slice(0, 117)}…` : taxNote, margin, footerY - 6, { size: 7.5, color: MUTED });
  text(`Generated ${view.createdAt} (Asia/Kolkata)`, margin, footerY - 20, { size: 7.5, color: MUTED });
  text("Authorised signature", right, footerY - 20, { size: 8, color: MUTED, align: "right" });

  return doc.save();
}

export { numberToWordsIndian };
