import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { FormData } from "@/lib/types";

const anthropic = new Anthropic();

function buildPrompt(data: FormData): string {
  const ticketInfo = data.ticketMedio
    ? `Ticket médio por cliente: R$${data.ticketMedio.toLocaleString("pt-BR")}`
    : "Ticket médio: não informado";
  const clientesInfo = data.clientesAtivos
    ? `Clientes ativos: ${data.clientesAtivos}`
    : "Clientes ativos: não informado";
  const anosInfo = data.anosNegocio
    ? `Anos no negócio: ${data.anosNegocio}`
    : "Anos no negócio: não informado";

  return `Você é um consultor estratégico de negócios especializado em transformação digital e crescimento exponencial com IA. Seu papel é analisar o perfil de um empreendedor e gerar um diagnóstico de oportunidades com números realistas e aplicáveis.

PERFIL DO EMPREENDEDOR:
- Setor/tipo de negócio: ${data.setor}
- Faturamento mensal atual: R$${data.faturamento.toLocaleString("pt-BR")}
- ${ticketInfo}
- ${clientesInfo}
- ${anosInfo}
- Maior gargalo atual: ${data.maiorGargalo}
- Uso atual de IA: ${data.usoIA}

INSTRUÇÕES:

Gere um diagnóstico completo seguindo EXATAMENTE a estrutura JSON abaixo. Todas as ideias devem ser:
1. ESPECÍFICAS para o setor informado (nunca genéricas)
2. PRÁTICAS e implementáveis (o empreendedor deve conseguir visualizar a execução)
3. Com NOMES MEMORÁVEIS e criativos (ex: "Máquina de Indicação Automática", "Radar de Clientes Inativos")
4. Com IMPACTOS FINANCEIROS realistas baseados no faturamento informado
5. Com FONTES reais e verificáveis (use dados de mercado conhecidos: McKinsey, Deloitte, Gartner, IBGE, Sebrae, Statista, ou pesquisas setoriais reais)

REGRAS DE CÁLCULO:
- Ideias do Milão (curto prazo): impacto típico entre 2% e 10% do faturamento mensal
- Ideias do Milhão (médio prazo): impacto típico entre 15% e 60% do faturamento mensal
- Ideia do Bilhão (transformadora): projeção de 12-18 meses com potencial de 2x a 5x o faturamento
- Projeções "sem mudança": crescimento orgânico de 3-5% ao ano
- Projeções "com ideias": soma dos impactos aplicados progressivamente
- Valuation: use múltiplos realistas para o setor (tipicamente 2x a 8x faturamento anual)
- Riqueza desbloqueável: diferença entre o cenário "com ideias" e "sem mudança" em 12 meses

CALIBRAÇÃO POR USO DE IA:
- Se "Não uso IA": sugira ideias mais acessíveis, com menor barreira técnica
- Se "Uso básico": sugira automações intermediárias e integrações
- Se "Já uso IA integrada": sugira estratégias avançadas de escala e novos modelos

Responda APENAS com JSON válido, sem markdown, sem comentários, sem texto antes ou depois. O JSON deve seguir exatamente esta estrutura:

{
  "ideiasDoMilao": [
    {
      "nome": "string (nome memorável e criativo)",
      "descricao": "string (2-3 frases práticas e específicas para o setor)",
      "impactoMin": number (valor em reais),
      "impactoMax": number (valor em reais),
      "prazo": "string (ex: '1 a 2 semanas')",
      "fonte": "string (fonte real: 'Nome do estudo/instituição, ano')"
    }
  ],
  "ideiasDoMilhao": [
    {
      "nome": "string",
      "descricao": "string (2-3 frases)",
      "impactoMin": number,
      "impactoMax": number,
      "prazo": "string (ex: '2 a 3 meses')",
      "fonte": "string"
    }
  ],
  "ideiaDoBlihao": {
    "tipo": "novo_produto" | "recorrencia" | "novo_mercado",
    "nome": "string",
    "descricao": "string (3-4 frases com visão transformadora)",
    "visao12a18m": "string (como o negócio fica em 12-18 meses)",
    "dadoMercado": "string (dado real de mercado com número)",
    "fonte": "string (fonte verificável)",
    "impactoMin": number,
    "impactoMax": number
  },
  "projecoes": {
    "faturamento6mSemMudanca": number,
    "faturamento6mComIdeias": number,
    "faturamento12mSemMudanca": number,
    "faturamento12mComIdeias": number
  },
  "valuation": {
    "estimativaAtual": number,
    "potencialComIdeias": number,
    "multiploSetor": number
  },
  "riquezaDesbloqueavel12m": number,
  "insightFinal": "string (1-2 frases poderosas e personalizadas sobre a oportunidade deste empreendedor específico)"
}

Gere EXATAMENTE 3 ideias do Milão e 3 ideias do Milhão. A ideia do Bilhão deve ser 1 única ideia transformadora.`;
}

export async function POST(request: NextRequest) {
  try {
    const data: FormData = await request.json();

    if (!data.setor || !data.faturamento || !data.maiorGargalo || !data.usoIA) {
      return NextResponse.json(
        { error: "Campos obrigatórios não preenchidos" },
        { status: 400 }
      );
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: buildPrompt(data),
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Resposta inesperada da API");
    }

    const result = JSON.parse(textBlock.text);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Erro no diagnóstico:", error);
    return NextResponse.json(
      { error: "Erro ao gerar diagnóstico. Tente novamente." },
      { status: 500 }
    );
  }
}
