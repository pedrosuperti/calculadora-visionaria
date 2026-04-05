"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import type { Lead } from "@/lib/admin-types";
import { CONTACT_LABELS, CONTACT_COLORS, TIER_COLORS } from "@/lib/admin-types";
import type { ContactStatus } from "@/lib/admin-types";
import { timeAgo, parseFormsAppData, computeTags } from "@/lib/admin-utils";

// ─── AUTH HELPERS ────────────────────────────────────────────────────────────
function getAuthToken(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("adm_token") || "";
}
function authHeaders(extra?: Record<string, string>): Record<string, string> {
  return { "Authorization": `Bearer ${getAuthToken()}`, ...extra };
}
function authJsonHeaders(): Record<string, string> {
  return authHeaders({ "Content-Type": "application/json" });
}

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

export default function LeadFichaPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [authed, setAuthed] = useState(() => {
    if (typeof window !== "undefined") return !!sessionStorage.getItem("adm_token");
    return false;
  });
  const [pw, setPw] = useState("");
  const [loginError, setLoginError] = useState("");
  const [insights, setInsights] = useState<Record<string, unknown> | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const fetchLead = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/leads/${id}`, { headers: authHeaders() });
      if (res.status === 401) {
        sessionStorage.removeItem("adm_token");
        setAuthed(false);
        return;
      }
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (res.ok) {
        const data: Lead = await res.json();
        const s = data.internal_score || 0;
        data.tier = s >= 70 ? "hot" : s >= 40 ? "warm" : "cold";
        setLead(data);
        setNotFound(false);
      } else {
        setNotFound(true);
      }
    } catch (e) {
      console.error("Fetch lead error:", e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (authed) fetchLead();
  }, [authed, fetchLead]);

  const updateLead = async (data: { contact_status?: string; notes?: string }) => {
    if (!lead) return;
    await fetch("/api/admin/leads/update", {
      method: "POST",
      headers: authJsonHeaders(),
      body: JSON.stringify({ id: lead.id, ...data }),
    });
  };

  const fetchInsights = async () => {
    if (!lead) return;
    setInsightsLoading(true);
    setInsights(null);
    try {
      const res = await fetch("/api/admin/insights", {
        method: "POST",
        headers: authJsonHeaders(),
        body: JSON.stringify({
          nome: lead.nome, mercado: lead.mercado, faturamento: lead.faturamento,
          equipe: lead.equipe, urgencia: lead.urgencia, investimento: lead.investimento,
          dores: lead.dores, tier: lead.tier, internal_score: lead.internal_score,
          formsapp_data: lead.formsapp_data,
        }),
      });
      if (res.ok) setInsights(await res.json());
    } catch (e) {
      console.error("Insights error:", e);
    } finally {
      setInsightsLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoginError("");
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (res.ok) {
        const { token } = await res.json();
        sessionStorage.setItem("adm_token", token);
        setAuthed(true);
      } else {
        setLoginError("Senha incorreta");
      }
    } catch {
      setLoginError("Erro de conexão");
    }
  };

  if (!authed) {
    return (
      <div className="adm-login">
        <div className="adm-login-box">
          <h1 className="adm-login-title">CENTRAL DE LEADS</h1>
          <input className="adm-login-input" type="password" placeholder="Senha" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
          <button className="adm-login-btn" onClick={handleLogin}>Entrar</button>
          {loginError && <p style={{ color: "#EF4444", fontSize: 13, marginTop: 8 }}>{loginError}</p>}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="adm-ficha-loading">
        <div className="adm-insights-spinner" />
        <span>Carregando ficha...</span>
      </div>
    );
  }

  if (!lead && !loading) {
    return (
      <div className="adm-ficha-loading">
        <p>Lead não encontrado{notFound ? ` (ID: ${id})` : ""}.</p>
        <a href="/admin" className="adm-ficha-back-link">← Voltar para leads</a>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="adm-ficha-loading">
        <div className="adm-insights-spinner" />
        <span>Carregando ficha...</span>
      </div>
    );
  }

  const qa = lead.formsapp_data ? parseFormsAppData(lead.formsapp_data) : [];
  const tierColor = TIER_COLORS[(lead.tier || "cold") as keyof typeof TIER_COLORS];

  const whatsappMsg = insights?.frase_gancho
    ? `Oi ${lead.nome || ""}, tudo bem? Me chamo Alê, da equipe do Pedro Superti. ${insights.frase_gancho}`
    : `Oi ${lead.nome || ""}, tudo bem? Me chamo Alê. Sou da equipe do Pedro Superti. Vi que você usou a Calculadora V.I.S.O.R. e seu perfil chamou atenção. Posso te fazer umas perguntas rápidas?`;

  return (
    <div className="adm-ficha">
      {/* ─── STICKY TOP BAR ─── */}
      <div className="adm-ficha-topbar">
        <a href="/admin" className="adm-ficha-back">← Leads</a>
        <span className="adm-ficha-topbar-name">{lead.nome || "Lead"}</span>
        <a
          href={`https://wa.me/${(lead.whatsapp || "").replace(/\D/g, "")}?text=${encodeURIComponent(whatsappMsg)}`}
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
              <span>{lead.created_at ? timeAgo(lead.created_at) + " atrás" : ""}</span>
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
            <div className={`adm-ficha-tl-step done`}>
              <div className="adm-ficha-tl-dot" />
              <div className="adm-ficha-tl-line" />
              <strong>Calculadora</strong>
              <span>{lead.created_at ? new Date(lead.created_at).toLocaleDateString("pt-BR") : "—"}</span>
            </div>
            <div className={`adm-ficha-tl-step${lead.formsapp_completed ? " done" : ""}`}>
              <div className="adm-ficha-tl-dot" />
              <div className="adm-ficha-tl-line" />
              <strong>Aplicação</strong>
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
              <label>Urgência</label>
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

        {/* ─── STATUS + NOTES ─── */}
        <section className="adm-ficha-section">
          <h2 className="adm-ficha-section-title">Status de Contato</h2>
          <div className="adm-status-btns">
            {(["novo", "contactado", "agendou", "sem_resposta", "descartado"] as ContactStatus[]).map((s) => (
              <button
                key={s}
                className={`adm-status-btn${(lead.contact_status || "novo") === s ? " active" : ""}`}
                style={{ borderColor: CONTACT_COLORS[s], color: (lead.contact_status || "novo") === s ? "#fff" : CONTACT_COLORS[s], background: (lead.contact_status || "novo") === s ? CONTACT_COLORS[s] + "33" : "transparent" }}
                onClick={() => {
                  setLead((prev) => prev ? { ...prev, contact_status: s } : prev);
                  updateLead({ contact_status: s });
                }}
              >
                {CONTACT_LABELS[s]}
              </button>
            ))}
          </div>
        </section>

        <section className="adm-ficha-section">
          <h2 className="adm-ficha-section-title">Notas da Equipe</h2>
          <textarea
            className="adm-notes"
            rows={5}
            placeholder="Ex: Vai agendar semana que vem..."
            value={lead.notes || ""}
            onChange={(e) => setLead((prev) => prev ? { ...prev, notes: e.target.value } : prev)}
            onBlur={() => updateLead({ notes: lead.notes || "" })}
          />
        </section>

        {/* ─── FORMS.APP RESPONSES ─── */}
        <section className="adm-ficha-section">
          <h2 className="adm-ficha-section-title">Formulário de Aplicação</h2>
          {!lead.formsapp_completed ? (
            <div className="adm-forms-empty">
              <span className="adm-forms-empty-icon">📋</span>
              <p>Este lead ainda não preencheu o formulário de aplicação.</p>
            </div>
          ) : qa.length > 0 ? (
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
          ) : (
            <p style={{ color: "rgba(226,221,212,.4)", fontSize: 14 }}>Aplicou mas sem dados de respostas salvos.</p>
          )}
        </section>

        {/* ─── AI INSIGHTS ─── */}
        <section className="adm-ficha-section">
          <h2 className="adm-ficha-section-title">Insights com IA</h2>
          <div className="adm-insights-section" style={{ margin: 0 }}>
            {!insights && !insightsLoading && (
              <button className="adm-btn-insights" onClick={fetchInsights}>
                🧠 Gerar Insights com IA
              </button>
            )}
            {insightsLoading && (
              <div className="adm-insights-loading">
                <div className="adm-insights-spinner" />
                <span>Analisando perfil com IA...</span>
              </div>
            )}
            {insights && (
              <div className="adm-insights-content">
                <div className="adm-insights-header">
                  <span>🧠</span>
                  <strong>Insights IA</strong>
                  <span className={`adm-insights-prob ${String(insights.probabilidade_fechamento || "").toLowerCase()}`}>
                    {String(insights.probabilidade_fechamento || "")} chance
                  </span>
                  <span className="adm-insights-prod">{String(insights.produto_ideal || "")}</span>
                </div>
                <div className="adm-insights-grid">
                  <div className="adm-insights-card">
                    <div className="adm-insights-card-label">🔥 Maior Dor</div>
                    <div className="adm-insights-card-text">{String(insights.maior_dor || "")}</div>
                  </div>
                  <div className="adm-insights-card">
                    <div className="adm-insights-card-label">💪 Ponto Forte</div>
                    <div className="adm-insights-card-text">{String(insights.ponto_forte || "")}</div>
                  </div>
                  <div className="adm-insights-card">
                    <div className="adm-insights-card-label">⚠️ Ponto Fraco</div>
                    <div className="adm-insights-card-text">{String(insights.ponto_fraco || "")}</div>
                  </div>
                  <div className="adm-insights-card full">
                    <div className="adm-insights-card-label">🎯 Conexão com Ignition</div>
                    <div className="adm-insights-card-text">{String(insights.conexao_ignition || "")}</div>
                  </div>
                </div>
                <div className="adm-insights-approaches">
                  <div className="adm-insights-card-label">💬 Sugestões de Abordagem</div>
                  {Array.isArray(insights.abordagens) && insights.abordagens.map((a: string, i: number) => (
                    <div key={i} className="adm-insights-approach">
                      <span className="adm-insights-approach-num">{i + 1}</span>
                      <span>{a}</span>
                    </div>
                  ))}
                </div>
                <div className="adm-insights-gancho">
                  <div className="adm-insights-card-label">🎣 Frase Gancho</div>
                  <div className="adm-insights-gancho-text">&ldquo;{String(insights.frase_gancho || "")}&rdquo;</div>
                </div>
                {insights.alertas && String(insights.alertas).trim() !== "" ? (
                  <div className="adm-insights-alert">
                    <span>🚨</span> {String(insights.alertas)}
                  </div>
                ) : null}
                <button className="adm-btn-insights regen" onClick={fetchInsights}>
                  🔄 Regenerar Insights
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ─── ACTIONS ─── */}
        <section className="adm-ficha-actions">
          <a
            href={`https://wa.me/${(lead.whatsapp || "").replace(/\D/g, "")}?text=${encodeURIComponent(whatsappMsg)}`}
            target="_blank" rel="noopener noreferrer"
            className="adm-btn-whatsapp"
          >
            Abrir WhatsApp {insights ? "(com frase gancho)" : ""}
          </a>
          <button
            className="adm-ficha-copy"
            onClick={() => { navigator.clipboard.writeText(window.location.href); }}
          >
            📋 Copiar link da ficha
          </button>
        </section>
      </div>
    </div>
  );
}
