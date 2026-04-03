"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
        const q = String(obj.title || obj.question || obj.label || obj.field || "");
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
  const desafiosText = formsAnswers.find((a) => a.question.toLowerCase().includes("desafio"))?.answer || "";
  if ((lead.dores?.length || 0) >= 3 || desafiosText.length > 100) {
    tags.push({ label: "MOTIVADO", emoji: "💪", color: "#F97316" });
  }
  // Usa IA
  const iaText = formsAnswers.find((a) => a.question.toLowerCase().includes("ia"))?.answer?.toLowerCase() || "";
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
  const mktText = formsAnswers.find((a) => a.question.toLowerCase().includes("marketing"))?.answer?.toLowerCase() || "";
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

// ─── ADMIN PASSWORD ─────────────────────────────────────────────────────────

const ADMIN_PASS = "visor2026";

// ─── COMPONENT ──────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [authed, setAuthed] = useState(() => {
    if (typeof window !== "undefined") return sessionStorage.getItem("adm_auth") === "1";
    return false;
  });
  const [pass, setPass] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "hot" | "warm" | "cold">("all");
  const [sort, setSort] = useState<SortKey>("date");
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [modalTab, setModalTab] = useState<"perfil" | "aplicacao">("perfil");
  const [insights, setInsights] = useState<Record<string, unknown> | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const fetchInsights = async (lead: Lead) => {
    setInsightsLoading(true);
    setInsights(null);
    try {
      const res = await fetch("/api/admin/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const res = await fetch("/api/admin/leads");
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

  const [page, setPage] = useState<"home" | "leads" | "lead-detail" | "analytics-leads" | "analytics-calc">("home");
  const [sideOpen, setSideOpen] = useState(false);
  const [calcEvents, setCalcEvents] = useState<CalcEvent[]>([]);
  const [detailLeadId, setDetailLeadId] = useState<number | null>(null);

  const fetchCalcAnalytics = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/analytics");
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
            onKeyDown={(e) => { if (e.key === "Enter" && pass === ADMIN_PASS) { sessionStorage.setItem("adm_auth", "1"); setAuthed(true); } }}
          />
          <button onClick={() => { if (pass === ADMIN_PASS) { sessionStorage.setItem("adm_auth", "1"); setAuthed(true); } }}>ENTRAR</button>
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
          <button className={`adm-nav${page === "home" ? " active" : ""}`} onClick={() => { setPage("home"); setSideOpen(false); }}>Dashboard</button>
          <button className={`adm-nav${page === "leads" ? " active" : ""}`} onClick={() => { setPage("leads"); setSideOpen(false); }}>Leads</button>
          <div className="adm-nav-group">
            <div className={`adm-nav-label${page.startsWith("analytics") ? " active" : ""}`}>Analytics</div>
            <button className={`adm-nav sub${page === "analytics-leads" ? " active" : ""}`} onClick={() => { setPage("analytics-leads"); setSideOpen(false); }}>Leads</button>
            <button className={`adm-nav sub${page === "analytics-calc" ? " active" : ""}`} onClick={() => { setPage("analytics-calc"); setSideOpen(false); }}>Calculadora</button>
          </div>
        </nav>
        <div className="adm-side-actions">
          <a href="/api/admin/leads/export" className="adm-nav" download>Exportar CSV</a>
          <a href="/admin/sync" className="adm-nav">Sync Forms.app</a>
          <button className="adm-nav" onClick={fetchLeads} disabled={loading}>{loading ? "..." : "Atualizar"}</button>
        </div>
        <div className="adm-side-foot">
          <button className="adm-nav logout" onClick={() => { sessionStorage.removeItem("adm_auth"); setAuthed(false); }}>Sair</button>
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
            <button className="adm-alert-btn" onClick={() => { setFilter("hot"); setPage("leads"); }}>Ver esses leads</button>
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
                      <div key={l.id} className="adm-mini-card" onClick={() => { setSelectedLead(l); setModalTab("perfil"); setInsights(null); }}>
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
                <div key={lead.id} className={`adm-card ${lead.tier || "cold"}`} onClick={() => { setSelectedLead(lead); setModalTab("perfil"); setInsights(null); }}>
                  <div className="adm-card-left">
                    <div className="adm-card-score" style={{ borderColor: TIER_COLORS[(lead.tier || "cold") as keyof typeof TIER_COLORS] }}>{lead.internal_score || 0}</div>
                  </div>
                  <div className="adm-card-center">
                    <div className="adm-card-top">
                      <span className="adm-card-name">{lead.nome || "Sem nome"}</span>
                      <span className={`adm-card-tier ${lead.tier || "cold"}`}>{(lead.tier || "cold").toUpperCase()}</span>
                      {lead.formsapp_completed && <span className="adm-card-applied">APLICOU</span>}
                      <TagBadges lead={lead} />
                    </div>
                    <div className="adm-card-meta">
                      <span>{(lead.mercado || "—").slice(0, 45)}</span>
                      <span>{lead.faturamento || ""}</span>
                      <span>{lead.whatsapp}</span>
                    </div>
                  </div>
                  <div className="adm-card-right"><span className="adm-card-time">{lead.created_at ? timeAgo(lead.created_at) : ""}</span></div>
                </div>
              ))}
              <button className="adm-view-all" onClick={() => setPage("leads")}>VER TODOS OS LEADS</button>
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
                <div key={lead.id} className={`adm-card ${lead.tier || "cold"}`} onClick={() => { setDetailLeadId(lead.id); setInsights(null); setPage("lead-detail"); }}>
                  <div className="adm-card-left">
                    <div className="adm-card-score" style={{ borderColor: TIER_COLORS[(lead.tier || "cold") as keyof typeof TIER_COLORS] }}>{lead.internal_score || 0}</div>
                  </div>
                  <div className="adm-card-center">
                    <div className="adm-card-top">
                      <span className="adm-card-name">{lead.nome || "Sem nome"}</span>
                      <span className={`adm-card-tier ${lead.tier || "cold"}`}>{(lead.tier || "cold").toUpperCase()}</span>
                      {lead.formsapp_completed && <span className="adm-card-applied">APLICOU</span>}
                      {lead.contact_status && lead.contact_status !== "novo" && (
                        <span className="adm-card-status" style={{ color: CONTACT_COLORS[lead.contact_status] }}>{CONTACT_LABELS[lead.contact_status]}</span>
                      )}
                      <TagBadges lead={lead} />
                    </div>
                    <div className="adm-card-meta">
                      <span>{(lead.mercado || "—").slice(0, 45)}</span>
                      <span>{lead.faturamento || ""}</span>
                      <span>{lead.whatsapp}</span>
                    </div>
                  </div>
                  <div className="adm-card-right"><span className="adm-card-time">{lead.created_at ? timeAgo(lead.created_at) : ""}</span></div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ═══ LEAD DETAIL (FICHA) ═══ */}
        {page === "lead-detail" && (() => {
          const dl = leads.find((l) => l.id === detailLeadId);
          if (!dl) return <div style={{ padding: 40, textAlign: "center", color: "rgba(226,221,212,.4)" }}>Lead não encontrado. <button className="adm-modal-ficha-link" onClick={() => setPage("leads")}>← Voltar</button></div>;
          const qa = dl.formsapp_data ? parseFormsAppData(dl.formsapp_data) : [];
          const tierColor = TIER_COLORS[(dl.tier || "cold") as keyof typeof TIER_COLORS];
          const whatsappMsg = insights?.frase_gancho
            ? `Oi ${dl.nome || ""}, tudo bem? Me chamo Alê, da equipe do Pedro Superti. ${insights.frase_gancho}`
            : `Oi ${dl.nome || ""}, tudo bem? Me chamo Alê. Sou da equipe do Pedro Superti. Vi que você usou a Calculadora V.I.S.O.R. e seu perfil chamou atenção. Posso te fazer umas perguntas rápidas?`;
          return (
            <>
              {/* Back bar */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <button className="adm-modal-ficha-link" onClick={() => { setPage("leads"); setInsights(null); }} style={{ fontSize: 14 }}>← Voltar para Leads</button>
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
                        await fetch("/api/admin/leads/update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: dl.id, contact_status: s }) });
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
                  onBlur={() => fetch("/api/admin/leads/update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: dl.id, notes: dl.notes || "" }) })}
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
                <button className="adm-ficha-copy" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/admin/lead/${dl.id}`); }}>
                  📋 Copiar link da ficha
                </button>
              </div>
            </>
          );
        })()}

      </main>

      {/* ═══ DETAIL MODAL ═══ */}
      {selectedLead && (
        <div className="adm-overlay" onClick={() => { setSelectedLead(null); setInsights(null); }}>
          <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
            <button className="adm-modal-x" onClick={() => { setSelectedLead(null); setInsights(null); }}>✕</button>

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
                  <TagBadges lead={selectedLead} />
                  <span className="adm-modal-time">{selectedLead.created_at ? timeAgo(selectedLead.created_at) : ""} atrás</span>
                </div>
              </div>
            </div>

            {/* Score bar */}
            <div className="adm-scorebar">
              <div className="adm-scorebar-fill" style={{ width: `${Math.min(selectedLead.internal_score || 0, 100)}%`, background: TIER_COLORS[(selectedLead.tier || "warm") as keyof typeof TIER_COLORS] }} />
              <div className="adm-scorebar-marks">
                <span style={{ left: "40%" }}>40</span>
                <span style={{ left: "70%" }}>70</span>
              </div>
            </div>

            <button className="adm-modal-ficha-link" onClick={() => { setDetailLeadId(selectedLead.id); setSelectedLead(null); setPage("lead-detail"); }}>
              Abrir ficha completa →
            </button>

            {/* Tabs */}
            <div className="adm-modal-tabs">
              <button className={`adm-modal-tab${modalTab === "perfil" ? " active" : ""}`} onClick={() => setModalTab("perfil")}>
                📊 Perfil
              </button>
              <button
                className={`adm-modal-tab${modalTab === "aplicacao" ? " active" : ""}${selectedLead.formsapp_completed ? " has-data" : ""}`}
                onClick={() => setModalTab("aplicacao")}
              >
                📋 Aplicação {selectedLead.formsapp_completed && <span className="adm-tab-badge">!</span>}
              </button>
            </div>

            {/* ─── TAB: PERFIL ─── */}
            {modalTab === "perfil" && (
              <>
                {/* Lead timeline */}
                <div className="adm-timeline">
                  <div className="adm-timeline-item done">
                    <div className="adm-timeline-dot" />
                    <div className="adm-timeline-text">
                      <strong>Calculadora V.I.S.O.R.</strong>
                      <span>{selectedLead.created_at ? new Date(selectedLead.created_at).toLocaleString("pt-BR") : "—"}</span>
                    </div>
                  </div>
                  <div className={`adm-timeline-item${selectedLead.formsapp_completed ? " done" : ""}`}>
                    <div className="adm-timeline-dot" />
                    <div className="adm-timeline-text">
                      <strong>Aplicação Forms.app</strong>
                      <span>{selectedLead.formsapp_completed ? (selectedLead.formsapp_at ? new Date(selectedLead.formsapp_at).toLocaleString("pt-BR") : "Sim") : "Pendente"}</span>
                    </div>
                  </div>
                  <div className={`adm-timeline-item${selectedLead.contact_status && selectedLead.contact_status !== "novo" ? " done" : ""}`}>
                    <div className="adm-timeline-dot" />
                    <div className="adm-timeline-text">
                      <strong>Contato realizado</strong>
                      <span>{selectedLead.contact_status && selectedLead.contact_status !== "novo" ? CONTACT_LABELS[selectedLead.contact_status] : "Pendente"}</span>
                    </div>
                  </div>
                  <div className={`adm-timeline-item${selectedLead.contact_status === "agendou" ? " done" : ""}`}>
                    <div className="adm-timeline-dot" />
                    <div className="adm-timeline-text">
                      <strong>Sessão agendada</strong>
                      <span>{selectedLead.contact_status === "agendou" ? "Confirmado" : "Pendente"}</span>
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
                    <label>Mercado</label>
                    <span>{selectedLead.mercado || "—"}</span>
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
              </>
            )}

            {/* ─── TAB: APLICAÇÃO ─── */}
            {modalTab === "aplicacao" && (
              <>
                {!selectedLead.formsapp_completed ? (
                  <div className="adm-forms-empty">
                    <span className="adm-forms-empty-icon">📋</span>
                    <p>Este lead ainda não preencheu o formulário de aplicação.</p>
                    <p className="adm-forms-empty-hint">Quando preencher, as respostas e insights aparecerão aqui automaticamente.</p>
                  </div>
                ) : (
                  <>
                    {/* Forms.app responses */}
                    {selectedLead.formsapp_data && (() => {
                      const qa = parseFormsAppData(selectedLead.formsapp_data);
                      return qa.length > 0 ? (
                        <div className="adm-forms-section">
                          <div className="adm-forms-header">
                            <span className="adm-forms-icon">📋</span>
                            <strong>Respostas da Aplicação</strong>
                            <span className="adm-forms-date">{selectedLead.formsapp_at ? new Date(selectedLead.formsapp_at).toLocaleString("pt-BR") : ""}</span>
                          </div>
                          <div className="adm-forms-list">
                            {qa.map((item, i) => (
                              <div key={i} className="adm-forms-item">
                                <div className="adm-forms-q">{item.question}</div>
                                <div className="adm-forms-a">{item.answer}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}

                    {/* AI Insights */}
                    <div className="adm-insights-section">
                      {!insights && !insightsLoading && (
                        <button className="adm-btn-insights" onClick={() => fetchInsights(selectedLead)}>
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

                          <button className="adm-btn-insights regen" onClick={() => fetchInsights(selectedLead)}>
                            🔄 Regenerar Insights
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}

            {/* Actions — always visible */}
            <div className="adm-modal-actions">
              <a
                href={`https://wa.me/${(selectedLead.whatsapp || "").replace(/\D/g, "")}?text=${encodeURIComponent(
                  insights?.frase_gancho
                    ? `Oi ${selectedLead.nome || ""}, tudo bem? Me chamo Alê, da equipe do Pedro Superti. ${insights.frase_gancho}`
                    : `Oi ${selectedLead.nome || ""}, tudo bem? Me chamo Alê. Sou da equipe do Pedro Superti. Vi que você usou a Calculadora V.I.S.O.R. e seu perfil chamou atenção. Posso te fazer umas perguntas rápidas?`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="adm-btn-whatsapp"
              >
                Abrir WhatsApp {insights ? "(com frase gancho)" : ""}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
