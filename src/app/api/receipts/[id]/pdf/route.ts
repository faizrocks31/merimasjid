import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDictionary } from "@/i18n";
import { loadReceipt } from "@/modules/receipts/load";
import { buildReceiptView } from "@/modules/receipts/view";
import { renderReceiptPdfChromium } from "@/modules/receipts/pdf-chromium";

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

  const { t } = await getDictionary();
  const url = new URL(request.url);
  const duplicate = url.searchParams.get("duplicate") === "1";

  const view = buildReceiptView(payment, {
    duplicate,
    footerText: t("thankYou"),
    taxNote: t("taxNote"),
  });

  const pdf = await renderReceiptPdfChromium(view, t("taxNote"));
  const filename = `receipt-${payment.receiptNo}${duplicate ? "-duplicate" : ""}.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
