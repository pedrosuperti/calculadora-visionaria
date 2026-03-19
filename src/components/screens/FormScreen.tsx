"use client";

import { useState } from "react";
import type { FormData } from "@/lib/types";
import { GARGALO_OPTIONS, USO_IA_OPTIONS } from "@/lib/types";

interface Props {
  onSubmit: (data: FormData) => void;
}

export default function FormScreen({ onSubmit }: Props) {
  const [setor, setSetor] = useState("");
  const [faturamento, setFaturamento] = useState("");
  const [ticketMedio, setTicketMedio] = useState("");
  const [clientesAtivos, setClientesAtivos] = useState("");
  const [anosNegocio, setAnosNegocio] = useState("");
  const [maiorGargalo, setMaiorGargalo] = useState("");
  const [usoIA, setUsoIA] = useState("");
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  function parseCurrency(value: string): number {
    return Number(value.replace(/\D/g, "")) / 100;
  }

  function formatCurrency(value: string): string {
    const num = Number(value.replace(/\D/g, ""));
    if (!num) return "";
    return (num / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, boolean> = {};

    if (!setor.trim()) newErrors.setor = true;
    if (!faturamento || parseCurrency(faturamento) <= 0)
      newErrors.faturamento = true;
    if (!maiorGargalo) newErrors.maiorGargalo = true;
    if (!usoIA) newErrors.usoIA = true;

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    onSubmit({
      setor: setor.trim(),
      faturamento: parseCurrency(faturamento),
      ticketMedio: ticketMedio ? parseCurrency(ticketMedio) : null,
      clientesAtivos: clientesAtivos ? Number(clientesAtivos) : null,
      anosNegocio: anosNegocio ? Number(anosNegocio) : null,
      maiorGargalo,
      usoIA,
    });
  }

  return (
    <div className="screen form-screen fade-in">
      <div className="form-header">
        <h1 className="form-title">Calculadora Visionária</h1>
        <p className="form-subtitle">
          Descubra quanta riqueza está escondida no seu negócio.
          <br />
          Preencha os dados abaixo e veja o que a IA encontra.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="form-container">
        <div className="form-group-label">Sobre o seu negócio</div>

        <div className={`form-field ${errors.setor ? "field-error" : ""}`}>
          <label htmlFor="setor">Setor / tipo de negócio *</label>
          <input
            id="setor"
            type="text"
            value={setor}
            onChange={(e) => setSetor(e.target.value)}
            placeholder="Ex: Clínica de fisioterapia, e-commerce de suplementos..."
          />
        </div>

        <div className={`form-field ${errors.faturamento ? "field-error" : ""}`}>
          <label htmlFor="faturamento">Faturamento mensal *</label>
          <input
            id="faturamento"
            type="text"
            inputMode="numeric"
            value={faturamento ? formatCurrency(faturamento) : ""}
            onChange={(e) => setFaturamento(e.target.value.replace(/\D/g, ""))}
            placeholder="R$ 0,00"
          />
        </div>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="ticket">Ticket médio / cliente</label>
            <input
              id="ticket"
              type="text"
              inputMode="numeric"
              value={ticketMedio ? formatCurrency(ticketMedio) : ""}
              onChange={(e) => setTicketMedio(e.target.value.replace(/\D/g, ""))}
              placeholder="R$ 0,00"
            />
          </div>
          <div className="form-field">
            <label htmlFor="clientes">Clientes ativos</label>
            <input
              id="clientes"
              type="number"
              inputMode="numeric"
              value={clientesAtivos}
              onChange={(e) => setClientesAtivos(e.target.value)}
              placeholder="Ex: 150"
            />
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="anos">Anos no negócio</label>
          <input
            id="anos"
            type="number"
            inputMode="numeric"
            value={anosNegocio}
            onChange={(e) => setAnosNegocio(e.target.value)}
            placeholder="Ex: 5"
          />
        </div>

        <div className="form-group-label">Diagnóstico</div>

        <div className={`form-field ${errors.maiorGargalo ? "field-error" : ""}`}>
          <label htmlFor="gargalo">Maior gargalo hoje *</label>
          <select
            id="gargalo"
            value={maiorGargalo}
            onChange={(e) => setMaiorGargalo(e.target.value)}
          >
            <option value="">Selecione...</option>
            {GARGALO_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className={`form-field ${errors.usoIA ? "field-error" : ""}`}>
          <label htmlFor="ia">Uso atual de IA *</label>
          <select
            id="ia"
            value={usoIA}
            onChange={(e) => setUsoIA(e.target.value)}
          >
            <option value="">Selecione...</option>
            {USO_IA_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="btn-primary">
          Revelar minha oportunidade
        </button>
      </form>
    </div>
  );
}
