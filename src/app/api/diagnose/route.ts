import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { ConfirmResult } from "@/lib/types";

const anthropic = new Anthropic();

interface DiagnoseInput {
  nome: string;
  mercado: string;
  mercadoConfirmado: ConfirmResult;
  dores: string[];
  desejos: string[];
}

function buildPrompt(data: DiagnoseInput): string {
  return `Você é um estrategista de negócios exponenciais. Sua missão: analisar o mercado dessa pessoa e gerar 3 ideias concretas de riqueza que ela pode desbloquear — pelo menos 2 usando Inteligência Artificial.

DADOS DO EMPREENDEDOR:
- Nome: ${data.nome}
- Mercado: "${data.mercado}"
- Setor confirmado: ${data.mercadoConfirmado.setor_formatado}
- TAM estimado: R$ ${data.mercadoConfirmado.tam_estimado}/ano
- Dores principais: ${data.dores.join(", ")}
- O que quer enxergar: ${data.desejos.join(", ")}

REGRAS OBRIGATÓRIAS:
1. Gere exatamente 3 ideias. Pelo menos 2 devem usar IA de forma central.
2. Cada ideia deve ser ESPECÍFICA para esse mercado — não genérica. Use o nome do setor, do público, do problema real.
3. As ideias devem ser INOVADORAS mas VIÁVEIS. PROIBIDO sugerir: franquias, expansão de unidades, rede de licenciamento, ou qualquer ideia óbvia que o empreendedor já pensou. As ideias devem fazer a pessoa pensar "eu nunca tinha pensado nisso!" — MAS devem ser implementáveis na realidade do empreendedor brasileiro com os recursos que ele já tem ou pode acessar facilmente.
4. FILTRO DE VIABILIDADE CRÍTICO — Antes de incluir cada ideia, verifique:
   - O empreendedor consegue implementar isso com sua estrutura atual ou com ajustes simples?
   - Existe demanda REAL e comprovada para isso no Brasil?
   - É legal, regulamentado e socialmente aceitável?
   - O público-alvo realmente pagaria por isso?
   - NÃO invente aplicações absurdas, fantasiosas ou que misturem o negócio com contextos incompatíveis (ex: usar animais para segurança high-tech, terapia com espécies exóticas em hospitais, etc.)
   - As ideias devem ser DIFERENCIADAS mas CRÍVEIS — algo que um consultor sério recomendaria.
5. Os valores de potencial_anual devem ser realistas para o mercado brasileiro. Não exagere — números críveis geram mais confiança. Baseie-se em benchmarks reais do setor.
6. O plano de 90 dias deve usar linguagem ACESSÍVEL. Proibido usar: "MVP", "escalar", "pipeline", "funil", "stakeholder", "benchmark". Fale como se estivesse explicando para um amigo empreendedor.
7. O plano deve dar O QUE fazer mas NÃO COMO fazer em detalhe — a pessoa precisa sentir que sabe o caminho mas precisa de ajuda para executar.
8. Os scores devem refletir análise real e VARIAR de pessoa para pessoa:
   - score_atual (20-50): baseado nas dores selecionadas, faturamento implícito e distância até o potencial. Mais dores = score mais baixo.
   - score_visionario (60-92): baseado no potencial combinado das 3 ideias + oportunidades com IA. Varia conforme o mercado.
   - IMPORTANTE: NÃO use sempre os mesmos valores. Cada análise deve ter scores únicos baseados nos dados reais fornecidos.
9. bloqueios: 3 frases curtas e ÚNICAS sobre o que está travando essa pessoa HOJE.
   - OBRIGATÓRIO: cada bloqueio deve ser DIRETAMENTE derivado das dores específicas que a pessoa selecionou: "${data.dores.join('", "')}"
   - Use as PALAVRAS e o CONTEXTO das dores dela — NÃO repita frases genéricas como "agenda lotada", "clientes pagam por você" ou "faturamento travado".
   - Cada mercado e cada combinação de dores deve gerar bloqueios COMPLETAMENTE DIFERENTES.
   - Mencione o setor específico (${data.mercadoConfirmado.setor_formatado}) nos bloqueios quando possível.
10. potenciais: 3 frases curtas sobre o que essa pessoa pode alcançar SE aplicar as ideias (com valores em R$). Devem ser ESPECÍFICOS ao mercado dela, não genéricos.
11. riqueza_total DEVE ser a soma exata dos potencial_anual das 3 ideias. Os valores devem VARIAR conforme o mercado — nem todo mercado tem o mesmo potencial.
12. Linguagem: direta, provocativa, sem jargão corporativo. Fale como mentor, não como consultor.
13. janela_ia: explique por que agora é o momento certo para IA nesse mercado específico

Responda SOMENTE com JSON válido, sem markdown, sem comentários.

{
  "ideias": [
    {
      "nome": "nome criativo e memorável para a ideia",
      "descricao": "2-3 frases explicando a ideia de forma clara e empolgante",
      "potencial_anual": 500000,
      "tempo_retorno_dias": 60,
      "concorrencia": "Baixo",
      "dificuldade": "Facil",
      "cuidados": "1 frase honesta sobre o principal risco ou cuidado",
      "usa_ia": true,
      "como_usa_ia": "1-2 frases explicando como IA é usada nessa ideia",
      "exemplo_real": "1 exemplo real ou analogia de mercado que valida essa ideia",
      "primeiro_passo": "O primeiro passo concreto para começar essa ideia essa semana",
      "publico_alvo": "Quem exatamente pagaria por isso (perfil do cliente ideal)",
      "valuation": 2500000,
      "projecao_6m": 150000,
      "projecao_12m": 350000,
      "projecao_24m": 500000
    },
    {
      "nome": "segunda ideia",
      "descricao": "descrição",
      "potencial_anual": 800000,
      "tempo_retorno_dias": 90,
      "concorrencia": "Medio",
      "dificuldade": "Medio",
      "cuidados": "cuidado principal",
      "usa_ia": true,
      "como_usa_ia": "como usa IA",
      "projecao_6m": 200000,
      "projecao_12m": 550000,
      "projecao_24m": 800000
    },
    {
      "nome": "terceira ideia",
      "descricao": "descrição",
      "potencial_anual": 300000,
      "tempo_retorno_dias": 45,
      "concorrencia": "Baixo",
      "dificuldade": "Facil",
      "cuidados": "cuidado principal",
      "usa_ia": false,
      "como_usa_ia": "",
      "projecao_6m": 80000,
      "projecao_12m": 200000,
      "projecao_24m": 300000
    }
  ],
  "plano": {
    "semanas_1_2": "o que fazer nas primeiras 2 semanas para validar a melhor ideia — específico e acionável",
    "semanas_3_4": "o que fazer nas semanas 3-4 para criar a primeira versão usando IA",
    "mes_2": "o que fazer no mês 2 para abrir para os primeiros clientes",
    "mes_3": "o que fazer no mês 3 para ampliar e automatizar",
    "horas_semana": 10,
    "janela_ia": "por que AGORA é o momento certo para usar IA nesse mercado — específico, não genérico"
  },
  "scores": {
    "score_atual": 35,
    "bloqueios": [
      "[FRASE ÚNICA derivada da dor #1 que a pessoa selecionou, mencionando o setor dela]",
      "[FRASE ÚNICA derivada da dor #2 — diferente das anteriores, específica ao mercado]",
      "[FRASE ÚNICA derivada da dor #3 — contexto real do negócio dessa pessoa]"
    ],
    "score_visionario": 78,
    "potenciais": [
      "[potencial específico da ideia #1 com valor em R$ — mencione o mercado]",
      "[potencial específico da ideia #2 com valor em R$ — diferente do anterior]",
      "[potencial específico da ideia #3 com valor em R$ — conectado ao setor]"
    ],
    "riqueza_total": 1600000
  },
  "insight": "frase provocativa sobre a oportunidade nesse mercado (máx 18 palavras)"
}`;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY not configured");
      return NextResponse.json(
        { error: "Serviço de IA não configurado. Entre em contato com o suporte." },
        { status: 503 }
      );
    }

    const data: DiagnoseInput = await request.json();

    if (!data.mercado?.trim() || !data.mercadoConfirmado) {
      return NextResponse.json(
        { error: "Dados incompletos para gerar diagnóstico." },
        { status: 400 }
      );
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: buildPrompt(data),
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Resposta vazia");
    }

    const text = textBlock.text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("JSON não encontrado");
    }

    const clean = jsonMatch[0].replace(/[\u0000-\u001F\u007F]/g, (ch) => {
      if (ch === "\n" || ch === "\r" || ch === "\t") return ch;
      return "";
    });

    const result = JSON.parse(clean);

    // Ensure riqueza_total matches sum of ideas
    if (result.ideias && result.scores) {
      const sum = result.ideias.reduce(
        (acc: number, i: { potencial_anual: number }) =>
          acc + (i.potencial_anual || 0),
        0
      );
      result.scores.riqueza_total = sum;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Diagnose error:", error);
    return NextResponse.json(
      { error: "Erro ao gerar diagnóstico. Tente novamente." },
      { status: 500 }
    );
  }
}
