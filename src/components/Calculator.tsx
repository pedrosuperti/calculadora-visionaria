"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
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
  { text: "Analisando seu mercado...", icon: "🔍" },
  { text: "Mapeando oportunidades escondidas...", icon: "🗺️" },
  { text: "Calculando riqueza disponível...", icon: "💰" },
  { text: "Selecionando as 3 melhores para você...", icon: "🏆" },
];

const FATURAMENTO_OPTIONS = [
  "Até R$10 mil",
  "R$10 mil a R$50 mil",
  "R$50 mil a R$100 mil",
  "R$100 mil a R$500 mil",
  "R$500 mil a R$1 milhão",
  "R$1 milhão a R$5 milhões",
  "Outros",
];

const EQUIPE_OPTIONS = ["Só eu", "2-5", "6-15", "Mais de 15"];

const INVESTIMENTO_OPTIONS = [
  "Até R$2 mil",
  "R$2 mil a R$5 mil",
  "R$5 mil a R$15 mil",
  "R$15 mil a R$30 mil",
  "Acima de R$30 mil",
];

const URGENCIA_OPTIONS = [
  "Preciso resolver isso agora",
  "Nos próximos 3 meses",
  "Estou planejando para este ano",
  "Só estou explorando por enquanto",
];

// ─── UTILS ───────────────────────────────────────────────────────────────────

function fmt(val: number): string {
  if (!val) return "—";
  if (val >= 1e9) return `R$ ${(val / 1e9).toFixed(1).replace(".", ",")} bilhões`;
  if (val >= 1e6) return `R$ ${(val / 1e6).toFixed(1).replace(".", ",")} milhões`;
  if (val >= 1e3) return `R$ ${(val / 1e3).toFixed(0)}k`;
  return `R$ ${val.toFixed(0)}`;
}

function fmtShort(val: number): string {
  if (!val) return "R$0";
  if (val >= 1e6) return `R$${(val / 1e6).toFixed(1)}M`;
  if (val >= 1e3) return `R$${(val / 1e3).toFixed(0)}k`;
  return `R$${val.toFixed(0)}`;
}

function stepToIndex(step: WizardStep): number {
  const map: Record<string, number> = {
    "0": -1, "1": 0, "1b": 1, "2": 2, "3": 3, "4": 4,
    "5a": 5, "5b": 5, "5c": 5, "6": 6, "7": 7, "8": 8, "9": 9,
  };
  return map[String(step)] ?? -1;
}

const CONSULTORIA_URL = "https://sis39334.forms.app/aplicacao-consultoria-1";

// ─── PDF REPORT GENERATOR ──────────────────────────────────────────────────

