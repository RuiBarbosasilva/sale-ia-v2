# PROMPT MASTER QWEN — HUNTER INTELIGENTE DE DROPSHIPPING E TENDÊNCIAS MERCADO LIVRE

## MISSÃO

Trabalhe no repositório existente `RuiBarbosasilva/sale-ia-v2`, branch de trabalho própria e Pull Request para `main`. Implemente no módulo Mercado Livre um Hunter inteligente, persistente, auditável e o mais automático possível para:

1. Pesquisar tendências reais do Mercado Livre Brasil e mudanças de demanda.
2. Encontrar produtos com potencial comercial usando dados verificáveis, não palpites.
3. Pesquisar fornecedores reais na internet e montar dossiês de validação para que Rui possa fazer cadastro/negociação.
4. Só depois de o usuário confirmar que o fornecedor aceitou o cadastro, as condições comerciais e o dropshipping, habilitar os produtos desse fornecedor para avaliação final.
5. Calcular margem líquida realista e riscos.
6. Preparar anúncios e publicá-los por API oficial do Mercado Livre após aprovação explícita do usuário.
7. Monitorar preço, estoque, prazo, tendências, margem e anúncios continuamente e alertar sobre riscos.

O sistema deve funcionar com os serviços e dados reais disponíveis. Não declarar uma pesquisa concluída, fornecedor verificado, venda, demanda, integração ou publicação sem evidência real.

## REGRAS INEGOCIÁVEIS

- Antes de alterar qualquer arquivo, leia o código atual e identifique rotas, serviços, schemas Prisma, migrations, dashboard, testes, jobs e integração OAuth existentes.
- Preserve toda funcionalidade existente de Mercado Livre, Afiliados, RB Factory Sites, Factory Ebook IA, Guardian e demais módulos. Não sobrescreva implementações úteis do Qwen.
- Não recrie uma segunda implementação se já existir serviço equivalente. Estenda os serviços atuais.
- Não faça reset do banco. Não apague dados. Migrations devem ser aditivas, reversíveis quando possível e compatíveis com SQLite/Prisma atual.
- Nunca grave tokens, senhas, chaves ou cookies em logs, banco sem criptografia ou arquivos versionados.
- Use APIs oficiais e documentação atual do Mercado Livre; respeite autenticação, limites, termos e políticas. Não implemente scraping proibido, bypass de bloqueios, CAPTCHA ou automação de navegador que viole termos.
- Toda informação externa deve registrar fonte, URL, data/hora da consulta e, quando possível, trecho/campo de evidência e hash/snapshot. Diferencie fato verificado, declaração do fornecedor, inferência e dado indisponível.
- Não classifique fornecedor como “honesto/garantido” só porque tem site ou CNPJ. Use status objetivos: NÃO AVALIADO, EVIDÊNCIA INSUFICIENTE, EM VERIFICAÇÃO, APROVADO PARA TESTE, REPROVADO e REQUER REVISÃO HUMANA. Exiba limites e motivos.
- Nunca invente quantidade vendida, volume de busca, estoque, reputação, prazo, CNPJ, preço ou avaliações.
- Não garantir que um produto vai vender muito. Calcular score de oportunidade com evidências, confiança e riscos, indicando que é estimativa.
- Não publicar anúncio, alterar preço ao vivo, contratar fornecedor, aceitar termos, gastar dinheiro ou executar ação irreversível sem confirmação explícita do usuário. Pesquisa e preparação podem ser automáticas.
- Fornecedor novo exige cadastro/negociação manual do usuário. O sistema não deve fingir ter criado conta ou fechado parceria.
- Antes de publicar: validar conta OAuth conectada, permissão, categoria, atributos obrigatórios, política da categoria, fotos licenciadas/autorizadas, estoque comprovado, preço, margem, prazo e política de envio. Bloquear publicação quando faltar condição crítica.
- Para dropshipping, verificar se o fornecedor autoriza expressamente o modelo, permite envio direto ao comprador, não insere material promocional próprio, fornece rastreio válido, tem estoque confiável e cumpre prazo compatível com as regras atuais do Mercado Livre. Não presumir que o modelo é permitido em toda situação; conferir as políticas oficiais vigentes.
- Criar testes reais/mocks isolados e não declarar testes executados se não foram executados.

## FASE 0 — DIAGNÓSTICO SEM DESTRUIR

