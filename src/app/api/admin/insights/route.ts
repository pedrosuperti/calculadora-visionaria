import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { validateAdminAuth, unauthorizedResponse } from "@/lib/admin-auth";

const anthropic = new Anthropic();

interface LeadData {
  nome: string;
  mercado: string;
  faturamento: string;
  equipe: string;
  urgencia: string;
  investimento: string;
  dores: string[];
  tier: string;
  internal_score: number;
  formsapp_data: Record<string, unknown> | null;
}

function buildPrompt(lead: LeadData): string {
  // Extract forms.app answers if available
  let formsInfo = "";
  if (lead.formsapp_data) {
    const answers = (lead.formsapp_data.answers || []) as { title: string; value: string }[];
    if (Array.isArray(answers) && answers.length > 0) {
      formsInfo = answers.map((a) => `- ${a.title}: ${a.value}`).join("\n");
    }
  }

  return `Você é o assistente de vendas da equipe de Pedro Superti, especialista em diferenciação de negócios e posicionamento premium. Sua missão é analisar o perfil deste lead e gerar insights acionáveis para a equipe de vendas (Alê) usar na abordagem.

DADOS DO LEAD:
- Nome: ${lead.nome}
- Mercado: ${lead.mercado}
- Faturamento: ${lead.faturamento}
- Equipe: ${lead.equipe}
- Urgência: ${lead.urgencia}
- Investimento declarado: ${lead.investimento}
- Dores: ${lead.dores?.join(", ") || "não informado"}
- Tier: ${lead.tier?.toUpperCase()} (Score: ${lead.internal_score}/100)
${formsInfo ? `\nRESPOSTAS DA APLICAÇÃO (Forms.app):\n${formsInfo}` : ""}

PRODUTOS DISPONÍVEIS:
1. **Ignition** (R$25.000) — Programa de transformação de negócios com diferenciação, posicionamento premium e uso de IA. Ideal para quem fatura acima de R$50 mil/mês e quer escalar com inteligência.
2. **Consultoria Individual** — Sessões estratégicas personalizadas para casos específicos.
3. **Comunidade/Conteúdo** — Para leads mais frios que precisam de mais nutrição.

GERE UM JSON com esta estrutura EXATA:
{
  "maior_dor": "a dor principal identificada em 1 frase",
  "ponto_forte": "o maior diferencial/ativo que essa pessoa já tem",
  "ponto_fraco": "o maior gap ou limitação que precisa resolver",
  "abordagens": [
    "sugestão 1 de como o Alê pode abordar essa pessoa (tom, ângulo, argumento)",
    "sugestão 2 de abordagem alternativa",
    "sugestão 3 de abordagem de backup"
  ],
  "conexao_ignition": "como conectar o que essa pessoa PRECISA com o que o Ignition ENTREGA — seja específico ao negócio dela",
  "produto_ideal": "Ignition | Consultoria | Comunidade",
  "probabilidade_fechamento": "Alta | Média | Baixa",
  "frase_gancho": "uma frase que o Alê pode usar na conversa para gerar interesse imediato (máx 25 palavras)",
  "alertas": "qualquer sinal de atenção: objeções prováveis, limitações financeiras, urgência real vs percebida"
}

REGRAS:
- Seja ESPECÍFICO ao negócio da pessoa. Não use frases genéricas.
- As abordagens devem ser práticas e prontas para usar no WhatsApp.
- A frase gancho deve ser matadora — algo que faça a pessoa querer ouvir mais.
- Considere o faturamento e equipe ao recomendar o produto (Ignition é R$25k, nem todos podem).
- Se a pessoa fatura menos de R$30k/mês, considere se Ignition é realmente viável.
- Retorne APENAS o JSON, sem texto adicional.`;
}

export async function POST(request: NextRequest) {
  if (!validateAdminAuth(request)) return unauthorizedResponse();
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Serviço de IA não configurado." },
        { status: 503 }
      );
    }

    const lead: LeadData = await request.json();

    if (!lead.nome?.trim()) {
      return NextResponse.json(
        { error: "Dados incompletos." },
        { status: 400 }
      );
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{ role: "user", content: buildPrompt(lead) }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Resposta vazia");
    }

    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("JSON não encontrado");
    }

    const clean = jsonMatch[0].replace(/[\u0000-\u001F\u007F]/g, (ch) => {
      if (ch === "\n" || ch === "\r" || ch === "\t") return ch;
      return "";
    });

    const result = JSON.parse(clean);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Insights error:", error);
    return NextResponse.json(
      { error: "Erro ao gerar insights." },
      { status: 500 }
    );
  }
}
