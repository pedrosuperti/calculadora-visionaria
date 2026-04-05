import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { validateAdminAuth, unauthorizedResponse } from "@/lib/admin-auth";

function normalizeStr(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").trim();
}

const MATCH_THRESHOLD = 50;

function scoreMatch(phoneDigits: string, nameValues: string[], email: string, lead: { nome: string; whatsapp: string }): { score: number; method: string } {
  let score = 0;
  const methods: string[] = [];
  const leadNorm = normalizeStr(lead.nome);
  const leadParts = leadNorm.split(/\s+/);
  const leadDigits = (lead.whatsapp || "").replace(/\D/g, "");

  if (phoneDigits.length >= 8 && leadDigits.length >= 8) {
    if (phoneDigits.slice(-8) === leadDigits.slice(-8)) { score += 60; methods.push("phone"); }
    if (phoneDigits.length >= 9 && leadDigits.length >= 9 && phoneDigits.slice(-9) === leadDigits.slice(-9)) score += 10;
  }

  for (const name of nameValues) {
    const formNorm = normalizeStr(name);
    if (formNorm.length < 2) continue;
    const formParts = formNorm.split(/\s+/);
    if (formNorm === leadNorm) { score += 50; methods.push("exact_name"); break; }
    if (leadParts.length >= 2 && formParts.length >= 2) {
      if (formParts[0] === leadParts[0] && formParts[0].length >= 3 && formParts[formParts.length - 1] === leadParts[leadParts.length - 1] && formParts[formParts.length - 1].length >= 3) {
        score += 40; methods.push("first_last"); break;
      }
    }
    if (leadParts.length === 1 && leadParts[0].length >= 3 && formParts[0] === leadParts[0]) { score += 20; methods.push("first_name"); break; }
    if ((leadNorm.includes(formNorm) || formNorm.includes(leadNorm)) && Math.min(formNorm.length, leadNorm.length) >= 10) { score += 25; methods.push("name_contains"); break; }
  }

  if (email && leadParts[0] && leadParts[0].length >= 3) {
    const emailLocal = email.split("@")[0];
    if (emailLocal.includes(leadParts[0])) { score += 15; methods.push("email"); }
  }

  return { score, method: methods.join("+") };
}

function extractSignalsFromPayload(payload: Record<string, unknown>): { nameValues: string[]; phoneDigits: string; email: string } {
  const nameValues: string[] = [];
  const phoneParts: string[] = [];
  let email = "";

  const answers = (payload.answers || payload.fields || payload.responses) as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(answers)) {
    for (const a of answers) {
      const title = normalizeStr(String(a.title ?? a.question ?? a.label ?? ""));
      const value = String(a.value ?? a.answer ?? a.response ?? "");
      if (title.includes("nome") && !title.includes("empresa") && value.length >= 2 && value.length <= 80) nameValues.push(value);
      if (title.includes("telefone") || title.includes("whatsapp") || title.includes("phone")) phoneParts.push(value);
      if ((title.includes("e-mail") || title.includes("email")) && value.includes("@")) email = value.trim().toLowerCase();
    }
  }

  const phoneDigits = phoneParts.map(v => v.replace(/\D/g, "")).filter(d => d.length >= 1).join("");
  return { nameValues, phoneDigits, email };
}

export async function POST(request: NextRequest) {
  if (!validateAdminAuth(request)) return unauthorizedResponse();
  try {
    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    const { data: unmatched, error: unmatchedError } = await supabase
      .from("formsapp_unmatched")
      .select("*")
      .eq("matched", false)
      .order("created_at", { ascending: true });

    if (unmatchedError) {
      if (unmatchedError.message.includes("does not exist") || unmatchedError.code === "42P01") {
        return NextResponse.json({ status: "ok", message: "Tabela formsapp_unmatched ainda nao existe.", total_unmatched: 0, synced: 0, still_unmatched: 0, results: [] });
      }
      return NextResponse.json({ error: "Erro: " + unmatchedError.message }, { status: 500 });
    }

    if (!unmatched || unmatched.length === 0) {
      return NextResponse.json({ status: "ok", message: "Nenhuma submissao pendente.", total_unmatched: 0, synced: 0, still_unmatched: 0, results: [] });
    }

    const { data: leads } = await supabase
      .from("leads-calculadora-visionaria")
      .select("id, whatsapp, nome, formsapp_completed")
      .order("created_at", { ascending: false })
      .limit(2000);

    if (!leads) return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });

    let synced = 0;
    const results: { unmatched_id: number; lead_id: number | null; lead_name: string | null; method: string; score?: number }[] = [];

    for (const sub of unmatched) {
      const phoneDigits = sub.phone_digits || "";
      const nameValues: string[] = sub.name_candidates || [];

      // Also try to extract more signals from the payload
      let email = "";
      const payload = sub.payload as Record<string, unknown> | null;
      if (payload) {
        const signals = extractSignalsFromPayload(payload);
        if (signals.email) email = signals.email;
        // Merge name candidates from payload if stored ones are empty
        if (nameValues.length === 0 && signals.nameValues.length > 0) nameValues.push(...signals.nameValues);
      }

      // Score all leads and pick best match
      let bestMatch: typeof leads[0] | null = null;
      let bestScore = 0;
      let bestMethod = "";

      for (const lead of leads) {
        if (lead.formsapp_completed) continue;
        const { score, method } = scoreMatch(phoneDigits, nameValues, email, { nome: lead.nome, whatsapp: lead.whatsapp });
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
        synced++;
        results.push({ unmatched_id: sub.id, lead_id: bestMatch.id, lead_name: bestMatch.nome, method: bestMethod, score: bestScore });
      } else {
        results.push({ unmatched_id: sub.id, lead_id: null, lead_name: null, method: "no_match" });
      }
    }

    return NextResponse.json({
      status: "ok",
      total_unmatched: unmatched.length,
      synced,
      still_unmatched: unmatched.length - synced,
      results,
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
