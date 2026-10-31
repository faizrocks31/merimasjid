import { chromium, type Browser, type Page } from "playwright";
import type { ReceiptView } from "@/modules/receipts/view";
import { readFileSync } from "fs";
import { join } from "path";

// Global browser instance (reuse across requests)
let browserInstance: Browser | null = null;

/**
 * Get or create a shared browser instance
 */
async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }
  browserInstance = await chromium.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=medium"],
  });
  return browserInstance;
}

/**
 * Load local Poppins font as base64 for CSS @font-face
 */
async function getFontFaces(): Promise<string> {
  const fontDir = join(process.cwd(), "public", "fonts");
  const fonts = [
    { file: "Poppins-Regular.woff2", weight: 400 },
    { file: "Poppins-Medium.woff2", weight: 500 },
    { file: "Poppins-SemiBold.woff2", weight: 600 },
    { file: "Poppins-Bold.woff2", weight: 700 },
  ];

  let css = "";
  for (const font of fonts) {
    try {
      const buffer = readFileSync(join(fontDir, font.file));
      const base64 = buffer.toString("base64");
      css += `
        @font-face {
          font-family: "Poppins";
          font-weight: ${font.weight};
          font-style: normal;
          font-display: swap;
          src: url(data:font/woff2;base64,${base64}) format("woff2");
          unicode-range: U+0000-00FF, U+0900-097F, U+1CD0-1CF6, U+1CF8-1CF9, U+200C-200D, U+20A8, U+20B9, U+25CC, U+A830-A839, U+A8E0-A8FF;
        }
      `;
    } catch (e) {
      console.warn(`Font file not found: ${font.file}, using fallback`);
    }
  }
  return css;
}

/**
 * Generate receipt PDF using Playwright/Chromium
 * Renders the HTML template and prints to PDF with A5 landscape size
 */
export async function renderReceiptPdfChromium(view: ReceiptView, taxNote: string): Promise<Uint8Array> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // Get font face CSS
    const fontFaceCss = await getFontFaces();

    // Build HTML content
    const html = buildReceiptHtml(view, taxNote, fontFaceCss);

    // Set content and wait for fonts to load
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.fonts.ready);

    // Generate PDF with A5 landscape (210mm x 148.5mm)
    const pdfBuffer = await page.pdf({
      format: "A5",
      landscape: true,
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: true,
    });

    return new Uint8Array(pdfBuffer);
  } finally {
    await page.close();
  }
}

/**
 * Build complete HTML document with embedded styles
 */
