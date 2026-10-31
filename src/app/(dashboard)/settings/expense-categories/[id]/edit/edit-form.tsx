"use client";

import { useRouter } from "next/navigation";
import { ExpenseCategoryForm } from "../../../settings-forms";

export function ExpenseCategoryFormClient({
  labels,
  editingCategory,
}: {
  labels: Record<string, string>;
  editingCategory: {
    id: string;
    name: string;
    active: boolean;
  };
}) {
  const router = useRouter();

  return (
    <ExpenseCategoryForm
      labels={labels}
      editingCategory={editingCategory}
      onCancel={() => router.push("/settings?tab=expenseCategories")}
      redirectTo="/settings?tab=expenseCategories"
    />
  );
}
