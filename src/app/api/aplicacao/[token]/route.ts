import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// GET: Load lead basic info (name only) to personalize the form
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
      .select("id, nome, whatsapp, faturamento, equipe, mercado, dores, formsapp_completed")
      .eq("share_token", token)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Link inválido" }, { status: 404 });
    }

    return NextResponse.json({
      nome: data.nome,
      whatsapp: data.whatsapp,
      faturamento: data.faturamento,
      equipe: data.equipe,
      mercado: data.mercado,
      dores: data.dores,
      already_submitted: !!data.formsapp_completed,
    });
  } catch (error) {
    console.error("Aplicacao GET error:", error);
    return NextResponse.json({ error: "Erro ao carregar" }, { status: 500 });
  }
}

// POST: Save form submission directly to the lead
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    if (!token || token.length < 20) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    const body = await request.json();
    const { answers } = body;

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json({ error: "Respostas vazias" }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

    // Find lead by token
    const { data: lead, error: findError } = await supabase
      .from("leads-calculadora-visionaria")
      .select("id, nome")
      .eq("share_token", token)
      .single();

    if (findError || !lead) {
      return NextResponse.json({ error: "Link inválido" }, { status: 404 });
    }

    // Save directly to the lead — no matching needed
    const { error: updateError } = await supabase
      .from("leads-calculadora-visionaria")
      .update({
        formsapp_completed: true,
        formsapp_data: { answers, source: "aplicacao_propria", submitted_at: new Date().toISOString() },
        formsapp_at: new Date().toISOString(),
      })
      .eq("id", lead.id);

    if (updateError) {
      console.error("Save error:", updateError);
      return NextResponse.json({ error: "Erro ao salvar" }, { status: 500 });
    }

    return NextResponse.json({ status: "ok", lead_id: lead.id });
  } catch (error) {
    console.error("Aplicacao POST error:", error);
    return NextResponse.json({ error: "Erro ao salvar" }, { status: 500 });
  }
}
