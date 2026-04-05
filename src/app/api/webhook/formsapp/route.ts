import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

const WEBHOOK_SECRET = process.env.FORMSAPP_WEBHOOK_SECRET;

// ─── MATCHING UTILS ──────────────────────────────────────────────────────

function normalizeStr(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").trim();
}

function extractPhoneDigits(values: string[]): string {
  const fullPhoneMatch = values.find((v) => v.replace(/\D/g, "").length >= 10);
  if (fullPhoneMatch) return fullPhoneMatch.replace(/\D/g, "");
  const numericParts = values.map((v) => v.replace(/\D/g, "")).filter((d) => d.length >= 1 && d.length <= 6);
  const combined = numericParts.join("");
  if (combined.length >= 10) return combined;
  return "";
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

// ─── WEBHOOK HANDLER ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    if (!WEBHOOK_SECRET) {
      console.error("FORMSAPP_WEBHOOK_SECRET not configured — rejecting webhook");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
    }
    const authHeader = request.headers.get("authorization") || "";
    const hookSecret = request.headers.get("x-hook-secret") || "";
    const webhookSecret = request.headers.get("x-webhook-secret") || "";
    const formSecret = request.headers.get("x-form-secret") || "";
    const secretMatch = [authHeader, `Bearer ${hookSecret}`, `Bearer ${webhookSecret}`, `Bearer ${formSecret}`, hookSecret, webhookSecret, formSecret]
      .some((val) => val === WEBHOOK_SECRET || val === `Bearer ${WEBHOOK_SECRET}`);
    if (!secretMatch) {
      console.error("Webhook auth failed. Headers received:", JSON.stringify({
        authorization: authHeader.slice(0, 20) + "...",
        "x-hook-secret": hookSecret ? "set" : "empty",
        "x-webhook-secret": webhookSecret ? "set" : "empty",
      }));
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    console.log("Forms.app webhook received:", JSON.stringify(payload).slice(0, 1000));

    const answers = payload.answers || payload.fields || payload.responses || payload;
    const allValues = extractAllValues(answers);
    const phoneDigits = extractPhoneDigits(allValues);
    const nameValues = extractNameCandidates(allValues);
    const email = extractEmail(allValues);

    const supabase = getSupabase();
    if (!supabase) {
      console.error("Supabase not configured for webhook");
      return NextResponse.json({ status: "ok", warning: "db not configured" });
    }

    const { data: existingLeads } = await supabase
      .from("leads-calculadora-visionaria")
      .select("id, whatsapp, nome")
      .order("created_at", { ascending: false })
      .limit(2000);

    // Score all leads and pick the best match
    let bestMatch: typeof existingLeads extends Array<infer T> | null ? T : never = null as never;
    let bestScore = 0;
    let bestMethod = "";

    if (existingLeads) {
      for (const lead of existingLeads) {
        const { score, method } = scoreMatch(phoneDigits, nameValues, email, { nome: lead.nome, whatsapp: lead.whatsapp });
        if (score > bestScore && score >= MATCH_THRESHOLD) {
          bestScore = score;
          bestMatch = lead;
          bestMethod = method;
        }
      }
    }

    if (bestMatch) {
      await supabase
        .from("leads-calculadora-visionaria")
        .update({
          formsapp_completed: true,
          formsapp_data: payload,
          formsapp_at: new Date().toISOString(),
        })
        .eq("id", bestMatch.id);

      console.log(`Webhook: matched lead ${bestMatch.id} via ${bestMethod} (score: ${bestScore})`);
      return NextResponse.json({ status: "ok", matched: true, lead_id: bestMatch.id, method: bestMethod });
    }

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
