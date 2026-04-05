import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { validateAdminAuth, unauthorizedResponse } from "@/lib/admin-auth";

function normalizeStr(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").trim();
}

function matchPhone(phoneDigits: string, leadWhatsapp: string): boolean {
  const leadDigits = (leadWhatsapp || "").replace(/\D/g, "");
  if (leadDigits.length < 8 || phoneDigits.length < 8) return false;
  if (phoneDigits.slice(-8) === leadDigits.slice(-8)) return true;
  if (phoneDigits.length >= 9 && leadDigits.length >= 9 && phoneDigits.slice(-9) === leadDigits.slice(-9)) return true;
  return false;
}

function matchName(formNames: string[], leadNome: string): boolean {
  const leadNorm = normalizeStr(leadNome);
  if (leadNorm.length < 2) return false;
  const leadParts = leadNorm.split(/\s+/);
  for (const name of formNames) {
    const formNorm = normalizeStr(name);
    if (formNorm.length < 2) continue;
    if (formNorm === leadNorm) return true;
    const formParts = formNorm.split(/\s+/);
    if (leadParts.length >= 2 && formParts.length >= 2) {
      const firstMatch = formParts[0] === leadParts[0] && formParts[0].length >= 3;
      const lastMatch = formParts[formParts.length - 1] === leadParts[leadParts.length - 1] && formParts[formParts.length - 1].length >= 3;
      if (firstMatch && lastMatch) return true;
    }
    if ((leadNorm.includes(formNorm) || formNorm.includes(leadNorm)) && Math.min(formNorm.length, leadNorm.length) >= 10) return true;
  }
  return false;
}

function extractFromAnswers(data: Record<string, unknown>): { formName: string; formPhone: string; formCompany: string; nameValues: string[]; phoneDigits: string } {
  let formName = "";
  let formPhone = "";
  let formCompany = "";
  const nameValues: string[] = [];
  const phoneParts: string[] = [];

  const answers = (data.answers || data.fields || data.responses) as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(answers)) {
    for (const a of answers) {
      const title = normalizeStr(String(a.title ?? a.question ?? a.label ?? ""));
      const value = String(a.value ?? a.answer ?? a.response ?? "");
      if (title.includes("nome") && !title.includes("empresa")) { formName = value; if (value.length >= 2 && value.length <= 80) nameValues.push(value); }
      if (title.includes("telefone") || title.includes("whatsapp") || title.includes("phone")) { formPhone = value; phoneParts.push(value); }
      if (title.includes("empresa") || title.includes("company")) formCompany = value;
    }
  }

  const phoneDigits = phoneParts.map(v => v.replace(/\D/g, "")).filter(d => d.length >= 1).join("");
  return { formName, formPhone, formCompany, nameValues, phoneDigits };
}

