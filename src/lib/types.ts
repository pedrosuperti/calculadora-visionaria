export interface FormData {
  setor: string;
  faturamento: number;
  ticketMedio: number | null;
  clientesAtivos: number | null;
  anosNegocio: number | null;
  maiorGargalo: string;
  usoIA: string;
}

export interface Ideia {
  nome: string;
  descricao: string;
  impactoMin: number;
  impactoMax: number;
  prazo: string;
  fonte: string;
}

export interface IdeiaBilhao {
  tipo: "novo_produto" | "recorrencia" | "novo_mercado";
  nome: string;
  descricao: string;
  visao12a18m: string;
  dadoMercado: string;
  fonte: string;
  impactoMin: number;
  impactoMax: number;
}

export interface Projecoes {
  faturamento6mSemMudanca: number;
  faturamento6mComIdeias: number;
  faturamento12mSemMudanca: number;
  faturamento12mComIdeias: number;
}

export interface Valuation {
  estimativaAtual: number;
  potencialComIdeias: number;
  multiploSetor: number;
}

export interface DiagnosticoResult {
  ideiasDoMilao: Ideia[];
  ideiasDoMilhao: Ideia[];
  ideiaDoBlihao: IdeiaBilhao;
  projecoes: Projecoes;
  valuation: Valuation;
  riquezaDesbloqueavel12m: number;
  insightFinal: string;
}

export type Screen = "form" | "loading" | "milao" | "milhao" | "bilhao" | "resumo" | "cta";

export interface LeadData {
  nome: string;
  whatsapp: string;
}

export const GARGALO_OPTIONS = [
  "Atrair novos clientes",
  "Converter leads em vendas",
  "Reter clientes e aumentar recorrência",
  "Escalar sem perder qualidade",
  "Automatizar processos operacionais",
];

export const USO_IA_OPTIONS = [
  "Não uso IA no meu negócio",
  "Uso de forma básica (ChatGPT, etc.)",
  "Já uso IA integrada em processos",
];
