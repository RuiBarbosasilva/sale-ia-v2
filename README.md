# SALE-IA — Backend limpo

Backend mínimo e operacional para uma máquina de vendas:
- cadastro automático de leads
- memória de mensagens no SQLite/Prisma
- classificação de intenção
- funil comercial
- motor de regras sem depender de IA
- Gemini opcional com fallback automático
- precificação com piso mínimo e desconto
- endpoint de chat
- webhook Meta WhatsApp preparado
- controle de atendimento humano pelo campo `humanMode`

## Instalação

```powershell
npm install
Copy-Item .env.example .env
npx prisma generate
npx prisma db push
npm run typecheck
npm run build
npm run dev
```

## Teste local

```powershell
npm run test:automation
```

POST `/api/chat`:

```json
{
  "phone": "5535999999999",
  "name": "Cliente",
  "message": "Quanto custa 100 canecas personalizadas?"
}
```

POST `/api/quote`:

```json
{
  "basePrice": 39.90,
  "minPrice": 25,
  "quantity": 100,
  "discountRules": [
    { "minUnits": 50, "discountPct": 5 },
    { "minUnits": 100, "discountPct": 10 }
  ]
}
```

## Observação

O WhatsApp real depende das credenciais da Meta. Sem essas credenciais, o sistema continua plenamente testável pelo endpoint `/api/chat`.


## Modulo de Afiliados

O modulo de afiliados esta integrado ao SALE-IA-V2 e inclui:
- cadastro/onboarding de afiliados com token de acesso;
- portal do afiliado em /affiliates/;
- links rastreaveis em /go/:code;
- registro de cliques e metricas;
- ofertas e URLs de redes de afiliados;
- calculo automatico de comissao;
- registro de vendas manual ou por webhook;
- aprovacao/rejeicao/pagamento de vendas;
- solicitacao e liquidacao de saques;
- painel administrativo em /affiliates/admin.html;
- API protegida por AFFILIATE_ADMIN_KEY;
- webhook protegido por AFFILIATE_WEBHOOK_KEY;
- migration Prisma e CI automatico.

### Rotas principais

POST /api/affiliates/register
GET  /api/affiliates/portal
GET  /api/affiliates/portal/links
POST /api/affiliates/portal/links
POST /api/affiliates/portal/payouts

GET  /api/affiliates/admin
GET  /api/affiliates/admin/stats
GET  /api/affiliates/admin/offers
POST /api/affiliates/admin/offers
GET  /api/affiliates/admin/links
POST /api/affiliates/admin/links
POST /api/affiliates/admin/sales
PATCH /api/affiliates/admin/sales/:id/status
GET  /api/affiliates/admin/payouts
PATCH /api/affiliates/admin/payouts/:id/status

POST /api/affiliates/webhook/sale
GET  /go/:code

Depois de configurar o .env, aplique a migration com:

npx prisma migrate deploy
npx prisma generate
npm run typecheck