function generatePDFReport(
  data: WizardData,
  diagnose: DiagnoseResult,
  tier: "hot" | "warm" | "cold"
) {
  const fmtPdf = (val: number) => {
    if (!val) return "—";
    if (val >= 1e9) return `R$ ${(val / 1e9).toFixed(1).replace(".", ",")} bilhões`;
    if (val >= 1e6) return `R$ ${(val / 1e6).toFixed(1).replace(".", ",")} milhões`;
    if (val >= 1e3) return `R$ ${(val / 1e3).toFixed(0)}k`;
    return `R$ ${val.toFixed(0)}`;
  };

  const ideaCards = diagnose.ideias.map((idea, i) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = idea as any;
    return `
      <div class="idea-card">
        <div class="idea-header-row">
          <span class="idea-num">#${i + 1}</span>
          <span class="idea-badge-ia ${idea.usa_ia ? "com" : "sem"}">${idea.usa_ia ? "COM IA" : "SEM IA"}</span>
        </div>
        <h3 class="idea-name">${idea.nome}</h3>
        <p class="idea-desc">${idea.descricao}</p>
        <div class="metrics-grid">
          <div class="metric gold">
            <div class="metric-label">RIQUEZA DESBLOQUEADA</div>
            <div class="metric-val">${fmtPdf(idea.potencial_anual)}/ano</div>
          </div>
          <div class="metric">
            <div class="metric-label">TEMPO DE RETORNO</div>
            <div class="metric-val">${idea.tempo_retorno_dias} dias</div>
          </div>
          <div class="metric">
            <div class="metric-label">CONCORRÊNCIA</div>
            <div class="metric-val">${idea.concorrencia}</div>
          </div>
          <div class="metric">
            <div class="metric-label">DIFICULDADE</div>
            <div class="metric-val">${idea.dificuldade}</div>
          </div>
        </div>
        ${a.publico_alvo ? `<div class="info-box"><div class="info-label">PÚBLICO-ALVO</div><p>${a.publico_alvo}</p></div>` : ""}
        ${a.primeiro_passo ? `<div class="info-box accent"><div class="info-label">PRIMEIRO PASSO</div><p>${a.primeiro_passo}</p></div>` : ""}
        <div class="info-box warn"><div class="info-label">CUIDADOS</div><p>${idea.cuidados}</p></div>
        ${idea.usa_ia && idea.como_usa_ia ? `<div class="info-box"><div class="info-label">COMO A IA É USADA</div><p>${idea.como_usa_ia}</p></div>` : ""}
      </div>
    `;
  }).join("");

  const totalRiqueza = fmtPdf(diagnose.scores.riqueza_total);
  const setor = data.mercadoConfirmado?.setor_formatado || data.mercado;
  const tam = data.mercadoConfirmado ? fmtPdf(data.mercadoConfirmado.tam_estimado) : "";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<title>Relatório V.I.S.O.R. — ${data.nome}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;500;600;700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Outfit',sans-serif;background:#07090F;color:#E2DDD4;padding:0;margin:0}
  .page{max-width:800px;margin:0 auto;padding:40px 48px}

  /* Cover */
  .cover{text-align:center;padding:60px 0 40px;border-bottom:1px solid rgba(201,168,76,.15);margin-bottom:40px}
  .cover-brand{font-family:'Bebas Neue',sans-serif;font-size:48px;color:#C9A84C;letter-spacing:8px;margin-bottom:4px}
  .cover-sub{font-size:13px;color:rgba(226,221,212,.35);letter-spacing:3px;margin-bottom:32px}
  .cover-name{font-family:'Bebas Neue',sans-serif;font-size:32px;color:#E2DDD4;letter-spacing:2px;margin-bottom:8px}
  .cover-setor{font-size:16px;color:rgba(201,168,76,.7)}
  .cover-date{font-size:12px;color:rgba(226,221,212,.25);margin-top:16px}

  /* Market */
  .market-section{background:rgba(255,255,255,.02);border:1px solid rgba(201,168,76,.12);padding:24px;margin-bottom:32px}
  .market-title{font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:2px;color:rgba(201,168,76,.6);margin-bottom:12px}
  .market-row{display:flex;gap:24px}
  .market-stat{flex:1}
  .market-stat-label{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(201,168,76,.45);margin-bottom:4px}
  .market-stat-val{font-family:'Bebas Neue',sans-serif;font-size:22px;color:#C9A84C}

  /* Section titles */
  .section-title{font-family:'Bebas Neue',sans-serif;font-size:22px;color:#C9A84C;letter-spacing:3px;margin:36px 0 20px;padding-bottom:8px;border-bottom:1px solid rgba(201,168,76,.12)}

  /* Idea cards */
  .idea-card{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);padding:28px;margin-bottom:20px;page-break-inside:avoid}
  .idea-header-row{display:flex;align-items:center;gap:10px;margin-bottom:8px}
  .idea-num{font-family:'Bebas Neue',sans-serif;font-size:20px;color:rgba(201,168,76,.5)}
  .idea-badge-ia{font-size:10px;letter-spacing:2px;padding:3px 10px;font-weight:700}
  .idea-badge-ia.com{background:rgba(34,197,94,.1);color:#22C55E}
  .idea-badge-ia.sem{background:rgba(249,115,22,.1);color:#F97316}
  .idea-name{font-family:'Bebas Neue',sans-serif;font-size:24px;color:#E2DDD4;letter-spacing:1px;margin-bottom:8px}
  .idea-desc{font-size:14px;color:rgba(226,221,212,.6);line-height:1.6;margin-bottom:18px}

  .metrics-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px}
  .metric{background:rgba(255,255,255,.03);padding:12px;border:1px solid rgba(255,255,255,.04)}
  .metric.gold{border-color:rgba(201,168,76,.2);background:rgba(201,168,76,.04)}
  .metric-label{font-size:9px;letter-spacing:1.5px;color:rgba(226,221,212,.35);margin-bottom:4px}
  .metric-val{font-family:'Bebas Neue',sans-serif;font-size:20px;color:#E2DDD4}
  .metric.gold .metric-val{color:#C9A84C}

  .info-box{background:rgba(255,255,255,.02);border-left:3px solid rgba(201,168,76,.2);padding:14px 16px;margin-bottom:10px}
  .info-box.accent{border-left-color:#22C55E}
  .info-box.warn{border-left-color:#F97316}
  .info-label{font-size:10px;letter-spacing:1.5px;color:rgba(201,168,76,.5);margin-bottom:6px;font-weight:600}
  .info-box p{font-size:13px;color:rgba(226,221,212,.65);line-height:1.6}

  /* Plan */
  .plan-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:24px}
  .plan-item{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05);padding:18px}
  .plan-item-label{font-family:'Bebas Neue',sans-serif;font-size:14px;color:rgba(201,168,76,.6);letter-spacing:1px;margin-bottom:8px}
  .plan-item-text{font-size:13px;color:rgba(226,221,212,.65);line-height:1.6}
  .plan-item.full{grid-column:1 / -1}

  /* Scores */
  .scores-row{display:flex;gap:20px;margin-bottom:24px}
  .score-box{flex:1;text-align:center;padding:24px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02)}
  .score-label{font-size:10px;letter-spacing:2px;margin-bottom:8px}
  .score-label.atual{color:#F97316}
  .score-label.vis{color:#22C55E}
  .score-num{font-family:'Bebas Neue',sans-serif;font-size:48px;line-height:1}
  .score-num.atual{color:#F97316}
  .score-num.vis{color:#22C55E}
  .score-items{margin-top:12px;text-align:left}
  .score-item{font-size:12px;color:rgba(226,221,212,.55);line-height:1.8;padding-left:12px;position:relative}
  .score-item::before{content:'';position:absolute;left:0;top:8px;width:6px;height:6px;border-radius:50%}
  .score-box.atual-box .score-item::before{background:#F97316}
  .score-box.vis-box .score-item::before{background:#22C55E}

  /* Riqueza total */
  .riqueza-total{text-align:center;padding:28px;background:rgba(201,168,76,.04);border:1px solid rgba(201,168,76,.15);margin-bottom:24px}
  .riqueza-total-label{font-size:11px;letter-spacing:2px;color:rgba(201,168,76,.5);margin-bottom:6px}
  .riqueza-total-val{font-family:'Bebas Neue',sans-serif;font-size:40px;color:#C9A84C}
  .riqueza-total-sub{font-size:12px;color:rgba(226,221,212,.3);margin-top:4px}

  /* Insight */
  .insight-box{text-align:center;font-style:italic;font-size:15px;color:rgba(226,221,212,.55);line-height:1.7;padding:20px 30px;margin-bottom:24px}

  /* Footer */
  .footer{text-align:center;padding:32px 0 20px;border-top:1px solid rgba(201,168,76,.1);margin-top:36px}
  .footer-brand{font-family:'Bebas Neue',sans-serif;font-size:18px;color:rgba(201,168,76,.4);letter-spacing:4px;margin-bottom:4px}
  .footer-text{font-size:11px;color:rgba(226,221,212,.2)}

  /* Print overrides */
  @media print{
    body{background:#07090F !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .page{padding:20px 30px}
    .idea-card{break-inside:avoid}
  }
</style>
</head>
<body>
<div class="page">

  <!-- Cover -->
  <div class="cover">
    <div class="cover-brand">V.I.S.O.R.</div>
    <div class="cover-sub">RELATÓRIO DE RIQUEZA VISIONÁRIA</div>
    <div class="cover-name">${data.nome}</div>
    <div class="cover-setor">${setor}</div>
    <div class="cover-date">${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</div>
  </div>

  <!-- Market -->
  ${tam ? `
  <div class="market-section">
    <div class="market-title">SEU MERCADO</div>
    <div class="market-row">
      <div class="market-stat">
        <div class="market-stat-label">Setor</div>
        <div class="market-stat-val" style="font-size:18px">${setor}</div>
      </div>
      <div class="market-stat">
        <div class="market-stat-label">Tamanho de mercado</div>
        <div class="market-stat-val">${tam}/ano</div>
      </div>
    </div>
  </div>
  ` : ""}

  <!-- Scores -->
  <div class="section-title">DIAGNÓSTICO</div>
  <div class="scores-row">
    <div class="score-box atual-box">
      <div class="score-label atual">SITUAÇÃO ATUAL</div>
      <div class="score-num atual">${diagnose.scores.score_atual}</div>
      <div class="score-items">
        ${diagnose.scores.bloqueios.map(b => `<div class="score-item">${b}</div>`).join("")}
      </div>
    </div>
    <div class="score-box vis-box">
      <div class="score-label vis">POTENCIAL VISIONÁRIO</div>
      <div class="score-num vis">${diagnose.scores.score_visionario}</div>
      <div class="score-items">
        ${diagnose.scores.potenciais.map(p => `<div class="score-item">${p}</div>`).join("")}
      </div>
    </div>
  </div>

  <div class="riqueza-total">
    <div class="riqueza-total-label">RIQUEZA TOTAL DESBLOQUEÁVEL</div>
    <div class="riqueza-total-val">${totalRiqueza}</div>
    <div class="riqueza-total-sub">por ano · soma das 3 ideias</div>
  </div>

  ${diagnose.insight ? `<div class="insight-box">"${diagnose.insight}"</div>` : ""}

  <!-- 3 Ideas -->
  <div class="section-title">SUAS 3 IDEIAS DE RIQUEZA</div>
  ${ideaCards}

  <!-- Plan -->
  <div class="section-title">PLANO DE AÇÃO — 90 DIAS</div>
  <div class="plan-grid">
    <div class="plan-item">
      <div class="plan-item-label">SEMANAS 1-2</div>
      <div class="plan-item-text">${diagnose.plano.semanas_1_2}</div>
    </div>
    <div class="plan-item">
      <div class="plan-item-label">SEMANAS 3-4</div>
      <div class="plan-item-text">${diagnose.plano.semanas_3_4}</div>
    </div>
    <div class="plan-item">
      <div class="plan-item-label">MÊS 2</div>
      <div class="plan-item-text">${diagnose.plano.mes_2}</div>
    </div>
    <div class="plan-item">
      <div class="plan-item-label">MÊS 3</div>
      <div class="plan-item-text">${diagnose.plano.mes_3}</div>
    </div>
    <div class="plan-item full">
      <div class="plan-item-label">DEDICAÇÃO RECOMENDADA</div>
      <div class="plan-item-text">${diagnose.plano.horas_semana}h por semana</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-brand">V.I.S.O.R.</div>
    <div class="footer-text">Método V.I.S.O.R. por Pedro Superti · Calculadora Visionária 2026</div>
    <div class="footer-text" style="margin-top:4px">Este relatório é pessoal e confidencial. Gerado em ${new Date().toLocaleDateString("pt-BR")}</div>
  </div>

</div>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 600);
  }
}


// Map step to previous step for back navigation
function prevStep(step: WizardStep): WizardStep | null {
  const map: Record<string, WizardStep> = {
    "1": 0, "1b": 1, "2": "1b", "3": 2, "5a": 4, "5b": "5a", "5c": "5b",
    "6": "5c", "7": 6, "8": 7, "9": 8,
  };
  return map[String(step)] ?? null;
}

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
  const colorVar = variant === "atual" ? "var(--orange)" : "var(--green)";
  return (
    <div className="score-circle-wrap" style={{ width: size, height: size }}>
      <svg className="score-circle-svg" width={size} height={size}>
        <circle className="score-circle-bg" cx={size / 2} cy={size / 2} r={r} />
        <circle
          className="score-circle-fill"
          cx={size / 2} cy={size / 2} r={r}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ stroke: colorVar }}
        />
      </svg>
      <div className="score-circle-num" style={{ color: colorVar }}>{score}</div>
    </div>
  );
}

// ─── MINI BAR CHART for projections ──────────────────────────────────────────

function RevenueChart({ p6, p12, p24 }: { p6: number; p12: number; p24: number }) {
  const max = Math.max(p6, p12, p24, 1);
  const bars = [
    { label: "6 meses", val: p6, pct: (p6 / max) * 100 },
    { label: "12 meses", val: p12, pct: (p12 / max) * 100 },
    { label: "24 meses", val: p24, pct: (p24 / max) * 100 },
  ];
  return (
    <div className="rev-chart">
      <div className="rev-chart-title">PROJEÇÃO DE FATURAMENTO</div>
      <div className="rev-chart-bars">
        {bars.map((b) => (
          <div className="rev-bar-col" key={b.label}>
            <div className="rev-bar-val">{fmtShort(b.val)}</div>
            <div className="rev-bar-track">
              <div className="rev-bar-fill" style={{ height: `${Math.max(b.pct, 8)}%` }} />
            </div>
            <div className="rev-bar-label">{b.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PROGRESS RING (drilling animation) ─────────────────────────────────────

function ProgressRing({ progress }: { progress: number }) {
  const size = 80;
  const strokeWidth = 5;
  const r = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (progress / 100) * circumference;
  return (
    <div className="progress-ring-wrap">
      <svg width={size} height={size} className="progress-ring-svg">
        <circle className="progress-ring-bg" cx={size/2} cy={size/2} r={r} strokeWidth={strokeWidth} />
        <circle className="progress-ring-fill" cx={size/2} cy={size/2} r={r} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      <div className="progress-ring-pct">{Math.round(progress)}%</div>
    </div>
  );
}

// ─── BACK BUTTON ─────────────────────────────────────────────────────────────

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="back-btn" onClick={onClick} type="button">
      ← Voltar
    </button>
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
    urgencia: "",
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
    // Force scroll to absolute top
    setTimeout(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 50);
  }, []);

  const goBack = useCallback(() => {
    const prev = prevStep(step);
    if (prev !== null) goTo(prev);
  }, [step, goTo]);

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
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "Erro na API");
      }
      const result: ConfirmResult = await res.json();
      set("mercadoConfirmado", result);
      goTo("1b");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao analisar mercado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // ── STEP 4: Drilling + Diagnose API ──
  const [drillProgress, setDrillProgress] = useState(0);
  const drillProgressRef = useRef(0);
  const smoothIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startDrilling = useCallback(async () => {
    setDrillingStep(0);
    setDrillingDone(false);
    setCounterVal(0);
    setDrillProgress(0);
    drillProgressRef.current = 0;
    apiDoneRef.current = false;

    // Smooth progress: creeps up to ~85% while waiting for API
    // Steps advance at specific thresholds
    smoothIntervalRef.current = setInterval(() => {
      if (apiDoneRef.current) return; // stop smooth when API done
      drillProgressRef.current = Math.min(drillProgressRef.current + 0.4, 85);
      const p = drillProgressRef.current;
      setDrillProgress(p);
      // Advance drill steps at thresholds
      if (p >= 20 && p < 21) setDrillingStep(1);
      if (p >= 45 && p < 46) setDrillingStep(2);
      if (p >= 70 && p < 71) setDrillingStep(3);
    }, 100);

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

      // Stop smooth animation
      if (smoothIntervalRef.current) clearInterval(smoothIntervalRef.current);

      // Complete all steps and animate to 100%
      setDrillingStep(DRILL_STEPS.length);
      const fillStart = drillProgressRef.current;
      const fillDuration = 1500;
      const fillStartTime = Date.now();
      const fillInterval = setInterval(() => {
        const elapsed = Date.now() - fillStartTime;
        const t = Math.min(elapsed / fillDuration, 1);
        const val = fillStart + (100 - fillStart) * t;
        setDrillProgress(val);
        if (t >= 1) clearInterval(fillInterval);
      }, 30);

      // Animate counter
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
      if (smoothIntervalRef.current) clearInterval(smoothIntervalRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      setError("Erro ao gerar diagnóstico. Tente novamente.");
      goTo(3);
    }
  }, [data, goTo]);

  useEffect(() => {
    if (step === 4 && drillProgress >= 99 && apiDoneRef.current && diagnoseResult) {
      const timer = setTimeout(() => setDrillingDone(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [step, drillProgress, diagnoseResult]);

  useEffect(() => {
    if (step === 4) {
      startDrilling();
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (smoothIntervalRef.current) clearInterval(smoothIntervalRef.current);
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
          urgencia: data.urgencia,
          investimento: data.investimento,
          dores: data.dores,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "Erro ao processar");
      }
      const result: LeadResult = await res.json();
      setLeadResult(result);
      goTo(7);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao processar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const [bioLoading, setBioLoading] = useState(false);

  // ── BIO IMAGE HANDLER (with compression) ──
  const handleBioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBioLoading(true);

    // Compress image to max 800px wide, JPEG quality 0.7
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxW = 800;
        let w = img.width;
        let h = img.height;
        if (w > maxW) {
          h = Math.round((h * maxW) / w);
          w = maxW;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          set("bioImagem", reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL("image/jpeg", 0.7);
        set("bioImagem", compressed);
        setBioLoading(false);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────

  return (
    <div className="wrap">
      <div className="grid-bg" />
      <div className="glow-top" />

      {/* Fullscreen analysis overlay */}
      {loading && step === 1 && (
        <div className="analysis-overlay">
          <div className="analysis-overlay-spinner" />
          <div className="analysis-overlay-text">ANALISANDO SEU MERCADO</div>
          <div className="analysis-overlay-sub">O Método V.I.S.O.R. está mapeando seu setor e identificando oportunidades escondidas...</div>
        </div>
      )}

      <div className="card">
        <ProgressDots step={step} />

        <div className="body">
          {/* ════════ STEP 0: LANDING ════════ */}
          {step === 0 && (
            <div className="step-content">
              <div className="landing-author">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="landing-author-img" src="/pedro.jpg" alt="Pedro Superti" />
                <div className="landing-author-info">
                  <div className="landing-author-name">Pedro Superti</div>
                  <div className="landing-author-role">Criador do Método V.I.S.O.R.</div>
                </div>
              </div>

              <div className="landing-title">QUANTA RIQUEZA ESTÁ ESCONDIDA NO SEU NEGÓCIO?</div>
              <div className="landing-subtitle">
                Nosso método exclusivo V.I.S.O.R. encontra oportunidades milionárias escondidas dentro do seu mercado
              </div>

              <div className="comparison-context">
                Esse é o salto que acontece quando você enxerga o que ninguém mais vê:
              </div>

              <div className="comparison-card">
                <div className="comparison-col bloqueada">
                  <div className="comparison-col-title">ONDE VOCÊ ESTÁ</div>
                  {[
                    ["Faturamento", "R$15k/mês", "📉"],
                    ["Margem", "22%", "😰"],
                    ["Horas/semana", "55h", "⏰"],
                    ["Fontes de receita", "1", "🔒"],
                    ["Valuation", "R$0", "❌"],
                  ].map(([l, v, icon]) => (
                    <div className="comparison-row" key={l}>
                      <span className="comparison-label"><span className="comp-icon">{icon}</span>{l}</span>
                      <span className="comparison-val">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="comparison-col desbloqueada">
                  <div className="comparison-col-title">ONDE PODE CHEGAR</div>
                  {[
                    ["Faturamento", "R$85k/mês", "📈"],
                    ["Margem", "61%", "🎯"],
                    ["Horas/semana", "25h", "⚡"],
                    ["Fontes de receita", "4", "🔓"],
                    ["Valuation", "R$2.4M", "💎"],
                  ].map(([l, v, icon]) => (
                    <div className="comparison-row" key={l}>
                      <span className="comparison-label"><span className="comp-icon">{icon}</span>{l}</span>
                      <span className="comparison-val">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="time-badge">
                Em 3 minutos você vai descobrir oportunidades que levariam meses para encontrar sozinho.
              </div>

              <div className="f">
                <label>Como posso te chamar?</label>
                <input
                  type="text"
                  placeholder="Seu primeiro nome"
                  value={data.nome}
                  onChange={(e) => set("nome", e.target.value)}
                />
              </div>

              <button
                className={`btn-drill${!data.nome.trim() ? " btn-disabled" : ""}`}
                disabled={!data.nome.trim()}
                onClick={() => goTo(1)}
              >
                DESCOBRIR MINHA RIQUEZA ESCONDIDA
              </button>

              <div className="social-proof">
                <div className="social-avatars">
                  <img className="avatar-img" src="https://i.pravatar.cc/80?img=1" alt="" />
                  <img className="avatar-img" src="https://i.pravatar.cc/80?img=5" alt="" />
                  <img className="avatar-img" src="https://i.pravatar.cc/80?img=12" alt="" />
                  <img className="avatar-img" src="https://i.pravatar.cc/80?img=32" alt="" />
                  <img className="avatar-img" src="https://i.pravatar.cc/80?img=26" alt="" />
                  <img className="avatar-img" src="https://i.pravatar.cc/80?img=47" alt="" />
                  <img className="avatar-img" src="https://i.pravatar.cc/80?img=44" alt="" />
                  <img className="avatar-img" src="https://i.pravatar.cc/80?img=20" alt="" />
                </div>
                <span>Usado por mais de 30.000 visionários</span>
              </div>
            </div>
          )}

          {/* ════════ STEP 1: MARKET ════════ */}
          {step === 1 && (
            <div className="step-content">
              <BackButton onClick={goBack} />
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="2" width="20" height="20" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <path d="M18 6h.01" />
                  </svg>
                  Anexar print da bio do Instagram (opcional)
                </button>
                <div className="bio-hint">A IA lê sua bio para entender melhor seu negócio</div>
                {bioLoading && (
                  <div className="bio-loading">
                    <span className="loading-inline" /> Processando imagem...
                  </div>
                )}
                {data.bioImagem && !bioLoading && (
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
              <BackButton onClick={goBack} />
              <div className="step-title">Encontramos seu mercado</div>
              <div className="confirm-box">
                <div className="confirm-sector">{data.mercadoConfirmado.setor_formatado}</div>
                
                <div className="confirm-stats">
                  <div className="confirm-stat">
                    <div className="confirm-stat-icon">🌍</div>
                    <div>
                      <div className="confirm-stat-label">Mercado estimado</div>
                      <div className="confirm-stat-val">{fmt(data.mercadoConfirmado.tam_estimado)}/ano</div>
                    </div>
                  </div>
                  <div className="confirm-stat">
                    <div className="confirm-stat-icon">📊</div>
                    <div>
                      <div className="confirm-stat-label">Seu acesso atual</div>
                      <div className="confirm-stat-val" style={{color: "var(--orange)"}}>Menos de 2%</div>
                    </div>
                  </div>
                  <div className="confirm-stat">
                    <div className="confirm-stat-icon">🚀</div>
                    <div>
                      <div className="confirm-stat-label">Potencial com IA</div>
                      <div className="confirm-stat-val" style={{color: "var(--green)"}}>8-15x mais</div>
                    </div>
                  </div>
                </div>

                <div className="confirm-insight">
                  A maioria dos profissionais desse mercado acessa menos de 2% do potencial real.
                </div>
              </div>
              <div className="confirm-btns">
                <button className="btn-sec" onClick={() => goTo(1)}>
                  QUERO REFORMULAR
                </button>
                <button className="btn-drill" onClick={() => goTo(2)}>
                  ISSO MESMO!
                </button>
              </div>
            </div>
          )}

          {/* ════════ STEP 2: DORES ════════ */}
          {step === 2 && (
            <div className="step-content">
              <BackButton onClick={goBack} />
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
              <BackButton onClick={goBack} />
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
              <ProgressRing progress={drillProgress} />
              <div className="d-title">ANALISANDO SEU MERCADO</div>
              <div>
                {DRILL_STEPS.map((s, i) => (
                  <div
                    key={i}
                    className={`d-step ${i < drillingStep ? "done" : i === drillingStep ? "active" : ""}`}
                  >
                    <div className="d-dot" />
                    <span className="d-step-icon">{s.icon}</span>
                    <span>{i < drillingStep ? "✓ " : ""}{s.text}</span>
                    {i === 0 && i < drillingStep && data.mercadoConfirmado && (
                      <span className="drill-result">
                        {data.mercadoConfirmado.setor_formatado}
                      </span>
                    )}
                    {i === 1 && i < drillingStep && (
                      <span className="drill-result">14 oportunidades encontradas</span>
                    )}
                  </div>
                ))}
              </div>

              {counterVal > 0 && (
                <div className="drill-amount-box">
                  <div className="drill-amount">{fmt(counterVal)}</div>
                  <div className="drill-amount-sub">de riqueza descoberta!</div>
                </div>
              )}

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

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const ideaAny = idea as any;
            const hasProjection = ideaAny.projecao_6m || ideaAny.projecao_12m || ideaAny.projecao_24m;

            return (
              <div className="idea-screen step-content" key={step}>
                <BackButton onClick={goBack} />
                <div className="idea-header">
                  <div className="idea-badge">IDEIA #{num}</div>
                  <div className={`idea-ia-badge ${idea.usa_ia ? "com-ia" : "sem-ia"}`}>
                    {idea.usa_ia ? "COM IA" : "SEM IA"}
                  </div>
                </div>

                <div className="idea-name">{idea.nome}</div>
                <div className="idea-desc">{idea.descricao}</div>

                <div className="idea-metrics">
                  <div className="idea-metric gold-metric">
                    <div className="idea-metric-icon">💰</div>
                    <div>
                      <div className="idea-metric-label">RIQUEZA DESBLOQUEADA</div>
                      <div className="idea-metric-val gold">{fmt(idea.potencial_anual)}/ano</div>
                    </div>
                  </div>
                  <div className="idea-metric">
                    <div className="idea-metric-icon">⏱️</div>
                    <div>
                      <div className="idea-metric-label">TEMPO DE RETORNO</div>
                      <div className="idea-metric-val">{idea.tempo_retorno_dias} dias</div>
                    </div>
                  </div>
                  <div className="idea-metric">
                    <div className="idea-metric-icon">🏟️</div>
                    <div>
                      <div className="idea-metric-label">CONCORRÊNCIA</div>
                      <div className="idea-metric-val">{idea.concorrencia}</div>
                    </div>
                  </div>
                  <div className="idea-metric">
                    <div className="idea-metric-icon">🎚️</div>
                    <div>
                      <div className="idea-metric-label">DIFICULDADE</div>
                      <div className="idea-metric-val">{idea.dificuldade}</div>
                    </div>
                  </div>
                  {ideaAny.valuation && (
                    <div className="idea-metric gold-metric">
                      <div className="idea-metric-icon">💎</div>
                      <div>
                        <div className="idea-metric-label">VALUATION DO NEGÓCIO</div>
                        <div className="idea-metric-val gold">{fmt(ideaAny.valuation)}</div>
                      </div>
                    </div>
                  )}
                </div>

                {hasProjection && (
                  <RevenueChart
                    p6={ideaAny.projecao_6m || 0}
                    p12={ideaAny.projecao_12m || 0}
                    p24={ideaAny.projecao_24m || idea.potencial_anual}
                  />
                )}

                {ideaAny.publico_alvo && (
                  <div className="idea-info-box idea-publico">
                    <div className="idea-info-label">🎯 PÚBLICO-ALVO</div>
                    <div className="idea-info-text">{ideaAny.publico_alvo}</div>
                  </div>
                )}

                {ideaAny.exemplo_real && (
                  <div className="idea-info-box idea-exemplo">
                    <div className="idea-info-label">💡 EXEMPLO DE MERCADO</div>
                    <div className="idea-info-text">{ideaAny.exemplo_real}</div>
                  </div>
                )}

                {ideaAny.primeiro_passo && (
                  <div className="idea-info-box idea-passo">
                    <div className="idea-info-label">🚀 PRIMEIRO PASSO</div>
                    <div className="idea-info-text">{ideaAny.primeiro_passo}</div>
                  </div>
                )}

                <div className="idea-cuidados">
                  <div className="idea-cuidados-label">⚠️ CUIDADOS</div>
                  <div className="idea-cuidados-text">{idea.cuidados}</div>
                </div>

                {idea.usa_ia && idea.como_usa_ia && (
                  <div className="idea-ia-detail">
                    <div className="idea-ia-detail-label">🤖 COMO A IA É USADA</div>
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
              <BackButton onClick={goBack} />
              <div className="step-title">Para montar seu plano personalizado, preciso de mais contexto.</div>
              <div className="step-subtitle">Essas informações ajudam a IA a calibrar seu plano de 90 dias.</div>

              <div className="f">
                <label>WhatsApp</label>
                <PhoneInput
                  defaultCountry="br"
                  value={data.whatsapp}
                  onChange={(phone) => set("whatsapp", phone)}
                  inputClassName="phone-input-field"
                  countrySelectorStyleProps={{ buttonClassName: "phone-country-btn" }}
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
                  <label>Qual seu nível de urgência?</label>
                  <select
                    value={data.urgencia}
                    onChange={(e) => set("urgencia", e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {URGENCIA_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div className="f" style={{ marginBottom: 0 }}>
                  <label>Quanto investiria para crescer?</label>
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
              <BackButton onClick={goBack} />
              <div className="step-title">{data.nome}, seu plano de desbloqueio de 90 dias</div>

              <div className="plano-intro">
                <span className="plano-intro-icon">💡</span>
                Uma das maiores janelas de oportunidade no mercado de{" "}
                {data.mercadoConfirmado?.setor_formatado || "seu setor"} agora:{" "}
                {diagnoseResult.plano.janela_ia}
              </div>

              <div className="plano-roadmap">
                <div className="plano-phase">
                  <div className="plano-phase-icon">🎯</div>
                  <div className="plano-phase-label">SEMANAS 1–2</div>
                  <div className="plano-phase-desc">{diagnoseResult.plano.semanas_1_2}</div>
                </div>
                <div className="plano-phase">
                  <div className="plano-phase-icon">🔧</div>
                  <div className="plano-phase-label">SEMANAS 3–4</div>
                  <div className="plano-phase-desc">{diagnoseResult.plano.semanas_3_4}</div>
                </div>
                <div className="plano-phase">
                  <div className="plano-phase-icon">🚀</div>
                  <div className="plano-phase-label">MÊS 2</div>
                  <div className="plano-phase-desc">{diagnoseResult.plano.mes_2}</div>
                </div>
                <div className="plano-phase">
                  <div className="plano-phase-icon">📈</div>
                  <div className="plano-phase-label">MÊS 3</div>
                  <div className="plano-phase-desc">{diagnoseResult.plano.mes_3}</div>
                </div>
              </div>

              <div className="plano-reality">
                ⏰ Esse plano exige cerca de {diagnoseResult.plano.horas_semana} horas por semana de dedicação.
              </div>

              <div className="plano-emotional">
                {data.nome}, esse plano foi criado especificamente para o seu mercado. Cada etapa foi pensada para te levar do ponto A ao ponto B da forma mais direta possível. A pergunta agora não é <em>se</em> você consegue — é <em>quando</em> você vai começar.
              </div>

              <button className="btn-drill" onClick={() => goTo(8)}>
                QUAL MEU PRÓXIMO PASSO?
              </button>
            </div>
          )}

          {/* ════════ STEP 8: DUAL SCORES ════════ */}
          {step === 8 && diagnoseResult && (
            <div className="step-content">
              <BackButton onClick={goBack} />
              <div className="step-title">{data.nome}, aqui está seu diagnóstico</div>
              <div className="step-subtitle">Analisamos seu mercado e identificamos onde você está — e até onde pode chegar.</div>

              {/* SCORE ATUAL - horizontal block */}
              <div className="score-row">
                <div className="score-row-circle">
                  <ScoreCircle score={diagnoseResult.scores.score_atual} size={90} variant="atual" />
                </div>
                <div className="score-row-content">
                  <div className="score-row-label" style={{color: "var(--orange)"}}>SUA SITUAÇÃO ATUAL</div>
                  <div className="score-row-desc">Esse é o nível em que seu negócio opera hoje, baseado nas dores que você compartilhou:</div>
                  <div className="score-row-items">
                    {diagnoseResult.scores.bloqueios.map((b, i) => (
                      <div className="score-row-item" key={i}><span className="sri-dot" style={{background:"var(--orange)"}} />{b}</div>
                    ))}
                  </div>
                </div>
              </div>

              {/* SCORE VISIONÁRIO - horizontal block */}
              <div className="score-row visionario-row">
                <div className="score-row-circle">
                  <ScoreCircle score={diagnoseResult.scores.score_visionario} size={110} variant="visionario" />
                </div>
                <div className="score-row-content">
                  <div className="score-row-label" style={{color: "var(--green)"}}>SEU POTENCIAL VISIONÁRIO</div>
                  <div className="score-row-desc">Pela nossa análise, esse é o nível que seu negócio pode alcançar aplicando as 3 ideias:</div>
                  <div className="score-row-items">
                    {diagnoseResult.scores.potenciais.map((p, i) => (
                      <div className="score-row-item" key={i}><span className="sri-dot" style={{background:"var(--green)"}} />{p}</div>
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
                COMO ACESSAR ESSA RIQUEZA?
              </button>
            </div>
          )}

          {/* ════════ STEP 9: FINAL (split by lead quality) ════════ */}
          {step === 9 && diagnoseResult && (() => {
            const tier = leadResult?.tier || "warm";
            const isHot = tier === "hot";
            const isCold = tier === "cold";

            return (
              <div className="elegivel-section step-content">
                <BackButton onClick={goBack} />

                {/* Scores block — shared by all tiers */}
                <div className="final-scores">
                  <div className="final-score-atual">
                    <div className="final-score-label">Score Atual</div>
                    <div className="final-score-num" style={{color: "var(--orange)"}}>{diagnoseResult.scores.score_atual}</div>
                  </div>
                  <div className="final-score-arrow">→</div>
                  <div className="final-score-vis">
                    <div className="final-score-label">Score Visionário</div>
                    <div className="final-score-num-big" style={{color: "var(--green)"}}>{diagnoseResult.scores.score_visionario}</div>
                  </div>
                </div>

                <div className="final-riqueza">
                  <div className="final-riqueza-label">RIQUEZA A DESBLOQUEAR</div>
                  <div className="final-riqueza-val">{fmt(diagnoseResult.scores.riqueza_total)}</div>
                </div>

                {/* HOT: sessão gratuita */}
                {isHot && (
                  <>
                    <div className="step-title">{data.nome}, posso te fazer uma proposta?</div>
                    <div className="elegivel-minority">
                      O Método V.I.S.O.R. identificou seu negócio como um dos poucos com potencial visionário real. Você faz parte de uma minoria.
                    </div>

                    <div className="elegivel-badge">
                      <div className="elegivel-badge-icon">&#10003;</div>
                      <div className="elegivel-badge-text">STATUS: ELEGÍVEL</div>
                    </div>

                    <div className="elegivel-desc">
                      Seu negócio está elegível para uma sessão estratégica de 40 minutos onde um especialista em diferenciação da minha equipe vai te mostrar exatamente quais dessas oportunidades atacar primeiro e como implementar nos próximos 90 dias.
                    </div>

                    <div className="elegivel-price">
                      Essa sessão custa <strong>R$1 mil</strong>. Mas pelo seu perfil, você está elegível para receber uma <strong>sem custo nenhum</strong> — porque estamos selecionando cases para nosso próximo estudo de mercado.
                    </div>

                    <a
                      href={CONSULTORIA_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: "none", display: "block", width: "100%" }}
                    >
                      <button className="btn-gold">
                        QUERO MINHA SESSÃO ESTRATÉGICA GRATUITA
                      </button>
                    </a>

                    <button
                      className="btn-sec"
                      style={{ width: "100%", marginTop: 10 }}
                      onClick={() => generatePDFReport(data, diagnoseResult, "hot")}
                    >
                      SALVAR MEU RELATÓRIO COMPLETO (PDF)
                    </button>

                    <div className="elegivel-vagas">
                      Vagas limitadas. Apenas {leadResult?.topPercent || 8}% dos perfis analisados recebem essa oferta.
                    </div>
                  </>
                )}

                {/* WARM: sessão com valor reduzido */}
                {!isHot && !isCold && (
                  <>
                    <div className="step-title">{data.nome}, você tem potencial</div>
                    <div className="elegivel-minority">
                      O Método V.I.S.O.R. identificou oportunidades reais no seu mercado. Com a orientação certa, você pode destravar esse crescimento mais rápido.
                    </div>

                    <div className="elegivel-badge warm-badge">
                      <div className="elegivel-badge-icon">→</div>
                      <div className="elegivel-badge-text">PRÓXIMO PASSO DISPONÍVEL</div>
                    </div>

                    <div className="elegivel-desc">
                      Oferecemos sessões estratégicas de 40 minutos com um especialista em diferenciação para te mostrar como atacar essas oportunidades. Normalmente custa R$1 mil.
                    </div>

                    <div className="elegivel-price">
                      Pelo seu perfil, liberamos uma condição especial: <strong>sessão por R$297</strong> (valor promocional para perfis selecionados pela calculadora).
                    </div>

                    <a
                      href={CONSULTORIA_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: "none", display: "block", width: "100%" }}
                    >
                      <button className="btn-gold">
                        QUERO MINHA SESSÃO ESTRATÉGICA
                      </button>
                    </a>

                    <button
                      className="btn-sec"
                      style={{ width: "100%", marginTop: 10 }}
                      onClick={() => generatePDFReport(data, diagnoseResult, tier as "hot" | "warm" | "cold")}
                    >
                      SALVAR MEU RELATÓRIO COMPLETO (PDF)
                    </button>
                  </>
                )}

                {/* COLD: plano completo + PDF */}
                {isCold && (
                  <>
                    <div className="step-title">{data.nome}, seu plano está pronto</div>
                    <div className="nurture-intro">
                      O Método V.I.S.O.R. mapeou oportunidades reais no seu mercado. Revise o plano, comece a implementar, e quando estiver pronto para acelerar — estaremos aqui.
                    </div>

                    <div className="nurture-ideas">
                      {diagnoseResult.ideias.map((idea, i) => (
                        <div className="nurture-idea" key={i}>
                          <div className="nurture-idea-num">#{i + 1}</div>
                          <div className="nurture-idea-body">
                            <div className="nurture-idea-name">{idea.nome}</div>
                            <div className="nurture-idea-val">{fmt(idea.potencial_anual)}/ano</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="nurture-plano">
                      <div className="nurture-plano-title">SEU PLANO DE 90 DIAS</div>
                      <div className="nurture-plano-item"><strong>Semanas 1-2:</strong> {diagnoseResult.plano.semanas_1_2}</div>
                      <div className="nurture-plano-item"><strong>Semanas 3-4:</strong> {diagnoseResult.plano.semanas_3_4}</div>
                      <div className="nurture-plano-item"><strong>Mês 2:</strong> {diagnoseResult.plano.mes_2}</div>
                      <div className="nurture-plano-item"><strong>Mês 3:</strong> {diagnoseResult.plano.mes_3}</div>
                    </div>

                    <button
                      className="btn-drill"
                      onClick={() => generatePDFReport(data, diagnoseResult, "cold")}
                    >
                      SALVAR MEU RELATÓRIO COMPLETO (PDF)
                    </button>

                    <div className="nurture-upgrade">
                      Quer acelerar esses resultados com ajuda de um especialista?
                      <a
                        href={CONSULTORIA_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Conheça nossa consultoria
                      </a>
                    </div>
                  </>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      <div className="ftag">Calculadora Visionária 2026 · Pedro Superti</div>
    </div>
  );
}
