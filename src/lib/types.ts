export interface FormData {
  mercado: string;
  pais: string;
  ticket: string;
  anos: string;
  publico: string;
  problema: string;
  receita_atual: string;
  modelo_atual: string;
}

export interface NivelData {
  label: string;
  descricao: string;
  potencial_anual: number;
  clientes_necessarios: number;
  exemplo_empresa: string;
  teto: string;
}

export interface ModeloAlternativo {
  modelo: string;
  descricao: string;
  potencial_anual: number;
}

export interface IAMudaTudo {
  antes: string;
  depois: string;
  janela: string;
}

export interface SugestaoFoco {
  tipo: string;
  sugestao: string;
  potencial_anual: number;
  motivo: string;
}

export interface DiagnosticoResult {
  setor_formatado: string;
  pais_mercado: string;
  profissionais_total: number;
  empresas_total: number;
  tam_anual: number;
  ticket_sugerido_min: number;
  ticket_sugerido_max: number;
  anos_experiencia: number;
  nivel_n1: NivelData;
  nivel_n2: NivelData;
  nivel_n3: NivelData;
  modelo_sugerido_nivel: string;
  modelos_alternativos: ModeloAlternativo[];
  ia_muda_tudo: IAMudaTudo;
  insight: string;
  insight_n3: string;
  benchmark_mundial: string;
  concentracao_regiao: string;
  sugestoes_foco: SugestaoFoco[];
  conselho_visionario: string;
}

export type Step = "form" | "drilling" | "result";
