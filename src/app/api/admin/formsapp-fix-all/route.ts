import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { validateAdminAuth, unauthorizedResponse } from "@/lib/admin-auth";

function normalizeStr(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").trim();
}

// ─── EXTRACT ALL SIGNALS FROM FORM PAYLOAD ───

interface FormSignals {
  formName: string;
  formEmail: string;
  formPhone: string;
  formCompany: string;
  nameValues: string[];
  phoneDigits: string;
  allValues: string[];
}

function extractSignals(data: Record<string, unknown>): FormSignals {
  let formName = "";
  let formEmail = "";
  let formPhone = "";
  let formCompany = "";
  const nameValues: string[] = [];
  const phoneParts: string[] = [];
  const allValues: string[] = [];

  const answers = (data.answers || data.fields || data.responses) as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(answers)) {
    for (const a of answers) {
      const title = normalizeStr(String(a.title ?? a.question ?? a.label ?? ""));
      const value = String(a.value ?? a.answer ?? a.response ?? "");
      allValues.push(value);
      if (title.includes("nome") && !title.includes("empresa")) {
        formName = value;
        if (value.length >= 2 && value.length <= 80) nameValues.push(value);
      }
      if (title.includes("e-mail") || title.includes("email")) formEmail = value.trim().toLowerCase();
      if (title.includes("telefone") || title.includes("whatsapp") || title.includes("phone")) { formPhone = value; phoneParts.push(value); }
      if (title.includes("empresa") || title.includes("company")) formCompany = value;
    }
  }

  // Also extract phone from all values (some forms have phone without label)
  if (phoneParts.length === 0) {
    for (const v of allValues) {
      const digits = v.replace(/\D/g, "");
      if (digits.length >= 10 && digits.length <= 15) { phoneParts.push(v); break; }
    }
  }

  // Also extract email from all values
  if (!formEmail) {
    for (const v of allValues) {
      if (v.includes("@") && v.includes(".")) { formEmail = v.trim().toLowerCase(); break; }
    }
  }

  const phoneDigits = phoneParts.map(v => v.replace(/\D/g, "")).filter(d => d.length >= 1).join("");
  return { formName, formEmail, formPhone, formCompany, nameValues, phoneDigits, allValues };
}

// ─── SCORING-BASED MATCHING ───

function matchScore(signals: FormSignals, lead: { nome: string; whatsapp: string }): { score: number; method: string } {
  let score = 0;
  const methods: string[] = [];

  const leadNorm = normalizeStr(lead.nome);
  const leadParts = leadNorm.split(/\s+/);
  const leadDigits = (lead.whatsapp || "").replace(/\D/g, "");

  // ─── PHONE MATCH (strongest signal: +60) ───
  if (signals.phoneDigits.length >= 8 && leadDigits.length >= 8) {
    if (signals.phoneDigits.slice(-8) === leadDigits.slice(-8)) {
      score += 60;
      methods.push("phone");
    }
    if (signals.phoneDigits.length >= 9 && leadDigits.length >= 9 && signals.phoneDigits.slice(-9) === leadDigits.slice(-9)) {
      score += 10; // bonus for 9-digit match
    }
  }

  // ─── NAME MATCHING ───
  for (const name of signals.nameValues) {
    const formNorm = normalizeStr(name);
    if (formNorm.length < 2) continue;
    const formParts = formNorm.split(/\s+/);

    // Exact full name match (+50)
    if (formNorm === leadNorm) {
      score += 50;
      methods.push("exact_name");
      break;
    }

    // First + last name match (+40)
    if (leadParts.length >= 2 && formParts.length >= 2) {
      const firstMatch = formParts[0] === leadParts[0] && formParts[0].length >= 3;
      const lastMatch = formParts[formParts.length - 1] === leadParts[leadParts.length - 1] && formParts[formParts.length - 1].length >= 3;
      if (firstMatch && lastMatch) {
        score += 40;
        methods.push("first_last_name");
        break;
      }
    }

    // Lead has single short name, form starts with it (+20, needs phone/email confirmation)
    if (leadParts.length === 1 && leadParts[0].length >= 3 && formParts[0] === leadParts[0]) {
      score += 20;
      methods.push("first_name");
      break;
    }

    // One contains the other, long enough (+25)
    if ((leadNorm.includes(formNorm) || formNorm.includes(leadNorm)) && Math.min(formNorm.length, leadNorm.length) >= 10) {
      score += 25;
      methods.push("name_contains");
      break;
    }
  }

  // ─── EMAIL CONTAINS LEAD NAME (+15) ───
  if (signals.formEmail && leadParts[0] && leadParts[0].length >= 3) {
    const emailLocal = signals.formEmail.split("@")[0];
    if (emailLocal.includes(leadParts[0])) {
      score += 15;
      methods.push("email_name");
    }
  }

  return { score, method: methods.join("+") };
}

