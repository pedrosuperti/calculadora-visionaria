"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, FunnelChart, Funnel, LabelList,
} from "recharts";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";

const WORLD_GEO = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const BROWSER_ICONS: Record<string, string> = {
  chrome: "🌀", safari: "🧭", firefox: "🦊", edge: "🔷", opera: "🔴",
  samsung: "📱", brave: "🦁", vivaldi: "🎵", uc: "🟣", unknown: "❓",
};
const OS_ICONS: Record<string, string> = {
  windows: "🪟", macos: "🍎", ios: "📱", android: "🤖", linux: "🐧",
  chromeos: "💻", unknown: "❓",
};
const LANG_FLAGS: Record<string, string> = {
  "pt-BR": "🇧🇷", "pt": "🇵🇹", "en-US": "🇺🇸", "en-GB": "🇬🇧", "en": "🇬🇧",
  "es": "🇪🇸", "es-ES": "🇪🇸", "es-AR": "🇦🇷", "es-MX": "🇲🇽", "fr": "🇫🇷",
  "de": "🇩🇪", "it": "🇮🇹", "ja": "🇯🇵", "zh": "🇨🇳", "ko": "🇰🇷", "ru": "🇷🇺",
  "ar": "🇸🇦", "hi": "🇮🇳", "nl": "🇳🇱", "pl": "🇵🇱", "unknown": "🌐",
};
const COUNTRY_FLAGS: Record<string, string> = {
  BR: "🇧🇷", US: "🇺🇸", PT: "🇵🇹", GB: "🇬🇧", AR: "🇦🇷", MX: "🇲🇽",
  CO: "🇨🇴", CL: "🇨🇱", DE: "🇩🇪", FR: "🇫🇷", ES: "🇪🇸", IT: "🇮🇹",
  JP: "🇯🇵", CA: "🇨🇦", AU: "🇦🇺", IN: "🇮🇳", UY: "🇺🇾", PE: "🇵🇪",
  PY: "🇵🇾", EC: "🇪🇨", BO: "🇧🇴", VE: "🇻🇪", AO: "🇦🇴", MZ: "🇲🇿",
};
const COUNTRY_NAMES: Record<string, string> = {
  BR: "Brasil", US: "EUA", PT: "Portugal", GB: "Reino Unido", AR: "Argentina",
  MX: "México", CO: "Colômbia", CL: "Chile", DE: "Alemanha", FR: "França",
  ES: "Espanha", IT: "Itália", JP: "Japão", CA: "Canadá", AU: "Austrália",
  IN: "Índia", UY: "Uruguai", PE: "Peru", PY: "Paraguai", EC: "Equador",
  BO: "Bolívia", VE: "Venezuela", AO: "Angola", MZ: "Moçambique",
};
// ISO_A2 → UN M49 numeric ID (used by world-atlas TopoJSON)
const ISO2_TO_NUM: Record<string, string> = {
  BR: "076", US: "840", PT: "620", GB: "826", AR: "032", MX: "484",
  CO: "170", CL: "152", DE: "276", FR: "250", ES: "724", IT: "380",
  JP: "392", CA: "124", AU: "036", IN: "356", UY: "858", PE: "604",
  PY: "600", EC: "218", BO: "068", VE: "862", AO: "024", MZ: "508",
  NL: "528", PL: "616", RU: "643", CN: "156", KR: "410", SA: "682",
  ZA: "710", NG: "566", EG: "818", IL: "376", AE: "784", SG: "702",
  NZ: "554", IE: "372", SE: "752", NO: "578", DK: "208", FI: "246",
  BE: "056", AT: "040", CH: "756", CZ: "203", HU: "348", RO: "642",
};

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
  formsapp_data: Record<string, unknown> | null;
  share_token: string | null;
}

