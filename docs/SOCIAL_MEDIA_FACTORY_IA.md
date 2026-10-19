# Social Media Factory IA

Módulo multiempresa para planejamento, criação de rascunhos, calendário e auditoria de publicações.

## Estado desta entrega

- Persistência Prisma/SQLite para projetos, contas, posts e logs.
- API administrativa autenticada com `x-sale-ia-admin-key`.
- Painel em `/social-media-factory`.
- Geração de rascunhos via OpenAI, quando `OPENAI_API_KEY` está configurada.
- Agendamento e trilha de auditoria.
- Publicação real **ainda bloqueada** até que cada provedor tenha um adaptador oficial implementado e OAuth/permissões configurados. O sistema não simula publicação: quando chega o horário sem adaptador, registra `INTEGRATION_REQUIRED`.

## Configuração

1. Configure `SALE_IA_ADMIN_KEY` no ambiente do backend.
2. Para geração por IA, configure `OPENAI_API_KEY` e, opcionalmente, `SOCIAL_MEDIA_AI_MODEL` (padrão `gpt-4.1-mini`).
3. Rode `npx prisma migrate deploy` e `npx prisma generate`.
4. Para iniciar o worker de agendamento, configure `SOCIAL_MEDIA_FACTORY_ENABLED=true` e reinicie o servidor.
5. Abra `http://localhost:3000/social-media-factory`.

## API

Todas as rotas requerem `x-sale-ia-admin-key: <SALE_IA_ADMIN_KEY>`.

- `GET /api/social-media-factory/status`
- `GET /api/social-media-factory/platforms`
- `GET /api/social-media-factory/workspaces`
- `POST /api/social-media-factory/workspaces` — `{ "name": "...", "niche": "...", "timezone": "America/Sao_Paulo" }`
- `GET /api/social-media-factory/workspaces/:workspaceId/posts?limit=50`
- `POST /api/social-media-factory/workspaces/:workspaceId/posts`
- `POST /api/social-media-factory/workspaces/:workspaceId/generate-batch` — `{ "topic": "...", "count": 5, "instructions": "..." }`
- `POST /api/social-media-factory/posts/:postId/schedule` — `{ "scheduledFor": "ISO-8601 futuro" }`
- `POST /api/social-media-factory/posts/:postId/publish`
- `GET /api/social-media-factory/posts/:postId/logs`

## Plataformas-alvo

Instagram, Facebook, TikTok, YouTube, Google Business Profile e Pinterest. Cada plataforma requer seu próprio fluxo de autorização, escopos e adaptador de publicação, e alguns formatos (Reels/Shorts/Stories/carrossel) têm requisitos específicos. Não armazenar tokens OAuth em texto simples nos campos de perfil; `credentialsRef` destina-se a uma referência segura de segredo, não ao token bruto.

## Frequência

A configuração desejada é de até 5 posts por dia por rede e por projeto (até 30 por dia por projeto). A API aceita lotes de até 30 rascunhos por chamada; o padrão do painel é 30, orientado a cinco conteúdos por rede. A distribuição gerada pela IA deve ser revisada antes do agendamento e precisa respeitar limites, formatos e políticas de cada rede. A publicação automática só deve ser habilitada após validar as integrações e limites aplicáveis.
