import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { randomBytes } from "crypto";

interface LeadInput {
  nome: string;
  mercado: string;
  whatsapp: string;
  faturamento: string;
  equipe: string;
  urgencia: string;
  investimento: string;
  dores: string[];
  ideias?: unknown[];
}

function calcQualification(data: LeadInput): {
  qualified: boolean;
  tier: "hot" | "warm" | "cold";
  internalScore: number;
  topPercent: number;
} {
  let score = 0;

  // Faturamento (até 30pts) — maior peso
  const fat = data.faturamento;
  if (fat === "R$1 milhão a R$5 milhões") score += 30;
  else if (fat === "R$500 mil a R$1 milhão") score += 28;
  else if (fat === "R$100 mil a R$500 mil") score += 25;
  else if (fat === "R$50 mil a R$100 mil") score += 20;
  else if (fat === "R$10 mil a R$50 mil") score += 12;
  else if (fat === "Até R$10 mil") score += 5;

  // Investimento (até 25pts)
  const inv = data.investimento;
  if (inv === "Acima de R$30 mil") score += 25;
  else if (inv === "R$15 mil a R$30 mil") score += 22;
  else if (inv === "R$5 mil a R$15 mil") score += 18;
  else if (inv === "R$2 mil a R$5 mil") score += 10;
  else if (inv === "Até R$2 mil") score += 4;

  // Urgência (até 25pts) — novo campo, alto peso
  const urg = data.urgencia;
  if (urg === "Preciso resolver isso agora") score += 25;
  else if (urg === "Nos próximos 3 meses") score += 18;
  else if (urg === "Estou planejando para este ano") score += 8;
  else if (urg === "Só estou explorando por enquanto") score += 2;

  // Equipe (até 10pts)
  if (data.equipe === "Mais de 15") score += 10;
  else if (data.equipe === "6-15") score += 10;
  else if (data.equipe === "2-5") score += 7;

  // Dores de alto valor (até 10pts)
  if (data.dores.includes("Dependo demais da minha presenca")) score += 5;
  if (data.dores.includes("Bati num teto de faturamento")) score += 5;

  // 3 tiers: hot (70+), warm (40-69), cold (<40)
  let tier: "hot" | "warm" | "cold";
  if (score >= 70) tier = "hot";
  else if (score >= 40) tier = "warm";
  else tier = "cold";

  const qualified = tier === "hot" || tier === "warm";

  let topPercent: number;
  if (score >= 85) topPercent = 3;
  else if (score >= 70) topPercent = 8;
  else if (score >= 55) topPercent = 15;
  else if (score >= 40) topPercent = 25;
  else topPercent = 40;

  return { qualified, tier, internalScore: score, topPercent };
}

export async function POST(request: NextRequest) {
  try {
    const data: LeadInput = await request.json();

    if (!data.whatsapp?.trim()) {
      return NextResponse.json(
        { error: "WhatsApp é obrigatório." },
        { status: 400 }
      );
    }

    const result = calcQualification(data);

    // Save to Supabase
    const supabase = getSupabase();
    const shareToken = randomBytes(12).toString("hex");
    const { error: dbError } = supabase ? await supabase.from("leads-calculadora-visionaria").insert({
      nome: data.nome,
      mercado: data.mercado,
      whatsapp: data.whatsapp,
      faturamento: data.faturamento,
      equipe: data.equipe,
      urgencia: data.urgencia,
      investimento: data.investimento,
      dores: data.dores,
      qualified: result.qualified,
      tier: result.tier,
      internal_score: result.internalScore,
      top_percent: result.topPercent,
      share_token: shareToken,
      ideias: data.ideias || null,
    }) : { error: null };

    if (dbError) {
      console.error("Supabase insert error:", dbError);
      // Don't fail the request if DB save fails - still return result
    }

    console.log("New lead:", data.nome, data.whatsapp, result.qualified ? "QUALIFIED" : "nurture");

    return NextResponse.json(result);
  } catch (error) {
    console.error("Lead error:", error);
    return NextResponse.json(
      { error: "Erro ao processar. Tente novamente." },
      { status: 500 }
    );
  }
}
