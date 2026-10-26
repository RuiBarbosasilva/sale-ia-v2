# CADERNO OPERACIONAL — SALE-IA V2
## Atualização: 12/10/2026
## Repositório: RuiBarbosasilva/sale-ia-v2

Este arquivo é o registro de continuidade do projeto para manter contexto entre Qwen, GitHub e a cópia local. Não é um relatório de testes: estados de execução só devem ser marcados como concluídos quando houver evidência.

## Prioridade atual: Hunter inteligente de dropshipping — Mercado Livre

### Objetivo de negócio
Automatizar ao máximo a pesquisa de tendências do Mercado Livre Brasil, a descoberta de produtos com potencial, a pesquisa de fornecedores na internet, o cálculo de margem e a preparação/publicação de anúncios. Rui fará pessoalmente o cadastro e a negociação inicial com o fornecedor. O sistema só libera os produtos desse fornecedor após o usuário confirmar as condições comerciais e o dropshipping.

### Contexto técnico já registrado
- Repositório: `RuiBarbosasilva/sale-ia-v2`, branch principal `main`.
- Módulo existente: `src/modules/mercadoLivre/`.
- Dashboard existente: `public/dropshipping-lab.html`.
- Serviços existentes a inspecionar e estender, sem duplicar: `dropshippingResearch.ts`, `dropshippingIntelligence.ts`, `mercadoLivreResearchAdapter.ts`, `dropshippingResearchScheduler.ts`.
- Rotas/controller existentes: `src/modules/mercadoLivre/routes/mercadoLivreRoutes.ts`, `src/modules/mercadoLivre/controllers/dropshippingController.ts`.
- Scheduler de pesquisa foi registrado para inicialização condicional por `DROPSHIPPING_AUTORESEARCH_ENABLED=true` no commit `2181bf2ebce8d6652dc524c8f4bfede2e5dcab23`; confirmar o estado atual do código antes de assumir que está ativo em produção.
- O projeto já tinha componentes de candidatos persistidos/rankeados, histórico de preços/estoque, score, validação de evidências de fornecedor, ligação produto-fornecedor-oferta, alertas e ciclo de vida. Validar o código real antes de reaproveitar.
- Não foi confirmado neste registro que build, typecheck, testes ou scheduler em ambiente real passaram após a última mudança.

### Fontes oficiais para o Hunter
- Tendências: `GET https://api.mercadolibre.com/trends/MLB`; a documentação descreve 50 termos de tendência, com atualização semanal, incluindo buscas com maior crescimento, mais desejadas e tendências populares.
- Tendências por categoria: `GET /trends/MLB/{CATEGORY_ID}`, quando suportado.
- Mais vendidos por categoria: `GET /highlights/MLB/category/{CATEGORY_ID}`.
- Documentação de tendências: https://developers.mercadolivre.com.br/pt_br/relatorios-de-faturamento/tendencias
- Documentação de mais vendidos: https://developers.mercadolivre.com.br/pt_br/mais-vendidos-no-mercado-livre
- Publicação de produtos e requisitos: https://developers.mercadolivre.com.br/devcenter/publicacao-de-produtos
- Conferir documentação vigente antes de implementar; não assumir que tendências, ranking, buscas ou dados de vendas têm a mesma semântica. Registrar data e fonte.

### Fluxo obrigatório
1. Coletar tendências/rankings oficiais e pesquisas permitidas na internet.
2. Persistir snapshots e medir variação ao longo do tempo.
3. Ranqueiar candidatos com score explicável, confiança e dados faltantes.
4. Pesquisar fornecedores reais, registrar evidências, fontes, custos, política, prazo, estoque e permissão explícita de dropshipping.
5. Entregar ao usuário uma ficha de fornecedor e perguntas para cadastro/negociação.
6. Rui faz o cadastro e a negociação; o sistema registra confirmação do usuário sem fingir verificação externa.
7. Recalcular margem líquida com tarifas, frete, custos, impostos configuráveis e provisões de devolução.
8. Gerar rascunho de anúncio com atributos/categoria corretos e imagens autorizadas.
9. Pedir aprovação explícita antes da publicação real pela API OAuth oficial.
10. Monitorar preço, estoque, tendências, margem e status do anúncio; alertar e recomendar ação. Mudanças ao vivo de preço/anúncio ficam desligadas por padrão.

