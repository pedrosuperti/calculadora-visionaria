-- Sync Forms.app responses into Supabase formsapp_data
-- Run in Supabase SQL Editor

-- 1. Tânia Mara Rezende
UPDATE "leads-calculadora-visionaria"
SET formsapp_completed = true, formsapp_at = COALESCE(formsapp_at, now()),
    formsapp_data = '{"answers":[{"title":"Email","value":"tania@intimapassion.com.br"},{"title":"Empresa","value":"Íntima Passion"},{"title":"Funcionários","value":"20 a 50"},{"title":"Faturamento","value":"R$500 mil a R$1 milhão"},{"title":"Site","value":"loja.intimapassion.com.br"},{"title":"Instagram","value":"@intimapassionoficial"},{"title":"Ramo","value":"Marca de moda íntima, moda praia e fitness. Venda 95% para atacado, pequenos lojistas e revendedores. Público 95% mulheres. Crescimento 20% em faturamento nos 3 meses desse ano. Margem líquida hoje 10 a 12%. Temos 20 anos de empresa. Clientes fidelizados e apaixonados pela marca."},{"title":"Desafios","value":"Negócio muito dependente da minha presença. Dificuldade em escalar, teto de faturamento 800 mil nos melhores meses. Aumentar base de clientes lojistas e abrir novos canais de venda."},{"title":"Urgência","value":"Médio: Quero logo"},{"title":"Marketing","value":"Redes sociais, tráfego pago (~5 mil mês). Eventos e feiras (~70 mil ano)."},{"title":"Fator X","value":"DNA de marca elegante, atemporal e assertividade nos produtos. Atendimento humanizado."},{"title":"IA","value":"Sim, inicialmente. Cores por IA, textos, testando IA para clientes inativos."},{"title":"Observações","value":"Quer migrar de pronta entrega para modelo misto com pedidos programados."}]}'::jsonb
WHERE whatsapp = '+5535991390173';

-- 2. Jannayna Tavares
UPDATE "leads-calculadora-visionaria"
SET formsapp_completed = true, formsapp_at = COALESCE(formsapp_at, now()),
    formsapp_data = '{"answers":[{"title":"Email","value":"jannaynapereiratavares@gmail.com"},{"title":"Empresa","value":"Laboratorio Educação do Futuro"},{"title":"Funcionários","value":"5 a 10"},{"title":"Faturamento","value":"R$10 mil a R$50 mil"},{"title":"Instagram","value":"@jannayna_tavares"},{"title":"Ramo","value":"Desenvolvimento estratégico de carreiras e posicionamento profissional."},{"title":"Desafios","value":"Atuo no one a one, depende exclusivamente de mim, valor alto e sem escalonamento."},{"title":"Urgência","value":"Urgente: Quero pra ontem"},{"title":"Marketing","value":"Invisto R$8.000 com equipe para Instagram, LinkedIn e abordagem one a one."},{"title":"Fator X","value":"Estruturo profissionais para serem reconhecidos, valorizados e bem pagos pelo que já construíram."},{"title":"IA","value":"30%"},{"title":"Observações","value":"Não"}]}'::jsonb
WHERE whatsapp = '+5586999920663';

-- 3. Erika Dias
UPDATE "leads-calculadora-visionaria"
SET formsapp_completed = true, formsapp_at = COALESCE(formsapp_at, now()),
    formsapp_data = '{"answers":[{"title":"Email","value":"atendimento@engenhotelas.com"},{"title":"Empresa","value":"Engenho Telas"},{"title":"Funcionários","value":"0 a 5"},{"title":"Faturamento","value":"R$10 mil a R$50 mil"},{"title":"Site","value":"engenhotelas.com.br"},{"title":"Instagram","value":"@engenhotelas"},{"title":"Ramo","value":"Telas mosquiteiras e blackouts, sistemas retráteis e motorizados."},{"title":"Desafios","value":"Atingimos o teto, sem capacidade física para crescer. Orçamentos manuais por mim, produção pelo sócio. Curso para formar profissionais precisa ser online mas sem conhecimento de marketing digital."},{"title":"Urgência","value":"Urgente: Quero pra ontem"},{"title":"Marketing","value":"Não faço nada no momento."},{"title":"Fator X","value":"Conhecimento do mercado e visão do negócio."},{"title":"IA","value":"Bastante! Claude treinado no negócio, 4 agentes de mkt digital e um orçamentista."},{"title":"Observações","value":"Empresa: eu (atendimento, vendas, marketing, IA) e marido (produção - conhece TUDO do mercado)."}]}'::jsonb