interface CalcEvent {
  id: number;
  session_id: string;
  event: string;
  step: string;
  device: string;
  browser: string;
  os: string;
  language: string;
  referrer: string;
  screen_width: number;
  country: string;
  region: string;
  city: string;
  created_at: string;
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

const TIER_COLORS = { hot: "#F97316", warm: "#EAB308", cold: "#3B82F6" };
const PIE_COLORS = ["#F97316", "#EAB308", "#3B82F6"];

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

function parseFormsAppData(data: Record<string, unknown> | null): { question: string; answer: string }[] {
  if (!data) return [];
  const results: { question: string; answer: string }[] = [];
  // Forms.app sends answers/questions in various structures
  const answers = (data.answers || data.fields || data.responses || []) as unknown[];
  if (Array.isArray(answers)) {
    for (const a of answers) {
      if (a && typeof a === "object") {
        const obj = a as Record<string, unknown>;
        const q = String(obj.title ?? obj.question ?? obj.label ?? obj.field ?? "");
        let v = obj.value ?? obj.answer ?? obj.response ?? "";
        if (Array.isArray(v)) v = v.join(", ");
        if (typeof v === "object" && v !== null) v = JSON.stringify(v);
        const ans = String(v).trim();
        if (q && ans) results.push({ question: q, answer: ans });
      }
    }
  }
  // Fallback: if no structured answers found, show raw key-value pairs
  if (results.length === 0) {
    const skip = new Set(["answers", "fields", "responses", "submissionId", "formId", "createdAt", "updatedAt"]);
    for (const [k, v] of Object.entries(data)) {
      if (skip.has(k) || v === null || v === undefined || v === "") continue;
      const val = typeof v === "object" ? JSON.stringify(v) : String(v);
      results.push({ question: k, answer: val });
    }
  }
  return results;
}

function tierOrder(tier: string): number {
  if (tier === "hot") return 0;
  if (tier === "warm") return 1;
  return 2;
}

// ─── SMART TAGS ──────────────────────────────────────────────────────────

interface SmartTag { label: string; emoji: string; color: string }

function computeTags(lead: Lead): SmartTag[] {
  try { return _computeTags(lead); } catch (e) { console.error("computeTags error:", e, lead.id); return []; }
}
function _computeTags(lead: Lead): SmartTag[] {
  const tags: SmartTag[] = [];
  const urg = (lead.urgencia || "").toLowerCase();
  if (urg.includes("urgente") || urg.includes("ontem") || urg.includes("alto") || urg.includes("semana")) {
    tags.push({ label: "URGENTE", emoji: "🔥", color: "#EF4444" });
  }
  // Poder de compra: faturamento >= 100k
  const fat = (lead.faturamento || "").toLowerCase();
  if (fat.includes("100 mil") || fat.includes("500 mil") || fat.includes("milhão") || fat.includes("milhao")) {
    tags.push({ label: "PODER DE COMPRA", emoji: "💰", color: "#22C55E" });
  }
  // Motivado: many pain points or detailed challenges
  const formsAnswers = lead.formsapp_data ? parseFormsAppData(lead.formsapp_data) : [];
  const desafiosText = formsAnswers.find((a) => (a.question || "").toLowerCase().includes("desafio"))?.answer || "";
  if ((lead.dores?.length || 0) >= 3 || desafiosText.length > 100) {
    tags.push({ label: "MOTIVADO", emoji: "💪", color: "#F97316" });
  }
  // Usa IA
  const iaText = formsAnswers.find((a) => (a.question || "").toLowerCase().includes("ia"))?.answer?.toLowerCase() || "";
  const iaInactive = ["nada", "zero", "pouco", "muito pouco", "nada praticamente", "não", "nao", "1", "5%"];
  if (iaText && !iaInactive.some((w) => iaText === w || iaText.startsWith(w + "."))) {
    tags.push({ label: "USA IA", emoji: "🤖", color: "#A855F7" });
  }
  // Equipe
  const eq = (lead.equipe || "").toLowerCase();
  if (eq.includes("5 a 10") || eq.includes("10 a 20") || eq.includes("20 a 50") || eq.includes("50")) {
    tags.push({ label: "TEM EQUIPE", emoji: "👥", color: "#3B82F6" });
  } else if (eq.includes("0 a 5")) {
    tags.push({ label: "SOLO", emoji: "🧍", color: "#6B7280" });
  }
  // Sem marketing
  const mktText = formsAnswers.find((a) => (a.question || "").toLowerCase().includes("marketing"))?.answer?.toLowerCase() || "";
  if (mktText && (mktText.includes("nada") || mktText.includes("zero") || mktText.includes("quase não") || mktText.includes("não faço"))) {
    tags.push({ label: "SEM MKT", emoji: "📢", color: "#EAB308" });
  }
  // Top 10%
  if (lead.top_percent > 0 && lead.top_percent <= 10) {
    tags.push({ label: "TOP 10%", emoji: "⭐", color: "#C9A84C" });
  }
  return tags;
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

// ─── INFO TOOLTIP COMPONENT ─────────────────────────────────────────────

function InfoTip({ text }: { text: string }) {
  return (
    <span className="adm-info-tip">
      i
      <span className="adm-info-balloon">{text}</span>
    </span>
  );
}

// ─── AUTH HELPERS ───────────────────────────────────────────────────────────

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

// ─── COMPONENT ──────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [authed, setAuthed] = useState(() => {
    if (typeof window !== "undefined") return !!sessionStorage.getItem("adm_token");
    return false;
  });
  const [pass, setPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "hot" | "warm" | "cold">("all");
  const [sort, setSort] = useState<SortKey>("date");
  const [search, setSearch] = useState("");
  const [insights, setInsights] = useState<Record<string, unknown> | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const fetchInsights = async (lead: Lead) => {
    setInsightsLoading(true);
    setInsights(null);
    try {
      const res = await fetch("/api/admin/insights", {
        method: "POST",
        headers: authJsonHeaders(),
        body: JSON.stringify({
          nome: lead.nome,
          mercado: lead.mercado,
          faturamento: lead.faturamento,
          equipe: lead.equipe,
          urgencia: lead.urgencia,
          investimento: lead.investimento,
          dores: lead.dores,
          tier: lead.tier,
          internal_score: lead.internal_score,
          formsapp_data: lead.formsapp_data,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setInsights(data);
      }
    } catch (e) {
      console.error("Insights error:", e);
    } finally {
      setInsightsLoading(false);
    }
  };

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/leads", { headers: authHeaders() });
      if (res.status === 401) {
        // Token is stale or invalid — force re-login
        sessionStorage.removeItem("adm_token");
        setAuthed(false);
        return;
      }
      if (res.ok) {
        const raw: Lead[] = await res.json();
        // Fix tier from score (in case DB has stale tier)
        const fixed = raw.map((l) => {
          const s = l.internal_score || 0;
          const correctTier = s >= 70 ? "hot" : s >= 40 ? "warm" : (l.tier || "cold");
          return { ...l, tier: s > 0 ? correctTier : (l.tier || "cold") };
        });
        setLeads(fixed);
      }
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

  const [page, setPage] = useState<"home" | "leads" | "lead-detail" | "analytics-leads" | "analytics-calc" | "sync">("home");
  const [sideOpen, setSideOpen] = useState(false);
  const [calcEvents, setCalcEvents] = useState<CalcEvent[]>([]);
  const [detailLeadId, setDetailLeadId] = useState<number | null>(null);

  // Navigate to lead detail and update URL
  const openLeadDetail = useCallback((leadId: number) => {
    setDetailLeadId(leadId);
    setInsights(null);
    setPage("lead-detail");
    window.history.pushState({ page: "lead-detail", leadId }, "", `/admin/lead/${leadId}`);
  }, []);

  // Navigate away from lead detail and restore URL
  const navigateTo = useCallback((target: "home" | "leads" | "analytics-leads" | "analytics-calc" | "sync") => {
    setPage(target);
    setDetailLeadId(null);
    window.history.pushState({ page: target }, "", "/admin");
  }, []);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state?.page === "lead-detail" && e.state?.leadId) {
        setDetailLeadId(e.state.leadId);
        setInsights(null);
        setPage("lead-detail");
      } else {
        setPage(e.state?.page || "home");
        setDetailLeadId(null);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const fetchCalcAnalytics = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/analytics", { headers: authHeaders() });
      if (res.status === 401) { sessionStorage.removeItem("adm_token"); setAuthed(false); return; }
      if (res.ok) setCalcEvents(await res.json());
    } catch (e) { console.error("Calc analytics fetch:", e); }
  }, []);

  useEffect(() => {
    if (authed && page === "analytics-calc" && calcEvents.length === 0) fetchCalcAnalytics();
  }, [authed, page, calcEvents.length, fetchCalcAnalytics]);

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

  // Score distribution histogram (0-20, 20-40, 40-60, 60-80, 80-100)
  const scoreDist = useMemo(() => {
    const buckets = [
      { range: "0-20", count: 0, color: "#3B82F6" },
      { range: "20-40", count: 0, color: "#3B82F6" },
      { range: "40-60", count: 0, color: "#EAB308" },
      { range: "60-80", count: 0, color: "#EAB308" },
      { range: "80-100", count: 0, color: "#F97316" },
    ];
    leads.forEach((l) => {
      const s = l.internal_score || 0;
      if (s < 20) buckets[0].count++;
      else if (s < 40) buckets[1].count++;
      else if (s < 60) buckets[2].count++;
      else if (s < 80) buckets[3].count++;
      else buckets[4].count++;
    });
    return buckets;
  }, [leads]);

  // Investimento distribution
  const invChart = useMemo(() => {
    const map: Record<string, number> = {};
    leads.forEach((l) => {
      const inv = l.investimento || "N/A";
      map[inv] = (map[inv] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([inv, count]) => ({ inv: inv.replace("R$", "").slice(0, 18), count }));
  }, [leads]);

  // Leads needing attention (hot/warm, no contact, > 30 min)
  const needsAttention = useMemo(() => {
    const cutoff = Date.now() - 1800000; // 30 min
    return leads.filter(
      (l) =>
        (l.tier === "hot" || l.tier === "warm") &&
        (!l.contact_status || l.contact_status === "novo") &&
        new Date(l.created_at).getTime() < cutoff
    ).slice(0, 5);
  }, [leads]);

  // Recent leads (last 5)
  const recentLeads = useMemo(() => {
    return [...leads].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
  }, [leads]);

  // Best markets by hot rate
  const bestMarkets = useMemo(() => {
    const map: Record<string, { total: number; hot: number }> = {};
    leads.forEach((l) => {
      const m = (l.mercado || "").slice(0, 35) || "N/A";
      if (!map[m]) map[m] = { total: 0, hot: 0 };
      map[m].total++;
      if (l.tier === "hot") map[m].hot++;
    });
    return Object.entries(map)
      .filter(([, v]) => v.total >= 1)
      .sort((a, b) => (b[1].hot / b[1].total) - (a[1].hot / a[1].total))
      .slice(0, 5)
      .map(([market, v]) => ({ market, total: v.total, hot: v.hot, rate: Math.round((v.hot / v.total) * 100) }));
  }, [leads]);

  // Today's stats
  const todayStats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayLeads = leads.filter((l) => l.created_at?.slice(0, 10) === today);
    return {
      count: todayLeads.length,
      hot: todayLeads.filter((l) => l.tier === "hot").length,
    };
  }, [leads]);

  // Conversion funnel
  const funnelData = useMemo(() => [
    { name: "Leads", value: stats.total, fill: "#C9A84C" },
    { name: "Contactados", value: stats.contacted, fill: "#A78BFA" },
    { name: "Aplicaram", value: stats.applied, fill: "#00E5FF" },
    { name: "Agendaram", value: stats.scheduled, fill: "#22C55E" },
  ], [stats]);

  // Urgência distribution
  const urgChart = useMemo(() => {
    const map: Record<string, number> = {};
    leads.forEach((l) => {
      const u = l.urgencia || "N/A";
      map[u] = (map[u] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([urgencia, count]) => ({ urgencia: urgencia.slice(0, 22), count }));
  }, [leads]);

  // Hot leads not contacted within 1h
  const hotAlerts = useMemo(() => {
    const oneHourAgo = Date.now() - 3600000;
    return leads.filter(
      (l) =>
        l.tier === "hot" &&
        (!l.contact_status || l.contact_status === "novo") &&
        new Date(l.created_at).getTime() < oneHourAgo
    );
  }, [leads]);

  // ─── CALC ANALYTICS DERIVED DATA ────────────────────────────────────────

  const calcStats = useMemo(() => {
    const sessions = new Set(calcEvents.map((e) => e.session_id)).size;
    const pageviews = calcEvents.filter((e) => e.event === "pageview").length;
    const completions = calcEvents.filter((e) => e.event === "complete").length;
    const completionRate = pageviews > 0 ? Math.round((completions / pageviews) * 100) : 0;
    return { sessions, pageviews, completions, completionRate };
  }, [calcEvents]);

  // Device breakdown
  const deviceChart = useMemo(() => {
    const map: Record<string, number> = {};
    const seen = new Set<string>();
    calcEvents.forEach((e) => {
      if (e.event === "pageview" && !seen.has(e.session_id)) {
        seen.add(e.session_id);
        const d = e.device || "unknown";
        map[d] = (map[d] || 0) + 1;
      }
    });
    const deviceIcons: Record<string, string> = { mobile: "📱", desktop: "🖥️", tablet: "📋", unknown: "❓" };
    return Object.entries(map).map(([name, value]) => ({
      name: `${deviceIcons[name.toLowerCase()] || "📱"} ${name}`, value,
    }));
  }, [calcEvents]);

  const DEVICE_COLORS = ["#C9A84C", "#3B82F6", "#F97316", "#A78BFA"];

  // Browser breakdown
  const browserChart = useMemo(() => {
    const map: Record<string, number> = {};
    const seen = new Set<string>();
    calcEvents.forEach((e) => {
      if (e.event === "pageview" && !seen.has(e.session_id)) {
        seen.add(e.session_id);
        const b = e.browser || "unknown";
        map[b] = (map[b] || 0) + 1;
      }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({
      name: `${BROWSER_ICONS[name.toLowerCase()] || "🌐"} ${name}`, value,
    }));
  }, [calcEvents]);

  // Step funnel (how many reached each step)
  const stepFunnel = useMemo(() => {
    const stepOrder = ["0", "1", "1b", "2", "3", "4", "5a", "5b", "5c", "6", "7", "8", "9"];
    const stepLabels: Record<string, string> = {
      "0": "Landing", "1": "Mercado", "1b": "Confirmação", "2": "Dores", "3": "Desejos",
      "4": "Análise", "5a": "Ideia 1", "5b": "Ideia 2", "5c": "Ideia 3", "6": "Qualificação",
      "7": "Plano 90d", "8": "Score", "9": "Final",
    };
    const sessionSteps = new Map<string, Set<string>>();
    calcEvents.forEach((e) => {
      if (!sessionSteps.has(e.session_id)) sessionSteps.set(e.session_id, new Set());
      sessionSteps.get(e.session_id)!.add(e.step);
    });
    return stepOrder.map((step) => {
      let count = 0;
      sessionSteps.forEach((steps) => { if (steps.has(step)) count++; });
      return { step: stepLabels[step] || step, count };
    });
  }, [calcEvents]);

  // Views per day (last 14 days)
  const calcDailyChart = useMemo(() => {
    const days: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days[d.toISOString().slice(5, 10)] = 0;
    }
    calcEvents.forEach((e) => {
      if (e.event === "pageview" && e.created_at) {
        const key = e.created_at.slice(5, 10);
        if (days[key] !== undefined) days[key]++;
      }
    });
    return Object.entries(days).map(([date, count]) => ({ date, views: count }));
  }, [calcEvents]);

  // OS breakdown
  const osChart = useMemo(() => {
    const map: Record<string, number> = {};
    const seen = new Set<string>();
    calcEvents.forEach((e) => {
      if (e.event === "pageview" && !seen.has(e.session_id)) {
        seen.add(e.session_id);
        const o = e.os || "unknown";
        map[o] = (map[o] || 0) + 1;
      }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({
      name: `${OS_ICONS[name.toLowerCase()] || "💻"} ${name}`, value,
    }));
  }, [calcEvents]);

  // Language breakdown
  const langChart = useMemo(() => {
    const map: Record<string, number> = {};
    const seen = new Set<string>();
    calcEvents.forEach((e) => {
      if (e.event === "pageview" && !seen.has(e.session_id)) {
        seen.add(e.session_id);
        const l = e.language || "unknown";
        map[l] = (map[l] || 0) + 1;
      }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([lang, count]) => ({
      lang: `${LANG_FLAGS[lang] || "🌐"} ${lang}`, count,
    }));
  }, [calcEvents]);

  // Country breakdown
  const countryChart = useMemo(() => {
    const map: Record<string, number> = {};
    const seen = new Set<string>();
    calcEvents.forEach((e) => {
      if (e.event === "pageview" && !seen.has(e.session_id)) {
        seen.add(e.session_id);
        const c = e.country || "unknown";
        map[c] = (map[c] || 0) + 1;
      }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([code, count]) => ({ code, count }));
  }, [calcEvents]);

  // Country map data (numeric ID → count)
  const countryMapData = useMemo(() => {
    const map: Record<string, number> = {};
    countryChart.forEach(({ code, count }) => {
      const numId = ISO2_TO_NUM[code];
      if (numId) map[numId] = count;
    });
    return map;
  }, [countryChart]);

  const maxCountryCount = useMemo(() => Math.max(...countryChart.map((c) => c.count), 1), [countryChart]);

  // Region (state) breakdown
  const regionChart = useMemo(() => {
    const map: Record<string, number> = {};
    const seen = new Set<string>();
    calcEvents.forEach((e) => {
      if (e.event === "pageview" && !seen.has(e.session_id)) {
        seen.add(e.session_id);
        const r = e.region || "";
        if (r) map[r] = (map[r] || 0) + 1;
      }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([region, count]) => ({ region, count }));
  }, [calcEvents]);

  // City breakdown
  const cityChart = useMemo(() => {
    const map: Record<string, number> = {};
    const seen = new Set<string>();
    calcEvents.forEach((e) => {
      if (e.event === "pageview" && !seen.has(e.session_id)) {
        seen.add(e.session_id);
        const c = e.city || "";
        if (c) map[c] = (map[c] || 0) + 1;
      }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([city, count]) => ({ city, count }));
  }, [calcEvents]);

  // ─── ACTIONS ──────────────────────────────────────────────────────────────

  const updateLead = async (id: number, data: { contact_status?: string; notes?: string }) => {
    await fetch("/api/admin/leads/update", {
      method: "POST",
      headers: authJsonHeaders(),
      body: JSON.stringify({ id, ...data }),
    });
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...data } : l))
    );
  };

  // ─── LOGIN ────────────────────────────────────────────────────────────────

  const handleLogin = async () => {
    setLoginError("");
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pass }),
      });
      if (res.ok) {
        const { token } = await res.json();
        sessionStorage.setItem("adm_token", token);
        setAuthed(true);
      } else {
        setLoginError("Senha incorreta");
      }
    } catch {
      setLoginError("Erro de conexao");
    }
  };

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
            onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }}
          />
          <button onClick={handleLogin}>ENTRAR</button>
          {loginError && <p style={{ color: "#EF4444", fontSize: 13, marginTop: 10 }}>{loginError}</p>}
        </div>
      </div>
    );
  }

  // ─── DASHBOARD ────────────────────────────────────────────────────────────

  const tooltipStyle = { background: "#0D1117", border: "1px solid rgba(201,168,76,.2)", color: "#E2DDD4" };
  const tickStyle = { fill: "rgba(226,221,212,.4)", fontSize: 11 };
  const tickSmall = { fill: "rgba(226,221,212,.4)", fontSize: 10 };
  const tickEmoji = { fill: "rgba(226,221,212,.6)", fontSize: 14 };

  return (
    <div className="adm">
      {/* ═══ SIDEBAR ═══ */}
      {sideOpen && <div className="adm-side-overlay" onClick={() => setSideOpen(false)} />}
      <aside className={`adm-side${sideOpen ? " open" : ""}`}>
        <div className="adm-side-brand">V.I.S.O.R.</div>
        <div className="adm-side-sub">Central de Leads</div>
        <nav className="adm-side-nav">
          <button className={`adm-nav${page === "home" ? " active" : ""}`} onClick={() => { navigateTo("home"); setSideOpen(false); }}>Dashboard</button>
          <button className={`adm-nav${page === "leads" ? " active" : ""}`} onClick={() => { navigateTo("leads"); setSideOpen(false); }}>Leads</button>
          <div className="adm-nav-group">
            <div className={`adm-nav-label${page.startsWith("analytics") ? " active" : ""}`}>Analytics</div>
            <button className={`adm-nav sub${page === "analytics-leads" ? " active" : ""}`} onClick={() => { navigateTo("analytics-leads"); setSideOpen(false); }}>Leads</button>
            <button className={`adm-nav sub${page === "analytics-calc" ? " active" : ""}`} onClick={() => { navigateTo("analytics-calc"); setSideOpen(false); }}>Calculadora</button>
          </div>
        </nav>
        <div className="adm-side-actions">
          <button className="adm-nav" onClick={async () => {
            const res = await fetch("/api/admin/leads/export", { headers: authHeaders() });
            if (res.ok) { const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `leads-visor-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url); }
          }}>Exportar CSV</button>
          <button className={`adm-nav${page === "sync" ? " active" : ""}`} onClick={() => { navigateTo("sync"); setSideOpen(false); }}>Sync Forms.app</button>
          <button className="adm-nav" onClick={fetchLeads} disabled={loading}>{loading ? "..." : "Atualizar"}</button>
        </div>
        <div className="adm-side-foot">
          <button className="adm-nav logout" onClick={() => { sessionStorage.removeItem("adm_token"); setAuthed(false); }}>Sair</button>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className="adm-main">
        <button className="adm-hamburger" onClick={() => setSideOpen(true)}>&#9776;</button>

        {/* KPI Row - always visible */}
        <div className="adm-kpis">
          <div className="adm-kpi"><div className="adm-kpi-num">{stats.total}</div><div className="adm-kpi-label">Total Leads <InfoTip text="Quantidade total de leads que passaram pela Calculadora V.I.S.O.R." /></div></div>
          <div className="adm-kpi hot"><div className="adm-kpi-num">{stats.hot}</div><div className="adm-kpi-label">Hot <InfoTip text="Score 70+. Alta urgência, faturamento alto, prontos pra investir. Prioridade máxima de contato." /></div></div>
          <div className="adm-kpi warm"><div className="adm-kpi-num">{stats.warm}</div><div className="adm-kpi-label">Warm <InfoTip text="Score 40-69. Potencial real mas precisam de mais contexto ou nutrição antes de converter." /></div></div>
          <div className="adm-kpi cold"><div className="adm-kpi-num">{stats.cold}</div><div className="adm-kpi-label">Cold <InfoTip text="Score abaixo de 40. Explorando, sem urgência. Recebem plano PDF e podem voltar no futuro." /></div></div>
          <div className="adm-kpi accent"><div className="adm-kpi-num">{stats.applied}</div><div className="adm-kpi-label">Aplicaram <InfoTip text="Preencheram o formulário de aplicação no Forms.app após a calculadora." /></div></div>
          <div className="adm-kpi accent2"><div className="adm-kpi-num">{stats.scheduled}</div><div className="adm-kpi-label">Agendaram <InfoTip text="Marcaram sessão estratégica. Status atualizado manualmente pela equipe." /></div></div>
          <div className="adm-kpi"><div className="adm-kpi-num">{stats.avgScore}</div><div className="adm-kpi-label">Score Médio <InfoTip text="Média de pontuação de todos os leads. Calculado com base em faturamento, urgência, investimento, equipe e dores." /></div></div>
          <div className="adm-kpi"><div className="adm-kpi-num">{stats.convRate}%</div><div className="adm-kpi-label">Conv. Rate <InfoTip text="Porcentagem de leads que completaram a aplicação no Forms.app (aplicaram / total)." /></div></div>
        </div>

        {/* Alert */}
        {hotAlerts.length > 0 && (
          <div className="adm-alert">
            <span className="adm-alert-icon">!</span>
            <span>{hotAlerts.length} lead{hotAlerts.length > 1 ? "s" : ""} HOT sem contato há mais de 1h:</span>
            <span className="adm-alert-names">{hotAlerts.slice(0, 3).map((l) => l.nome || "Sem nome").join(", ")}{hotAlerts.length > 3 && ` +${hotAlerts.length - 3}`}</span>
            <button className="adm-alert-btn" onClick={() => { setFilter("hot"); navigateTo("leads"); }}>Ver esses leads</button>
          </div>
        )}

        {/* ═══ HOME PAGE ═══ */}
        {page === "home" && (
          <>
            {/* 4-column grid with charts + data widgets */}
            <div className="adm-home-grid">
              {/* Col 1-2: Line chart wide */}
              <div className="adm-widget wide">
                <div className="adm-chart-title">LEADS POR DIA (14 DIAS)</div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={dailyChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
                    <XAxis dataKey="date" tick={tickSmall} />
                    <YAxis tick={tickSmall} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="leads" stroke="#C9A84C" strokeWidth={2} dot={{ r: 3, fill: "#C9A84C" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Col 3: Tier pie */}
              <div className="adm-widget">
                <div className="adm-chart-title">POR TIER</div>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={tierPie} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                      {tierPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Col 4: Today + quick stats */}
              <div className="adm-widget">
                <div className="adm-chart-title">HOJE</div>
                <div className="adm-today">
                  <div className="adm-today-big">{todayStats.count}</div>
                  <div className="adm-today-label">leads hoje</div>
                  <div className="adm-today-hot">{todayStats.hot} hot</div>
                </div>
                <div className="adm-mini-stats">
                  <div><span className="adm-mini-num">{needsAttention.length}</span><span className="adm-mini-label">aguardando contato</span></div>
                  <div><span className="adm-mini-num">{stats.contacted}</span><span className="adm-mini-label">contactados</span></div>
                </div>
              </div>

              {/* Row 2: Score histogram */}
              <div className="adm-widget">
                <div className="adm-chart-title">DISTRIBUIÇÃO DE SCORE</div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={scoreDist}>
                    <XAxis dataKey="range" tick={tickSmall} />
                    <YAxis tick={tickSmall} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {scoreDist.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Funnel */}
              <div className="adm-widget">
                <div className="adm-chart-title">FUNIL DE CONVERSÃO</div>
                <ResponsiveContainer width="100%" height={160}>
                  <FunnelChart>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Funnel dataKey="value" data={funnelData} isAnimationActive>
                      <LabelList position="center" fill="#fff" fontSize={11} formatter={(v: unknown) => (Number(v) > 0 ? String(v) : "")} />
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
                <div className="adm-funnel-labels">{funnelData.map((d, i) => <span key={i} style={{ color: d.fill }}>{d.name}</span>)}</div>
              </div>

              {/* Needs attention */}
              <div className="adm-widget span2">
                <div className="adm-chart-title">PRECISAM DE ATENÇÃO</div>
                {needsAttention.length === 0 ? (
                  <div className="adm-empty-sm">Tudo em dia!</div>
                ) : (
                  <div className="adm-mini-list">
                    {needsAttention.map((l) => (
                      <div key={l.id} className="adm-mini-card" onClick={() => { openLeadDetail(l.id); }}>
                        <div className="adm-mini-card-score" style={{ borderColor: TIER_COLORS[(l.tier || "cold") as keyof typeof TIER_COLORS] }}>{l.internal_score || 0}</div>
                        <div className="adm-mini-card-info">
                          <span className="adm-mini-card-name">{l.nome || "Sem nome"}</span>
                          <span className="adm-mini-card-meta">{(l.mercado || "").slice(0, 30)} · {l.created_at ? timeAgo(l.created_at) : ""}</span>
                        </div>
                        <span className={`adm-card-tier ${l.tier}`}>{(l.tier || "cold").toUpperCase()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent leads section below */}
            <div className="adm-section-title">LEADS RECENTES</div>
            <div className="adm-list">
              {recentLeads.map((lead) => (
                <div key={lead.id} className={`adm-card ${lead.tier || "cold"}`} onClick={() => { openLeadDetail(lead.id); }}>
                  <div className="adm-card-score" style={{ borderColor: TIER_COLORS[(lead.tier || "cold") as keyof typeof TIER_COLORS] }}>{lead.internal_score || 0}</div>
                  <div className="adm-card-body">
                    <div className="adm-card-row1">
                      <span className="adm-card-name">{lead.nome || "Sem nome"}</span>
                      <span className={`adm-card-tier ${lead.tier || "cold"}`}>{(lead.tier || "cold").toUpperCase()}</span>
                      {lead.formsapp_completed && <span className="adm-card-applied">APLICOU</span>}
                    </div>
                    <div className="adm-card-tags"><TagBadges lead={lead} /></div>
                    <div className="adm-card-row2">
                      <span>{(lead.mercado || "—").slice(0, 40)}</span>
                      <span className="adm-card-dot">&middot;</span>
                      <span>{lead.faturamento || ""}</span>
                      <span className="adm-card-dot">&middot;</span>
                      <span className="adm-card-time">{lead.created_at ? timeAgo(lead.created_at) : ""}</span>
                    </div>
                  </div>
                </div>
              ))}
              <button className="adm-view-all" onClick={() => navigateTo("leads")}>VER TODOS OS LEADS</button>
            </div>
          </>
        )}

        {/* ═══ ANALYTICS: LEADS ═══ */}
        {page === "analytics-leads" && (
          <div className="adm-analytics">
            <div className="adm-section-title">ANALYTICS DE LEADS</div>
            <div className="adm-chart-row">
              <div className="adm-chart-card wide">
                <div className="adm-chart-title">LEADS POR DIA (14 DIAS)</div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={dailyChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
                    <XAxis dataKey="date" tick={tickStyle} />
                    <YAxis tick={tickStyle} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="leads" stroke="#C9A84C" strokeWidth={2} dot={{ r: 3, fill: "#C9A84C" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="adm-chart-card">
                <div className="adm-chart-title">DISTRIBUIÇÃO POR TIER</div>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={tierPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                      {tierPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="adm-chart-row">
              <div className="adm-chart-card">
                <div className="adm-chart-title">POR FATURAMENTO</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={fatChart} layout="vertical">
                    <XAxis type="number" tick={tickStyle} allowDecimals={false} />
                    <YAxis type="category" dataKey="faixa" tick={tickSmall} width={100} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="#C9A84C" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="adm-chart-card">
                <div className="adm-chart-title">STATUS DE CONTATO</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={statusChart}>
                    <XAxis dataKey="status" tick={tickSmall} />
                    <YAxis tick={tickStyle} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {statusChart.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="adm-chart-row">
              <div className="adm-chart-card">
                <div className="adm-chart-title">FUNIL DE CONVERSÃO</div>
                <ResponsiveContainer width="100%" height={220}>
                  <FunnelChart>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Funnel dataKey="value" data={funnelData} isAnimationActive>
                      <LabelList position="center" fill="#fff" fontSize={12} formatter={(v: unknown) => (Number(v) > 0 ? String(v) : "")} />
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
                <div className="adm-funnel-labels">{funnelData.map((d, i) => <span key={i} style={{ color: d.fill }}>{d.name}</span>)}</div>
              </div>
              <div className="adm-chart-card">
                <div className="adm-chart-title">POR URGÊNCIA</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={urgChart} layout="vertical">
                    <XAxis type="number" tick={tickStyle} allowDecimals={false} />
                    <YAxis type="category" dataKey="urgencia" tick={tickSmall} width={130} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="#A78BFA" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="adm-chart-row">
              <div className="adm-chart-card">
                <div className="adm-chart-title">DISTRIBUIÇÃO DE SCORE</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={scoreDist}>
                    <XAxis dataKey="range" tick={tickSmall} />
                    <YAxis tick={tickStyle} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {scoreDist.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="adm-chart-card">
                <div className="adm-chart-title">POR INVESTIMENTO</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={invChart} layout="vertical">
                    <XAxis type="number" tick={tickStyle} allowDecimals={false} />
                    <YAxis type="category" dataKey="inv" tick={tickSmall} width={110} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="#00E5FF" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="adm-chart-card full">
              <div className="adm-chart-title">TOP MERCADOS</div>
              <div className="adm-markets">
                {topMarkets.map((m, i) => (
                  <div key={i} className="adm-market-row">
                    <span className="adm-market-rank">#{i + 1}</span>
                    <span className="adm-market-name">{m.market}</span>
                    <div className="adm-market-bar"><div className="adm-market-fill" style={{ width: `${(m.count / (topMarkets[0]?.count || 1)) * 100}%` }} /></div>
                    <span className="adm-market-count">{m.count}</span>
                  </div>
                ))}
              </div>
            </div>
            {bestMarkets.length > 0 && (
              <div className="adm-chart-card full">
                <div className="adm-chart-title">MERCADOS COM MELHOR TAXA HOT</div>
                <div className="adm-markets">
                  {bestMarkets.map((m, i) => (
                    <div key={i} className="adm-market-row">
                      <span className="adm-market-rank">#{i + 1}</span>
                      <span className="adm-market-name">{m.market}</span>
                      <div className="adm-market-bar"><div className="adm-market-fill" style={{ width: `${m.rate}%`, background: "linear-gradient(90deg,#F97316,rgba(249,115,22,.4))" }} /></div>
                      <span className="adm-market-count">{m.rate}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ ANALYTICS: CALCULADORA ═══ */}
        {page === "analytics-calc" && (
          <div className="adm-analytics">
            <div className="adm-section-title">ANALYTICS DA CALCULADORA</div>

            {/* Calc KPIs */}
            <div className="adm-calc-kpis">
              <div className="adm-kpi"><div className="adm-kpi-num">{calcStats.sessions}</div><div className="adm-kpi-label">Sessões <InfoTip text="Visitantes únicos que abriram a calculadora. Cada sessão é um navegador diferente." /></div></div>
              <div className="adm-kpi"><div className="adm-kpi-num">{calcStats.pageviews}</div><div className="adm-kpi-label">Pageviews <InfoTip text="Total de vezes que a landing page foi aberta (inclui revisitas)." /></div></div>
              <div className="adm-kpi"><div className="adm-kpi-num">{calcStats.completions}</div><div className="adm-kpi-label">Completaram <InfoTip text="Quantos chegaram até o final (Step 9 - resultado final)." /></div></div>
              <div className="adm-kpi accent"><div className="adm-kpi-num">{calcStats.completionRate}%</div><div className="adm-kpi-label">Taxa Conclusão <InfoTip text="Porcentagem de quem abriu a calculadora e chegou até o final." /></div></div>
            </div>

            {/* Row: Views per day + Devices */}
            <div className="adm-chart-row">
              <div className="adm-chart-card wide">
                <div className="adm-chart-title">📈 ACESSOS POR DIA (14 DIAS)</div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={calcDailyChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
                    <XAxis dataKey="date" tick={tickStyle} />
                    <YAxis tick={tickStyle} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="views" stroke="#00E5FF" strokeWidth={2} dot={{ r: 3, fill: "#00E5FF" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="adm-chart-card">
                <div className="adm-chart-title">📱 POR DISPOSITIVO</div>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={deviceChart} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                      {deviceChart.map((_, i) => <Cell key={i} fill={DEVICE_COLORS[i % DEVICE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Step funnel - full width */}
            <div className="adm-chart-card full">
              <div className="adm-chart-title">🔻 FUNIL POR ETAPA (DROP-OFF)</div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stepFunnel}>
                  <XAxis dataKey="step" tick={tickSmall} interval={0} angle={-30} textAnchor="end" height={60} />
                  <YAxis tick={tickStyle} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="#C9A84C" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Row: Browser + OS */}
            <div className="adm-chart-row">
              <div className="adm-chart-card">
                <div className="adm-chart-title">🌐 POR NAVEGADOR</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={browserChart} layout="vertical">
                    <XAxis type="number" tick={tickStyle} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={tickEmoji} width={140} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" fill="#A78BFA" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="adm-chart-card">
                <div className="adm-chart-title">💻 POR SISTEMA OPERACIONAL</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={osChart} layout="vertical">
                    <XAxis type="number" tick={tickStyle} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={tickEmoji} width={140} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" fill="#22C55E" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Language */}
            {langChart.length > 0 && (
              <div className="adm-chart-card full">
                <div className="adm-chart-title">🗣️ POR IDIOMA</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={langChart} layout="vertical">
                    <XAxis type="number" tick={tickStyle} allowDecimals={false} />
                    <YAxis type="category" dataKey="lang" tick={tickEmoji} width={130} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="#00E5FF" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ═══ GEOLOCATION ═══ */}
            <div className="adm-section-divider" />
            <div className="adm-section-title">🗺️ GEOLOCALIZAÇÃO</div>

            {/* World map */}
            <div className="adm-chart-card full">
              <div className="adm-chart-title">🌎 MAPA DE ACESSOS</div>
              <ComposableMap
                projection="geoMercator"
                projectionConfig={{ scale: 120, center: [0, 20] }}
                style={{ width: "100%", height: "auto", maxHeight: 360 }}
              >
                <Geographies geography={WORLD_GEO}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const geoId = geo.id || "";
                      const count = countryMapData[geoId] || 0;
                      const intensity = count > 0 ? Math.min(count / maxCountryCount, 1) : 0;
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={count > 0
                            ? `rgba(201,168,76,${0.2 + intensity * 0.8})`
                            : "rgba(255,255,255,.03)"
                          }
                          stroke="rgba(255,255,255,.08)"
                          strokeWidth={0.5}
                          style={{
                            hover: { fill: count > 0 ? "#C9A84C" : "rgba(255,255,255,.08)" },
                          }}
                        />
                      );
                    })
                  }
                </Geographies>
              </ComposableMap>
            </div>

            {/* Row: Countries + States + Cities — 3 columns */}
            <div className="adm-geo-row-3">
              <div className="adm-chart-card">
                <div className="adm-chart-title">🏳️ POR PAÍS</div>
                {countryChart.length === 0 ? (
                  <div className="adm-empty-sm">Sem dados de país ainda</div>
                ) : (
                  <div className="adm-geo-list">
                    {countryChart.map((c, i) => (
                      <div key={i} className="adm-geo-row">
                        <span className="adm-geo-rank">#{i + 1}</span>
                        <span className="adm-geo-icon">{COUNTRY_FLAGS[c.code] || "🏳️"}</span>
                        <span className="adm-geo-name">{COUNTRY_NAMES[c.code] || c.code}</span>
                        <div className="adm-market-bar"><div className="adm-market-fill" style={{ width: `${(c.count / (countryChart[0]?.count || 1)) * 100}%` }} /></div>
                        <span className="adm-market-count">{c.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="adm-chart-card">
                <div className="adm-chart-title">📍 POR ESTADO</div>
                {regionChart.length === 0 ? (
                  <div className="adm-empty-sm">Sem dados de estado ainda</div>
                ) : (
                  <div className="adm-geo-list">
                    {regionChart.map((r, i) => (
                      <div key={i} className="adm-geo-row">
                        <span className="adm-geo-rank">#{i + 1}</span>
                        <span className="adm-geo-name">{r.region}</span>
                        <div className="adm-market-bar"><div className="adm-market-fill" style={{ width: `${(r.count / (regionChart[0]?.count || 1)) * 100}%` }} /></div>
                        <span className="adm-market-count">{r.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="adm-chart-card">
                <div className="adm-chart-title">🏙️ TOP CIDADES</div>
                {cityChart.length === 0 ? (
                  <div className="adm-empty-sm">Sem dados de cidade ainda</div>
                ) : (
                  <div className="adm-geo-list">
                    {cityChart.map((c, i) => (
                      <div key={i} className="adm-geo-row">
                        <span className="adm-geo-rank">#{i + 1}</span>
                        <span className="adm-geo-name">{c.city}</span>
                        <div className="adm-market-bar"><div className="adm-market-fill" style={{ width: `${(c.count / (cityChart[0]?.count || 1)) * 100}%`, background: "linear-gradient(90deg,#00E5FF,rgba(0,229,255,.4))" }} /></div>
                        <span className="adm-market-count">{c.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ LEADS PAGE ═══ */}
        {page === "leads" && (
          <>
            <div className="adm-toolbar">
              <input className="adm-search" type="text" placeholder="Buscar por nome, mercado ou WhatsApp..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
            <div className="adm-list">
              {filtered.length === 0 && <div className="adm-empty">{loading ? "Carregando..." : "Nenhum lead encontrado."}</div>}
              {filtered.map((lead) => (
                <div key={lead.id} className={`adm-card ${lead.tier || "cold"}`} onClick={() => { openLeadDetail(lead.id); }}>
                  <div className="adm-card-score" style={{ borderColor: TIER_COLORS[(lead.tier || "cold") as keyof typeof TIER_COLORS] }}>{lead.internal_score || 0}</div>
                  <div className="adm-card-body">
                    <div className="adm-card-row1">
                      <span className="adm-card-name">{lead.nome || "Sem nome"}</span>
                      <span className={`adm-card-tier ${lead.tier || "cold"}`}>{(lead.tier || "cold").toUpperCase()}</span>
                      {lead.formsapp_completed && <span className="adm-card-applied">APLICOU</span>}
                      {lead.contact_status && lead.contact_status !== "novo" && (
                        <span className="adm-card-status" style={{ color: CONTACT_COLORS[lead.contact_status] }}>{CONTACT_LABELS[lead.contact_status]}</span>
                      )}
                    </div>
                    <div className="adm-card-tags"><TagBadges lead={lead} /></div>
                    <div className="adm-card-row2">
                      <span>{(lead.mercado || "—").slice(0, 40)}</span>
                      <span className="adm-card-dot">&middot;</span>
                      <span>{lead.faturamento || ""}</span>
                      <span className="adm-card-dot">&middot;</span>
                      <span className="adm-card-time">{lead.created_at ? timeAgo(lead.created_at) : ""}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ═══ LEAD DETAIL (FICHA) ═══ */}
        {page === "lead-detail" && (() => {
          const dl = leads.find((l) => l.id === detailLeadId);
          if (!dl) return <div style={{ padding: 40, textAlign: "center", color: "rgba(226,221,212,.4)" }}>Lead não encontrado. <button className="adm-modal-ficha-link" onClick={() => navigateTo("leads")}>← Voltar</button></div>;
          const qa = dl.formsapp_data ? parseFormsAppData(dl.formsapp_data) : [];
          const tierColor = TIER_COLORS[(dl.tier || "cold") as keyof typeof TIER_COLORS];
          const whatsappMsg = insights?.frase_gancho
            ? `Oi ${dl.nome || ""}, tudo bem? Me chamo Alê, da equipe do Pedro Superti. ${insights.frase_gancho}`
            : `Oi ${dl.nome || ""}, tudo bem? Me chamo Alê. Sou da equipe do Pedro Superti. Vi que você usou a Calculadora V.I.S.O.R. e seu perfil chamou atenção. Posso te fazer umas perguntas rápidas?`;
          return (
            <>
              {/* Back bar */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <button className="adm-modal-ficha-link" onClick={() => { navigateTo("leads"); setInsights(null); }} style={{ fontSize: 14 }}>← Voltar para Leads</button>
                <div style={{ flex: 1 }} />
                <a
                  href={`https://wa.me/${(dl.whatsapp || "").replace(/\D/g, "")}?text=${encodeURIComponent(whatsappMsg)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="adm-ficha-topbar-wa"
                >
                  WhatsApp
                </a>
              </div>

              {/* Hero */}
              <div className="adm-ficha-hero">
                <div className="adm-ficha-score" style={{ borderColor: tierColor }}>
                  {dl.internal_score || 0}
                </div>
                <div className="adm-ficha-hero-right">
                  <h1 className="adm-ficha-name">{dl.nome || "Lead"}</h1>
                  <div className="adm-ficha-badges">
                    <span className={`adm-card-tier ${dl.tier}`}>{(dl.tier || "cold").toUpperCase()}</span>
                    {dl.formsapp_completed && <span className="adm-card-applied">APLICOU</span>}
                    <TagBadges lead={dl} />
                  </div>
                  <div className="adm-ficha-meta">
                    <span>{dl.mercado || "—"}</span>
                    <span>·</span>
                    <span>{dl.created_at ? new Date(dl.created_at).toLocaleString("pt-BR") : ""}</span>
                    <span>·</span>
                    <span>{dl.created_at ? timeAgo(dl.created_at) + " atrás" : ""}</span>
                  </div>
                </div>
              </div>

              {/* Score bar */}
              <div className="adm-scorebar" style={{ marginBottom: 24 }}>
                <div className="adm-scorebar-fill" style={{ width: `${Math.min(dl.internal_score || 0, 100)}%`, background: tierColor }} />
                <div className="adm-scorebar-marks">
                  <span style={{ left: "40%" }}>40</span>
                  <span style={{ left: "70%" }}>70</span>
                </div>
              </div>

              {/* Timeline */}
              <div className="adm-ficha-section">
                <h2 className="adm-ficha-section-title">Jornada</h2>
                <div className="adm-ficha-timeline">
                  <div className="adm-ficha-tl-step done">
                    <div className="adm-ficha-tl-dot" /><div className="adm-ficha-tl-line" />
                    <strong>Calculadora</strong>
                    <span>{dl.created_at ? new Date(dl.created_at).toLocaleDateString("pt-BR") : "—"}</span>
                  </div>
                  <div className={`adm-ficha-tl-step${dl.formsapp_completed ? " done" : ""}`}>
                    <div className="adm-ficha-tl-dot" /><div className="adm-ficha-tl-line" />
                    <strong>Aplicação</strong>
                    <span>{dl.formsapp_completed ? (dl.formsapp_at ? new Date(dl.formsapp_at).toLocaleDateString("pt-BR") : "Sim") : "Pendente"}</span>
                  </div>
                  <div className={`adm-ficha-tl-step${dl.contact_status && dl.contact_status !== "novo" ? " done" : ""}`}>
                    <div className="adm-ficha-tl-dot" /><div className="adm-ficha-tl-line" />
                    <strong>Contato</strong>
                    <span>{dl.contact_status && dl.contact_status !== "novo" ? CONTACT_LABELS[dl.contact_status] : "Pendente"}</span>
                  </div>
                  <div className={`adm-ficha-tl-step${dl.contact_status === "agendou" ? " done" : ""}`}>
                    <div className="adm-ficha-tl-dot" />
                    <strong>Agendamento</strong>
                    <span>{dl.contact_status === "agendou" ? "Confirmado" : "Pendente"}</span>
                  </div>
                </div>
              </div>

              {/* Profile grid */}
              <div className="adm-ficha-section">
                <h2 className="adm-ficha-section-title">Dados do Perfil</h2>
                <div className="adm-ficha-grid">
                  <div className="adm-modal-field"><label>WhatsApp</label><a href={`https://wa.me/${(dl.whatsapp || "").replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">{dl.whatsapp}</a></div>
                  <div className="adm-modal-field"><label>Faturamento</label><span>{dl.faturamento || "—"}</span></div>
                  <div className="adm-modal-field"><label>Equipe</label><span>{dl.equipe || "—"}</span></div>
                  <div className="adm-modal-field"><label>Urgência</label><span>{dl.urgencia || "—"}</span></div>
                  <div className="adm-modal-field"><label>Investimento</label><span>{dl.investimento || "—"}</span></div>
                  <div className="adm-modal-field" style={{ gridColumn: "1 / -1" }}><label>Mercado</label><span>{dl.mercado || "—"}</span></div>
                </div>
                {dl.dores && dl.dores.length > 0 && (
                  <div className="adm-ficha-dores">
                    <label>Dores</label>
                    <div className="adm-ficha-dores-pills">
                      {dl.dores.map((d, i) => <span key={i} className="adm-ficha-pill">{d}</span>)}
                    </div>
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="adm-ficha-section">
                <h2 className="adm-ficha-section-title">Status de Contato</h2>
                <div className="adm-status-btns">
                  {(["novo", "contactado", "agendou", "sem_resposta", "descartado"] as ContactStatus[]).map((s) => (
                    <button key={s}
                      className={`adm-status-btn${(dl.contact_status || "novo") === s ? " active" : ""}`}
                      style={{ borderColor: CONTACT_COLORS[s], color: (dl.contact_status || "novo") === s ? "#fff" : CONTACT_COLORS[s], background: (dl.contact_status || "novo") === s ? CONTACT_COLORS[s] + "33" : "transparent" }}
                      onClick={async () => {
                        const updated = leads.map((l) => l.id === dl.id ? { ...l, contact_status: s } : l);
                        setLeads(updated);
                        await fetch("/api/admin/leads/update", { method: "POST", headers: authJsonHeaders(), body: JSON.stringify({ id: dl.id, contact_status: s }) });
                      }}
                    >
                      {CONTACT_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="adm-ficha-section">
                <h2 className="adm-ficha-section-title">Notas da Equipe</h2>
                <textarea
                  className="adm-notes"
                  rows={5}
                  placeholder="Ex: Vai agendar semana que vem..."
                  value={dl.notes || ""}
                  onChange={(e) => { const v = e.target.value; setLeads((prev) => prev.map((l) => l.id === dl.id ? { ...l, notes: v } : l)); }}
                  onBlur={() => fetch("/api/admin/leads/update", { method: "POST", headers: authJsonHeaders(), body: JSON.stringify({ id: dl.id, notes: dl.notes || "" }) })}
                />
              </div>

              {/* Forms.app */}
              <div className="adm-ficha-section">
                <h2 className="adm-ficha-section-title">Formulário de Aplicação</h2>
                {!dl.formsapp_completed ? (
                  <div className="adm-forms-empty"><span className="adm-forms-empty-icon">📋</span><p>Este lead ainda não preencheu o formulário de aplicação.</p></div>
                ) : qa.length > 0 ? (
                  <div className="adm-forms-section" style={{ margin: 0 }}>
                    <div className="adm-forms-header">
                      <span className="adm-forms-icon">📋</span><strong>Respostas</strong>
                      <span className="adm-forms-date">{dl.formsapp_at ? new Date(dl.formsapp_at).toLocaleString("pt-BR") : ""}</span>
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
              </div>

              {/* AI Insights */}
              <div className="adm-ficha-section">
                <h2 className="adm-ficha-section-title">Insights com IA</h2>
                <div className="adm-insights-section" style={{ margin: 0 }}>
                  {!insights && !insightsLoading && (
                    <button className="adm-btn-insights" onClick={() => fetchInsights(dl)}>🧠 Gerar Insights com IA</button>
                  )}
                  {insightsLoading && (
                    <div className="adm-insights-loading"><div className="adm-insights-spinner" /><span>Analisando perfil com IA...</span></div>
                  )}
                  {insights && (
                    <div className="adm-insights-content">
                      <div className="adm-insights-header">
                        <span>🧠</span><strong>Insights IA</strong>
                        <span className={`adm-insights-prob ${String(insights.probabilidade_fechamento || "").toLowerCase()}`}>{String(insights.probabilidade_fechamento || "")} chance</span>
                        <span className="adm-insights-prod">{String(insights.produto_ideal || "")}</span>
                      </div>
                      <div className="adm-insights-grid">
                        <div className="adm-insights-card"><div className="adm-insights-card-label">🔥 Maior Dor</div><div className="adm-insights-card-text">{String(insights.maior_dor || "")}</div></div>
                        <div className="adm-insights-card"><div className="adm-insights-card-label">💪 Ponto Forte</div><div className="adm-insights-card-text">{String(insights.ponto_forte || "")}</div></div>
                        <div className="adm-insights-card"><div className="adm-insights-card-label">⚠️ Ponto Fraco</div><div className="adm-insights-card-text">{String(insights.ponto_fraco || "")}</div></div>
                        <div className="adm-insights-card full"><div className="adm-insights-card-label">🎯 Conexão com Ignition</div><div className="adm-insights-card-text">{String(insights.conexao_ignition || "")}</div></div>
                      </div>
                      <div className="adm-insights-approaches">
                        <div className="adm-insights-card-label">💬 Sugestões de Abordagem</div>
                        {Array.isArray(insights.abordagens) && (insights.abordagens as string[]).map((a, i) => (
                          <div key={i} className="adm-insights-approach"><span className="adm-insights-approach-num">{i + 1}</span><span>{a}</span></div>
                        ))}
                      </div>
                      <div className="adm-insights-gancho">
                        <div className="adm-insights-card-label">🎣 Frase Gancho</div>
                        <div className="adm-insights-gancho-text">&ldquo;{String(insights.frase_gancho || "")}&rdquo;</div>
                      </div>
                      {insights.alertas && String(insights.alertas).trim() !== "" ? (
                        <div className="adm-insights-alert"><span>🚨</span> {String(insights.alertas)}</div>
                      ) : null}
                      <button className="adm-btn-insights regen" onClick={() => fetchInsights(dl)}>🔄 Regenerar Insights</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="adm-ficha-actions">
                <a
                  href={`https://wa.me/${(dl.whatsapp || "").replace(/\D/g, "")}?text=${encodeURIComponent(whatsappMsg)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="adm-btn-whatsapp"
                >
                  Abrir WhatsApp {insights ? "(com frase gancho)" : ""}
                </a>
                <button className="adm-ficha-copy" onClick={() => {
                  const url = dl.share_token
                    ? `${window.location.origin}/ficha/${dl.share_token}`
                    : `${window.location.origin}/admin/lead/${dl.id}`;
                  navigator.clipboard.writeText(url);
                }}>
                  📋 Copiar link da ficha
                </button>
              </div>
            </>
          );
        })()}

        {/* ═══ SYNC PAGE ═══ */}
        {page === "sync" && <SyncSection />}

      </main>
    </div>
  );
}

