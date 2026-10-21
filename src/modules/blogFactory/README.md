# Blog Factory IA — primeira entrega

Módulo editorial inicial do Sale-IA v2.

- Descoberta de pautas por feeds RSS via API/dashboard.
- Deduplicação e persistência em Prisma/SQLite.
- Pautas e rascunhos com referências rastreáveis.
- API administrativa protegida por `x-sale-ia-admin-key`.
- Publicação bloqueada por padrão e verificação mínima.

Configuração:
- `SALE_IA_ADMIN_KEY`: chave administrativa existente.
- `BLOG_FACTORY_RSS_FEEDS`: feeds RSS/Atom separados por vírgula, opcional.
- `BLOG_FACTORY_AUTO_PUBLISH=true`: habilita apenas a transição interna para status PUBLISHED após verificações. Não publica em CMS externo.

Limitações: esta primeira entrega ainda não inclui geração de texto por IA, avaliação quantitativa de tendências, execução contínua em background, adaptador WordPress, imagens, revisão factual automatizada ou analytics. A pesquisa é disparada manualmente. O status PUBLISHED não prova publicação em site externo.

Aplique a migração `20261021180000_blog_factory_ia` com `npx prisma migrate deploy` e depois execute `npx prisma generate`. Nunca use `prisma migrate reset`.
