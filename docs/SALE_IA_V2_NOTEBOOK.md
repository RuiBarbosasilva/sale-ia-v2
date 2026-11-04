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



## Novo módulo: Blog Factory IA — implementação inicial no GitHub (21/10/2026)

Branch de trabalho: `feat/blog-factory-ia`.

### Implementado nesta branch
- `src/modules/blogFactory/blogFactory.service.ts`: leitura de feeds RSS/Atom configuráveis, deduplicação por URL e título, persistência de pautas, criação de rascunhos e validações básicas antes de mudar o status de publicação.
- `src/modules/blogFactory/blogFactory.controller.ts`: endpoints administrativos protegidos pelo cabeçalho `x-sale-ia-admin-key`, usando `SALE_IA_ADMIN_KEY`.
- `src/modules/blogFactory/blogFactory.routes.ts`: rotas de health, status, pesquisa, pautas, artigos, criação/edição de rascunho e publicação controlada.
- `prisma/schema.prisma`: modelos `BlogFactoryTopic` e `BlogFactoryArticle`.
- `prisma/migrations/20261021180000_blog_factory_ia/migration.sql`: migração SQLite para persistência de pautas e artigos.
- `src/app.ts`: API montada em `/api/blog-factory`.
- `src/modules/blogFactory/README.md`: configuração e limitações documentadas.

### Como funciona a descoberta
Os feeds padrão são G1 RSS e Agência Brasil RSS; é possível substituir por `BLOG_FACTORY_RSS_FEEDS`, uma lista de URLs separadas por vírgula. A pesquisa é disparada por chamada manual ao endpoint, não por worker contínuo. O sistema salva metadados, resumo do feed e URL de origem; não copia o artigo completo.

### Configuração e execução local
1. Sincronizar a branch `feat/blog-factory-ia` sem descartar mudanças locais.
2. Confirmar `SALE_IA_ADMIN_KEY` no ambiente local, sem versionar o segredo.
3. Executar `npx prisma migrate deploy`.
4. Executar `npx prisma generate`.
5. Executar `npm run typecheck` e `npm run build`.
6. Iniciar o servidor e consultar `GET /api/blog-factory/health`.
7. Para pesquisa administrativa, enviar `POST /api/blog-factory/research` com o cabeçalho `x-sale-ia-admin-key`.
8. Consultar `GET /api/blog-factory/topics` e `GET /api/blog-factory/articles`.

### Limitações conhecidas — não declarar pronto para produção
- Ainda não implementa geração de artigos por modelo de IA.
- A descoberta RSS é acionada manualmente; não há agendador contínuo do Blog Factory.
- Não há adaptador de publicação para WordPress ou outro CMS. O status interno `PUBLISHED` não comprova que um artigo esteja público na internet.
- O painel visual dedicado não foi adicionado nesta etapa.
- Não há análise quantitativa de tendências, revisão factual automatizada, pipeline de imagens, métricas de audiência nem testes de runtime registrados.
- A validação de publicação atual é apenas inicial; é necessário revisar a política editorial, o quality gate e a idempotência antes de habilitar publicação automática.
- Nenhum typecheck, build, migração ou teste de integração foi executado por esta alteração remota. Confirmar localmente antes de integrar a `main`.

### Próxima sequência
1. Validar schema/migração, TypeScript, build e rotas.
2. Implementar adaptador de IA com saída estruturada, fontes e checagem de duplicidade.
3. Implementar scheduler com lock, limites e recuperação de falhas.
4. Implementar revisão de fatos e quality gate editorial.
5. Implementar publicação CMS idempotente com aprovação configurável.
6. Criar painel administrativo integrado e testes automatizados.
7. Atualizar este notebook com evidências reais e sincronizar a cópia local.

## Continuação Blog Factory IA — geração por IA e rotina periódica (21/10/2026)

### Novas entregas na branch `feat/blog-factory-ia`
- `src/modules/blogFactory/blogFactory.service.ts`: geração de rascunhos originais por API compatível com OpenAI Chat Completions, validação mínima de saída, checklist editorial e execução de ciclo pesquisa + geração limitada.
- `src/modules/blogFactory/blogFactory.scheduler.ts`: execução periódica com intervalo configurável, trava para evitar ciclos sobrepostos, tratamento de falhas e logs.
- `src/server.ts`: inicialização condicional do scheduler quando `BLOG_FACTORY_AUTORUN_ENABLED=true`.
- `src/modules/blogFactory/wordpressPublisher.ts`: adaptador WordPress REST que cria posts com status `draft`.
- `src/modules/blogFactory/blogFactory.controller.ts` e `blogFactory.routes.ts`: endpoints de ciclo e geração de artigo.
- `public/blog-factory.html`: página inicial do módulo e catálogo dos endpoints.
- `src/modules/blogFactory/README.md`: configuração, endpoints e limites atualizados.

