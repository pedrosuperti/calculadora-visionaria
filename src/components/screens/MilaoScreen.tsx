"use client";

import type { Ideia } from "@/lib/types";

interface Props {
  ideias: Ideia[];
  onNext: () => void;
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function MilaoScreen({ ideias, onNext }: Props) {
  return (
    <div className="screen milao-screen fade-in">
      <div className="screen-header">
        <span className="screen-badge badge-milao">Curto prazo</span>
        <h2 className="screen-title title-milao">Ideias do Milão</h2>
        <p className="screen-subtitle">
          Ações práticas que você pode implementar nos próximos dias e já começar
          a ver resultado.
        </p>
      </div>

      <div className="ideas-grid">
        {ideias.map((ideia, i) => (
          <div key={i} className="idea-card card-milao fade-up" style={{ animationDelay: `${i * 0.15}s` }}>
            <div className="idea-number">#{i + 1}</div>
            <h3 className="idea-name">{ideia.nome}</h3>
            <p className="idea-desc">{ideia.descricao}</p>
            <div className="idea-meta">
              <div className="idea-impact">
                <span className="meta-label">Impacto estimado</span>
                <span className="meta-value value-milao">
                  {formatBRL(ideia.impactoMin)} a {formatBRL(ideia.impactoMax)}
                </span>
              </div>
              <div className="idea-prazo">
                <span className="meta-label">Prazo</span>
                <span className="meta-value">{ideia.prazo}</span>
              </div>
            </div>
            <div className="idea-fonte">Fonte: {ideia.fonte}</div>
          </div>
        ))}
      </div>

      <button onClick={onNext} className="btn-primary btn-milao">
        Ver ideias maiores
      </button>
    </div>
  );
}
