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
