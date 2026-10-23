# CADERNO OPERACIONAL — SALE-IA V2
## Atualização: 23/10/2026
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
- [x] Inspeção remota inicial do código e matriz de lacunas concluída em 23/10/2026; lacunas restantes registradas na seção de continuidade abaixo.
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
As execuções mais recentes para PR #74 no head `61f15d390b0d5cfda0b4006a58652c91f8d7c496` foram:
- `sale-ia-v2-ci`: run `39946257838`, falha em cerca de 3 segundos.
- `Affiliate Module CI`: run `39946257861`, falha em cerca de 2 segundos.

Os jobs retornam `steps: null` e não oferecem logs; portanto, não há evidência de que Prisma, TypeScript ou testes tenham iniciado. Não contornar a validação nem fazer merge por inferência. Investigar permissões/políticas/runner no GitHub Actions e executar a suíte localmente enquanto isso.

### PRs ainda abertas
- Blog Factory: https://github.com/RuiBarbosasilva/sale-ia-v2/pull/74 — alterações de runtime estão no branch de correção; não mesclar sem CI válido e smoke tests.
- Dashboard central: https://github.com/RuiBarbosasilva/sale-ia-v2/pull/73 — não mesclar sem CI válido e smoke tests.
- Hunter de tendências: branch `feat/dropshipping-trends-persistence-20261023`; abrir/revisar PR isolada após inspeção final dos arquivos e verificar CI.

**Regra:** implementação no GitHub não equivale a execução validada. Marcar cada pendência como concluída somente com evidência do comando/teste ou fluxo real correspondente.

- PR #75 (Hunter de tendências) foi aberta em Draft: https://github.com/RuiBarbosasilva/sale-ia-v2/pull/75. Os workflows no head `d14ff7a564308ff2943d384813d42876a16308df` também falharam antes das etapas: `sale-ia-v2-ci` run `39967456050` e `Affiliate Module CI` run `39967456123`; o job consultado não contém steps/logs. O código da tendência ainda não está validado por execução.
