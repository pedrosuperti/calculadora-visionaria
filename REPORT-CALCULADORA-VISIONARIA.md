# Calculadora Visionaria — Report Completo

## O que e

A Calculadora Visionaria e uma ferramenta de qualificacao de leads baseada em IA que usa o **Metodo V.I.S.O.R.** para identificar oportunidades de negocio escondidas no mercado do usuario. Ela gera 3 ideias personalizadas de negocio com projecoes financeiras, e classifica cada lead por potencial de compra.

**Em resumo:** o visitante entra como curioso, passa por um diagnostico completo, recebe ideias reais geradas por IA, e sai qualificado e ranqueado para o time de vendas.

---

## Publico-alvo

- Empresarios, profissionais liberais e infoprodutores
- Faturamento tipico: R$10k a R$1M+/mes
- Buscam escalar com IA, sair da operacao, e criar receita passiva
- Dores comuns: dependencia da propria presenca, teto de faturamento, concorrencia copiando

---

## Etapas da Calculadora (Funil do Usuario)

| Etapa | O que acontece | Dado coletado |
|-------|---------------|---------------|
| **0 — Nome** | Coleta o primeiro nome | `nome` |
| **1 — Mercado** | Descreve o negocio e publico. Pode enviar foto da bio do Instagram | `mercado` |
| **1b — Confirmacao** | IA valida o mercado, mostra setor, TAM estimado, acesso atual (~2%) vs potencial com IA (8-15x) | `mercadoConfirmado` |
| **2 — Dores** | Seleciona dores de uma lista de 7 opcoes + campo livre | `dores` |
| **3 — Desejos** | Seleciona aspiracoes de uma lista de 6 opcoes + campo livre | `desejos` |
| **4 — Analise** | Tela de progresso mostrando a IA "escaneando" o mercado em tempo real | — |
| **5a/5b/5c — 3 Ideias** | IA gera 3 ideias de negocio personalizadas com potencial anual, tempo de ROI, dificuldade, riscos, projecoes 6/12/24 meses | `ideias` |
| **6 — Qualificacao** | Coleta WhatsApp, faturamento, tamanho de equipe, urgencia, capacidade de investimento | `whatsapp`, `faturamento`, `equipe`, `urgencia`, `investimento` |
| **7 — Plano 90 Dias** | Mostra plano de acao personalizado: semanas 1-4 + meses 2-3 | — |
| **8 — Scores** | Exibe Score Atual (25-50) vs Score Visionario (60-92) + riqueza total a destravar | `internal_score`, `tier`, `top_percent` |
| **9 — CTA Final** | Hot/Warm: oferta de sessao estrategica gratuita (valor R$1.000). Cold: PDF do plano | Lead salvo no banco |

---

## Sistema de Scoring (Qualificacao Automatica)

O score e calculado automaticamente com base em 5 dimensoes:

| Dimensao | Peso Max | Criterio de pontuacao maxima |
|----------|----------|------------------------------|
| **Faturamento** | 30 pts | R$1M-5M/mes = 30 pts |
| **Investimento** | 25 pts | Acima de R$30k = 25 pts |
| **Urgencia** | 25 pts | "Preciso resolver agora" = 25 pts |
| **Equipe** | 10 pts | 6-15 ou 15+ pessoas = 10 pts |
| **Dores-chave** | 10 pts | "Dependo da presenca" + "Bati no teto" = 5+5 pts |

**Score maximo teorico: ~100 pontos**

### Classificacao por Tier

| Tier | Score | % dos leads | Significado |
|------|-------|-------------|-------------|
| **HOT** | 70+ | ~8% | Alta capacidade + urgencia alta. Prioridade maxima |
| **WARM** | 40-69 | ~25% | Potencial real, mas com gaps (urgencia ou investimento menores) |
| **COLD** | <40 | ~48% | Explorando, inicio de jornada, baixo investimento |

### Top Percent (Ranking)

| Score | Ranking | Significado |
|-------|---------|-------------|
| 85+ | Top 3% | Rarissimo — melhor que 97% dos perfis |
| 70-84 | Top 8% | Excepcional |
| 55-69 | Top 15% | Acima da media |
| 40-54 | Top 25% | Media-alta |
| <40 | Top 40% | Maioria |

---

## O que Acontece Depois (Pos-Calculadora)

1. **Lead salvo no banco** com todos os dados + score + tier
2. **Alerta automatico** no dashboard se for HOT e nao foi contactado em 1h
3. **Time de vendas** visualiza na Central de Leads
4. **Forms.app** envia formulario de aprofundamento (sincronizado via webhook)
5. **Sessao estrategica** oferecida para Hot e Warm (Calendly)

---

## Central de Leads (Dashboard Admin)

Acesso: `calculadora.pedrosuperti.com.br/admin`

### KPIs do Topo

| KPI | O que mostra |
|-----|-------------|
| Total Leads | Todos os leads qualificados |
| Hot / Warm / Cold | Quantidade por tier |
| Aplicaram | Completaram o Forms.app |
| Agendaram | Marcaram sessao estrategica |
| Score Medio | Media do internal_score de todos |
| Conv. Rate | (Aplicaram / Total) x 100% |

### Filtros e Busca

- **Por Tier:** All / Hot / Warm / Cold
- **Ordenacao:** Data (mais recente) / Score (mais alto) / Tier / Nome
- **Busca:** Por nome, descricao do mercado, ou telefone

### Smart Tags (Tags Automaticas)

O sistema gera tags automaticas baseadas nos dados do lead:

