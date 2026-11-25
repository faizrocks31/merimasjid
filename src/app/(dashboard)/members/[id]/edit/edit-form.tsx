"use client";

import { useActionState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { updateMemberAction, type MemberFormState } from "@/modules/members/actions";
import { getFormFields } from "@/lib/validation";
import { Button, Card, CardBody, CardHeader, CardTitle } from "@/components/ui";
import { SimpleForm } from "@/components/forms/auto-form";
import { dateInput } from "@/lib/form-date";

type Labels = Record<string, string>;

type Member = {
  id: string;
  fullName: string;
  fatherName: string | null;
  phone: string | null;
  alternatePhone: string | null;
  email: string | null;
  address: string | null;
  joinDate: string;
  status: string;
  notes: string | null;
  idempotencyKey: string | null;
};

function generateIdempotencyKey(): string {
  // Generate a client-side idempotency key
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

export function EditMemberForm({ member, labels }: { member: Member; labels: Labels }) {
  const [state, formAction, pending] = useActionState<MemberFormState, FormData>(updateMemberAction, undefined);

  // Generate idempotency key for this edit submission
  const idempotencyKey = useMemo(() => generateIdempotencyKey(), []);

  const fields = useMemo(
    () => getFormFields("member").map((f) => ({
      ...f,
      label: labels[f.name] ?? f.label,
      // Override default values from the member object
      defaultValue: (() => {
        switch (f.name) {
          case "fullName": return member.fullName;
          case "fatherName": return member.fatherName ?? "";
          case "phone": return member.phone ?? "";
          case "alternatePhone": return member.alternatePhone ?? "";
          case "email": return member.email ?? "";
          case "address": return member.address ?? "";
          case "joinDate": return dateInput(member.joinDate);
          case "status": return member.status;
          case "notes": return member.notes ?? "";
          case "idempotencyKey": return idempotencyKey;
          default: return f.defaultValue;
        }
      })(),
    })),
    [labels, member, idempotencyKey]
  );

  // Filter out portal-related fields for edit form
  const profileFields = fields.filter(f =>
    !["createPortalAccount", "portalEmail", "portalPassword"].includes(f.name)
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="memberId" value={member.id} />
      {state?.error ? (
        <p role="alert" className="rounded-lg border border-[#f0cfcf] bg-[var(--danger-soft)] px-3 py-2 text-xs font-medium text-[var(--danger)]">
          {state.error}
        </p>
      ) : null}

      <Card>
        <CardHeader><CardTitle>{labels.memberProfile}</CardTitle></CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <SimpleForm fields={profileFields} values={{}} disabled={pending} fieldsOnly={true} uncontrolled={true} errors={state?.fieldErrors ?? {}} />
        </CardBody>
      </Card>

      <div className="flex items-center justify-between">
        <Link href={`/members/${member.id}`}>
          <Button type="button" variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /> {labels.back}</Button>
        </Link>
        <Button type="submit" disabled={pending}>
          <Save className="h-4 w-4" /> {pending ? labels.loading : labels.save}
        </Button>
      </div>
    </form>
  );
}