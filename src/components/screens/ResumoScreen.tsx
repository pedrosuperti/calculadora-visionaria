"use client";

import type { DiagnosticoResult, Ideia, IdeiaBilhao } from "@/lib/types";

interface Props {
  result: DiagnosticoResult;
  onNext: () => void;
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) {
    return `R$${(value / 1_000_000).toFixed(1).replace(".", ",")}M`;
  }
  if (value >= 1_000) {
    return `R$${(value / 1_000).toFixed(0)}mil`;
  }
  return formatBRL(value);
}

export default function ResumoScreen({ result, onNext }: Props) {
  const todasIdeias: (Ideia | (IdeiaBilhao & { _type: "bilhao" }))[] = [
    ...result.ideiasDoMilao,
    ...result.ideiasDoMilhao,
    { ...result.ideiaDoBlihao, _type: "bilhao" as const },
  ];

  return (
    <div className="screen resumo-screen fade-in">
      <div className="screen-header">
        <h2 className="screen-title">Seu Diagnóstico Completo</h2>
        <p className="screen-subtitle">
          Veja o que acontece se você continuar como está vs. aplicar as ideias.
        </p>
      </div>

      {/* Número âncora */}
      <div className="anchor-number fade-up">
        <span className="anchor-label">Riqueza desbloqueável em 12 meses</span>
        <span className="anchor-value">
          {formatBRL(result.riquezaDesbloqueavel12m)}
        </span>
      </div>

      {/* Comparativo */}
      <div className="comparativo fade-up" style={{ animationDelay: "0.2s" }}>
        <div className="comparativo-col col-sem">
          <h4>Se continuar como está</h4>
          <div className="comparativo-row">
            <span>6 meses</span>
            <span>{formatCompact(result.projecoes.faturamento6mSemMudanca)}/mês</span>
          </div>
          <div className="comparativo-row">
            <span>12 meses</span>
            <span>{formatCompact(result.projecoes.faturamento12mSemMudanca)}/mês</span>
          </div>
        </div>
        <div className="comparativo-divider" />
        <div className="comparativo-col col-com">
          <h4>Aplicando as ideias</h4>
          <div className="comparativo-row">
            <span>6 meses</span>
            <span className="value-highlight">
              {formatCompact(result.projecoes.faturamento6mComIdeias)}/mês
            </span>
          </div>
          <div className="comparativo-row">
            <span>12 meses</span>
            <span className="value-highlight">
              {formatCompact(result.projecoes.faturamento12mComIdeias)}/mês
            </span>
          </div>
        </div>
      </div>

      {/* Valuation */}
      <div className="valuation-box fade-up" style={{ animationDelay: "0.35s" }}>
        <div className="valuation-item">
          <span className="valuation-label">Valuation estimado hoje</span>
          <span className="valuation-value">{formatCompact(result.valuation.estimativaAtual)}</span>
        </div>
        <div className="valuation-arrow">&#10230;</div>
        <div className="valuation-item">
          <span className="valuation-label">Potencial com as ideias</span>
          <span className="valuation-value value-highlight">
            {formatCompact(result.valuation.potencialComIdeias)}
          </span>
        </div>
        <div className="valuation-multiplo">
          Múltiplo do setor: {result.valuation.multiploSetor}x
        </div>
      </div>

      {/* Lista de ideias */}
      <div className="resumo-ideias fade-up" style={{ animationDelay: "0.5s" }}>
        <h4>Suas 7 oportunidades identificadas</h4>
        <div className="resumo-ideias-list">
          {todasIdeias.map((ideia, i) => {
            const isBilhao = "_type" in ideia;
            const tier = i < 3 ? "milao" : i < 6 ? "milhao" : "bilhao";
            return (
              <div key={i} className={`resumo-ideia-row tier-${tier}`}>
                <span className="resumo-ideia-tier">
                  {tier === "milao"
                    ? "Milão"
                    : tier === "milhao"
                    ? "Milhão"
                    : "Bilhão"}
                </span>
                <span className="resumo-ideia-nome">{ideia.nome}</span>
                <span className="resumo-ideia-impacto">
                  {formatCompact(ideia.impactoMin)} – {formatCompact(ideia.impactoMax)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Insight final */}
      <div className="insight-final fade-up" style={{ animationDelay: "0.65s" }}>
        <span className="insight-icon">&#9733;</span>
        <p>{result.insightFinal}</p>
      </div>

      <p className="resumo-disclaimer">
        * Projeções estimadas com base em benchmarks de mercado. Resultados reais
        podem variar conforme execução.
      </p>

      <button onClick={onNext} className="btn-primary">
        Quero desbloquear essa oportunidade
      </button>
    </div>
  );
}
