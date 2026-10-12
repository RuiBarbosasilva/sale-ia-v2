# Dropshipping Intelligence — motor de decisão

Este diretório contém o motor determinístico e testável de pontuação para fornecedores, margem unitária e priorização de produtos. Ele não afirma que um fornecedor é confiável apenas por ter site ou publicidade: a classificação depende de evidências verificáveis e pedido-teste.

## Regras principais

- Fornecedor: score 0–100; identidade legal, nota fiscal e pedido-teste são bloqueadores críticos.
- Economia unitária: preço, custo do fornecedor, taxa percentual e fixa do marketplace, frete, impostos, embalagem, reserva de devolução e outros custos variáveis.
- Produto: score ponderado por demanda, concorrência, confiabilidade do fornecedor, margem, qualidade do anúncio, risco de entrega/devolução e confiança da evidência.
- CHAMPION exige vendas observadas, pelo menos 14 dias, evidência suficiente e score alto; potencial de mercado sozinho não vira campeão.
- Produtos proibidos/restritos, riscos de autenticidade, estoque instável, fornecedor fraco ou margem não positiva são bloqueados.
- Todas as funções são puras e não publicam anúncios, não fazem pedidos e não chamam APIs externas.

## Uso

Importe `scoreSupplier`, `calculateMargin` e `scoreProduct` nos serviços/controladores do módulo de dropshipping. Os percentuais devem ser fornecidos em pontos percentuais (por exemplo, `16.5`, não `0.165`). Integre persistência, rotas autenticadas e jobs separadamente para que nenhuma decisão de publicação ou compra aconteça sem validação explícita.

## Validação

Testes em `__tests__/dropshippingIntelligence.test.ts`. Executar com o comando de testes Jest do projeto. Este commit não declara os testes executados em ambiente local.


## Endpoints administrativos

Os endpoints abaixo são montados no router do Mercado Livre e herdam `mercadoLivreAdminGuard`:

- `GET /api/mercadolivre/dropshipping/rules` — pesos, limites e regras atuais.
- `POST /api/mercadolivre/dropshipping/calculate-margin` — economia unitária.
- `POST /api/mercadolivre/dropshipping/score-supplier` — score de evidências do fornecedor.
- `POST /api/mercadolivre/dropshipping/score-product` — score e veredito do produto.
- `POST /api/mercadolivre/dropshipping/assess-supplier-candidate` — triagem de candidato com proveniência.
- `POST /api/mercadolivre/dropshipping/assess-product-candidate` — triagem de produto com evidências.

Enviar o cabeçalho `x-mercado-livre-admin-key` (ou o cabeçalho alternativo aceito pelo guard). Os percentuais são pontos percentuais. As rotas de triagem não fazem chamadas externas e não persistem resultados; adapters e persistência precisam ser integrados antes de considerar a pesquisa autônoma operacional.


## Pesquisa real de catálogo

- `GET /api/mercadolivre/dropshipping/research/marketplace?q=organizador%20de%20cabos&limit=20`
- Consulta a API pública oficial do Mercado Livre Brasil (`api.mercadolibre.com/sites/MLB/search`).
- Retorna título, preço, URL, quantidade disponível e vendas apenas quando a fonte informar esses campos.
- Limite de 1 a 50 resultados, timeout de 10 segundos e tratamento de rate limit.
- Não é uma prova de demanda ou de vendas: campos ausentes permanecem `null`; a pesquisa não publica nem altera anúncios.
- A pesquisa de fornecedores, validação de pedido-teste, persistência de snapshots e conector Shopee ainda são etapas separadas.


## Persistência e ciclo de fornecedores

- Execuções de pesquisa e snapshots são gravados em `DropshippingResearchRun` e `DropshippingCatalogSnapshot`.
- `GET /api/mercadolivre/dropshipping/research/runs` lista coletas anteriores.
- `GET /api/mercadolivre/dropshipping/research/snapshots` lista anúncios capturados.
- `GET /api/mercadolivre/dropshipping/research/price-history/MLB1234567890` compara preço e estoque observado nas coletas Sale-IA.
- `POST /api/mercadolivre/dropshipping/assess-supplier-candidate` salva fornecedor como `PENDING_VALIDATION`.
- `GET /api/mercadolivre/dropshipping/suppliers/candidates` lista candidatos.
- `POST /api/mercadolivre/dropshipping/suppliers/candidates/:id/validate` atualiza score a partir de indicadores e evidências fornecidos.
- `GET /api/mercadolivre/dropshipping/alerts` lista alertas abertos; `POST /api/mercadolivre/dropshipping/alerts/:id/resolve` encerra um alerta.
- Bloqueios de validação geram alertas para revisão humana. Um score é uma regra de decisão, não uma garantia comercial.


