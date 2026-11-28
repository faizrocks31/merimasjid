import { PDFDocument, rgb, StandardFonts, PageSizes, type PDFPage, type PDFFont } from "pdf-lib";
import type { ReceiptView } from "@/modules/receipts/view";
import { NOTO_SANS_DEVANAGARI_REGULAR_BASE64, NOTO_SANS_DEVANAGARI_BOLD_BASE64 } from "@/lib/font-data";

// Register fontkit for custom font embedding - use lazy registration to avoid build-time issues
let fontkitRegistered = false;
async function ensureFontkitRegistered(): Promise<void> {
  if (!fontkitRegistered) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fontkit = await import("@pdf-lib/fontkit").then(m => m.default || m);
      PDFDocument.registerFontkit(fontkit);
      fontkitRegistered = true;
    } catch (e) {
      console.warn("Fontkit registration failed:", e);
    }
  }
}

const A5_WIDTH = PageSizes.A5[0]; // 419.528 pt (148mm)
const A5_HEIGHT = PageSizes.A5[1]; // 595.276 pt (210mm)
const MARGIN = 42.52; // 15mm in points
const INNER_MARGIN = 34.02; // 12mm in points

// Colors matching the original design
const COLORS = {
  brandPrimary: rgb(0.043, 0.365, 0.231),    // #0b5d3b
  brandHero: rgb(0.043, 0.239, 0.165),       // #0b3d2a
  brandSoft: rgb(0.902, 0.937, 0.914),       // #e6efe9
  goldAccent: rgb(0.788, 0.635, 0.153),      // #c9a227
  goldText: rgb(0.416, 0.353, 0.063),        // #6a5a10
  receiptCream: rgb(0.984, 0.973, 0.933),    // #fbf8ee
  surfaceCard: rgb(1, 1, 1),                 // #ffffff
  inkPrimary: rgb(0.075, 0.149, 0.110),      // #13261c
  inkMuted: rgb(0.361, 0.420, 0.384),        // #5c6b62
  borderTile: rgb(0.882, 0.910, 0.875),      // #e1e8df
  borderSubtle: rgb(0.890, 0.882, 0.847),    // #e3e1d8
  white: rgb(1, 1, 1),
  black: rgb(0, 0, 0),
  watermark: rgb(0.89, 0.953, 0.918, 0.08), // watermark opacity
  statusWatermark: rgb(0, 0, 0, 0.045),     // status watermark opacity
};

function escapeHtml(str: string): string {
  const QUOTE_ENTITY = "&#34;";
  const APOS_ENTITY = "&#039;";
  return str
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, QUOTE_ENTITY)
    .replace(/'/g, APOS_ENTITY);
}

function drawRoundedRect(page: PDFPage, x: number, y: number, width: number, height: number, radius: number, borderColor: any, borderWidth: number, fillColor?: any) {
  // Draw rounded rectangle using lines (supported by pdf-lib PDFPage)
  // Top edge
  page.drawLine({
    start: { x: x + radius, y: y },
    end: { x: x + width - radius, y: y },
    thickness: borderWidth,
    color: borderColor,
  });
  // Top-right corner (approximate with 2 lines)
  page.drawLine({
    start: { x: x + width - radius, y: y },
    end: { x: x + width, y: y + radius },
    thickness: borderWidth,
    color: borderColor,
  });
  // Right edge
  page.drawLine({
    start: { x: x + width, y: y + radius },
    end: { x: x + width, y: y + height - radius },
    thickness: borderWidth,
    color: borderColor,
  });
  // Bottom-right corner
  page.drawLine({
    start: { x: x + width - radius, y: y + height },
    end: { x: x + width, y: y + height - radius },
    thickness: borderWidth,
    color: borderColor,
  });
  // Bottom edge
  page.drawLine({
    start: { x: x + radius, y: y + height },
    end: { x: x + width - radius, y: y + height },
    thickness: borderWidth,
    color: borderColor,
  });
  // Bottom-left corner
  page.drawLine({
    start: { x: x, y: y + height - radius },
    end: { x: x + radius, y: y + height },
    thickness: borderWidth,
    color: borderColor,
  });
  // Left edge
  page.drawLine({
    start: { x: x, y: y + radius },
    end: { x: x, y: y + height - radius },
    thickness: borderWidth,
    color: borderColor,
  });
  // Top-left corner
  page.drawLine({
    start: { x: x, y: y + radius },
    end: { x: x + radius, y: y },
    thickness: borderWidth,
    color: borderColor,
  });
  // Top edge
  page.drawLine({
    start: { x: x + radius, y: y },
    end: { x: x + width - radius, y: y },
    thickness: borderWidth,
    color: borderColor,
  });
  // Note: fillColor is not supported with this line-based approach
}

