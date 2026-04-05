"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";

// ─── FORM FIELD DEFINITIONS ─────────────────────────────────────────────────

interface FormField {
  id: string;
  title: string;
  subtitle?: string;
  type: "text" | "email" | "tel" | "textarea" | "select" | "radio";
  required?: boolean;
  placeholder?: string;
  options?: string[];
  prefillFrom?: string; // key from lead data to pre-fill
}

const FIELDS: FormField[] = [
  { id: "nome", title: "Qual o seu nome completo?", type: "text", required: true, placeholder: "Seu nome completo", prefillFrom: "nome" },
  { id: "email", title: "Qual o seu principal e-mail?", type: "email", required: true, placeholder: "seu@email.com" },
  { id: "telefone", title: "Telefone que gostaria de ser contatado", subtitle: "Se possivel, que seja o mesmo do seu WhatsApp", type: "tel", required: true, placeholder: "+55 11 99999-9999", prefillFrom: "whatsapp" },
  { id: "empresa", title: "Qual o nome de sua empresa?", type: "text", required: true, placeholder: "Nome da empresa" },
  { id: "funcionarios", title: "Quantos funcionarios tem na empresa?", type: "radio", required: true, options: ["Somente eu", "2 a 5", "6 a 15", "16 a 50", "51 a 200", "Mais de 200"] },
  { id: "faturamento", title: "Qual e o faturamento mensal da sua empresa?", type: "radio", required: true, options: ["ate R$10 mil", "R$10 mil a R$50 mil", "R$50 mil a R$100 mil", "R$100 mil a R$500 mil", "R$500 mil a R$1 milhao", "R$1 milhao a R$5 milhoes", "Outros"] },
  { id: "site", title: "Seu site", subtitle: "Se tiver", type: "text", placeholder: "www.seusite.com.br" },
  { id: "instagram", title: "Instagram", subtitle: "Se tiver", type: "text", placeholder: "@seuinstagram" },
  { id: "ramo", title: "Qual o ramo de atuacao da sua empresa?", type: "textarea", required: true, placeholder: "Descreva seu ramo de atuacao..." },
  { id: "desafios", title: "Quais os problemas ou desafios que voce enfrenta atualmente?", type: "textarea", required: true, placeholder: "Conte sobre seus maiores desafios..." },
  { id: "urgencia", title: "Qual o seu nivel de urgencia para resolver isso atualmente?", type: "select", required: true, options: ["Baixo: Posso esperar alguns meses", "Medio: Quero logo", "Alto: Quero em semanas", "Urgente: Quero pra ontem"] },
  { id: "marketing", title: "Como voce faz o marketing da sua empresa?", subtitle: "Quanto investe nele? Quais canais ou meios utiliza?", type: "textarea", required: true, placeholder: "Conte sobre seu marketing atual..." },
  { id: "fatorx", title: "Qual voce diria ser seu Fator X?", subtitle: "O que diferencia voce dos seus concorrentes?", type: "textarea", required: true, placeholder: "O que te torna unico(a)..." },
  { id: "ia", title: "O quanto voce ja aplica Inteligencia Artificial no seu negocio ou carreira?", type: "textarea", required: true, placeholder: "Conte sua experiencia com IA..." },
  { id: "extra", title: "Ha algo importante que voce gostaria de falar que nao foi perguntado?", type: "textarea", placeholder: "Fique a vontade..." },
];

// ─── STARFIELD CANVAS ─────────────────────────────────────────────────────────

