import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

function normalizeStr(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").trim();
}

function matchPhone(phoneDigits: string, leadWhatsapp: string): boolean {
  const leadDigits = (leadWhatsapp || "").replace(/\D/g, "");
  if (leadDigits.length < 8 || phoneDigits.length < 8) return false;
  const last8Phone = phoneDigits.slice(-8);
  const last8Lead = leadDigits.slice(-8);
  if (last8Phone === last8Lead) return true;
  if (phoneDigits.length >= 9 && leadDigits.length >= 9) {
    if (phoneDigits.slice(-9) === leadDigits.slice(-9)) return true;
  }
  return false;
}

function matchName(formNames: string[], leadNome: string): boolean {
  const leadNorm = normalizeStr(leadNome);
  if (leadNorm.length < 2) return false;
  const leadFirst = leadNorm.split(/\s+/)[0];
  for (const name of formNames) {
    const formNorm = normalizeStr(name);
    if (formNorm.length < 2) continue;
    const formFirst = formNorm.split(/\s+/)[0];
    if (formNorm === leadNorm) return true;
    if (formFirst === leadFirst && formFirst.length >= 3) return true;
    if (leadNorm.includes(formNorm) || formNorm.includes(leadNorm)) return true;
  }
  return false;
}

export async function POST() {
  try {
    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    // Get all unmatched submissions
    const { data: unmatched, error: unmatchedError } = await supabase
      .from("formsapp_unmatched")
      .select("*")
      .eq("matched", false)
      .order("created_at", { ascending: true });

    if (unmatchedError) {
      // Table probably doesn't exist yet
      if (unmatchedError.message.includes("does not exist") || unmatchedError.code === "42P01") {
        return NextResponse.json({ status: "ok", message: "Tabela formsapp_unmatched ainda nao existe. Importe dados primeiro.", total_unmatched: 0, synced: 0, still_unmatched: 0, results: [] });
      }
      return NextResponse.json({ error: "Erro ao buscar pendentes: " + unmatchedError.message }, { status: 500 });
    }

    if (!unmatched || unmatched.length === 0) {
      return NextResponse.json({ status: "ok", message: "Nenhuma submissao pendente para sincronizar.", total_unmatched: 0, synced: 0, still_unmatched: 0, results: [] });
    }

    // Fetch all leads
    const { data: leads } = await supabase
      .from("leads-calculadora-visionaria")
      .select("id, whatsapp, nome, formsapp_completed")
      .order("created_at", { ascending: false })
      .limit(2000);

    if (!leads) {
      return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
    }

    let synced = 0;
    const results: { unmatched_id: number; lead_id: number | null; lead_name: string | null; method: string }[] = [];

    for (const sub of unmatched) {
      const phoneDigits = sub.phone_digits || "";
      const nameValues: string[] = sub.name_candidates || [];

      let match = null;
      let method = "";

      // Try phone match
      if (phoneDigits.length >= 8) {
        match = leads.find((l) => !l.formsapp_completed && matchPhone(phoneDigits, l.whatsapp)) || null;
        if (match) method = "phone";
      }

      // Try name match
      if (!match && nameValues.length > 0) {
        match = leads.find((l) => !l.formsapp_completed && matchName(nameValues, l.nome)) || null;
        if (match) method = "name";
      }

      if (match) {
        // Update lead
        await supabase.from("leads-calculadora-visionaria").update({
          formsapp_completed: true,
          formsapp_data: sub.payload,
          formsapp_at: sub.created_at,
        }).eq("id", match.id);

        // Mark as matched
        await supabase.from("formsapp_unmatched").update({
          matched: true,
          matched_lead_id: match.id,
          matched_at: new Date().toISOString(),
        }).eq("id", sub.id);

        // Mark lead as completed so it won't match again
        match.formsapp_completed = true;
        synced++;
        results.push({ unmatched_id: sub.id, lead_id: match.id, lead_name: match.nome, method });
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
