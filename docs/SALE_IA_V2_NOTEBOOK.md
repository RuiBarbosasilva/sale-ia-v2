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



## Auditoria do dashboard central e inventário de módulos — 22/10/2026

### Evidências do código remoto (branch `main`)
- Dashboard central: `public/dashboard/index.html`; a chave era mantida em `sessionStorage.saleIaAdminKey` e só era validada indiretamente ao consultar endpoints administrativos.
- Autorização do backend: `src/middlewares/security.ts`; compara `x-sale-ia-admin-key` com `SALE_IA_ADMIN_KEY` (fallback `AFFILIATE_ADMIN_KEY`) por comparação timing-safe. A senha/chave real do arquivo `.env` local não é visível no GitHub e não deve ser publicada.
- Rotas centrais: `src/routes/dashboardRoutes.ts`; inclui `/dashboard/overview` e `/dashboard/operations`, protegidas por `adminAuthorization`.
- Foi criada a branch `fix/central-dashboard-auth-module-registry-20261022` e o PR #73: https://github.com/RuiBarbosasilva/sale-ia-v2/pull/73.

### Correções propostas no PR #73
- Endpoint autenticado `GET /dashboard/auth/check` para validar a chave antes de persistir na sessão do navegador.
- O botão de chave passa a validar a chave no servidor; chave incorreta não fica guardada.
- Ao receber 401, a chave antiga é descartada e a nova só é armazenada após validação.
- Menu lateral e cards reorganizados com prefixo `RB Factory`, apenas para páginas/rotas que existem no `main`.
- Testes adicionados para chave válida e inválida.

### Inventário de interfaces presentes em `main`
- RB Factory Sites: `/rb-factory`
- RB Factory Comercial: `/rb-factory-commercial`
- RB Factory Sales Agent: `/sales`
- RB Factory Editorial: `/editorial`
- RB Factory Afiliados IA: `/affiliates/intelligence`
- RB Factory Mercado Livre / Dropshipping: `/mercadolivre/dropshipping`
- RB Factory Benchmark: `/rb-factory-benchmark`
- RB Factory Biblioteca: `/rb-factory-template-library.html`
- RB Factory Manutenção: `/rb-factory-maintenance`

### Lacunas que permanecem abertas
- Blog Factory IA está numa branch própria (`feat/blog-factory-ia`) com migração, serviço, rotas e interface que não aparecem na árvore do `main` consultada nesta auditoria. Não declarar integrado/operacional no dashboard central até revisão de dependências, rotas, migração e testes.
- Social Media Factory IA está numa branch própria (`feature/social-media-factory-ia`) com migrações, serviços, scheduler e interface ausentes do `main` consultado. Não apontar o menu para uma página inexistente nem mesclar cegamente a branch inteira.
- A lista atual de saúde em `/dashboard/operations` verifica apenas seis grupos e usa algumas consultas de serviço; ela não representa uma auditoria de todos os módulos, rotas ou integrações. Precisa ser expandida com verificações reais e resultados por módulo.
- O CI do PR #73 terminou com falha. Os detalhes de log não ficaram disponíveis pela API consultada; por isso, a correção não deve ser marcada como validada nem mesclada antes de investigar a falha e obter testes aprovados.
- A chave local `SALE_IA_ADMIN_KEY`, a configuração do servidor e o comportamento do navegador local precisam ser confirmados no ambiente Windows do usuário; a auditoria remota não tem acesso ao `.env` local nem à instância localhost.

### Status honesto
- [x] Código do fluxo de autenticação e dashboard inspecionado no GitHub.
- [x] Correção de autenticação e reorganização inicial do menu preparadas em branch/PR.
- [x] Inventário inicial das interfaces existentes no `main`.
- [ ] CI e testes aprovados.
- [ ] Corrigir todos os módulos com falha identificada por testes/health checks reais.
- [ ] Integrar Blog Factory IA e Social Media Factory IA com revisão de conflitos, migrações e rotas.
- [ ] Criar um registro central de módulos com estado operacional verificável.
- [ ] Validar a chave e executar smoke tests no ambiente local do Windows.


### Continuação da auditoria — análise de branches e CI (22/10/2026, 17:40 UTC)

