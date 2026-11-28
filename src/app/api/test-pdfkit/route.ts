import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { join } from "path";
import { readFileSync } from "fs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Create a new PDF document
    const doc = new PDFDocument({
      size: "A5",
      margin: 40,
      layout: "portrait",
    });

    // Collect PDF chunks
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));

    // Load Noto Sans Devanagari fonts from public/fonts
    const fontDir = join(process.cwd(), "public", "fonts");

    // Embed the font files
    const regularFontBuffer = readFileSync(join(fontDir, "NotoSansDevanagari-Regular.ttf"));
    const boldFontBuffer = readFileSync(join(fontDir, "NotoSansDevanagari-Bold.ttf"));

    // Register Noto Sans Devanagari fonts
    doc.registerFont("NotoDevanagari-Regular", doc.ref({
      Type: "Font",
      Subtype: "TrueType",
      BaseFont: "NotoSansDevanagari",
      Encoding: "Identity-H",
    }));

    doc.registerFont("NotoDevanagari-Bold", doc.ref({
      Type: "Font",
      Subtype: "TrueType",
      BaseFont: "NotoSansDevanagari",
      Encoding: "Identity-H",
    }));

    // Test content
    const testLines = [
      "मस्जिद रसीद",
      "मोहम्मद इज़हान शेख",
      "मासिक चंदा",
      "रद्द",
      "नकल",
      "अल्लाह आपका दान स्वीकार करे",
      "साफ़-सफ़ाई का खर्च",
      "राशि प्राप्त करने वाले का हस्ताक्षर",
    ];

    // Draw content
    let y = 50;
    const leftMargin = 50;

    doc.fontSize(24).font("Helvetica-Bold").fillColor("#0b5d3b").text("मस्जिद रसीद", 50, 50, { width: 400, align: "center" });

    y = 120;
    doc.fontSize(18).font("Helvetica").fillColor("black").text("मोहम्मद इज़हान शेख", 50, y);

    y += 40;
    doc.fontSize(18).font("Helvetica").fillColor("black").text("मासिक चंदा", 50, y);

    y += 40;
    doc.fontSize(18).font("NotoDevanagari-Regular").fillColor("red").text("रद्द", 50, y);

    y += 40;
    doc.fontSize(18).font("NotoDevanagari-Regular").fillColor("blue").text("नकल", 50, y);

    y += 40;
    doc.fontSize(18).font("NotoDevanagari-Regular").fillColor("green").text("अल्लाह आपका दान स्वीकार करे", 50, y);

    y += 40;
    doc.fontSize(18).font("NotoDevanagari-Regular").fillColor("purple").text("साफ़-सफ़ाई का खर्च", 50, y);

    y += 40;
    doc.fontSize(18).font("NotoDevanagari-Regular").fillColor("brown").text("राशि प्राप्त करने वाले का हस्ताक्षर", 50, y);

    // Finalize
    doc.end();

    // Wait for PDF generation
    for await (const chunk of doc) {
      chunks.push(chunk);
    }

    const pdfBuffer = Buffer.concat(chunks);

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="test-hindi-receipt.pdf"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("PDF generation failed:", error);
    return new NextResponse("PDF generation failed: " + (error as Error).message, { status: 500 });
  }
}