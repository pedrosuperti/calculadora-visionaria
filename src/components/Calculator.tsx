"use client";

import { useState, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { FormData, DiagnosticoResult, Step } from "@/lib/types";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const SONDA_STEPS = [
  "Mapeando tamanho do mercado...",
  "Estimando concentração regional...",
  "Calculando potencial por nível...",
  "Buscando benchmarks do setor...",
  "Gerando análise Visionária...",
];

const NIVEL_COLORS = { n1: "#4FC3F7", n2: "#C9A84C", n3: "#FF8A65" };

const VISIONARIO_LABELS = [
  { min: 0, max: 30, label: "EXPLORADOR", color: "#7986CB", desc: "Mercado mapeado. Ainda há muito a descobrir sobre o potencial real." },
  { min: 30, max: 55, label: "PROSPECTOR", color: "#4FC3F7", desc: "Oportunidade identificada. Escolha onde perfurar antes que outros cheguem." },
  { min: 55, max: 75, label: "PERFURADOR", color: "#C9A84C", desc: "Oportunidade clara, modelo definido, experiência na mão. Hora de executar." },
  { min: 75, max: 90, label: "ESTRATEGISTA", color: "#FF8A65", desc: "Mercado grande + contexto forte + ambição alta. Poucas pessoas chegam aqui." },
  { min: 90, max: 101, label: "VISIONÁRIO", color: "#E8D44D", desc: "Petróleo confirmado em escala Dubai. Construa a sonda agora — a janela está aberta." },
];

const TIERS = [
  { key: "dubai", label: "DUBAI", icon: "🛢️", range: "Acima de R$50M", color: "#FFB300", bg: "rgba(255,179,0,.08)", min: 5e7, desc: "Mercado de escala global. Empresas bilionárias nascem aqui." },
  { key: "oceano", label: "OCEANO", icon: "🌊", range: "R$5M – R$50M", color: "#FF8A65", bg: "rgba(255,138,101,.08)", min: 5e6, desc: "Volume real para construir uma empresa sólida e relevante." },
  { key: "rio", label: "RIO", icon: "💧", range: "R$500k – R$5M", color: "#4FC3F7", bg: "rgba(79,195,247,.08)", min: 5e5, desc: "Nicho com tração. Ticket alto faz toda a diferença." },
  { key: "poca", label: "POÇA", icon: "〰️", range: "Até R$500k", color: "#7986CB", bg: "rgba(121,134,203,.08)", min: 0, desc: "Mercado pequeno. Pode ser suficiente — se o ticket compensar." },
];

// ─── UTILS ────────────────────────────────────────────────────────────────────
function fmt(val: number): string {
  if (!val) return "—";
  if (val >= 1e9) return `R$ ${(val / 1e9).toFixed(1).replace(".", ",")} bi`;
  if (val >= 1e6) return `R$ ${(val / 1e6).toFixed(1).replace(".", ",")} mi`;
  if (val >= 1e3) return `R$ ${(val / 1e3).toFixed(0)}k`;
  return `R$ ${val.toFixed(0)}`;
}

function fmtN(val: number): string {
  if (!val) return "—";
  if (val >= 1e6) return `${(val / 1e6).toFixed(1).replace(".", ",")}M`;
  if (val >= 1e3) return `${(val / 1e3).toFixed(0)}k`;
  return val.toString();
}

function numBRL(s: string): number {
  const n = parseFloat(String(s).replace(/[^\d.]/g, ""));
  return isNaN(n) ? 0 : n;
}

function getVisionario(score: number) {
  return VISIONARIO_LABELS.find((v) => score >= v.min && score < v.max) || VISIONARIO_LABELS[0];
}

function calcScore(
  result: DiagnosticoResult | null,
  ambition: number,
  risco: number,
  urgencia: number,
  investimento: number
): number {
  if (!result) return 0;
  let s = 0;
  const tam = result.tam_anual || 0;
  if (tam > 1e9) s += 28;
  else if (tam > 1e8) s += 20;
  else if (tam > 1e7) s += 12;
  else s += 4;
  if (result.anos_experiencia >= 10) s += 18;
  else if (result.anos_experiencia >= 5) s += 12;
  else s += 5;
  if (result.modelo_sugerido_nivel === "n3") s += 22;
  else if (result.modelo_sugerido_nivel === "n2") s += 14;
  else s += 6;
  s += Math.round(ambition * 0.12);
  s += Math.round(risco * 0.08);
  s += Math.round(urgencia * 0.06);
  s += Math.round(investimento * 0.06);
  return Math.min(100, Math.round(s));
}

const SLIDER_GRAD = "linear-gradient(to right, #0D2B6B, #1565C0, #C9A84C, #FF6D00, #B71C1C)";

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Calculator() {
  const [step, setStep] = useState<Step>("form");
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState<FormData>({
    mercado: "", pais: "Brasil", ticket: "", anos: "",
    publico: "", problema: "", receita_atual: "", modelo_atual: "",
  });
  const [drillingStep, setDrillingStep] = useState(0);
  const [result, setResult] = useState<DiagnosticoResult | null>(null);
  const [error, setError] = useState("");
  const [ambition, setAmbition] = useState(50);
  const [risco, setRisco] = useState(50);
  const [urgencia, setUrgencia] = useState(50);
  const [investimento, setInvestimento] = useState(50);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const set = (k: keyof FormData, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.mercado.trim() || !form.ticket) {
      setError("Preencha o mercado e o ticket para continuar.");
      return;
    }
    setError("");
    setStep("drilling");
    setDrillingStep(0);
    let i = 0;
    intervalRef.current = setInterval(() => {
      i++;
      setDrillingStep(i);
      if (i >= SONDA_STEPS.length - 1 && intervalRef.current) clearInterval(intervalRef.current);
    }, 850);

    try {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Erro na API");
      const parsed: DiagnosticoResult = await res.json();
      if (intervalRef.current) clearInterval(intervalRef.current);
      setTimeout(() => {
        setResult(parsed);
        setStep("result");
      }, 500);
    } catch (e: unknown) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const msg = e instanceof Error ? e.message : "Tente novamente.";
      setError("Erro: " + msg);
      setStep("form");
    }
  };

  const score = calcScore(result, ambition, risco, urgencia, investimento);
  const visionario = getVisionario(score);
  const fatiaAtual = result ? Math.round(result.tam_anual * (ambition / 100) * 0.01) : 0;

  return (
    <div className="wrap">
      <div className="grid-bg" />
      <div className="glow-top" />

      <div className="card">
        {/* TOP BANNER */}
        <div className="top-banner">
          <div className="banner-icon">🛢️</div>
          <div className="banner-text">
            <div className="banner-event">Visionários Day 2026</div>
            <div className="banner-title">MÉTODO SONDA</div>
            <div className="banner-by">Powered by Pedro Superti</div>
          </div>
        </div>

        {/* HEADER */}
        <div className="hdr">
          <div className="hdr-mark">V</div>
          <div>
            <h1>CALCULADORA DE PETRÓLEO</h1>
            <p>Canvas Visionário · Análise de Mercado com IA</p>
          </div>
        </div>

        <div className="body">
          {/* ── FORM ── */}
          {step === "form" && (
            <div>
              <div className="f">
                <label>Qual é o seu mercado / setor?</label>
                <textarea
                  rows={2}
                  placeholder="Descreva com suas palavras. Ex: sou dentista especializado em implantes, tenho uma escola de inglês para adultos corporativos..."
                  value={form.mercado}
                  onChange={(e) => set("mercado", e.target.value)}
                />
              </div>

              <div className="row2 mb16">
                <div className="f" style={{ marginBottom: 0 }}>
                  <label>País / Região de atuação</label>
                  <input type="text" placeholder="Ex: Brasil, Portugal, global..." value={form.pais} onChange={(e) => set("pais", e.target.value)} />
                </div>
                <div className="f" style={{ marginBottom: 0 }}>
                  <label>Ticket médio atual (R$/mês)</label>
                  <input type="number" placeholder="Por cliente por mês" value={form.ticket} onChange={(e) => set("ticket", e.target.value)} />
                </div>
              </div>

              <button className="expand-btn" onClick={() => setExpanded((x) => !x)}>
                {expanded ? "▲ Menos detalhes" : "▼ Adicionar mais contexto (opcional — melhora a análise)"}
              </button>

              {expanded && (
                <>
                  <div className="row2 mb16">
                    <div className="f" style={{ marginBottom: 0 }}>
                      <label>Anos de experiência no setor</label>
                      <input type="number" placeholder="Ex: 12" value={form.anos} onChange={(e) => set("anos", e.target.value)} />
                    </div>
                    <div className="f" style={{ marginBottom: 0 }}>
                      <label>Receita mensal atual (R$)</label>
                      <input type="number" placeholder="Aproximada" value={form.receita_atual} onChange={(e) => set("receita_atual", e.target.value)} />
                    </div>
                  </div>
                  <div className="f">
                    <label>Para quem você vende hoje?</label>
                    <input type="text" placeholder="Ex: pequenas clínicas, dentistas solo, empresas com 50–200 funcionários..." value={form.publico} onChange={(e) => set("publico", e.target.value)} />
                  </div>
                  <div className="f">
                    <label>Qual problema principal você resolve?</label>
                    <input type="text" placeholder="Ex: falta de padronização no atendimento, alto custo de conformidade..." value={form.problema} onChange={(e) => set("problema", e.target.value)} />
                  </div>
                  <div className="f">
                    <label>Modelo de negócio atual</label>
                    <input type="text" placeholder="Ex: consultoria por hora, curso online, serviço mensal recorrente..." value={form.modelo_atual} onChange={(e) => set("modelo_atual", e.target.value)} />
                  </div>
                </>
              )}

              {error && <div className="err">{error}</div>}
              <button className="btn-drill" onClick={handleSubmit}>🔍 ANALISAR MINHAS CHANCES</button>
            </div>
          )}

          {/* ── DRILLING ── */}
          {step === "drilling" && (
            <div className="drilling">
              <div className="d-icon">⛏️</div>
              <div className="d-title">PERFURANDO SEU MERCADO</div>
              <div>
                {SONDA_STEPS.map((s, i) => (
                  <div key={i} className={`d-step ${i < drillingStep ? "done" : i === drillingStep ? "active" : ""}`}>
                    <div className="d-dot" />
                    {i < drillingStep ? "✓ " : ""}{s}
                  </div>
                ))}
              </div>
              <div className="pbar">
                <div className="pfill" style={{ width: `${Math.min(100, (drillingStep / (SONDA_STEPS.length - 1)) * 100)}%` }} />
              </div>
            </div>
          )}

          {/* ── RESULT ── */}
          {step === "result" && result && (
            <ResultView
              result={result}
              score={score}
              visionario={visionario}
              fatiaAtual={fatiaAtual}
              ambition={ambition}
              setAmbition={setAmbition}
              risco={risco}
              setRisco={setRisco}
              urgencia={urgencia}
              setUrgencia={setUrgencia}
              investimento={investimento}
              setInvestimento={setInvestimento}
              ticket={form.ticket}
              onReset={() => {
                setStep("form");
                setResult(null);
                setAmbition(50);
                setRisco(50);
                setUrgencia(50);
                setInvestimento(50);
              }}
              onShare={() => setShareOpen(true)}
            />
          )}
        </div>
      </div>

      <div className="ftag">Pedro Superti · Visionários Day 2026</div>

      {/* SHARE MODAL */}
      {shareOpen && result && (
        <ShareModal
          result={result}
          score={score}
          visionario={visionario}
          fatiaAtual={fatiaAtual}
          copied={copied}
          onCopy={() => {
            const vis = getVisionario(score);
            const activeTier = TIERS.find((t) => result.tam_anual >= t.min) || TIERS[3];
            const text = `Acabei de mapear meu mercado com a Calculadora de Petróleo 🛢️\n\n📊 ${result.setor_formatado}\n💰 Mercado: ${fmt(result.tam_anual)}/ano\n🎯 Minha fatia: ${fmt(fatiaAtual)}/ano\n🏆 Nível: ${vis.label}\n🗺️ Classificação: ${activeTier.label}\n\n"${result.insight}"\n\n👉 Analise o seu também:\npedrosuperti.com.br | @pedrosuperti`;
            navigator.clipboard.writeText(text).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}

// ─── RESULT VIEW ──────────────────────────────────────────────────────────────
interface ResultViewProps {
  result: DiagnosticoResult;
  score: number;
  visionario: (typeof VISIONARIO_LABELS)[number];
  fatiaAtual: number;
  ambition: number;
  setAmbition: (v: number) => void;
  risco: number;
  setRisco: (v: number) => void;
  urgencia: number;
  setUrgencia: (v: number) => void;
  investimento: number;
  setInvestimento: (v: number) => void;
  ticket: string;
  onReset: () => void;
  onShare: () => void;
}

function ResultView({
  result, score, visionario, fatiaAtual,
  ambition, setAmbition, risco, setRisco,
  urgencia, setUrgencia, investimento, setInvestimento,
  ticket, onReset, onShare,
}: ResultViewProps) {
  const n1 = result.nivel_n1;
  const n2 = result.nivel_n2;
  const n3 = result.nivel_n3;
  const chartData = [
    { name: "MILÃO\n(N1)", val: n1?.potencial_anual || 0, color: NIVEL_COLORS.n1 },
    { name: "MILHÃO\n(N2)", val: n2?.potencial_anual || 0, color: NIVEL_COLORS.n2 },
    { name: "BILHÃO\n(N3)", val: n3?.potencial_anual || 0, color: NIVEL_COLORS.n3 },
  ];

  const activeTier = TIERS.find((t) => result.tam_anual >= t.min) || TIERS[3];

  const sliders = [
    {
      label: "Ambição de mercado",
      hint: ["Nicho pequeno", "Domínio total"],
      val: ambition,
      setVal: setAmbition,
      desc: ambition < 33 ? "Fatia conservadora do mercado" : ambition < 66 ? "Fatia realista de ~0,5%" : "Aposta em dominar o mercado",
    },
    {
      label: "Tolerância ao risco",
      hint: ["Prefiro segurança", "Topo risco"],
      val: risco,
      setVal: setRisco,
      desc: risco < 33 ? "Modelo previsível, crescimento lento" : risco < 66 ? "Equilíbrio risco / retorno" : "Disposto a arriscar por retorno maior",
    },
    {
      label: "Urgência de resultado",
      hint: ["Longo prazo", "Preciso já"],
      val: urgencia,
      setVal: setUrgencia,
      desc: urgencia < 33 ? "Construção gradual, 3–5 anos" : urgencia < 66 ? "Tração em 12–24 meses" : "Resultado em menos de 6 meses",
    },
    {
      label: "Capital disponível",
      hint: ["Sem capital", "Tenho investimento"],
      val: investimento,
      setVal: setInvestimento,
      desc: investimento < 33 ? "Bootstrap — começa pequeno" : investimento < 66 ? "Capital moderado disponível" : "Pronto para investir de forma agressiva",
    },
  ];

  const perfil = (() => {
    const a = ambition < 33 ? "com foco em nicho" : ambition < 66 ? "buscando uma fatia realista do mercado" : "com visão de domínio de mercado";
    const r = risco < 33 ? "modelo conservador e previsível" : risco < 66 ? "equilíbrio entre segurança e crescimento" : "aposta em crescimento acelerado";
    const u = urgencia < 33 ? "sem pressa para resultados" : urgencia < 66 ? "com foco em tração nos próximos 2 anos" : "com urgência para gerar resultado rápido";
    const i = investimento < 33 ? "bootstrap e baixo custo inicial" : investimento < 66 ? "investimento moderado" : "capital disponível para escalar";
    return `Você está entrando nesse mercado ${a}, com ${r}, ${u} e ${i}.`;
  })();

  const focoCors = ["#4FC3F7", "#FF8A65", "#C9A84C"];

  return (
    <div className="result">
      {/* 1. MARKET LADDER */}
      <div className="ladder-wrap mb20">
        <div className="sec-title">SEU MERCADO NO MAPA</div>
        {TIERS.map((t) => {
          const isActive = t.key === activeTier.key;
          return (
            <div
              key={t.key}
              className={`ladder-row ${isActive ? "ladder-active" : ""}`}
              style={{
                borderColor: isActive ? t.color + "66" : "rgba(201,168,76,.07)",
                background: isActive ? t.color + "0D" : "transparent",
              }}
            >
              <div className="ladder-icon" style={{ opacity: isActive ? 1 : 0.35 }}>{t.icon}</div>
              <div className="ladder-body">
                <div className="ladder-name" style={{ color: isActive ? t.color : "rgba(226,221,212,.35)" }}>{t.label}</div>
                <div className="ladder-desc" style={{ color: isActive ? "rgba(226,221,212,.7)" : "rgba(226,221,212,.25)" }}>
                  {isActive ? t.desc : t.range}
                </div>
              </div>
              <div className="ladder-range" style={{ color: isActive ? t.color : "rgba(226,221,212,.2)" }}>{t.range}</div>
              {isActive && <div className="ladder-pin">◀ VOCÊ</div>}
            </div>
          );
        })}
        <div className="tam-big" style={{ marginTop: 12, marginBottom: 0 }}>
          <div className="tam-label">Tamanho total — {result.pais_mercado}</div>
          <div className="tam-val">{fmt(result.tam_anual)}</div>
          <div className="tam-sub">por ano · {result.setor_formatado}</div>
        </div>
      </div>

      {/* 2. INSIGHT */}
      {result.insight && <div className="insight">&ldquo;{result.insight}&rdquo;</div>}

      {/* 3. SCENARIO SLIDERS */}
      <div className="amb-box mb20">
        <div className="amb-header">
          <span className="amb-label">Ajuste seu cenário</span>
          <span className="amb-hint">Mova os sliders — os resultados mudam em tempo real</span>
        </div>
        {sliders.map(({ label, hint, val, setVal, desc }) => (
          <div key={label} className="slider-row">
            <div className="slider-header">
              <span className="slider-label">{label}</span>
              <span className="slider-desc">{desc}</span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={val}
              onChange={(e) => setVal(Number(e.target.value))}
              style={{ background: SLIDER_GRAD }}
            />
            <div className="slider-hints">
              <span>{hint[0]}</span>
              <span>{hint[1]}</span>
            </div>
          </div>
        ))}
        <div className="perfil-box">
          <div className="perfil-label">🧭 Seu perfil de entrada</div>
          <div className="perfil-text">{perfil}</div>
        </div>
        <div className="amb-results" style={{ marginTop: 14 }}>
          <div className="amb-metric">
            <div className="amb-metric-label">Seu reservatório</div>
            <div className="amb-metric-val" style={{ color: "#C9A84C" }}>{fmt(fatiaAtual)}</div>
          </div>
          <div className="amb-metric">
            <div className="amb-metric-label">Clientes para R$1M/ano</div>
            <div className="amb-metric-val">
              {numBRL(ticket) > 0 ? Math.ceil(1000000 / (numBRL(ticket) * 12)) : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* 4. N1/N2/N3 CHART */}
      <div className="chart-wrap mb20">
        <div className="sec-title">OS 3 HORIZONTES — N1 · N2 · N3</div>
        <div className="chart-inner">
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={chartData} barSize={36} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
              <XAxis
                dataKey="name"
                tick={{ fill: "rgba(226,221,212,.5)", fontSize: 11, fontFamily: "Bebas Neue" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide scale="log" domain={["auto", "auto"]} />
              <Tooltip
                cursor={{ fill: "rgba(201,168,76,.05)" }}
                contentStyle={{
                  background: "#0E1521",
                  border: "1px solid rgba(201,168,76,.2)",
                  borderRadius: 0,
                  fontFamily: "Outfit",
                  fontSize: 12,
                }}
                formatter={(v) => [fmt(Number(v)), "Potencial anual"]}
              />
              <Bar dataKey="val" radius={0} minPointSize={8}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.color} opacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="nivel-cards-wrap">
          <div className="nivel-cards">
            {[
              { nivel: "N1", data: n1, color: NIVEL_COLORS.n1, label: "MILÃO" },
              { nivel: "N2", data: n2, color: NIVEL_COLORS.n2, label: "MILHÃO" },
              { nivel: "N3", data: n3, color: NIVEL_COLORS.n3, label: "BILHÃO" },
            ].map(
              ({ nivel, data, color, label }) =>
                data && (
                  <div className="nivel-card" key={nivel} style={{ borderTopColor: color }}>
                    <div className="nc-label" style={{ color }}>{nivel} · {label}</div>
                    <div className="nc-pot" style={{ color }}>{fmt(data.potencial_anual)}</div>
                    <div className="nc-desc">{data.descricao}</div>
                    <div className="nc-ex">Ex: {data.exemplo_empresa}</div>
                  </div>
                )
            )}
          </div>
        </div>
      </div>

      {/* 5. N3 INSIGHT */}
      {result.insight_n3 && (
        <div className="n3-box mb20">
          <div className="n3-label">🔭 O que esse mercado vai precisar (N3)</div>
          <div className="n3-text">{result.insight_n3}</div>
        </div>
      )}

      {/* 6. MODELOS ALTERNATIVOS */}
      {result.modelos_alternativos?.length > 0 && (
        <div className="mb20">
          <div className="sec-title">E SE VOCÊ PENSASSE MAIOR? OUTROS MODELOS</div>
          <div className="alt-cards">
            {result.modelos_alternativos.map((m, i) => (
              <div className="alt-card" key={i}>
                <div className="alt-card-top">
                  <div className="alt-tag">{m.modelo}</div>
                  <div className="alt-val">{fmt(m.potencial_anual)}</div>
                </div>
                <div className="alt-desc">{m.descricao}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. DADOS DO MERCADO */}
      <div className="mb20">
        <div className="sec-title">DADOS DO MERCADO</div>
        <div className="data-box">
          <div className="drow">
            <span className="drow-l">Profissionais / operadores</span>
            <span className="drow-r">{fmtN(result.profissionais_total)}</span>
          </div>
          <div className="drow">
            <span className="drow-l">Empresas / unidades</span>
            <span className="drow-r">{fmtN(result.empresas_total)}</span>
          </div>
          <div className="drow">
            <span className="drow-l">Ticket ideal sugerido</span>
            <span className="drow-r" style={{ color: "#C9A84C" }}>
              R${result.ticket_sugerido_min?.toLocaleString("pt-BR")} – R${result.ticket_sugerido_max?.toLocaleString("pt-BR")}/mês
            </span>
          </div>
          {result.concentracao_regiao && (
            <div className="drow">
              <span className="drow-l">Concentração regional</span>
              <span className="drow-r">{result.concentracao_regiao}</span>
            </div>
          )}
          {result.benchmark_mundial && (
            <div className="drow">
              <span className="drow-l">Benchmark mundial</span>
              <span className="drow-r">{result.benchmark_mundial}</span>
            </div>
          )}
        </div>
      </div>

      {/* 8. IA MUDA TUDO */}
      {result.ia_muda_tudo && (
        <div className="ia-box mb20">
          <div className="ia-header">
            <span className="ia-icon">⚡</span>
            <span className="ia-title">O que a IA muda nesse mercado</span>
          </div>
          <div className="ia-row">
            <div className="ia-col ia-antes">
              <div className="ia-col-label">🔒 Antes da IA</div>
              <div className="ia-col-text">{result.ia_muda_tudo.antes}</div>
            </div>
            <div className="ia-arrow">→</div>
            <div className="ia-col ia-depois">
              <div className="ia-col-label">🚀 Agora é possível</div>
              <div className="ia-col-text">{result.ia_muda_tudo.depois}</div>
            </div>
          </div>
          <div className="ia-janela">
            <span className="ia-janela-icon">⏳</span>
            <span>{result.ia_muda_tudo.janela}</span>
          </div>
        </div>
      )}

      {/* 9. SUGESTÕES DE FOCO */}
      {result.sugestoes_foco?.length > 0 && (
        <div className="mb20">
          <div className="sec-title">E SE VOCÊ FOCASSE DIFERENTE?</div>
          <div className="foco-cards">
            {result.sugestoes_foco.map((s, i) => {
              const cor = focoCors[i % focoCors.length];
              return (
                <div className="foco-card" key={i} style={{ borderLeftColor: cor }}>
                  <div className="foco-tipo" style={{ color: cor }}>{s.tipo}</div>
                  <div className="foco-sugestao">{s.sugestao}</div>
                  <div className="foco-bottom">
                    <div className="foco-motivo">{s.motivo}</div>
                    <div className="foco-pot" style={{ color: cor }}>{fmt(s.potencial_anual)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 10. CONSELHO VISIONÁRIO */}
      {result.conselho_visionario && (
        <div className="conselho-box mb20">
          <div className="conselho-header">
            <span className="conselho-icon">🧭</span>
            <span className="conselho-label">Conselho Visionário</span>
          </div>
          <div className="conselho-text">{result.conselho_visionario}</div>
          <div className="conselho-footer">Faça isso nos próximos 7 dias.</div>
        </div>
      )}

      {/* 11. NÍVEL VISIONÁRIO */}
      <div className="vis-box" style={{ borderColor: visionario.color + "55", background: visionario.color + "08" }}>
        <div className="vis-label" style={{ color: visionario.color }}>Seu Potencial Nível Visionário</div>
        <div className="vis-score" style={{ color: visionario.color }}>{score}</div>
        <div className="vis-title" style={{ color: visionario.color }}>{visionario.label}</div>
        <div className="vis-desc">{visionario.desc}</div>
        <div className="score-bar">
          <div className="score-fill" style={{ width: `${score}%`, background: visionario.color, color: visionario.color }} />
        </div>
      </div>

      {/* 12. BUTTONS */}
      <div className="btn-row">
        <button className="btn-sec" onClick={onReset}>← Novo cálculo</button>
        <button className="btn-pri" onClick={onShare}>🚀 Compartilhar minha análise</button>
      </div>
    </div>
  );
}

// ─── SHARE MODAL ──────────────────────────────────────────────────────────────
interface ShareModalProps {
  result: DiagnosticoResult;
  score: number;
  visionario: (typeof VISIONARIO_LABELS)[number];
  fatiaAtual: number;
  copied: boolean;
  onCopy: () => void;
  onClose: () => void;
}

function ShareModal({ result, score, visionario, fatiaAtual, copied, onCopy, onClose }: ShareModalProps) {
  const activeTier = TIERS.find((t) => result.tam_anual >= t.min) || TIERS[3];
  const vis = visionario;

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 400, padding: 0, overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
        {/* Story card */}
        <div style={{
          background: "linear-gradient(160deg,#060A10 0%,#0D1520 60%,#060A10 100%)",
          padding: "28px 24px 20px",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, background: `radial-gradient(circle,${activeTier.color}22 0%,transparent 70%)`, pointerEvents: "none" }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 9, letterSpacing: 3, textTransform: "uppercase", color: "rgba(201,168,76,.5)", marginBottom: 4 }}>Canvas Visionário</div>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 11, letterSpacing: 2, color: "rgba(226,221,212,.4)" }}>Visionários Day 2026 · @pedrosuperti</div>
            </div>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 32, lineHeight: 1 }}>{activeTier.icon}</div>
          </div>

          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, letterSpacing: 2, color: "#E2DDD4", lineHeight: 1.1, marginBottom: 6 }}>{result.setor_formatado}</div>
          <div style={{ fontSize: 11, color: "rgba(226,221,212,.35)", marginBottom: 20, letterSpacing: 1 }}>{result.pais_mercado}</div>

          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: activeTier.bg, border: `1px solid ${activeTier.color}55`,
            padding: "8px 16px", marginBottom: 20,
          }}>
            <span style={{ fontFamily: "'Bebas Neue'", fontSize: 22, letterSpacing: 3, color: activeTier.color }}>{activeTier.label}</span>
            <span style={{ fontSize: 11, color: activeTier.color, opacity: 0.7, letterSpacing: 1 }}>/ {activeTier.range}</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
            <div style={{ background: "rgba(255,255,255,.04)", padding: "12px 14px", borderTop: `2px solid ${activeTier.color}` }}>
              <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "rgba(201,168,76,.5)", marginBottom: 5 }}>Mercado total</div>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 22, color: "#C9A84C", letterSpacing: 1 }}>{fmt(result.tam_anual)}</div>
            </div>
            <div style={{ background: "rgba(255,255,255,.04)", padding: "12px 14px", borderTop: `2px solid ${vis.color}` }}>
              <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "rgba(201,168,76,.5)", marginBottom: 5 }}>Minha fatia</div>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 22, color: vis.color, letterSpacing: 1 }}>{fmt(fatiaAtual)}</div>
            </div>
          </div>

          {result.insight && (
            <div style={{ borderLeft: `3px solid ${activeTier.color}`, paddingLeft: 14, marginBottom: 16, fontSize: 13, color: "rgba(226,221,212,.75)", fontStyle: "italic", lineHeight: 1.6 }}>
              &ldquo;{result.insight}&rdquo;
            </div>
          )}

          {result.ia_muda_tudo?.depois && (
            <div style={{ background: "rgba(255,255,255,.04)", borderLeft: "3px solid #00E5FF", padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "rgba(226,221,212,.7)", lineHeight: 1.5 }}>
              <span style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: "rgba(0,229,255,.6)", display: "block", marginBottom: 4 }}>⚡ Com IA</span>
              {result.ia_muda_tudo.depois}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 4, height: 36, background: vis.color }} />
              <div>
                <div style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: "rgba(226,221,212,.35)" }}>Nível Visionário</div>
                <div style={{ fontFamily: "'Bebas Neue'", fontSize: 22, color: vis.color, letterSpacing: 2, lineHeight: 1 }}>{vis.label}</div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 40, color: vis.color, lineHeight: 1, opacity: 0.9 }}>{score}</div>
              <div style={{ fontSize: 9, letterSpacing: 1, color: "rgba(226,221,212,.25)" }}>/100</div>
            </div>
          </div>

          <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(201,168,76,.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 10, color: "rgba(226,221,212,.3)", letterSpacing: 1 }}>Analise o seu mercado</div>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 13, color: "rgba(201,168,76,.6)", letterSpacing: 2 }}>PEDROSUPERTI.COM.BR</div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: "16px 20px", background: "#080E17", borderTop: "1px solid rgba(201,168,76,.12)" }}>
          <div style={{ fontSize: 11, color: "rgba(226,221,212,.3)", marginBottom: 12, textAlign: "center" }}>📱 Tire um print do card acima para postar</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button className="copy-btn" style={{ fontSize: 12, padding: "11px 8px" }} onClick={onCopy}>
              {copied ? "✓ COPIADO!" : "COPIAR LEGENDA"}
            </button>
            <button className="close-btn" style={{ fontSize: 12 }} onClick={onClose}>Fechar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