WHERE whatsapp = '+5521980288114';

-- 4. Cristiani Schaurich
UPDATE "leads-calculadora-visionaria"
SET formsapp_completed = true, formsapp_at = COALESCE(formsapp_at, now()),
    formsapp_data = '{"answers":[{"title":"Email","value":"cristianischaurich@gmail.com"},{"title":"Empresa","value":"Sinaliza soluções em sinalização"},{"title":"Funcionários","value":"0 a 5"},{"title":"Faturamento","value":"R$50 mil a R$100 mil"},{"title":"Instagram","value":"Sinaliza soluções em sinalização"},{"title":"Ramo","value":"Licitações, atendendo órgãos públicos (prefeituras) com placas de sinalização viária."},{"title":"Desafios","value":"Preço baixo e muita concorrência com produtos inferiores."},{"title":"Urgência","value":"Médio: Quero logo"},{"title":"Marketing","value":"Quase não faço marketing."},{"title":"Fator X","value":"Qualidade, conhecimento do produto e pessoalidade."},{"title":"IA","value":"ChatGPT"},{"title":"Observações","value":"Produção própria de toda linha de produtos."}]}'::jsonb
WHERE whatsapp = '+5551980339372';

-- 5. Oksana Prokuda
UPDATE "leads-calculadora-visionaria"
SET formsapp_completed = true, formsapp_at = COALESCE(formsapp_at, now()),
    formsapp_data = '{"answers":[{"title":"Email","value":"oksana.prokuda1@gmail.com"},{"title":"Empresa","value":"Oksana teacher"},{"title":"Funcionários","value":"0 a 5"},{"title":"Faturamento","value":"até R$10 mil"},{"title":"Instagram","value":"Teacher.oksana"},{"title":"Ramo","value":"Intérprete e guia turístico."},{"title":"Desafios","value":"Pouca procura, divulgação, achar clientes, desvalorização."},{"title":"Urgência","value":"Urgente: Quero pra ontem"},{"title":"Marketing","value":"Somente Instagram e GMN. Tráfego pago sem retorno."},{"title":"Fator X","value":"Russo é língua exótica que poucos falam. Também falo Inglês. Setor não explorado."},{"title":"IA","value":"Pouco. Uso para gerar ideias."},{"title":"Observações","value":"No fundo do poço. Dificuldades com tecnologia. Círculo vicioso: precisa investir em mídia mas sem recursos."}]}'::jsonb
WHERE whatsapp = '+5541984336872';

-- 6. Augusto Pontes Almeida
UPDATE "leads-calculadora-visionaria"
SET formsapp_completed = true, formsapp_at = COALESCE(formsapp_at, now()),
    formsapp_data = '{"answers":[{"title":"Email","value":"aupoal@yahoo.com.br"},{"title":"Empresa","value":"Geocampus"},{"title":"Funcionários","value":"0 a 5"},{"title":"Faturamento","value":"R$10 mil a R$50 mil"},{"title":"Site","value":"www.geocampus.com.br"},{"title":"Instagram","value":"euagustoalmeida"},{"title":"Ramo","value":"Georreferenciamento de imóveis rurais, mapeamento com drones, crédito rural, licenciamento ambiental, consultoria agropecuária."},{"title":"Desafios","value":"Escalar serviços e ter uma carteira de clientes."},{"title":"Urgência","value":"Alto: Quero em semanas"},{"title":"Marketing","value":"Tráfego leve e vídeos orgânicos."},{"title":"Fator X","value":"Explicar bem para o cliente o serviço que irei executar."},{"title":"IA","value":"Um pouco."},{"title":"Observações","value":"Não"}]}'::jsonb
