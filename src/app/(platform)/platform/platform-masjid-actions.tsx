"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PauseCircle, PlayCircle, Trash2 } from "lucide-react";
import { setMasjidStatusAction, deleteMasjidAction } from "@/modules/platform/actions";
import type { MasjidActionState } from "@/modules/platform/actions";

interface MasjidActionsProps {
  masjidId: string;
  status: string;
}

export function MasjidActions({ masjidId, status }: MasjidActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleStatus(next: "suspend" | "activate") {
    setError(null);
    const fd = new FormData();
    fd.set("masjidId", masjidId);
    fd.set("action", next);
    startTransition(async () => {
      const res = await setMasjidStatusAction(fd);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.set("masjidId", masjidId);
    startTransition(async () => {
      const res = await deleteMasjidAction(fd);
      if (res?.error) {
        setError(res.error);
        setConfirmingDelete(false);
      } else {
        router.push("/platform");
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {status === "ACTIVE" ? (
        <button
          type="button"
          onClick={() => handleStatus("suspend")}
          disabled={pending}
          className="text-[var(--warning)] hover:opacity-70 transition-opacity disabled:opacity-40"
          title="Suspend"
        >
          <PauseCircle className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => handleStatus("activate")}
          disabled={pending}
          className="text-[var(--success)] hover:opacity-70 transition-opacity disabled:opacity-40"
          title="Activate"
        >
          <PlayCircle className="h-4 w-4" />
        </button>
      )}

      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="text-[var(--danger)] hover:opacity-70 transition-opacity disabled:opacity-40"
        title={confirmingDelete ? "Click again to confirm delete" : "Delete"}
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {confirmingDelete ? (
        <span className="text-[11px] font-medium text-[var(--danger)]">Confirm?</span>
      ) : null}

      {error ? <span className="text-[11px] font-medium text-[var(--danger)]">{error}</span> : null}
    </div>
  );
}