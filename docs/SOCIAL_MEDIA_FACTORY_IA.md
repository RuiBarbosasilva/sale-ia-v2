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
- `GET /api/social-media-factory/workspaces/:workspaceId/automation-runs?limit=20`
- `POST /api/social-media-factory/workspaces/:workspaceId/posts`
- `POST /api/social-media-factory/workspaces/:workspaceId/generate-batch` — `{ "topic": "...", "count": 5, "instructions": "..." }`
- `PATCH /api/social-media-factory/workspaces/:workspaceId/automation` — configura `autoGenerateEnabled`, `autoPublishEnabled`, `contentTheme`, `brandVoice` e `contentInstructions`.
- `POST /api/social-media-factory/accounts/:accountId/connect` — inicia OAuth.
- `POST /api/social-media-factory/accounts/:accountId/select` — seleciona conta de destino.
- `PATCH /api/social-media-factory/accounts/:accountId/target` — define localização Google Business ou board Pinterest.
- `POST /api/social-media-factory/posts/:postId/schedule` — `{ "scheduledFor": "ISO-8601 futuro" }`
- `POST /api/social-media-factory/posts/:postId/publish`
- `GET /api/social-media-factory/posts/:postId/logs`

## Atualização: OAuth e publicação

### Variáveis de ambiente

Configure no ambiente do servidor (nunca commitar segredos):

- `SALE_IA_ADMIN_KEY`: autenticação administrativa do painel/API.
- `OPENAI_API_KEY`, `SOCIAL_MEDIA_AI_MODEL`: geração de textos.
- `SOCIAL_MEDIA_TOKEN_ENCRYPTION_KEY`: chave AES-256-GCM, 32 bytes codificados em hexadecimal (64 caracteres) ou Base64.
- `SOCIAL_MEDIA_OAUTH_REDIRECT_URI`: URL pública HTTPS exata, por exemplo `https://SEU-DOMINIO/api/social-media-factory/oauth/callback`.
- Meta: `META_APP_ID`, `META_APP_SECRET`, opcional `META_GRAPH_API_VERSION`.
- TikTok: `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`.
- Google/YouTube: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
- Pinterest: `PINTEREST_APP_ID`, `PINTEREST_APP_SECRET`.
- Para gerar mídia: `PUBLIC_BASE_URL` (origem HTTPS pública), `SOCIAL_MEDIA_IMAGE_GENERATION_ENABLED=true`, `SOCIAL_MEDIA_IMAGE_MODEL` (padrão `gpt-image-1`), `SOCIAL_MEDIA_VIDEO_GENERATION_ENABLED=true`, `FFMPEG_PATH` se ffmpeg não estiver no PATH. Isso consome créditos de imagem da API: a automação tenta gerar até 5 imagens e 5 vídeos por projeto/dia.
- `SOCIAL_MEDIA_MEDIA_ALLOWED_HOSTS`: lista separada por vírgulas dos hosts autorizados para baixar mídia de upload do YouTube. Deve incluir o hostname de `PUBLIC_BASE_URL`.
- Opcional: `SOCIAL_MEDIA_YOUTUBE_MAX_BYTES` (padrão 500 MiB), `SOCIAL_MEDIA_YOUTUBE_PRIVACY` (padrão `private`), `SOCIAL_MEDIA_FACTORY_TIMEZONE`.

### Fluxo

1. Aplicar as migrations e gerar o cliente Prisma.
2. Configurar cada app de desenvolvedor e cadastrar a URI de callback exatamente igual à variável.
3. No painel, criar o projeto e usar **Conectar** para cada rede. O fluxo OAuth não exige enviar tokens pelo navegador.
4. Selecionar a conta de destino quando houver mais de uma Página/canal. Google Business exige o caminho `accounts/{accountId}/locations/{locationId}`; Pinterest exige `boardId`.
5. Ativar geração automática. Para habilitar publicação automática nas seis redes, a API valida seis contas autorizadas, destinos e configuração de mídia pública.
6. Ativar `SOCIAL_MEDIA_FACTORY_ENABLED=true` e reiniciar o servidor. A rotina diária cria 30 conteúdos por projeto (5 por rede), em horários locais distribuídos durante o dia.
7. Os conteúdos sem mídia necessária ficam como rascunhos; o YouTube requer vídeo renderizado e TikTok permanece aguardando consentimento explícito por post.

### Publicação e limites

- Implementados adaptadores REST para Facebook Pages, Instagram profissional, TikTok Content Posting API, YouTube Data API, Google Business Profile local posts e Pinterest Pins.
- Tokens OAuth são criptografados em repouso com AES-256-GCM; tokens expirados de Google, TikTok e Pinterest são renovados quando o provedor fornece refresh token. Meta pode exigir nova autorização.
- O worker registra tentativa, resultado, falha e status assíncrono do TikTok. Uma falha de uma plataforma não deve ser reportada como publicação bem-sucedida.
- TikTok exige autorização explícita por post e pode restringir posts de apps não auditados a visibilidade privada. YouTube também pode aplicar restrições a projetos não auditados. A plataforma controla aprovação, cotas, escopos e disponibilidade do recurso.
- Antes de produção, executar testes com uma conta de teste por plataforma e verificar escopos aprovados, cotas, mídia acessível externamente, renovação de token e políticas vigentes. O código não pode conceder aprovação de app nem permissões que o provedor ainda não concedeu.

## Plataformas-alvo

Instagram, Facebook, TikTok, YouTube, Google Business Profile e Pinterest. Cada plataforma requer seu próprio fluxo de autorização, escopos e adaptador de publicação, e alguns formatos (Reels/Shorts/Stories/carrossel) têm requisitos específicos. Não armazenar tokens OAuth em texto simples nos campos de perfil; `credentialsRef` destina-se a uma referência segura de segredo, não ao token bruto.

## Frequência

A configuração desejada é de até 5 posts por dia por rede e por projeto (até 30 por dia por projeto). A API aceita lotes de até 30 rascunhos por chamada; o padrão do painel é 30, orientado a cinco conteúdos por rede. A distribuição gerada pela IA deve ser revisada antes do agendamento e precisa respeitar limites, formatos e políticas de cada rede. A publicação automática só deve ser habilitada após validar as integrações e limites aplicáveis.


## Integração na linha principal — 04/11/2026

O módulo foi portado seletivamente para uma branch baseada na `main` atual. Foram preservados os módulos atuais de Dropshipping, Blog Factory e RB Factory. O painel central apresenta o acesso como `RB-Factory-Social-Media`.

Correções adicionais da portabilidade:
- `SOCIAL_MEDIA_DRY_RUN=true` grava estado `DRY_RUN`, sem contabilizar publicação real.
- A API compara a chave administrativa em tempo constante.
- O renderer de vídeo usa caminhos da raiz do projeto, exige `PUBLIC_BASE_URL` HTTPS e persiste a URL pública em JSON.
- O renderer não substitui o estado editorial do post por `READY`, mantendo o fluxo de publicação.
- O scheduler continua opt-in e desativado por padrão.
