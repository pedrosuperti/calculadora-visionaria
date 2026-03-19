"use client";

import type { IdeiaBilhao } from "@/lib/types";

interface Props {
  ideia: IdeiaBilhao;
  onNext: () => void;
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const TIPO_LABELS: Record<string, string> = {
  novo_produto: "Novo Produto",
  recorrencia: "Modelo Recorrente",
  novo_mercado: "Novo Mercado",
};

export default function BilhaoScreen({ ideia, onNext }: Props) {
  return (
    <div className="screen bilhao-screen fade-in">
      <div className="bilhao-glow" />

      <div className="screen-header">
        <span className="screen-badge badge-bilhao">Visão transformadora</span>
        <h2 className="screen-title title-bilhao">Ideia do Bilhão</h2>
        <p className="screen-subtitle">
          Uma mudança de paradigma que pode redefinir o futuro do seu negócio.
        </p>
      </div>

      <div className="bilhao-card fade-up">
        <div className="bilhao-tipo-badge">
          {TIPO_LABELS[ideia.tipo] || ideia.tipo}
        </div>

        <h3 className="bilhao-nome">{ideia.nome}</h3>
        <p className="bilhao-desc">{ideia.descricao}</p>

        <div className="bilhao-visao">
          <span className="bilhao-visao-label">Visão 12-18 meses</span>
          <p>{ideia.visao12a18m}</p>
        </div>

        <div className="bilhao-impacto">
          <span className="meta-label">Potencial de impacto</span>
          <span className="bilhao-impacto-value">
            {formatBRL(ideia.impactoMin)} a {formatBRL(ideia.impactoMax)}
          </span>
        </div>

        <div className="bilhao-mercado">
          <span className="bilhao-mercado-icon">&#9672;</span>
          <div>
            <p className="bilhao-dado">{ideia.dadoMercado}</p>
            <p className="bilhao-fonte">Fonte: {ideia.fonte}</p>
          </div>
        </div>
      </div>

      <button onClick={onNext} className="btn-primary btn-bilhao">
        Ver resumo completo
      </button>
    </div>
  );
}