WHERE whatsapp = '+5581999526356';

-- 7. Patricia Moreira
UPDATE "leads-calculadora-visionaria"
SET formsapp_completed = true, formsapp_at = COALESCE(formsapp_at, now()),
    formsapp_data = '{"answers":[{"title":"Email","value":"contato@abitari.com.br"},{"title":"Empresa","value":"ABITARI"},{"title":"Funcionários","value":"0 a 5"},{"title":"Faturamento","value":"R$100 mil a R$500 mil"},{"title":"Instagram","value":"@abitari"},{"title":"Ramo","value":"Móveis e decoração."},{"title":"Desafios","value":"Concorrentes na Internet, briga de preço."},{"title":"Urgência","value":"Médio: Quero logo"},{"title":"Marketing","value":"Só uso o Instagram."},{"title":"Fator X","value":"Atendimento personalizado, levamos peças na casa do cliente para experimentar sem compromisso."},{"title":"IA","value":"Só uso para editar fotos."},{"title":"Observações","value":"—"}]}'::jsonb
WHERE whatsapp = '+5521965568888';

-- 8. Augusto Rafael Barsella
UPDATE "leads-calculadora-visionaria"
SET formsapp_completed = true, formsapp_at = COALESCE(formsapp_at, now()),
    formsapp_data = '{"answers":[{"title":"Email","value":"draugusto@medicodedor.com.br"},{"title":"Empresa","value":"Tidor Clinica"},{"title":"Funcionários","value":"0 a 5"},{"title":"Faturamento","value":"R$10 mil a R$50 mil"},{"title":"Site","value":"@medicodedor"},{"title":"Instagram","value":"@tidor.clinica"},{"title":"Ramo","value":"Atendimento a pacientes de dores crônicas."},{"title":"Desafios","value":"Constância e captação de pacientes particulares."},{"title":"Urgência","value":"Médio: Quero logo"},{"title":"Marketing","value":"Indicação."},{"title":"Fator X","value":"Método como eu atendo."},{"title":"IA","value":"Diariamente."},{"title":"Observações","value":"Não"}]}'::jsonb
WHERE whatsapp = '+5511963375996';

-- 9. Tatiana Maia
UPDATE "leads-calculadora-visionaria"
SET formsapp_completed = true, formsapp_at = COALESCE(formsapp_at, now()),
    formsapp_data = '{"answers":[{"title":"Email","value":"maia.tatiana@gmail.com"},{"title":"Empresa","value":"Depyl Action - unidade Santa Efigênia"},{"title":"Funcionários","value":"5 a 10"},{"title":"Faturamento","value":"R$50 mil a R$100 mil"},{"title":"Site","value":"www.depylaction.com.br"},{"title":"Instagram","value":"@depylaction_bhsantaefigenia"},{"title":"Ramo","value":"Depilação."},{"title":"Desafios","value":"Concorrência baixando preço, lojas da franquia muito próximas, baixa recorrência, falta de inovação da franqueadora."},{"title":"Urgência","value":"Alto: Quero em semanas"},{"title":"Marketing","value":"~R$3 mil taxa franqueadora + ~R$3 mil investimento local."},{"title":"Fator X","value":"Qualidade de atendimento, muitos anos no mercado, atendimento sem hora marcada."},{"title":"IA","value":"Assinatura do ChatGPT."},{"title":"Observações","value":"Franqueadora trava preços. Precisa aumentar número de atendimentos e ticket médio."}]}'::jsonb
WHERE whatsapp = '+5534999434363';

