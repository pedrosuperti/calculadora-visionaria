"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type {
  WizardStep,
  WizardData,
  ConfirmResult,
  DiagnoseResult,
  LeadResult,
} from "@/lib/types";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const DORES_OPTIONS = [
  { id: "Dependo demais da minha presenca", label: "Dependo demais da minha presença", highlight: true },
  { id: "Bati num teto de faturamento", label: "Bati num teto de faturamento", highlight: true },
  { id: "Tenho diferenciais mas ninguem percebe", label: "Tenho diferenciais mas ninguém percebe", highlight: false },
  { id: "Vendas inconsistentes", label: "Vendas inconsistentes", highlight: false },
  { id: "Concorrencia copiando ou baixando preco", label: "Concorrência copiando ou baixando preço", highlight: false },
  { id: "Nao sei usar IA de forma pratica", label: "Não sei usar IA de forma prática", highlight: false },
  { id: "Quero criar algo escalavel", label: "Quero criar algo escalável", highlight: false },
];

const DESEJOS_OPTIONS = [
  { id: "A oportunidade de milhoes escondida no meu mercado", label: "A oportunidade de milhões escondida no meu mercado", highlight: true },
  { id: "Como automatizar o que me prende na operacao", label: "Como automatizar o que me prende na operação", highlight: false },
  { id: "Um produto que vende sozinho enquanto eu durmo", label: "Um produto que vende sozinho enquanto eu durmo", highlight: false },
  { id: "O diferencial que me tornaria imbativel", label: "O diferencial que me tornaria imbatível", highlight: false },
  { id: "O nicho onde ninguem esta olhando", label: "O nicho onde ninguém está olhando", highlight: false },
  { id: "Como dobrar o faturamento sem dobrar o trabalho", label: "Como dobrar o faturamento sem dobrar o trabalho", highlight: false },
];

const DRILL_STEPS = [
  "Analisando seu mercado...",
  "Mapeando oportunidades escondidas...",
  "Calculando riqueza disponível...",
  "Selecionando as 3 melhores para você...",
];

const FATURAMENTO_OPTIONS = [
  "Até R$10k",
  "R$10k-30k",
  "R$30k-50k",
  "R$50k-100k",
  "R$100k-500k",
  "Acima de R$500k",
];

const EQUIPE_OPTIONS = ["Só eu", "2-5", "6-15", "Mais de 15"];

const INVESTIMENTO_OPTIONS = [
  "Ate R$2k",
  "R$2k-5k",
  "R$5k-15k",
  "Acima de R$15k",
];

// ─── UTILS ───────────────────────────────────────────────────────────────────

function fmt(val: number): string {
  if (!val) return "—";
  if (val >= 1e9) return `R$ ${(val / 1e9).toFixed(1).replace(".", ",")} bi`;
  if (val >= 1e6) return `R$ ${(val / 1e6).toFixed(1).replace(".", ",")} mi`;
  if (val >= 1e3) return `R$ ${(val / 1e3).toFixed(0)}k`;
  return `R$ ${val.toFixed(0)}`;
}

function stepToIndex(step: WizardStep): number {
  const map: Record<string, number> = {
    "0": -1, "1": 0, "1b": 1, "2": 2, "3": 3, "4": 4,
    "5a": 5, "5b": 5, "5c": 5, "6": 6, "7": 7, "8": 8, "9": 9,
  };
  return map[String(step)] ?? -1;
}

const CALENDLY_URL = process.env.NEXT_PUBLIC_CALENDLY_URL || "#";

// ─── PROGRESS DOTS ───────────────────────────────────────────────────────────

function ProgressDots({ step }: { step: WizardStep }) {
  const idx = stepToIndex(step);
  if (idx < 0) return null;
  return (
    <div className="progress-dots">
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          className={`progress-dot${i === idx ? " active" : i < idx ? " done" : ""}`}
        />
      ))}
    </div>
  );
}

// ─── SCORE CIRCLE SVG ────────────────────────────────────────────────────────

function ScoreCircle({
  score,
  size,
  variant,
}: {
  score: number;
  size: number;
  variant: "atual" | "visionario";
}) {
  const r = (size - 12) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="score-circle-wrap" style={{ width: size, height: size }}>
      <svg className="score-circle-svg" width={size} height={size}>
        <circle
          className="score-circle-bg"
          cx={size / 2}
          cy={size / 2}
          r={r}
        />
        <circle
          className="score-circle-fill"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="score-circle-num">{score}</div>
    </div>
  );
}


// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export default function Calculator() {
  const [step, setStep] = useState<WizardStep>(0);
  const [data, setData] = useState<WizardData>({
    nome: "",
    mercado: "",
    bioImagem: null,
    mercadoConfirmado: null,
    dores: [],
    doresCustom: "",
    desejos: [],
    desejosCustom: "",
    whatsapp: "",
    faturamento: "",
    equipe: "",
    anosExperiencia: "",
    investimento: "",
  });
  const [diagnoseResult, setDiagnoseResult] = useState<DiagnoseResult | null>(null);
  const [leadResult, setLeadResult] = useState<LeadResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [drillingStep, setDrillingStep] = useState(0);
  const [drillingDone, setDrillingDone] = useState(false);
  const [counterVal, setCounterVal] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const apiDoneRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = useCallback(
    (k: keyof WizardData, v: WizardData[keyof WizardData]) =>
      setData((d) => ({ ...d, [k]: v })),
    []
  );

  const toggleArray = useCallback((key: "dores" | "desejos", item: string) => {
    setData((d) => {
      const arr = d[key] as string[];
      return {
        ...d,
        [key]: arr.includes(item)
          ? arr.filter((x) => x !== item)
          : [...arr, item],
      };
    });
  }, []);

  const goTo = useCallback((s: WizardStep) => {
    setStep(s);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // ── STEP 1 → 1b: Confirm market ──
  const handleConfirm = async () => {
    if (!data.mercado.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mercado: data.mercado,
          imagem: data.bioImagem,
        }),
      });
      if (!res.ok) throw new Error("Erro na API");
      const result: ConfirmResult = await res.json();
      set("mercadoConfirmado", result);
      goTo("1b");
    } catch {
      setError("Erro ao analisar mercado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // ── STEP 4: Drilling + Diagnose API ──
  const startDrilling = useCallback(async () => {
    setDrillingStep(0);
    setDrillingDone(false);
    setCounterVal(0);
    apiDoneRef.current = false;

    // Start animation
    let i = 0;
    intervalRef.current = setInterval(() => {
      i++;
      setDrillingStep(i);
      if (i >= DRILL_STEPS.length - 1 && intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }, 2000);

    // Start API call
    try {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: data.nome,
          mercado: data.mercado,
          mercadoConfirmado: data.mercadoConfirmado,
          dores: [...data.dores, data.doresCustom].filter(Boolean),
          desejos: [...data.desejos, data.desejosCustom].filter(Boolean),
        }),
      });
      if (!res.ok) throw new Error("Erro na API");
      const result: DiagnoseResult = await res.json();
      setDiagnoseResult(result);
      apiDoneRef.current = true;

      // Animate counter to real value
      const target = result.scores.riqueza_total;
      const duration = 2000;
      const start = Date.now();
      const counterInterval = setInterval(() => {
        const elapsed = Date.now() - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setCounterVal(Math.round(target * eased));
        if (progress >= 1) clearInterval(counterInterval);
      }, 30);
    } catch {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setError("Erro ao gerar diagnóstico. Tente novamente.");
      goTo(3);
    }
  }, [data, goTo, set]);

  // Check when both animation and API are done
  useEffect(() => {
    if (
      step === 4 &&
      drillingStep >= DRILL_STEPS.length - 1 &&
      apiDoneRef.current &&
      diagnoseResult
    ) {
      const timer = setTimeout(() => setDrillingDone(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [step, drillingStep, diagnoseResult]);

  useEffect(() => {
    if (step === 4) {
      startDrilling();
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step === 4]);

  // ── STEP 6: Lead qualification ──
  const handleLead = async () => {
    if (!data.whatsapp.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: data.nome,
          mercado: data.mercado,
          whatsapp: data.whatsapp,
          faturamento: data.faturamento,
          equipe: data.equipe,
          anosExperiencia: data.anosExperiencia,
          investimento: data.investimento,
          dores: data.dores,
        }),
      });
      if (!res.ok) throw new Error("Erro na API");
      const result: LeadResult = await res.json();
      setLeadResult(result);
      goTo(7);
    } catch {
      setError("Erro ao processar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // ── BIO IMAGE HANDLER ──
  const handleBioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set("bioImagem", reader.result as string);
    reader.readAsDataURL(file);
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────

  return (
    <div className="wrap">
      <div className="grid-bg" />
      <div className="glow-top" />

      <div className="card">
        <ProgressDots step={step} />

        <div className="body">
          {/* ════════ STEP 0: LANDING ════════ */}
          {step === 0 && (
            <div className="step-content">
              <div className="landing-title">CALCULADORA DE RIQUEZA VISIONÁRIA</div>
              <div className="landing-subtitle">
                Descubra quanta riqueza está escondida no seu mercado — e como desbloquear em 90 dias
              </div>

              <div className="comparison-card">
                <div className="comparison-col bloqueada">
                  <div className="comparison-col-title">RIQUEZA BLOQUEADA</div>
                  {[
                    ["Faturamento", "R$15k/mês"],
                    ["Margem", "22%"],
                    ["Horas/semana", "55h"],
                    ["Fontes de receita", "1"],
                    ["Valuation", "R$0"],
                  ].map(([l, v]) => (
                    <div className="comparison-row" key={l}>
                      <span className="comparison-label">{l}</span>
                      <span className="comparison-val">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="comparison-col desbloqueada">
                  <div className="comparison-col-title">RIQUEZA DESBLOQUEADA</div>
                  {[
                    ["Faturamento", "R$85k/mês"],
                    ["Margem", "61%"],
                    ["Horas/semana", "25h"],
                    ["Fontes de receita", "4"],
                    ["Valuation", "R$2.4M"],
                  ].map(([l, v]) => (
                    <div className="comparison-row" key={l}>
                      <span className="comparison-label">{l}</span>
                      <span className="comparison-val">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="time-badge">
                Em 3 minutos, a IA vai mapear 3 oportunidades escondidas no seu mercado.
              </div>

              <div className="f">
                <label>Qual é o seu primeiro nome?</label>
                <input
                  type="text"
                  placeholder="Ex: Pedro"
                  value={data.nome}
                  onChange={(e) => set("nome", e.target.value)}
                />
              </div>

              <button
                className="btn-drill"
                disabled={!data.nome.trim()}
                onClick={() => goTo(1)}
              >
                DESCOBRIR MINHA RIQUEZA ESCONDIDA
              </button>

              <div className="social-proof">Usado por mais de 30.000 visionários</div>
            </div>
          )}

          {/* ════════ STEP 1: MARKET ════════ */}
          {step === 1 && (
            <div className="step-content">
              <div className="step-title">Qual é o seu mercado?</div>
              <div className="step-subtitle">
                Descreva o que você faz e para quem. Quanto mais contexto, melhor a análise.
              </div>

              <div className="f">
                <textarea
                  rows={3}
                  placeholder="Descreva com suas palavras. Ex: sou dentista com clínica própria, sou arquiteta especializada em alto padrão..."
                  value={data.mercado}
                  onChange={(e) => set("mercado", e.target.value)}
                />
                <div className="f-hint">Pode colar sua bio do Instagram ou site.</div>
              </div>

              <div className="bio-upload">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleBioUpload}
                />
                <button
                  className="bio-upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  📎 Anexar print da bio (opcional)
                </button>
                {data.bioImagem && (
                  <div className="bio-upload-preview">
                    <img src={data.bioImagem} alt="Bio preview" />
                    <button
                      className="bio-upload-remove"
                      onClick={() => set("bioImagem", null)}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {error && <div className="err">{error}</div>}
              <button
                className="btn-drill"
                disabled={!data.mercado.trim() || loading}
                onClick={handleConfirm}
              >
                {loading ? (
                  <>ANALISANDO<span className="loading-inline" /></>
                ) : (
                  "ANALISAR MERCADO"
                )}
              </button>
            </div>
          )}

          {/* ════════ STEP 1b: CONFIRM ════════ */}
          {step === "1b" && data.mercadoConfirmado && (
            <div className="step-content">
              <div className="step-title">Encontramos seu mercado</div>
              <div className="confirm-box">
                <div className="confirm-sector">{data.mercadoConfirmado.setor_formatado}</div>
                <div className="confirm-desc">{data.mercadoConfirmado.descricao}</div>
                <div className="confirm-tam">
                  Mercado estimado: {fmt(data.mercadoConfirmado.tam_estimado)}/ano
                </div>
                <div style={{ fontSize: 13, color: "rgba(226,221,212,.55)", marginTop: 12, fontStyle: "italic" }}>
                  A maioria dos profissionais desse mercado acessa menos de 2% desse potencial.
                </div>
              </div>
              <div className="confirm-btns">
                <button className="btn-drill" onClick={() => goTo(2)}>
                  ISSO MESMO!
                </button>
                <button className="btn-sec" onClick={() => goTo(1)}>
                  QUERO REFORMULAR
                </button>
              </div>
            </div>
          )}

          {/* ════════ STEP 2: DORES ════════ */}
          {step === 2 && (
            <div className="step-content">
              <div className="step-title">O que mais te trava hoje?</div>
              <div className="step-subtitle">Selecione todas que se aplicam.</div>

              <div className="option-grid">
                {DORES_OPTIONS.map((opt) => (
                  <div
                    key={opt.id}
                    className={`option-chip${data.dores.includes(opt.id) ? " selected" : ""}${opt.highlight ? " highlight" : ""}`}
                    onClick={() => toggleArray("dores", opt.id)}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>

              <div className="option-custom">
                <div className="f" style={{ marginBottom: 8 }}>
                  <textarea
                    rows={2}
                    placeholder="Ou descreva com suas palavras..."
                    value={data.doresCustom}
                    onChange={(e) => set("doresCustom", e.target.value)}
                  />
                </div>
              </div>

              <button
                className="btn-drill"
                disabled={data.dores.length === 0 && !data.doresCustom.trim()}
                onClick={() => goTo(3)}
              >
                CONTINUAR
              </button>
            </div>
          )}

          {/* ════════ STEP 3: DESEJOS ════════ */}
          {step === 3 && (
            <div className="step-content">
              <div className="step-title">O que você gostaria de enxergar?</div>
              <div className="step-subtitle">Selecione todas que te interessam.</div>

              <div className="option-grid">
                {DESEJOS_OPTIONS.map((opt) => (
                  <div
                    key={opt.id}
                    className={`option-chip${data.desejos.includes(opt.id) ? " selected" : ""}${opt.highlight ? " highlight" : ""}`}
                    onClick={() => toggleArray("desejos", opt.id)}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>

              <div className="option-custom">
                <div className="f" style={{ marginBottom: 8 }}>
                  <textarea
                    rows={2}
                    placeholder="Ou descreva com suas palavras..."
                    value={data.desejosCustom}
                    onChange={(e) => set("desejosCustom", e.target.value)}
                  />
                </div>
              </div>

              <button
                className="btn-drill"
                disabled={data.desejos.length === 0 && !data.desejosCustom.trim()}
                onClick={() => goTo(4)}
              >
                ANALISAR OPORTUNIDADES
              </button>
            </div>
          )}

          {/* ════════ STEP 4: DRILLING ════════ */}
          {step === 4 && (
            <div className="drilling">
              <div className="d-icon">⛏️</div>
              <div className="d-title">ANALISANDO SEU MERCADO</div>
              <div>
                {DRILL_STEPS.map((s, i) => (
                  <div
                    key={i}
                    className={`d-step ${i < drillingStep ? "done" : i === drillingStep ? "active" : ""}`}
                  >
                    <div className="d-dot" />
                    <span>{i < drillingStep ? "✓ " : ""}{s}</span>
                    {i === 0 && i < drillingStep && data.mercadoConfirmado && (
                      <span className="drill-result">
                        Mercado: {data.mercadoConfirmado.setor_formatado}
                      </span>
                    )}
                    {i === 1 && i < drillingStep && (
                      <span className="drill-result">14 oportunidades encontradas</span>
                    )}
                    {i === 2 && i < drillingStep && counterVal > 0 && (
                      <span className="drill-amount">{fmt(counterVal)} de riqueza descoberta!</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="pbar">
                <div
                  className="pfill"
                  style={{
                    width: `${Math.min(100, (drillingStep / (DRILL_STEPS.length - 1)) * 100)}%`,
                  }}
                />
              </div>

              {drillingDone && (
                <div className="drill-wow">
                  <div className="drill-wow-text">
                    Uau. Acho que você vai gostar do que encontramos.
                  </div>
                  <button className="btn-drill" onClick={() => goTo("5a")}>
                    DESBLOQUEAR MINHA RIQUEZA
                  </button>
                </div>
              )}

              {error && (
                <div style={{ marginTop: 16 }}>
                  <div className="err">{error}</div>
                  <button className="btn-sec" style={{ marginTop: 8 }} onClick={() => goTo(3)}>
                    Voltar e tentar novamente
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ════════ STEPS 5a/5b/5c: IDEAS ════════ */}
          {(step === "5a" || step === "5b" || step === "5c") && diagnoseResult && (() => {
            const idx = step === "5a" ? 0 : step === "5b" ? 1 : 2;
            const idea = diagnoseResult.ideias[idx];
            if (!idea) return null;
            const num = idx + 1;
            const nextStep: WizardStep = step === "5a" ? "5b" : step === "5b" ? "5c" : 6;
            const nextLabel = step === "5a" ? "VER PRÓXIMA IDEIA" : step === "5b" ? "VER MINHA 3ª IDEIA" : "VER MEU PLANO DE AÇÃO";

            return (
              <div className="idea-screen step-content" key={step}>
                <div className="idea-header">
                  <div className="idea-badge">IDEIA #{num}</div>
                  <div className={`idea-ia-badge ${idea.usa_ia ? "com-ia" : "sem-ia"}`}>
                    {idea.usa_ia ? "COM IA" : "SEM IA"}
                  </div>
                </div>

                <div className="idea-name">{idea.nome}</div>
                <div className="idea-desc">{idea.descricao}</div>

                <div className="idea-metrics">
                  <div className="idea-metric">
                    <div className="idea-metric-label">RIQUEZA DESBLOQUEADA</div>
                    <div className="idea-metric-val gold">{fmt(idea.potencial_anual)}/ano</div>
                  </div>
                  <div className="idea-metric">
                    <div className="idea-metric-label">TEMPO DE RETORNO</div>
                    <div className="idea-metric-val">{idea.tempo_retorno_dias} dias</div>
                  </div>
                  <div className="idea-metric">
                    <div className="idea-metric-label">CONCORRÊNCIA</div>
                    <div className="idea-metric-val">{idea.concorrencia}</div>
                  </div>
                  <div className="idea-metric">
                    <div className="idea-metric-label">DIFICULDADE</div>
                    <div className="idea-metric-val">{idea.dificuldade}</div>
                  </div>
                </div>

                <div className="idea-cuidados">
                  <div className="idea-cuidados-label">CUIDADOS</div>
                  <div className="idea-cuidados-text">{idea.cuidados}</div>
                </div>

                {idea.usa_ia && idea.como_usa_ia && (
                  <div className="idea-ia-detail">
                    <div className="idea-ia-detail-label">COMO A IA É USADA</div>
                    <div className="idea-ia-detail-text">{idea.como_usa_ia}</div>
                  </div>
                )}

                <button className="btn-drill" onClick={() => goTo(nextStep)}>
                  {nextLabel}
                </button>
              </div>
            );
          })()}

          {/* ════════ STEP 6: QUALIFICATION ════════ */}
          {step === 6 && (
            <div className="step-content qual-form">
              <div className="step-title">Para montar seu plano personalizado, preciso de mais contexto.</div>
              <div className="step-subtitle">Essas informações ajudam a IA a calibrar seu plano de 90 dias.</div>

              <div className="f">
                <label>WhatsApp</label>
                <input
                  type="tel"
                  placeholder="11 99999-9999"
                  value={data.whatsapp}
                  onChange={(e) => set("whatsapp", e.target.value)}
                />
              </div>

              <div className="row2 mb16">
                <div className="f" style={{ marginBottom: 0 }}>
                  <label>Faturamento mensal</label>
                  <select
                    value={data.faturamento}
                    onChange={(e) => set("faturamento", e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {FATURAMENTO_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div className="f" style={{ marginBottom: 0 }}>
                  <label>Tamanho da equipe</label>
                  <select
                    value={data.equipe}
                    onChange={(e) => set("equipe", e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {EQUIPE_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="row2 mb16">
                <div className="f" style={{ marginBottom: 0 }}>
                  <label>Anos de experiência</label>
                  <input
                    type="number"
                    placeholder="Ex: 8"
                    value={data.anosExperiencia}
                    onChange={(e) => set("anosExperiencia", e.target.value)}
                  />
                </div>
                <div className="f" style={{ marginBottom: 0 }}>
                  <label>Investimento mensal</label>
                  <select
                    value={data.investimento}
                    onChange={(e) => set("investimento", e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {INVESTIMENTO_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>

              {error && <div className="err">{error}</div>}
              <button
                className="btn-drill"
                disabled={!data.whatsapp.trim() || loading}
                onClick={handleLead}
              >
                {loading ? (
                  <>GERANDO<span className="loading-inline" /></>
                ) : (
                  "GERAR MEU PLANO"
                )}
              </button>
            </div>
          )}

          {/* ════════ STEP 7: PLANO 90 DIAS ════════ */}
          {step === 7 && diagnoseResult && (
            <div className="step-content">
              <div className="step-title">{data.nome}, seu plano de desbloqueio de 90 dias</div>

              <div className="plano-intro">
                Uma das maiores janelas de oportunidade no mercado de{" "}
                {data.mercadoConfirmado?.setor_formatado || "seu setor"} agora:{" "}
                {diagnoseResult.plano.janela_ia}
              </div>

              <div className="plano-roadmap">
                <div className="plano-phase">
                  <div className="plano-phase-label">SEMANAS 1–2</div>
                  <div className="plano-phase-desc">{diagnoseResult.plano.semanas_1_2}</div>
                </div>
                <div className="plano-phase">
                  <div className="plano-phase-label">SEMANAS 3–4</div>
                  <div className="plano-phase-desc">{diagnoseResult.plano.semanas_3_4}</div>
                </div>
                <div className="plano-phase">
                  <div className="plano-phase-label">MÊS 2</div>
                  <div className="plano-phase-desc">{diagnoseResult.plano.mes_2}</div>
                </div>
                <div className="plano-phase">
                  <div className="plano-phase-label">MÊS 3</div>
                  <div className="plano-phase-desc">{diagnoseResult.plano.mes_3}</div>
                </div>
              </div>

              <div className="plano-reality">
                Esse plano exige cerca de {diagnoseResult.plano.horas_semana} horas por semana de dedicação.
              </div>

              <button className="btn-drill" onClick={() => goTo(8)}>
                QUAL MEU PRÓXIMO PASSO?
              </button>
            </div>
          )}

          {/* ════════ STEP 8: DUAL SCORES ════════ */}
          {step === 8 && diagnoseResult && (
            <div className="step-content">
              <div className="step-title">Seu diagnóstico completo</div>

              <div className="scores-container">
                <div className="score-block atual">
                  <div className="score-block-label">SCORE ATUAL</div>
                  <ScoreCircle score={diagnoseResult.scores.score_atual} size={100} variant="atual" />
                  <div className="score-items">
                    {diagnoseResult.scores.bloqueios.map((b, i) => (
                      <div className="score-item" key={i}>{b}</div>
                    ))}
                  </div>
                </div>
                <div className="score-block visionario">
                  <div className="score-block-label">SCORE VISIONÁRIO</div>
                  <ScoreCircle score={diagnoseResult.scores.score_visionario} size={130} variant="visionario" />
                  <div className="score-items">
                    {diagnoseResult.scores.potenciais.map((p, i) => (
                      <div className="score-item" key={i}>{p}</div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="riqueza-total-box">
                <div className="riqueza-total-label">RIQUEZA TOTAL DESBLOQUEÁVEL</div>
                <div className="riqueza-total-val">{fmt(diagnoseResult.scores.riqueza_total)}</div>
                <div className="riqueza-total-sub">por ano · soma das 3 ideias</div>
              </div>

              {diagnoseResult.insight && (
                <div className="insight">&ldquo;{diagnoseResult.insight}&rdquo;</div>
              )}

              <button className="btn-drill" onClick={() => goTo(9)}>
                QUAL MEU PRÓXIMO PASSO?
              </button>
            </div>
          )}

          {/* ════════ STEP 9: FINAL ════════ */}
          {step === 9 && diagnoseResult && (
            <div className="elegivel-section step-content">
              {/* Summary card - screenshottable */}
              <div className="summary-card">
                <div className="summary-header">
                  <div>
                    <div className="summary-name">{data.nome}</div>
                    <div className="summary-sector">
                      {data.mercadoConfirmado?.setor_formatado}
                    </div>
                  </div>
                  <div className="summary-brand">Calculadora de Riqueza</div>
                </div>

                <div className="summary-ideas">
                  {diagnoseResult.ideias.map((idea, i) => (
                    <div className="summary-idea" key={i}>
                      <span className="summary-idea-name">
                        #{i + 1} {idea.nome}
                      </span>
                      <span className="summary-idea-val">
                        {fmt(idea.potencial_anual)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="summary-scores">
                  <div className="summary-score-item">
                    <div className="summary-score-label">SCORE ATUAL</div>
                    <div
                      className="summary-score-val"
                      style={{ color: "var(--orange)" }}
                    >
                      {diagnoseResult.scores.score_atual}
                    </div>
                  </div>
                  <div className="summary-score-item">
                    <div className="summary-score-label">SCORE VISIONÁRIO</div>
                    <div
                      className="summary-score-val"
                      style={{ color: "var(--green)" }}
                    >
                      {diagnoseResult.scores.score_visionario}
                    </div>
                  </div>
                  <div className="summary-score-item">
                    <div className="summary-score-label">RIQUEZA TOTAL</div>
                    <div
                      className="summary-score-val"
                      style={{ color: "#C9A84C" }}
                    >
                      {fmt(diagnoseResult.scores.riqueza_total)}
                    </div>
                  </div>
                </div>

                <div className="summary-footer">
                  <div className="summary-footer-text">
                    Análise por IA · @pedrosuperti
                  </div>
                  <div className="summary-footer-brand">PEDROSUPERTI.COM.BR</div>
                </div>
              </div>

              {/* QUALIFIED PATH */}
              {leadResult?.qualified && (
                <>
                  <div className="top-percent-text">
                    Você está entre os top <strong>{leadResult.topPercent}%</strong> dos
                    empreendedores que fizeram esse assessment.
                  </div>

                  <div className="elegivel-badge">STATUS: ELEGÍVEL</div>

                  <div className="elegivel-desc">
                    Seu perfil se qualifica para uma{" "}
                    <strong>Sessão de Desbloqueio</strong> com um especialista da
                    equipe Pedro Superti (valor: R$1.000). Vagas limitadas.
                  </div>

                  <a
                    href={CALENDLY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: "none", display: "block" }}
                  >
                    <button className="btn-gold">
                      AGENDAR MINHA SESSÃO DE DESBLOQUEIO
                    </button>
                  </a>

                  <button
                    className="btn-sec"
                    style={{ width: "100%", marginTop: 10 }}
                    onClick={() => window.print()}
                  >
                    Salvar minha análise
                  </button>
                </>
              )}

              {/* NOT QUALIFIED PATH */}
              {leadResult && !leadResult.qualified && (
                <>
                  <div className="nurture-tip">
                    Comece pela{" "}
                    <strong>
                      Ideia #
                      {(() => {
                        const easiest = diagnoseResult.ideias.reduce(
                          (best, idea, i) =>
                            idea.dificuldade === "Facil" ||
                            idea.tempo_retorno_dias <
                              diagnoseResult.ideias[best].tempo_retorno_dias
                              ? i
                              : best,
                          0
                        );
                        return easiest + 1;
                      })()}
                    </strong>
                    . Você pode começar a implementar essa semana.
                  </div>

                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      "Quero receber o guia gratuito da Calculadora de Riqueza Visionária!"
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: "none", display: "block" }}
                  >
                    <button className="btn-drill" style={{ width: "100%" }}>
                      RECEBER GUIA GRATUITO POR WHATSAPP
                    </button>
                  </a>

                  <button
                    className="btn-sec"
                    style={{ width: "100%", marginTop: 10 }}
                    onClick={() => window.print()}
                  >
                    Salvar minha análise
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="ftag">Pedro Superti · Calculadora de Riqueza Visionária</div>
    </div>
  );
}