- A branch `feat/blog-factory-ia` está 49 commits à frente de `main`. Inclui `dump.rdb` alterado, `prisma/schema.prisma`, `src/app.ts`, `src/server.ts`, uma migração Blog Factory, serviços/controlador/rotas/scheduler, páginas e autenticação própria. Não fazer merge integral sem revisar o diff: `dump.rdb` é estado de Redis, não deve ser integrado como código do módulo.
- A branch `feature/social-media-factory-ia` está 79 commits à frente de `main`. Inclui múltiplas migrações, grandes mudanças em `prisma/schema.prisma`, `src/app.ts` e `src/server.ts`, páginas e serviços de redes sociais/dropshipping. Também não deve ser integrada integralmente sem reconciliar os arquivos compartilhados e o histórico de migrações.
- As duas branches partem do mesmo ancestral aparente de `main`, mas representam conjuntos diferentes de mudanças; não se deve assumir que uma contém a outra.
- O CI do PR #73 e o CI do módulo Afiliados falham quase imediatamente, com jobs reportados sem etapas executadas e sem logs acessíveis pela API consultada. Foram solicitadas novas execuções, que também falharam em seguida. Isso não identifica ainda se a causa é permissão/configuração do runner ou validação do projeto; não inventar uma causa sem logs.
- Conferido no `main`: o middleware administrativo compara `x-sale-ia-admin-key` (ou `x-affiliate-admin-key`) com `SALE_IA_ADMIN_KEY` ou fallback `AFFILIATE_ADMIN_KEY` e retorna 401 para ausência/valor incorreto. O repositório não revela o valor do segredo local.
- Rotas da interface central: os módulos já existentes em `main` têm rotas Express explícitas. As interfaces Blog Factory e Social Media Factory não estão montadas no `main`; adicionar links ativos antes de integrar seus arquivos criaria links quebrados.
- Próximos passos seguros: obter detalhes do check-run/Actions no GitHub; validar localmente `npm ci`, `npx prisma validate`, `npm run typecheck`, `npm run build` e os testes; integrar os módulos em PRs separados e revisar `schema.prisma`, migrations, `app.ts`, `server.ts` e arquivos de estado como `dump.rdb`.


### Correções adicionais da central — 22/10/2026

- Corrigido o texto de “completude”: a API calcula verificações funcionais que responderam com sucesso, não a percentagem de código implementado. A interface agora deixa essa distinção explícita.
- Corrigida a lista de estado da completude, que tentava mostrar `m.weight` embora a API não forneça esse campo; agora mostra o estado real de cada verificação.
- Corrigido o tratamento de erro do overview: removida a tentativa de escrever em `$('system')`, elemento inexistente, que interrompia a própria recuperação quando a API falhava.
- Confirmada a existência no `main` dos arquivos estáticos das rotas de biblioteca, benchmark, manutenção, comercial, Sales, Editorial e Dropshipping listadas no menu.
- Mantida a validação de chave administrativa no servidor antes de salvar a chave em `sessionStorage`; chave inválida é descartada. O valor de `SALE_IA_ADMIN_KEY` é segredo de ambiente e não pode ser verificado pelo GitHub.
- PR #73 continua aberto para revisão: https://github.com/RuiBarbosasilva/sale-ia-v2/pull/73
- Limitação de validação: os jobs Actions disponíveis continuam sem etapas/logs no retorno da API. Não é correto declarar testes/CI aprovados nem afirmar que a senha local foi validada. Ainda é necessário rodar os comandos de CI em ambiente executável e confirmar o segredo no `.env` local.


### Continuação — validação dos links e estado operacional da central (22/10/2026)

- Encontrado e corrigido um link quebrado no menu/cards: `/mercadolivre/dropshipping` não possui rota Express nem arquivo estático correspondente em `public/mercadolivre/dropshipping`. O destino foi alterado para `/dropshipping-lab.html`, cuja página existe em `main`.
- Removido o estado visual fixo “Sistema operacional”, que era exibido mesmo quando a consulta de saúde falhava. O rótulo agora começa em “Verificando módulos” e muda conforme o resultado de `/dashboard/operations`; em falha mostra “Saúde indisponível”. Esse indicador descreve apenas os módulos consultados, não todo o ecossistema.
- CI investigado via metadados de Actions: o run falhou em cerca de quatro segundos; o único job aparece como `completed/failure`, mas a API não fornece etapas, horários de início de execução nem logs, e o endpoint de logs retorna `BlobNotFound`. Isso indica que não há evidência suficiente para atribuir a falha ao código ou afirmar que o workflow chegou a executar os comandos. Link para inspeção manual: https://github.com/RuiBarbosasilva/sale-ia-v2/actions/runs/39824222283
- PR #73 atualizado com as correções adicionais. O PR segue aberto e sem CI verde; não foi mesclado para evitar colocar alterações não validadas em `main`.


### Ajuste final da semântica e novo estado do CI — 22/10/2026

