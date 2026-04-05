import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { validateAdminAuth, unauthorizedResponse } from "@/lib/admin-auth";

function normalizeStr(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").trim();
}

// GET: Audit all leads with formsapp_data — check if lead name matches form name
export async function GET(request: NextRequest) {
  if (!validateAdminAuth(request)) return unauthorizedResponse();
  try {
    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    const { data: leads } = await supabase
      .from("leads-calculadora-visionaria")
      .select("id, nome, whatsapp, formsapp_completed, formsapp_data")
      .eq("formsapp_completed", true)
      .order("id", { ascending: true })
      .limit(2000);

    if (!leads) return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });

    const mismatches: { lead_id: number; lead_name: string; lead_whatsapp: string; form_name: string; form_phone: string; form_company: string }[] = [];

    for (const lead of leads) {
      const data = lead.formsapp_data as Record<string, unknown> | null;
      if (!data) continue;

      // Extract form name from formsapp_data
      let formName = "";
      let formPhone = "";
      let formCompany = "";
      const answers = (data.answers || data.fields || data.responses) as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(answers)) {
        for (const a of answers) {
          const title = normalizeStr(String(a.title ?? a.question ?? a.label ?? ""));
          const value = String(a.value ?? a.answer ?? a.response ?? "");
          if (title.includes("nome") && !title.includes("empresa")) formName = value;
          if (title.includes("telefone") || title.includes("whatsapp") || title.includes("phone")) formPhone = value;
          if (title.includes("empresa") || title.includes("company")) formCompany = value;
        }
      }

      if (!formName) continue;

      // Compare lead name vs form name
      const leadNorm = normalizeStr(lead.nome);
      const formNorm = normalizeStr(formName);

      if (leadNorm === formNorm) continue; // exact match, ok

      // Check if first + last name match
      const leadParts = leadNorm.split(/\s+/);
      const formParts = formNorm.split(/\s+/);
      if (leadParts.length >= 2 && formParts.length >= 2) {
        if (leadParts[0] === formParts[0] && leadParts[leadParts.length - 1] === formParts[formParts.length - 1]) continue; // first+last match, ok
      }

      // Check if one contains the other (long enough)
      if ((leadNorm.includes(formNorm) || formNorm.includes(leadNorm)) && Math.min(leadNorm.length, formNorm.length) >= 10) continue;

      // Check phone match
      const leadDigits = (lead.whatsapp || "").replace(/\D/g, "");
      const formDigits = formPhone.replace(/\D/g, "");
      if (leadDigits.length >= 8 && formDigits.length >= 8 && leadDigits.slice(-8) === formDigits.slice(-8)) continue; // phone match, ok

      // This is a potential mismatch
      mismatches.push({
        lead_id: lead.id,
        lead_name: lead.nome,
        lead_whatsapp: lead.whatsapp || "",
        form_name: formName,
        form_phone: formPhone,
        form_company: formCompany,
      });
    }

    return NextResponse.json({
      total_with_formsapp: leads.length,
      potential_mismatches: mismatches.length,
      mismatches,
    });
  } catch (error) {
    console.error("Audit error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST: Unlink a wrong formsapp match from a lead (saves form data to unmatched table)
export async function POST(request: NextRequest) {
  if (!validateAdminAuth(request)) return unauthorizedResponse();
  try {
    const { lead_id } = await request.json();
    if (!lead_id) return NextResponse.json({ error: "lead_id required" }, { status: 400 });

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    // Fetch lead's formsapp_data before unlinking
    const { data: lead } = await supabase
      .from("leads-calculadora-visionaria")
      .select("id, nome, formsapp_data, formsapp_at")
      .eq("id", lead_id)
      .single();

    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    if (!lead.formsapp_data) return NextResponse.json({ error: "Lead has no formsapp_data" }, { status: 400 });

    // Save to unmatched table so it can be re-matched correctly
    const data = lead.formsapp_data as Record<string, unknown>;
    const answers = (data.answers || data.fields || data.responses) as Array<Record<string, unknown>> | undefined;
    let phoneParts: string[] = [];
    let nameValues: string[] = [];
    if (Array.isArray(answers)) {
      for (const a of answers) {
        const title = normalizeStr(String(a.title ?? ""));
        const value = String(a.value ?? "");
        if (title.includes("telefone") || title.includes("phone")) phoneParts.push(value);
        if (title.includes("nome") && !title.includes("empresa") && value.length >= 2 && value.length <= 80) nameValues.push(value);
      }
    }
    const phoneDigits = phoneParts.map(v => v.replace(/\D/g, "")).filter(d => d.length >= 1).join("");

    await supabase.from("formsapp_unmatched").insert({
      payload: lead.formsapp_data,
      phone_digits: phoneDigits || null,
      name_candidates: nameValues.slice(0, 5),
      matched: false,
      created_at: lead.formsapp_at || new Date().toISOString(),
    });

    // Clear formsapp data from lead
    await supabase.from("leads-calculadora-visionaria").update({
      formsapp_completed: false,
      formsapp_data: null,
      formsapp_at: null,
    }).eq("id", lead_id);

    return NextResponse.json({
      status: "ok",
      message: `Unlinked formsapp data from lead ${lead_id} (${lead.nome}). Data saved to unmatched table for re-matching.`,
    });
  } catch (error) {
    console.error("Unlink error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
