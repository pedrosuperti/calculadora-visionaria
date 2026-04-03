"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from "recharts";

// ─── TYPES ──────────────────────────────────────────────────────────────────

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
  contact_status: string;
  notes: string;
  formsapp_completed: boolean;
  formsapp_at: string | null;
}

type SortKey = "date" | "score" | "tier" | "name";
type ContactStatus = "" | "novo" | "contactado" | "agendou" | "sem_resposta" | "descartado";

const CONTACT_LABELS: Record<string, string> = {
  "": "Novo",
  novo: "Novo",
  contactado: "Contactado",
  agendou: "Agendou",
  sem_resposta: "Sem resposta",
  descartado: "Descartado",
};

const CONTACT_COLORS: Record<string, string> = {
  "": "#555",
  novo: "#555",
  contactado: "#C9A84C",
  agendou: "#22C55E",
  sem_resposta: "#F97316",
  descartado: "#EF4444",
};

const TIER_COLORS = { hot: "#22C55E", warm: "#C9A84C", cold: "#F97316" };
const PIE_COLORS = ["#22C55E", "#C9A84C", "#F97316"];

// ─── UTILS ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

function tierOrder(tier: string): number {
  if (tier === "hot") return 0;
  if (tier === "warm") return 1;
  return 2;
}

// ─── ADMIN PASSWORD ─────────────────────────────────────────────────────────

const ADMIN_PASS = "visor2026";

