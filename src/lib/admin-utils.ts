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

// Known Forms.app question patterns for re-splitting concatenated answers
const FORM_QUESTIONS = [
  "Telefone que gostaria de ser contatado",
  "Nome de sua empresa",
  "Quantos Funcionários tem na empresa",
  "Quantos Funcionarios tem na empresa",
  "Qual é faturamento mensal",
  "Qual e faturamento mensal",
  "Seu site",
  "Instagram",
  "Qual o ramo de atuação",
  "Qual o ramo de atuacao",
  "Quais os problemas ou desafios",
  "Qual o seu nível de urgência",
  "Qual o seu nivel de urgencia",
  "Como você faz o marketing",
  "Como voce faz o marketing",
  "Quanto investe nele",
  "Quais canais ou meios utiliza",
  "Qual você diria ser seu Fator X",
  "Qual voce diria ser seu Fator X",
  "O quanto você já aplica Inteligência Artificial",
  "O quanto voce ja aplica Inteligencia Artificial",
  "Há algo importante",
  "Ha algo importante",
  "Se possível, que seja o mesmo do seu WhatsApp",
];

function reSplitAnswer(question: string, answer: string): { question: string; answer: string }[] {
  // Check if the answer contains embedded questions (from bad import)
  const results: { question: string; answer: string }[] = [];
  let remaining = answer;

  // Find all embedded question positions
  const splits: { pos: number; q: string }[] = [];
  for (const fq of FORM_QUESTIONS) {
    const idx = remaining.indexOf(fq);
    if (idx > 0) splits.push({ pos: idx, q: fq });
  }

  if (splits.length === 0) {
    return [{ question, answer }];
  }

  // Sort by position
  splits.sort((a, b) => a.pos - b.pos);

  // First part is the actual answer to the original question
  const firstAnswer = remaining.slice(0, splits[0].pos).trim();
  if (firstAnswer) results.push({ question, answer: firstAnswer });

  // Extract each embedded Q&A
  for (let i = 0; i < splits.length; i++) {
    const start = splits[i].pos + splits[i].q.length;
    const end = i + 1 < splits.length ? splits[i + 1].pos : remaining.length;
    let val = remaining.slice(start, end).replace(/^\s*[?:.\s]+/, "").trim();
    if (val) results.push({ question: splits[i].q, answer: val });
  }

  return results.length > 0 ? results : [{ question, answer }];
}

export function parseFormsAppData(data: Record<string, unknown> | null): { question: string; answer: string }[] {
  if (!data) return [];
  let results: { question: string; answer: string }[] = [];
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
        if (q && ans) results.push(...reSplitAnswer(q, ans));
      }
    }
  }
  if (results.length === 0) {
    const skip = new Set(["answers", "fields", "responses", "submissionId", "formId", "createdAt", "updatedAt"]);
    for (const [k, v] of Object.entries(data)) {
      if (skip.has(k) || v === null || v === undefined || v === "") continue;
      const val = typeof v === "object" ? JSON.stringify(v) : String(v);
      results.push(...reSplitAnswer(k, val));
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

export function detectFormMismatch(lead: Lead): { mismatch: boolean; formName: string; formPhone: string } | null {
  if (!lead.formsapp_data) return null;
  const data = lead.formsapp_data as Record<string, unknown>;
  const answers = (data.answers || data.fields || data.responses) as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(answers)) return null;

  let formName = "";
  let formPhone = "";
  for (const a of answers) {
    const title = ((a.title ?? a.question ?? a.label ?? "") as string).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const value = String(a.value ?? a.answer ?? a.response ?? "");
    if (title.includes("nome") && !title.includes("empresa")) formName = value;
    if (title.includes("telefone") || title.includes("whatsapp")) formPhone = value;
  }
  if (!formName) return null;

  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").trim();
  const leadNorm = norm(lead.nome || "");
  const formNorm = norm(formName);
  if (leadNorm === formNorm) return null;

  const leadParts = leadNorm.split(/\s+/);
  const formParts = formNorm.split(/\s+/);

  if (leadParts.length >= 2 && formParts.length >= 2 && leadParts[0] === formParts[0] && leadParts[leadParts.length - 1] === formParts[formParts.length - 1]) return null;
  if (leadParts.length === 1 && formParts[0] === leadParts[0]) {
    const leadDigits = (lead.whatsapp || "").replace(/\D/g, "");
    const formDigits = formPhone.replace(/\D/g, "");
    if (leadDigits.length >= 8 && formDigits.length >= 8 && leadDigits.slice(-8) === formDigits.slice(-8)) return null;
  }
  if ((leadNorm.includes(formNorm) || formNorm.includes(leadNorm)) && Math.min(leadNorm.length, formNorm.length) >= 10) return null;
  const leadDigits = (lead.whatsapp || "").replace(/\D/g, "");
  const formDigits = formPhone.replace(/\D/g, "");
  if (leadDigits.length >= 8 && formDigits.length >= 8 && leadDigits.slice(-8) === formDigits.slice(-8)) return null;

  return { mismatch: true, formName, formPhone };
}
