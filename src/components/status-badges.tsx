import { Badge } from "@/components/ui";

const PERIOD: Record<string, { tone: "success" | "warning" | "neutral" | "brand"; label: string }> = {
  PENDING: { tone: "neutral", label: "Pending" },
  PARTIAL: { tone: "warning", label: "Partially paid" },
  PAID: { tone: "success", label: "Paid" },
  WAIVED: { tone: "brand", label: "Waived" },
};

const PAYMENT: Record<string, { tone: "success" | "danger" | "neutral"; label: string }> = {
  SUCCESS: { tone: "success", label: "Successful" },
  REVERSED: { tone: "danger", label: "Reversed" },
};

const EXPENSE: Record<string, { tone: "success" | "warning" | "danger"; label: string }> = {
  PENDING: { tone: "warning", label: "Pending approval" },
  APPROVED: { tone: "success", label: "Approved" },
  REJECTED: { tone: "danger", label: "Rejected" },
};

const MEMBER: Record<string, { tone: "success" | "neutral"; label: string }> = {
  ACTIVE: { tone: "success", label: "Active" },
  INACTIVE: { tone: "neutral", label: "Inactive" },
};

const VERIFICATION: Record<string, { tone: "success" | "neutral"; label: string }> = {
  VERIFIED: { tone: "success", label: "Verified" },
  MANUAL: { tone: "neutral", label: "Manually recorded" },
};

function pick(map: Record<string, { tone: "success" | "warning" | "danger" | "neutral" | "brand"; label: string }>, value: string) {
  return map[value] ?? { tone: "neutral" as const, label: value };
}

export function PeriodStatusBadge({ status }: { status: string }) {
  const v = pick(PERIOD, status);
  return <Badge tone={v.tone}>{v.label}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const v = pick(PAYMENT, status);
  return <Badge tone={v.tone}>{v.label}</Badge>;
}

export function ExpenseStatusBadge({ status }: { status: string }) {
  const v = pick(EXPENSE, status);
  return <Badge tone={v.tone}>{v.label}</Badge>;
}

export function MemberStatusBadge({ status }: { status: string }) {
  const v = pick(MEMBER, status);
  return <Badge tone={v.tone}>{v.label}</Badge>;
}

export function VerificationBadge({ status }: { status: string }) {
  const v = pick(VERIFICATION, status);
  return <Badge tone={v.tone}>{v.label}</Badge>;
}
