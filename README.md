# SALE-IA-V2

Backend do SALE-IA-V2: automacao comercial, prospeccao, RB Factory Sites, Mercado Livre e modulo de afiliados.

## Desenvolvimento

```powershell
npm install
Copy-Item .env.example .env
npx prisma generate
npx prisma migrate deploy
npm run typecheck
npm run build
npm run dev
```

Nao versione `.env`, bancos SQLite, `node_modules`, backups ou credenciais.

## RB Factory Sites — produção

O RB Factory Sites cobre o fluxo comercial e operacional: prospecção, auditoria, score, geração de demo, aprovação, proposta, aceite, projeto, publicação, manutenção e sugestões periódicas.

### Variáveis de produção

    SALE_IA_ADMIN_KEY=chave-interna-forte
    RB_FACTORY_AUTONOMY_ENABLED=true
    NETLIFY_AUTH_TOKEN=token-do-netlify

NETLIFY_AUTH_TOKEN é necessário para publicação automática. O token nunca deve ser commitado no repositório; configure-o como secret na hospedagem.

### Publicação automática

O Studio usa POST /api/websites/studio/projects/deploy-netlify. O serviço cria ou reutiliza o site Netlify, publica o HTML/ativos, aguarda o deploy ficar pronto e grava no projeto a URL pública, site ID e deploy ID. Atualizações posteriores reutilizam o site existente quando hostingSiteId estiver salvo.

### Autonomia

Com RB_FACTORY_AUTONOMY_ENABLED=true, o servidor inicia automaticamente o ciclo comercial a cada 5 minutos. O mesmo ciclo também gera sugestões de manutenção para clientes ativos.

### Checklist de produção

- [x] autenticação administrativa
- [x] migrations e Prisma
- [x] prospecção e auditoria
- [x] score comercial
- [x] geração e quality gate de demos
- [x] propostas e aceite comercial
- [x] preparação do projeto
- [x] publicação Netlify via API
- [x] persistência de URL/site/deploy
- [x] manutenção e snapshots
- [x] sugestões automáticas de manutenção
- [x] autonomia iniciada pelo servidor
- [ ] configurar NETLIFY_AUTH_TOKEN no ambiente de produção
- [ ] configurar domínio DNS personalizado, quando houver domínio próprio

## Modulo de Afiliados

O modulo de afiliados foi estruturado como uma base de monetizacao independente dentro do SALE-IA-V2.

### Portal

- `/affiliates/index.html` — cadastro e portal do afiliado.
- `/api/affiliates/register` — cadastro.
- `/api/affiliates/portal` — dashboard autenticado.
- `/api/affiliates/portal/links` — links do afiliado.
- `/api/affiliates/portal/payouts` — solicita saque.
- `/go/:code` — redirect publico com rastreamento de clique.

### Administracao

- `/affiliates/admin.html` — painel administrativo.
- `GET /api/affiliates/admin` — afiliados.
- `GET /api/affiliates/admin/stats` — indicadores.
- `GET/POST/PATCH /api/affiliates/admin/offers` — ofertas.
- `GET/POST/PATCH /api/affiliates/admin/links` — links.
- `GET /api/affiliates/admin/sales` — vendas.
- `POST /api/affiliates/admin/sales` — registro manual.
- `PATCH /api/affiliates/admin/sales/:id/status` — conciliacao.
- `GET /api/affiliates/admin/payouts` — saques.
- `PATCH /api/affiliates/admin/payouts/:id/status` — processamento.
- `POST /api/affiliates/admin/:id/rotate-token` — revoga o token anterior e gera outro.

### Webhook

`POST /api/affiliates/webhook/sale`

Protegido por `x-affiliate-webhook-key`. Use `externalOrderId` para idempotencia: uma mesma venda externa nao deve gerar duas comissoes.

O endpoint legado `POST /api/afiliados/webhook/hotmart` também exige `x-affiliate-webhook-key`, validado em tempo constante contra `AFFILIATE_WEBHOOK_KEY`. Configure o mesmo segredo no emissor do webhook; eventos sem chave válida são rejeitados antes de alterar vendas, comissões ou métricas.

### Ledger financeiro

O fluxo de saque agora usa `AffiliatePayoutItem` para vincular cada saque às vendas que compoem o valor.

Fluxo:

```
SALE PENDING
    |
    +--> APPROVED
    |      |
    |      +--> PAYOUT REQUESTED/PROCESSING
    |                |
    |                +--> PAYOUT PAID -> SALES PAID
    |
    +--> REJECTED
```

Regras implementadas:

- venda rejeitada e paga sao estados terminais;
- saque pago/rejeitado nao pode voltar a ser processado;
- venda alocada em saque aberto nao pode ser paga manualmente;
- saque pago exige itens, vendas aprovadas e valor conciliado;
- venda ja recebida por `externalOrderId` e tratada de forma idempotente;
- afiliado bloqueado nao autentica, nao cria links e nao recebe novas vendas;
- taxas de comissao ficam limitadas entre 0% e 100%;
- URLs de destino aceitam apenas HTTP/HTTPS;
- token do afiliado e armazenado somente como hash.

## Seguranca

A administracao interna usa `x-sale-ia-admin-key`. O servidor aceita temporariamente `AFFILIATE_ADMIN_KEY` como fallback de compatibilidade; em producao, defina uma chave dedicada `SALE_IA_ADMIN_KEY`.

Defina no `.env`:

```env
SALE_IA_ADMIN_KEY="segredo-longo-e-exclusivo"

AFFILIATE_ADMIN_KEY="segredo-longo"
AFFILIATE_WEBHOOK_KEY="outro-segredo-longo"
```