-- 10. Luciana Nilo
UPDATE "leads-calculadora-visionaria"
SET formsapp_completed = true, formsapp_at = COALESCE(formsapp_at, now()),
    formsapp_data = '{"answers":[{"title":"Email","value":"luciananilo1@gmail.com"},{"title":"Empresa","value":"Luciana Nilo Studio Beauty"},{"title":"Funcionários","value":"5 a 10"},{"title":"Faturamento","value":"R$50 mil a R$100 mil"},{"title":"Instagram","value":"Luciananilostudiobeauty"},{"title":"Ramo","value":"Salão de beleza especializada em clientes 40+ / Estúdio de cerâmica."},{"title":"Desafios","value":"Negócio depende muito da minha presença."},{"title":"Urgência","value":"Baixo: Posso esperar alguns meses"},{"title":"Marketing","value":"Já investi muito em marketing especializado, hoje faço no orgânico."},{"title":"Fator X","value":"Análise real de resultados para modernizar mulheres 40+ / Experiências com cerâmica para criatividade."},{"title":"IA","value":"Pouco."},{"title":"Observações","value":"Não"}]}'::jsonb
WHERE whatsapp = '+5535999558336';

-- 11. Roberta Flores
UPDATE "leads-calculadora-visionaria"
SET formsapp_completed = true, formsapp_at = COALESCE(formsapp_at, now()),
    formsapp_data = '{"answers":[{"title":"Email","value":"arq_robertaflores@hotmail.com"},{"title":"Empresa","value":"Toque Final"},{"title":"Funcionários","value":"0 a 5"},{"title":"Faturamento","value":"R$50 mil a R$100 mil"},{"title":"Instagram","value":"toquefinal.suacasamerece"},{"title":"Ramo","value":"Venda de móveis."},{"title":"Desafios","value":"Vendas paradas."},{"title":"Urgência","value":"Médio: Quero logo"},{"title":"Marketing","value":"Instagram."},{"title":"Fator X","value":"Produtos diferenciados, qualidade, ajuda nas escolhas, melhor custo/benefício."},{"title":"IA","value":"Muito pouco."},{"title":"Observações","value":"—"}]}'::jsonb
WHERE whatsapp = '+5555984427091';

-- 12. Rissieire Simonato
UPDATE "leads-calculadora-visionaria"
SET formsapp_completed = true, formsapp_at = COALESCE(formsapp_at, now()),
    formsapp_data = '{"answers":[{"title":"Email","value":"rissieire@hotmail.com"},{"title":"Empresa","value":"Vivare Centro Veterinário"},{"title":"Funcionários","value":"0 a 5"},{"title":"Faturamento","value":"R$10 mil a R$50 mil"},{"title":"Site","value":"Vivarevet.com.br (em construção)"},{"title":"Instagram","value":"@dr.rissi @vivarevet"},{"title":"Ramo","value":"Medicina veterinária."},{"title":"Desafios","value":"Muita concorrência, cidade pequena, valores abaixo do mercado, pessoas pouco conscientizadas com medicina preventiva."},{"title":"Urgência","value":"Urgente: Quero pra ontem"},{"title":"Marketing","value":"Google Ads, Instagram stories, WhatsApp."},{"title":"Fator X","value":"Prevenção de doenças."},{"title":"IA","value":"Pouco."},{"title":"Observações","value":"Problemas financeiros. Duas veterinárias saíram e levaram clientes. Reconstruindo tudo."}]}'::jsonb
WHERE whatsapp = '+5517997281513';

-- 13. Nilzete Correia
UPDATE "leads-calculadora-visionaria"
SET formsapp_completed = true, formsapp_at = COALESCE(formsapp_at, now()),
    formsapp_data = '{"answers":[{"title":"Email","value":"nilzetecorreia@hotmail.com"},{"title":"Empresa","value":"Sertãozinho"},{"title":"Funcionários","value":"20 a 50"},{"title":"Faturamento","value":"R$100 mil a R$500 mil"},{"title":"Site","value":"clinicasertãozinho.com.br"},{"title":"Instagram","value":"@nilzetecorreia"},{"title":"Ramo","value":"Terapia interdisciplinar a crianças neurodivergentes/autistas."},{"title":"Desafios","value":"Venda de serviço para controlar profissionais. Criar produto/serviço que não dependa da presença."},{"title":"Urgência","value":"Alto: Quero em semanas"},{"title":"Marketing","value":"Somente Instagram. Nenhum investimento."},{"title":"Fator X","value":"Família na sala de atendimento, treinamento dos pais, visita escolar/domiciliar, atendimentos gravados, reavaliação semestral."},{"title":"IA","value":"Pouco."},{"title":"Observações","value":"Sócia com destrato agendado para agosto/26. Duas clínicas: Juazeiro BA e Petrolina PE."}]}'::jsonb
