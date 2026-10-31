"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createPlanAction, type PlanState } from "@/modules/plans/actions";
import { getFormFields } from "@/lib/validation";
import { Button, Card, CardBody, CardHeader, CardTitle } from "@/components/ui";
import { SimpleForm, MemberSearch } from "@/components/forms/auto-form";
import { parseRupeesToPaise } from "@/lib/money";

export function PlanForm({
  labels,
  members,
  categories,
  initialMemberId,
}: {
  labels: Record<string, string>;
  members: { id: string; memberNo: string; fullName: string; phone: string | null }[];
  categories: { id: string; name: string }[];
  initialMemberId?: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<PlanState, FormData>(createPlanAction, undefined);

  useEffect(() => {
    if (state?.ok) {
      router.push("/plans");
      router.refresh();
    }
  }, [state?.ok, router]);

  const [memberId, setMemberId] = useState(initialMemberId ?? "");

  const fields = useMemo(
    () => getFormFields("plan").map((f) => {
      const mapped = { ...f, label: labels[f.name] ?? f.label };
      if (mapped.name === "categoryId") {
        mapped.options = categories.map((c) => ({ value: c.id, label: c.name }));
      }
      if (mapped.name === "frequency") {
        mapped.options = [
          { value: "MONTHLY", label: labels.monthly ?? "Monthly" },
          { value: "SEMI_ANNUAL", label: labels.semiAnnual ?? "Semi-Annual" },
          { value: "ANNUAL", label: labels.annual ?? "Annual" },
          { value: "ONE_TIME", label: labels.oneTime ?? "One Time" },
        ];
      }
      if (mapped.name === "amountPaise") {
        mapped.type = "decimal";
        mapped.label = `${labels.planAmount ?? "Amount"} (₹)`;
        mapped.placeholder = "500.00";
      }
      // memberId is handled by MemberSearch separately
      return mapped;
    }).filter((f) => f.name !== "memberId"),
    [labels, categories]
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("memberId", memberId);
    const rupees = String(formData.get("amountPaise") ?? "");
    formData.set("amountPaise", String(parseRupeesToPaise(rupees) ?? 0));
    formAction(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardHeader><CardTitle>{labels.plans}</CardTitle></CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <MemberSearch
            members={members}
            value={memberId}
            onChange={setMemberId}
            label={labels.chooseMember}
            placeholder={labels.searchMember || "Search member..."}
          />
          <SimpleForm fields={fields} values={{}} disabled={pending} fieldsOnly={true} uncontrolled={true} />
        </CardBody>
      </Card>

      {state?.error ? (
        <p role="alert" className="rounded-lg border border-[#f0cfcf] bg-[var(--danger-soft)] px-3 py-2 text-xs font-medium text-[var(--danger)]">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center justify-between">
        <Link href="/plans"><Button type="button" variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /> {labels.back}</Button></Link>
        <Button type="submit" disabled={pending || !memberId}><Save className="h-4 w-4" /> {pending ? labels.loading : labels.save}</Button>
      </div>
    </form>
  );
}