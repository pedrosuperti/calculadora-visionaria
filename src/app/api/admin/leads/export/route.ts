import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "DB not configured" }, { status: 503 });
    }

    const { data, error } = await supabase
      .from("leads-calculadora-visionaria")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const leads = data || [];
    const headers = [
      "ID", "Data", "Nome", "Mercado", "WhatsApp", "Faturamento",
      "Equipe", "Urgência", "Investimento", "Dores", "Tier", "Score",
      "Top%", "Status Contato", "Notas", "Aplicou Forms.app", "Data Forms.app"
    ];

    const rows = leads.map((l) => [
      l.id,
      l.created_at ? new Date(l.created_at).toLocaleString("pt-BR") : "",
      l.nome || "",
      l.mercado || "",
      l.whatsapp || "",
      l.faturamento || "",
      l.equipe || "",
      l.urgencia || "",
      l.investimento || "",
      (l.dores || []).join("; "),
      l.tier || "",
      l.internal_score || 0,
      l.top_percent || "",
      l.contact_status || "",
      (l.notes || "").replace(/\n/g, " "),
      l.formsapp_completed ? "Sim" : "Não",
      l.formsapp_at ? new Date(l.formsapp_at).toLocaleString("pt-BR") : "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=leads-visor-${new Date().toISOString().slice(0, 10)}.csv`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