function drawText(page: PDFPage, text: string, x: number, y: number, font: PDFFont, size: number, color: any, options?: { maxWidth?: number; lineHeight?: number }) {
  if (!text) return;
  const lines = options?.maxWidth ? font.widthOfTextAtSize(text, size) > options.maxWidth
    ? wrapText(text, font, size, options.maxWidth)
    : [text]
    : [text];

  const lineHeight = options?.lineHeight || size * 1.4;
  lines.forEach((line, i) => {
    page.drawText(line, { x, y: y - i * lineHeight, size, font, color });
  });
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? currentLine + ' ' + word : word;
    const width = font.widthOfTextAtSize(testLine, size);
    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export async function renderReceiptPdfLib(view: ReceiptView, taxNote: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A5_WIDTH, A5_HEIGHT]);

  // Register fontkit before embedding custom fonts
  await ensureFontkitRegistered();

  // Load and embed Noto Sans Devanagari fonts for Hindi/Devanagari support
  // Using base64-encoded font data for Vercel compatibility
  const notoRegularBytes = Uint8Array.from(atob(NOTO_SANS_DEVANAGARI_REGULAR_BASE64), c => c.charCodeAt(0));
  const notoBoldBytes = Uint8Array.from(atob(NOTO_SANS_DEVANAGARI_BOLD_BASE64), c => c.charCodeAt(0));

  const notoRegular = await pdfDoc.embedFont(notoRegularBytes);
  const notoBold = await pdfDoc.embedFont(notoBoldBytes);

  // Also keep Helvetica for English text
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Background
  page.drawRectangle({
    x: 0,
    y: 0,
    width: A5_WIDTH,
    height: A5_HEIGHT,
    color: COLORS.receiptCream,
  });

  // Watermark (mosque icon) - draw a simple geometric pattern
  drawWatermark(page);

  // Status watermark (cancelled/duplicate)
  if (view.isDuplicate || view.status === "REVERSED") {
    drawStatusWatermark(page, view.status === "REVERSED" ? "रद्द" : "नकल", notoBold);
  }

  // Double border
  drawDoubleBorder(page);

  // Header band
  const headerBandHeight = 140;
  drawHeaderBand(page, view, headerBandHeight, notoBold, notoRegular);

  // Ribbon
  const ribbonY = A5_HEIGHT - MARGIN - headerBandHeight - 30;
  drawRibbon(page, ribbonY, notoBold);

  // Fields section
  let currentY = ribbonY - 40;
  currentY = drawFields(page, view, currentY, notoRegular, notoBold);

  // Amount and receiver section
  currentY = drawAmountReceiver(page, view, currentY, notoRegular, notoBold);

  // Footer band
  drawFooterBand(page, view, notoRegular);

  const pdfBytes = await pdfDoc.save();
  return new Uint8Array(pdfBytes);
}

function drawWatermark(page: PDFPage) {
  // Draw a simple mosque-like geometric pattern as watermark
  const centerX = A5_WIDTH / 2;
  const centerY = A5_HEIGHT / 2;
  const size = 120;

  // Draw a star-like pattern using drawLine (supported by pdf-lib PDFPage)
  // Using lines instead of SVG path to avoid drawSvgPath issues
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI / 4) - Math.PI / 2;
    const x = centerX + Math.cos(angle) * size;
    const y = centerY + Math.sin(angle) * size;
    const x2 = centerX + Math.cos(angle + Math.PI / 8) * (size * 0.5);
    const y2 = centerY + Math.sin(angle + Math.PI / 8) * (size * 0.5);

    // Draw triangle using lines (3 lines per triangle)
    page.drawLine({
      start: { x: centerX, y: centerY },
      end: { x: x, y: y },
      thickness: 1,
      color: COLORS.watermark,
      opacity: 0.08,
    });
    page.drawLine({
      start: { x: x, y: y },
      end: { x: x2, y: y2 },
      thickness: 1,
      color: COLORS.watermark,
      opacity: 0.08,
    });
    page.drawLine({
      start: { x: x2, y: y2 },
      end: { x: centerX, y: centerY },
      thickness: 1,
      color: COLORS.watermark,
      opacity: 0.08,
    });
  }
}