WHERE whatsapp = '+5574988378929';

-- 14. Adriana Argentino
UPDATE "leads-calculadora-visionaria"
SET formsapp_completed = true, formsapp_at = COALESCE(formsapp_at, now()),
    formsapp_data = '{"answers":[{"title":"Email","value":"driargentino@gmail.com"},{"title":"Empresa","value":"Ponto D Lingerie"},{"title":"Funcionários","value":"0 a 5"},{"title":"Faturamento","value":"R$50 mil a R$100 mil"},{"title":"Instagram","value":"@pontodlingerie"},{"title":"Ramo","value":"Pijamas, lingerie e moda praia."},{"title":"Desafios","value":"Dificuldade de crescimento."},{"title":"Urgência","value":"Médio: Quero logo"},{"title":"Marketing","value":"Instagram e WhatsApp. Invisto ~R$1.500."},{"title":"Fator X","value":"Atendimento personalizado e clientes fidelizados."},{"title":"IA","value":"Aplico algumas vezes."},{"title":"Observações","value":"—"}]}'::jsonb
WHERE whatsapp = '+5511952191323';

-- 15. Robson Alves
UPDATE "leads-calculadora-visionaria"
SET formsapp_completed = true, formsapp_at = COALESCE(formsapp_at, now()),
    formsapp_data = '{"answers":[{"title":"Email","value":"robsoncristianorc@gmail.com"},{"title":"Empresa","value":"Planus Negócios Imobiliários"},{"title":"Funcionários","value":"0 a 5"},{"title":"Faturamento","value":"R$10 mil a R$50 mil"},{"title":"Site","value":"https://planusimoveis.com.br/"},{"title":"Instagram","value":"planusimoveis"},{"title":"Ramo","value":"Venda e Locação de imóveis."},{"title":"Desafios","value":"Falta de processo dos colaboradores, por mais que ensine, se perdem."},{"title":"Urgência","value":"Alto: Quero em semanas"},{"title":"Marketing","value":"Tinha profissional interno, mas há 8 meses parado."},{"title":"Fator X","value":"Atendimento e método de busca de cliente."},{"title":"IA","value":"Nada."},{"title":"Observações","value":"—"}]}'::jsonb
WHERE whatsapp = '+5514996218080';

-- 16. Karina Sena
UPDATE "leads-calculadora-visionaria"
SET formsapp_completed = true, formsapp_at = COALESCE(formsapp_at, now()),
    formsapp_data = '{"answers":[{"title":"Email","value":"ktsena81@gmail.com"},{"title":"Empresa","value":"Karina Sena Imagem e Estilo"},{"title":"Funcionários","value":"0 a 5"},{"title":"Faturamento","value":"até R$10 mil"},{"title":"Site","value":"https://karinasenaricardo.com.br/"},{"title":"Instagram","value":"Ka.senaricardo"},{"title":"Ramo","value":"Consultoria de Imagem."},{"title":"Desafios","value":"Não vender."},{"title":"Urgência","value":"Urgente: Quero pra ontem"},{"title":"Marketing","value":"Invisto R$3 mil no Instagram sem retorno."},{"title":"Fator X","value":"Método individual focado na personalidade para imagem pessoal."},{"title":"IA","value":"Nada praticamente."},{"title":"Observações","value":"Preciso de um produto que se venda sozinho."}]}'::jsonb
WHERE whatsapp = '+5565993329699';

