import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { validateAdminAuth, unauthorizedResponse } from "@/lib/admin-auth";
import { randomBytes } from "crypto";

// POST: Generate share_token for all leads that don't have one
export async function POST(request: NextRequest) {
  if (!validateAdminAuth(request)) return unauthorizedResponse();
  try {
    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    const { data: leads, error } = await supabase
      .from("leads-calculadora-visionaria")
      .select("id")
      .or("share_token.is.null,share_token.eq.");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!leads || leads.length === 0) return NextResponse.json({ status: "ok", updated: 0 });

    let updated = 0;
    for (const lead of leads) {
      const token = randomBytes(12).toString("hex");
      const { error: updateError } = await supabase
        .from("leads-calculadora-visionaria")
        .update({ share_token: token })
        .eq("id", lead.id);
      if (!updateError) updated++;
    }

    return NextResponse.json({ status: "ok", updated, total: leads.length });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
