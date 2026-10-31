"use client";

import { useRouter } from "next/navigation";
import { ContributionCategoryForm } from "../../../settings-forms";

export function ContributionCategoryFormClient({
  labels,
  editingCategory,
}: {
  labels: Record<string, string>;
  editingCategory: {
    id: string;
    name: string;
    code: string;
    restrictedPurpose: boolean;
    reportingGroup: string | null;
  };
}) {
  const router = useRouter();

  return (
    <ContributionCategoryForm
      labels={labels}
      editingCategory={editingCategory}
      onCancel={() => router.push("/settings?tab=contributionCategories")}
      redirectTo="/settings?tab=contributionCategories"
    />
  );
}
