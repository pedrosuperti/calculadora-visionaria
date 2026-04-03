import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const { data, error } = await supabase
      .from("leads-calculadora-visionaria")
      .select("*")
      .eq("id", parseInt(id, 10))
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Admin lead fetch error:", error);
    return NextResponse.json({ error: "Erro ao buscar lead" }, { status: 500 });
  }
}
