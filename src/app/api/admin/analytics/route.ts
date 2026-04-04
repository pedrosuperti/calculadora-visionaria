import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { validateAdminAuth, unauthorizedResponse } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  if (!validateAdminAuth(request)) return unauthorizedResponse();
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json([]);
  }

  const { data, error } = await supabase
    .from("calc-analytics")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    console.error("Analytics fetch error:", error);
    return NextResponse.json([]);
  }

  return NextResponse.json(data || []);
}
