import { createPaymentAction } from "@/modules/payments/actions";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    const formData = await request.formData();
    const result = await createPaymentAction(formData);

    if (result.ok) {
      revalidatePath("/dashboard");
      revalidatePath("/transactions");
      revalidatePath("/members");
    }

    return Response.json(result);
  } catch (err) {
    console.error("API payment creation failed:", err);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}