function buildReceiptHtml(view: ReceiptView, taxNote: string, fontFaceCss: string): string {
  const isCancelled = view.status === "REVERSED";
  const isDuplicate = view.isDuplicate;

  // Format date
  const dateParts = view.paymentDate.split(" ");
  const formattedDate = view.paymentDate;

  // Get masjid details
  const masjidName = view.masjid.name;
  const masjidAddress = view.masjid.address || "";
  const masjidPhone = view.masjid.phone || "";

  // Get amount in words (Hindi)
  const amountWords = view.amountWords || "—";

  // Category/purpose
  const categoryName = view.purposes.map(p => p.name).join(", ") || "—";

  // Payment mode in Hindi
  const modeMap: Record<string, string> = {
    CASH: "कैश",
    UPI: "यूपीआई",
    BANK_TRANSFER: "बैंक ट्रांसफर",
    OTHER: "अन्य",
  };
  const paymentMode = modeMap[view.mode] || view.mode;

  // Collector
  const collector = view.collector || "—";

  // Footer text
  const footerText = view.footer || taxNote;

  // Amount in digits (without ₹ symbol)
  const amountDigits = view.amountText?.replace("₹", "").replace(/,/g, "").trim() || "—";

  return `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>रसीद ${view.receiptNo}</title>
  <style>
    ${fontFaceCss}

    :root {
      --brand-primary: #0b5d3b;
      --brand-hero: #0b3d2a;
      --brand-soft: #e6efe9;
      --gold-accent: #c9a227;
      --gold-text: #6a5a10;
      --receipt-cream: #fbf8ee;
      --surface-card: #ffffff;
      --ink-primary: #13261c;
      --ink-muted-new: #4e6055;
      --ink-muted: #5c6b62;
      --border-tile: #e1e8df;
      --border-subtle: #e3e1d8;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    @page {
      size: 210mm 148.5mm;
      margin: 0;
    }

    html, body {
      height: 100%;
      font-family: "Poppins", "Noto Sans Devanagari", sans-serif;
      font-size: 13px;
      line-height: 1.5;
      color: var(--ink-primary);
      background: var(--receipt-cream);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
    }

    [lang="hi"], [lang="hi"] * {
      letter-spacing: normal !important;
    }

    .print-sheet {
      width: 210mm;
      height: 148.5mm;
      max-width: 210mm;
      max-height: 148.5mm;
      border: 2px solid var(--brand-primary);
      border-radius: 24px;
      background: var(--receipt-cream);
      padding: 18mm 20mm;
      position: relative;
      overflow: hidden;
    }

    .watermark {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      border-radius: 20px;
      overflow: hidden;
    }
    .watermark svg {
      width: 60%;
      height: 60%;
      opacity: 0.08;
    }

    .status-watermark {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      border-radius: 20px;
      overflow: hidden;
    }
    .status-watermark span {
      transform: rotate(-18deg);
      font-size: 48px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      color: rgba(0, 0, 0, 0.045);
      white-space: nowrap;
    }

    .double-border-outer {
      position: absolute;
      inset: 0;
      border: 1px solid var(--brand-primary);
      border-radius: 22px;
      pointer-events: none;
    }
    .double-border-inner {
      position: absolute;
      inset: 3px;
      border: 1px solid var(--gold-accent);
      border-radius: 20px;
      pointer-events: none;
    }

    .header-band {
      position: relative;
      margin: -20px -20px 24px -20px;
      padding: 18px 20px;
      border-radius: 22px 22px 0 0;
      background: var(--brand-hero);
      border-bottom: 2px solid var(--brand-primary);
    }
    .header-band .corner-icon {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      color: var(--gold-accent);
    }
    .header-band .corner-icon.left { left: 20px; }
    .header-band .corner-icon.right { right: 20px; }
    .header-band .corner-icon svg { width: 32px; height: 32px; }
    .header-band h1 {
      color: white;
      font-family: "Poppins", sans-serif;
      font-weight: 700;
      font-size: 38px;
      text-align: center;
      line-height: 1.2;
    }
    .header-band .meta {
      margin-top: 8px;
      font-family: "Poppins", sans-serif;
      font-weight: 500;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--gold-accent);
      text-align: center;
    }

    .ribbon {
      display: flex;
      justify-content: center;
      margin-bottom: 24px;
    }
    .ribbon span {
      display: inline-block;
      padding: 8px 32px;
      border-radius: 9999px;
      background: var(--gold-accent);
      color: black;
      font-family: "Poppins", sans-serif;
      font-weight: 700;
      font-size: 19px;
      letter-spacing: 0.05em;
      white-space: nowrap;
    }

    .fields { display: flex; flex-direction: column; gap: 16px; }
    .field-row { display: flex; flex-direction: column; gap: 12px; }
    @media (min-width: 400px) { .field-row { flex-direction: row; } }
    .field { flex: 1; display: flex; align-items: baseline; gap: 12px; }
    .field-badge {
      width: 28px;
      height: 28px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: var(--brand-primary);
      color: white;
      font-family: "Poppins", sans-serif;
      font-weight: 700;
      font-size: 11px;
    }
    .field-content { flex: 1; }
    .field-label {
      display: block;
      font-family: "Poppins", sans-serif;
      font-weight: 700;
      font-size: 15px;
      color: var(--brand-primary);
      margin-bottom: 4px;
    }
    .field-value-line {
      border-bottom: 2px dotted var(--brand-primary);
      min-height: 28px;
      display: flex;
      align-items: flex-end;
    }
    .field-value {
      font-family: "Poppins", sans-serif;
      font-weight: 500;
      font-size: 14px;
      color: var(--ink-primary);
    }
    .field-value-strong { font-weight: 600; }
    .field-value-text { font-weight: 400; }

    .payment-modes { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 4px; }
    .payment-mode-item { display: flex; align-items: center; gap: 6px; }
    .payment-mode-item input { width: 16px; height: 16px; accent-color: var(--brand-primary); }
    .payment-mode-item span { font-family: "Poppins", sans-serif; font-size: 13px; color: var(--ink-primary); }

    .amount-receiver { display: flex; flex-direction: column; gap: 16px; margin-top: 24px; }
    @media (min-width: 400px) { .amount-receiver { flex-direction: row; } }

    .amount-box {
      flex: 1;
      position: relative;
      border: 2px solid var(--brand-primary);
      border-radius: 12px;
      background: var(--surface-card);
      padding: 20px;
      min-height: 90px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .amount-box::before {
      content: "";
      position: absolute;
      inset: 2px;
      border: 1px solid var(--gold-accent);
      border-radius: 8px;
      pointer-events: none;
    }
    .amount-label {
      font-family: "Poppins", sans-serif;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--ink-muted-new);
      margin-bottom: 4px;
    }
    .amount-value {
      font-family: "Poppins", sans-serif;
      font-weight: 700;
      font-size: 28px;
      color: var(--gold-accent);
    }
    .amount-words {
      font-family: "Poppins", "Noto Sans Devanagari", sans-serif;
      font-weight: 400;
      font-size: 13px;
      color: var(--ink-primary);
      margin-top: 8px;
      text-align: center;
      line-height: 1.4;
    }

    .receiver-box {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      justify-content: center;
      text-align: right;
    }
    .receiver-name {
      font-family: "Poppins", sans-serif;
      font-size: 13px;
      color: var(--ink-primary);
    }
    .receiver-name strong { font-weight: 600; }
    .signature-line { width: 100%; border-top: 1px solid var(--ink-muted); padding-top: 8px; margin-top: 8px; }
    .signature-text { font-family: "Poppins", sans-serif; font-weight: 500; font-size: 12px; color: var(--ink-muted); }

    .footer-band { margin: 24px -20px -20px -20px; padding: 16px 20px; border-radius: 0 0 22px 22px; background: var(--brand-hero); border-top: 2px solid var(--brand-primary); }
    .footer-band p { color: white; text-align: center; font-family: "Poppins", sans-serif; font-size: 12.5px; line-height: 1.6; }

    @media print { .no-print { display: none !important; } body { background: white; } .print-sheet { box-shadow: none; border: none; max-width: none; } }
  </style>
</head>
<body>
  <article class="print-sheet" aria-label="Receipt ${view.receiptNo}">
    <div class="watermark"><svg viewBox="0 0 100 100" fill="#E3F3EA"><path d="M50 4 L60 35 L95 35 L68 55 L78 90 L50 70 L22 90 L32 55 L5 35 L40 35 Z"/></svg></div>
    ${(isDuplicate || isCancelled) ? `
    <div class="status-watermark"><span>${isCancelled ? "रद्द" : "नकल"}</span></div>
    ` : ""}
    <div class="double-border-outer"></div>
    <div class="double-border-inner"></div>
    <div class="header-band">
      <div class="corner-icon left"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 3.74 2.17 6.95 5.2 8.6L12 22l4.8-1.4C19.83 18.95 22 15.74 22 12S17.52 2 12 2zm0 2c3.53 0 6.43 2.61 6.92 6H21.17C20.63 5.02 15.84 2 12 2zm7 13.78C17.2 15.3 14.26 16 12 16c-2.26 0-5.2-.7-7.17-2.22L12 4.4l7.17 11.38z"/></svg></div>
      <div class="corner-icon right"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 3.74 2.17 6.95 5.2 8.6L12 22l4.8-1.4C19.83 18.95 22 15.74 22 12S17.52 2 12 2zm0 2c3.53 0 6.43 2.61 6.92 6H21.17C20.63 5.02 15.84 2 12 2zm7 13.78C17.2 15.3 14.26 16 12 16c-2.26 0-5.2-.7-7.17-2.22L12 4.4l7.17 11.38z"/></svg></div>
      <h1>${escapeHtml(masjidName)}</h1>
      ${(masjidAddress || masjidPhone) ? `
      <div class="meta">${escapeHtml(masjidAddress)}${masjidAddress && masjidPhone ? "  |  " : ""}${escapeHtml(masjidPhone)}</div>
      ` : ""}
    </div>
    <div class="ribbon"><span>रसीद</span></div>
    <div class="fields">
      <div class="field-row">
        <div class="field"><span class="field-badge">1</span><div class="field-content"><label class="field-label">रसीद संख्या</label><div class="field-value-line"><span class="field-value">${escapeHtml(view.receiptNo)}</span></div></div></div>
        <div class="field"><span class="field-badge">2</span><div class="field-content"><label class="field-label">दिनांक</label><div class="field-value-line"><span class="field-value">${escapeHtml(formattedDate)}</span></div></div></div>
      </div>
      <div class="field-row"><div class="field"><span class="field-badge">3</span><div class="field-content"><label class="field-label">मोहतरम जनाब</label><div class="field-value-line"><span class="field-value field-value-strong">${escapeHtml(view.donorName || "—")}</span></div></div></div></div>
      <div class="field-row"><div class="field"><span class="field-badge">4</span><div class="field-content"><label class="field-label">रुपये शब्दों में</label><div class="field-value-line"><span class="field-value field-value-text">${escapeHtml(amountWords)}</span></div></div></div></div>
      <div class="field-row">
        <div class="field"><span class="field-badge">5</span><div class="field-content"><label class="field-label">आवंटन श्रेणी</label><div class="field-value-line"><span class="field-value field-value-strong">${escapeHtml(categoryName)}</span></div></div></div>
        <div class="field"><span class="field-badge">6</span><div class="field-content"><label class="field-label">भुगतान का तरीका</label><div class="payment-modes">${["CASH","UPI","BANK_TRANSFER","OTHER"].map(mode => `
                <label class="payment-mode-item"><input type="checkbox" ${view.mode===mode?"checked":""} disabled /><span>${escapeHtml(modeMap[mode]||mode)}</span></label>
              `).join("")}</div></div></div>
      </div>
    </div>
    <div class="amount-receiver">
      <div class="amount-box">
        <p class="amount-label">प्राप्त राशि</p>
        <p class="amount-value">रु. ${escapeHtml(amountDigits)}/-</p>
        <p class="amount-words">${escapeHtml(amountWords)}</p>
      </div>
      <div class="receiver-box">
        <p class="receiver-name">प्राप्तकर्ता: <strong>${escapeHtml(collector)}</strong></p>
        <div class="signature-line"><p class="signature-text">अधिकृत हस्ताक्षर</p></div>
      </div>
    </div>
    <div class="footer-band"><p>${escapeHtml(footerText)}</p></div>
  </article>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, "")
    .replace(/'/g, "&#039;");
}