### Variáveis de ambiente
- `BLOG_FACTORY_AUTORUN_ENABLED=true`: liga rotina periódica; padrão desligado.
- `BLOG_FACTORY_INTERVAL_MS=1800000`: 30 minutos por padrão, mínimo 5 minutos.
- `BLOG_FACTORY_AI_ENABLED=true`: habilita geração de rascunhos.
- `BLOG_FACTORY_AI_API_KEY` ou `OPENAI_API_KEY`: chave do provedor, somente no ambiente local/servidor.
- `BLOG_FACTORY_AI_BASE_URL`: endpoint base compatível com OpenAI, opcional.
- `BLOG_FACTORY_AI_MODEL`: modelo, padrão `gpt-4o-mini`.
- `BLOG_FACTORY_MAX_ARTICLES_PER_CYCLE=3`: máximo de artigos gerados por ciclo, entre 1 e 10.
- WordPress: `BLOG_FACTORY_WORDPRESS_URL`, `BLOG_FACTORY_WORDPRESS_USERNAME`, `BLOG_FACTORY_WORDPRESS_APP_PASSWORD`.
- A integração WordPress exige aprovação editorial explícita via `POST /api/blog-factory/articles/:id/approve`; não é necessário desativar uma variável de aprovação. O endpoint `/publish` envia somente como rascunho WordPress.

### Endpoints novos
- `POST /api/blog-factory/run-cycle`: pesquisa feeds e tenta gerar artigos para pautas novas.
- `POST /api/blog-factory/topics/:id/generate`: gera artigo a partir de uma pauta específica.
- `POST /api/blog-factory/articles/:id/publish`: nome histórico do endpoint; envia para WordPress como rascunho, após as verificações e configuração exigidas.

### Regras de segurança editorial
- Não copiar ou clonar artigos completos de portais. A fonte serve como referência e descoberta; o texto deve ser original.
- A geração é baseada no título e resumo do feed. O sistema registra explicitamente que a fonte integral não foi verificada automaticamente.
- A saída de IA é rascunho e exige verificação factual humana.
- Não há publicação pública automática nesta entrega.
- Não ativar variáveis de automação no ambiente de produção sem validar o código, o custo do provedor e o funcionamento dos feeds.

### Validação ainda pendente
Os arquivos foram escritos no GitHub por commits na branch de feature, mas os comandos locais `npx prisma migrate deploy`, `npx prisma generate`, `npm run typecheck`, `npm run build` e testes de integração não foram executados nesta sessão. Não marcar como pronto para produção até obter esses resultados. Revisar especialmente a tipagem TypeScript, a compatibilidade do provedor configurado, o comportamento de feeds RSS/Atom reais e a resposta do WordPress em ambiente de teste.


### Continuação técnica — priorização editorial e CI (21/10/2026)
- Adicionado `trendScore` aos modelos Prisma e à migração; a ordenação usa uma heurística simples de recência da publicação (não é uma medição real de viralização).
- Corrigida a normalização da URL do adaptador WordPress após o primeiro CI identificar erro de sintaxe TypeScript em `wordpressPublisher.ts`.
- Ajustado o contador do painel de status para incluir artigos `NEEDS_REVIEW` nos rascunhos em revisão.
- Atualizado `.github/workflows/ci.yml` para também disparar em branches `feat/**`.
- O CI anterior passou por instalação, encoding, validação/geração Prisma e migrações; falhou no typecheck por causa do regex da URL WordPress. O regex foi corrigido em commit posterior, mas ainda falta uma execução de CI referente ao head atualizado. Não declarar validação completa até confirmar typecheck, build, testes e Guardian.


### Continuação — revisão editorial, painel e proteção de conteúdo (21/10/2026)
- O painel `public/blog-factory.html` passou a oferecer conexão administrativa, pesquisa RSS, execução do ciclo, geração de artigo, edição, aprovação editorial e envio ao WordPress como rascunho.
- Adicionada rota `POST /api/blog-factory/articles/:id/approve`. O envio ao CMS agora exige estado `APPROVED`; editar artigo aprovado revoga a aprovação e retorna para revisão.
- Sanitizador HTML endurecido com lista permitida de tags editoriais e descarte de atributos HTML; parser XML/RSS e quality gate da IA corrigidos após revisão do CI.
- A geração automática seleciona pautas por recência (`trendScore`) e respeita o limite por ciclo. Essa pontuação é heurística, não mede tendências virais ou audiência.
- Bloqueada a edição de artigos já enviados ao WordPress como rascunho, para evitar criar uma nova submissão duplicada inadvertidamente.
- O WordPress permanece como destino de rascunhos; não há publicação pública automática nesta versão.

