"use server";

import QRCode from "qrcode";
import { prisma } from "@/lib/db";

export interface UPIQRData {
  upiId: string;
  amount: number; // in paise
  payeeName: string;
  note: string;
}

export interface ReviewPaymentData {
  memberId: string;
  walkInName: string;
  paymentDate: string;
  amountPaise: number;
  mode: "CASH" | "UPI" | "BANK_TRANSFER" | "OTHER";
  referenceNo: string;
  verificationStatus: "MANUAL" | "VERIFIED";
  notes: string;
  idempotencyKey: string;
  allocations: Array<{
    duesPeriodId: string;
    categoryId: string;
    amountPaise: number;
    purposeNote: string;
  }>;
}

/**
 * Generate QR code as base64 data URL
 */
export async function generateQRCodeDataUrl(upiUrl: string): Promise<string> {
  return QRCode.toDataURL(upiUrl, {
    width: 300,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
}

/**
 * Get staff UPI ID for the current masjid (prefer collectors/admins)
 */
export async function getStaffUPIForMasjid(masjidId: string): Promise<string | null> {
  const staff = await prisma.masjidUser.findMany({
    where: {
      masjidId,
      status: "ACTIVE",
      role: { in: ["ADMIN", "COLLECTOR", "SUPER_ADMIN"] },
    },
    include: {
      user: { select: { upiId: true, name: true } },
    },
    orderBy: { role: "asc" }, // ADMIN first, then COLLECTOR
    take: 1,
  });

  if (staff.length > 0 && staff[0].user.upiId) {
    return staff[0].user.upiId;
  }
  return null;
}

/**
 * Build payment review data from form data
 */
export async function buildPaymentReviewData(formData: FormData): Promise<ReviewPaymentData> {
  const allocationJson = String(formData.get("allocations") ?? "[]");
  let allocations: unknown = [];
  try {
    allocations = JSON.parse(allocationJson);
  } catch {
    allocations = [];
  }

  return {
    memberId: String(formData.get("memberId") ?? ""),
    walkInName: String(formData.get("walkInName") ?? ""),
    paymentDate: String(formData.get("paymentDate") ?? ""),
    amountPaise: Number(formData.get("amountPaise") ?? 0),
    mode: String(formData.get("mode") ?? "CASH") as "CASH" | "UPI" | "BANK_TRANSFER" | "OTHER",
    referenceNo: String(formData.get("referenceNo") ?? ""),
    verificationStatus: String(formData.get("verificationStatus") ?? "MANUAL") as "MANUAL" | "VERIFIED",
    notes: String(formData.get("notes") ?? ""),
    idempotencyKey: String(formData.get("idempotencyKey") ?? ""),
    allocations: allocations as ReviewPaymentData["allocations"],
  };
}