## Ranking persistente de candidatos a produto

- `POST /api/mercadolivre/dropshipping/assess-product-candidate` avalia e salva cada candidato.
- `GET /api/mercadolivre/dropshipping/products/candidates?limit=100` lista candidatos ordenados por score, com filtro opcional por `status`.
- Estados iniciais: `REJECT` quando há bloqueios, `TEST` quando a triagem permite investigar, ou `WATCH` quando a evidência é insuficiente.
- Nenhum registro é promovido automaticamente a `CHAMPION` ou `SCALE`: isso exige fluxo adicional com margem calculada, fornecedor validado e vendas reais observadas durante período suficiente.
- Evidências e sinais recebidos são armazenados para auditoria; dados fornecidos manualmente não são tratados como prova independente.


## Economia unitária persistente

O payload de `POST /api/mercadolivre/dropshipping/assess-product-candidate` pode incluir `economics` com `salePrice`, `supplierCost`, `marketplaceFeeRatePct`, `fixedMarketplaceFee`, `shippingCost`, `taxRatePct` e, opcionalmente, `packagingCost`, `returnReserveRatePct`, `otherVariableCosts`.

Quando informada, a economia é calculada pelo motor de margem compartilhado e ficam persistidos lucro estimado, margem percentual e preço de equilíbrio. Taxas inválidas são rejeitadas; lucro estimado nulo ou negativo bloqueia o teste do produto. Os valores continuam estimativas e dependem de taxas/fretes corretos.


## Importação da pesquisa para ranking

- `POST /api/mercadolivre/dropshipping/research/import-latest` importa os anúncios da última coleta oficial para o ranking persistente de candidatos.
- A importação é idempotente por marketplace + ID externo na lógica do endpoint: anúncios já registrados são ignorados.
- Cada candidato recebe evidência de origem com data de coleta e URL da listagem; vendas ausentes continuam `null`.
- A importação não calcula margem sem custos do fornecedor e não promove automaticamente candidatos a campeões.


## Alertas de mudanças observadas

Cada pesquisa compara anúncios com a última captura salva do mesmo item:
- Mudança absoluta de preço de 10% ou mais gera alerta; 25% ou mais recebe severidade WARNING.
- Estoque observado zerado gera WARNING; queda de estoque de 50% ou mais gera INFO.
- Alertas abertos do mesmo tipo/item são atualizados em vez de duplicados em coletas sequenciais.
- Alertas usam somente snapshots observados pelo Sale-IA e não garantem que o anúncio ou estoque do fornecedor permaneça igual entre coletas.


## Recalcular margem de um candidato existente

- `PATCH /api/mercadolivre/dropshipping/products/candidates/:id/economics` atualiza os custos e recalcula lucro, margem e preço de equilíbrio.
- Lucro não positivo mantém o candidato em `REJECT`, adiciona bloqueio e abre/atualiza alerta `PRODUCT_MARGIN`.
- Ao corrigir os custos e obter lucro positivo, o bloqueio de margem é removido e o alerta aberto é resolvido; outros bloqueios continuam ativos.
- O laboratório permite editar a economia usando o ID do candidato exibido no ranking.


## Resumo operacional do painel

- `GET /api/mercadolivre/dropshipping/dashboard/summary` retorna contagem de candidatos por estado, produtos sem economia cadastrada, margens não positivas, status de fornecedores, alertas abertos, última pesquisa e top 10 candidatos.
- O laboratório disponibiliza botão de consulta do resumo.
- Estados SCALE/CHAMPION aparecem como zero até que um fluxo explícito com evidências suficientes promova candidatos; o ranking inicial não promove automaticamente.


O laboratório inclui checklist de revalidação para fornecedores já cadastrados. A API exige ao menos uma evidência com origem, campo, data de coleta e confiança. O checklist continua sendo uma avaliação administrativa: a fonte deve ser conferida e o pedido-teste só pode ser marcado como aprovado após teste real.


## Avaliação de ciclo de vida do produto

- `POST /api/mercadolivre/dropshipping/products/candidates/:id/evaluate` avalia WATCH/TEST/SCALE/CHAMPION/REJECT usando a função determinística `scoreProduct`.
- Exige margem positiva salva, fornecedor ligado e `VALIDATED` com score mínimo 65, além de pelo menos duas capturas com vendas informadas.
- Vendas observadas são calculadas como diferença entre contagens de vendas da primeira e última captura; a duração é calculada pelos timestamps.
- Concorrência, qualidade do anúncio e riscos operacionais continuam sinais administrativos informados no pedido; devem ter base verificável.
- O endpoint salva o veredito e gera alerta para SCALE, CHAMPION ou REJECT. Nenhum anúncio é publicado automaticamente.


