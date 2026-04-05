import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// Public endpoint — no auth required, secured by unguessable token
export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    if (!token || token.length < 20) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

    const { data, error } = await supabase
      .from("leads-calculadora-visionaria")
      .select("id, nome, mercado, whatsapp, faturamento, equipe, urgencia, investimento, dores, qualified, tier, internal_score, top_percent, contact_status, formsapp_completed, formsapp_at, formsapp_data, created_at, notes")
      .eq("share_token", token)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Public ficha error:", error);
    return NextResponse.json({ error: "Erro ao buscar lead" }, { status: 500 });
  }
}
