import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { validateAdminAuth, unauthorizedResponse } from "@/lib/admin-auth";

function normalizeStr(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").trim();
}

function extractAllValues(obj: unknown): string[] {
  const values: string[] = [];
  function walk(o: unknown) {
    if (typeof o === "string") values.push(o);
    else if (typeof o === "number") values.push(String(o));
    else if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === "object") Object.values(o as Record<string, unknown>).forEach(walk);
  }
  walk(obj);
  return values;
}

function extractPhoneDigits(values: string[]): string {
  const fullPhoneMatch = values.find((v) => v.replace(/\D/g, "").length >= 10);
  if (fullPhoneMatch) return fullPhoneMatch.replace(/\D/g, "");
  const numericParts = values.map((v) => v.replace(/\D/g, "")).filter((d) => d.length >= 1 && d.length <= 6);
  const combined = numericParts.join("");
  if (combined.length >= 10) return combined;
  return "";
}

function extractEmail(values: string[]): string {
  const emailVal = values.find(v => v.includes("@") && v.includes("."));
  return emailVal ? emailVal.trim().toLowerCase() : "";
}

const MATCH_THRESHOLD = 50;

function scoreMatch(phoneDigits: string, nameValues: string[], email: string, lead: { nome: string; whatsapp: string }): { score: number; method: string } {
  let score = 0;
  const methods: string[] = [];
  const leadNorm = normalizeStr(lead.nome);
  const leadParts = leadNorm.split(/\s+/);
  const leadDigits = (lead.whatsapp || "").replace(/\D/g, "");

  // Phone match (+60)
  if (phoneDigits.length >= 8 && leadDigits.length >= 8) {
    if (phoneDigits.slice(-8) === leadDigits.slice(-8)) { score += 60; methods.push("phone"); }
    if (phoneDigits.length >= 9 && leadDigits.length >= 9 && phoneDigits.slice(-9) === leadDigits.slice(-9)) score += 10;
  }

  // Name matching
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

  // Email contains lead name (+15)
  if (email && leadParts[0] && leadParts[0].length >= 3) {
    const emailLocal = email.split("@")[0];
    if (emailLocal.includes(leadParts[0])) { score += 15; methods.push("email"); }
  }

  return { score, method: methods.join("+") };
}

// POST: Import array of Forms.app submissions
export async function POST(request: NextRequest) {
  if (!validateAdminAuth(request)) return unauthorizedResponse();
  try {
    const { submissions } = await request.json();
    if (!Array.isArray(submissions) || submissions.length === 0) {
      return NextResponse.json({ error: "Body must have 'submissions' array" }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    const { data: leads } = await supabase
      .from("leads-calculadora-visionaria")
      .select("id, whatsapp, nome, formsapp_completed")
      .order("created_at", { ascending: false })
      .limit(2000);

    if (!leads) return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });

    let matched = 0;
    let stored = 0;
    let skipped = 0;
    const results: { index: number; lead_id: number | null; lead_name: string | null; status: string; method?: string; score?: number }[] = [];

    for (let i = 0; i < submissions.length; i++) {
      const payload = submissions[i];
      const answers = payload.answers || payload.fields || payload.responses || payload;
      const allValues = extractAllValues(answers);
      const phoneDigits = extractPhoneDigits(allValues);
      const email = extractEmail(allValues);
      const nameValues = allValues.filter((v) => {
        const t = v.trim();
        return t.length >= 2 && t.length <= 80 && !/^\d+$/.test(t) && !t.includes("@");
      });

      // Score all leads and pick best match
      let bestMatch: typeof leads[0] | null = null;
      let bestScore = 0;
      let bestMethod = "";

      for (const lead of leads) {
        const { score, method } = scoreMatch(phoneDigits, nameValues, email, { nome: lead.nome, whatsapp: lead.whatsapp });
        if (score > bestScore && score >= MATCH_THRESHOLD) {
          bestScore = score;
          bestMatch = lead;
          bestMethod = method;
        }
      }

      if (bestMatch) {
        if (bestMatch.formsapp_completed) {
          skipped++;
          results.push({ index: i, lead_id: bestMatch.id, lead_name: bestMatch.nome, status: "already_matched" });
        } else {
          await supabase.from("leads-calculadora-visionaria").update({
            formsapp_completed: true,
            formsapp_data: payload,
            formsapp_at: payload.createdAt || payload.created_at || new Date().toISOString(),
          }).eq("id", bestMatch.id);
          bestMatch.formsapp_completed = true;
          matched++;
          results.push({ index: i, lead_id: bestMatch.id, lead_name: bestMatch.nome, status: "matched", method: bestMethod, score: bestScore });
        }
      } else {
        await supabase.from("formsapp_unmatched").insert({
          payload,
          phone_digits: phoneDigits || null,
          name_candidates: nameValues.slice(0, 5),
          matched: false,
          created_at: payload.createdAt || payload.created_at || new Date().toISOString(),
        });
        stored++;
        results.push({ index: i, lead_id: null, lead_name: null, status: "unmatched_stored" });
      }
    }

    return NextResponse.json({ status: "ok", total: submissions.length, matched, already_matched: skipped, unmatched_stored: stored, results });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