| Tag | Criterio |
|-----|----------|
| **URGENTE** | Urgencia = "Preciso resolver agora" |
| **PODER DE COMPRA** | Investimento >= R$15k |
| **MOTIVADO** | 3+ dores selecionadas |
| **USA IA** | Selecionou "nao sei usar IA" como dor |
| **TEM EQUIPE** | Equipe >= 6 pessoas |
| **SOLO** | Equipe = "So eu" |
| **SEM MKT** | Mercado muito curto/vago |
| **TOP 10%** | Score >= 75 |

### Ficha do Lead (Detalhe)

Cada lead tem uma ficha completa com:

- **Perfil:** Nome, mercado, WhatsApp, score, tier, ranking
- **Timeline:** Lead qualificado → Contactado → Aplicou → Agendou
- **Qualificacao:** Faturamento, equipe, urgencia, investimento, dores
- **Forms.app:** Respostas do formulario de aprofundamento (se preencheu)
- **Notas:** Campo livre para o time de vendas escrever observacoes
- **Status de Contato:** Seletor para atualizar o status (novo → contactado → agendou, etc.)
- **Insights IA:** Botao para gerar analise inteligente com sugestoes de abordagem

### Insights IA (por lead)

Ao clicar "Gerar Insights", a IA analisa o perfil e retorna:

- Maior dor identificada
- Ponto forte do lead
- Ponto fraco / objecao provavel
- 3 sugestoes de abordagem para vendas
- Conexao com o produto Ignition
- Produto ideal recomendado
- Probabilidade de fechamento (Alta/Media/Baixa)
- **Frase-gancho para WhatsApp** (pronta para copiar e enviar)
- Alertas (restricoes financeiras, objecoes, etc.)

---

## Status de Contato (Pipeline de Vendas)

| Status | Cor | Significado | Proximo passo |
|--------|-----|-------------|---------------|
| **Novo** | Cinza | Acabou de entrar. Ninguem contactou ainda | Contactar |
| **Contactado** | Dourado | Time enviou primeira mensagem/ligou | Aguardar resposta |
| **Agendou** | Verde | Marcou sessao estrategica | Fazer a sessao |
| **Sem Resposta** | Laranja | Nao respondeu as tentativas de contato | Tentar novamente ou descartar |
| **Descartado** | Vermelho | Nao tem fit. Nao vale mais perseguir | Encerrado |

---

## Funil de Conversao

```
Visitantes da Calculadora
    ↓
Completaram todas as etapas (Leads)    ← Total Leads
    ↓
Contactados pelo time                  ← Contactado + Agendou
    ↓
Preencheram Forms.app                  ← Aplicaram
    ↓
Agendaram sessao estrategica           ← Agendaram
    ↓
Fecharam (Ignition)                    ← Objetivo final
```

---

## Integracao Forms.app

- Formulario de aprofundamento enviado apos a calculadora
- **Sincronizacao automatica** via webhook: quando alguem preenche, o sistema tenta casar com o lead pelo telefone ou nome
- **Sincronizacao manual** disponivel em "Sync Forms.app" no painel (para casos que nao casaram automaticamente)
- Dados do Forms.app ficam visiveis na ficha do lead

---

## Alertas Automaticos

| Alerta | Trigger | Acao esperada |
|--------|---------|---------------|
| **Leads HOT sem contato (1h+)** | Lead HOT criado ha mais de 1 hora, status = novo | Contactar imediatamente |
| **Leads HOT/WARM sem contato (30min+)** | Lead qualificado ha mais de 30 minutos | Priorizar contato |

---

## Analytics Disponiveis

### Aba Leads
- Leads por dia (grafico 14 dias)
- Distribuicao por tier (pizza)
- Top mercados por volume
- Distribuicao de faturamento
- Distribuicao de investimento
- Distribuicao de urgencia
- Histograma de scores
- Status de contato (barras)
- Funil de conversao

### Aba Calculadora
- Total de sessoes / pageviews / completions
- Taxa de conclusao
- Dispositivos (mobile/tablet/desktop)
- Navegadores (Chrome/Safari/Firefox/Edge)
- Sistemas operacionais (iOS/Android/Windows/Mac)
- Idiomas com bandeiras
- Fonte de trafego (referrer)
- Paises (mapa mundial)
- Cidades mais frequentes
- Funil por etapa da calculadora
- Analise de dropoff (onde as pessoas abandonam)

---

## Resumo para Treinamento do Time

### Prioridades de Atendimento

1. **HOT com status NOVO** → contato imediato (idealmente em 15 minutos)
2. **HOT ja contactado sem resposta** → segundo follow-up
3. **WARM com status NOVO** → contato no mesmo dia
4. **WARM que aplicou (Forms.app)** → prioridade elevada, esta engajado
5. **COLD** → nao contactar proativamente, apenas se engajar por conta propria

### Como Usar os Insights IA

1. Abra a ficha do lead
2. Clique em "Gerar Insights"
3. Leia a frase-gancho sugerida
4. Adapte ao seu estilo e envie pelo WhatsApp
5. Use as sugestoes de abordagem como roteiro da conversa
6. Anote a probabilidade de fechamento para priorizar seu tempo

### Fluxo Diario Recomendado

1. Abrir dashboard → checar alertas vermelhos (HOT sem contato)
2. Filtrar por HOT → contactar todos os novos
3. Verificar WARM que aplicaram no Forms.app → contato prioritario
4. Atualizar status de cada lead apos contato
5. Gerar Insights IA para leads que vao para sessao estrategica
6. Fim do dia: revisar "Sem Resposta" e decidir re-contato ou descarte
