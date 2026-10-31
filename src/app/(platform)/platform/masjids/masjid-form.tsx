"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import {
  createMasjidAction,
  updateMasjidAction,
  type MasjidActionState,
} from "@/modules/platform/actions";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";

interface MasjidFormValues {
  id: string;
  name: string;
  slug: string;
  receiptPrefix: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  financialYearStartMonth: number;
  receiptFooter: string | null;
  status: string;
}

const MONTHS = [
  ["1", "January"], ["2", "February"], ["3", "March"], ["4", "April"],
  ["5", "May"], ["6", "June"], ["7", "July"], ["8", "August"],
  ["9", "September"], ["10", "October"], ["11", "November"], ["12", "December"],
];

function createMasjidActionWrapper(_prev: MasjidActionState, formData: FormData): Promise<MasjidActionState> {
  return createMasjidAction(undefined, formData);
}

function updateMasjidActionWrapper(_prev: MasjidActionState, formData: FormData): Promise<MasjidActionState> {
  return updateMasjidAction(undefined, formData);
}

export function PlatformMasjidForm({ masjid }: { masjid?: MasjidFormValues }) {
  const router = useRouter();
  const isEdit = Boolean(masjid);
  const [state, formAction, pending] = useActionState(
    isEdit ? updateMasjidActionWrapper : createMasjidActionWrapper,
    undefined,
  );

  const backHref = isEdit ? `/platform/masjids/${masjid!.id}` : "/platform";

  return (
    <form action={formAction} className="space-y-5 p-5">
      {isEdit ? <input type="hidden" name="masjidId" value={masjid!.id} /> : null}

      {state?.error ? (
        <p
          role="alert"
          className="rounded-lg border border-[#f0cfcf] bg-[var(--danger-soft)] px-3 py-2 text-[11px] font-medium text-[var(--danger)]"
        >
          {state.error}
        </p>
      ) : null}

      <Field label="Masjid Name" htmlFor="name">
        <Input id="name" name="name" required maxLength={200} defaultValue={masjid?.name ?? ""} placeholder="e.g., Madina Masjid" autoFocus />
      </Field>

      <Field label="Slug" htmlFor="slug">
        <Input id="slug" name="slug" required defaultValue={masjid?.slug ?? ""} placeholder="e.g., madina-masjid" />
        <p className="text-[11px] text-[var(--ink-muted)]">URL-friendly identifier (lowercase, hyphens only)</p>
      </Field>

      <Field label="Receipt Prefix" htmlFor="receiptPrefix">
        <Input
          id="receiptPrefix"
          name="receiptPrefix"
          required
          maxLength={8}
          minLength={2}
          defaultValue={masjid?.receiptPrefix ?? ""}
          placeholder="MMA"
        />
        <p className="text-[11px] text-[var(--ink-muted)]">2-8 uppercase letters/digits for receipt numbers</p>
      </Field>

      <Field label="Address" htmlFor="address">
        <Textarea id="address" name="address" rows={3} defaultValue={masjid?.address ?? ""} placeholder="Full address" />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Phone" htmlFor="phone">
          <Input id="phone" name="phone" type="tel" defaultValue={masjid?.phone ?? ""} placeholder="+91 98765 43210" />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" defaultValue={masjid?.email ?? ""} placeholder="masjid@example.com" />
        </Field>
      </div>

      <Field label="Financial Year Start Month" htmlFor="financialYearStartMonth">
        <Select
          id="financialYearStartMonth"
          name="financialYearStartMonth"
          defaultValue={String(masjid?.financialYearStartMonth ?? 4)}
        >
          {MONTHS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Receipt Footer" htmlFor="receiptFooter">
        <Textarea
          id="receiptFooter"
          name="receiptFooter"
          rows={2}
          defaultValue={masjid?.receiptFooter ?? ""}
          placeholder="Jazak Allah Khair for your contribution."
        />
      </Field>

      {isEdit ? (
        <Field label="Status" htmlFor="status">
          <Select id="status" name="status" defaultValue={masjid!.status ?? "ACTIVE"}>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </Select>
        </Field>
      ) : null}

      <div className="flex justify-end gap-3 border-t border-[var(--border-subtle)] pt-4">
        <a href={backHref}>
          <Button type="button" variant="secondary">
            <ArrowLeft className="h-4 w-4" /> Cancel
          </Button>
        </a>
        <Button type="submit" disabled={pending}>
          <Save className="h-4 w-4" /> {isEdit ? "Save Changes" : "Create Masjid"}
        </Button>
      </div>
    </form>
  );
}
