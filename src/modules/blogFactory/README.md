# Blog Factory IA

Módulo editorial para descobrir pautas em RSS/Atom, gerar rascunhos originais, revisar e encaminhar conteúdo aprovado ao WordPress como rascunho.

## Recursos
- Descoberta manual e agendada por RSS/Atom configurados explicitamente em `BLOG_FACTORY_FEEDS`.
- Deduplicação de pautas por URL e título.
- Priorização heurística por recência (não mede visualizações nem viralização real).
- Persistência de pautas e artigos via Prisma/SQLite.
- Geração de artigo original via endpoint compatível com OpenAI Chat Completions.
- Ciclo periódico opcional, limite de artigos por ciclo e proteção contra ciclos sobrepostos.
- Painel em `/blog-factory.html`.
- API administrativa protegida por `x-sale-ia-admin-key`.
- Aprovação editorial explícita e integração WordPress REST que cria somente posts `draft`.

## Configuração
- `SALE_IA_ADMIN_KEY`: chave administrativa já usada pelo Sale-IA v2.
- `BLOG_FACTORY_FEEDS`: URLs RSS/Atom separados por vírgula, ponto e vírgula ou nova linha; obrigatório para pesquisa.
- `BLOG_FACTORY_AUTORUN_ENABLED=true`: inicia pesquisa periódica ao iniciar o servidor.
- `BLOG_FACTORY_INTERVAL_MS=21600000`: intervalo padrão de 6 horas; mínimo de 1 minuto e máximo de 7 dias.
- `BLOG_FACTORY_AI_ENABLED=true`: ativa geração de rascunhos durante ciclos agendados (padrão desligado).
- `OPENAI_API_KEY`: chave do provedor OpenAI; não versionar.
- `BLOG_FACTORY_AI_MODEL`: modelo, padrão `gpt-4o-mini`.
- `BLOG_FACTORY_MAX_ARTICLES_PER_CYCLE=3`: limite por ciclo (1–10).
- WordPress: `BLOG_FACTORY_WORDPRESS_URL`, `BLOG_FACTORY_WORDPRESS_USERNAME`, `BLOG_FACTORY_WORDPRESS_APP_PASSWORD`.

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
- `POST /api/blog-factory/articles/:id/approve`: aprovação humana explícita após checagens mínimas.
- `POST /api/blog-factory/articles/:id/publish`: nome legado; requer estado `APPROVED` e envia como rascunho WordPress, não publica publicamente.

Todas as rotas, exceto health, exigem `x-sale-ia-admin-key`.

## Integridade editorial
O sistema não clona nem reproduz artigos completos. Os feeds servem como sinal de descoberta e contexto limitado; o texto gerado deve ser original. A aprovação automatizada verifica apenas critérios técnicos mínimos (título, tamanho e URL de fonte), não a veracidade dos fatos. Uma pessoa deve revisar fatos, direitos de uso e contexto. O WordPress recebe apenas rascunhos. A página não armazena a chave administrativa em armazenamento persistente.

## Validação
Executar `npx prisma validate`, `npx prisma migrate deploy`, `npx prisma generate`, `npm run typecheck`, `npm run build`, `npm test -- --runInBand --forceExit` e Guardian na branch atual. Não executar `prisma migrate reset`. Não mesclar em `main` antes de CI verde e teste local.
