import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// Manually link an unmatched submission to a lead
export async function POST(request: NextRequest) {
  try {
    const { unmatched_id, lead_id } = await request.json();
    if (!unmatched_id || !lead_id) {
      return NextResponse.json({ error: "unmatched_id and lead_id required" }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    // Fetch the unmatched submission
    const { data: sub, error: subError } = await supabase
      .from("formsapp_unmatched")
      .select("*")
      .eq("id", unmatched_id)
      .single();

    if (subError || !sub) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Update the lead
    const { error: updateError } = await supabase
      .from("leads-calculadora-visionaria")
      .update({
        formsapp_completed: true,
        formsapp_data: sub.payload,
        formsapp_at: sub.created_at,
      })
      .eq("id", lead_id);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update lead: " + updateError.message }, { status: 500 });
    }

    // Mark submission as matched
    await supabase
      .from("formsapp_unmatched")
      .update({
        matched: true,
        matched_lead_id: lead_id,
        matched_at: new Date().toISOString(),
      })
      .eq("id", unmatched_id);

    return NextResponse.json({ status: "ok", lead_id, unmatched_id });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