// ─── SYNC SECTION (inline) ──────────────────────────────────────────────────

const FORMSAPP_FIELDS = [
  "Nome Completo", "Principal E-mail", "Telefone", "Nome de sua empresa",
  "Quantos Funcionários", "Faturamento mensal", "Seu site", "Instagram",
  "Ramo de atuação", "Problemas ou desafios", "Urgência", "Marketing",
  "Fator X", "Inteligência Artificial", "Algo importante",
];

const KNOWN_LABELS = [
  "nome completo", "principal e-mail", "telefone", "nome de sua empresa",
  "quantos funcionários", "quantos funcionarios", "qual é faturamento", "qual e faturamento",
  "faturamento mensal", "seu site", "instagram", "ramo de atuação", "ramo de atuacao",
  "problemas ou desafios", "nível de urgência", "nivel de urgencia",
  "como você faz o marketing", "como voce faz o marketing", "marketing",
  "fator x", "inteligência artificial", "inteligencia artificial",
  "algo importante", "data de envio", "id de envio",
];

function isKnownLabel(line: string): boolean {
  const lower = (line || "").toLowerCase().replace(/:$/, "").trim();
  return KNOWN_LABELS.some((l) => lower.includes(l));
}

interface ParsedSubmission {
  answers: { title: string; value: string }[];
  createdAt?: string;
  submissionId?: string;
  [key: string]: unknown;
}

