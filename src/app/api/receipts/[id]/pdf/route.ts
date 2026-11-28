import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDictionary } from "@/i18n";
import { loadReceipt } from "@/modules/receipts/load";
import { buildReceiptView } from "@/modules/receipts/view";
import { renderReceiptPdfLib } from "@/modules/receipts/pdf-lib";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Route handlers have no layout to redirect for them: an unauthenticated
  // visitor gets the login page, not a 500.
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const { id } = await params;

  // loadReceipt enforces tenant isolation and, for members, receipt ownership.
  const payment = await loadReceipt(id);
  if (!payment) return new NextResponse("Not found", { status: 404 });

  try {
    const { t } = await getDictionary();
    const url = new URL(request.url);
    const duplicate = url.searchParams.get("duplicate") === "1";

    console.log("[PDF] Starting PDF generation for payment:", payment.receiptNo);
    const view = buildReceiptView(payment, {
      duplicate,
      footerText: t("thankYou"),
      taxNote: t("taxNote"),
    });

    console.log("[PDF] View built, generating PDF...");
    const pdf = await renderReceiptPdfLib(view, t("taxNote"));
    console.log("[PDF] PDF generated, size:", pdf.length, "bytes");

    if (!pdf || pdf.length === 0) {
      throw new Error("Generated PDF is empty");
    }

    const filename = `receipt-${payment.receiptNo}${duplicate ? "-duplicate" : ""}.pdf`;

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("PDF generation failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("PDF generation failed details:", message, error instanceof Error ? error.stack : "");
    return new NextResponse(`PDF generation failed: ${message}`, { status: 500 });
  }
}
