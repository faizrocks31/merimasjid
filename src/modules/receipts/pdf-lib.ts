import { PDFDocument, rgb, StandardFonts, PageSizes, type PDFPage, type PDFFont } from "pdf-lib";
import { readFileSync } from "fs";
import { join } from "path";
import type { ReceiptView } from "@/modules/receipts/view";

// Register fontkit for custom font embedding - done lazily at runtime to avoid build issues
function ensureFontkitRegistered(): void {
  if (typeof PDFDocument.registerFontkit === "function") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fontkit = require("@pdf-lib/fontkit");
      PDFDocument.registerFontkit(fontkit);
    } catch (e) {
      console.warn("Fontkit registration failed:", e);
    }
  }
}

// Ensure fontkit is registered immediately
ensureFontkitRegistered();

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

let fontCache: { regular: Uint8Array; medium: Uint8Array; semiBold: Uint8Array; bold: Uint8Array } | null = null;

async function loadFonts(): Promise<{ regular: Uint8Array; medium: Uint8Array; semiBold: Uint8Array; bold: Uint8Array }> {
  if (fontCache) return fontCache;

  // Use bundled font data for Vercel compatibility
  // Font files are loaded at build time and embedded as base64
  const fonts = [
    { file: "Poppins-Regular.woff2", weight: 400 },
    { file: "Poppins-Medium.woff2", weight: 500 },
    { file: "Poppins-SemiBold.woff2", weight: 600 },
    { file: "Poppins-Bold.woff2", weight: 700 },
  ];

  const loaded: Record<string, Uint8Array> = {};

  // Try to load from public/fonts first, then fallback to empty
  for (const font of fonts) {
    try {
      // Use process.cwd() with turbopackIgnore for Vercel compatibility
      const fontPath = join(process.cwd() /* turbopackIgnore: true */, "public", "fonts", font.file);
      const buffer = readFileSync(fontPath);
      loaded[font.file] = buffer;
    } catch (e) {
      console.warn(`Font file not found: ${font.file}, using fallback`);
    }
  }

  fontCache = {
    regular: loaded["Poppins-Regular.woff2"] || new Uint8Array(),
    medium: loaded["Poppins-Medium.woff2"] || new Uint8Array(),
    semiBold: loaded["Poppins-SemiBold.woff2"] || new Uint8Array(),
    bold: loaded["Poppins-Bold.woff2"] || new Uint8Array(),
  };
  return fontCache;
}

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
  const path = page.moveTo(x + radius, y)
    .lineTo(x + width - radius, y)
    .quadraticCurveTo(x + width, y, x + width, y + radius)
    .lineTo(x + width, y + height - radius)
    .quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    .lineTo(x + radius, y + height)
    .quadraticCurveTo(x, y + height, x, y + height - radius)
    .lineTo(x, y + radius)
    .quadraticCurveTo(x, y, x + radius, y);

  if (fillColor) {
    page.drawPath(path, { fillColor });
  }
  page.drawPath(path, { borderColor, borderWidth });
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

  // Load fonts
  const fonts = await loadFonts();
  let poppinsRegular: PDFFont, poppinsMedium: PDFFont, poppinsSemiBold: PDFFont, poppinsBold: PDFFont;

  try {
    if (fonts.regular.length > 0) poppinsRegular = await pdfDoc.embedFont(fonts.regular);
    else poppinsRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    if (fonts.medium.length > 0) poppinsMedium = await pdfDoc.embedFont(fonts.medium);
    else poppinsMedium = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    if (fonts.semiBold.length > 0) poppinsSemiBold = await pdfDoc.embedFont(fonts.semiBold);
    else poppinsSemiBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    if (fonts.bold.length > 0) poppinsBold = await pdfDoc.embedFont(fonts.bold);
    else poppinsBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  } catch (e) {
    console.warn('Font embedding failed, using standard fonts:', e);
    poppinsRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    poppinsMedium = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    poppinsSemiBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    poppinsBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  }

  // Embed standard Helvetica Bold for status watermark
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
    drawStatusWatermark(page, view.status === "REVERSED" ? "रद्द" : "नकल", helveticaBold);
  }

  // Double border
  drawDoubleBorder(page);

  // Header band
  const headerBandHeight = 140;
  drawHeaderBand(page, view, headerBandHeight, poppinsBold, poppinsMedium, poppinsSemiBold);

  // Ribbon
  const ribbonY = A5_HEIGHT - MARGIN - headerBandHeight - 30;
  drawRibbon(page, ribbonY, poppinsBold);

  // Fields section
  let currentY = ribbonY - 40;
  currentY = drawFields(page, view, currentY, poppinsRegular, poppinsMedium, poppinsSemiBold, poppinsBold);

  // Amount and receiver section
  currentY = drawAmountReceiver(page, view, currentY, poppinsRegular, poppinsMedium, poppinsSemiBold, poppinsBold);

  // Footer band
  drawFooterBand(page, view, poppinsRegular);

  const pdfBytes = await pdfDoc.save();
  return new Uint8Array(pdfBytes);
}

function drawWatermark(page: PDFPage) {
  // Draw a simple mosque-like geometric pattern as watermark
  const centerX = A5_WIDTH / 2;
  const centerY = A5_HEIGHT / 2;
  const size = 120;

  page.save();
  page.setFillColor(COLORS.watermark);

  // Draw a star-like pattern (simplified mosque silhouette)
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI / 4) - Math.PI / 2;
    const x = centerX + Math.cos(angle) * size;
    const y = centerY + Math.sin(angle) * size;
    const x2 = centerX + Math.cos(angle + Math.PI / 8) * (size * 0.5);
    const y2 = centerY + Math.sin(angle + Math.PI / 8) * (size * 0.5);

    page.drawTriangle({
      x1: centerX, y1: centerY,
      x2, y2,
      x3: x, y3: y,
      color: COLORS.watermark,
    });
  }
  page.restore();
}