interface SyncResult {
  unmatched_id?: number;
  index?: number;
  lead_id: number | null;
  lead_name: string | null;
  status?: string;
  method?: string;
}

interface UnmatchedSub {
  id: number;
  phone_digits: string | null;
  name_candidates: string[];
  matched: boolean;
  matched_lead_id: number | null;
  created_at: string;
}

function parseCSVSync(text: string): ParsedSubmission[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const sep = lines[0].includes("\t") ? "\t" : lines[0].includes(";") ? ";" : ",";
  function splitRow(line: string): string[] {
    const cols: string[] = []; let current = ""; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (inQ && line[i+1] === '"') { current += '"'; i++; } else inQ = !inQ; }
      else if (ch === sep && !inQ) { cols.push(current.trim()); current = ""; }
      else current += ch;
    }
    cols.push(current.trim()); return cols;
  }
  const headers = splitRow(lines[0]);
  const results: ParsedSubmission[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitRow(lines[i]);
    if (cols.length < 3) continue;
    const answers: { title: string; value: string }[] = [];
    let createdAt = "", submissionId = "";
    for (let j = 0; j < headers.length; j++) {
      const h = (headers[j] || "").toLowerCase(), v = cols[j] || "";
      if (h.includes("data") && h.includes("envio")) createdAt = v;
      else if (h.includes("id") && h.includes("envio")) submissionId = v;
      else if (v) answers.push({ title: headers[j], value: v });
    }
    results.push({ answers, createdAt, submissionId });
  }
  return results;
}