// Minimum score to consider a match valid
const MATCH_THRESHOLD = 50; // phone alone (60) or exact name (50) or first+last (40)+email(15) or first_name(20)+phone(60)

// ─── AUDIT: is existing match valid? ───
function isValidMatch(signals: FormSignals, lead: { nome: string; whatsapp: string }): boolean {
  const { score } = matchScore(signals, lead);
  return score >= MATCH_THRESHOLD;
}

// POST: Full automated fix — audit, unlink mismatches, re-sync with scoring
export async function POST(request: NextRequest) {
  if (!validateAdminAuth(request)) return unauthorizedResponse();
  try {
    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    // ─── STEP 1: AUDIT — find mismatches using scoring ───
    const { data: leadsWithForm } = await supabase
      .from("leads-calculadora-visionaria")
      .select("id, nome, whatsapp, formsapp_completed, formsapp_data, formsapp_at")
      .eq("formsapp_completed", true)
      .order("id", { ascending: true })
      .limit(2000);

    if (!leadsWithForm) return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });

    const mismatches: { lead_id: number; lead_name: string; form_name: string; form_company: string; score: number }[] = [];

    for (const lead of leadsWithForm) {
      const data = lead.formsapp_data as Record<string, unknown> | null;
      if (!data) continue;

      const signals = extractSignals(data);
      if (!signals.formName) continue;

      if (isValidMatch(signals, { nome: lead.nome, whatsapp: lead.whatsapp || "" })) continue;

      mismatches.push({
        lead_id: lead.id,
        lead_name: lead.nome,
        form_name: signals.formName,
        form_company: signals.formCompany,
        score: matchScore(signals, { nome: lead.nome, whatsapp: lead.whatsapp || "" }).score,
      });
    }

    // ─── STEP 2: UNLINK mismatches ───
    const unlinked: { lead_id: number; lead_name: string; form_name: string }[] = [];

    for (const m of mismatches) {
      const lead = leadsWithForm.find(l => l.id === m.lead_id);
      if (!lead || !lead.formsapp_data) continue;

      const data = lead.formsapp_data as Record<string, unknown>;
      const signals = extractSignals(data);

      // Save to unmatched table
      await supabase.from("formsapp_unmatched").insert({
        payload: lead.formsapp_data,
        phone_digits: signals.phoneDigits || null,
        name_candidates: signals.nameValues.slice(0, 5),
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

    // ─── STEP 3: RE-SYNC all unmatched using scoring ───
    const { data: allUnmatched } = await supabase
      .from("formsapp_unmatched")
      .select("*")
      .eq("matched", false)
      .order("created_at", { ascending: true });

    // Refresh leads list
    const { data: allLeads } = await supabase
      .from("leads-calculadora-visionaria")
      .select("id, whatsapp, nome, formsapp_completed")
      .order("created_at", { ascending: false })
      .limit(2000);

    const rematched: { lead_id: number; lead_name: string; form_name: string; method: string; score: number }[] = [];
    let stillUnmatched = 0;
    const stillUnmatchedDetails: { form_name: string; phone: string }[] = [];

    if (allUnmatched && allLeads) {
      for (const sub of allUnmatched) {
        const payload = sub.payload as Record<string, unknown> | null;
        if (!payload) { stillUnmatched++; continue; }

        const signals = extractSignals(payload);

        // Score all available leads and pick the best match
        let bestMatch: { id: number; nome: string; whatsapp: string; formsapp_completed: boolean } | null = null;
        let bestScore = 0;
        let bestMethod = "";

        for (const lead of allLeads) {
          if (lead.formsapp_completed) continue;
          const { score, method } = matchScore(signals, { nome: lead.nome, whatsapp: lead.whatsapp });
          if (score > bestScore && score >= MATCH_THRESHOLD) {
            bestScore = score;
            bestMatch = lead;
            bestMethod = method;
          }
        }

        if (bestMatch) {
          await supabase.from("leads-calculadora-visionaria").update({
            formsapp_completed: true,
            formsapp_data: sub.payload,
            formsapp_at: sub.created_at,
          }).eq("id", bestMatch.id);

          await supabase.from("formsapp_unmatched").update({
            matched: true,
            matched_lead_id: bestMatch.id,
            matched_at: new Date().toISOString(),
          }).eq("id", sub.id);

          bestMatch.formsapp_completed = true;
          rematched.push({ lead_id: bestMatch.id, lead_name: bestMatch.nome, form_name: signals.formName || signals.nameValues[0] || "?", method: bestMethod, score: bestScore });
        } else {
          stillUnmatched++;
          stillUnmatchedDetails.push({ form_name: signals.formName || signals.nameValues[0] || "?", phone: signals.formPhone || signals.phoneDigits || "?" });
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
        still_unmatched_details: stillUnmatchedDetails,
      },
    });
  } catch (error) {
    console.error("Fix-all error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