Inspecione, no mínimo:
- `src/modules/mercadoLivre/`
- `src/modules/mercadoLivre/controllers/dropshippingController.ts`
- `src/modules/mercadoLivre/routes/mercadoLivreRoutes.ts`
- `src/modules/mercadoLivre/services/dropshippingResearch.ts`
- `src/modules/mercadoLivre/services/dropshippingIntelligence.ts`
- `src/modules/mercadoLivre/services/mercadoLivreResearchAdapter.ts`
- `src/modules/mercadoLivre/services/dropshippingResearchScheduler.ts`
- `public/dropshipping-lab.html`
- `src/app.ts`
- `prisma/schema.prisma`, migrations e testes associados.
- `package.json`, `.env.example`, Guardian e documentação de arquitetura.

Monte uma matriz requisito → implementação existente → lacuna → arquivo/teste a alterar. Evite relatórios intermináveis: depois do diagnóstico, implemente em sequência sem parar para pedir confirmação de detalhes não essenciais.

## FASE 1 — HUNTER DE TENDÊNCIAS DO MERCADO LIVRE

Implementar coleta automática e persistente usando APIs oficiais documentadas:
- Tendências do site Brasil: `GET https://api.mercadolibre.com/trends/MLB`.
- Tendências por categoria: `GET /trends/MLB/{CATEGORY_ID}`, quando aplicável.
- Mais vendidos por categoria: `GET /highlights/MLB/category/{CATEGORY_ID}`.
- Busca pública de itens/catálogo e detalhes permitidos pelos endpoints oficiais atuais.
- Consultar documentação oficial atual antes de implementar; não assumir que todos endpoints exigem ou dispensam token. Tratar 401, 403, 429, indisponibilidade e mudança de schema com segurança.

O serviço deve:
- Agendar coletas configuráveis, com intervalo e fuso explícitos; evitar jobs duplicados em múltiplas instâncias.
- Guardar snapshots datados de tendências, keywords, categoria, posição, preço observado, disponibilidade e métricas que a API realmente fornecer.
- Comparar snapshots semanais/diários para detectar subida, queda, estabilidade, sazonalidade e novas oportunidades.
- Cruzar tendências com concorrência, faixa de preço, qualidade dos anúncios, quantidade de vendedores, reputação pública disponível, frete, prazo e viabilidade de dropshipping.
- Diferenciar ranking de tendência, ranking de mais vendidos e resultado de busca; não tratar esses dados como se fossem volume de vendas exato.
- Deduplicar sinônimos e palavras-chave sem apagar a fonte original.
- Registrar último sucesso, última falha, latência, número de itens coletados e data de atualização.
- Ter botão no dashboard “Pesquisar agora” e estado de execução com erro legível.

## FASE 2 — PESQUISA DE PRODUTOS E SCORE DE OPORTUNIDADE

Para cada candidato, manter histórico e calcular score 0–100 com pesos documentados, configuráveis e auditáveis. Incluir, no mínimo:
- sinal de tendência e aceleração (com fonte e período);
- indícios de demanda disponíveis oficialmente;
- concorrência e saturação;
- faixa de preço e dispersão;
- margem líquida estimada;
- risco de devolução/avaria/garantia;
- facilidade logística e dimensões/peso quando conhecidos;
- estabilidade e confiabilidade do fornecedor;
- compatibilidade com regras do Mercado Livre;
- confiança e completude dos dados.

Score não pode mascarar dado faltante. Mostrar sub-scores, explicação, fatores positivos/negativos e confiança. Se não houver dados de venda reais, rotular “demanda inferida por tendência/indicadores”, nunca “vendas comprovadas”.

Ciclo de produto persistente:
`DESCOBERTO → EM_ANALISE → FORNECEDOR_NECESSARIO → FORNECEDOR_EM_CADASTRO → AGUARDANDO_CONFIRMACAO_DO_USUARIO → APTO_PARA_TESTE → ANUNCIO_PREPARADO → AGUARDANDO_APROVACAO → PUBLICADO → MONITORANDO → ESCALAR | PAUSAR | DESCARTAR`.

Registrar transições, ator, timestamp e motivo. Nunca avançar automaticamente uma etapa que exige cadastro, acordo comercial ou autorização humana.

## FASE 3 — HUNTER DE FORNECEDORES NA INTERNET

