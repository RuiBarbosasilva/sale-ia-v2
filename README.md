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

Defina no `.env`:

```env
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
