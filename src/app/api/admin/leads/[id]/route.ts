import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { validateAdminAuth, unauthorizedResponse } from "@/lib/admin-auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!validateAdminAuth(request)) return unauthorizedResponse();
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