function drawStatusWatermark(page: PDFPage, text: string, boldFont: PDFFont) {
  page.translate(A5_WIDTH / 2, A5_HEIGHT / 2);
  page.rotate(-18 * Math.PI / 180);
  page.drawText(text, {
    x: -100,
    y: 0,
    size: 48,
    font: boldFont,
    color: COLORS.statusWatermark,
  });
}

function drawDoubleBorder(page: PDFPage) {
  // Outer border
  drawRoundedRect(page, MARGIN, MARGIN, A5_WIDTH - 2 * MARGIN, A5_HEIGHT - 2 * MARGIN, 24, COLORS.brandPrimary, 2);
  // Inner border
  drawRoundedRect(page, MARGIN + 3, MARGIN + 3, A5_WIDTH - 2 * MARGIN - 6, A5_HEIGHT - 2 * MARGIN - 6, 22, COLORS.goldAccent, 1);
}

function drawHeaderBand(page: PDFPage, view: ReceiptView, height: number, boldFont: PDFFont, regularFont: PDFFont) {
  const bandY = A5_HEIGHT - MARGIN - height;
  const bandWidth = A5_WIDTH - 2 * MARGIN;

  // Header background
  page.drawRectangle({
    x: MARGIN,
    y: bandY,
    width: bandWidth,
    height: height,
    color: COLORS.brandHero,
    borderRadius: 22,
  });

  // Bottom border of header
  page.drawLine({
    start: { x: MARGIN, y: bandY },
    end: { x: MARGIN + bandWidth, y: bandY },
    thickness: 2,
    color: COLORS.brandPrimary,
  });

  // Masjid name
  page.drawText(view.masjid.name, {
    x: MARGIN + bandWidth / 2 - boldFont.widthOfTextAtSize(view.masjid.name, 38) / 2,
    y: bandY + height - 50,
    size: 38,
    font: boldFont,
    color: COLORS.white,
  });

  // Meta (address | phone)
  if (view.masjid.address || view.masjid.phone) {
    const meta = `${view.masjid.address || ""}${view.masjid.address && view.masjid.phone ? "  |  " : ""}${view.masjid.phone || ""}`;
    page.drawText(meta, {
      x: MARGIN + bandWidth / 2 - regularFont.widthOfTextAtSize(meta, 12) / 2,
      y: bandY + height - 75,
      size: 12,
      font: regularFont,
      color: COLORS.goldAccent,
    });
  }

  // Receipt info (number and date)
  const receiptInfoY = bandY + height - 100;
  const leftX = MARGIN + 24;
  const rightX = MARGIN + bandWidth - 24;

  // Receipt No
  page.drawText("रसीद संख्या", {
    x: leftX,
    y: receiptInfoY,
    size: 12,
    font: boldFont,
    color: COLORS.goldAccent,
  });
  page.drawText(view.receiptNo, {
    x: leftX,
    y: receiptInfoY - 20,
    size: 16,
    font: regularFont,
    color: COLORS.white,
  });

  // Date
  const dateLabel = "दिनांक";
  const dateWidth = regularFont.widthOfTextAtSize(dateLabel, 12);
  page.drawText(dateLabel, {
    x: rightX - dateWidth,
    y: receiptInfoY,
    size: 12,
    font: boldFont,
    color: COLORS.goldAccent,
  });
  const dateValue = view.paymentDate;
  const dateValueWidth = regularFont.widthOfTextAtSize(dateValue, 16);
  page.drawText(dateValue, {
    x: rightX - dateValueWidth,
    y: receiptInfoY - 20,
    size: 16,
    font: regularFont,
    color: COLORS.white,
  });
}

function drawRibbon(page: PDFPage, y: number, boldFont: PDFFont) {
  const text = "रसीद";
  const textWidth = boldFont.widthOfTextAtSize(text, 19);
  const padding = 32;
  const ribbonWidth = textWidth + 2 * padding;
  const ribbonHeight = 35;
  const ribbonX = (A5_WIDTH - ribbonWidth) / 2;

  // Ribbon background
  page.drawRectangle({
    x: ribbonX,
    y: y,
    width: ribbonWidth,
    height: ribbonHeight,
    color: COLORS.goldAccent,
    borderRadius: 9999,
  });

  page.drawText(text, {
    x: ribbonX + padding,
    y: y + 8,
    size: 19,
    font: boldFont,
    color: COLORS.black,
  });
}