Nunca envie esses segredos para o GitHub. Em producao, use o gerenciador de secrets da plataforma de hospedagem.

## CI

O workflow `.github/workflows/affiliate-ci.yml` executa:

1. `npm ci`
2. `prisma validate`
3. `prisma generate`
4. `prisma migrate deploy`
5. `npm run typecheck`

## Proxima camada de monetizacao

A base atual nao finge ter integracao com uma rede de afiliados especifica. A proxima camada e conectar programas reais, importar ofertas/catalogos, gerar paginas de conversao, atribuir vendas por webhook/API e reconciliar comissoes antes de liberar saques reais.


## Dropshipping Intelligence — Mercado Livre

O laboratório administrativo está disponível em `/dropshipping-lab.html`. As rotas de pesquisa usam a API pública oficial do catálogo Mercado Livre e exigem a chave administrativa do módulo.

### Pesquisa agendada (opt-in)

Adicione ao `.env`:

```env
DROPSHIPPING_AUTORESEARCH_ENABLED="true"
DROPSHIPPING_AUTORESEARCH_TICK_MS=60000
```

Depois reinicie o servidor. No laboratório, crie consultas em **Agendar pesquisa automática** e consulte o estado em **Consultas agendadas** / **Status da automação**. Cada consulta pode rodar a cada 15 minutos até 24 horas; o worker verifica consultas vencidas a cada 60 segundos por padrão, processa até três por ciclo e grava snapshots históricos e alertas de preço/estoque.

### Endpoints principais

- `GET /api/mercadolivre/dropshipping/research/marketplace?q=organizador&limit=20` — consulta o catálogo oficial.
- `POST /api/mercadolivre/dropshipping/research/watches` — cria/atualiza uma consulta agendada.
- `GET /api/mercadolivre/dropshipping/research/watches` — lista consultas e estado.
- `GET /api/mercadolivre/dropshipping/research/scheduler-status` — informa se o worker está habilitado no processo.
- `GET /api/mercadolivre/dropshipping/dashboard/summary` — resume candidatos, fornecedores, margens, alertas e última pesquisa.

A pesquisa automática atual cobre o catálogo do Mercado Livre. A integração de fornecedores externos e Shopee ainda exige adapters específicos; o sistema não compra nem publica anúncios automaticamente. Campos de vendas ausentes permanecem desconhecidos e scores não garantem demanda ou lucro.


## RB-Factory-Social-Media

Painel em `/social-media-factory` para seis canais: Instagram, Facebook, TikTok, YouTube, Google Business Profile e Pinterest. Inclui projetos multiempresa, OAuth, tokens criptografados, calendário, rascunhos, logs e publicação por adaptadores oficiais.

### Ativação segura

- Configure `SALE_IA_ADMIN_KEY`, `SOCIAL_MEDIA_TOKEN_ENCRYPTION_KEY` (32 bytes em hexadecimal/Base64) e as credenciais OAuth de cada provedor.
- Configure `SOCIAL_MEDIA_OAUTH_REDIRECT_URI` como URL HTTPS pública exata cadastrada nos apps.
- Configure `PUBLIC_BASE_URL` HTTPS para mídia pública; habilite geração de imagens/vídeos somente quando os recursos e dependências estiverem instalados.
- Instale dependências opcionais de vídeo com `python -m pip install -r tools/requirements-social-media.txt` e disponibilize FFmpeg.
- Mantenha `SOCIAL_MEDIA_FACTORY_ENABLED=false` até concluir OAuth, permissões, escopos e testes de publicação com contas autorizadas. A ativação do scheduler é opt-in.
- TikTok exige consentimento explícito por publicação; posts são mantidos como rascunhos até ação individual. A publicação de mídia e a visibilidade dependem das políticas e auditorias dos provedores.
- `SOCIAL_MEDIA_DRY_RUN=true` registra simulações como `DRY_RUN`, nunca como publicação real.

O painel central apresenta o módulo como **RB-Factory-Social-Media**. A publicação real requer credenciais e autorização válidas em cada plataforma; o código não concede permissões nem aprovação de aplicativos.


### Segurança de pagamentos
`POST /api/payments/webhook` exige `x-payment-webhook-secret`, validado em tempo constante contra `PAYMENT_WEBHOOK_SECRET`. O endpoint de simulação `/api/checkout/pix/:orderId/simulate-payment` exige chave administrativa e fica desativado em produção.

### Webhook de mensagens WhatsApp
Em produção, `POST /api/webhook` e `POST /api/webhook/whatsapp` exigem o cabeçalho `x-whatsapp-webhook-secret`, validado em tempo constante contra `WHATSAPP_WEBHOOK_SECRET`. Sem segredo configurado, o endpoint falha fechado com HTTP 503; com segredo ausente/incorreto, retorna HTTP 401. Configure o mesmo segredo no emissor Evolution API ou em um proxy confiável que encaminhe o webhook. Em desenvolvimento, a rota permanece compatível quando a variável não está definida.


## Criar e configurar APIs externas

Consulte o guia completo em [`docs/GUIA_CRIACAO_APIS_E_AUTORIZACOES.md`](docs/GUIA_CRIACAO_APIS_E_AUTORIZACOES.md). Ele explica onde criar cada chave, como registrar callbacks OAuth, quais permissões solicitar, onde preencher cada variável do `.env` e quais integrações ainda dependem de alteração no código ou aprovação do provedor. Use `.env.example` como modelo; nunca versione o `.env` real.
