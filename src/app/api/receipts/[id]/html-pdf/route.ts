import { NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { readFileSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

async function getFontBase64(filename: string): Promise<string> {
  const fontDir = join(process.cwd(), "public", "fonts");
  const buffer = readFileSync(join(fontDir, filename));
  return buffer.toString("base64");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let browser = null;

  try {
    // Launch browser with Chromium optimized for Vercel
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();

    // Set viewport to A5 size (148mm x 210mm) at 96 DPI
    // A5 = 148mm x 210mm = ~559 x 794 pixels at 96 DPI
    await page.setViewport({
      width: 559,
      height: 794,
      deviceScaleFactor: 2, // Higher DPI for better quality
    });

    // HTML content for the receipt
    const [notoRegular, notoBold, poppinsRegular, poppinsBold, poppinsMedium] = await Promise.all([
      getFontBase64("NotoSansDevanagari-Regular.ttf"),
      getFontBase64("NotoSansDevanagari-Bold.ttf"),
      getFontBase64("Poppins-Regular.ttf"),
      getFontBase64("Poppins-Bold.ttf"),
      getFontBase64("Poppins-Medium.ttf"),
    ]);

    const html = `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <style>
    @font-face {
      font-family: 'Noto Sans Devanagari';
      src: url('data:font/ttf;base64,${notoRegular}') format('truetype');
      font-weight: 400;
      font-style: normal;
    }
    @font-face {
      font-family: 'Noto Sans Devanagari';
      src: url('data:font/ttf;base64,${notoBold}') format('truetype');
      font-weight: 700;
      font-style: normal;
    }
    @font-face {
      font-family: 'Poppins';
      src: url('data:font/ttf;base64,${poppinsRegular}') format('truetype');
      font-weight: 400;
      font-style: normal;
    }
    @font-face {
      font-family: 'Poppins';
      src: url('data:font/ttf;base64,${poppinsBold}') format('truetype');
      font-weight: 700;
      font-style: normal;
    }
    @font-face {
      font-family: 'Poppins';
      src: url('data:font/ttf;base64,${poppinsMedium}') format('truetype');
      font-weight: 500;
      font-style: normal;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Noto Sans Devanagari', 'Poppins', sans-serif;
      margin: 0;
      padding: 20px;
      background: #fbf8ee;
      width: 100%;
      height: 100%;
    }

    .receipt-container {
      width: 100%;
      max-width: 559px;
      margin: 0 auto;
      background: #fbf8ee;
      min-height: 100vh;
      padding: 20px;
    }

    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      opacity: 0.08;
      pointer-events: none;
      z-index: 1;
      width: 240px;
      height: 240px;
    }

    .receipt-container {
      position: relative;
      background: #fbf8ee;
      border: 2px solid #0b5d3b;
      border-radius: 24px;
      padding: 20px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    }

    .inner-border {
      border: 1px solid #c9a227;
      border-radius: 20px;
      padding: 20px;
      margin: 3px;
    }

    .header-band {
      background: #0b3d2a;
      border-radius: 22px;
      padding: 20px;
      margin-bottom: 20px;
      border-bottom: 2px solid #0b5d3b;
      position: relative;
      overflow: hidden;
    }

    .header-band::before,
    .header-band::after {
      content: '';
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 32px;
      height: 32px;
      background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23c9a227"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 2c3.53 0 6.43 2.61 6.92 6H21.17C20.63 5.02 15.84 2 12 2zm7 13.78C17.2 15.3 14.26 16 12 16c-2.26 0-5.2-.7-7.17-2.22L12 4.4l7.17 11.38z"/></svg>');
      width: 32px;
      height: 32px;
      opacity: 0.15;
    }

    .header-band::before {
      left: 20px;
    }

    .header-band::after {
      right: 20px;
    }

    .masjid-name {
      color: white;
      font-family: 'Poppins', 'Noto Sans Devanagari', sans-serif;
      font-weight: 700;
      font-size: 38px;
      text-align: center;
      line-height: 1.2;
      margin-bottom: 5px;
    }

    .meta-info {
      color: #c9a227;
      font-family: 'Poppins', 'Noto Sans Devanagari', sans-serif;
      font-weight: 500;
      font-size: 12px;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-top: 8px;
    }

    .receipt-info {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
      padding: 16px 8px;
      font-family: 'Poppins', sans-serif;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .info-label {
      color: #c9a227;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 4px;
    }

    .info-value {
      color: white;
      font-size: 16px;
      font-weight: 500;
    }

    .ribbon {
      background: linear-gradient(135deg, #c9a227 0%, #b8860b 100%);
      border-radius: 9999px;
      padding: 8px 32px;
      margin: 20px auto;
      display: inline-block;
      box-shadow: 0 4px 12px rgba(201, 162, 39, 0.3);
    }

    .ribbon-text {
      color: #000;
      font-family: 'Poppins', sans-serif;
      font-weight: 700;
      font-size: 19px;
      letter-spacing: 0.05em;
      white-space: nowrap;
    }

    .fields {
      margin-top: 24px;
    }

    .field-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 16px;
      padding: 0 8px;
    }

    .field-label {
      color: #0b5d3b;
      font-family: 'Poppins', sans-serif;
      font-weight: 700;
      font-size: 15px;
      margin-bottom: 4px;
    }

    .field-value {
      color: #13261c;
      font-weight: 700;
      font-size: 14px;
    }

    .field-value-text {
      font-weight: 400;
    }

    .mode-row {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      margin-top: 8px;
    }

    .payment-mode-group {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    .mode-label {
      color: #0b5d3b;
      font-weight: 700;
      font-size: 15px;
      margin-bottom: 4px;
    }

    .payment-modes {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 4px;
    }

    .payment-mode {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #13261c;
      font-family: 'Poppins', sans-serif;
    }

    .payment-mode input[type="checkbox"] {
      width: 14px;
      height: 14px;
      accent-color: #0b5d3b;
      cursor: default;
    }

    .amount-receiver {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      margin-top: 24px;
    }

    .amount-box {
      flex: 1;
      border: 2px solid #0b5d3b;
      border-radius: 12px;
      background: #fff;
      padding: 20px;
      min-height: 90px;
      position: relative;
    }

    .amount-box::before {
      content: '';
      position: absolute;
      inset: 2px;
      border: 1px solid #c9a227;
      border-radius: 10px;
      pointer-events: none;
    }

    .amount-label {
      color: #5c6b62;
      font-family: 'Poppins', sans-serif;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 4px;
    }

    .amount-value {
      color: #c9a227;
      font-family: 'Poppins', sans-serif;
      font-weight: 700;
      font-size: 28px;
      line-height: 1;
    }

    .amount-words {
      color: #13261c;
      font-family: 'Noto Sans Devanagari', sans-serif;
      font-weight: 400;
      font-size: 12px;
      margin-top: 8px;
      text-align: center;
      line-height: 1.4;
    }

    .receiver-box {
      flex: 1;
      border: 2px solid #0b5d3b;
      border-radius: 12px;
      background: #fff;
      padding: 20px;
      min-height: 90px;
      position: relative;
    }

    .receiver-box::before {
      content: '';
      position: absolute;
      inset: 2px;
      border: 1px solid #c9a227;
      border-radius: 10px;
      pointer-events: none;
    }

    .receiver-name {
      color: #13261c;
      font-family: 'Poppins', sans-serif;
      font-size: 12px;
      text-align: right;
    }

    .receiver-name strong {
      font-weight: 600;
    }

    .signature-line {
      width: 100%;
      border-top: 1px solid #5c6b62;
      padding-top: 8px;
      margin-top: 8px;
    }

    .signature-text {
      color: #5c6b62;
      font-family: 'Poppins', sans-serif;
      font-weight: 500;
      font-size: 12px;
      text-align: right;
    }

    .footer-band {
      background: #0b3d2a;
      border-radius: 22px;
      padding: 14px;
      margin-top: 20px;
      border-top: 2px solid #0b5d3b;
      text-align: center;
    }

    .footer-text {
      color: white;
      font-family: 'Poppins', sans-serif;
      font-size: 12.5px;
      line-height: 1.6;
    }

    /* Watermark pattern */
    .watermark {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      opacity: 0.08;
      pointer-events: none;
      z-index: 1;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='%23E3F3EA'%3E%3Cpath d='M50 4 L60 35 L95 35 L68 55 L78 90 L50 70 L22 90 L32 55 L5 35 L40 35 Z'/%3E%3C/svg%3E");
      background-size: 120px;
      border-radius: 24px;
    }

    .status-watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-18deg);
      font-size: 48px;
      font-weight: 700;
      color: rgba(0, 0, 0, 0.045);
      white-space: nowrap;
      pointer-events: none;
      font-family: 'Noto Sans Devanagari', sans-serif;
    }

    /* Font families */
    .devanagari {
      font-family: 'Noto Sans Devanagari', sans-serif;
    }

    .latin {
      font-family: 'Poppins', sans-serif;
    }

    .bold {
      font-weight: 700;
    }

    .medium {
      font-weight: 500;
    }

    .regular {
      font-weight: 400;
    }

    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }

    .mt-16 { margin-top: 16px; }
    .mt-24 { margin-top: 24px; }
    .mt-8 { margin-top: 8px; }
    .mb-16 { margin-bottom: 16px; }
    .mb-8 { margin-bottom: 8px; }
    .gap-8 { gap: 8px; }
    .gap-24 { gap: 24px; }
    .px-24 { padding: 0 24px; }
    .px-12 { padding: 0 12px; }
    .px-24 { padding: 0 24px; }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="watermark" aria-hidden="true"></div>

    <div class="receipt-container">
      <div class="inner-border">
        <div class="watermark" aria-hidden="true"></div>

        <div class="header-band">
          <div class="masjid-name">{{MASJID_NAME}}</div>
          <div class="meta-info">{{MASJID_META}}</div>
        </div>

        <div class="inner-border">
          <div class="receipt-info">
            <div class="info-item">
              <div class="info-label">रसीद संख्या</div>
              <div class="info-value">{{RECEIPT_NO}}</div>
            </div>
            <div class="info-item">
              <div class="info-label">दिनांक</div>
              <div class="info-value">{{DATE}}</div>
            </div>
          </div>

          <div class="ribbon">
            <span class="ribbon-text">रसीद</span>
          </div>

          <div class="fields">
            <div class="field-row">
              <div class="field-label">मोहतरम जनाब</div>
              <div class="field-value"><strong>{{DONOR_NAME}}</strong></div>
            </div>

            <div class="field-row">
              <div class="field-label">रुपये शब्दों में</div>
              <div class="field-value"><span class="field-value-text">{{AMOUNT_WORDS}}</span></div>
            </div>

            <div class="field-row">
              <div>
                <div class="field-label">आवंटन श्रेणी</div>
                <div class="field-value bold">{{CATEGORY}}</div>
              </div>
              <div>
                <div class="mode-label">भुगतान का तरीका</div>
                <div class="payment-modes">
                  <label class="payment-mode">
                    <input type="checkbox" checked disabled>
                    <span>कैश</span>
                  </label>
                  <label class="payment-mode">
                    <input type="checkbox" disabled>
                    <span>यूपीआई</span>
                  </label>
                  <label class="payment-mode">
                    <input type="checkbox" disabled>
                    <span>बैंक ट्रांसफर</span>
                  </label>
                  <label class="payment-mode">
                    <input type="checkbox" disabled>
                    <span>अन्य</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div class="amount-receiver">
            <div class="amount-box">
              <div class="amount-label">प्राप्त राशि</div>
              <div class="amount-value">रु. {{AMOUNT}}/-</div>
              <div class="amount-words">{{AMOUNT_WORDS}}</div>
            </div>

            <div class="receiver-box">
              <div class="receiver-name">प्राप्तकर्ता: <strong>{{COLLECTOR}}</strong></div>
              <div class="signature-line">
                <div class="signature-text">अधिकृत हस्ताक्षर</div>
              </div>
            </div>
          </div>

          <div class="footer-band">
            <div class="footer-text">
              अल्लाह आपका दान स्वीकार करे
            </div>
          </div>
        </div>
      </div>
    </div>

    <script>
      // Ensure Devanagari text renders correctly
      document.fonts.ready.then(() => {
        console.log('Fonts loaded');
      });
    </script>
</body>
</html>`;

    // Set content and wait for fonts to load
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.fonts.ready);

    // Generate PDF with A5 portrait (148mm x 210mm)
    const pdfBuffer = await page.pdf({
      format: "A5",
      landscape: false,
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: true,
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="receipt.pdf"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("PDF generation failed:", error);
    return new NextResponse("PDF generation failed: " + (error as Error).message, { status: 500 });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}