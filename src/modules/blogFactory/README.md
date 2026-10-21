# Blog Factory IA

Módulo editorial para descobrir pautas, gerar rascunhos originais e encaminhar conteúdo revisado ao WordPress como rascunho.

## Recursos
- Descoberta manual e agendada por RSS/Atom; feeds padrão G1 RSS e Agência Brasil.
- Priorização editorial heurística por recência da publicação; não é uma métrica real de viralização nem substitui sinais de audiência.
- Deduplicação de pautas por URL e título.
- Persistência de pautas e artigos via Prisma/SQLite.
- Geração de artigo original via endpoint compatível com OpenAI Chat Completions.
- Limites por ciclo e proteção contra ciclos simultâneos.
- Dashboard inicial em `/blog-factory.html`.
- API administrativa protegida por `x-sale-ia-admin-key`.
- Adaptador WordPress que cria posts com status `draft`, nunca publicação pública automática nesta versão.

## Configuração
- `SALE_IA_ADMIN_KEY`: chave administrativa já usada pelo Sale-IA v2.
- `BLOG_FACTORY_RSS_FEEDS`: URLs de feeds separados por vírgula (opcional).
- `BLOG_FACTORY_AUTORUN_ENABLED=true`: inicia pesquisa periódica ao iniciar o servidor.
- `BLOG_FACTORY_INTERVAL_MS=1800000`: intervalo padrão de 30 minutos; mínimo de 5 minutos.
- `BLOG_FACTORY_AI_ENABLED=true`: ativa geração de rascunhos durante o ciclo.
- `BLOG_FACTORY_AI_API_KEY` ou `OPENAI_API_KEY`: chave do provedor; não versionar.
- `BLOG_FACTORY_AI_BASE_URL`: endpoint base compatível com OpenAI, opcional.
- `BLOG_FACTORY_AI_MODEL`: modelo, padrão `gpt-4o-mini`.
- `BLOG_FACTORY_MAX_ARTICLES_PER_CYCLE=3`: limite de artigos por ciclo (1–10).
- WordPress: `BLOG_FACTORY_WORDPRESS_URL`, `BLOG_FACTORY_WORDPRESS_USERNAME`, `BLOG_FACTORY_WORDPRESS_APP_PASSWORD`.
- `BLOG_FACTORY_REQUIRE_HUMAN_APPROVAL=false`: habilita o envio manual pelo endpoint para WordPress como rascunho. O padrão exige aprovação humana.

## Rotas
- `GET /api/blog-factory/health`
- `GET /api/blog-factory/status`
- `POST /api/blog-factory/research`
- `POST /api/blog-factory/run-cycle`
- `GET /api/blog-factory/topics`
- `POST /api/blog-factory/topics/:id/generate`
- `GET /api/blog-factory/articles`
- `POST /api/blog-factory/articles/draft`
- `PATCH /api/blog-factory/articles/:id`
- `POST /api/blog-factory/articles/:id/publish`

Todas as rotas, exceto health, exigem `x-sale-ia-admin-key`.

## Integridade editorial e limites
O sistema não clona nem reproduz artigos completos. Utiliza metadados e resumos disponíveis nos feeds como sinal inicial e mantém links das fontes. A IA deve criar texto original e sinalizar lacunas; isso não substitui verificação factual. A publicação externa não ocorre automaticamente: a integração WordPress cria somente rascunhos e o envio exige configuração e aprovação humana explícita. O sistema não garante que um tópico seja tendência viral; os feeds fornecem descoberta, não métricas de popularidade.

## Migração e validação
1. Sincronizar a branch sem descartar alterações locais.
2. Executar `npx prisma migrate deploy`.
3. Executar `npx prisma generate`.
4. Executar `npm run typecheck`, `npm run build` e testes.
5. Validar `GET /api/blog-factory/health` e chamadas administrativas em ambiente local.

Não executar `prisma migrate reset`. A implementação remota ainda precisa de validação no ambiente local antes de integrar à `main`.
