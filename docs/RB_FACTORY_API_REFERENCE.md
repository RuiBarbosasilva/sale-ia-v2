# API Reference - RB-Factory Sites

Base URL: /api/rb-factory-benchmark

## ENDPOINTS PUBLICOS

### GET /api/rb-factory-benchmark/catalog

Retorna o catalogo completo de nichos e contagens.

Response:
{
  "success": true,
  "totalDemos": 100,
  "niches": [
    {
      "slug": "dentistas",
      "name": "Dentistas",
      "description": "Clinicas odontologicas e especialistas.",
      "source": "Aspire Media Marketing 2026",
      "count": 10,
      "references": ["Clarkson Village Dental", "Ajooni Smiles"],
      "variants": ["Conversion-first local", "Premium editorial"]
    }
  ]
}

Status Codes:
- 200 OK: Sucesso
- 500 Internal Server Error: Erro no servidor

### GET /api/rb-factory-benchmark/demos/:niche/:index

Retorna HTML completo de uma demo especifica.

Parametros:
- niche (string): Slug do nicho (ex: dentistas, fitness, restaurantes)
- index (number): Indice da variante (1-10)

Response: Content-Type text/html com HTML completo da demo

Exemplo:
curl https://SEU_DOMINIO/api/rb-factory-benchmark/demos/dentistas/5

Status Codes:
- 200 OK: HTML gerado com sucesso
- 404 Not Found: Nicho ou indice invalido
- 500 Internal Server Error: Erro no servidor

Nichos Validos:
- dentistas
- veterinarias
- advocacia
- imobiliarias
- restaurantes
- saloes
- fitness
- oficinas
- construcao
- contabilidade

## ENDPOINTS INTERNOS (Requer Auth)

### POST /api/websites/prospecting/demo

Gera demo personalizada para um prospect.

Headers:
Authorization: Bearer token
Content-Type: application/json

Body:
{
  "prospectId": "uuid-do-prospect",
  "companyName": "Clinica Sorriso",
  "segment": "odontologia",
  "city": "Sao Paulo",
  "phone": "11999998888",
  "niche": "dentistas",
  "modelIndex": 3
}

Response:
{
  "success": true,
  "demo": {
    "id": "uuid-da-demo",
    "html": "<!doctype html>...",
    "selection": {
      "niche": "dentistas",
      "index": 3,
      "variant": "Premium editorial",
      "reference": "Clarkson Village Dental"
    }
  }
}

## EXEMPLOS DE USO

### JavaScript/Node.js

const response = await fetch('/api/rb-factory-benchmark/catalog');
const data = await response.json();

const htmlResponse = await fetch('/api/rb-factory-benchmark/demos/fitness/7');
const html = await htmlResponse.text();

### cURL

curl -s https://SEU_DOMINIO/api/rb-factory-benchmark/catalog | jq .
curl -o demo.html https://SEU_DOMINIO/api/rb-factory-benchmark/demos/restaurantes/3

### Python

import requests
response = requests.get('https://SEU_DOMINIO/api/rb-factory-benchmark/catalog')
data = response.json()

## RATE LIMITING

- 100 requests/minuto por IP para endpoints publicos
- 1000 requests/minuto para endpoints autenticados
- Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset

## ERROR HANDLING

Formato padrao:
{
  "success": false,
  "error": {
    "code": "DEMO_NOT_FOUND",
    "message": "Demo nao encontrada para o nicho/indice especificado."
  }
}

Codigos de Erro Comuns:
- DEMO_NOT_FOUND: Nicho ou indice invalido
- INVALID_INPUT: Parametros malformados
- RATE_LIMIT_EXCEEDED: Muitas requisicoes
- UNAUTHORIZED: Token invalido ou ausente
- INTERNAL_ERROR: Erro interno do servidor