/**
 * Usage Example — Wire Everything Together
 *
 * This shows how to use validation-registry-template.ts + simple-form-template.tsx
 * in a real Next.js App Router project.
 *
 * File structure:
 *   src/
 *     lib/
 *       validation-registry.ts      <- copy validation-registry-template.ts here
 *       cn.ts                       <- simple className utility (below)
 *     components/
 *       forms/
 *         simple-form.tsx           <- copy simple-form-template.tsx here
 *     modules/
 *       users/
 *         actions.ts                <- server actions
 *     app/
 *       users/
 *         new/
 *           page.tsx                <- client page with form
 */

// ============================================
// 1. src/lib/cn.ts (simple className utility)
// ============================================
// export function cn(...classes: (string | undefined | null | false)[]) {
//   return classes.filter(Boolean).join(" ");
// }

// ============================================
// 2. src/modules/users/actions.ts (server action)
// ============================================
// "use server";
// import { validateForm } from "@/lib/validation-registry";
// import { revalidatePath } from "next/cache";
// import { prisma } from "@/lib/db";
//
// export type UserState = { error?: string; ok?: boolean } | undefined;
//
// export async function createUserAction(_prev: UserState, formData: FormData): Promise<UserState> {
//   const result = validateForm("user", formData);
//
//   if (!result.success) {
//     return { error: result.error.issues[0]?.message ?? "Invalid input" };
//   }
//
//   try {
//     await prisma.user.create({ data: result.data });
//     revalidatePath("/users");
//     return { ok: true };
//   } catch (err) {
//     console.error("createUserAction failed", err);
//     return { error: "Could not create user" };
//   }
// }

// ============================================
// 3. src/app/users/new/page.tsx (client page)
// ============================================
// "use client";
// import { useActionState } from "react";
// import { getFormFields } from "@/lib/validation-registry";
// import { SimpleForm } from "@/components/forms/simple-form";
// import { createUserAction, type UserState } from "@/modules/users/actions";
// import { Button } from "@/components/ui/button";
//
// export default function NewUserPage() {
//   const [state, formAction, pending] = useActionState<UserState, FormData>(createUserAction, undefined);
//
//   const fields = useMemo(() => getFormFields("user"), []);
//
//   const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     formAction(new FormData(e.currentTarget));
//   };
//
//   return (
//     <div className="max-w-xl mx-auto p-6">
//       <h1 className="mb-6 text-2xl font-semibold">Create User</h1>
//
//       <form onSubmit={handleSubmit} className="space-y-4">
//         <SimpleForm fields={fields} values={{}} disabled={pending} fieldsOnly uncontrolled />
//
//         {state?.error && (
//           <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
//             {state.error}
//           </p>
//         )}
//
//         <Button type="submit" className="w-full" disabled={pending}>
//           {pending ? "Creating..." : "Create User"}
//         </Button>
//       </form>
//     </div>
//   );
// }

// ============================================
// 4. Customizing for Your Domain
// ============================================
// Edit src/lib/validation-registry.ts:
//   - Add/remove entities in VALIDATION_RULES.entities
//   - Add explicit Zod schemas (userShape, productShape, etc.) matching your entities
//   - Add schemas to SCHEMAS record
//   - Export types (UserInput, ProductInput, etc.)
//
// The rest (getFormFields, getZodSchema, validateForm, SimpleForm) works automatically!