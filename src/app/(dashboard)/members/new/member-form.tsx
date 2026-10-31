"use client";

import { useActionState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { createMemberAction, type MemberFormState } from "@/modules/members/actions";
import { getFormFields } from "@/lib/validation";
import { Button, Card, CardBody, CardHeader, CardTitle } from "@/components/ui";
import { SimpleForm } from "@/components/forms/auto-form";

type Labels = Record<string, string>;

// Field order for the new member form
const MEMBER_FIELD_ORDER = [
  "fullName",
  "fatherName",
  "phone",
  "alternatePhone",
  "email",
  "joinDate",
  "address",
  "notes",
  "status",
  "idempotencyKey",
] as const;

function generateIdempotencyKey(): string {
  // Generate a client-side idempotency key
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

export function MemberForm({ labels }: { labels: Labels }) {
  const [state, formAction, pending] = useActionState<MemberFormState, FormData>(createMemberAction, undefined);

  // Generate idempotency key once per form instance
  const idempotencyKey = useMemo(() => generateIdempotencyKey(), []);

  const fields = useMemo(
    () => {
      const allFields = getFormFields("member");
      const fieldMap = new Map(allFields.map((f) => [f.name, f]));

      return MEMBER_FIELD_ORDER.map((name) => {
        const field = fieldMap.get(name);
        if (!field) return null;

        let fieldType = field.type;
        if (field.name === "phone") fieldType = "tel";
        if (field.name === "joinDate") fieldType = "date";

        return {
          ...field,
          label: labels[field.name] ?? field.label,
          type: fieldType,
          // Status should be select with enum options
          ...(field.name === "status" && {
            type: "select" as const,
            options: [
              { value: "ACTIVE", label: labels.active ?? "Active" },
              { value: "INACTIVE", label: labels.inactive ?? "Inactive" },
            ],
            defaultValue: "ACTIVE",
          }),
          // Set the idempotency key as default value
          ...(field.name === "idempotencyKey" && {
            defaultValue: idempotencyKey,
          }),
        };
      }).filter(Boolean) as typeof allFields;
    },
    [labels, idempotencyKey]
  );

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? (
        <p role="alert" className="rounded-lg border border-[#f0cfcf] bg-[var(--danger-soft)] px-3 py-2 text-xs font-medium text-[var(--danger)]">
          {state.error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{labels.memberProfile}</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <SimpleForm fields={fields} values={{}} disabled={pending} fieldsOnly={true} uncontrolled={true} errors={state?.fieldErrors ?? {}} />
        </CardBody>
      </Card>

      <div className="flex items-center justify-between">
        <Link href="/members">
          <Button type="button" variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /> {labels.back}</Button>
        </Link>
        <Button type="submit" disabled={pending}>
          <Save className="h-4 w-4" /> {pending ? labels.loading : labels.save}
        </Button>
      </div>
    </form>
  );
}