function drawStatusWatermark(page: PDFPage, text: string, helveticaBold: PDFFont) {
  page.save();
  page.translate(A5_WIDTH / 2, A5_HEIGHT / 2);
  page.rotate(-18 * Math.PI / 180);
  page.drawText(text, {
    x: -100,
    y: 0,
    size: 48,
    font: helveticaBold,
    color: COLORS.statusWatermark,
  });
  page.restore();
}

function drawDoubleBorder(page: PDFPage) {
  // Outer border
  drawRoundedRect(page, MARGIN, MARGIN, A5_WIDTH - 2 * MARGIN, A5_HEIGHT - 2 * MARGIN, 24, COLORS.brandPrimary, 2);
  // Inner border
  drawRoundedRect(page, MARGIN + 3, MARGIN + 3, A5_WIDTH - 2 * MARGIN - 6, A5_HEIGHT - 2 * MARGIN - 6, 22, COLORS.goldAccent, 1);
}

function drawHeaderBand(page: PDFPage, view: ReceiptView, height: number, boldFont: PDFFont, mediumFont: PDFFont, semiBoldFont: PDFFont) {
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
      x: MARGIN + bandWidth / 2 - mediumFont.widthOfTextAtSize(meta, 12) / 2,
      y: bandY + height - 75,
      size: 12,
      font: mediumFont,
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
    font: semiBoldFont,
    color: COLORS.goldAccent,
  });
  page.drawText(view.receiptNo, {
    x: leftX,
    y: receiptInfoY - 20,
    size: 16,
    font: mediumFont,
    color: COLORS.white,
  });

  // Date
  const dateLabel = "दिनांक";
  const dateWidth = mediumFont.widthOfTextAtSize(dateLabel, 12);
  page.drawText(dateLabel, {
    x: rightX - dateWidth,
    y: receiptInfoY,
    size: 12,
    font: semiBoldFont,
    color: COLORS.goldAccent,
  });
  const dateValue = view.paymentDate;
  const dateValueWidth = mediumFont.widthOfTextAtSize(dateValue, 16);
  page.drawText(dateValue, {
    x: rightX - dateValueWidth,
    y: receiptInfoY - 20,
    size: 16,
    font: mediumFont,
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

function drawFields(page: PDFPage, view: ReceiptView, startY: number, regularFont: PDFFont, mediumFont: PDFFont, semiBoldFont: PDFFont, boldFont: PDFFont): number {
  let y = startY;
  const leftX = MARGIN + 24;
  const rightX = A5_WIDTH - MARGIN - 24;
  const fieldWidth = rightX - leftX;

  // Donor name
  y = drawFieldRow(page, "मोहतरम जनाब", view.donorName || "—", leftX, y, fieldWidth, regularFont, mediumFont, boldFont);
  y -= 16;

  // Amount in words
  y = drawFieldRow(page, "रुपये शब्दों में", view.amountWords || "—", leftX, y, fieldWidth, regularFont, mediumFont, regularFont);
  y -= 16;

  // Category and Payment mode row
  const categoryLabel = "आवंटन श्रेणी";
  const modeLabel = "भुगतान का तरीका";
  const labelWidth = Math.max(
    semiBoldFont.widthOfTextAtSize(categoryLabel, 15),
    semiBoldFont.widthOfTextAtSize(modeLabel, 15)
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
  page.drawText(categoryLabel, { x: leftX, y, size: 15, font: semiBoldFont, color: COLORS.brandPrimary });
  page.drawText(categoryValue, { x: leftX + labelWidth, y, size: 14, font: boldFont, color: COLORS.inkPrimary });

  // Mode (right side)
  const modeX = leftX + fieldWidth / 2 + 24;
  page.drawText(modeLabel, { x: modeX, y, size: 15, font: semiBoldFont, color: COLORS.brandPrimary });

  // Payment mode checkboxes
  const modes = ["कैश", "यूपीआई", "बैंक ट्रांसफर", "अन्य"];
  let modeItemX = modeX + semiBoldFont.widthOfTextAtSize(modeLabel + "  ", 15);
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

function drawFieldRow(page: PDFPage, label: string, value: string, x: number, y: number, width: number, labelFont: PDFFont, valueFont: PDFFont, labelFontBold?: PDFFont): number {
  const font = labelFontBold || labelFont;
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

function drawAmountReceiver(page: PDFPage, view: ReceiptView, startY: number, regularFont: PDFFont, mediumFont: PDFFont, semiBoldFont: PDFFont, boldFont: PDFFont): number {
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
    x: amountBoxX + boxWidth / 2 - semiBoldFont.widthOfTextAtSize("प्राप्त राशि", 12) / 2,
    y: amountBoxY + amountBoxHeight - 24,
    size: 12,
    font: semiBoldFont,
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
    x: receiverBoxX + boxWidth - mediumFont.widthOfTextAtSize(`प्राप्तकर्ता: ${view.collector || "—"}`, 12),
    y: receiverBoxY + amountBoxHeight - 30,
    size: 12,
    font: mediumFont,
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
    x: receiverBoxX + boxWidth / 2 - mediumFont.widthOfTextAtSize("अधिकृत हस्ताक्षर", 12) / 2,
    y: receiverBoxY + 10,
    size: 12,
    font: mediumFont,
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