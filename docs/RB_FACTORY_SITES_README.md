# RB-Factory Sites - Documentacao Tecnica

**Status:** PRONTO PARA PRODUCAO
**Versao:** 2.1.0
**Ultima Auditoria:** 2026-10-21
**Cobertura de Testes:** 26/26 (100%)

## Visao Geral

O RB-Factory Sites e um motor inteligente de geracao de sites profissionais para
prospeccao comercial B2B. Produz paginas HTML responsivas, otimizadas para conversao,
baseadas em benchmarks reais de 10 nichos de mercado.

## Capacidades Principais

- 100 demos pre-configuradas (10 nichos x 10 variantes)
- Inferencia automatica de nicho por analise de keywords
- 10 layouts diferentes (split, editorial, proof, bold, luxury, mobile, story, service, lead, local)
- 10 paletas de cores cuidadosamente selecionadas
- 100% responsivo (mobile-first)
- Seguranca anti-XSS (sanitizacao automatica de inputs)
- Integracao WhatsApp automatica
- Performance: Renderizacao em menos de 50ms por pagina

## Arquitetura

src/services/
- rbFactoryBenchmarkCatalog.ts (Catalogo estatico: 10 nichos x 10 referencias)
- rbFactoryBenchmarkService.ts (API de benchmark: catalog, find, render)
- rbFactoryTemplateEngine.ts (Motor de templates + inferencia de nicho)

src/controllers/
- rbFactoryBenchmarkController.ts (Endpoints REST: catalog, demos)

src/routes/
- rbFactoryBenchmarkRoutes.ts (Registro de rotas)

## Nichos Suportados

- dentistas (Dentistas)
- veterinarias (Veterinarias)
- advocacia (Advocacia)
- imobiliarias (Imobiliarias)
- restaurantes (Restaurantes)
- saloes (Saloes e Beleza)
- fitness (Fitness e Academias)
- oficinas (Oficinas Mecanicas)
- construcao (Construcao e Servicos Residenciais)
- contabilidade (Contabilidade)

## Uso Rapido

### Inferencia Automatica de Nicho

import { selectBenchmarkModel } from '../services/rbFactoryTemplateEngine';
const selection = selectBenchmarkModel('clinica odontologica');

### Geracao de Demo Personalizada

import { renderProspectDemo } from '../services/rbFactoryTemplateEngine';
const { html, selection } = renderProspectDemo({
  companyName: 'Clinica Sorriso',
  segment: 'odontologia',
  city: 'Sao Paulo',
  phone: '11999998888',
  niche: 'dentistas',
  modelIndex: 3
});

## Testes Automatizados

26 testes unitarios cobrindo:
- Validacao estrutural do catalogo (10 nichos x 10 variantes)
- Motor de inferencia de nicho (keywords, defaults, overrides)
- Geracao de HTML (elementos essenciais, secoes obrigatorias)
- Seguranca anti-XSS (sanitizacao de scripts)
- Integracao WhatsApp (com/sem telefone)
- Consistencia (mesmo input = mesmo resultado)
- Resiliencia (100 demos renderizaveis sem erro)

### Executar Testes

Rapido (sem coverage): npx jest tests/rbFactory/benchmark.test.ts --no-coverage
Completo (com coverage): npm test -- tests/rbFactory/benchmark.test.ts --coverage

## Seguranca

- XSS: Funcao esc() sanitiza caracteres especiais em todos os inputs
- HTML Injection: Tags HTML em companyName sao escapadas automaticamente
- SQL Injection: Prisma ORM parametriza todas as queries
- CSRF: Middlewares globais em src/middlewares/security.ts
- Rate Limiting: Configurado globalmente

## Performance

- Tempo de renderizacao: 5-15ms por demo
- Tamanho do HTML: 15-25KB (gzip ~5KB)
- Memoria: menos de 10MB durante geracao em lote
- Concorrencia: Stateless - seguro para workers paralelos

## Variaveis de Ambiente

DATABASE_URL="file:./prisma/dev.db" (Obrigatorio)
RB_FACTORY_AUTOSTART=true (Opcional)
SOCIAL_MEDIA_FACTORY_TIMEZONE=America/Sao_Paulo (Opcional)

## Changelog

### v2.1.0 (2026-10-21) - Producao
- 26 testes unitarios validados
- Motor de inferencia de nicho por keywords
- Sanitizacao anti-XSS robusta
- Integracao WhatsApp automatica
- 100 demos renderizaveis sem erro

### v2.0.0 (2026-09-15) - Fundacao
- Arquitetura inicial com 10 nichos
- 10 layouts e paletas
- Catalogo de benchmarks baseado em referencias reais