function drawFields(page: PDFPage, view: ReceiptView, startY: number, regularFont: PDFFont, boldFont: PDFFont): number {
  let y = startY;
  const leftX = MARGIN + 24;
  const rightX = A5_WIDTH - MARGIN - 24;
  const fieldWidth = rightX - leftX;

  // Donor name
  y = drawFieldRow(page, "मोहतरम जनाब", view.donorName || "—", leftX, y, fieldWidth, regularFont, boldFont);
  y -= 16;

  // Amount in words
  y = drawFieldRow(page, "रुपये शब्दों में", view.amountWords || "—", leftX, y, fieldWidth, regularFont, regularFont);
  y -= 16;

  // Category and Payment mode row
  const categoryLabel = "आवंटन श्रेणी";
  const modeLabel = "भुगतान का तरीका";
  const labelWidth = Math.max(
    boldFont.widthOfTextAtSize(categoryLabel, 15),
    boldFont.widthOfTextAtSize(modeLabel, 15)
  ) + 12;

  const categoryValue = view.purposes.map(p => p.name).join(", ") || "—";
  const modeMap: Record<string, string> = {
    CASH: "कैश",
    UPI: "यूपीआई",
    BANK_TRANSFER: "बैंक ट्रांसफर",
    OTHER: "अन्य",
  };
  const modeValue = modeMap[view.mode] || view.mode;

  // Category
  page.drawText(categoryLabel, { x: leftX, y, size: 15, font: boldFont, color: COLORS.brandPrimary });
  page.drawText(categoryValue, { x: leftX + labelWidth, y, size: 14, font: boldFont, color: COLORS.inkPrimary });

  // Mode (right side)
  const modeX = leftX + fieldWidth / 2 + 24;
  page.drawText(modeLabel, { x: modeX, y, size: 15, font: boldFont, color: COLORS.brandPrimary });

  // Payment mode checkboxes
  const modes = ["कैश", "यूपीआई", "बैंक ट्रांसफर", "अन्य"];
  let modeItemX = modeX + boldFont.widthOfTextAtSize(modeLabel + "  ", 15);
  modes.forEach(m => {
    const isSelected = m === modeValue;
    // Checkbox
    page.drawRectangle({
      x: modeItemX,
      y: y - 2,
      width: 14,
      height: 14,
      borderColor: COLORS.brandPrimary,
      borderWidth: 1.5,
    });
    if (isSelected) {
      page.drawLine({
        start: { x: modeItemX + 3, y: y + 5 },
        end: { x: modeItemX + 7, y: y + 9 },
        thickness: 2,
        color: COLORS.brandPrimary,
      });
      page.drawLine({
        start: { x: modeItemX + 7, y: y + 9 },
        end: { x: modeItemX + 11, y: y + 3 },
        thickness: 2,
        color: COLORS.brandPrimary,
      });
    }
    // Label
    page.drawText(m, { x: modeItemX + 18, y, size: 12, font: regularFont, color: COLORS.inkPrimary });
    modeItemX += regularFont.widthOfTextAtSize(m, 12) + 30;
  });

  return y - 40;
}

function drawFieldRow(page: PDFPage, label: string, value: string, x: number, y: number, width: number, labelFont: PDFFont, valueFont: PDFFont): number {
  const font = labelFont;
  page.drawText(label, { x, y, size: 15, font, color: COLORS.brandPrimary });

  // Value line
  const lineY = y - 4;
  page.drawLine({
    start: { x: x + 180, y: lineY },
    end: { x: x + width, y: lineY },
    thickness: 2,
    color: COLORS.brandPrimary,
    dashArray: [4, 4],
  });

  page.drawText(value, { x: x + 180, y: y - 2, size: 14, font: valueFont, color: COLORS.inkPrimary });
  return y - 28;
}

