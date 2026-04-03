// Wizard step identifiers
export type WizardStep = 0 | 1 | "1b" | 2 | 3 | 4 | "5a" | "5b" | "5c" | 6 | 7 | 8 | 9;

// All wizard data collected across steps
export interface WizardData {
  nome: string;
  mercado: string;
  bioImagem: string | null; // base64 data URL from bio screenshot
  mercadoConfirmado: ConfirmResult | null;
  dores: string[];
  doresCustom: string;
  desejos: string[];
  desejosCustom: string;
  // Step 6 qualification
  whatsapp: string;
  faturamento: string;
  equipe: string;
  urgencia: string;
  investimento: string;
}

// API /confirm response (Step 1b)
export interface ConfirmResult {
  setor_formatado: string;
  descricao: string;
  tam_estimado: number;
}

// Each idea from /diagnose (Steps 5a/5b/5c)
export interface IdeiaRiqueza {
  nome: string;
  descricao: string;
  potencial_anual: number;
  tempo_retorno_dias: number;
  concorrencia: "Baixo" | "Medio" | "Alto";
  dificuldade: "Facil" | "Medio" | "Avancado";
  cuidados: string;
  usa_ia: boolean;
  como_usa_ia: string;
  projecao_6m?: number;
  projecao_12m?: number;
  projecao_24m?: number;
}

// 90-day plan (Step 7)
export interface Plano90Dias {
  semanas_1_2: string;
  semanas_3_4: string;
  mes_2: string;
  mes_3: string;
  horas_semana: number;
  janela_ia: string;
}

// Dual score data (Step 8)
export interface ScoreData {
  score_atual: number; // 25-45
  bloqueios: string[]; // 3 items
  score_visionario: number; // 65-90
  potenciais: string[]; // 3 items
  riqueza_total: number; // sum of 3 ideas' potencial_anual
}

// Full /diagnose response
export interface DiagnoseResult {
  ideias: IdeiaRiqueza[]; // exactly 3
  plano: Plano90Dias;
  scores: ScoreData;
  insight: string;
}

// Lead qualification result (Step 9)
export interface LeadResult {
  qualified: boolean;
  tier: "hot" | "warm" | "cold";
  internalScore: number;
  topPercent: number; // e.g. 8 = top 8%
}
