# CADERNO OPERACIONAL — SALE-IA V2
## Atualização: 12/10/2026
## Repositório: RuiBarbosasilva/sale-ia-v2

Este arquivo é o registro de continuidade do projeto para manter contexto entre Qwen, GitHub e a cópia local. Não é um relatório de testes: estados de execução só devem ser marcados como concluídos quando houver evidência.

## Prioridade atual: Hunter inteligente de dropshipping — Mercado Livre

### Objetivo de negócio
Automatizar ao máximo a pesquisa de tendências do Mercado Livre Brasil, a descoberta de produtos com potencial, a pesquisa de fornecedores na internet, o cálculo de margem e a preparação/publicação de anúncios. Rui fará pessoalmente o cadastro e a negociação inicial com o fornecedor. O sistema só libera os produtos desse fornecedor após o usuário confirmar as condições comerciais e o dropshipping.

### Contexto técnico já registrado
- Repositório: `RuiBarbosasilva/sale-ia-v2`, branch principal `main`.
- Módulo existente: `src/modules/mercadoLivre/`.
- Dashboard existente: `public/dropshipping-lab.html`.
- Serviços existentes a inspecionar e estender, sem duplicar: `dropshippingResearch.ts`, `dropshippingIntelligence.ts`, `mercadoLivreResearchAdapter.ts`, `dropshippingResearchScheduler.ts`.
- Rotas/controller existentes: `src/modules/mercadoLivre/routes/mercadoLivreRoutes.ts`, `src/modules/mercadoLivre/controllers/dropshippingController.ts`.
- Scheduler de pesquisa foi registrado para inicialização condicional por `DROPSHIPPING_AUTORESEARCH_ENABLED=true` no commit `2181bf2ebce8d6652dc524c8f4bfede2e5dcab23`; confirmar o estado atual do código antes de assumir que está ativo em produção.
- O projeto já tinha componentes de candidatos persistidos/rankeados, histórico de preços/estoque, score, validação de evidências de fornecedor, ligação produto-fornecedor-oferta, alertas e ciclo de vida. Validar o código real antes de reaproveitar.
- Não foi confirmado neste registro que build, typecheck, testes ou scheduler em ambiente real passaram após a última mudança.

### Fontes oficiais para o Hunter
- Tendências: `GET https://api.mercadolibre.com/trends/MLB`; a documentação descreve 50 termos de tendência, com atualização semanal, incluindo buscas com maior crescimento, mais desejadas e tendências populares.
- Tendências por categoria: `GET /trends/MLB/{CATEGORY_ID}`, quando suportado.
- Mais vendidos por categoria: `GET /highlights/MLB/category/{CATEGORY_ID}`.
- Documentação de tendências: https://developers.mercadolivre.com.br/pt_br/relatorios-de-faturamento/tendencias
- Documentação de mais vendidos: https://developers.mercadolivre.com.br/pt_br/mais-vendidos-no-mercado-livre
- Publicação de produtos e requisitos: https://developers.mercadolivre.com.br/devcenter/publicacao-de-produtos
- Conferir documentação vigente antes de implementar; não assumir que tendências, ranking, buscas ou dados de vendas têm a mesma semântica. Registrar data e fonte.

### Fluxo obrigatório
1. Coletar tendências/rankings oficiais e pesquisas permitidas na internet.
2. Persistir snapshots e medir variação ao longo do tempo.
3. Ranqueiar candidatos com score explicável, confiança e dados faltantes.
4. Pesquisar fornecedores reais, registrar evidências, fontes, custos, política, prazo, estoque e permissão explícita de dropshipping.
5. Entregar ao usuário uma ficha de fornecedor e perguntas para cadastro/negociação.
6. Rui faz o cadastro e a negociação; o sistema registra confirmação do usuário sem fingir verificação externa.
7. Recalcular margem líquida com tarifas, frete, custos, impostos configuráveis e provisões de devolução.
8. Gerar rascunho de anúncio com atributos/categoria corretos e imagens autorizadas.
9. Pedir aprovação explícita antes da publicação real pela API OAuth oficial.
10. Monitorar preço, estoque, tendências, margem e status do anúncio; alertar e recomendar ação. Mudanças ao vivo de preço/anúncio ficam desligadas por padrão.

### Status de validação
- [ ] Inspeção do estado atual do código e matriz de lacunas
- [ ] Coleta real de tendências MLB com persistência
- [ ] Histórico/variação de tendências e categorias
- [ ] Busca externa de fornecedores configurada e com evidências rastreáveis
- [ ] Checklist de cadastro/aceite pelo usuário
- [ ] Score de produto com confiança e explicabilidade
- [ ] Margem líquida com custos discriminados
- [ ] Dashboard operacional integrado
- [ ] Rascunho e pré-validação de anúncio
- [ ] Publicação OAuth com aprovação explícita e idempotência
- [ ] Monitoramento e alertas automáticos
- [ ] Testes, typecheck, build e Guardian executados e aprovados
- [ ] Atualização local sincronizada com GitHub