Criar/estender adaptadores de busca externa configuráveis. Reutilizar integrações existentes quando houver. Se faltar provedor de pesquisa, criar interface e declarar configuração ausente com instruções claras; não simular resultados. Consultar fontes oficiais e páginas públicas permitidas, priorizando:
- site oficial e dados empresariais publicados pelo próprio fornecedor;
- CNPJ/situação cadastral por fonte oficial disponível;
- políticas de troca, garantia, prazo e logística;
- endereço e canais de atendimento publicados;
- contrato/termos atacadistas ou de dropshipping;
- reputação em fontes independentes legítimas, quando disponível;
- reclamações recorrentes com contexto, data e fonte, sem tratar uma reclamação isolada como prova definitiva;
- integração, catálogo, disponibilidade de estoque, atualização de estoque e API/feed, quando documentados.

Para cada fornecedor, salvar:
- nome legal/comercial e CNPJ apenas se encontrados e verificáveis;
- site e URLs de fontes;
- categorias e produtos;
- atende CPF/PF ou exige CNPJ; deixar explícito quando desconhecido;
- exige pedido mínimo, mensalidade, taxa, capital inicial ou compra de estoque;
- aceita dropshipping para consumidor final? evidência explícita, NÃO CONFIRMADO ou NÃO;
- envio direto, rastreio, embalagem neutra, nota fiscal, política de devolução, garantia e SLA;
- integração por API/CSV/feed e frequência de estoque;
- custos, prazo e regiões atendidas;
- score de evidência e confiança;
- pendências e perguntas para o usuário fazer;
- data da última verificação e próxima revalidação.

O sistema deve produzir uma ficha clara “O que falta confirmar antes de se cadastrar” e gerar uma mensagem de contato profissional. Não automatizar criação de conta, envio de documentos, aceite de contrato ou negociação em nome do usuário.

Criar um checklist para o usuário marcar:
1. cadastro concluído;
2. fornecedor confirmou que aceita dropshipping;
3. envio direto ao cliente confirmado;
4. prazos e rastreio confirmados;
5. devolução/garantia confirmadas;
6. preços e custos confirmados;
7. estoque e atualização de disponibilidade confirmados;
8. usuário aceitou os termos.
Só então liberar fornecedor para seleção de ofertas, sem tratar os checkboxes como prova independente — guardar “confirmado pelo usuário” separado de “verificado por fonte”.

## FASE 4 — PREÇO E LUCRO REAL

Calcular preço mínimo, preço recomendado, margem líquida estimada e ponto de equilíbrio com:
- custo do fornecedor;
- frete cobrado pelo fornecedor;
- tarifa do Mercado Livre conforme categoria/tipo de anúncio/condições atuais, obtida de fonte ou configurada e identificada;
- custo de envio/logística e subsídios de frete aplicáveis;
- impostos configuráveis com alerta para validação contábil;
- embalagem, processamento, taxas de pagamento quando aplicáveis;
- provisão de devolução, defeito, cancelamento e garantia;
- custo de anúncios pagos, quando houver;
- reserva de variação de preço/estoque.

Exibir cada parcela, fonte/data e o que foi estimado. Nunca usar uma taxa fixa universal sem identificar limitações. Bloquear oportunidade se margem ficar negativa ou abaixo do mínimo configurado. Permitir ao usuário definir margem líquida mínima em reais e percentual. Fazer testes de borda de arredondamento, custos zero, dados ausentes e valores inválidos.

## FASE 5 — CADASTRO DE FORNECEDOR E OFERTA

Implementar telas/API para:
- pesquisar fornecedores;
- ver evidências e links;
- comparar fornecedores para o mesmo produto;
- exportar ficha/CSV;
- registrar manualmente fornecedor, custo, SKU, estoque, prazo, política e autorização de dropshipping;
- anexar fonte e data de cada informação;
- registrar confirmação do usuário e histórico de alterações;
- ligar fornecedor → produto → oferta → anúncio do Mercado Livre.
Impedir ativação de oferta se estoque, preço, prazo, permissão de dropshipping ou margem forem desconhecidos/fora dos limites.

## FASE 6 — ANÚNCIO DO MERCADO LIVRE

Usar o OAuth e o cliente API existentes; não criar segunda autenticação. Revisar documentação oficial atual, inclusive mudanças de publicação/catálogo/User Products e atributos por categoria.