### Status de validação
- [ ] Inspeção do estado atual do código e matriz de lacunas
- [ ] Coleta real de tendências MLB com persistência
- [ ] Histórico/variação de tendências e categorias
- [ ] Busca externa de fornecedores configurada e com evidências rastreáveis
- [ ] Checklist de cadastro/aceite pelo usuário
- [ ] Score de produto com confiança e explicabilidade
- [ ] Margem líquida com custos discriminados
- [ ] Dashboard operacional integrado
- [ ] Rascunho e pré-validação de anúncio
- [ ] Publicação OAuth com aprovação explícita e idempotência
- [ ] Monitoramento e alertas automáticos
- [ ] Testes, typecheck, build e Guardian executados e aprovados
- [ ] Atualização local sincronizada com GitHub

### Regras para preservar o projeto
- Não apagar nem substituir trabalho já existente de Afiliados IA, RB Factory Sites ou Factory Ebook IA.
- Não usar `prisma migrate reset`.
- Não versionar segredos.
- Não criar fornecedores, produtos, vendas, reviews ou métricas fictícias.
- Não afirmar que fornecedor é “honesto” ou que produto vai vender muito; mostrar evidências, riscos e nível de confiança.
- Nunca ativar publicação automática, alteração de preço ou ações financeiras por padrão.
- Preservar UTF-8 em todos os arquivos.

### Prompt de implementação
Usar o documento `docs/PROMPT_MASTER_HUNTER_MERCADOLIVRE.md` como instrução principal para Qwen. O Qwen deve inspecionar a implementação existente, implementar as lacunas reais, testar e registrar exatamente o que foi validado.

## Auditoria das alterações locais da Qwen — 12/10/2026

### Evidências recebidas da cópia local
O usuário executou `git status --short` e `git diff`. Os itens abaixo ainda estavam locais e não constavam como commit enviado:
- Arquivos tracked modificados: `dump.rdb`, `prisma/schema.prisma`, `public/site-factory.html`, `src/app.ts`.
- Novos arquivos locais: `src/controllers/dropshippingController.ts`, `src/routes/dropshippingRoutes.ts`, `src/services/dropshipping/`, `public/dropshipping-intelligence.html`, `prisma/seed-dropshipping.ts` e vários scripts auxiliares.
- O diff tracked reportado tinha 395 inserções e 58 remoções em quatro arquivos; o schema Prisma acrescentava aproximadamente 337 linhas de modelos Dropshipping.
- Foi criado um backup de patch local. Não executar `reset`, `clean`, migração destrutiva ou sobrescrita geral para sincronizar esse trabalho.

### Correções e controles obrigatórios antes de integrar o código local
1. **Não confundir cópia local com GitHub:** os novos controllers, rotas, serviços e modelos descritos acima ainda não foram enviados ao repositório no momento desta auditoria. Não declarar que foram corrigidos no GitHub sem inspecionar seus conteúdos e validar um commit real.
2. **Evitar módulo paralelo:** o repositório já possui a implementação principal em `src/modules/mercadoLivre/`, incluindo `controllers/dropshippingController.ts`, `routes/mercadoLivreRoutes.ts`, serviços de pesquisa/inteligência e scheduler. Avaliar cada arquivo novo para reutilizar ou integrar à estrutura existente, sem duplicar endpoints, lógica ou schedulers.
3. **Prisma e migração:** os modelos adicionados ao schema não criam tabelas automaticamente. Antes de uso, validar o schema e gerar uma migração incremental compatível com SQLite; revisar SQL e dados existentes. Nunca executar `prisma migrate reset`.
4. **Codificação:** o diff local de `prisma/schema.prisma` exibia texto corrompido, por exemplo `MÃ“DULO`, `persistÃªncia` e `serviÃ§o`. Restaurar comentários em UTF-8 sem alterar a semântica do schema.
5. **Redis:** `dump.rdb` é estado de dados, não código-fonte. Não adicioná-lo ao commit sem motivo explícito; preservar uma cópia local se necessário.
6. **Scripts auxiliares:** revisar `fix-*.js`, `create-*.js`, `update-*.js`, `test-ml-api.js`, scripts Python e mídias antes de decidir o que é ferramenta permanente. Não versionar arquivos temporários, áudio de teste, dados pessoais ou segredos.
7. **RB Factory Sites:** `public/site-factory.html` contém mudanças locais substanciais. Comparar funcionalidade e encoding antes de integrar; não substituir o trabalho existente de RB Factory.
8. **Validação real:** executar `prisma validate`, geração do Prisma Client, typecheck, build e testes aplicáveis depois de integrar. Registrar resultado real; não marcar como aprovado apenas porque o comando foi iniciado.