## Pesquisa automática por watchlist

- `POST /api/mercadolivre/dropshipping/research/watches` cria/atualiza uma palavra-chave com intervalo de 15 a 1440 minutos.
- `GET /api/mercadolivre/dropshipping/research/watches` lista estado, última execução, próxima execução e erro.
- `PATCH /api/mercadolivre/dropshipping/research/watches/:id` permite habilitar/desabilitar ou mudar o intervalo.
- O worker processa até três consultas vencidas por ciclo, grava execuções/snapshots e cria alertas de variação de preço/estoque.
- Para iniciar no servidor, configure `DROPSHIPPING_AUTORESEARCH_ENABLED=true`; o ciclo padrão é 60 segundos e pode ser ajustado por `DROPSHIPPING_AUTORESEARCH_TICK_MS`.
- A automação consulta apenas a API pública do Mercado Livre. Não pesquisa fornecedores automaticamente, não compra, não publica anúncios e não integra a Shopee.


## Auditoria de validações de fornecedores

- Cada revalidação grava um registro imutável em `DropshippingSupplierValidation` na mesma transação da atualização do candidato.
- `GET /api/mercadolivre/dropshipping/suppliers/candidates/:id/validations` retorna sinais, evidências, bloqueios, checks aprovados, score e timestamp das avaliações anteriores.
- A revalidação exige ao menos uma evidência válida. A trilha registra o que o operador informou, mas não verifica automaticamente a veracidade dos documentos.


- `GET /api/mercadolivre/dropshipping/research/scheduler-status` informa se a automação está habilitada no processo atual, intervalo do worker, consultas ativas/vencidas e status recentes.
- Erros de execução do ciclo são capturados para evitar rejeições não tratadas no processo do servidor.


## Ofertas de fornecedor ligadas ao produto

- `POST /api/mercadolivre/dropshipping/products/candidates/:id/supplier-offers` registra uma oferta específica de um fornecedor validado para um anúncio do Mercado Livre.
- O registro guarda SKU, URL, custo unitário, frete do fornecedor, estoque observado e evidências.
- O custo posto é calculado como custo unitário + frete do fornecedor; o motor calcula lucro/margem com taxas de marketplace, frete do vendedor, impostos, embalagem e reservas informadas.
- Margem não positiva marca a oferta como `REJECTED_MARGIN`, bloqueia o candidato e cria/atualiza alerta. Uma margem positiva ainda exige reavaliação do ciclo de vida para escala/campeão.
- `GET /api/mercadolivre/dropshipping/products/candidates/:id/supplier-offers` lista ofertas vinculadas e o status do fornecedor.


## Validação de fornecedor com evidência por indicador

A revalidação não deve aprovar fornecedor apenas porque o payload contém flags booleanas positivas. Para cada indicador marcado como verdadeiro, a API exige pelo menos um registro de evidência correspondente ao nome do campo, valor `true`, metadados válidos e confiança mínima de 70%.

- Fontes oficiais/licenciadas devem informar URL HTTP(S) rastreável.
- `MANUAL_VERIFICATION` deve incluir nota de inspeção com pelo menos 10 caracteres.
- Se faltar evidência para qualquer indicador positivo, o status máximo fica `CONDITIONALLY_VALIDATED`; a aprovação integral é bloqueada.
- Essa checagem valida estrutura e rastreabilidade declarada, não verifica automaticamente a autenticidade externa da fonte. Pedido-teste, nota fiscal e identidade legal continuam exigindo conferência humana.
- Os testes de regressão ficam em `services/__tests__/dropshippingResearch.test.ts`.


## Readiness das integrações

- `GET /api/mercadolivre/dropshipping/providers/status` mostra se as variáveis necessárias estão configuradas, sem retornar segredos.
- A pesquisa de catálogo público do Mercado Livre está disponível em modo somente leitura.
- O adaptador oficial Shopee ainda não está implementado; a rota informa esse estado mesmo que variáveis de credencial existam.
- A descoberta externa automatizada de fornecedores ainda não está conectada. Cadastro, revisão documental e histórico de validação são fluxos disponíveis, não prova de pesquisa automática concluída.


Ao registrar novamente uma oferta para o mesmo produto/fornecedor/SKU, o sistema compara o custo unitário e estoque com a oferta anterior. Variações de custo de 10% ou mais e estoque zerado geram alertas operacionais para revisão da margem e disponibilidade.


A comparação de custo usa o custo posto (produto + frete do fornecedor), para detectar alterações em qualquer um desses componentes. Quedas de estoque de 50% ou mais também geram alerta INFO; estoque zerado gera WARNING.
