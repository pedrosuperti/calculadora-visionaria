import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

const WEBHOOK_SECRET = process.env.FORMSAPP_WEBHOOK_SECRET || "";

// ─── MATCHING UTILS ──────────────────────────────────────────────────────

function normalizeStr(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

function extractPhoneDigits(values: string[]): string {
  // Strategy 1: Find a single value with 10+ digits (full phone number)
  const fullPhoneMatch = values.find((v) => {
    const digits = v.replace(/\D/g, "");
    return digits.length >= 10;
  });
  if (fullPhoneMatch) return fullPhoneMatch.replace(/\D/g, "");

  // Strategy 2: Forms.app splits phone into 3 fields (country, area, number)
  const numericParts = values
    .map((v) => v.replace(/\D/g, ""))
    .filter((d) => d.length >= 1 && d.length <= 6);
  const combined = numericParts.join("");
  if (combined.length >= 10) return combined;

  return "";
}

function matchPhone(phoneDigits: string, leadWhatsapp: string): boolean {
  const leadDigits = (leadWhatsapp || "").replace(/\D/g, "");
  if (leadDigits.length < 8 || phoneDigits.length < 8) return false;

  // Match by last 8 digits (more tolerant with DDI/DDD variations)
  const last8Phone = phoneDigits.slice(-8);
  const last8Lead = leadDigits.slice(-8);
  if (last8Phone === last8Lead) return true;

  // Also try last 9 (some Brazilian numbers have 9th digit)
  if (phoneDigits.length >= 9 && leadDigits.length >= 9) {
    const last9Phone = phoneDigits.slice(-9);
    const last9Lead = leadDigits.slice(-9);
    if (last9Phone === last9Lead) return true;
  }

  return false;
}

function matchName(formNames: string[], leadNome: string): boolean {
  const leadNorm = normalizeStr(leadNome);
  if (leadNorm.length < 2) return false;
  const leadParts = leadNorm.split(/\s+/);
  const leadFirst = leadParts[0];

  for (const name of formNames) {
    const formNorm = normalizeStr(name);
    if (formNorm.length < 2) continue;
    const formParts = formNorm.split(/\s+/);
    const formFirst = formParts[0];

    // Exact match
    if (formNorm === leadNorm) return true;
    // First name match (common: "João" in calculator, "João Silva" in form)
    if (formFirst === leadFirst && formFirst.length >= 3) return true;
    // Substring match
    if (leadNorm.includes(formNorm) || formNorm.includes(leadNorm)) return true;
  }
  return false;
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

function extractNameCandidates(values: string[]): string[] {
  return values.filter((v) => {
    const trimmed = v.trim();
    return trimmed.length >= 2 && trimmed.length <= 80 && !/^\d+$/.test(trimmed) && !trimmed.includes("@");
  });
}

// ─── WEBHOOK HANDLER ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    if (WEBHOOK_SECRET) {
      const authHeader = request.headers.get("authorization") || "";
      const secretParam = request.nextUrl.searchParams.get("secret") || "";
      if (authHeader !== WEBHOOK_SECRET && secretParam !== WEBHOOK_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const payload = await request.json();
    console.log("Forms.app webhook received:", JSON.stringify(payload).slice(0, 1000));

    const answers = payload.answers || payload.fields || payload.responses || payload;
    const allValues = extractAllValues(answers);
    const phoneDigits = extractPhoneDigits(allValues);
    const nameValues = extractNameCandidates(allValues);

    const supabase = getSupabase();
    if (!supabase) {
      console.error("Supabase not configured for webhook");
      return NextResponse.json({ status: "ok", warning: "db not configured" });
    }

    // Fetch all leads for matching
    const { data: existingLeads } = await supabase
      .from("leads-calculadora-visionaria")
      .select("id, whatsapp, nome")
      .order("created_at", { ascending: false })
      .limit(2000);

    let match = null;

    // Try phone match first (improved: last 8-9 digits)
    if (phoneDigits.length >= 8) {
      match = existingLeads?.find((lead) => matchPhone(phoneDigits, lead.whatsapp)) || null;
    }

    // Fallback: try name match with normalization
    if (!match && nameValues.length > 0) {
      match = existingLeads?.find((lead) => matchName(nameValues, lead.nome)) || null;
    }

    if (match) {
      await supabase
        .from("leads-calculadora-visionaria")
        .update({
          formsapp_completed: true,
          formsapp_data: payload,
          formsapp_at: new Date().toISOString(),
        })
        .eq("id", match.id);

      console.log("Webhook: matched lead", match.id, "phone:", phoneDigits || "by name");
      return NextResponse.json({ status: "ok", matched: true, lead_id: match.id });
    }

    // No match — store in unmatched table for later sync
    console.log("Webhook: no match found. Phone:", phoneDigits || "none", "Names:", nameValues.slice(0, 3).join(", "));

    await supabase.from("formsapp_unmatched").insert({
      payload,
      phone_digits: phoneDigits || null,
      name_candidates: nameValues.slice(0, 5),
      matched: false,
      created_at: new Date().toISOString(),
    }).then(({ error }) => {
      if (error) console.error("Failed to store unmatched submission:", error.message);
    });

    return NextResponse.json({ status: "ok", matched: false, stored: true, note: "stored for later sync" });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ status: "error", message: String(error) }, { status: 200 });
  }
}
