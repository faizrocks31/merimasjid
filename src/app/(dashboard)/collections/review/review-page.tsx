"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useTransition, useCallback, useMemo, useRef } from "react";
import { ArrowLeft, Check, Loader2, QrCode, AlertCircle, HandCoins } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatPaise } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { Button, Card, CardBody, CardHeader, CardTitle, Field, Badge } from "@/components/ui";
import QRCode from "qrcode";

type Labels = Record<string, string>;

type Allocation = {
  key: string;
  duesPeriodId: string;
  collectionEventId: string;
  categoryId: string;
  categoryName: string;
  amount: string;
};

type MemberOption = { id: string; memberNo: string; fullName: string; phone: string | null };
type CategoryOption = { id: string; name: string; code: string; restrictedPurpose: boolean };

interface PaymentReviewPageProps {
  labels: Labels;
  members: MemberOption[];
  categories: CategoryOption[];
  initialMemberId?: string;
  staffUpiId: string | null;
  staffName: string;
}

export function PaymentReviewPage({
  labels,
  members,
  categories,
  initialMemberId,
  staffUpiId,
  staffName,
}: PaymentReviewPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const qrGeneratedRef = useRef<string | null>(null);

  // Generate ID outside of render
  const generateIdempotencyKey = useCallback((): string => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }, []);

  // Parse URL params once on mount using useMemo to avoid useEffect setState issues
  const initialState = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    const amountFromUrl = params.get("amount") ?? "";
    const memberIdFromUrl = params.get("memberId") ?? "";
    const walkInFromUrl = params.get("walkInName") ?? "";
    const modeFromUrl = params.get("mode") ?? "CASH";
    const dateFromUrl = params.get("paymentDate") ?? "";
    const notesFromUrl = params.get("notes") ?? "";
    const allocationsFromUrl = params.get("allocations") ?? "";
    const keyFromUrl = params.get("idempotencyKey") ?? "";

    let parsedAllocations: Allocation[] = [];
    if (allocationsFromUrl) {
      try {
        const parsed = JSON.parse(allocationsFromUrl);
        parsedAllocations = parsed.map((a: Record<string, string>, i: number) => ({
          key: a.key || `a${i}`,
          duesPeriodId: a.duesPeriodId || "",
          collectionEventId: a.collectionEventId || "",
          categoryId: a.categoryId,
          categoryName: categories.find((c) => c.id === a.categoryId)?.name ?? a.categoryId,
          amount: a.amountPaise ? (Number(a.amountPaise) / 100).toFixed(2) : "",
        }));
      } catch {
        // Ignore parse errors
      }
    }

    return {
      memberId: memberIdFromUrl || initialMemberId || "",
      walkIn: walkInFromUrl,
      amount: amountFromUrl,
      mode: modeFromUrl,
      paymentDate: dateFromUrl,
      notes: notesFromUrl,
      allocations: parsedAllocations,
      idempotencyKey: keyFromUrl || generateIdempotencyKey(),
    };
  }, [searchParams, categories, initialMemberId, generateIdempotencyKey]);

  // Use initialState directly for read-only form fields
  const {
    memberId,
    walkIn,
    amount,
    mode,
    paymentDate,
    notes,
    allocations,
    idempotencyKey,
  } = initialState;

  // Generate QR code when mode changes to UPI
  const generateQrCode = useCallback(async () => {
    if (!staffUpiId || mode !== "UPI") {
      setQrCodeDataUrl(null);
      qrGeneratedRef.current = null;
      return;
    }
    const member = members.find((m) => m.id === memberId);
    const amountPaise = Math.round(parseFloat(amount || "0") * 100);
    if (amountPaise <= 0) {
      setQrCodeDataUrl(null);
      qrGeneratedRef.current = null;
      return;
    }
    const donorName = member?.fullName ?? walkIn ?? "Anonymous Donor";
    try {
      const upiUrl = `upi://pay?pa=${encodeURIComponent(staffUpiId)}&pn=${encodeURIComponent(staffName)}&am=${(amountPaise / 100).toFixed(2)}&cu=INR&tn=${encodeURIComponent(notes || "Masjid Contribution")}`;
      const dataUrl = await QRCode.toDataURL(upiUrl, {
        width: 300,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
      setQrCodeDataUrl(dataUrl);
      qrGeneratedRef.current = `${mode}-${amount}-${staffUpiId}-${donorName}-${notes}`;
    } catch (err) {
      console.error("Failed to generate QR code:", err);
      setQrCodeDataUrl(null);
      qrGeneratedRef.current = null;
    }
  }, [staffUpiId, staffName, memberId, amount, walkIn, notes, members, mode]);

  // Trigger QR code generation when relevant values change - use ref to avoid redundant generations
  useEffect(() => {
    const currentKey = `${mode}-${amount}-${staffUpiId}-${staffName}-${memberId}-${walkIn}-${notes}`;
    if (mode === "UPI" && staffUpiId && qrGeneratedRef.current !== currentKey) {
      generateQrCode();
    }
    // generateQrCode handles clearing the QR code when mode !== "UPI" or other conditions
  }, [mode, amount, staffUpiId, staffName, memberId, walkIn, notes, generateQrCode]);

  // Compute derived values
  const member = members.find((m) => m.id === memberId);
  const amountPaise = Math.round(parseFloat(amount || "0") * 100);
  const allocatedPaise = allocations.reduce((sum, a) => sum + Math.round(parseFloat(a.amount || "0") * 100), 0);
  const remaining = amountPaise - allocatedPaise;

  function goBack() {
    router.push("/collections/new");
  }

  function confirmAndSubmit() {
    setError(null);

    if (amountPaise <= 0) {
      setError(labels.amount + ": " + labels.required);
      return;
    }
    if (!memberId && !walkIn.trim()) {
      setError(labels.chooseMember);
      return;
    }
    if (allocatedPaise > amountPaise) {
      setError(`${labels.allocated} > ${labels.amount}`);
      return;
    }

    const payload = allocations
      .filter((a) => a.categoryId)
      .map((a) => ({
        duesPeriodId: a.duesPeriodId || "",
        categoryId: a.categoryId,
        amountPaise: Math.round(parseFloat(a.amount || "0") * 100),
        purposeNote: "",
      }))
      .filter((a) => a.amountPaise > 0);

    if (payload.length === 0) {
      if (!memberId) {
        setError(labels.addAllocationForWalkIn || (labels.chooseCategory + " " + labels.orAddAllocation));
      } else {
        setError(labels.chooseCategory);
      }
      return;
    }

    if (mode === "UPI" && !staffUpiId) {
      setError("Staff UPI ID is not configured. Please contact admin.");
      return;
    }

    const formData = new FormData();
    formData.set("memberId", memberId);
    formData.set("walkInName", walkIn);
    formData.set("paymentDate", paymentDate);
    formData.set("amountPaise", String(amountPaise));
    formData.set("mode", mode);
    formData.set("notes", notes);
    formData.set("idempotencyKey", idempotencyKey);
    formData.set("allocations", JSON.stringify(payload));

    startTransition(async () => {
      try {
        const response = await fetch("/api/payments/create", {
          method: "POST",
          body: formData,
        });
        const result = await response.json();
        if (!result.ok) {
          setError(result.error);
          return;
        }
        router.push(`/receipts/${result.paymentId}?issued=1${result.duplicate ? "&duplicate=1" : ""}`);
      } catch {
        setError(labels.errorGeneric);
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Back button and header */}
      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" size="sm" onClick={goBack}>
          <ArrowLeft className="h-4 w-4" /> {labels.back}
        </Button>
        <h1 className="text-xl font-semibold">{labels.reviewPayment || "Review Payment"}</h1>
        <div className="w-20" />
      </div>

      {/* Review Card */}
      <Card>
        <CardHeader>
          <CardTitle>{labels.reviewDetails || "Review Details"}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={labels.receivedFrom} htmlFor="review-donor">
              <div id="review-donor" className="p-2 bg-[var(--surface)] rounded-lg text-sm">
                {member ? (
                  <>
                    <p className="font-medium">{member.fullName}</p>
                    <p className="text-[11px] text-[var(--ink-muted)]">{member.memberNo}{member.phone ? ` · ${member.phone}` : ""}</p>
                  </>
                ) : (
                  <>
                    <p className="font-medium">{walkIn || "—"}</p>
                    <p className="text-[11px] text-[var(--ink-muted)]">{labels.walkInDonor}</p>
                  </>
                )}
              </div>
            </Field>

            <Field label={`${labels.amount} (₹)`} htmlFor="review-amount">
              <div id="review-amount" className="p-2 bg-[var(--surface)] rounded-lg text-sm num font-medium text-lg">
                {formatPaise(amountPaise)}
              </div>
            </Field>

            <Field label={labels.mode} htmlFor="review-mode">
              <div id="review-mode" className="p-2 bg-[var(--surface)] rounded-lg text-sm">
                <Badge tone={mode === "CASH" ? "success" : mode === "UPI" ? "brand" : "neutral"}>{mode}</Badge>
              </div>
            </Field>

            <Field label={labels.date} htmlFor="review-date">
              <div id="review-date" className="p-2 bg-[var(--surface)] rounded-lg text-sm num">
                {paymentDate ? formatDate(paymentDate) : "—"}
              </div>
            </Field>
          </div>

          {/* Allocations */}
          {allocations.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-medium uppercase tracking-wide text-[var(--ink-muted)]">{labels.allocations}</h4>
              <div className="space-y-2">
                {allocations.map((a) => (
                  <div key={a.key} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border-subtle)] p-3 bg-[var(--surface)]">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-[var(--success)]" />
                      <div>
                        <p className="text-sm font-medium">{a.categoryName}</p>
                        <p className="text-[11px] text-[var(--ink-muted)]">
                          {a.collectionEventId ? `Event: ${a.collectionEventId.slice(0, 8)}...` : a.duesPeriodId ? `Period: ${a.duesPeriodId.slice(0, 8)}...` : "General"}
                        </p>
                      </div>
                    </div>
                    <span className="num text-sm font-semibold">{formatPaise(Math.round(parseFloat(a.amount || "0") * 100))}</span>
                  </div>
                ))}
              </div>
              {remaining !== 0 && (
                <div className="mt-2 flex justify-end text-sm">
                  <span className={cn("font-medium", remaining < 0 ? "text-[var(--danger)]" : "text-[var(--warning)]")}>
                    {remaining < 0 ? "Over" : "Unallocated"}: {formatPaise(Math.abs(remaining))}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {notes && (
            <Field label={labels.notes} htmlFor="review-notes">
              <div id="review-notes" className="p-2 bg-[var(--surface)] rounded-lg text-sm whitespace-pre-line">
                {notes}
              </div>
            </Field>
          )}

          {/* UPI QR Code Section */}
          {mode === "UPI" && amountPaise > 0 && (
            <div className="border-t border-[var(--border-subtle)] pt-4">
              <h4 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--ink-muted)] flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                {labels.upiQrCode || "UPI QR Code"}
              </h4>
              <div className="space-y-3">
                {staffUpiId ? (
                  <>
                    <p className="text-sm text-[var(--ink-muted)]">
                      {labels.collectorUpiId || "Collector UPI ID"}: <span className="font-mono text-[var(--ink)]">{staffUpiId}</span>
                    </p>
                    <p className="text-sm text-[var(--ink-muted)]">
                      {labels.amountToPay || "Amount to pay"}: <span className="font-semibold">{formatPaise(amountPaise)}</span>
                    </p>
                    {qrCodeDataUrl ? (
                      <div className="flex flex-col items-center gap-3 p-4 bg-white rounded-lg border border-[var(--border-subtle)]">
                        <img src={qrCodeDataUrl} alt="UPI QR Code" className="w-64 h-64" />
                        <p className="text-[11px] text-[var(--ink-muted)] text-center">
                          {labels.scanToPay || "Scan with any UPI app to pay"}
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-[var(--ink-muted)]">
                          <span className="px-2 py-1 bg-[var(--surface)] rounded border border-[var(--border-subtle)] font-mono">{staffUpiId}</span>
                          <span className="px-2 py-1 bg-[var(--surface)] rounded border border-[var(--border-subtle)] num">{formatPaise(amountPaise)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-8 text-sm text-[var(--ink-muted)]">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {labels.generatingQr || "Generating QR code..."}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-4 bg-[var(--warning-soft)] border border-[var(--warning)] rounded-lg text-sm text-[var(--warning)]">
                    <AlertCircle className="h-4 w-4 inline-block mr-2" />
                    {labels.noStaffUpiConfigured || "No staff member with UPI ID found. Please add UPI ID to a Collector or Admin in Staff settings."}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <p role="alert" className="rounded-lg border border-[#f0cfcf] bg-[var(--danger-soft)] px-3 py-2 text-[11px] font-medium text-[var(--danger)]">
              {error}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border-subtle)]">
            <Button type="button" variant="secondary" size="sm" onClick={goBack}>
              <ArrowLeft className="h-4 w-4" /> {labels.back}
            </Button>
            <Button type="button" onClick={confirmAndSubmit} disabled={pending} className="ml-auto">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <HandCoins className="h-4 w-4" />}
              {pending ? labels.loading : labels.confirmPayment}
            </Button>
          </div>

          <p className="flex items-start gap-1.5 text-[10px] text-[var(--ink-muted)]">
            <Check className="mt-0.5 h-3 w-3 shrink-0" />
            {labels.idempotencyNote}
          </p>
        </CardBody>
      </Card>
    </div>
  );
}