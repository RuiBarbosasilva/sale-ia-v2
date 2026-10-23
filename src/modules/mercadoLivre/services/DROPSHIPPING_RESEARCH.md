# Dropshipping Research e tendências — Sale-IA v2

## Pesquisa de catálogo

`mercadoLivreResearchAdapter.ts` consulta o endpoint oficial de busca pública de itens para observar anúncios, preço, estoque informado, vendedor e URL. Os campos ausentes ficam ausentes e geram avisos; contagem de anúncios e preço observado não são previsões de vendas.

O serviço de pesquisa agendada persiste execuções e snapshots, compara preço/estoque observado e gera alertas para mudanças relevantes. Ative somente com `DROPSHIPPING_AUTORESEARCH_ENABLED=true`.

## Tendências oficiais

`mercadoLivreTrendsAdapter.ts` consulta a API oficial autenticada `GET /trends/{SITE_ID}` ou `GET /trends/{SITE_ID}/{CATEGORY_ID}`, usando token obtido pelo serviço OAuth existente. A coleta persistente fica em `dropshippingTrendsService.ts`, com histórico em `DropshippingTrendRun` e `DropshippingTrendSnapshot`.

A documentação do Mercado Livre descreve até 50 termos por coleta semanal: posições 1–10 = crescimento mais rápido; 11–30 = mais desejadas; 31–50 = tendências populares. Isso é um ranking semanal, não uma métrica diária de busca nem garantia de vendas. Categorias opcionais vêm de `DROPSHIPPING_TREND_CATEGORY_IDS`, separadas por vírgula ou ponto e vírgula.

Endpoints administrativos (protegidos pelo guard existente):
- `POST /api/mercadolivre/dropshipping/trends/collect` com corpo opcional `{"categoryId":"MLB1430"}`.
- `GET /api/mercadolivre/dropshipping/trends/history?limit=30`, opcionalmente com `categoryId=MLB1430`.

A página `/mercadolivre/dropshipping` expõe os controles de coleta e histórico. Para usar a API de tendências, a conta precisa estar conectada por OAuth e ter autorização. Erros 401/403/429 são registrados com códigos seguros; nenhum resultado fictício é criado.

## Proveniência e limitações

- Cada snapshot conserva posição, grupo de tendência, URL de origem e data de observação.
- A API de tendências é atualizada semanalmente pelo Mercado Livre; o scheduler evita coletar novamente antes de sete dias após sucesso e tenta de novo após seis horas quando a última execução falhou.
- Coleta por categoria é opcional; configure apenas IDs de categoria MLB válidos.
- A pesquisa externa de fornecedores ainda exige um provedor autorizado ou verificação manual com evidências rastreáveis. O sistema não deve inventar fornecedor, contato, estoque, reputação, custo ou autorização de dropshipping.
- Publicação de anúncios, alteração de preço e ações financeiras continuam exigindo integração própria, validação e aprovação explícita.
- Executar Prisma validate/generate/migrate, typecheck, build, testes e Guardian antes de integrar. Não marcar a funcionalidade como validada até registrar os resultados reais.
