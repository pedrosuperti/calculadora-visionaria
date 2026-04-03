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
    console.log("Forms.app webhook received:", JSON.stringify(payload).slice(0, 500));

    // Extract answers - forms.app sends answers in various formats
    // We try to find whatsapp/phone to match with existing lead
    const answers = payload.answers || payload.fields || payload.responses || payload;

    // Flatten all string values to search for phone number
    const allValues: string[] = [];
    function extractValues(obj: unknown) {
      if (typeof obj === "string") {
        allValues.push(obj);
      } else if (Array.isArray(obj)) {
        obj.forEach(extractValues);
      } else if (obj && typeof obj === "object") {
        Object.values(obj as Record<string, unknown>).forEach(extractValues);
      }
    }
    extractValues(answers);

    // Try to find a phone number (digits only, 10+ chars)
    const phoneMatch = allValues.find((v) => {
      const digits = v.replace(/\D/g, "");
      return digits.length >= 10;
    });

    const supabase = getSupabase();
    if (!supabase) {
      console.error("Supabase not configured for webhook");
      // Still return 200 so Forms.app doesn't retry
      return NextResponse.json({ status: "ok", warning: "db not configured" });
    }

    if (phoneMatch) {
      // Try to match by phone number (strip non-digits for comparison)
      const digits = phoneMatch.replace(/\D/g, "");
      const last10 = digits.slice(-10);

      // Find existing lead by whatsapp — search ALL leads, not just 50
      const { data: existingLeads } = await supabase
        .from("leads-calculadora-visionaria")
        .select("id, whatsapp")
        .order("created_at", { ascending: false })
        .limit(1000);

      const match = existingLeads?.find((lead) => {
        const leadDigits = (lead.whatsapp || "").replace(/\D/g, "");
        if (leadDigits.length < 10) return false;
        const leadLast10 = leadDigits.slice(-10);
        return leadLast10 === last10 || leadDigits.includes(last10) || digits.includes(leadLast10);
      });

      if (match) {
        // Update existing lead with forms.app data
        await supabase
          .from("leads-calculadora-visionaria")
          .update({
            formsapp_completed: true,
            formsapp_data: payload,
            formsapp_at: new Date().toISOString(),
          })
          .eq("id", match.id);

        console.log("Webhook: matched lead", match.id, "phone:", phoneMatch);
        return NextResponse.json({ status: "ok", matched: true, lead_id: match.id });
      }
    }

    // No match found - do NOT create empty lead, just log it
    console.log("Webhook: no match found. Phone:", phoneMatch || "not found", "Payload saved to logs only.");
    return NextResponse.json({ status: "ok", matched: false, note: "no matching lead found" });
  } catch (error) {
    console.error("Webhook error:", error);
    // Return 200 to prevent retries on parse errors
    return NextResponse.json({ status: "error", message: String(error) }, { status: 200 });
  }
}