-- 17. Juliana Neves
UPDATE "leads-calculadora-visionaria"
SET formsapp_completed = true, formsapp_at = COALESCE(formsapp_at, now()),
    formsapp_data = '{"answers":[{"title":"Email","value":"pereirajuliana@gmail.com"},{"title":"Empresa","value":"Integra Ser"},{"title":"Funcionários","value":"0 a 5"},{"title":"Faturamento","value":"até R$10 mil"},{"title":"Instagram","value":"@judoyoga"},{"title":"Ramo","value":"Terapias integrativas: yoga, constelação familiar e psicanálise."},{"title":"Desafios","value":"Não sei como escalar, sem esteira de produtos."},{"title":"Urgência","value":"Baixo: Posso esperar alguns meses"},{"title":"Marketing","value":"Apenas Instagram. Invisto muito pouco, divide com CLT."},{"title":"Fator X","value":"Histórico de trabalho com saúde mental, ajuda pessoas com transtornos sérios."},{"title":"IA","value":"Muito pouco, auxílio em textos."},{"title":"Observações","value":"Sou CLT, sou EUPRESA: única para criar conteúdo, vender, prospectar e entregar."}]}'::jsonb
WHERE whatsapp = '+5551985591461';

-- 18. Viviane Ludovico
UPDATE "leads-calculadora-visionaria"
SET formsapp_completed = true, formsapp_at = COALESCE(formsapp_at, now()),
    formsapp_data = '{"answers":[{"title":"Email","value":"viviane@ludovicoadvocacia.com.br"},{"title":"Empresa","value":"Ludovico Advocacia"},{"title":"Funcionários","value":"5 a 10"},{"title":"Faturamento","value":"R$10 mil a R$50 mil"},{"title":"Site","value":"LP de produto específico"},{"title":"Instagram","value":"@vivianeludovicoadv"},{"title":"Ramo","value":"Trabalhista empresarial."},{"title":"Desafios","value":"Aumentar clientela e faturamento."},{"title":"Urgência","value":"Médio: Quero logo"},{"title":"Marketing","value":"Vai iniciar tráfego pago para fraudes bancárias (produto rápido de caixa)."},{"title":"Fator X","value":"Não somos escritório de massa, serviço artesanal pensado caso a caso."},{"title":"IA","value":"Por enquanto R$250."},{"title":"Observações","value":"Não"}]}'::jsonb
WHERE whatsapp = '+5511953646881';

-- 19. Alexsandro Silva (NOVO - não estava na lista anterior)
UPDATE "leads-calculadora-visionaria"
SET formsapp_completed = true, formsapp_at = COALESCE(formsapp_at, now()),
    formsapp_data = '{"answers":[{"title":"Email","value":"alevendasoficial@gmail.com"},{"title":"Empresa","value":"VENDAS PRA VALER"},{"title":"Funcionários","value":"0 a 5"},{"title":"Faturamento","value":"R$50 mil a R$100 mil"},{"title":"Site","value":"www.vendaspravaler.com.br"},{"title":"Instagram","value":"@alevendasoficial"},{"title":"Ramo","value":"Consultoria comercial."},{"title":"Desafios","value":"Sair da operação e escalar."},{"title":"Urgência","value":"Médio: Quero logo"},{"title":"Marketing","value":"R$2 mil mês."},{"title":"Fator X","value":"Meu charme."},{"title":"IA","value":"Pouco."},{"title":"Observações","value":"Não"}]}'::jsonb
WHERE whatsapp = '+5511940223181';

-- 20. Rogério Sander (NOVO - não estava na lista anterior)
UPDATE "leads-calculadora-visionaria"
SET formsapp_completed = true, formsapp_at = COALESCE(formsapp_at, now()),
    formsapp_data = '{"answers":[{"title":"Email","value":"rogeriosander@hotmail.com.br"},{"title":"Empresa","value":"Counto contabilidade"},{"title":"Funcionários","value":"0 a 5"},{"title":"Faturamento","value":"R$10 mil a R$50 mil"},{"title":"Instagram","value":"@rogeriosanderoficial"},{"title":"Ramo","value":"Contabilidade."},{"title":"Desafios","value":"Captação de novos clientes e uso da IA como ferramenta de diferenciação."},{"title":"Urgência","value":"Médio: Quero logo"},{"title":"Marketing","value":"Zero."},{"title":"Fator X","value":"Conhecimento e personalização dos serviços."},{"title":"IA","value":"Zero."},{"title":"Observações","value":"Como posso usar a IA para vender mais serviços."}]}'::jsonb
WHERE whatsapp = '+5551985752551';
