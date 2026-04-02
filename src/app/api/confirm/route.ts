import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { mercado, imagem } = await request.json();

    if (!mercado?.trim()) {
      return NextResponse.json(
        { error: "Descreva seu mercado para continuar." },
        { status: 400 }
      );
    }

    const prompt = `Você é um analista de mercado especializado. Analise o mercado/setor descrito abaixo e retorne SOMENTE JSON válido, sem markdown.

${imagem ? "A pessoa também enviou uma imagem da bio do Instagram dela. Use as informações da imagem para enriquecer a análise do mercado." : ""}

Mercado descrito: "${mercado}"

Retorne:
{
  "setor_formatado": "nome do setor em português, claro e profissional",
  "descricao": "2-3 frases descrevendo o que essa pessoa faz, para quem, e o tamanho da oportunidade. Termine com: a maioria dos profissionais desse mercado acessa menos de 2% do potencial real.",
  "tam_estimado": 0
}

O tam_estimado deve ser o TAM anual em reais do mercado no Brasil. Use dados reais. Retorne SOMENTE o JSON.`;

    const content: Anthropic.MessageCreateParams["messages"][0]["content"] = [];

    if (imagem) {
      // Extract media type and base64 data from data URL
      const match = imagem.match(
        /^data:(image\/(jpeg|png|gif|webp));base64,(.+)$/
      );
      if (match) {
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
    return NextResponse.json(
      { error: "Erro ao analisar mercado. Tente novamente." },
      { status: 500 }
    );
  }
}
