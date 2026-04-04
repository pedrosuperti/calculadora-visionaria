import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { validateAdminAuth, unauthorizedResponse } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  if (!validateAdminAuth(request)) return unauthorizedResponse();
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "DB not configured" }, { status: 503 });
    }

    const { id, contact_status, notes } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Missing lead id" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (contact_status !== undefined) updates.contact_status = contact_status;
    if (notes !== undefined) updates.notes = notes;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const { error } = await supabase
      .from("leads-calculadora-visionaria")
      .update(updates)
      .eq("id", id);

    if (error) {
      console.error("Update lead error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Update lead error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