// ─── COMPONENT ──────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [authed, setAuthed] = useState(false);
  const [pass, setPass] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "hot" | "warm" | "cold">("all");
  const [sort, setSort] = useState<SortKey>("date");
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [tab, setTab] = useState<"leads" | "analytics">("leads");

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/leads");
      if (res.ok) setLeads(await res.json());
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) fetchLeads();
  }, [authed, fetchLeads]);

  // Auto-refresh every 60s
  useEffect(() => {
    if (!authed) return;
    const interval = setInterval(fetchLeads, 60000);
    return () => clearInterval(interval);
  }, [authed, fetchLeads]);

  // ─── DERIVED DATA ─────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = filter === "all" ? leads : leads.filter((l) => l.tier === filter);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          (l.nome || "").toLowerCase().includes(q) ||
          (l.mercado || "").toLowerCase().includes(q) ||
          (l.whatsapp || "").includes(q)
      );
    }

    list = [...list].sort((a, b) => {
      if (sort === "score") return (b.internal_score || 0) - (a.internal_score || 0);
      if (sort === "tier") return tierOrder(a.tier || "cold") - tierOrder(b.tier || "cold");
      if (sort === "name") return (a.nome || "").localeCompare(b.nome || "");
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return list;
  }, [leads, filter, search, sort]);

  const stats = useMemo(() => {
    const total = leads.length;
    const hot = leads.filter((l) => l.tier === "hot").length;
    const warm = leads.filter((l) => l.tier === "warm").length;
    const cold = leads.filter((l) => l.tier === "cold").length;
    const applied = leads.filter((l) => l.formsapp_completed).length;
    const contacted = leads.filter((l) => l.contact_status === "contactado" || l.contact_status === "agendou").length;
    const scheduled = leads.filter((l) => l.contact_status === "agendou").length;
    const avgScore = total > 0 ? Math.round(leads.reduce((s, l) => s + (l.internal_score || 0), 0) / total) : 0;
    const convRate = total > 0 ? Math.round((applied / total) * 100) : 0;
    return { total, hot, warm, cold, applied, contacted, scheduled, avgScore, convRate };
  }, [leads]);

  // Leads by day (last 14 days)
  const dailyChart = useMemo(() => {
    const days: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days[d.toISOString().slice(5, 10)] = 0;
    }
    leads.forEach((l) => {
      if (l.created_at) {
        const key = l.created_at.slice(5, 10);
        if (days[key] !== undefined) days[key]++;
      }
    });
    return Object.entries(days).map(([date, count]) => ({ date, leads: count }));
  }, [leads]);

  // Tier distribution for pie
  const tierPie = useMemo(() => [
    { name: "Hot", value: stats.hot },
    { name: "Warm", value: stats.warm },
    { name: "Cold", value: stats.cold },
  ], [stats]);

  // Top markets
  const topMarkets = useMemo(() => {
    const map: Record<string, number> = {};
    leads.forEach((l) => {
      const m = (l.mercado || "").slice(0, 40) || "N/A";
      map[m] = (map[m] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([market, count]) => ({ market, count }));
  }, [leads]);

  // Faturamento distribution
  const fatChart = useMemo(() => {
    const map: Record<string, number> = {};
    leads.forEach((l) => {
      const f = l.faturamento || "N/A";
      map[f] = (map[f] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([faixa, count]) => ({ faixa: faixa.replace("R$", "").slice(0, 18), count }));
  }, [leads]);

  // Contact status distribution
  const statusChart = useMemo(() => {
    const map: Record<string, number> = { novo: 0, contactado: 0, agendou: 0, sem_resposta: 0, descartado: 0 };
    leads.forEach((l) => {
      const s = l.contact_status || "novo";
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).map(([status, count]) => ({
      status: CONTACT_LABELS[status] || status,
      count,
      color: CONTACT_COLORS[status] || "#555",
    }));
  }, [leads]);

  // ─── ACTIONS ──────────────────────────────────────────────────────────────

  const updateLead = async (id: number, data: { contact_status?: string; notes?: string }) => {
    await fetch("/api/admin/leads/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...data } : l))
    );
    if (selectedLead?.id === id) {
      setSelectedLead((prev) => prev ? { ...prev, ...data } : prev);
    }
  };

  // ─── LOGIN ────────────────────────────────────────────────────────────────

  if (!authed) {
    return (
      <div className="adm-login">
        <div className="adm-login-card">
          <div className="adm-login-brand">V.I.S.O.R.</div>
          <h1>Central de Leads</h1>
          <input
            type="password"
            placeholder="Senha de acesso"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && pass === ADMIN_PASS) setAuthed(true); }}
          />
          <button onClick={() => pass === ADMIN_PASS && setAuthed(true)}>ENTRAR</button>
        </div>
      </div>
    );
  }

  // ─── DASHBOARD ────────────────────────────────────────────────────────────

  return (
    <div className="adm">
      {/* Header */}
      <header className="adm-header">
        <div className="adm-header-left">
          <div className="adm-logo">V.I.S.O.R.</div>
          <span className="adm-title">Central de Leads</span>
        </div>
        <div className="adm-header-right">
          <div className="adm-tabs">
            <button className={`adm-tab${tab === "leads" ? " active" : ""}`} onClick={() => setTab("leads")}>Leads</button>
            <button className={`adm-tab${tab === "analytics" ? " active" : ""}`} onClick={() => setTab("analytics")}>Analytics</button>
          </div>
          <a href="/api/admin/leads/export" className="adm-btn-sec" download>CSV</a>
          <button className="adm-btn-sec" onClick={fetchLeads} disabled={loading}>
            {loading ? "..." : "Atualizar"}
          </button>
        </div>
      </header>

      {/* KPI Row */}
      <div className="adm-kpis">
        <div className="adm-kpi">
          <div className="adm-kpi-num">{stats.total}</div>
          <div className="adm-kpi-label">Total Leads</div>
        </div>
        <div className="adm-kpi hot">
          <div className="adm-kpi-num">{stats.hot}</div>
          <div className="adm-kpi-label">Hot</div>
        </div>
        <div className="adm-kpi warm">
          <div className="adm-kpi-num">{stats.warm}</div>
          <div className="adm-kpi-label">Warm</div>
        </div>
        <div className="adm-kpi cold">
          <div className="adm-kpi-num">{stats.cold}</div>
          <div className="adm-kpi-label">Cold</div>
        </div>
        <div className="adm-kpi accent">
          <div className="adm-kpi-num">{stats.applied}</div>
          <div className="adm-kpi-label">Aplicaram</div>
        </div>
        <div className="adm-kpi accent2">
          <div className="adm-kpi-num">{stats.scheduled}</div>
          <div className="adm-kpi-label">Agendaram</div>
        </div>
        <div className="adm-kpi">
          <div className="adm-kpi-num">{stats.avgScore}</div>
          <div className="adm-kpi-label">Score Médio</div>
        </div>
        <div className="adm-kpi">
          <div className="adm-kpi-num">{stats.convRate}%</div>
          <div className="adm-kpi-label">Conv. Rate</div>
        </div>
      </div>

      {/* ═══ ANALYTICS TAB ═══ */}
      {tab === "analytics" && (
        <div className="adm-analytics">
          {/* Row 1: Line + Pie */}
          <div className="adm-chart-row">
            <div className="adm-chart-card wide">
              <div className="adm-chart-title">LEADS POR DIA (14 DIAS)</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={dailyChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
                  <XAxis dataKey="date" tick={{ fill: "rgba(226,221,212,.4)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "rgba(226,221,212,.4)", fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#0D1117", border: "1px solid rgba(201,168,76,.2)", color: "#E2DDD4" }} />
                  <Line type="monotone" dataKey="leads" stroke="#C9A84C" strokeWidth={2} dot={{ r: 3, fill: "#C9A84C" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="adm-chart-card">
              <div className="adm-chart-title">DISTRIBUIÇÃO POR TIER</div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={tierPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                    {tierPie.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0D1117", border: "1px solid rgba(201,168,76,.2)", color: "#E2DDD4" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 2: Faturamento + Status */}
          <div className="adm-chart-row">
            <div className="adm-chart-card">
              <div className="adm-chart-title">POR FATURAMENTO</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={fatChart} layout="vertical">
                  <XAxis type="number" tick={{ fill: "rgba(226,221,212,.4)", fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="faixa" tick={{ fill: "rgba(226,221,212,.4)", fontSize: 10 }} width={100} />
                  <Tooltip contentStyle={{ background: "#0D1117", border: "1px solid rgba(201,168,76,.2)", color: "#E2DDD4" }} />
                  <Bar dataKey="count" fill="#C9A84C" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="adm-chart-card">
              <div className="adm-chart-title">STATUS DE CONTATO</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={statusChart}>
                  <XAxis dataKey="status" tick={{ fill: "rgba(226,221,212,.4)", fontSize: 10 }} />
                  <YAxis tick={{ fill: "rgba(226,221,212,.4)", fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#0D1117", border: "1px solid rgba(201,168,76,.2)", color: "#E2DDD4" }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {statusChart.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 3: Top Markets */}
          <div className="adm-chart-card full">
            <div className="adm-chart-title">TOP MERCADOS</div>
            <div className="adm-markets">
              {topMarkets.map((m, i) => (
                <div key={i} className="adm-market-row">
                  <span className="adm-market-rank">#{i + 1}</span>
                  <span className="adm-market-name">{m.market}</span>
                  <div className="adm-market-bar">
                    <div className="adm-market-fill" style={{ width: `${(m.count / (topMarkets[0]?.count || 1)) * 100}%` }} />
                  </div>
                  <span className="adm-market-count">{m.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ LEADS TAB ═══ */}
      {tab === "leads" && (
        <>
          {/* Toolbar: search + sort + filters */}
          <div className="adm-toolbar">
            <input
              className="adm-search"
              type="text"
              placeholder="Buscar por nome, mercado ou WhatsApp..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="adm-toolbar-right">
              <select className="adm-sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                <option value="date">Mais recentes</option>
                <option value="score">Maior score</option>
                <option value="tier">Por tier</option>
                <option value="name">A-Z</option>
              </select>
              <div className="adm-filters">
                {(["all", "hot", "warm", "cold"] as const).map((f) => (
                  <button key={f} className={`adm-filter${filter === f ? " active" : ""}`} onClick={() => setFilter(f)}>
                    {f === "all" ? "Todos" : f.toUpperCase()} {f !== "all" && <span className="adm-filter-count">{f === "hot" ? stats.hot : f === "warm" ? stats.warm : stats.cold}</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Lead list */}
          <div className="adm-list">
            {filtered.length === 0 && (
              <div className="adm-empty">{loading ? "Carregando..." : "Nenhum lead encontrado."}</div>
            )}
            {filtered.map((lead) => (
              <div key={lead.id} className={`adm-card ${lead.tier || "warm"}`} onClick={() => setSelectedLead(lead)}>
                <div className="adm-card-left">
                  <div className="adm-card-score" style={{ borderColor: TIER_COLORS[(lead.tier || "warm") as keyof typeof TIER_COLORS] }}>
                    {lead.internal_score || 0}
                  </div>
                </div>
                <div className="adm-card-center">
                  <div className="adm-card-top">
                    <span className="adm-card-name">{lead.nome || "Sem nome"}</span>
                    <span className={`adm-card-tier ${lead.tier || "warm"}`}>{(lead.tier || "warm").toUpperCase()}</span>
                    {lead.formsapp_completed && <span className="adm-card-applied">APLICOU</span>}
                    {lead.contact_status && lead.contact_status !== "novo" && (
                      <span className="adm-card-status" style={{ color: CONTACT_COLORS[lead.contact_status] }}>
                        {CONTACT_LABELS[lead.contact_status]}
                      </span>
                    )}
                  </div>
                  <div className="adm-card-meta">
                    <span>{(lead.mercado || "—").slice(0, 45)}</span>
                    <span>{lead.faturamento || ""}</span>
                    <span>{lead.whatsapp}</span>
                  </div>
                </div>
                <div className="adm-card-right">
                  <span className="adm-card-time">{lead.created_at ? timeAgo(lead.created_at) : ""}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ═══ DETAIL MODAL ═══ */}
      {selectedLead && (
        <div className="adm-overlay" onClick={() => setSelectedLead(null)}>
          <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
            <button className="adm-modal-x" onClick={() => setSelectedLead(null)}>✕</button>

            {/* Header */}
            <div className="adm-modal-header">
              <div className="adm-modal-score" style={{ borderColor: TIER_COLORS[(selectedLead.tier || "warm") as keyof typeof TIER_COLORS] }}>
                {selectedLead.internal_score || 0}
              </div>
              <div>
                <h2>{selectedLead.nome || "Lead"}</h2>
                <div className="adm-modal-badges">
                  <span className={`adm-card-tier ${selectedLead.tier}`}>{(selectedLead.tier || "warm").toUpperCase()}</span>
                  {selectedLead.formsapp_completed && <span className="adm-card-applied">APLICOU</span>}
                  <span className="adm-modal-time">{selectedLead.created_at ? timeAgo(selectedLead.created_at) : ""} atrás</span>
                </div>
              </div>
            </div>

            {/* Details grid */}
            <div className="adm-modal-grid">
              <div className="adm-modal-field">
                <label>WhatsApp</label>
                <a href={`https://wa.me/${(selectedLead.whatsapp || "").replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                  {selectedLead.whatsapp}
                </a>
              </div>
              <div className="adm-modal-field">
                <label>Mercado</label>
                <span>{selectedLead.mercado || "—"}</span>
              </div>
              <div className="adm-modal-field">
                <label>Faturamento</label>
                <span>{selectedLead.faturamento || "—"}</span>
              </div>
              <div className="adm-modal-field">
                <label>Equipe</label>
                <span>{selectedLead.equipe || "—"}</span>
              </div>
              <div className="adm-modal-field">
                <label>Urgência</label>
                <span>{selectedLead.urgencia || "—"}</span>
              </div>
              <div className="adm-modal-field">
                <label>Investimento</label>
                <span>{selectedLead.investimento || "—"}</span>
              </div>
              <div className="adm-modal-field full">
                <label>Dores</label>
                <span>{selectedLead.dores?.join(", ") || "—"}</span>
              </div>
            </div>

            {/* Status de contato */}
            <div className="adm-modal-section">
              <label>Status de Contato</label>
              <div className="adm-status-btns">
                {(["novo", "contactado", "agendou", "sem_resposta", "descartado"] as ContactStatus[]).map((s) => (
                  <button
                    key={s}
                    className={`adm-status-btn${(selectedLead.contact_status || "novo") === s ? " active" : ""}`}
                    style={{ borderColor: CONTACT_COLORS[s], color: (selectedLead.contact_status || "novo") === s ? "#fff" : CONTACT_COLORS[s], background: (selectedLead.contact_status || "novo") === s ? CONTACT_COLORS[s] + "33" : "transparent" }}
                    onClick={() => updateLead(selectedLead.id, { contact_status: s })}
                  >
                    {CONTACT_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* Notas */}
            <div className="adm-modal-section">
              <label>Notas da equipe</label>
              <textarea
                className="adm-notes"
                rows={3}
                placeholder="Ex: Vai agendar semana que vem..."
                value={selectedLead.notes || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedLead((prev) => prev ? { ...prev, notes: val } : prev);
                  setLeads((prev) => prev.map((l) => l.id === selectedLead.id ? { ...l, notes: val } : l));
                }}
                onBlur={() => updateLead(selectedLead.id, { notes: selectedLead.notes || "" })}
              />
            </div>

            {/* Actions */}
            <div className="adm-modal-actions">
              <a
                href={`https://wa.me/${(selectedLead.whatsapp || "").replace(/\D/g, "")}?text=${encodeURIComponent(`Oi ${selectedLead.nome || ""}, tudo bem? Me chamo Alê. Sou da equipe do Pedro Superti. Vi que você usou a Calculadora V.I.S.O.R. e seu perfil chamou atenção. Posso te fazer umas perguntas rápidas?`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="adm-btn-whatsapp"
              >
                Abrir WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