function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const stars: { x: number; y: number; r: number; a: number; da: number }[] = [];

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    // Create stars
    for (let i = 0; i < 150; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5 + 0.3,
        a: Math.random(),
        da: (Math.random() - 0.5) * 0.015,
      });
    }

    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      for (const s of stars) {
        s.a += s.da;
        if (s.a > 1) { s.a = 1; s.da = -Math.abs(s.da); }
        if (s.a < 0.1) { s.a = 0.1; s.da = Math.abs(s.da); }
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(255,255,255,${s.a})`;
        ctx!.fill();
      }
      animId = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="app-starfield" />;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function AplicacaoPage() {
  const params = useParams();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [leadName, setLeadName] = useState("");
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [step, setStep] = useState(-1); // -1 = intro, 0..N = fields, N+1 = submitting, N+2 = done
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const containerRef = useRef<HTMLDivElement>(null);

  // Map calculator values to form options
  const mapFaturamento = (v: string): string => {
    const lower = (v || "").toLowerCase();
    if (lower.includes("10 mil a") || lower.includes("10mil")) return "R$10 mil a R$50 mil";
    if (lower.includes("50 mil a") || lower.includes("50mil")) return "R$50 mil a R$100 mil";
    if (lower.includes("100 mil") && lower.includes("500")) return "R$100 mil a R$500 mil";
    if (lower.includes("500 mil") && lower.includes("milh")) return "R$500 mil a R$1 milhao";
    if (lower.includes("milh") && lower.includes("5")) return "R$1 milhao a R$5 milhoes";
    if (lower.includes("10 mil") || lower.includes("10mil") || lower.includes("ate")) return "ate R$10 mil";
    return "";
  };

  const mapEquipe = (v: string): string => {
    const lower = (v || "").toLowerCase();
    if (lower.includes("so eu") || lower.includes("só eu") || lower === "1") return "Somente eu";
    if (lower.includes("2") && lower.includes("5")) return "2 a 5";
    if (lower.includes("6") && lower.includes("15")) return "6 a 15";
    if (lower.includes("mais") || lower.includes("15") || lower.includes("50") || lower.includes("200")) return "16 a 50";
    return "";
  };

  // Load lead info + pre-fill from calculator data
  useEffect(() => {
    if (!token) return;
    fetch(`/api/aplicacao/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error("Link invalido");
        return r.json();
      })
      .then((data) => {
        setLeadName(data.nome || "");
        setAlreadySubmitted(data.already_submitted || false);
        // Pre-fill from calculator data
        const prefill: Record<string, string> = {};
        if (data.nome) prefill.nome = data.nome;
        if (data.whatsapp) prefill.telefone = data.whatsapp;
        if (data.faturamento) {
          const mapped = mapFaturamento(data.faturamento);
          if (mapped) prefill.faturamento = mapped;
        }
        if (data.equipe) {
          const mapped = mapEquipe(data.equipe);
          if (mapped) prefill.funcionarios = mapped;
        }
        if (data.mercado) prefill.ramo = data.mercado;
        if (data.dores && Array.isArray(data.dores) && data.dores.length > 0) {
          prefill.desafios = data.dores.join(", ");
        }
        setAnswers(prefill);
      })
      .catch(() => setError("Link invalido ou expirado."))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const totalSteps = FIELDS.length;
  const progress = step < 0 ? 0 : Math.min(((step + 1) / totalSteps) * 100, 100);

  const currentField = step >= 0 && step < FIELDS.length ? FIELDS[step] : null;

  const setAnswer = useCallback((value: string) => {
    if (!currentField) return;
    setAnswers((prev) => ({ ...prev, [currentField.id]: value }));
    setFieldError("");
  }, [currentField]);

  const canAdvance = useCallback(() => {
    if (!currentField) return true;
    if (!currentField.required) return true;
    const val = (answers[currentField.id] || "").trim();
    return val.length > 0;
  }, [currentField, answers]);

  const goNext = useCallback(() => {
    if (currentField && currentField.required && !(answers[currentField.id] || "").trim()) {
      setFieldError("Este campo e obrigatorio");
      return;
    }
    setFieldError("");
    setDirection("next");
    setStep((s) => s + 1);
    // Scroll to top on mobile
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentField, answers]);

  const goPrev = useCallback(() => {
    setFieldError("");
    setDirection("prev");
    setStep((s) => Math.max(-1, s - 1));
  }, []);

  // Auto-advance on radio selection
  const handleRadioSelect = useCallback((value: string) => {
    if (!currentField) return;
    setAnswers((prev) => ({ ...prev, [currentField.id]: value }));
    setFieldError("");
    // Small delay then advance
    setTimeout(() => {
      setDirection("next");
      setStep((s) => s + 1);
      containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }, 300);
  }, [currentField]);

  // Keyboard: Enter to advance
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        if (currentField?.type === "textarea") return; // allow newlines in textarea
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, currentField]);

  // Submit
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const formattedAnswers = FIELDS.map((f) => ({
        title: f.title,
        value: answers[f.id] || "",
      })).filter((a) => a.value.trim());

      const res = await fetch(`/api/aplicacao/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: formattedAnswers }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao enviar");
      }

      setSubmitted(true);
    } catch (e) {
      alert("Erro ao enviar: " + String(e));
    } finally {
      setSubmitting(false);
    }
  };

  // Auto-submit when reaching the end
  useEffect(() => {
    if (step === FIELDS.length && !submitted && !submitting) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ─── RENDER ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="app-wrap">
        <Starfield />
        <div className="app-center"><div className="app-spinner" /></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-wrap">
        <Starfield />
        <div className="app-center">
          <div className="app-card">
            <h1 className="app-title">Link Invalido</h1>
            <p className="app-text">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (alreadySubmitted && !submitted) {
    return (
      <div className="app-wrap">
        <Starfield />
        <div className="app-center">
          <div className="app-card">
            <h1 className="app-title">Formulario ja enviado</h1>
            <p className="app-text">Voce ja preencheu este formulario. Nossa equipe entrara em contato em breve.</p>
            <p className="app-text" style={{ marginTop: 16, color: "rgba(226,221,212,.5)" }}>Muito obrigado!<br />Equipe Pedro Superti</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── SUCCESS SCREEN ───
  if (submitted) {
    return (
      <div className="app-wrap">
        <Starfield />
        <div className="app-center">
          <div className="app-card app-fade-in">
            <div className="app-success-emoji">&#127881;</div>
            <h1 className="app-title">Uhuwwl! \o/</h1>
            <p className="app-text" style={{ fontSize: 18, fontWeight: 600 }}>Parabens, deu tudo certo com a sua aplicacao.</p>
            <div className="app-divider" />
            <h2 className="app-subtitle">O que fazer agora?</h2>
            <p className="app-text">Minha equipe ira checar todas as informacoes e em breve entraremos em contato com voce. Pode sair desse formulario sem problemas.</p>
            <div className="app-divider" />
            <p className="app-text" style={{ fontWeight: 700, fontSize: 18 }}>Muito obrigado!</p>
            <p className="app-text" style={{ color: "rgba(226,221,212,.5)" }}>Equipe Pedro Superti</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── INTRO SCREEN ───
  if (step === -1) {
    return (
      <div className="app-wrap" ref={containerRef}>
        <Starfield />
        <div className="app-progress-bar"><div className="app-progress-fill" style={{ width: "0%" }} /></div>
        <div className="app-center">
          <div className="app-card app-fade-in">
            <div className="app-hero-img">
              <div className="app-hero-text">QUE BOM PODER FALAR<br />COM VOCE{leadName ? `, ${leadName.split(" ")[0].toUpperCase()}` : ""}!</div>
            </div>

            <p className="app-text">
              Se voce esta vendo esta pagina, seu perfil foi <strong>pre-aprovado</strong> para uma sessao com um especialista da equipe Pedro Superti.
            </p>
            <p className="app-text">
              Criamos este formulario para que nossa equipe possa analisar como podemos ajudar voce a aplicar suas <strong>3 ideias milionarias</strong>.
            </p>
            <p className="app-text app-attention">
              <strong>ATENCAO: Somente ligaremos se voce responder todas as perguntas e finalizar o formulario corretamente.</strong>
            </p>
            <p className="app-text" style={{ color: "rgba(226,221,212,.45)", fontSize: 14 }}>
              Toda informacao colocada nesse formulario e tratada de maneira sigilosa e nunca sera compartilhada.
            </p>
            <p className="app-text" style={{ fontWeight: 600, marginTop: 8 }}>
              Responda com o maximo de detalhes que puder. Bora la?
            </p>

            <button className="app-btn-primary" onClick={goNext}>
              Comecar <span className="app-btn-arrow">&rsaquo;</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── FORM STEPS ───
  if (step >= 0 && step < FIELDS.length) {
    const field = FIELDS[step];
    const value = answers[field.id] || "";

    return (
      <div className="app-wrap" ref={containerRef}>
        <Starfield />
        <div className="app-progress-bar"><div className="app-progress-fill" style={{ width: `${progress}%` }} /></div>
        <div className="app-center">
          <div className={`app-card app-fade-${direction}`} key={step}>
            <div className="app-step-num">{step + 1}.</div>
            <h2 className="app-field-title">{field.title}{field.required ? <span className="app-required">*</span> : ""}</h2>
            {field.subtitle && <p className="app-field-sub">{field.subtitle}</p>}
            {value && ["nome", "telefone", "faturamento", "funcionarios", "ramo", "desafios"].includes(field.id) && (
              <div className="app-prefilled">Preenchido com seus dados da Calculadora — confira e corrija se necessario</div>
            )}

            {/* TEXT / EMAIL / TEL */}
            {(field.type === "text" || field.type === "email" || field.type === "tel") && (
              <input
                className="app-input"
                type={field.type}
                placeholder={field.placeholder}
                value={value}
                onChange={(e) => setAnswer(e.target.value)}
                autoFocus
              />
            )}

            {/* TEXTAREA */}
            {field.type === "textarea" && (
              <textarea
                className="app-textarea"
                placeholder={field.placeholder}
                value={value}
                onChange={(e) => setAnswer(e.target.value)}
                rows={4}
                autoFocus
              />
            )}

            {/* SELECT */}
            {field.type === "select" && (
              <select
                className="app-select"
                value={value}
                onChange={(e) => setAnswer(e.target.value)}
              >
                <option value="">Por favor selecione</option>
                {field.options?.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}

            {/* RADIO BUTTONS */}
            {field.type === "radio" && (
              <div className="app-radio-group">
                {field.options?.map((opt) => (
                  <button
                    key={opt}
                    className={`app-radio-btn${value === opt ? " selected" : ""}`}
                    onClick={() => handleRadioSelect(opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {fieldError && <div className="app-field-error">{fieldError}</div>}

            {/* NAV BUTTONS */}
            <div className="app-nav">
              <button className="app-btn-back" onClick={goPrev}>
                <span className="app-btn-arrow">&lsaquo;</span> Voltar
              </button>
              {field.type !== "radio" && (
                <button className="app-btn-primary" onClick={goNext} disabled={!canAdvance()}>
                  {step === FIELDS.length - 1 ? "Enviar" : "Proximo"} <span className="app-btn-arrow">&rsaquo;</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── SUBMITTING ───
  return (
    <div className="app-wrap">
      <Starfield />
      <div className="app-progress-bar"><div className="app-progress-fill" style={{ width: "100%" }} /></div>
      <div className="app-center">
        <div className="app-card app-fade-in">
          <div className="app-spinner" />
          <p className="app-text" style={{ marginTop: 20 }}>Enviando suas respostas...</p>
        </div>
      </div>
    </div>
  );
}
