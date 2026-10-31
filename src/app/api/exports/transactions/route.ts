import { authorizeFileRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { PAYMENT_MODE_LABELS } from "@/lib/constants";
import { logAudit } from "@/modules/audit/write";

function csvCell(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV export with plain columns and no formulas that could alter totals. */
export async function GET(request: Request) {
  const auth = await authorizeFileRequest(request, "export:data");
  if ("response" in auth) return auth.response;
  const { user } = auth;
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const mode = url.searchParams.get("mode") ?? "";
  const status = url.searchParams.get("status") ?? "";
  const fromRaw = url.searchParams.get("from");
  const toRaw = url.searchParams.get("to");
  const from = fromRaw ? new Date(`${fromRaw}T00:00:00+05:30`) : undefined;
  const to = toRaw ? new Date(`${toRaw}T23:59:59+05:30`) : undefined;

  const payments = await prisma.payment.findMany({
    where: {
      masjidId: user.masjidId!,
      ...(mode ? { mode } : {}),
      ...(status ? { status } : {}),
      ...(from || to ? { paymentDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      ...(q
        ? { OR: [{ receiptNo: { contains: q } }, { donorNameSnapshot: { contains: q } }, { referenceNo: { contains: q } }] }
        : {}),
    },
    orderBy: { paymentDate: "desc" },
    include: {
      donorMember: { select: { memberNo: true } },
      enteredByUser: { select: { name: true } },
      allocations: { include: { category: { select: { name: true } } } },
    },
    take: 20000,
  });

  const header = [
    "Receipt No", "Date", "Member No", "Donor", "Category", "Amount INR",
    "Mode", "Reference", "Verification", "Collector", "Status", "Notes",
  ];

  const rows = payments.map((p) => [
    p.receiptNo,
    formatDate(p.paymentDate),
    p.donorMember?.memberNo ?? "",
    p.donorNameSnapshot,
    p.allocations.map((a) => a.category.name).join("; "),
    (p.amountPaise / 100).toFixed(2),
    PAYMENT_MODE_LABELS[p.mode] ?? p.mode,
    p.referenceNo ?? "",
    p.verificationStatus === "VERIFIED" ? "Verified" : "Manually recorded",
    p.enteredByUser.name,
    p.status === "SUCCESS" ? "Successful" : "Reversed",
    p.notes ?? "",
  ]);

  const body = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  // UTF-8 BOM so Excel renders the rupee/Devanagari text correctly.
  const withBom = `﻿${body}`;
  const filename = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;

  // Sensitive exports are logged: who exported what range and how many rows.
  await logAudit({
    masjidId: user.masjidId,
    actorUserId: user.id,
    action: "export.transactions",
    entityType: "Payment",
    metadata: { rows: payments.length, from: fromRaw, to: toRaw, mode, status, q },
  });

  return new Response(withBom, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
