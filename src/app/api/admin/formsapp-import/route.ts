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
  const leadFirst = leadNorm.split(/\s+/)[0];
  for (const name of formNames) {
    const formNorm = normalizeStr(name);
    if (formNorm.length < 2) continue;
    const formFirst = formNorm.split(/\s+/)[0];
    if (formNorm === leadNorm || (formFirst === leadFirst && formFirst.length >= 3)) return true;
    if (leadNorm.includes(formNorm) || formNorm.includes(leadNorm)) return true;
  }
  return false;
}

// POST: Import array of Forms.app submissions
// Body: { submissions: [ { ...payload }, ... ] }
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
    const results: { index: number; lead_id: number | null; lead_name: string | null; status: string }[] = [];

    for (let i = 0; i < submissions.length; i++) {
      const payload = submissions[i];
      const answers = payload.answers || payload.fields || payload.responses || payload;
      const allValues = extractAllValues(answers);
      const phoneDigits = extractPhoneDigits(allValues);
      const nameValues = allValues.filter((v) => {
        const t = v.trim();
        return t.length >= 2 && t.length <= 80 && !/^\d+$/.test(t) && !t.includes("@");
      });

      let match = null;

      if (phoneDigits.length >= 8) {
        match = leads.find((l) => matchPhone(phoneDigits, l.whatsapp)) || null;
      }
      if (!match && nameValues.length > 0) {
        match = leads.find((l) => matchName(nameValues, l.nome)) || null;
      }

      if (match) {
        if (match.formsapp_completed) {
          skipped++;
          results.push({ index: i, lead_id: match.id, lead_name: match.nome, status: "already_matched" });
        } else {
          await supabase.from("leads-calculadora-visionaria").update({
            formsapp_completed: true,
            formsapp_data: payload,
            formsapp_at: payload.createdAt || payload.created_at || new Date().toISOString(),
          }).eq("id", match.id);
          match.formsapp_completed = true;
          matched++;
          results.push({ index: i, lead_id: match.id, lead_name: match.nome, status: "matched" });
        }
      } else {
        // Store as unmatched
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

    return NextResponse.json({
      status: "ok",
      total: submissions.length,
      matched,
      already_matched: skipped,
      unmatched_stored: stored,
      results,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
