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