### Estado desta auditoria
- [x] Backup local de patch criado pelo usuário.
- [x] Identificados arquivos locais modificados e novos arquivos reportados.
- [x] Confirmada a existência de um módulo Dropshipping oficial no repositório.
- [x] Registrados os riscos de duplicação, migração, encoding e inclusão de dados Redis.
- [ ] Conteúdo completo dos novos arquivos locais revisado.
- [ ] Alterações locais selecionadas e aplicadas ao GitHub.
- [ ] Migração revisada e validação Prisma concluída.
- [ ] Typecheck/build/testes executados com resultados registrados.
- [ ] Cópia local e GitHub reconciliados sem perda de alterações.

**Regra de integração:** aplicar mudanças específicas ao GitHub em commits pequenos e rastreáveis. Nunca reconstruir os novos arquivos locais por suposição nem afirmar que foram enviados sem que seu conteúdo tenha sido obtido e o commit confirmado.

## Correção de codificação do dashboard RB Factory — 12/10/2026

- [x] Corrigido em `public/rb-factory-dashboard.js` o texto com mojibake que afetava mensagens de carregamento, prospecção, status, erros, nomes de ações e a localidade Poços de Caldas.
- [x] Preservada a lógica do dashboard; a alteração foi direcionada às strings exibidas ao usuário.
- [x] Verificada a ausência dos padrões conhecidos de mojibake no arquivo atualizado.
- [x] Commit no GitHub: `803fc7bde0156db3a1a1fb9b9213cac31fe7fd9d`.
- [ ] Validar no navegador o dashboard e confirmar se há erros funcionais além da codificação. A inspeção do texto não comprova funcionamento de todas as chamadas API.
- [ ] Sincronizar a cópia local com o commit remoto sem descartar alterações locais.

**Importante:** `public/site-factory.html` no GitHub já contém `<meta charset="UTF-8">` e não apresentou mojibake na inspeção remota. O defeito de caracteres identificado estava no JavaScript do dashboard RB Factory. Se a interface continuar exibindo caracteres estranhos depois de sincronizar, fazer recarga forçada do navegador e conferir se o servidor está servindo a versão atual do arquivo, não uma cópia antiga em cache.



## Sincronização e bloqueios GitHub — 26/10/2026

### Estado remoto confirmado
- Branch `main` estava sincronizada com `origin/main` no commit `7aea3276a22ffafce84a47f3090a86c57757a816` durante a conferência anterior.
- PR #72 — [Blog Factory IA](https://github.com/RuiBarbosasilva/sale-ia-v2/pull/72): aberta, Draft, base `main`, head `cf80ead56c085fb98f5c1bad60e84e5e375af702`. A descrição registra CI aprovado em commit anterior (`7df368de94ce2c82b713f4ca4d061645075aa1d0`), mas isso não substitui a validação do head atual e dos riscos abaixo.
- PR #73 — [Dashboard central](https://github.com/RuiBarbosasilva/sale-ia-v2/pull/73): aberta, não mesclada, head `6792038104f6469de6d79cfc266945092e41161d`.
- PR #74 — [Correções do Blog Factory](https://github.com/RuiBarbosasilva/sale-ia-v2/pull/74): aberta, não mesclada, head `eeedd00e9bbdd4b12d9cb222fb9078f4a3417e81`; baseia-se na branch da PR #72. A ordem segura é validar/integrar #72 antes de #74.
- PR #75 — [Persistência de tendências Mercado Livre](https://github.com/RuiBarbosasilva/sale-ia-v2/pull/75): aberta, Draft, não mesclada, head `d14ff7a564308ff2943d384813d42876a16308df`.
- Issue #76 — [bloqueio de GitHub Actions e validação](https://github.com/RuiBarbosasilva/sale-ia-v2/issues/76): aberta; centraliza evidências e pendências.

