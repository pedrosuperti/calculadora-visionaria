import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  // Return 200 immediately — analytics should never block the client
  const ok = NextResponse.json({ ok: true });

  try {
    const body = await req.json();

    const {
      session_id,
      event,
      step,
      device,
      browser,
      os,
      language,
      referrer,
      screen_width,
    } = body;

    // Guess country from Accept-Language header (rough heuristic)
    const acceptLang = req.headers.get("accept-language") || "";
    const country = guessCountry(acceptLang);

    const supabase = getSupabase();
    if (!supabase) return ok;

    // Fire and forget — don't await in production-critical path
    supabase
      .from("calc-analytics")
      .insert({
        session_id: session_id || "",
        event: event || "",
        step: String(step ?? ""),
        device: device || "",
        browser: browser || "",
        os: os || "",
        language: language || "",
        referrer: referrer || "",
        screen_width: screen_width || 0,
        country,
      })
      .then(({ error }) => {
        if (error) console.warn("[analytics] insert error:", error.message);
      });
  } catch (e) {
    // Swallow — analytics must never crash
    console.warn("[analytics] error:", e);
  }

  return ok;
}

/** Rough country guess from Accept-Language header */
function guessCountry(header: string): string {
  if (!header) return "";
  // e.g. "pt-BR,pt;q=0.9,en-US;q=0.8" → "BR"
  const match = header.match(/[a-z]{2}-([A-Z]{2})/);
  return match ? match[1] : "";
}
