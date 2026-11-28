"use client";

import { Button } from "@/components/ui";
import { approveExpenseAction } from "@/modules/expenses/actions";
import { useTransition } from "react";

interface ExpenseActionsProps {
  expenseId: string;
  decision: "APPROVED" | "REJECTED";
  label: string;
  variant: "secondary" | "ghost";
  disabled?: boolean;
}

export function ExpenseActions({ expenseId, decision, label, variant, disabled = false }: ExpenseActionsProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant={variant}
      disabled={disabled || isPending}
      onClick={() => {
        startTransition(async () => {
          const fd = new FormData();
          fd.set("expenseId", expenseId);
          fd.set("decision", decision);
          await approveExpenseAction(fd);
        });
      }}
    >
      {isPending ? "..." : label}
    </Button>
  );
}