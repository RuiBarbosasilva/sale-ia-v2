# MANUAL COMPLETO DO OPERADOR — RB-FACTORY (Sale-IA v2)
### Ecossistema de Automação, Conteúdo e Inteligência Artificial
**Versão:** 1.0 | **Data:** 22 de outubro de 2026

---

## SUMÁRIO

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Instalação e Configuração Inicial](#2-instalação-e-configuração-inicial)
3. [Autenticação e Segurança](#3-autenticação-e-segurança)
4. [Dashboard Central (RB-Factory Central Command)](#4-dashboard-central)
5. [Módulo RB-Factory-Sites](#5-rb-factory-sites)
6. [Módulo RB-Factory-Ebook](#6-rb-factory-ebook)
7. [Módulo RB-Factory-Blogs (Piloto Automático)](#7-rb-factory-blogs)
8. [Módulo RB-Factory-MoneyPrinter](#8-rb-factory-moneyprinter)
9. [Módulo RB-Factory-Aivio](#9-rb-factory-aivio)
10. [Módulo RB-Factory-Tubefy](#10-rb-factory-tubefy)
11. [Módulo RB-Factory-Hunter](#11-rb-factory-hunter)
12. [Módulo RB-Factory-MercadoLivre](#12-rb-factory-mercadolivre)
13. [Módulo RB-Factory-Prospecting](#13-rb-factory-prospecting)
14. [Orquestrador Central de IA (Grok, Instinct, Dot)](#14-orquestrador-central-de-ia)
15. [Variáveis de Ambiente (.env)](#15-variáveis-de-ambiente)
16. [Troubleshooting e FAQ](#16-troubleshooting-e-faq)
17. [Fluxo de Trabalho Recomendado](#17-fluxo-de-trabalho-recomendado)

---

## 1. VISÃO GERAL DO SISTEMA

O **RB-Factory** (antigo Sale-IA v2) é uma plataforma enterprise de automação inteligente que integra 9 módulos especializados para cobrir todo o ciclo de um negócio digital:

- **RB-Factory-Sites** — Construção e gestão de sites com IA
- **RB-Factory-Ebook** — Máquina de vendas de produtos digitais
- **RB-Factory-Blogs** — Fábrica de conteúdo editorial com piloto automático
- **RB-Factory-MoneyPrinter** — Geração de vídeos virais 4K
- **RB-Factory-Aivio** — Agente autônomo de vendas (WhatsApp/Instagram)
- **RB-Factory-Tubefy** — Motor de crescimento de canais (YouTube/TikTok)
- **RB-Factory-Hunter** — Caçador de produtos de afiliados
- **RB-Factory-MercadoLivre** — Inteligência de dropshipping
- **RB-Factory-Prospecting** — Prospecção de sites e clientes

**Arquitetura Técnica:**
- Backend: Node.js + TypeScript + Express
- Banco de Dados: PostgreSQL/SQLite via Prisma ORM
- IA: OpenAI GPT-4o-mini, Gemini, ElevenLabs, Grok (xAI)
- Renderização: Python (FFmpeg) para vídeos
- Frontend: Dashboards HTML estáticos servidos pelo Express

---

## 2. INSTALAÇÃO E CONFIGURAÇÃO INICIAL

### Pré-requisitos
- Node.js v18+ (recomendado v22)
- Python 3.10+ (para MoneyPrinter)
- FFmpeg instalado no sistema
- Git

### Passo a Passo

```bash
# 1. Clone o repositório
git clone https://github.com/RuiBarbosasilva/sale-ia-v2.git
cd sale-ia-v2

# 2. Instale as dependências
npm install

# 3. Configure o banco de dados
npx prisma generate
npx prisma db push

# 4. Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com suas chaves de API

# 5. Inicie o servidor
npm run dev
```

### Atalho de Início Rápido (Windows)
Crie um arquivo `Iniciar-RB-Factory.bat` na Área de Trabalho:

```bat
@echo off
title RB-Factory - Central Command
echo Iniciando o ecossistema RB-Factory...
cd C:\sale-ia-v2
start "" npm run dev
timeout /t 5 /nobreak >nul
start http://localhost:3000/login
exit
```

---

## 3. AUTENTICAÇÃO E SEGURANÇA

### Como acessar o sistema

1. Inicie o servidor: `npm run dev`
2. Abra o navegador em: `http://localhost:3000/login`
3. Insira a chave de acesso (padrão: `sale-ia-2026-admin-key-secure`)
4. Você será redirecionado ao Dashboard Central

### Alterar a chave de acesso

Edite o arquivo `.env`:
```env
ADMIN_KEY=sua-nova-chave-secreta-aqui
```

Reinicie o servidor para aplicar.

### Proteção por módulo
- Todos os endpoints `/api/*` exigem autenticação via cookie `adminKey` ou header `x-admin-key`
- Dashboards HTML são servidos publicamente, mas as APIs por trás são protegidas
- Recomendação: em produção, usar HTTPS + proxy reverso (Nginx)

---

## 4. DASHBOARD CENTRAL

**URL:** `http://localhost:3000/` (após login)

O Dashboard Central é o **ponto único de controle** do sistema. Ele apresenta 9 módulos organizados em cards com:
- **Ícone visual** identificador
- **Status operacional** (Produção / Validação)
- **Descrição resumida** da funcionalidade
- **Botão de acesso direto** ao módulo

### Módulos disponíveis

| Módulo | Status | URL Direta |
|--------|--------|------------|
| RB-Factory-Sites | ✅ Produção | `/dashboard/` |
| RB-Factory-Ebook | ✅ Produção | `/factory-ebook-dashboard` |
| RB-Factory-Blogs | 🟡 Validação | `/blog-factory` |
| RB-Factory-MoneyPrinter | ✅ Produção | `/moneyprinter-dashboard` |
| RB-Factory-Aivio | ✅ Produção | `/aivio-dashboard` |
| RB-Factory-Tubefy | ✅ Produção | `/tubefy-dashboard` |
| RB-Factory-Hunter | 🟡 Validação | `/affiliates/intelligence` |
| RB-Factory-MercadoLivre | ✅ Produção | `/api/mercado-livre/docs` |
| RB-Factory-Prospecting | ✅ Produção | `/api/prospecting/docs` |

---

## 5. RB-FACTORY-SITES

**Propósito:** Construção e gestão de sites com IA, templates e automação completa.

### Funcionalidades principais
- Geração de páginas com IA
- Templates responsivos
- Integração com provedores de imagem (Pexels, Unsplash, OpenAI)
- Sistema de branding e identidade visual

### Como usar
1. Acesse `/dashboard/`
2. Selecione o tipo de site/projeto
3. Configure nicho e público-alvo
4. O sistema gera a estrutura completa
5. Revise e publique

---

## 6. RB-FACTORY-EBOOK

**Propósito:** Máquina de vendas completa para produtos digitais (ebooks).

### O que o módulo gera
1. **Conteúdo do Ebook** — Capítulos estruturados por nicho
2. **Mockups 3D** — Capas profissionais do livro
3. **Página de Vendas** — HTML persuasivo com fórmula AIDA
4. **8 Campanhas de Marketing** — Roteiros para:
   - Reels / TikTok
   - E-mail marketing
   - Meta Ads
   - Google Ads
   - Stories
   - Lead Magnet

### 10 Nichos pré-configurados
Cada nicho vem com:
- Dores e desejos mapeados
- Estratégias de precificação
- Gatilhos mentais específicos

### Como usar
1. Acesse `/factory-ebook-dashboard`
2. Escolha um nicho (ou crie personalizado)
3. Clique em "Gerar Máquina de Vendas"
4. Baixe os ativos gerados
5. Suba a página no seu domínio
6. Dispare as campanhas

---

## 7. RB-FACTORY-BLOGS (PILOTO AUTOMÁTICO)

**Propósito:** Fábrica de conteúdo editorial com publicação automática no WordPress.

### Fluxo de Piloto Automático

```
[Feed RSS do Blog Alvo] 
         ↓
[Radar de Notícias] → Identifica pauta nova
         ↓
[IA com Técnica do Arranha-Céu] → Gera artigo SUPERIOR ao original
         ↓
[Instinct] → Injeta gatilhos mentais + CTA
         ↓
[Auto-Aprovação] → Se BLOG_AUTO_APPROVE=true
         ↓
[WordPress Publisher] → Publica como RASCUNHO
         ↓
[Você] → Revisa e clica em "Publicar" no WP
```

### Configuração para modo 100% automático

Edite o `.env`:
```env
WP_BASE_URL=https://seusite.com
WP_USERNAME=seu_usuario
WP_APP_PASSWORD=senha_de_aplicativo_wp
BLOG_AUTO_APPROVE=true
BLOG_SCHEDULER_INTERVAL_MINUTES=60
```

### Como gerar senhas de aplicativo no WordPress
1. Acesse `Usuários > Perfil` no WordPress
2. Role até "Senhas de Aplicativo"
3. Dê um nome (ex: "RB-Factory")
4. Clique em "Adicionar nova senha de aplicativo"
5. Copie a senha gerada e cole no `.env`

### Fontes RSS padrão
- G1 (notícias gerais)
- Agência Brasil
- Blogs do nicho (configuráveis no painel)

### Como usar o painel
1. Acesse `/blog-factory`
2. Configure a conexão com WordPress
3. Pesquise e consulte feeds
4. Execute um ciclo de coleta manual (ou aguarde o automático)
5. Visualize pautas identificadas
6. Solicite geração de artigos
7. Edite e aprove o conteúdo
8. Envie ao WordPress como rascunho

---

## 8. RB-FACTORY-MONEYPRINTER

**Propósito:** Geração automática de vídeos virais 4K.

### Pipeline completo (4 etapas automáticas)

```
[Tópico] 
    ↓
[1. IA - Roteiro] → Hook + Problema + Solução + CTA
    ↓
[2. ElevenLabs - Narração] → Voz profissional
    ↓
[3. Pexels API - B-Roll] → 5 vídeos verticais de fundo
    ↓
[4. Python + FFmpeg] → Renderização 4K com legendas
    ↓
[Vídeo final pronto para TikTok/Shorts/Reels]
```

### Como usar
1. Acesse `/moneyprinter-dashboard`
2. Insira o tópico (ex: "5 dicas para investir em 2024")
3. Escolha o formato:
   - **9:16** → TikTok, Reels, Shorts (vertical)
   - **16:9** → YouTube (horizontal)
4. Clique em "Gerar Vídeo Viral"
5. Acompanhe o progresso em tempo real:
   - `PENDING` → Aguardando
   - `SCRIPTING` → Gerando roteiro
   - `VOICEOVER` → Gerando narração
   - `RENDERING` → Renderizando vídeo
   - `COMPLETED` → Pronto!

### APIs
- `POST /api/money-printer/generate` — Inicia job
- `GET /api/money-printer/status/:jobId` — Consulta progresso
- `GET /api/money-printer/jobs` — Lista últimos 20 jobs

### Configuração necessária no .env
```env
ELEVENLABS_API_KEY=sua_chave_elevenlabs
PEXELS_API_KEY=sua_chave_pexels
OPENAI_API_KEY=sua_chave_openai
```

---

## 9. RB-FACTORY-AIVIO

**Propósito:** Agente de vendas autônomo para WhatsApp/Instagram.

### Como funciona o Lead Scoring

| Palavra-chave detectada | Pontos | Gatilho acionado |
|------------------------|--------|------------------|
| "preço", "valor", "caro" | +25 | Ancoragem de preço |
| "comprar", "fechar", "pagar" | +40 | Escassez + garantia |
| "não tenho dinheiro" | -10 | Prova social |
| "não sei", "tenho medo" | 0 | Suporte + depoimentos |

**Regras de escalonamento:**
- Score ≥ 80 → Escala para humano automaticamente
- 5+ trocas de mensagem sem fechamento → Escala para humano

### Como usar
1. Acesse `/aivio-dashboard`
2. Use o **Simulador de Chat** para testar
3. Digite como se fosse um cliente (ex: "Oi, qual o preço?")
4. Observe:
   - A resposta da IA no chat
   - O score do lead subindo no painel lateral
   - A cor do lead mudando ( Frio → 🟡 Morno →  Quente)

### Integração com WhatsApp real
O endpoint `POST /api/aivio/webhook` recebe mensagens de qualquer plataforma. Para conectar ao WhatsApp:
1. Configure seu webhook do WhatsApp Business API para apontar para `https://seudominio.com/api/aivio/webhook`
2. No body, envie: `{ "platform": "whatsapp", "externalId": "5511999999999", "content": "mensagem" }`
3. O Aivio processa e retorna a resposta
4. Use o `whatsappService` existente para enviar a resposta de volta

### APIs
- `POST /api/aivio/webhook` — Recebe mensagens
- `GET /api/aivio/conversations` — Lista conversas ativas
- `GET /api/aivio/leads` — Lista leads ordenados por score
- `GET /api/aivio/conversations/:id` — Histórico de conversa

---

## 10. RB-FACTORY-TUBEFY

**Propósito:** Motor de crescimento de canais (YouTube, TikTok, Instagram).

### O que gera
- 3 opções de **Títulos Virais**
- **Descrição** otimizada com palavras-chave
- **Tags** estratégicas
- **SEO Score** (0-100)
- **Potencial Viral** (LOW / MEDIUM / HIGH / VIRAL)

### Algoritmo de SEO Score
- Base: 50 pontos
- Título entre 40-70 caracteres: +20
- Descrição com 200+ caracteres: +15
- 5+ tags: +15
- **Máximo: 100 pontos**

### Algoritmo de Potencial Viral
Detecta "power words" no título:
- `segredo`, `erro`, `nunca`, `impossível`, `hack`, `como`
- Se tem power word + título < 60 chars → **HIGH**
- Se tem power word OU título com "?" → **MEDIUM**
- Caso contrário → **LOW**

### Como usar
1. Acesse `/tubefy-dashboard`
2. Preencha:
   - ID do Canal (use `channel-test-123` para testes)
   - Tópico do vídeo
   - Plataforma (YouTube/TikTok/Instagram)
   - Tom (Educativo/Entretenimento/Polêmico/Inspiracional)
3. Clique em "Gerar Plano Otimizado"
4. Veja o Score de SEO e o Potencial Viral
5. Clique em "Agendar" ou "Publicar"

---

## 11. RB-FACTORY-HUNTER

**Propósito:** Caçador de produtos e oportunidades de afiliados.

### Funcionalidades
- Varredura de redes de afiliados
- Análise de score de produtos
- Importação de ofertas
- Gestão de campanhas

### Como usar
1. Acesse `/affiliates/intelligence`
2. Clique em "Inicializar redes padrão" para carregar Hotmart, Eduzz, Monetizze, etc.
3. Use "Executar Hunter" para varrer produtos
4. Importe ofertas manualmente ou via API
5. Acompanhe métricas: cliques, vendas, comissão

---

## 12. RB-FACTORY-MERCADOLIVRE

**Propósito:** Inteligência de dropshipping e sincronização de pedidos.

### Funcionalidades validadas
- ✅ 26 testes unitários passando
- ✅ Dropshipping Intelligence (decisão de fornecedores)
- ✅ Dropshipping Research (validação de produtos)
- ✅ Mercado Livre Research Adapter (API oficial)
- ✅ Sincronização de pedidos (orderSyncService)
- ✅ Webhook idempotente
- ✅ Criptografia de tokens

### Como usar
- Documentação da API: `/api/mercado-livre/docs`
- Os serviços rodam em background via agendadores
- Configure as credenciais do Mercado Livre no `.env`

---

## 13. RB-FACTORY-PROSPECTING

**Propósito:** Prospecção de sites e clientes com scoring de oportunidades.

### Serviços disponíveis
- `websiteProspectorService` — Busca sites por nicho
- `websiteEnrichmentService` — Enriquece dados do site
- `websiteOpportunityScoringService` — Calcula score 0-100
- `websiteOutreachService` — Dispara abordagens
- `googlePlacesProvider` — Integração Google Places
- `smtpEmailProvider` — Envio de e-mails

### Como usar
- Documentação: `/api/prospecting/docs`
- Configure `GOOGLE_PLACES_API_KEY` no `.env`
- O sistema avalia sites baseado em: tem WhatsApp? Tem pixel? Site rápido?

---

## 14. ORQUESTRADOR CENTRAL DE IA

**Localização:** `src/services/ai/orchestrator.service.ts`

O **AiOrchestrator** é o cérebro que decide qual IA usar para cada tarefa:

### Grok (Tendências em Tempo Real)
```typescript
aiOrchestrator.getRealTimeTrends('finanças', 'twitter')
// Retorna temas virais do momento no X/Twitter
```
**Usado por:** Tubefy, Blog Factory, Social Media Factory

### Instinct (Psicologia de Vendas)
```typescript
aiOrchestrator.analyzeSalesIntent('qual o preço?', 30)
// Retorna: { newScore: 55, psychologicalTrigger: 'OBJEÇÃO DE PREÇO', recommendedAction: 'USE ANCORAGEM' }
```
**Usado por:** Aivio, Factory Ebook (copywriting)

### Dot (Automação de Tarefas)
```typescript
aiOrchestrator.executeAutomationTask('publish_blog', { articleId: '123' })
// Executa tarefas repetitivas sem alucinação
```
**Usado por:** Prospecting, Mercado Livre, Blog Factory

### Como ativar as IAs reais
Edite o `.env` e adicione as chaves:
```env
GROK_API_KEY=sua_chave_xai
INSTINCT_API_KEY=sua_chave_instinct
DOT_API_KEY=sua_chave_dot
```

---

## 15. VARIÁVEIS DE AMBIENTE (.env)

### Template completo

```env
# RB-FACTORY - CONFIGURAÇÕES GERAIS
NODE_ENV=development
PORT=3000
ADMIN_KEY=sale-ia-2026-admin-key-secure

# BANCO DE DADOS
DATABASE_URL="file:./dev.db"

# IAs PRINCIPAIS
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...

# NARRAÇÃO E MÍDIA
ELEVENLABS_API_KEY=sk_...
PEXELS_API_KEY=...

# BLOG FACTORY - WORDPRESS
WP_BASE_URL=https://seusite.com
WP_USERNAME=seu_usuario
WP_APP_PASSWORD=xxxx xxxx xxxx xxxx
BLOG_AUTO_APPROVE=true
BLOG_SCHEDULER_INTERVAL_MINUTES=60

# PROSPECTING
GOOGLE_PLACES_API_KEY=AIza...

# MERCADO LIVRE
ML_ACCESS_TOKEN=...
ML_REFRESH_TOKEN=...
ML_CLIENT_ID=...
ML_CLIENT_SECRET=...

# ORQUESTRADOR (Grok, Instinct, Dot)
GROK_API_KEY=
INSTINCT_API_KEY=
DOT_API_KEY=
```

---

## 16. TROUBLESHOOTING E FAQ

### O sistema não aceita minha chave
**Solução:** 
1. Verifique se a chave no `.env` está sem aspas: `ADMIN_KEY=minha-chave`
2. Reinicie o servidor após alterar o `.env`
3. Limpe os cookies do navegador em `localhost:3000`

### Erro: Property 'blogArticle' does not exist
**Solução:** 
```bash
npx prisma generate
npx prisma db push
```

### MoneyPrinter não gera vídeo
**Solução:**
1. Verifique se o Python está instalado: `python --version`
2. Verifique se o FFmpeg está no PATH: `ffmpeg -version`
3. Confirme que `tools/generate_video.py` existe
4. Verifique as chaves `ELEVENLABS_API_KEY` e `PEXELS_API_KEY`

### Blog Factory não publica no WordPress
**Solução:**
1. Teste a URL do WP no navegador
2. Gere uma nova senha de aplicativo no WordPress
3. Verifique se `BLOG_AUTO_APPROVE=true` no `.env`
4. Veja os logs do servidor para erros de autenticação WP

### Aivio não responde no WhatsApp
**Solução:**
1. Teste primeiro no simulador do dashboard
2. Verifique se o webhook do WhatsApp está apontando para `/api/aivio/webhook`
3. Confirme que o body do webhook tem `platform`, `externalId` e `content`

### Typecheck falhando
**Solução:**
```bash
rm -rf node_modules
npm install
npx prisma generate
npm run typecheck
```

---

## 17. FLUXO DE TRABALHO RECOMENDADO

### Rotina Diária do Operador RB-Factory

**Manhã (15 min):**
1. Dê dois cliques no atalho `Iniciar-RB-Factory.bat`
2. Faça login com a chave administrativa
3. Verifique o Dashboard Central — todos os módulos operacionais?

**Durante o dia (automático):**
- ✅ Blog Factory publica 1 artigo/hora no WordPress
- ✅ MoneyPrinter renderiza vídeos em background
- ✅ Aivio atende leads no WhatsApp 24/7
- ✅ Hunter varre redes de afiliados

**Tarde (30 min):**
1. Acesse o WordPress e revise os rascunhos do Blog Factory
2. Publique os melhores artigos
3. Verifique o painel do Aivio — há leads quentes para abordar pessoalmente?
4. Confira os vídeos prontos no MoneyPrinter e publique nas redes

**Semanal (1h):**
1. Use o Tubefy para gerar 5 planos de vídeo para a semana
2. Use o Prospecting para encontrar 10 novos leads B2B
3. Analise as métricas do Hunter — quais produtos estão convertendo?
4. Gere um novo Ebook no Factory Ebook para lançar como isca digital

---

## CONCLUSÃO

O **RB-Factory** é um ecossistema completo e autônomo. Quando configurado corretamente, ele opera 24/7 gerando:
- 📝 Conteúdo (Blogs + Ebooks)
-  Vídeos (MoneyPrinter + Tubefy)
- 💬 Vendas (Aivio + Hunter)
- 🎯 Leads (Prospecting)
- 💰 Receita (Mercado Livre)

**Sua única tarefa:** revisar, publicar e escalar.

---

*Documento gerado para Mr. Rui — Arquiteto do RB-Factory*
*Construído com excelência de engenharia sênior* 🚀👑
