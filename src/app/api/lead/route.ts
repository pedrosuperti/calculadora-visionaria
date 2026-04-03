import { NextRequest, NextResponse } from "next/server";

interface LeadInput {
  nome: string;
  mercado: string;
  whatsapp: string;
  faturamento: string;
  equipe: string;
  anosExperiencia: string;
  investimento: string;
  dores: string[];
}

function calcQualification(data: LeadInput): {
  qualified: boolean;
  internalScore: number;
  topPercent: number;
} {
  let score = 0;

  // Faturamento
  if (
    data.faturamento === "R$100k-500k" ||
    data.faturamento === "Acima de R$500k"
  ) {
    score += 35;
  } else if (data.faturamento === "R$50k-100k") {
    score += 35;
  } else if (data.faturamento === "R$30k-50k") {
    score += 30;
  } else if (data.faturamento === "R$10k-30k") {
    score += 20;
  }

  // Investimento
  if (
    data.investimento === "R$5k-15k" ||
    data.investimento === "Acima de R$15k"
  ) {
    score += 30;
  } else if (data.investimento === "R$2k-5k") {
    score += 20;
  } else if (data.investimento === "Ate R$2k") {
    score += 10;
  }

  // Anos experiencia
  const anos = parseInt(data.anosExperiencia) || 0;
  if (anos >= 10) score += 15;
  else if (anos >= 5) score += 10;
  else if (anos >= 2) score += 5;

  // Equipe
  if (
    data.equipe === "2-5" ||
    data.equipe === "6-15" ||
    data.equipe === "Mais de 15"
  ) {
    score += 10;
  }

  // Dores de alto valor
  if (data.dores.includes("Dependo demais da minha presenca")) score += 5;
  if (data.dores.includes("Bati num teto de faturamento")) score += 5;

  const qualified = score >= 50;

  // Map score to top percent (higher score = more exclusive = lower percent)
  let topPercent: number;
  if (score >= 80) topPercent = 5;
  else if (score >= 70) topPercent = 8;
  else if (score >= 60) topPercent = 12;
  else if (score >= 50) topPercent = 18;
  else if (score >= 40) topPercent = 25;
  else topPercent = 35;

  return { qualified, internalScore: score, topPercent };
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

    // Log lead (Vercel has read-only filesystem, so just log)
    const lead = {
      ...data,
      ...result,
      timestamp: new Date().toISOString(),
    };

    console.log("New lead:", JSON.stringify(lead, null, 2));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Lead error:", error);
    return NextResponse.json(
      { error: "Erro ao processar. Tente novamente." },
      { status: 500 }
    );
  }
}
