import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY not configured");
      return NextResponse.json(
        { error: "Serviço de IA não configurado. Entre em contato com o suporte." },
        { status: 503 }
      );
    }

    const { mercado, imagem } = await request.json();

    if (!mercado?.trim()) {
      return NextResponse.json(
        { error: "Descreva seu mercado para continuar." },
        { status: 400 }
      );
    }

    const prompt = `Você é um analista de mercado especializado com acesso a dados de mercado brasileiros e globais. Analise o mercado/setor descrito abaixo e retorne SOMENTE JSON válido, sem markdown.

${imagem ? "A pessoa também enviou uma imagem da bio do Instagram dela. Use as informações da imagem para enriquecer a análise do mercado." : ""}

Mercado descrito: "${mercado}"

INSTRUÇÕES DE ANÁLISE:
1. Identifique o setor ESPECÍFICO dessa pessoa (não genérico). Ex: se ela disse "dentista com clínica", o setor é "Odontologia Clínica", não "Saúde".
2. O tam_estimado deve ser o TAM (Total Addressable Market) anual do setor NO BRASIL em reais.
   - Use dados reais de mercado. Pesquise o tamanho real do setor.
   - Exemplos de referência: Odontologia BR ~R$43 bilhões/ano, Arquitetura BR ~R$12 bilhões/ano, Personal Trainers BR ~R$8 bilhões/ano, Alimentação Saudável BR ~R$100 bilhões/ano.
   - O valor deve ser CRÍVEL e VARIAR conforme o mercado. NÃO use sempre o mesmo número.
   - Para nichos muito específicos, estime a fatia relevante do mercado total.
3. A descrição deve mencionar o tamanho do mercado de forma impressionante mas honesta.

Retorne:
{
  "setor_formatado": "nome do setor em português, claro e profissional (ex: Odontologia Clínica, Arquitetura de Alto Padrão)",
  "descricao": "2-3 frases descrevendo o que essa pessoa faz, para quem, e o tamanho da oportunidade. Inclua o dado de mercado. Termine com: a maioria dos profissionais desse mercado acessa menos de 2% do potencial real.",
  "tam_estimado": 0
}

IMPORTANTE: o tam_estimado deve ser um número realista em reais, sem aspas. Ex: 43000000000 para R$43 bilhões. Retorne SOMENTE o JSON.`;

    const content: Anthropic.MessageCreateParams["messages"][0]["content"] = [];

    if (imagem) {
      // Extract media type and base64 data from data URL
      // Client compresses to JPEG, but handle other formats too
      const match = imagem.match(
        /^data:(image\/(jpeg|png|gif|webp));base64,(.+)$/
      );
      if (match) {
        // Check size - skip image if base64 data > 5MB
        if (match[3].length > 5 * 1024 * 1024) {
          console.warn("Image too large, skipping. Size:", match[3].length);
        } else {
          content.push({
            type: "image",
            source: {
              type: "base64",
              media_type: match[1] as
                | "image/jpeg"
                | "image/png"
                | "image/gif"
                | "image/webp",
              data: match[3],
            },
          });
        }
      } else {
        console.warn("Image format not supported, skipping. Starts with:", imagem.substring(0, 50));
      }
    }

    content.push({ type: "text", text: prompt });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{ role: "user", content }],
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
    console.error("Confirm error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("Could not process image") || msg.includes("image")) {
      return NextResponse.json(
        { error: "Não conseguimos processar a imagem. Tente sem o print ou use uma imagem menor." },
        { status: 400 }
      );
    }
    if (msg.includes("authentication") || msg.includes("api_key") || msg.includes("401")) {
      return NextResponse.json(
        { error: "Serviço de IA não configurado. Entre em contato com o suporte." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Erro ao analisar mercado. Tente novamente." },
      { status: 500 }
    );
  }
}
