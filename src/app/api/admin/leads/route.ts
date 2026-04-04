import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { validateAdminAuth, unauthorizedResponse } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  if (!validateAdminAuth(request)) return unauthorizedResponse();
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 503 }
      );
    }

    const { data, error } = await supabase
      .from("leads-calculadora-visionaria")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("Admin leads fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Admin leads error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar leads" },
      { status: 500 }
    );
  }
}
