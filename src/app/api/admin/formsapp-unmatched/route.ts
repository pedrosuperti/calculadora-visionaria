import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { validateAdminAuth, unauthorizedResponse } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  if (!validateAdminAuth(request)) return unauthorizedResponse();
  try {
    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    const { data: unmatched, error: unmatchedError } = await supabase
      .from("formsapp_unmatched")
      .select("id, phone_digits, name_candidates, matched, matched_lead_id, created_at")
      .order("created_at", { ascending: false });

    if (unmatchedError) {
      // Table might not exist yet
      return NextResponse.json({ unmatched: [], leads: [], error: unmatchedError.message });
    }

    // Also fetch leads that don't have formsapp yet (for manual linking dropdown)
    const { data: leads } = await supabase
      .from("leads-calculadora-visionaria")
      .select("id, nome, whatsapp, formsapp_completed")
      .order("created_at", { ascending: false })
      .limit(500);

    return NextResponse.json({
      unmatched: unmatched || [],
      leads: leads || [],
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