### Rechecagem de CI da PR #72 — 26/10/2026

A consulta aos runs associados ao head atual da PR #72 (`cf80ead56c085fb98f5c1bad60e84e5e375af702`) também encontrou falha antes de etapas/logs:
- `sale-ia-v2-ci`: run `39816998464`, job `validate`, `conclusion=failure`, `steps=null`, `logs_url=null`.
- `Affiliate Module CI`: run `39816998448`, job `verify`, `conclusion=failure`, `steps=null`, `logs_url=null`.

Isso atualiza a evidência: a descrição da PR registra uma execução anterior aprovada em outro commit, mas o head atual não tem validação confirmada. A causa da falha continua indeterminada, pois o GitHub não fornece os steps/logs desses runs. Não tratar como falha comprovada do código nem como aprovação.

### Revisão técnica adicional da PR #72 — 26/10/2026

A leitura direta dos arquivos da branch `feat/blog-factory-ia` confirmou riscos que exigem correção antes da integração:
- **Controller/service incompatíveis:** `src/modules/blogFactory/blogFactory.controller.ts` invoca `getStatus`, `runAutomationCycle`, `discoverTrends`, `listTopics` e outros como funções exportadas; o `blogFactory.service.ts` do head da PR #72 exporta apenas a classe `BlogFactoryService` e a instância `blogFactoryService`. A versão de serviço com esses métodos existe na branch da PR #74. Portanto, a PR #72 isolada não deve ser integrada em `main`; a ordem de dependência #72 → #74 é necessária.
- **Fallback de credencial previsível:** `src/routes/authRoutes.ts` e `src/middleware/adminAuth.middleware.ts` usam `process.env.ADMIN_KEY || 'sale-ia-2026-admin-key-secure'`. Se a variável não estiver definida, a chave hardcoded pode autenticar acesso. Remover fallback e falhar fechado quando a configuração estiver ausente; alinhar com as chaves administrativas usadas pelo restante do sistema e adicionar testes.
- **Cookie de segredo:** a rota define `httpOnly: false` e a página `public/login.html` também grava a chave original via `document.cookie`. Migrar para uma sessão segura emitida pelo servidor; não armazenar a chave administrativa original no cookie.
- Esses achados foram registrados nos comentários da [PR #72](https://github.com/RuiBarbosasilva/sale-ia-v2/pull/72) e da [Issue #76](https://github.com/RuiBarbosasilva/sale-ia-v2/issues/76). Comentários: `6416673516` e `6416674594`.

### Decisão de integração
- [x] Identificada incompatibilidade entre controller e service no head da PR #72.
- [x] Identificado fallback de chave administrativa hardcoded.
- [x] Registrados riscos de cookie e dependência da PR #74.
- [ ] Corrigir autenticação/sessão sem quebrar dashboard central nem outros módulos.
- [ ] Validar a combinação final das PRs #72 e #74 com CI funcional e testes locais.
- [ ] Não mesclar a PR #72 isoladamente.

### Verificação de registro das rotas de login — 26/10/2026

Rastreamento adicional dos pontos de entrada da branch `feat/blog-factory-ia`:
- `src/app.ts` importa `authRoutes`, mas não registra `app.use(..., authRoutes)`.
- `src/routes/apiRoutes.ts` também não registra `authRoutes`.
- `public/login.html` chama `POST /api/verify-key`; nos pontos de entrada inspecionados, essa rota não está montada e tende a responder 404. O redirecionamento para `/main-dashboard` também precisa de verificação explícita.
- A tela de login antiga usa `ADMIN_KEY`/cookie, enquanto o painel Blog Factory usa chave em memória enviada por `x-sale-ia-admin-key` e o controlador verifica `SALE_IA_ADMIN_KEY` ou `AFFILIATE_ADMIN_KEY`. São fluxos distintos; não combinar parcialmente.
- A importação de `authRoutes` em `src/app.ts` parece não utilizada e deve ser removida ou a rota registrada intencionalmente, com testes correspondentes.

O achado foi registrado nos comentários da [PR #72](https://github.com/RuiBarbosasilva/sale-ia-v2/pull/72) e da [Issue #76](https://github.com/RuiBarbosasilva/sale-ia-v2/issues/76), comentários `6416703570` e `6416705217`.

### Evidência adicional: falha também em push para main — 26/10/2026

Após o commit documental `21cc0418ebe832540e3d1ee56207a76386b458a7`, o workflow `sale-ia-v2-ci` no run `40327615658` falhou em um evento `push` para `main`. Job `validate`: `conclusion=failure`, `steps=null`, `logs_url=null`. Isso amplia a evidência para além das PRs #72–#75 e sugere um bloqueio de execução do Actions/runner ou de configuração da execução; a causa exata não está demonstrada porque não há steps/logs disponíveis. A conexão GitHub utilizada nesta sessão não expõe permissão administrativa para alterar configurações do Actions.

### Correção estática aplicada na branch da PR #74 — 26/10/2026

- [x] Corrigida incompatibilidade de exports entre `src/modules/blogFactory/blogFactory.controller.ts` e `blogFactory.service.ts`.
- O controller importa o serviço como namespace e chama funções nomeadas; o serviço exportava somente a classe e a instância. Foram adicionados wrappers nomeados que encaminham para a instância única `blogFactoryService`.
- Branch: `fix/blog-factory-runtime-20261022`.
- Commit: `a4e0426068fc923ee6d8d883e2c0f88dede615de`.
- Arquivo: [blogFactory.service.ts](https://github.com/RuiBarbosasilva/sale-ia-v2/blob/fix/blog-factory-runtime-20261022/src/modules/blogFactory/blogFactory.service.ts).
- [ ] Executar typecheck, build, testes e Guardian. A leitura remota confirma os exports no arquivo, mas não comprova compilação. O GitHub Actions continua encerrando antes dos steps.

### Revalidação automática após correção estática da PR #74 — 26/10/2026

O commit `a4e0426068fc923ee6d8d883e2c0f88dede615de` gerou novos runs para o head atualizado:
- `sale-ia-v2-ci`: `40328021711`
- `Affiliate Module CI`: `40328022011`

Os dois encerraram em falha antes dos steps, com `steps: null` e `logs_url: null`. A correção estática foi publicada, mas typecheck/build/testes continuam sem validação. A PR #74 permanece aberta e não mesclada. Evidência registrada na [Issue #76](https://github.com/RuiBarbosasilva/sale-ia-v2/issues/76).

### Correções aplicadas na branch Blog Factory — 26/10/2026

Branch `feat/blog-factory-ia` (PR #72) recebeu alterações diretas no GitHub:
- [x] Removido o fallback da chave administrativa previsível `sale-ia-2026-admin-key-secure`; login agora falha fechado com HTTP 503 se nenhuma chave estiver configurada.
- [x] Login usa `SALE_IA_ADMIN_KEY` ou `ADMIN_KEY`, igual à precedência do middleware.
- [x] Cookie de login agora é `HttpOnly`, `SameSite=Lax`, `Secure` em produção, com caminho explícito e validade de 8 horas; a página não grava mais a chave via `document.cookie`.
- [x] Registrada a rota `POST /api/verify-key` por `app.use('/api', authRoutes)`.
- [x] Criada a rota web `/login` que serve `public/login.html`; redirecionamento após login corrigido para `/main-dashboard.html`.
- [x] `adminAuth.middleware.ts` agora falha fechado se a chave estiver ausente e usa a mesma precedência de configuração.
- [x] Removido `dump.rdb` do branch da PR #72 e incluída regra `dump.rdb` no `.gitignore`. O arquivo era persistência Redis, não código. **Preservar qualquer cópia local/stash antes de atualizar a cópia de trabalho.**
- Commits de correção de autenticação/rota: `c574c18366be27ea741b432583e8fe5da0f5e996`, `45799407bb51e33c09623cc398bdcfd333fd1b43`, `35f6ab68cf1647e0ab2e4df66e58fd6cb8b61d5c`, `bd7a5e51ac8f343c32fe8f203f9d11dd79a8aaa2`, `431e2b4cde6c7f0be310beaa4011b9f0a833ca65`; dump/ignore commit `938468b34f206044ef14e325142e56c19a55316a`.

**Ainda não declarar a PR #72 pronta:** o controller chama métodos do serviço novo que só existem na linha de correção da PR #74, e o serviço antigo ainda trabalha com os modelos legados `BlogPauta`/`BlogArticle`. Integrar/alinhar esse par de forma consistente antes do merge; não misturar parcialmente os dois contratos. As correções de autenticação foram confirmadas por leitura posterior dos arquivos remotos, mas ainda faltam testes executados.

### Estado de CI após as alterações
Os pushes recentes à branch `feat/blog-factory-ia` também falharam imediatamente. Exemplo: run `40328645618` para o commit `431e2b4cde6c7f0be310beaa4011b9f0a833ca65`. Os jobs continuam retornando `steps: null`, sem logs utilizáveis. Isso impede confirmar typecheck, build e testes via Actions; não é prova de que esses comandos passaram ou falharam no código. A execução local em worktree isolada continua obrigatória.

### Consolidação de runtime Blog Factory na PR #72 — 26/10/2026

A branch `feat/blog-factory-ia` foi atualizada para remover a dependência implícita de uma PR futura:
- [x] Substituído `blogFactory.service.ts` pela implementação que corresponde ao controller atual: métodos de status, pesquisa RSS, tópicos, artigos, geração com IA, revisão humana e envio ao WordPress exclusivamente como rascunho.
- [x] Atualizado `blogFactory.scheduler.ts` para chamar `runAutomationCycle()`, evitar ciclos sobrepostos, respeitar intervalo configurado e oferecer `stopBlogFactoryScheduler()`.
- [x] Incluídos `wordpressPostId` e `wordpressLink` em `BlogFactoryArticle` e criada a migração `20261022190000_blog_factory_wordpress_delivery`. Os modelos legados `BlogPauta`/`BlogArticle` permanecem por enquanto para não apagar dados existentes; devem ser removidos só após confirmar que nenhum módulo os utiliza.
- [x] Criados testes `tests/authRoutes.test.ts` cobrindo chave ausente, credencial incorreta, cookie seguro, configuração legada e validação de sessão assinada.
- [x] A sessão de login agora é um token HMAC temporário, não a chave administrativa original; cookie `HttpOnly`, `SameSite=Lax`, `Secure` em produção; comparação da chave em tempo constante; sem fallback de credencial previsível.
- Commit de serviço: `ddaf76962998baa31e4009b5007e287a0eeb7f38`; scheduler: `619c97f65dd54abb290580c827305a65f616459b`; schema: `609b123645ce9ed51a0972bed669ebd1ee20bfda`; migração: `aaca25c5dfa6b048edbbe6f5e5d7d4620a4c363c`; testes de sessão: `4c39692445590889d84f28bb2ad5cf37a8232c4c`; comparação constante: `416bf861835b76aee48d662172061832bc1b12b3`.

**Limite de validação:** os arquivos foram relidos após os commits, mas não foi possível executar typecheck/build/testes remotamente. O run `40329382939` do head `4c39692445590889d84f28bb2ad5cf37a8232c4c` encerrou com falha e `steps: null`, `logs_url: null`; portanto a CI continua sem execução observável. É necessária validação local isolada antes de merge.

### Hardening WordPress Publisher — 26/10/2026

- [x] A PR #72 agora usa o publisher idempotente da linha de runtime: consulta o slug existente antes de criar um post, reaproveita somente um rascunho existente e recusa colisão com post publicado.
- [x] Publisher recusa URL externa em HTTP e credenciais embutidas na URL; permite HTTP apenas em loopback local para desenvolvimento. As credenciais Basic Auth só são enviadas depois da validação.
- [x] Copiados para a branch da PR #72 os testes de API Blog Factory e de WordPress Publisher; acrescentados testes que garantem a rejeição de HTTP externo e credenciais embutidas.
- [ ] Executar os testes localmente: os runs de Actions continuam falhando antes dos steps e sem logs, então o código ainda não tem validação executada nesta sessão.

### Correção de navegação no Dashboard Central — 26/10/2026

- [x] Na branch `fix/central-dashboard-auth-module-registry-20261022`, o link do módulo Hunter deixou de apontar para o endpoint JSON protegido `/api/hunter/opportunities` e agora abre a interface existente `/affiliates/intelligence`.
- Commit: `9c93c9e31d919dc1b83dbcecc1505abea8a535d1`.
- [ ] Validar dashboard e testes no ambiente local; a CI segue sem runner/steps observáveis.

### Riscos de revisão encontrados
1. **`dump.rdb` na PR #72:** é um dump binário de persistência Redis, não código-fonte. Não o sincronizar nem sobrescrever sem plano explícito de preservação. A remoção do versionamento deve ser feita deliberadamente, preservando qualquer cópia local necessária.
2. **Autenticação na PR #72:** `public/login.html` grava a chave administrativa em cookie legível por JavaScript. Não considerar esse fluxo seguro; preferir sessão emitida pelo servidor com cookie `HttpOnly`, `Secure` em HTTPS e política `SameSite` adequada. Validar compatibilidade com o middleware antes de trocar o mecanismo.
3. **Possível duplicidade de modelos Blog Factory:** a PR #72 introduz `BlogFactoryTopic`/`BlogFactoryArticle` e também `BlogPauta`/`BlogArticle`. Confirmar uso e necessidade de ambos antes de consolidar schema/migrações.
4. **GitHub Actions:** nos runs recentes associados às PRs #73–#75, jobs terminaram antes dos steps, com `runner_id: 0`, `steps: []` ou sem steps/logs acessíveis. Isso não comprova defeito no código, mas também não valida os commits. A causa do runner/serviço ainda não foi determinada.
5. **Não confundir mergeabilidade com aprovação:** GitHub informa as PRs como mergeable, mas isso só indica ausência de conflito conhecido; não substitui CI verde e smoke tests.

### Próximas ações obrigatórias
- [ ] Diagnosticar e restaurar a execução normal de GitHub Actions; capturar logs de uma execução real.
- [ ] Executar em worktrees isoladas as verificações para `feat/blog-factory-ia`, `fix/central-dashboard-auth-module-registry-20261022`, `fix/blog-factory-runtime-20261022` e `feat/dropshipping-trends-persistence-20261023`: `npm ci`, encoding, Prisma validate/generate/migrate deploy, typecheck, build, testes e Guardian.
- [ ] Rever e corrigir o fluxo de sessão administrativa do Blog Factory.
- [ ] Retirar `dump.rdb` do controle de versão com uma alteração pequena e auditável, depois de confirmar que nenhuma operação depende do arquivo versionado.
- [ ] Confirmar se os modelos Blog Factory duplicados são necessários e alinhar a migração.
- [ ] Executar smoke tests do dashboard, Blog Factory, WordPress em modo rascunho e coleta OAuth de tendências do Mercado Livre.
- [ ] Atualizar o resultado real de cada validação e sincronizar a cópia local sem descartar alterações da Qwen.

### Regra de integração
**Não mesclar as PRs #73–#75 enquanto não houver validação reproduzível.** Para Blog Factory, revisar primeiro a PR #72 e seus riscos; a PR #74 depende da branch da #72. Não executar `git reset --hard`, `git clean` ou `prisma migrate reset`. Não marcar itens como concluídos sem evidência do comando/teste executado.