### Validação pós-correções
- O código foi atualizado na branch `feat/blog-factory-ia`; o CI deve validar o head mais recente.
- Ainda é obrigatório confirmar no GitHub Actions os resultados de Prisma validate/generate/migrate, typecheck, build, testes e Guardian antes de integrar em `main`.
- O ambiente local, credenciais do provedor de IA, feeds reais e WordPress não foram executados/testados nesta sessão.


### Hardening final — sanitização por lista permitida (21/10/2026)
- Substituído o filtro inicial de HTML por uma lista permitida de tags editoriais. Atributos HTML são descartados; tags ativas/embeds são removidas antes de salvar o conteúdo editado.
- Corrigida a limpeza de blocos Markdown JSON e a validação de URL de fonte.
- Restaurado o parser XML/RSS para preservar a decodificação de CDATA e entidades.
- CI iniciado para commits anteriores desta rodada; confirmar execução correspondente ao head mais recente antes de considerar a branch validada.


### Resultado de CI — commit de código validado (22/10/2026)
- GitHub Actions concluiu com sucesso os workflows `sale-ia-v2-ci` (run 39673071837) e `Affiliate Module CI` (run 39673071461) no commit de código `7df368de94ce2c82b713f4ca4d061645075aa1d0`.
- No Affiliate Module CI, instalação de dependências, `prisma validate`, `prisma generate`, `prisma migrate deploy` e `npm run typecheck`, build, testes e Guardian finalizaram com sucesso.
- O workflow principal `sale-ia-v2-ci` também finalizou com sucesso.
- Depois desses checks foi feito um ajuste documental no notebook para remover uma variável de aprovação obsoleta; esse último commit altera apenas documentação. Confirmar o estado final do PR antes do merge.


### Correções adicionais de runtime — Blog Factory (22/10/2026)
- Criada branch isolada `fix/blog-factory-runtime-20261022` baseada na feature do Blog Factory; não mesclada em `main`.
- Implementada a API de serviço que faltava ao controlador: status, descoberta RSS/Atom, listagem, geração, edição, aprovação e ciclo de automação.
- A descoberta aceita feeds configurados em `BLOG_FACTORY_FEEDS`, valida URLs HTTP(S), limita o tamanho do feed e registra falhas por origem.
- Corrigida a inicialização do scheduler: agora agenda ciclos com intervalo configurável, impede ciclos sobrepostos e pode ser encerrado explicitamente.
- Geração usa `OPENAI_API_KEY`, timeout e validação de resposta JSON; não cria texto fictício quando a IA está indisponível.
- Aplicada sanitização HTML por lista permitida ao conteúdo gerado/editado; pontuação de pauta representa apenas recência da fonte.
- Impedida geração repetida para uma pauta que já tenha artigo; erros de duplicidade retornam conflito.
- Aprovação humana e qualidade mínima são exigidas antes do envio. O WordPress recebe rascunho, e o ID/link remoto são persistidos para bloquear reenvios duplicados.
- Acrescentadas colunas WordPress ao schema por uma nova migração aditiva (sem reescrever a migração inicial já publicada) e testes de API em `tests/blogFactory.test.ts`.
- Documentação ajustada para refletir as variáveis realmente usadas: `BLOG_FACTORY_FEEDS`, `BLOG_FACTORY_AI_ENABLED`, `BLOG_FACTORY_MAX_ARTICLES_PER_CYCLE` e intervalo padrão de 6 horas.
- **Validação pendente:** o CI deve compilar o TypeScript, validar/gerar Prisma e executar os testes antes de considerar estas alterações corretas. Não foi possível executar comandos no computador local do usuário nem testar credenciais/feed/WordPress reais nesta sessão.

