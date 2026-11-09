import { NextResponse } from "next/server";
import { recordJummaCollectionAction } from "@/modules/jumma/actions";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const result = await recordJummaCollectionAction(formData);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Jumma record API error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}