import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { validateAdminAuth, unauthorizedResponse } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  if (!validateAdminAuth(request)) return unauthorizedResponse();
  try {
    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    // Count leads with formsapp_completed
    const { count: totalLeads } = await supabase
      .from("leads-calculadora-visionaria")
      .select("*", { count: "exact", head: true });

    const { count: completedLeads } = await supabase
      .from("leads-calculadora-visionaria")
      .select("*", { count: "exact", head: true })
      .eq("formsapp_completed", true);

    // Count unmatched
    const { data: unmatchedData, error: unmatchedErr } = await supabase
      .from("formsapp_unmatched")
      .select("id, matched, phone_digits, name_candidates, created_at")
      .order("created_at", { ascending: false });

    const unmatched = unmatchedData || [];
    const unmatchedPending = unmatched.filter((u) => !u.matched);
    const unmatchedDone = unmatched.filter((u) => u.matched);

    // Get leads WITHOUT formsapp, to see how many could still be matched
    const { data: leadsWithout } = await supabase
      .from("leads-calculadora-visionaria")
      .select("id, nome, whatsapp")
      .or("formsapp_completed.is.null,formsapp_completed.eq.false")
      .order("created_at", { ascending: false })
      .limit(500);

    return NextResponse.json({
      total_leads: totalLeads || 0,
      leads_with_formsapp: completedLeads || 0,
      leads_without_formsapp: (totalLeads || 0) - (completedLeads || 0),
      unmatched_total: unmatched.length,
      unmatched_pending: unmatchedPending.length,
      unmatched_already_linked: unmatchedDone.length,
      pending_details: unmatchedPending.map((u) => ({
        id: u.id,
        phone: u.phone_digits || "—",
        names: (u.name_candidates || []).slice(0, 2),
        date: u.created_at,
      })),
      leads_available_for_linking: (leadsWithout || []).length,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
