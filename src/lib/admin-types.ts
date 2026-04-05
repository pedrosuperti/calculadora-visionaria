export interface Lead {
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

export type ContactStatus = "" | "novo" | "contactado" | "agendou" | "sem_resposta" | "descartado";

export const CONTACT_LABELS: Record<string, string> = {
  "": "Novo",
  novo: "Novo",
  contactado: "Contactado",
  agendou: "Agendou",
  sem_resposta: "Sem resposta",
  descartado: "Descartado",
};

export const CONTACT_COLORS: Record<string, string> = {
  "": "#555",
  novo: "#555",
  contactado: "#C9A84C",
  agendou: "#22C55E",
  sem_resposta: "#F97316",
  descartado: "#EF4444",
};

export const TIER_COLORS = { hot: "#F97316", warm: "#EAB308", cold: "#3B82F6" } as const;