Gerar rascunho de anúncio com:
- título adequado ao limite oficial atual;
- descrição original, precisa e sem alegações falsas;
- atributos e categoria corretos;
- imagens que o usuário/fornecedor tenha autorização para usar;
- preço calculado;
- quantidade limitada ao estoque confiável, com buffer;
- prazo/logística compatíveis com a política;
- variações somente quando suportadas.
Executar pré-validação e exibir um preview. Publicação é autorizada somente por ação explícita do usuário por anúncio/lote, com resumo e contagem. Após publicar, persistir ID, URL, estado, resposta sanitizada da API e auditoria. Usar idempotência para não criar duplicatas em retentativas. Nunca marcar como publicado antes da confirmação da API.

## FASE 7 — AUTOMAÇÃO CONTÍNUA

Criar scheduler idempotente com feature flags, rate limit, timeout, retry exponencial e circuit breaker:
- tendências: diariamente e/ou intervalo configurável;
- snapshots e comparações;
- revalidação de fornecedor/estoque/preço conforme intervalo configurável;
- recalcular score e margem;
- alertar queda de margem, tendência, estoque baixo, aumento de preço, prazo arriscado, anúncio pausado, falha de API e dados desatualizados;
- pausar ou recomendar pausa com regra configurada, mas não alterar anúncio ao vivo sem permissão explícita;
- log de auditoria com execução, resultado, duração, falha e correlação.
Default seguro: pesquisa automática ativável; publicação automática desligada; alteração de preço automática desligada; nenhuma ação financeira automática.

## FASE 8 — DASHBOARD OPERACIONAL

No dashboard atual `public/dropshipping-lab.html`, preservar layout/recursos existentes e adicionar:
- resumo: última pesquisa, tendências novas, fornecedores por estado, oportunidades por score, margem média calculável, alertas e falhas;
- tabela de tendências com origem, categoria, variação e data;
- tabela de produtos candidatos com score, confiança, concorrência, custo, preço, lucro, risco, fornecedor e próxima ação;
- central de fornecedores com evidências, status, pendências e links;
- checklist de cadastro do fornecedor;
- comparação de fornecedores;
- preview de anúncio e botão “Aprovar e publicar” com confirmação;
- filtros, paginação, ordenação e estados vazios/erro/loading;
- exibir “não configurado” se API externa estiver ausente, nunca criar dados fictícios;
- interface responsiva, português brasileiro e UTF-8 real, sem mojibake.

## FASE 9 — API, SCHEMA, TESTES E OBSERVABILIDADE

- Inspecionar schema e migrations antes de adicionar modelos. Reutilizar tabelas existentes de candidato, snapshot, fornecedor, oferta, validação, alerta e histórico.
- Criar migrations aditivas e índices úteis; garantir relações e cascatas seguras.
- Validar request/response, autorização administrativa, paginação limitada, filtros permitidos e tratamento uniforme de erros.
- Adicionar testes unitários e integração para score, cálculo de margem, transições de estado, evidências, confirmação humana, tendências, falha de provedor, idempotência e bloqueio de publicação.
- Testar scheduler desabilitado e habilitado sem duplicar jobs.
- Testar que não publica com fornecedor não confirmado, sem estoque, sem imagem autorizada, sem margem ou sem OAuth.
- Adicionar health/status com timestamps e estado dos provedores.
- Atualizar documentação, `.env.example` sem segredos e inventário de rotas.
- Rodar `npm run typecheck`, `npm run build`, testes específicos e `npm run guardian:verify` / `npm run guardian:health` conforme disponíveis. Corrigir falhas introduzidas. Não alegar que rodou comandos sem realmente executá-los.
- Não alterar Afiliados, RB Factory ou Factory Ebook, exceto se uma dependência compartilhada exigir mudança comprovada.

## FASE 10 — ENTREGA

Implemente por etapas completas, sem ficar apenas no plano. Faça commits pequenos numa branch e abra PR para `main`. Entregue:
1. arquivos alterados;
2. endpoints e telas adicionados;
3. migrations e configuração necessária;
4. comandos exatos para atualizar o ambiente local;
5. resultados reais dos testes, distinguindo PASSOU, FALHOU e NÃO EXECUTADO;
6. bloqueios que dependam de credenciais, aprovação de fornecedor ou confirmação do usuário;
7. checklist operacional de primeiro uso.

Não pare depois de criar apenas documentação, dashboard ou dados de exemplo. A meta é um fluxo funcional de ponta a ponta, com automação de pesquisa e análise, mas com aprovação humana nos pontos de risco.