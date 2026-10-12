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
