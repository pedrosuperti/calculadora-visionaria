"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import type { Lead } from "@/lib/admin-types";
import { CONTACT_LABELS, CONTACT_COLORS, TIER_COLORS } from "@/lib/admin-types";
import { timeAgo, parseFormsAppData, computeTags } from "@/lib/admin-utils";

function TagBadges({ lead }: { lead: Lead }) {
  const tags = computeTags(lead);
  if (tags.length === 0) return null;
  return (
    <>
      {tags.map((t) => (
        <span key={t.label} className="adm-tag" style={{ background: t.color + "18", color: t.color, borderColor: t.color + "40" }}>
          {t.emoji} {t.label}
        </span>
      ))}
    </>
  );
}

export default function PublicFichaPage() {
  const params = useParams();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`/api/ficha/${token}`);
        if (res.ok) {
          const data: Lead = await res.json();
          const s = data.internal_score || 0;
          data.tier = s >= 70 ? "hot" : s >= 40 ? "warm" : "cold";
          setLead(data);
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="adm-ficha-loading">
        <div className="adm-insights-spinner" />
        <span>Carregando ficha...</span>
      </div>
    );
  }

  if (notFound || !lead) {
    return (
      <div className="adm-ficha-loading">
        <p>Ficha nao encontrada ou link invalido.</p>
      </div>
    );
  }

  const qa = lead.formsapp_data ? parseFormsAppData(lead.formsapp_data) : [];
  const tierColor = TIER_COLORS[(lead.tier || "cold") as keyof typeof TIER_COLORS];
  const statusLabel = CONTACT_LABELS[lead.contact_status || ""] || "Novo";
  const statusColor = CONTACT_COLORS[lead.contact_status || ""] || "#555";

  return (
    <div className="adm-ficha">
      {/* ─── TOP BAR ─── */}
      <div className="adm-ficha-topbar">
        <span className="adm-ficha-topbar-name">{lead.nome || "Lead"}</span>
        <a
          href={`https://wa.me/${(lead.whatsapp || "").replace(/\D/g, "")}`}
          target="_blank" rel="noopener noreferrer"
          className="adm-ficha-topbar-wa"
        >
          WhatsApp
        </a>
      </div>

      <div className="adm-ficha-content">
        {/* ─── HERO ─── */}
        <section className="adm-ficha-hero">
          <div className="adm-ficha-hero-left">
            <div className="adm-ficha-score" style={{ borderColor: tierColor }}>
              {lead.internal_score || 0}
            </div>
          </div>
          <div className="adm-ficha-hero-right">
            <h1 className="adm-ficha-name">{lead.nome || "Lead"}</h1>
            <div className="adm-ficha-badges">
              <span className={`adm-card-tier ${lead.tier}`}>{(lead.tier || "cold").toUpperCase()}</span>
              {lead.formsapp_completed && <span className="adm-card-applied">APLICOU</span>}
              <TagBadges lead={lead} />
            </div>
            <div className="adm-ficha-meta">
              <span>{lead.mercado || "—"}</span>
              <span>·</span>
              <span>{lead.created_at ? new Date(lead.created_at).toLocaleString("pt-BR") : ""}</span>
              <span>·</span>
              <span>{lead.created_at ? timeAgo(lead.created_at) + " atras" : ""}</span>
            </div>
          </div>
        </section>

        {/* Score bar */}
        <div className="adm-scorebar" style={{ marginBottom: 24 }}>
          <div className="adm-scorebar-fill" style={{ width: `${Math.min(lead.internal_score || 0, 100)}%`, background: tierColor }} />
          <div className="adm-scorebar-marks">
            <span style={{ left: "40%" }}>40</span>
            <span style={{ left: "70%" }}>70</span>
          </div>
        </div>

        {/* ─── TIMELINE ─── */}
        <section className="adm-ficha-section">
          <h2 className="adm-ficha-section-title">Jornada</h2>
          <div className="adm-ficha-timeline">
            <div className="adm-ficha-tl-step done">
              <div className="adm-ficha-tl-dot" />
              <div className="adm-ficha-tl-line" />
              <strong>Calculadora</strong>
              <span>{lead.created_at ? new Date(lead.created_at).toLocaleDateString("pt-BR") : "—"}</span>
            </div>
            <div className={`adm-ficha-tl-step${lead.formsapp_completed ? " done" : ""}`}>
              <div className="adm-ficha-tl-dot" />
              <div className="adm-ficha-tl-line" />
              <strong>Aplicacao</strong>
              <span>{lead.formsapp_completed ? (lead.formsapp_at ? new Date(lead.formsapp_at).toLocaleDateString("pt-BR") : "Sim") : "Pendente"}</span>
            </div>
            <div className={`adm-ficha-tl-step${lead.contact_status && lead.contact_status !== "novo" ? " done" : ""}`}>
              <div className="adm-ficha-tl-dot" />
              <div className="adm-ficha-tl-line" />
              <strong>Contato</strong>
              <span>{lead.contact_status && lead.contact_status !== "novo" ? CONTACT_LABELS[lead.contact_status] : "Pendente"}</span>
            </div>
            <div className={`adm-ficha-tl-step${lead.contact_status === "agendou" ? " done" : ""}`}>
              <div className="adm-ficha-tl-dot" />
              <strong>Agendamento</strong>
              <span>{lead.contact_status === "agendou" ? "Confirmado" : "Pendente"}</span>
            </div>
          </div>
        </section>

        {/* ─── STATUS BADGE ─── */}
        <section className="adm-ficha-section">
          <h2 className="adm-ficha-section-title">Status de Contato</h2>
          <span style={{ display: "inline-block", padding: "6px 16px", borderRadius: 6, fontSize: 14, fontWeight: 600, color: statusColor, border: `1px solid ${statusColor}40`, background: statusColor + "18" }}>
            {statusLabel}
          </span>
        </section>

        {/* ─── PROFILE GRID ─── */}
        <section className="adm-ficha-section">
          <h2 className="adm-ficha-section-title">Dados do Perfil</h2>
          <div className="adm-ficha-grid">
            <div className="adm-modal-field">
              <label>WhatsApp</label>
              <a href={`https://wa.me/${(lead.whatsapp || "").replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">{lead.whatsapp}</a>
            </div>
            <div className="adm-modal-field">
              <label>Mercado</label>
              <span>{lead.mercado || "—"}</span>
            </div>
            <div className="adm-modal-field">
              <label>Faturamento</label>
              <span>{lead.faturamento || "—"}</span>
            </div>
            <div className="adm-modal-field">
              <label>Equipe</label>
              <span>{lead.equipe || "—"}</span>
            </div>
            <div className="adm-modal-field">
              <label>Urgencia</label>
              <span>{lead.urgencia || "—"}</span>
            </div>
            <div className="adm-modal-field">
              <label>Investimento</label>
              <span>{lead.investimento || "—"}</span>
            </div>
          </div>
          {lead.dores && lead.dores.length > 0 && (
            <div className="adm-ficha-dores">
              <label>Dores</label>
              <div className="adm-ficha-dores-pills">
                {lead.dores.map((d, i) => <span key={i} className="adm-ficha-pill">{d}</span>)}
              </div>
            </div>
          )}
        </section>

        {/* ─── IDEIAS DE NEGOCIO ─── */}
        {lead.ideias && lead.ideias.length > 0 && (
          <section className="adm-ficha-section">
            <h2 className="adm-ficha-section-title">Ideias de Negocio (IA)</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {lead.ideias.map((ideia, i) => (
                <div key={i} style={{ padding: 16, background: "rgba(255,255,255,.03)", borderRadius: 8, border: "1px solid rgba(255,255,255,.06)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 18 }}>{["💡", "🚀", "🎯"][i]}</span>
                    <strong style={{ fontSize: 15, color: "#C9A84C" }}>{ideia.nome}</strong>
                    {ideia.usa_ia && <span style={{ fontSize: 10, padding: "2px 6px", background: "#A855F718", color: "#A855F7", borderRadius: 4, fontWeight: 700 }}>IA</span>}
                  </div>
                  <p style={{ fontSize: 13, color: "rgba(226,221,212,.7)", margin: "0 0 10px", lineHeight: 1.5 }}>{ideia.descricao}</p>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12 }}>
                    <span style={{ color: "#22C55E" }}>Potencial: <strong>R${(ideia.potencial_anual / 1000).toFixed(0)}K/ano</strong></span>
                    {ideia.projecao_12m && <span style={{ color: "rgba(226,221,212,.5)" }}>12m: R${(ideia.projecao_12m / 1000).toFixed(0)}K</span>}
                    {ideia.tempo_retorno_dias && <span style={{ color: "rgba(226,221,212,.5)" }}>ROI: {ideia.tempo_retorno_dias}d</span>}
                    {ideia.concorrencia && <span style={{ color: "rgba(226,221,212,.5)" }}>Conc: {ideia.concorrencia}</span>}
                    {ideia.dificuldade && <span style={{ color: "rgba(226,221,212,.5)" }}>Dif: {ideia.dificuldade}</span>}
                  </div>
                  {ideia.como_usa_ia && <p style={{ fontSize: 12, color: "rgba(226,221,212,.4)", marginTop: 8, fontStyle: "italic" }}>{ideia.como_usa_ia}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── NOTES (read-only) ─── */}
        {lead.notes && (
          <section className="adm-ficha-section">
            <h2 className="adm-ficha-section-title">Notas da Equipe</h2>
            <div style={{ padding: 16, background: "rgba(255,255,255,.03)", borderRadius: 6, fontSize: 14, color: "rgba(226,221,212,.7)", whiteSpace: "pre-wrap" }}>
              {lead.notes}
            </div>
          </section>
        )}

        {/* ─── FORMS.APP RESPONSES ─── */}
        {lead.formsapp_completed && qa.length > 0 && (
          <section className="adm-ficha-section">
            <h2 className="adm-ficha-section-title">Formulario de Aplicacao</h2>
            <div className="adm-forms-section" style={{ margin: 0 }}>
              <div className="adm-forms-header">
                <span className="adm-forms-icon">📋</span>
                <strong>Respostas</strong>
                <span className="adm-forms-date">{lead.formsapp_at ? new Date(lead.formsapp_at).toLocaleString("pt-BR") : ""}</span>
              </div>
              <div className="adm-forms-list" style={{ maxHeight: "none" }}>
                {qa.map((item, i) => (
                  <div key={i} className="adm-forms-item">
                    <div className="adm-forms-q">{item.question}</div>
                    <div className="adm-forms-a">{item.answer}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── WHATSAPP ACTION ─── */}
        <section className="adm-ficha-actions">
          <a
            href={`https://wa.me/${(lead.whatsapp || "").replace(/\D/g, "")}`}
            target="_blank" rel="noopener noreferrer"
            className="adm-btn-whatsapp"
          >
            Abrir WhatsApp
          </a>
        </section>
      </div>
    </div>
  );
}