function drawAmountReceiver(page: PDFPage, view: ReceiptView, startY: number, regularFont: PDFFont, boldFont: PDFFont): number {
  let y = startY;
  const leftX = MARGIN + 24;
  const rightX = A5_WIDTH - MARGIN - 24;
  const boxWidth = (rightX - leftX) / 2 - 12;

  // Amount box (left)
  const amountBoxX = leftX;
  const amountBoxY = y - 90;
  const amountBoxHeight = 90;

  drawRoundedRect(page, amountBoxX, amountBoxY, boxWidth, amountBoxHeight, 12, COLORS.brandPrimary, 2, COLORS.surfaceCard);

  // Inner gold border
  drawRoundedRect(page, amountBoxX + 2, amountBoxY + 2, boxWidth - 4, amountBoxHeight - 4, 10, COLORS.goldAccent, 1);

  // Amount label
  page.drawText("प्राप्त राशि", {
    x: amountBoxX + boxWidth / 2 - boldFont.widthOfTextAtSize("प्राप्त राशि", 12) / 2,
    y: amountBoxY + amountBoxHeight - 24,
    size: 12,
    font: boldFont,
    color: COLORS.inkMuted,
  });

  // Amount value
  const amountDigits = view.amountText?.replace("₹", "").replace(/,/g, "").trim() || "—";
  const amountText = `रु. ${amountDigits}/-`;
  page.drawText(amountText, {
    x: amountBoxX + boxWidth / 2 - boldFont.widthOfTextAtSize(amountText, 28) / 2,
    y: amountBoxY + amountBoxHeight - 55,
    size: 28,
    font: boldFont,
    color: COLORS.goldAccent,
  });

  // Amount words
  page.drawText(view.amountWords || "—", {
    x: amountBoxX + 12,
    y: amountBoxY + 12,
    size: 12,
    font: regularFont,
    color: COLORS.inkPrimary,
    maxWidth: boxWidth - 24,
  });

  // Receiver box (right)
  const receiverBoxX = leftX + boxWidth + 24;
  const receiverBoxY = amountBoxY;

  drawRoundedRect(page, receiverBoxX, receiverBoxY, boxWidth, amountBoxHeight, 12, COLORS.brandPrimary, 2, COLORS.surfaceCard);
  drawRoundedRect(page, receiverBoxX + 2, receiverBoxY + 2, boxWidth - 4, amountBoxHeight - 4, 10, COLORS.goldAccent, 1);

  // Receiver name
  page.drawText("प्राप्तकर्ता:", {
    x: receiverBoxX + boxWidth - regularFont.widthOfTextAtSize(`प्राप्तकर्ता: ${view.collector || "—"}`, 12),
    y: receiverBoxY + amountBoxHeight - 30,
    size: 12,
    font: regularFont,
    color: COLORS.inkPrimary,
  });

  // Signature line
  page.drawLine({
    start: { x: receiverBoxX + 12, y: receiverBoxY + 24 },
    end: { x: receiverBoxX + boxWidth - 12, y: receiverBoxY + 24 },
    thickness: 1,
    color: COLORS.inkMuted,
  });

  page.drawText("अधिकृत हस्ताक्षर", {
    x: receiverBoxX + boxWidth / 2 - regularFont.widthOfTextAtSize("अधिकृत हस्ताक्षर", 12) / 2,
    y: receiverBoxY + 10,
    size: 12,
    font: regularFont,
    color: COLORS.inkMuted,
  });

  return amountBoxY - 20;
}

function drawFooterBand(page: PDFPage, view: ReceiptView, regularFont: PDFFont) {
  const bandHeight = 50;
  const bandY = MARGIN;

  page.drawRectangle({
    x: MARGIN,
    y: bandY,
    width: A5_WIDTH - 2 * MARGIN,
    height: bandHeight,
    color: COLORS.brandHero,
    borderRadius: 22,
  });

  // Top border
  page.drawLine({
    start: { x: MARGIN, y: bandY + bandHeight },
    end: { x: A5_WIDTH - MARGIN, y: bandY + bandHeight },
    thickness: 2,
    color: COLORS.brandPrimary,
  });

  page.drawText(view.footer || "धन्यवाद", {
    x: A5_WIDTH / 2 - regularFont.widthOfTextAtSize(view.footer || "धन्यवाद", 12.5) / 2,
    y: bandY + bandHeight / 2 - 6,
    size: 12.5,
    font: regularFont,
    color: COLORS.white,
  });
}



