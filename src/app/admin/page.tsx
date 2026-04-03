"use client";

import { useState, useEffect, useCallback } from "react";

interface Lead {
  id: number;
  created_at: string;
  nome: string;
  mercado: string;
  whatsapp: string;
  faturamento: string;
  equipe: string;
  urgencia: string;
  investimento: string;
  dores: string[];
  qualified: boolean;
  tier: string;
  internal_score: number;
  top_percent: number;
  formsapp_completed: boolean;
  formsapp_at: string | null;
}

const ADMIN_PASS = "visor2026";

export default function AdminDashboard() {
  const [authed, setAuthed] = useState(false);
  const [pass, setPass] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "hot" | "warm" | "cold">("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/leads");
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      }
    } catch (e) {
      console.error("Failed to fetch leads:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) fetchLeads();
  }, [authed, fetchLeads]);

  const filtered = filter === "all" ? leads : leads.filter((l) => l.tier === filter);

  const stats = {
    total: leads.length,
    hot: leads.filter((l) => l.tier === "hot").length,
    warm: leads.filter((l) => l.tier === "warm").length,
    cold: leads.filter((l) => l.tier === "cold").length,
    applied: leads.filter((l) => l.formsapp_completed).length,
  };

  if (!authed) {
    return (
      <div className="admin-login">
        <div className="admin-login-card">
          <h1>Central de Leads</h1>
          <p>Calculadora V.I.S.O.R.</p>
          <input
            type="password"
            placeholder="Senha"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && pass === ADMIN_PASS) setAuthed(true);
            }}
          />
          <button onClick={() => pass === ADMIN_PASS && setAuthed(true)}>
            Entrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-wrap">
      <div className="admin-header">
        <h1>Central de Leads — V.I.S.O.R.</h1>
        <button className="admin-refresh" onClick={fetchLeads} disabled={loading}>
          {loading ? "Atualizando..." : "Atualizar"}
        </button>
      </div>

      {/* Stats */}
      <div className="admin-stats">
        <div className="admin-stat">
          <div className="admin-stat-num">{stats.total}</div>
          <div className="admin-stat-label">Total</div>
        </div>
        <div className="admin-stat hot">
          <div className="admin-stat-num">{stats.hot}</div>
          <div className="admin-stat-label">Hot</div>
        </div>
        <div className="admin-stat warm">
          <div className="admin-stat-num">{stats.warm}</div>
          <div className="admin-stat-label">Warm</div>
        </div>
        <div className="admin-stat cold">
          <div className="admin-stat-num">{stats.cold}</div>
          <div className="admin-stat-label">Cold</div>
        </div>
        <div className="admin-stat applied">
          <div className="admin-stat-num">{stats.applied}</div>
          <div className="admin-stat-label">Aplicaram</div>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-filters">
        {(["all", "hot", "warm", "cold"] as const).map((f) => (
          <button
            key={f}
            className={`admin-filter-btn${filter === f ? " active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "Todos" : f.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Lead list */}
      <div className="admin-leads">
        {filtered.length === 0 && (
          <div className="admin-empty">
            {loading ? "Carregando..." : "Nenhum lead encontrado."}
          </div>
        )}
        {filtered.map((lead) => (
          <div
            key={lead.id}
            className={`admin-lead-card ${lead.tier || "warm"}`}
            onClick={() => setSelectedLead(lead)}
          >
            <div className="admin-lead-top">
              <div className="admin-lead-name">{lead.nome || "Sem nome"}</div>
              <div className={`admin-lead-tier ${lead.tier || "warm"}`}>
                {(lead.tier || "warm").toUpperCase()}
              </div>
            </div>
            <div className="admin-lead-meta">
              <span>{lead.mercado?.slice(0, 50) || "—"}</span>
              <span>{lead.faturamento || "—"}</span>
            </div>
            <div className="admin-lead-bottom">
              <span className="admin-lead-score">Score: {lead.internal_score || 0}</span>
              <span className="admin-lead-phone">{lead.whatsapp}</span>
              {lead.formsapp_completed && (
                <span className="admin-lead-badge">APLICOU</span>
              )}
              <span className="admin-lead-date">
                {lead.created_at ? new Date(lead.created_at).toLocaleDateString("pt-BR") : ""}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Detail modal */}
      {selectedLead && (
        <div className="admin-modal-overlay" onClick={() => setSelectedLead(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <button className="admin-modal-close" onClick={() => setSelectedLead(null)}>✕</button>
            <h2>{selectedLead.nome || "Lead sem nome"}</h2>
            <div className={`admin-lead-tier ${selectedLead.tier}`}>
              {(selectedLead.tier || "warm").toUpperCase()} — Score: {selectedLead.internal_score}
            </div>

            <div className="admin-detail-grid">
              <div className="admin-detail-item">
                <label>WhatsApp</label>
                <a href={`https://wa.me/${(selectedLead.whatsapp || "").replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                  {selectedLead.whatsapp}
                </a>
              </div>
              <div className="admin-detail-item">
                <label>Mercado</label>
                <span>{selectedLead.mercado || "—"}</span>
              </div>
              <div className="admin-detail-item">
                <label>Faturamento</label>
                <span>{selectedLead.faturamento || "—"}</span>
              </div>
              <div className="admin-detail-item">
                <label>Equipe</label>
                <span>{selectedLead.equipe || "—"}</span>
              </div>
              <div className="admin-detail-item">
                <label>Urgência</label>
                <span>{selectedLead.urgencia || "—"}</span>
              </div>
              <div className="admin-detail-item">
                <label>Investimento</label>
                <span>{selectedLead.investimento || "—"}</span>
              </div>
              <div className="admin-detail-item full">
                <label>Dores</label>
                <span>{selectedLead.dores?.join(", ") || "—"}</span>
              </div>
              <div className="admin-detail-item">
                <label>Aplicou consultoria?</label>
                <span>{selectedLead.formsapp_completed ? `Sim (${selectedLead.formsapp_at ? new Date(selectedLead.formsapp_at).toLocaleDateString("pt-BR") : ""})` : "Não"}</span>
              </div>
              <div className="admin-detail-item">
                <label>Data</label>
                <span>{selectedLead.created_at ? new Date(selectedLead.created_at).toLocaleString("pt-BR") : "—"}</span>
              </div>
            </div>

            <a
              href={`https://wa.me/${(selectedLead.whatsapp || "").replace(/\D/g, "")}?text=${encodeURIComponent(`Oi ${selectedLead.nome || ""}, tudo bem? Vi que você usou a Calculadora V.I.S.O.R. e seu perfil chamou atenção. Posso te fazer umas perguntas rápidas?`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="admin-whatsapp-btn"
            >
              Abrir WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