// POST: Full automated fix — audit, unlink mismatches, re-sync
export async function POST(request: NextRequest) {
  if (!validateAdminAuth(request)) return unauthorizedResponse();
  try {
    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    // ─── STEP 1: AUDIT — find mismatches ───
    const { data: leadsWithForm } = await supabase
      .from("leads-calculadora-visionaria")
      .select("id, nome, whatsapp, formsapp_completed, formsapp_data, formsapp_at")
      .eq("formsapp_completed", true)
      .order("id", { ascending: true })
      .limit(2000);

    if (!leadsWithForm) return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });

    const mismatches: { lead_id: number; lead_name: string; form_name: string; form_company: string }[] = [];

    for (const lead of leadsWithForm) {
      const data = lead.formsapp_data as Record<string, unknown> | null;
      if (!data) continue;

      const { formName, formCompany, phoneDigits } = extractFromAnswers(data);
      if (!formName) continue;

      const leadNorm = normalizeStr(lead.nome);
      const formNorm = normalizeStr(formName);

      // Check if it's a valid match
      if (leadNorm === formNorm) continue;

      const leadParts = leadNorm.split(/\s+/);
      const formParts = formNorm.split(/\s+/);
      if (leadParts.length >= 2 && formParts.length >= 2) {
        if (leadParts[0] === formParts[0] && leadParts[leadParts.length - 1] === formParts[formParts.length - 1]) continue;
      }

      if ((leadNorm.includes(formNorm) || formNorm.includes(leadNorm)) && Math.min(leadNorm.length, formNorm.length) >= 10) continue;

      // Check phone match
      const leadDigits = (lead.whatsapp || "").replace(/\D/g, "");
      if (leadDigits.length >= 8 && phoneDigits.length >= 8 && leadDigits.slice(-8) === phoneDigits.slice(-8)) continue;

      mismatches.push({ lead_id: lead.id, lead_name: lead.nome, form_name: formName, form_company: formCompany });
    }

    // ─── STEP 2: UNLINK all mismatches ───
    const unlinked: { lead_id: number; lead_name: string; form_name: string }[] = [];

    for (const m of mismatches) {
      const lead = leadsWithForm.find(l => l.id === m.lead_id);
      if (!lead || !lead.formsapp_data) continue;

      const data = lead.formsapp_data as Record<string, unknown>;
      const { nameValues, phoneDigits } = extractFromAnswers(data);

      // Save to unmatched table
      await supabase.from("formsapp_unmatched").insert({
        payload: lead.formsapp_data,
        phone_digits: phoneDigits || null,
        name_candidates: nameValues.slice(0, 5),
        matched: false,
        created_at: lead.formsapp_at || new Date().toISOString(),
      });

      // Clear formsapp from lead
      await supabase.from("leads-calculadora-visionaria").update({
        formsapp_completed: false,
        formsapp_data: null,
        formsapp_at: null,
      }).eq("id", lead.id);

      unlinked.push({ lead_id: m.lead_id, lead_name: m.lead_name, form_name: m.form_name });
    }

    // ─── STEP 3: RE-SYNC unlinked submissions with corrected algorithm ───
    const { data: allUnmatched } = await supabase
      .from("formsapp_unmatched")
      .select("*")
      .eq("matched", false)
      .order("created_at", { ascending: true });

    // Refresh leads list (some were just unlinked)
    const { data: allLeads } = await supabase
      .from("leads-calculadora-visionaria")
      .select("id, whatsapp, nome, formsapp_completed")
      .order("created_at", { ascending: false })
      .limit(2000);

    const rematched: { lead_id: number; lead_name: string; form_name: string; method: string }[] = [];
    let stillUnmatched = 0;

    if (allUnmatched && allLeads) {
      for (const sub of allUnmatched) {
        const phoneDigits = sub.phone_digits || "";
        const nameValues: string[] = sub.name_candidates || [];

        let match = null;
        let method = "";

        // Try phone first (most reliable)
        if (phoneDigits.length >= 8) {
          match = allLeads.find((l) => !l.formsapp_completed && matchPhone(phoneDigits, l.whatsapp)) || null;
          if (match) method = "phone";
        }

        // Try name with stricter algorithm
        if (!match && nameValues.length > 0) {
          match = allLeads.find((l) => !l.formsapp_completed && matchName(nameValues, l.nome)) || null;
          if (match) method = "name";
        }

        if (match) {
          await supabase.from("leads-calculadora-visionaria").update({
            formsapp_completed: true,
            formsapp_data: sub.payload,
            formsapp_at: sub.created_at,
          }).eq("id", match.id);

          await supabase.from("formsapp_unmatched").update({
            matched: true,
            matched_lead_id: match.id,
            matched_at: new Date().toISOString(),
          }).eq("id", sub.id);

          match.formsapp_completed = true;

          // Get form name for report
          const payload = sub.payload as Record<string, unknown> | null;
          let fName = nameValues[0] || "?";
          if (payload) {
            const extracted = extractFromAnswers(payload);
            if (extracted.formName) fName = extracted.formName;
          }

          rematched.push({ lead_id: match.id, lead_name: match.nome, form_name: fName, method });
        } else {
          stillUnmatched++;
        }
      }
    }

    return NextResponse.json({
      status: "ok",
      step1_audit: {
        total_checked: leadsWithForm.length,
        mismatches_found: mismatches.length,
        details: mismatches,
      },
      step2_unlinked: {
        count: unlinked.length,
        details: unlinked,
      },
      step3_resync: {
        rematched: rematched.length,
        still_unmatched: stillUnmatched,
        details: rematched,
      },
    });
  } catch (error) {
    console.error("Fix-all error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
