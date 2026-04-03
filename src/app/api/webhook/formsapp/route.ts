import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

const WEBHOOK_SECRET = process.env.FORMSAPP_WEBHOOK_SECRET || "";

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret if configured
    if (WEBHOOK_SECRET) {
      const authHeader = request.headers.get("authorization") || "";
      const secretParam = request.nextUrl.searchParams.get("secret") || "";
      if (authHeader !== WEBHOOK_SECRET && secretParam !== WEBHOOK_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const payload = await request.json();
    console.log("Forms.app webhook received:", JSON.stringify(payload).slice(0, 1000));

    // Extract answers - forms.app sends answers in various formats
    const answers = payload.answers || payload.fields || payload.responses || payload;

    // Flatten all string values to search for phone number
    const allValues: string[] = [];
    function extractValues(obj: unknown) {
      if (typeof obj === "string") {
        allValues.push(obj);
      } else if (typeof obj === "number") {
        allValues.push(String(obj));
      } else if (Array.isArray(obj)) {
        obj.forEach(extractValues);
      } else if (obj && typeof obj === "object") {
        Object.values(obj as Record<string, unknown>).forEach(extractValues);
      }
    }
    extractValues(answers);

    // Strategy 1: Find a single value with 10+ digits (full phone number)
    let phoneDigits = "";
    const fullPhoneMatch = allValues.find((v) => {
      const digits = v.replace(/\D/g, "");
      return digits.length >= 10;
    });

    if (fullPhoneMatch) {
      phoneDigits = fullPhoneMatch.replace(/\D/g, "");
    } else {
      // Strategy 2: Forms.app splits phone into 3 fields (country, area, number)
      // Concatenate ALL short numeric values to build the full number
      const numericParts = allValues
        .map((v) => v.replace(/\D/g, ""))
        .filter((d) => d.length >= 1 && d.length <= 6);
      const combined = numericParts.join("");
      if (combined.length >= 10) {
        phoneDigits = combined;
      }
    }

    // Also try to extract name for fallback matching
    const nameValues = allValues.filter((v) => {
      const trimmed = v.trim();
      return trimmed.length >= 2 && trimmed.length <= 80 && !/^\d+$/.test(trimmed) && !trimmed.includes("@");
    });

    const supabase = getSupabase();
    if (!supabase) {
      console.error("Supabase not configured for webhook");
      return NextResponse.json({ status: "ok", warning: "db not configured" });
    }

    // Find existing lead by whatsapp — search ALL leads
    const { data: existingLeads } = await supabase
      .from("leads-calculadora-visionaria")
      .select("id, whatsapp, nome")
      .order("created_at", { ascending: false })
      .limit(1000);

    let match = null;

    // Try phone match first
    if (phoneDigits.length >= 10) {
      const last10 = phoneDigits.slice(-10);
      match = existingLeads?.find((lead) => {
        const leadDigits = (lead.whatsapp || "").replace(/\D/g, "");
        if (leadDigits.length < 10) return false;
        const leadLast10 = leadDigits.slice(-10);
        return leadLast10 === last10 || leadDigits.includes(last10) || phoneDigits.includes(leadLast10);
      }) || null;
    }

    // Fallback: try name match if no phone match
    if (!match && nameValues.length > 0) {
      for (const name of nameValues) {
        const nameLower = name.toLowerCase().trim();
        match = existingLeads?.find((lead) => {
          const leadName = (lead.nome || "").toLowerCase().trim();
          return leadName.length >= 2 && (leadName === nameLower || leadName.includes(nameLower) || nameLower.includes(leadName));
        }) || null;
        if (match) break;
      }
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

    // No match found
    console.log("Webhook: no match found. Phone:", phoneDigits || "none", "Names:", nameValues.slice(0, 3).join(", "), "All values:", allValues.slice(0, 10).join(" | "));
    return NextResponse.json({ status: "ok", matched: false, note: "no matching lead found" });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ status: "error", message: String(error) }, { status: 200 });
  }
}
