import { NextResponse } from "next/server";
import { correctJummaCollectionAction } from "@/modules/jumma/actions";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const result = await correctJummaCollectionAction(formData);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Jumma correction API error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}