function parseFormsAppTextSync(text: string): ParsedSubmission[] {
  const cleaned = text.replace(/\d+\s*-\s*\d+\s+of\s+\d+/g, "").replace(/^Aprovados:.*$/gm, "").replace(/^Contagem de registros:.*$/gm, "").replace(/^\( Os dados podem demorar.*$/gm, "");
  const dateIdPattern = /(\d{1,2}\/\d{1,2}\/\d{4},\s*\d{1,2}:\d{2}:\d{2}\s*[AP]M)\s*\n\s*([a-f0-9]{10,})/g;
  const records: { text: string; date: string; id: string }[] = [];
  let lastEnd = 0; let match;
  while ((match = dateIdPattern.exec(cleaned)) !== null) {
    const recordText = cleaned.slice(lastEnd, match.index).trim();
    if (recordText.length > 10) records.push({ text: recordText, date: match[1], id: match[2] });
    lastEnd = match.index + match[0].length;
  }
  if (records.length === 0) {
    const lines = cleaned.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.some((l) => isKnownLabel(l))) records.push({ text: cleaned, date: "", id: "" });
  }
  if (records.length === 0) return [];
  const results: ParsedSubmission[] = [];
  for (const rec of records) {
    const lines = rec.text.split("\n").map((l) => l.trim()).filter(Boolean);
    const cleanLines = lines.filter((l) => !(/^\d{1,2}$/.test(l)));
    const answers: { title: string; value: string }[] = [];
    const hasLabels = cleanLines.some((l) => l.endsWith(":") && isKnownLabel(l));
    if (hasLabels) {
      let currentLabel = ""; let currentValue: string[] = [];
      for (const line of cleanLines) {
        if (line.endsWith(":") && isKnownLabel(line)) {
          if (currentLabel && currentValue.length > 0) { const val = currentValue.join("\n").trim(); if (val) answers.push({ title: currentLabel.replace(/:$/, ""), value: val }); }
          currentLabel = line; currentValue = [];
        } else currentValue.push(line);
      }
      if (currentLabel && currentValue.length > 0) { const val = currentValue.join("\n").trim(); if (val) answers.push({ title: currentLabel.replace(/:$/, ""), value: val }); }
    } else {
      for (let i = 0; i < Math.min(cleanLines.length, FORMSAPP_FIELDS.length); i++) {
        if (cleanLines[i]) answers.push({ title: FORMSAPP_FIELDS[i], value: cleanLines[i] });
      }
    }
    if (answers.length > 0) results.push({ answers, createdAt: rec.date, submissionId: rec.id });
  }
  return results;
}