- PR de correção aberto: [#74](https://github.com/RuiBarbosasilva/sale-ia-v2/pull/74), direcionado primeiro à branch `feat/blog-factory-ia` para evitar incorporar os 49 commits da feature diretamente em `main`.
- Proteção extra: submissão WordPress agora usa uma reivindicação atômica de estado e consulta o slug remoto antes de criar; a API informa conflito se outra submissão estiver em andamento.
- Foram adicionados testes de API do módulo e testes de idempotência do adaptador WordPress. **O resultado do CI para o head atual ainda não está disponível nos status consultados**, portanto os testes permanecem não verificados.

- Corrigido também o painel `public/blog-factory.html`: os contadores e mensagens de pesquisa/ciclo agora usam os campos reais da API; removido o falso botão de “rascunho vazio” que tentava gerar IA; ações são mostradas conforme o estado do artigo; link WordPress e estado de configuração são apresentados corretamente.
- O endpoint de execução manual passou a usar o mesmo scheduler com trava de concorrência, evitando ciclos manuais e automáticos simultâneos.

- Recuperação automática de tópicos presos em `GENERATING_ARTICLE` há mais de 30 minutos; se já houver artigo, marca a pauta como processada, caso contrário libera para nova tentativa.

- O adaptador WordPress agora recusa colisão com slug já publicado/pendente (em vez de marcar falsamente o artigo como enviado); colisões retornam conflito e têm teste dedicado.

### Continuação técnica — gatilhos de CI e diagnóstico de runners (22/10/2026)
- Ajustados os gatilhos de `.github/workflows/ci.yml` e `.github/workflows/affiliate-ci.yml` para executar também em pull requests destinados a branches `feature/**`, `feat/**`, `chore/**` e `fix/**`, além de `main`. Isso corrige a cobertura de PRs como #74, cujo destino é `feat/blog-factory-ia`.
- Os novos commits dispararam os workflows, mas as execuções encerraram como `failure` antes de qualquer etapa: o endpoint de jobs retorna `steps: null`, sem `runner_id` e sem logs disponíveis. Portanto, ainda não há evidência de falha de TypeScript, Prisma ou testes; o bloqueio aparente ocorre antes da execução do runner.
- Não repetir reexecuções às cegas nem alterar o código para mascarar essa falha. É necessário verificar no GitHub Actions/Settings se Actions está habilitado e se há restrições de runners, política ou limite de uso. A integração disponível não expõe essas configurações nem os logs que expliquem o encerramento.
- Os workflows permanecem sem validação bem-sucedida no head atual. PR #74 não deve ser mesclada até obter CI válido e executar smoke tests locais de Prisma/API/feeds/WordPress.
- Corrigida também a recuperação parcial da geração: se o artigo for persistido mas a atualização do estado da pauta falhar, a rotina tenta marcar a pauta como `ARTICLE_CREATED` em vez de reabri-la para uma geração duplicada; a falha original é preservada.

### Correção adicional — inicialização do scheduler Blog Factory (23/10/2026)
- Revisão direta de `src/app.ts` identificou que o scheduler estava implementado, mas não era iniciado no bootstrap da aplicação. Isso contradizia a documentação de execução periódica.
- Corrigido em `41ca485f585d620648800a5c71d05630b56252e3`: o app agora importa `startBlogFactoryScheduler` e inicia o ciclo periódico somente quando `BLOG_FACTORY_AUTORUN_ENABLED=true`. O padrão continua desligado, evitando automação inesperada.
- A execução manual pela rota continua usando o scheduler com trava de concorrência.
- Validação continua pendente: o GitHub Actions ainda precisa executar as etapas; o último job consultado estava com `runner_id: 0`, `steps: []` e sem logs. Não afirmar que a correção compila até obter CI executado ou teste local.


### Reexecução do CI — diagnóstico confirmado (23/10/2026)
- Foram solicitadas novas tentativas dos jobs falhos, mas o resultado repetiu o padrão: runs `39945877165` (`sale-ia-v2-ci`) e `39945877154` (`Affiliate Module CI`) terminaram em cerca de 3 segundos.
- A API de jobs confirma `runner_id: 0`, `runner_name: ""`, `steps: []`; os endpoints de logs não disponibilizam logs. Ambos os workflows usam `runs-on: ubuntu-latest`, com etapas de checkout, Node 22, instalação, Prisma, typecheck, build, testes e Guardian.
- Isso confirma que a validação de código não chegou a iniciar; não permite concluir que o código passou nem identificar sozinho a causa administrativa. A causa deve ser investigada em GitHub Actions/Settings ou com o suporte do GitHub, verificando disponibilidade/políticas de runner e eventos da execução.
- Não foi feito merge, não foram desativadas verificações e não se alterou o workflow para ocultar a falha. Próxima ação segura: corrigir o ambiente de Actions e, em paralelo, executar no Windows local `npm ci`, `npx prisma validate`, `npx prisma generate`, `npm run typecheck`, `npm run build` e a suíte de testes; registrar resultados reais antes de integrar.

## Fechamento das pendências — auditoria e implementação incremental (23/10/2026)

### Diagnóstico confirmado no código remoto de `main`
A inspeção de `src/modules/mercadoLivre/`, `prisma/schema.prisma`, migrações, `src/server.ts`, rotas e `public/dropshipping-lab.html` confirmou que já existiam:
- pesquisa do catálogo público oficial de anúncios e persistência de execuções/snapshots;
- histórico observado de preço/estoque, alertas, watches agendados e bootstrap condicional do scheduler;
- motor de score de produto/fornecedor, cálculo de margem com custos discriminados, candidatos e ofertas ligadas a fornecedores;
- dashboard Dropshipping com autenticação administrativa e ações de pesquisa/avaliação.

Lacunas verificadas nesta inspeção:
- não havia adapter para a API oficial `/trends/{SITE_ID}` autenticada por OAuth nem tabelas próprias para snapshots de tendências;
- o histórico de preço existente não equivalia a histórico/variação do ranking semanal de tendências;
- pesquisa de fornecedores externos reais não está conectada a um provedor configurado nesta branch; evidências manuais e validação não substituem pesquisa externa;
- não há evidência nesta sessão de smoke tests locais, conta OAuth real, coleta real de tendências, negociação real com fornecedor ou publicação real de anúncio.

### Implementação criada em branch isolada
Branch: `feat/dropshipping-trends-persistence-20261023`, baseada em `main` para manter a mudança isolada dos PRs Blog Factory e dashboard.

Arquivos novos/alterados:
- `src/modules/mercadoLivre/services/mercadoLivreTrendsAdapter.ts`: consulta autenticada, valida site/categoria, classifica as posições 1–10 / 11–30 / 31–50 e descarta URLs fora dos domínios HTTPS oficiais.
- `src/modules/mercadoLivre/services/dropshippingTrendsService.ts`: persistência de execuções/snapshots, cadência semanal, nova tentativa após falha e recuperação de execução presa.
- `src/modules/mercadoLivre/controllers/dropshippingTrendsController.ts` e `src/modules/mercadoLivre/routes/mercadoLivreRoutes.ts`: coleta manual, histórico e comparação.
- `prisma/schema.prisma` + migração aditiva `20261023120000_dropshipping_trends`: histórico de execuções e snapshots, sem reset ou reescrita de migrações anteriores.
- `src/modules/mercadoLivre/services/dropshippingResearchScheduler.ts`: coleta semanal opcional das tendências gerais e das categorias configuradas.
- `public/dropshipping-lab.html`: controles para coletar, consultar histórico e comparar variação de posições.
- `src/modules/mercadoLivre/services/__tests__/mercadoLivreTrendsAdapter.test.ts`: testes unitários de classificação, OAuth, categoria, URLs e falhas.
- `.env.example` e `DROPSHIPPING_RESEARCH.md`: documentação de configuração e limites.

Endpoints protegidos pelo guard administrativo existente:
- `POST /api/mercadolivre/dropshipping/trends/collect` com `{"categoryId":"MLB1430"}` opcional.
- `GET /api/mercadolivre/dropshipping/trends/history?limit=30`.
- `GET /api/mercadolivre/dropshipping/trends/changes`.

Configuração adicional: `DROPSHIPPING_TREND_CATEGORY_IDS=MLB1430,MLB5672` (opcional). A rotina geral e as categorias são consultadas no máximo semanalmente após sucesso. O sistema precisa de conta Mercado Livre conectada e token OAuth válido; não gera resultados fictícios.

Referência oficial: https://developers.mercadolivre.com.br/pt_br/relatorios-de-faturamento/tendencias — API autenticada; o ranking é atualizado semanalmente e suas posições não são previsão de vendas.

### Estado de validação — NÃO marcar como concluído
- [x] Auditoria remota inicial do código e registro das lacunas.
- [x] Implementação do adapter autenticado, persistência, histórico/comparação e controles no dashboard publicada em branch isolada.
- [ ] `npx prisma validate`, `npx prisma generate`, `npx prisma migrate deploy`, `npm run typecheck`, `npm run build`, testes e Guardian aprovados.
- [ ] Coleta manual de tendências executada com OAuth real e duas coletas reais para validar comparação.
- [ ] Provedor autorizado de pesquisa de fornecedores escolhido/configurado; evidências reais e política de dropshipping verificadas.
- [ ] Fluxo de aceite explícito de cadastro/condições do fornecedor confirmado na interface e persistência.
- [ ] Revisar a publicação OAuth de anúncios para aprovação explícita, pré-validação e idempotência antes de habilitar qualquer publicação real.
- [ ] Smoke test do dashboard e API no Windows local.
- [ ] Reconciliar alterações locais de Qwen com GitHub, sem sobrescrever arquivos não inspecionados nem incluir `dump.rdb`.
- [ ] Sincronizar a cópia local com commits/branches remotos sem descartar alterações.

### Bloqueio de CI confirmado
Na primeira consulta, PR #74 no head `61f15d390b0d5cfda0b4006a58652c91f8d7c496` falhou nos runs `39946257838` e `39946257861` antes de qualquer etapa. Depois da atualização documental, os runs `39967532723` (`Affiliate Module CI`) e `39967532849` (`sale-ia-v2-ci`) no head `19b8a05e4934f54690c9d2de0b93aa08ed1e3467` repetiram o mesmo padrão; também foram observados os runs duplicados `39967521481`, `39967521560`, `39967435992` e `39967436112`. Para PR #75, os runs `39967456050` (`sale-ia-v2-ci`) e `39967456123` (`Affiliate Module CI`) no head `d14ff7a564308ff2943d384813d42876a16308df` falharam igualmente antes das etapas.

Nos jobs consultados, `steps` está ausente/nulo e não há logs de execução. Portanto, não há evidência de que Prisma, TypeScript ou testes tenham iniciado. Não contornar a validação nem fazer merge por inferência. Investigar permissões/políticas/runner no GitHub Actions e executar a suíte localmente enquanto isso. Os IDs acima registram as tentativas observadas até 23/10/2026 14:12 UTC; commits posteriores podem iniciar novas tentativas.

### PRs ainda abertas
- Blog Factory: https://github.com/RuiBarbosasilva/sale-ia-v2/pull/74 — alterações de runtime estão no branch de correção; não mesclar sem CI válido e smoke tests.
- Dashboard central: https://github.com/RuiBarbosasilva/sale-ia-v2/pull/73 — não mesclar sem CI válido e smoke tests.
- Hunter de tendências: branch `feat/dropshipping-trends-persistence-20261023`; abrir/revisar PR isolada após inspeção final dos arquivos e verificar CI.

**Regra:** implementação no GitHub não equivale a execução validada. Marcar cada pendência como concluída somente com evidência do comando/teste ou fluxo real correspondente.

- PR #75 (Hunter de tendências) foi aberta em Draft: https://github.com/RuiBarbosasilva/sale-ia-v2/pull/75. Os workflows no head `d14ff7a564308ff2943d384813d42876a16308df` também falharam antes das etapas: `sale-ia-v2-ci` run `39967456050` e `Affiliate Module CI` run `39967456123`; o job consultado não contém steps/logs. O código da tendência ainda não está validado por execução.

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

- Atualização da auditoria em 2026-10-22: o cartão visual RB-factory-hunter também foi corrigido para permanecer dentro da central autenticada; o link direto para `/api/hunter/opportunities` foi removido. Commit `081465a3083a8d8362ae44284c3daaa7630183e1`.
- O HEAD atual `ad90ffebf6e2b1d38ce78852fb54be2b7a44ce3c` gerou runs #1528 (`sale-ia-v2-ci`, ID `39853040684`) e #1491 (`Affiliate Module CI`, ID `39853040866`); ambos falharam, com jobs sem etapas/logs (`steps: null`, `logs_url: null`). A causa continua indeterminada.
- O estado atual do PR via API indica `mergeable: false`, ao contrário das verificações anteriores. Tratar como possível conflito com `main`; não mesclar. É necessário reconciliar a branch com a versão atual de `main` e confirmar o resultado do merge antes de considerar a PR pronta.

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

### Conflitos documentais resolvidos e estado atual das PRs — 26/10/2026

- [x] Consolidados no notebook principal os históricos específicos de Blog Factory, Dashboard Central e tendências Mercado Livre, preservando os detalhes de implementação e as pendências reais.
- [x] Sincronizado o notebook entre `main` e as branches #72, #73, #74 e #75; isso removeu o conflito documental.
- [x] PR #74 sincronizada com o registro de rota de login, publisher WordPress endurecido e testes atualizados; `dump.rdb` removido também do branch de runtime para não voltar a ser versionado.
- [x] GitHub passou a reportar `mergeable=true`, `mergeable_state=unstable` para #72, #73, #74 e #75. Conflitos conhecidos resolvidos; as PRs ainda não estão aprovadas.
- Runs mais recentes observados: #72 `40330803392`; #73 `40330818951`; #74 `40331199445`; #75 `40330830568`. Todos falham antes do runner/steps, com `steps=null` e `logs_url=null`.
- [ ] Executar em Windows local `npm ci`, encoding, Prisma validate/generate/migrate deploy, typecheck, build, testes e Guardian. Não há evidência de que esses comandos tenham rodado; não mesclar até haver resultados reproduzíveis.

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


---

## Continuidade operacional — 04/11/2026

### Integrações e validações confirmadas nesta sessão

- [x] PR #73 integrada à `main`: autenticação administrativa e registro dos módulos RB Factory no Dashboard Central.
- [x] PR #75 integrada à `main`: coleta oficial de tendências do Mercado Livre, histórico persistido e comparação de movimentos de ranking.
- [x] PR #77 integrada à `main`: inicialização opt-in do scheduler do Blog Factory e serialização de ciclos manuais/agendados.
- [x] PR #78 integrada à `main`: proteção das métricas do RB Factory Sites e quality gate de demos.
- [x] PR #79 integrada à `main`: planejador autenticado de conteúdo para TikTok Afiliados.
- [x] PR #80 integrada à `main` por squash em `57305374e51cef75a9d6a1df42e2cabbc87aad8e`: revisão editorial do Blog Factory, edição de rascunhos, distinção entre aprovação editorial e envio ao WordPress como rascunho.
- [x] Os dois workflows da PR #80 terminaram com sucesso: `sale-ia-v2-ci` (run `41921511429`) e `Affiliate Module CI` (run `41921511395`). Ambos executaram Prisma validate/generate/migrate, typecheck, build, testes e Guardian.
- [x] Os workflows no commit anterior à PR #80 (`b37bd38c4aae9839a56eb6c7757f786dcf15c370`) também passaram integralmente: `41921282151` e `41921282000`.
- [ ] Após o merge #80, os novos workflows da `main` foram iniciados (runs `41923995949` e `41923995793`); confirmar conclusão antes de registrar o estado final do commit de merge.

### PRs antigas ainda abertas — não integrar em bloco

- **PR #74 — Blog Factory runtime antigo:** continua aberta e o GitHub reporta conflito/não mergeável. A branch tem 108 commits à frente e 20 atrás da `main`; seus arquivos se sobrepõem ao Blog Factory já integrado pelas PRs #72 e #77. Não fazer merge integral nem restaurar alterações antigas de dashboard, autenticação, schema ou `dump.rdb`. Revisar somente eventual correção funcional que ainda não exista na `main`; caso não haja diferença necessária, encerrar como obsoleta após confirmar equivalência.
- **PR #70 — Social Media Factory IA:** continua aberta e não mergeável; branch divergente com 79 commits à frente e 20 atrás da `main`. O diff mistura o módulo Social Media com alterações antigas de Dropshipping, schema Prisma, rotas e documentação. A `main` não contém `src/modules/social-media-factory/` nem as migrations `social_media_factory_ia`; portanto a funcionalidade Social Media ainda não está integrada. Não mesclar a PR inteira. Portar apenas o módulo Social Media para uma branch nova baseada na `main`, integrar modelos/migrations e rotas de forma aditiva, preservando as versões atuais de Dropshipping e RB Factory; depois executar CI completo.
- A PR #80 foi validada e integrada; não repetir seus testes isoladamente. A validação pós-merge é feita pelos runs da `main` acima.

### Próxima sequência de execução

1. Confirmar sucesso dos workflows pós-merge #80 na `main`.
2. Portar seletivamente Social Media Factory IA da PR #70 para branch nova baseada no HEAD atual, sem copiar alterações antigas de Dropshipping ou substituir arquivos compartilhados por versões obsoletas.
3. Executar Prisma validate/generate/migrate deploy, encoding, typecheck, build, testes e Guardian na nova branch; corrigir falhas antes de abrir/mesclar PR.
4. Reavaliar a PR #74 por diferenças funcionais restantes; não mesclar código já incorporado.

**Regra preservada:** não executar `prisma migrate reset`, `git reset --hard` ou `git clean`; não sobrescrever módulos que já estão funcionando; não marcar validação como concluída sem resultado observável.


---

## Atualização de execução — 04/11/2026 (continuidade)

- [x] PR #80 integrada à `main` em `57305374e51cef75a9d6a1df42e2cabbc87aad8e`; validação pós-merge da `main` concluída com sucesso nos workflows `41923995949` e `41923995793`.
- [x] Notebook atualizado após as integrações anteriores; commit documental `7e3b4d1c379a1c93409ce1f947499110b035d700` validado pelos workflows `41924068950` e `41924068984`, ambos `success`.
- [x] PR #74 encerrada como obsoleta em 04/11. O controller antigo ainda permitia fallback de autenticação por `AFFILIATE_ADMIN_KEY`; a `main` atual removeu esse fallback. Serviço, scheduler, publisher e testes atuais já estão integrados. A branch antiga foi preservada.
- [ ] PR #70 permanece aberta enquanto a portabilidade seletiva Social Media é validada; não mesclar seu diff antigo que mistura Dropshipping e schema obsoleto.
- [x] Criada branch `feat/social-media-factory-main-20261104` a partir da `main` atual e PR #81 aberta: https://github.com/RuiBarbosasilva/sale-ia-v2/pull/81.
- [x] Portados para a PR #81 apenas os seis modelos Social, quatro migrations, sete componentes do módulo, painel, callback OAuth, scheduler opt-in, configuração, documentação e dependências opcionais de vídeo.
- [x] Dashboard Central atualizado com o card `RB-Factory-Social-Media`.
- [x] Correções da portabilidade: modo DRY_RUN não contabiliza publicação real; chave administrativa comparada em tempo constante; renderer Python usa caminho da raiz, valida postId/roteiro e exige URL pública HTTPS; vídeo grava mediaUrls como array JSON e preserva o status do post.
- [x] Testes adicionados para rota do painel e bloqueio da API sem chave/ com chave incorreta.
- [ ] Validação CI da PR #81: no head `8b65cccbe41b700d433a01b65766dab3cb9c1ca3`, instalação, encoding, Prisma validate/generate/migrate deploy e typecheck já passaram; build, testes e Guardian ainda estavam em execução na última consulta. Não mesclar antes de todos concluírem com sucesso.
- [ ] Após validação e merge da #81, encerrar a PR #70 como substituída e sincronizar notebook/branch local.
- **Limite de produção:** a publicação real nas redes continua dependente de credenciais OAuth, permissões aprovadas, callback HTTPS, tokens e contas autorizadas. O scheduler permanece opt-in/desativado por padrão; nenhuma credencial real foi adicionada.


---

## Fechamento da integração Social Media — 04/11/2026

- [x] PR #81 mesclada por squash na `main`: `fcbb5a2ba49d62df049e3c5b0a3f0a686fe97302`.
- [x] CI da PR #81 concluída com sucesso no head `3739e14f63925c8e59c8a698a0e40f8723fec3f1`:
  - `sale-ia-v2-ci`: run `41924908202`, sucesso.
  - `Affiliate Module CI`: run `41924908224`, sucesso.
  - Em ambos: encoding, Prisma validate/generate/migrate deploy, typecheck, build, testes e Guardian aprovados.
  - Testes: 27 suites aprovadas, 121 testes aprovados, 0 falhas.
- [x] PR #70 encerrada como substituída pela #81; branch antiga preservada.
- [x] PR #74 encerrada como obsoleta; branch antiga preservada.
- [x] Conferido no HEAD da `main`: seis modelos Social no Prisma, rotas API/OAuth registradas, painel servido em `/social-media-factory` e card `RB-Factory-Social-Media` no dashboard central.
- [ ] CI pós-merge da `main` no commit `fcbb5a2ba49d62df049e3c5b0a3f0a686fe97302` ainda estava em execução na última consulta: `sale-ia-v2-ci` run `41925128301`; `Affiliate Module CI` run `41925128374`. Confirmar conclusão.
- **Pendência de produção externa:** cadastrar credenciais de Meta, TikTok, Google e Pinterest; configurar callback HTTPS e chave AES-256; autorizar contas e validar uma publicação real por rede antes de ativar `SOCIAL_MEDIA_FACTORY_ENABLED=true`. Nenhuma publicação automática foi ativada nesta integração.

### Próxima ação técnica
Depois de confirmar os dois workflows pós-merge, continuar a auditoria dos módulos existentes no HEAD atual, começando pelos smoke tests do Dashboard Central, Blog Factory, RB Factory Sites, Afiliados e Dropshipping. Preservar o estado de cada módulo e não reexecutar verificações já aprovadas sem mudança de código.


## Auditoria RB Factory Sites — rodada adicional 04/11/2026

- [x] PR #82 integrada: controller de autonomia agora aguarda os métodos async; CI principal e Affiliate CI verdes.
- [x] PR #83 integrada no commit `bd4aaa3940b38f96b154a43cd6813c1eecf656e5`: corrigido falso status de proposta enviada. A função preparava texto/conversa, mas marcava proposta como SENT e prospect como PROPOSAL_SENT sem chamar provedor. Agora mantém READY e retorna `delivery.status=NOT_SENT`; registros SENT antigos são sinalizados como `LEGACY_UNVERIFIED`. CI principal e Affiliate CI passaram, incluindo testes e Guardian.
- [ ] PR #84 em validação: a consulta da fila diária omitia `WebsiteProspect.contactedAt`, `nextFollowUpAt` e `status`, confundindo status do pipeline com status do prospect. Também agendar follow-up alterava `lastContactAt` sem contato real. Correção e testes entregues; aguardar ambos os workflows.
- [ ] Continuar revisão de integridade dos estados de proposta e pipeline, sem marcar como enviado/publicado/contatado sem confirmação real.
- [ ] Verificar integração de entrega real WhatsApp/e-mail: a geração de mensagens existe, mas não foi comprovado envio externo ativo. Manter ação manual até existir provedor autenticado e confirmação.