- Os cartões e o painel da central agora usam “Verificações funcionais aprovadas” em vez de “Completude do ecossistema”, pois o cálculo é a proporção de consultas operacionais que responderam, não a percentagem de implementação do produto.
- As mensagens de autenticação explicam o fallback `AFFILIATE_ADMIN_KEY` quando `SALE_IA_ADMIN_KEY` não estiver configurada.
- Após a correção do link do Dropshipping, foram geradas novas execuções Actions (#1510 do `sale-ia-v2-ci` e #1473 do `Affiliate Module CI`). Ambas falharam antes de expor qualquer etapa; o job está como `failure`, `steps: null`, `logs_url: null`, e a tentativa de baixar logs retorna `BlobNotFound`. O problema não pode ser corrigido com segurança por alteração de código enquanto o runner não fornece diagnóstico.
- A última versão da branch é `85182a79108d2b8e4b9d9a03e73f531ceed149af`. PR #73 permanece aberto, não mesclado e sem CI aprovado: https://github.com/RuiBarbosasilva/sale-ia-v2/pull/73
- Ação operacional necessária no GitHub: abrir Actions e inspecionar os runs recentes; se continuarem sem steps/logs, verificar configurações/permissões de Actions, disponibilidade de runner e limites de execução do repositório. Depois, executar CI e smoke tests para aprovar a alteração.

- Verificação final de diff: branch com 13 commits à frente e 0 atrás de `main`; apenas quatro arquivos modificados no PR (notebook, dashboard HTML, rotas do dashboard e testes). Isso confirma que as correções não carregam as alterações extensas das branches Blog/Social Media.
- As execuções mais recentes do commit `85182a7` também falharam antes de expor etapas: `sale-ia-v2-ci` run 1514 (ID 39852101529) e `Affiliate Module CI` run 1477 (ID 39852101621). Os jobs seguem sem logs/steps acessíveis.

- Atualização após o commit final do notebook (`14489d7`): os runs mais recentes continuam falhando sem logs, agora `sale-ia-v2-ci` #1518 (ID 39852160005) e `Affiliate Module CI` #1481 (ID 39852160036). PR permanece aberto e mergeable, mas não foi mesclado por falta de validação aprovada.


## Continuação da correção da central — 2026-10-22 (segunda verificação)

- Revisado o fluxo de autenticação em `src/middlewares/security.ts`: o middleware consulta `SALE_IA_ADMIN_KEY` e usa `AFFILIATE_ADMIN_KEY` como fallback, comparando a chave em tempo constante.
- Confirmado que `src/app.ts` monta `dashboardRoutes` em `/dashboard` e serve a interface central em `/dashboard`.
- Corrigido um defeito adicional de navegação em `public/dashboard/index.html`: os itens Hunter e Planos apontavam diretamente para endpoints administrativos protegidos. Abrir esses endpoints em outra aba não enviava o cabeçalho `x-sale-ia-admin-key`, levando a 401. Agora os itens levam às seções Hunter/Planos dentro da própria central, que já usa o fluxo autenticado.
- Novo commit da correção de navegação: `4c14053263f4909393d192e6c0cdceb18c7fc4b9`.
- Nova checagem de CI para o HEAD anterior `a78dd6e465e16e3051bba7610442f8a9806f8fc9`: `sale-ia-v2-ci` run #1520 (ID `39852203175`) e `Affiliate Module CI` run #1483 (ID `39852203087`) falharam. A API dos jobs continua retornando `steps: null` e sem logs acessíveis, então a causa não pode ser identificada com evidência suficiente. A nova correção de navegação também precisa passar por CI.
- Limites mantidos: nenhuma chave real foi exposta ou alterada; não foi possível testar o servidor Windows/local via GitHub; PR #73 segue aberto e não mesclado. Não declarar a correção concluída até CI e smoke test local aprovados.

- Auditoria adicional da central em 2026-10-22: encontrei um segundo acesso direto ao endpoint Hunter, desta vez no cartão do módulo (além do item de menu já corrigido). O cartão também abria uma nova aba sem o cabeçalho `x-sale-ia-admin-key`, sujeito a 401. Corrigido para abrir a seção Hunter dentro de `/dashboard#hunter`. Commit: `081465a3083a8d8362ae44284c3daaa7630183e1`.
- Revisão visual por leitura de código confirmou que o painel salva a chave apenas em `sessionStorage`, valida via `/dashboard/auth/check` e envia `x-sale-ia-admin-key` nas chamadas administrativas. Ainda depende de a chave do ambiente local coincidir com `SALE_IA_ADMIN_KEY` (ou fallback `AFFILIATE_ADMIN_KEY`). Não foi possível validar runtime local ou CI neste ambiente.