function detectAndParseSync(text: string): { submissions: ParsedSubmission[]; format: string } {
  const trimmed = text.trim();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      const subs = arr.map((item: Record<string, unknown>) => {
        if (item.answers && Array.isArray(item.answers)) {
          const safe = { ...item, answers: (item.answers as Record<string, unknown>[]).map((a) => ({ title: String(a.title ?? a.question ?? a.label ?? ""), value: String(a.value ?? a.answer ?? a.response ?? "") })) } as ParsedSubmission;
          return safe;
        }
        const answers: { title: string; value: string }[] = [];
        for (const [k, v] of Object.entries(item)) { if (v != null && typeof v === "string") answers.push({ title: k, value: v }); else if (v != null && typeof v !== "object") answers.push({ title: k, value: String(v) }); }
        return { answers, createdAt: (item.createdAt || item.created_at || "") as string };
      });
      return { submissions: subs, format: "JSON" };
    } catch { /* not JSON */ }
  }
  const hasFormsPattern = /\d{1,2}\/\d{1,2}\/\d{4},\s*\d{1,2}:\d{2}:\d{2}\s*[AP]M/.test(trimmed);
  const hasLabels = trimmed.split("\n").some((l) => l.trim().endsWith(":") && isKnownLabel(l.trim()));
  if (hasFormsPattern || hasLabels) {
    const parsed = parseFormsAppTextSync(trimmed);
    if (parsed.length > 0) return { submissions: parsed, format: "Texto Forms.app" };
  }
  const firstLine = trimmed.split("\n")[0];
  const hasCsvHeader = firstLine.includes(",") || firstLine.includes("\t") || firstLine.includes(";");
  const looksLikeCsv = hasCsvHeader && (firstLine.toLowerCase().includes("nome") || firstLine.toLowerCase().includes("email") || firstLine.toLowerCase().includes("telefone"));
  if (looksLikeCsv) { const parsed = parseCSVSync(trimmed); if (parsed.length > 0) return { submissions: parsed, format: "CSV" }; }
  const csvAttempt = parseCSVSync(trimmed);
  if (csvAttempt.length > 0) return { submissions: csvAttempt, format: "CSV" };
  return { submissions: [], format: "desconhecido" };
}

