"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserMinus, UserCheck } from "lucide-react";
import { setStaffStatusAction } from "@/modules/staff/actions";
import { updateStaffRoleAction } from "@/modules/settings/actions";
import { Badge, Button, Select } from "@/components/ui";

interface StaffMember {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    lastLoginAt: string | null;
  };
  role: string;
  status: "ACTIVE" | "INACTIVE";
  isSelf: boolean;
}

interface StaffListProps {
  members: StaffMember[];
  labels: Record<string, string>;
  roleLabels: Record<string, string>;
  /** When true, hides all action buttons (role dropdown, remove, reactivate) */
  readOnly?: boolean;
}

export function StaffList({ members, labels, roleLabels, readOnly = false }: StaffListProps) {
  const router = useRouter();
  const [openConfirm, setOpenConfirm] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Filter out SUPER_ADMIN from display entirely
  const filteredMembers = members.filter((m) => m.role !== "SUPER_ADMIN");
  const activeStaff = filteredMembers.filter((m) => m.status === "ACTIVE");
  const inactiveStaff = filteredMembers.filter((m) => m.status === "INACTIVE");

  function renderSection(title: string, items: StaffMember[]) {
    if (items.length === 0) return null;

    return (
      <>
        <li className="px-5 py-2 text-[11px] font-medium uppercase tracking-wide text-[var(--ink-muted)]">
          {title}
        </li>
        {items.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="truncate text-sm font-medium">
                  {m.user.name}
                  {m.isSelf ? <span className="text-[11px] font-normal text-[var(--ink-muted)]">({labels.you})</span> : null}
                </p>
                <Badge tone={m.role === "SUPER_ADMIN" ? "warning" : m.role === "ADMIN" ? "brand" : m.role === "COLLECTOR" ? "success" : "neutral"}>
                  {roleLabels[m.role] ?? m.role}
                </Badge>
                <Badge tone={m.status === "ACTIVE" ? "success" : "neutral"}>
                  {m.status === "ACTIVE" ? labels.active : labels.inactive}
                </Badge>
              </div>
              <p className="truncate text-[11px] text-[var(--ink-muted)]">{m.user.email}</p>
              <p className="num text-[11px] text-[var(--ink-muted)]">
                {m.user.lastLoginAt ? `${labels.lastSignIn}: ${new Date(m.user.lastLoginAt).toLocaleDateString()}` : labels.neverSignedIn}
              </p>
            </div>

            {!readOnly && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 flex-wrap min-w-[200px]">
                {/* Role selector — only for non-SUPER_ADMIN, non-self */}
                {m.role !== "SUPER_ADMIN" && !m.isSelf && (
                  <form action={updateStaffRoleAction} className="flex items-center gap-1.5 flex-col sm:flex-row w-full sm:w-auto">
                    <input type="hidden" name="membershipId" value={m.id} />
                    <Select
                      name="role"
                      defaultValue={m.role}
                      className="h-8 w-full sm:w-40 text-xs"
                      aria-label={labels.role}
                      disabled={pending}
                    >
                      <option value="ADMIN">{labels.roleAdmin}</option>
                      <option value="COLLECTOR">{labels.roleCollector}</option>
                      <option value="AUDITOR">{labels.roleAuditor}</option>
                    </Select>
                    <Button type="submit" size="sm" variant="secondary" disabled={pending} className="w-full sm:w-auto">
                      {labels.save}
                    </Button>
                  </form>
                )}

                {/* Remove / Reactivate button */}
                {m.role !== "SUPER_ADMIN" && !m.isSelf && (
                  m.status === "ACTIVE" ? (
                    openConfirm === m.id ? (
                      <div className="rounded-lg border border-[#f0cfcf] bg-[var(--danger-soft)] p-3 w-full sm:w-auto">
                        <p className="mb-2 text-xs font-medium text-[var(--danger)]">
                          {labels.deactivateStaff}: <span className="font-semibold">{m.user.name}</span>
                        </p>
                        <p className="mb-2 text-[11px] text-[var(--ink-muted)]">{labels.deactivateStaffHint}</p>
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            disabled={pending}
                            onClick={() =>
                              startTransition(async () => {
                                const fd = new FormData();
                                fd.set("membershipId", m.id);
                                fd.set("status", "INACTIVE");
                                const res = await setStaffStatusAction(fd);
                                if (res && !res.ok) {
                                  console.error(res.error);
                                }
                                router.refresh();
                              })
                            }
                          >
                            {pending ? labels.loading : labels.yesRemove}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => setOpenConfirm(null)}
                            disabled={pending}
                          >
                            {labels.cancel}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        onClick={() => setOpenConfirm(m.id)}
                        disabled={pending}
                        className="w-full sm:w-auto"
                      >
                        <UserMinus className="h-4 w-4" /> {labels.remove}
                      </Button>
                    )
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        startTransition(async () => {
                          const fd = new FormData();
                          fd.set("membershipId", m.id);
                          fd.set("status", "ACTIVE");
                          const res = await setStaffStatusAction(fd);
                          if (res && !res.ok) {
                            console.error(res.error);
                          }
                          router.refresh();
                        })
                      }
                      disabled={pending}
                      className="w-full sm:w-auto"
                    >
                      <UserCheck className="h-4 w-4" /> {labels.reactivate}
                    </Button>
                  )
                )}
              </div>
            )}
          </li>
        ))}
      </>
    );
  }

  return (
    <ul className="divide-y divide-[var(--border-subtle)]">
      {renderSection(labels.activeStaff, activeStaff)}
      {renderSection(labels.inactiveStaff, inactiveStaff)}
      {members.length === 0 && (
        <li className="px-5 py-8 text-center text-[var(--ink-muted)]">
          <p className="font-medium">{labels.staffEmpty}</p>
          <p className="text-sm mt-1">{labels.staffEmptyHint}</p>
        </li>
      )}
    </ul>
  );
}