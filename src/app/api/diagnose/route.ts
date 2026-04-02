import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { FormData } from "@/lib/types";

const anthropic = new Anthropic();

function buildPrompt(data: FormData): string {
  const extras = [
    data.pais && data.pais !== "Brasil" ? `País de atuação: ${data.pais}` : "",
    data.publico ? `Público-alvo: ${data.publico}` : "",
    data.problema ? `Problema que resolve: ${data.problema}` : "",
    data.receita_atual ? `Receita atual: R$ ${data.receita_atual}/mês` : "",
    data.modelo_atual ? `Modelo de negócio atual: ${data.modelo_atual}` : "",
    data.anos ? `Anos de experiência: ${data.anos}` : "",
  ].filter(Boolean).join("\n");

  return `Você é um estrategista de negócios exponenciais especializado em ajudar empreendedores estabelecidos a descobrir como usar Inteligência Artificial para transformar sua experiência de mercado em modelos escaláveis — novos produtos, novas fontes de receita, acesso a mercados maiores.

Contexto crítico: A pessoa usa ESSA ferramenta no Visionários Day, um evento sobre como criar modelos escaláveis com IA. Ela já tem experiência no mercado informado. O objetivo é DESPERTAR nela a visão de que existe um nível de oportunidade muito além do que ela está acessando hoje — e que a IA torna isso possível agora, mesmo sem equipe grande ou capital pesado.

Dados informados:
- Mercado/setor: "${data.mercado}"
- Ticket médio atual: R$ ${data.ticket}/mês por cliente
${extras}

REGRAS para gerar as respostas:
1. Os campos de N1/N2/N3 devem mostrar a MESMA experiência/conhecimento da pessoa em 3 níveis de ambição — sempre conectando com o que IA permite fazer hoje
2. Os modelos alternativos devem ser todos baseados em IA — SaaS com IA, agente IA, comunidade + IA, plataforma IA, etc.
3. O conselho_visionario deve ser UMA ação de validação rápida, específica, que inclua como IA poderia ser usada
4. As sugestoes_foco devem mostrar ângulos onde IA multiplica o potencial — público que paga mais, mercado maior que IA permite acessar, nicho onde a barreira de entrada cai com IA
5. O campo ia_muda_tudo deve ser a peça central: o que muda ESPECIFICAMENTE nesse mercado quando você usa IA — o que era impossível antes e agora não é
6. Linguagem: direta, provocativa, sem jargão corporativo. Fale como mentor, não como consultor.

Responda SOMENTE com JSON válido, sem markdown. Use dados reais do mercado brasileiro (ou do país informado).

{
  "setor_formatado": "nome do setor em português",
  "pais_mercado": "país ou região",
  "profissionais_total": 150000,
  "empresas_total": 45000,
  "tam_anual": 2500000000,
  "ticket_sugerido_min": 300,
  "ticket_sugerido_max": 800,
  "anos_experiencia": 10,

  "nivel_n1": {
    "label": "Produto / Serviço",
    "descricao": "como é esse mercado quando você trabalha no N1 — sem IA, um cliente por vez, trocando tempo por dinheiro",
    "potencial_anual": 800000,
    "clientes_necessarios": 70,
    "exemplo_empresa": "empresa que ficou no N1",
    "teto": "por que esse modelo tem teto baixo"
  },
  "nivel_n2": {
    "label": "Empresa Escalável",
    "descricao": "como seria se você usasse IA para atender 10x mais clientes com o mesmo esforço — produto digital, ferramenta, metodologia sistematizada com IA",
    "potencial_anual": 5000000,
    "clientes_necessarios": 200,
    "exemplo_empresa": "empresa que fez esse salto no setor",
    "teto": "onde esse modelo ainda tem limite"
  },
  "nivel_n3": {
    "label": "Plataforma de Mercado",
    "descricao": "como seria se você usasse IA para criar uma plataforma que conecta, automatiza ou domina o setor inteiro — não só presta serviço, mas se torna a infraestrutura do mercado",
    "potencial_anual": 50000000,
    "clientes_necessarios": 1000,
    "exemplo_empresa": "unicórnio ou startup de referência nesse setor",
    "teto": "o horizonte desse modelo (quase sem teto)"
  },

  "modelo_sugerido_nivel": "n2",

  "modelos_alternativos": [
    {
      "modelo": "Agente IA Vertical",
      "descricao": "um agente de IA especializado nesse mercado específico que faz X tarefa que hoje consome horas de profissionais — construído em semanas, vendido como SaaS",
      "potencial_anual": 8000000
    },
    {
      "modelo": "Plataforma + Comunidade",
      "descricao": "metodologia proprietária + comunidade paga + ferramentas IA que automatizam o que você sabe fazer — recorrência sem limite de horas",
      "potencial_anual": 5000000
    },
    {
      "modelo": "Marketplace Especializado",
      "descricao": "plataforma que conecta oferta e demanda nesse mercado com IA mediando o match, qualidade, entrega — você constrói a infraestrutura que todo o setor usa",
      "potencial_anual": 25000000
    }
  ],

  "ia_muda_tudo": {
    "antes": "o que era impossível ou muito caro de fazer nesse mercado sem IA — em 1-2 frases diretas",
    "depois": "o que se torna possível hoje com IA para quem já tem conhecimento desse mercado — específico, não genérico",
    "janela": "por quanto tempo essa janela de vantagem existe antes de virar commodity — e por que agir agora"
  },

  "insight": "frase poderosa e provocativa sobre a oportunidade com IA nesse mercado (máx 18 palavras, sem clichê)",
  "insight_n3": "o produto/plataforma com IA que esse mercado vai precisar nos próximos 3 anos que ainda não existe",
  "benchmark_mundial": "empresa mundial que já faz isso com IA nesse setor",
  "concentracao_regiao": "dados sobre concentração na região informada",

  "sugestoes_foco": [
    {
      "tipo": "Com IA: Público de maior valor",
      "sugestao": "subpúblico específico que pagaria 3–5x mais por uma solução com IA — e por quê esse público é mais acessível com IA do que manualmente",
      "potencial_anual": 12000000,
      "motivo": "o que IA torna possível para esse público que antes não era viável"
    },
    {
      "tipo": "Com IA: Escala nacional",
      "sugestao": "como usar IA para atender esse mercado em todo o Brasil (ou mundo) sem precisar de equipe proporcional — o que quebra a barreira geográfica",
      "potencial_anual": 80000000,
      "motivo": "como IA remove o gargalo de execução que antes limitava a escala"
    },
    {
      "tipo": "Com IA: Novo produto",
      "sugestao": "produto digital ou ferramenta IA que você poderia criar em 4–8 semanas usando seu conhecimento desse mercado — que não existia antes da IA",
      "potencial_anual": 5000000,
      "motivo": "por que seu conhecimento do mercado é o ativo mais valioso para construir isso"
    }
  ],

  "conselho_visionario": "UMA ação de validação nos próximos 7 dias que combina seu conhecimento do mercado com IA — específica, acionável, que produz um sinal claro de demanda. Inclua como usar IA na execução. Ex: 'Crie um diagnóstico automatizado de NR-01 em 2h usando ChatGPT, mande para 10 contatos do RH e veja quem pede o resultado completo.'"
}`;
}

export async function POST(request: NextRequest) {
  try {
    const data: FormData = await request.json();

    if (!data.mercado?.trim() || !data.ticket) {
      return NextResponse.json(
        { error: "Preencha o mercado e o ticket para continuar." },
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

    // Sanitize control characters
    const clean = jsonMatch[0].replace(/[\u0000-\u001F\u007F]/g, (ch) => {
      if (ch === "\n" || ch === "\r" || ch === "\t") return ch;
      return "";
    });

    const result = JSON.parse(clean);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Sonda error:", error);
    return NextResponse.json(
      { error: "Erro ao gerar diagnóstico. Tente novamente." },
      { status: 500 }
    );
  }
}