### Regras para preservar o projeto
- Não apagar nem substituir trabalho já existente de Afiliados IA, RB Factory Sites ou Factory Ebook IA.
- Não usar `prisma migrate reset`.
- Não versionar segredos.
- Não criar fornecedores, produtos, vendas, reviews ou métricas fictícias.
- Não afirmar que fornecedor é “honesto” ou que produto vai vender muito; mostrar evidências, riscos e nível de confiança.
- Nunca ativar publicação automática, alteração de preço ou ações financeiras por padrão.
- Preservar UTF-8 em todos os arquivos.

### Prompt de implementação
Usar o documento `docs/PROMPT_MASTER_HUNTER_MERCADOLIVRE.md` como instrução principal para Qwen. O Qwen deve inspecionar a implementação existente, implementar as lacunas reais, testar e registrar exatamente o que foi validado.

## Auditoria das alterações locais da Qwen — 12/10/2026

### Evidências recebidas da cópia local
O usuário executou `git status --short` e `git diff`. Os itens abaixo ainda estavam locais e não constavam como commit enviado:
- Arquivos tracked modificados: `dump.rdb`, `prisma/schema.prisma`, `public/site-factory.html`, `src/app.ts`.
- Novos arquivos locais: `src/controllers/dropshippingController.ts`, `src/routes/dropshippingRoutes.ts`, `src/services/dropshipping/`, `public/dropshipping-intelligence.html`, `prisma/seed-dropshipping.ts` e vários scripts auxiliares.
- O diff tracked reportado tinha 395 inserções e 58 remoções em quatro arquivos; o schema Prisma acrescentava aproximadamente 337 linhas de modelos Dropshipping.
- Foi criado um backup de patch local. Não executar `reset`, `clean`, migração destrutiva ou sobrescrita geral para sincronizar esse trabalho.

### Correções e controles obrigatórios antes de integrar o código local
1. **Não confundir cópia local com GitHub:** os novos controllers, rotas, serviços e modelos descritos acima ainda não foram enviados ao repositório no momento desta auditoria. Não declarar que foram corrigidos no GitHub sem inspecionar seus conteúdos e validar um commit real.
2. **Evitar módulo paralelo:** o repositório já possui a implementação principal em `src/modules/mercadoLivre/`, incluindo `controllers/dropshippingController.ts`, `routes/mercadoLivreRoutes.ts`, serviços de pesquisa/inteligência e scheduler. Avaliar cada arquivo novo para reutilizar ou integrar à estrutura existente, sem duplicar endpoints, lógica ou schedulers.
3. **Prisma e migração:** os modelos adicionados ao schema não criam tabelas automaticamente. Antes de uso, validar o schema e gerar uma migração incremental compatível com SQLite; revisar SQL e dados existentes. Nunca executar `prisma migrate reset`.
4. **Codificação:** o diff local de `prisma/schema.prisma` exibia texto corrompido, por exemplo `MÃ“DULO`, `persistÃªncia` e `serviÃ§o`. Restaurar comentários em UTF-8 sem alterar a semântica do schema.
5. **Redis:** `dump.rdb` é estado de dados, não código-fonte. Não adicioná-lo ao commit sem motivo explícito; preservar uma cópia local se necessário.
6. **Scripts auxiliares:** revisar `fix-*.js`, `create-*.js`, `update-*.js`, `test-ml-api.js`, scripts Python e mídias antes de decidir o que é ferramenta permanente. Não versionar arquivos temporários, áudio de teste, dados pessoais ou segredos.
7. **RB Factory Sites:** `public/site-factory.html` contém mudanças locais substanciais. Comparar funcionalidade e encoding antes de integrar; não substituir o trabalho existente de RB Factory.
8. **Validação real:** executar `prisma validate`, geração do Prisma Client, typecheck, build e testes aplicáveis depois de integrar. Registrar resultado real; não marcar como aprovado apenas porque o comando foi iniciado.

### Estado desta auditoria
- [x] Backup local de patch criado pelo usuário.
- [x] Identificados arquivos locais modificados e novos arquivos reportados.
- [x] Confirmada a existência de um módulo Dropshipping oficial no repositório.
- [x] Registrados os riscos de duplicação, migração, encoding e inclusão de dados Redis.
- [ ] Conteúdo completo dos novos arquivos locais revisado.
- [ ] Alterações locais selecionadas e aplicadas ao GitHub.
- [ ] Migração revisada e validação Prisma concluída.
- [ ] Typecheck/build/testes executados com resultados registrados.
- [ ] Cópia local e GitHub reconciliados sem perda de alterações.

**Regra de integração:** aplicar mudanças específicas ao GitHub em commits pequenos e rastreáveis. Nunca reconstruir os novos arquivos locais por suposição nem afirmar que foram enviados sem que seu conteúdo tenha sido obtido e o commit confirmado.

