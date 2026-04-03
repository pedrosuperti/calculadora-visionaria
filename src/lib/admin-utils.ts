import type { Lead } from "./admin-types";

export function timeAgo(dateStr: string): string {
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

export function parseFormsAppData(data: Record<string, unknown> | null): { question: string; answer: string }[] {
  if (!data) return [];
  const results: { question: string; answer: string }[] = [];
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

export function tierOrder(tier: string): number {
  if (tier === "hot") return 0;
  if (tier === "warm") return 1;
  return 2;
}

export interface SmartTag { label: string; emoji: string; color: string }

export function computeTags(lead: Lead): SmartTag[] {
  const tags: SmartTag[] = [];
  const urg = (lead.urgencia || "").toLowerCase();
  if (urg.includes("urgente") || urg.includes("ontem") || urg.includes("alto") || urg.includes("semana")) {
    tags.push({ label: "URGENTE", emoji: "🔥", color: "#EF4444" });
  }
  const fat = (lead.faturamento || "").toLowerCase();
  if (fat.includes("100 mil") || fat.includes("500 mil") || fat.includes("milhão") || fat.includes("milhao")) {
    tags.push({ label: "PODER DE COMPRA", emoji: "💰", color: "#22C55E" });
  }
  const formsAnswers = lead.formsapp_data ? parseFormsAppData(lead.formsapp_data) : [];
  const desafiosText = formsAnswers.find((a) => a.question.toLowerCase().includes("desafio"))?.answer || "";
  if ((lead.dores?.length || 0) >= 3 || desafiosText.length > 100) {
    tags.push({ label: "MOTIVADO", emoji: "💪", color: "#F97316" });
  }
  const iaText = formsAnswers.find((a) => a.question.toLowerCase().includes("ia"))?.answer?.toLowerCase() || "";
  const iaInactive = ["nada", "zero", "pouco", "muito pouco", "nada praticamente", "não", "nao", "1", "5%"];
  if (iaText && !iaInactive.some((w) => iaText === w || iaText.startsWith(w + "."))) {
    tags.push({ label: "USA IA", emoji: "🤖", color: "#A855F7" });
  }
  const eq = (lead.equipe || "").toLowerCase();
  if (eq.includes("5 a 10") || eq.includes("10 a 20") || eq.includes("20 a 50") || eq.includes("50")) {
    tags.push({ label: "TEM EQUIPE", emoji: "👥", color: "#3B82F6" });
  } else if (eq.includes("0 a 5")) {
    tags.push({ label: "SOLO", emoji: "🧍", color: "#6B7280" });
  }
  const mktText = formsAnswers.find((a) => a.question.toLowerCase().includes("marketing"))?.answer?.toLowerCase() || "";
  if (mktText && (mktText.includes("nada") || mktText.includes("zero") || mktText.includes("quase não") || mktText.includes("não faço"))) {
    tags.push({ label: "SEM MKT", emoji: "📢", color: "#EAB308" });
  }
  if (lead.top_percent > 0 && lead.top_percent <= 10) {
    tags.push({ label: "TOP 10%", emoji: "⭐", color: "#C9A84C" });
  }
  return tags;
}
