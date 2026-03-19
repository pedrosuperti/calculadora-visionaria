"use client";

import { useState } from "react";

interface Props {
  calendlyUrl: string;
}

export default function CTAScreen({ calendlyUrl }: Props) {
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  function formatPhone(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, boolean> = {};

    if (!nome.trim()) newErrors.nome = true;
    const digits = whatsapp.replace(/\D/g, "");
    if (digits.length < 10) newErrors.whatsapp = true;

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitted(true);

    // TODO: Enviar para webhook (Make/Zapier) quando integração estiver pronta
    // fetch("/api/lead", { method: "POST", body: JSON.stringify({ nome, whatsapp: digits }) });

    setTimeout(() => {
      window.open(calendlyUrl, "_blank");
    }, 1500);
  }

  return (
    <div className="screen cta-screen fade-in">
      <div className="cta-badge-container">
        <div className="cta-badge pulse">
          <span className="cta-check">&#10003;</span>
          <span>Perfil analisado</span>
        </div>
      </div>

      <div className="cta-status fade-up">
        <h2 className="cta-elegivel">ELEGÍVEL</h2>
        <p className="cta-desc">
          Seu negócio tem potencial real para crescimento exponencial com IA.
          <br />
          Agende uma sessão gratuita com nosso especialista para montar
          seu plano de ação.
        </p>
      </div>

      {!submitted ? (
        <form onSubmit={handleSubmit} className="cta-form fade-up" style={{ animationDelay: "0.2s" }}>
          <div className={`form-field ${errors.nome ? "field-error" : ""}`}>
            <label htmlFor="nome">Seu nome</label>
            <input
              id="nome"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Como podemos te chamar?"
            />
          </div>

          <div className={`form-field ${errors.whatsapp ? "field-error" : ""}`}>
            <label htmlFor="whatsapp">Seu WhatsApp</label>
            <input
              id="whatsapp"
              type="tel"
              inputMode="numeric"
              value={whatsapp}
              onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
              placeholder="(00) 00000-0000"
            />
          </div>

          <button type="submit" className="btn-cta">
            Agendar minha sessão estratégica
          </button>

          <p className="cta-vagas">Vagas limitadas por semana</p>
        </form>
      ) : (
        <div className="cta-success fade-in">
          <div className="cta-success-icon">&#10003;</div>
          <h3>Excelente!</h3>
          <p>Redirecionando para o agendamento...</p>
        </div>
      )}
    </div>
  );
}