function SyncSection() {
  const [textInput, setTextInput] = useState("");
  const [parsed, setParsed] = useState<ParsedSubmission[]>([]);
  const [detectedFormat, setDetectedFormat] = useState("");
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [setupDone, setSetupDone] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupSql, setSetupSql] = useState("");
  const [importResult, setImportResult] = useState<{ total: number; matched: number; already_matched: number; unmatched_stored: number; results: SyncResult[] } | null>(null);
  const [syncResult, setSyncResult] = useState<{ total_unmatched: number; synced: number; still_unmatched: number; results: SyncResult[] } | null>(null);
  const [unmatched, setUnmatched] = useState<UnmatchedSub[]>([]);
  const [syncLeads, setSyncLeads] = useState<{ id: number; nome: string; whatsapp: string; formsapp_completed: boolean }[]>([]);
  const [linking, setLinking] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const runSetup = async () => {
    setSetupLoading(true); setSetupSql("");
    try {
      const res = await fetch("/api/admin/formsapp-setup", { method: "POST", headers: authHeaders() });
      const data = await res.json();
      if (data.sql) setSetupSql(data.sql); else setSetupDone(true);
    } catch { setSetupSql("Erro ao criar tabela."); }
    finally { setSetupLoading(false); }
  };

  const fetchUnmatched = async () => {
    try {
      const res = await fetch("/api/admin/formsapp-unmatched", { headers: authHeaders() });
      if (res.ok) { const data = await res.json(); setUnmatched(data.unmatched || []); setSyncLeads(data.leads || []); }
    } catch (e) { console.error("Fetch unmatched:", e); }
  };

  useEffect(() => { runSetup(); fetchUnmatched(); }, []);

  const handleTextChange = useCallback((text: string) => {
    setTextInput(text); setImportResult(null);
    if (text.trim().length < 20) { setParsed([]); setDetectedFormat(""); return; }
    const { submissions, format } = detectAndParseSync(text);
    setParsed(submissions); setDetectedFormat(format);
  }, []);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => { const text = e.target?.result as string; if (text) handleTextChange(text); };
    reader.readAsText(file);
  }, [handleTextChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files?.[0]; if (file) handleFile(file);
  }, [handleFile]);

  const handleImport = async () => {
    if (parsed.length === 0) return;
    setImporting(true); setImportResult(null);
    try {
      const res = await fetch("/api/admin/formsapp-import", { method: "POST", headers: authJsonHeaders(), body: JSON.stringify({ submissions: parsed }) });
      const data = await res.json();
      if (data.error) alert("Erro: " + data.error); else setImportResult(data);
      fetchUnmatched();
    } catch (e) { alert("Erro ao importar: " + String(e)); }
    finally { setImporting(false); }
  };

  const handleSync = async () => {
    setSyncing(true); setSyncResult(null);
    try {
      const res = await fetch("/api/admin/formsapp-sync", { method: "POST", headers: authHeaders() });
      const data = await res.json();
      if (data.error) alert("Erro: " + data.error); else setSyncResult(data);
      fetchUnmatched();
    } catch (e) { console.error("Sync error:", e); }
    finally { setSyncing(false); }
  };

  const handleManualLink = async (unmatchedId: number, leadId: number) => {
    setLinking(unmatchedId);
    try {
      const res = await fetch("/api/admin/formsapp-link", { method: "POST", headers: authJsonHeaders(), body: JSON.stringify({ unmatched_id: unmatchedId, lead_id: leadId }) });
      if (res.ok) fetchUnmatched();
    } catch (e) { console.error("Link error:", e); }
    finally { setLinking(null); }
  };

  const availableLeads = syncLeads.filter((l) => !l.formsapp_completed);

  function getPreview(sub: ParsedSubmission): { name: string; phone: string } {
    const nameField = sub.answers?.find((a) => (a.title || "").toLowerCase().includes("nome") && !(a.title || "").toLowerCase().includes("empresa"));
    const phoneField = sub.answers?.find((a) => (a.title || "").toLowerCase().includes("telefone") || (a.title || "").toLowerCase().includes("whatsapp"));
    return { name: nameField?.value || sub.answers?.[0]?.value || "—", phone: phoneField?.value || "—" };
  }

  return (
    <>
      <div className="adm-section-title">SINCRONIZAR FORMS.APP</div>

      {setupSql && (
        <div className="adm-ficha-section">
          <h2 className="adm-ficha-section-title">Setup Necessario</h2>
          <p style={{ color: "#F97316", fontSize: 13, marginBottom: 12 }}>Execute este SQL no Supabase:</p>
          <pre style={{ background: "rgba(255,255,255,.04)", padding: 16, borderRadius: 4, fontSize: 12, overflow: "auto", color: "#E2DDD4" }}>{setupSql}</pre>
          <button className="adm-btn-insights" onClick={runSetup} disabled={setupLoading} style={{ marginTop: 12 }}>{setupLoading ? "Verificando..." : "Verificar novamente"}</button>
        </div>
      )}

      {(setupDone || !setupSql) && (
        <>
          <div className="adm-ficha-section">
            <h2 className="adm-ficha-section-title">1. Importar Respostas</h2>
            <p style={{ color: "rgba(226,221,212,.5)", fontSize: 13, marginBottom: 12 }}>Cole os dados ou arraste um arquivo. Aceita CSV, JSON, TXT ou texto copiado.</p>
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{ padding: 20, border: `2px dashed ${dragOver ? "#C9A84C" : "rgba(255,255,255,.1)"}`, borderRadius: 6, textAlign: "center", cursor: "pointer", marginBottom: 12, background: dragOver ? "rgba(201,168,76,.05)" : "transparent", transition: "all .2s" }}
            >
              <div style={{ fontSize: 13, color: "rgba(226,221,212,.5)" }}>Arraste um arquivo ou <span style={{ color: "#C9A84C", textDecoration: "underline" }}>clique para selecionar</span></div>
              <div style={{ fontSize: 11, color: "rgba(226,221,212,.25)", marginTop: 4 }}>.csv, .json, .txt</div>
              <input ref={fileRef} type="file" accept=".csv,.json,.txt,.tsv" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>
            <div style={{ fontSize: 12, color: "rgba(226,221,212,.3)", textAlign: "center", margin: "8px 0" }}>ou cole diretamente:</div>
            <textarea className="adm-notes" rows={5} placeholder="Cole aqui os dados do Forms.app..." value={textInput} onChange={(e) => handleTextChange(e.target.value)} style={{ fontFamily: "monospace", fontSize: 11 }} />

            {detectedFormat && (
              <div style={{ marginTop: 12, padding: 12, background: "rgba(255,255,255,.03)", borderRadius: 4, border: "1px solid rgba(255,255,255,.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ color: "#22C55E", fontSize: 16 }}>&#10003;</span>
                  <span style={{ fontSize: 13 }}>Formato: <strong style={{ color: "#C9A84C" }}>{detectedFormat}</strong> — <strong style={{ color: "#22C55E" }}>{parsed.length}</strong> submissoes</span>
                </div>
                {parsed.length > 0 && (
                  <div style={{ maxHeight: 180, overflow: "auto" }}>
                    <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                      <thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,.1)" }}><th style={{ textAlign: "left", padding: "4px 8px", color: "rgba(226,221,212,.4)" }}>#</th><th style={{ textAlign: "left", padding: "4px 8px", color: "rgba(226,221,212,.4)" }}>Nome</th><th style={{ textAlign: "left", padding: "4px 8px", color: "rgba(226,221,212,.4)" }}>Tel</th></tr></thead>
                      <tbody>{parsed.map((sub, i) => { const p = getPreview(sub); return (<tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,.04)" }}><td style={{ padding: "4px 8px", color: "rgba(226,221,212,.3)" }}>{i + 1}</td><td style={{ padding: "4px 8px" }}>{p.name}</td><td style={{ padding: "4px 8px", color: "rgba(226,221,212,.5)" }}>{p.phone}</td></tr>); })}</tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            <button className="adm-btn-insights" onClick={handleImport} disabled={importing || parsed.length === 0} style={{ marginTop: 12, opacity: parsed.length === 0 ? 0.4 : 1 }}>
              {importing ? "Importando..." : `Importar ${parsed.length} submissoes`}
            </button>
            {importResult && (
              <div style={{ marginTop: 16, padding: 16, background: "rgba(255,255,255,.03)", borderRadius: 4, fontSize: 13 }}>
                <p>Total: <strong>{importResult.total}</strong></p>
                <p style={{ color: "#22C55E" }}>Vinculados: <strong>{importResult.matched}</strong></p>
                <p style={{ color: "#EAB308" }}>Ja vinculados: <strong>{importResult.already_matched}</strong></p>
                <p style={{ color: "#EF4444" }}>Sem match: <strong>{importResult.unmatched_stored}</strong></p>
              </div>
            )}
          </div>

          <div className="adm-ficha-section">
            <h2 className="adm-ficha-section-title">2. Re-sincronizar Pendentes</h2>
            <p style={{ color: "rgba(226,221,212,.5)", fontSize: 13, marginBottom: 12 }}>Tenta re-vincular submissoes pendentes com leads existentes.</p>
            <button className="adm-btn-insights" onClick={handleSync} disabled={syncing}>{syncing ? "Sincronizando..." : "Re-sincronizar Agora"}</button>
            {syncResult && (
              <div style={{ marginTop: 16, padding: 16, background: "rgba(255,255,255,.03)", borderRadius: 4, fontSize: 13 }}>
                <p>Pendentes: <strong>{syncResult.total_unmatched}</strong></p>
                <p style={{ color: "#22C55E" }}>Sincronizados: <strong>{syncResult.synced}</strong></p>
                <p style={{ color: "#EF4444" }}>Sem match: <strong>{syncResult.still_unmatched}</strong></p>
              </div>
            )}
          </div>

          <div className="adm-ficha-section">
            <h2 className="adm-ficha-section-title">3. Vincular Manualmente ({unmatched.filter((u) => !u.matched).length})</h2>
            {unmatched.filter((u) => !u.matched).length === 0 ? (
              <p style={{ color: "rgba(226,221,212,.3)", fontSize: 14 }}>Tudo vinculado!</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {unmatched.filter((u) => !u.matched).map((sub) => (
                  <div key={sub.id} style={{ padding: 14, background: "rgba(255,255,255,.03)", borderRadius: 4, border: "1px solid rgba(255,255,255,.06)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{sub.name_candidates?.[0] || "Sem nome"}</div>
                        <div style={{ fontSize: 12, color: "rgba(226,221,212,.4)", marginTop: 4 }}>Tel: {sub.phone_digits || "—"} &middot; {new Date(sub.created_at).toLocaleString("pt-BR")}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <select id={`link-sel-${sub.id}`} style={{ padding: "6px 8px", background: "#0D1117", color: "#E2DDD4", border: "1px solid rgba(255,255,255,.1)", borderRadius: 4, fontSize: 12, maxWidth: 200 }} defaultValue="">
                          <option value="" disabled>Vincular a...</option>
                          {availableLeads.map((l) => <option key={l.id} value={l.id}>{l.nome} ({l.whatsapp})</option>)}
                        </select>
                        <button className="adm-btn-insights" style={{ padding: "6px 12px", fontSize: 12 }} disabled={linking === sub.id} onClick={() => { const sel = document.getElementById(`link-sel-${sub.id}`) as HTMLSelectElement; if (sel?.value) handleManualLink(sub.id, parseInt(sel.value, 10)); }}>
                          {linking === sub.id ? "..." : "Vincular"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
