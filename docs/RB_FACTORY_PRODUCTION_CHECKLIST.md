# Checklist de Producao - RB-Factory Sites

Use este checklist antes de fazer deploy em producao.

## PRE-DEPLOY

### 1. Validacoes Tecnicas

- [ ] npm run typecheck passa sem erros
- [ ] npm run build compila com sucesso
- [ ] npx jest tests/rbFactory/benchmark.test.ts - 26/26 testes passam
- [ ] npx prisma validate - schema valido
- [ ] Nenhuma variavel de ambiente faltando no .env.production

### 2. Seguranca

- [ ] .env nao esta commitado no Git (verificar .gitignore)
- [ ] DATABASE_URL de producao esta segura (nao e SQLite para producao)
- [ ] Chaves de API (OpenAI, ElevenLabs, etc) estao em secrets manager
- [ ] SALE_IA_ADMIN_KEY e forte (minimo 32 caracteres)
- [ ] CORS configurado corretamente para o dominio de producao
- [ ] Rate limiting ativo

### 3. Banco de Dados

- [ ] Migrations aplicadas: npx prisma migrate deploy
- [ ] Backup do banco de producao recente
- [ ] Indices criados nas tabelas de alta consulta
- [ ] Conexao pool configurada adequadamente

### 4. Performance

- [ ] Node.js rodando com NODE_ENV=production
- [ ] Redis configurado para filas BullMQ
- [ ] CDN configurada para assets estaticos
- [ ] Compressao gzip/brotli ativa
- [ ] Cache headers configurados

## DEPLOY

### 5. Procedimento

Passo 1: git pull origin main
Passo 2: npm ci --production
Passo 3: npx prisma migrate deploy
Passo 4: npx prisma generate
Passo 5: npm run build
Passo 6: pm2 restart sale-ia-backend

### 6. Verificacoes Pos-Deploy

- [ ] curl SEU_DOMINIO/api/rb-factory-benchmark/catalog retorna JSON
- [ ] curl SEU_DOMINIO/api/rb-factory-benchmark/demos/dentistas/1 retorna HTML
- [ ] Logs do PM2 sem erros criticos
- [ ] Metricas de performance dentro do esperado (menos de 200ms por request)
- [ ] Health check endpoint respondendo 200

## MONITORAMENTO

### 7. Metricas a Acompanhar

- Taxa de erro (deve ser menos de 1%)
- Latencia p95 (deve ser menos de 300ms)
- Uso de memoria (alerta se mais de 1GB)
- Numero de demos gerados por hora
- Nichos mais requisitados

### 8. Alertas

- [ ] Alerta configurado para taxa de erro maior que 5%
- [ ] Alerta configurado para latencia p95 maior que 1s
- [ ] Alerta configurado para uso de memoria maior que 80%
- [ ] Alerta configurado para falhas de conexao com banco

## ROLLBACK

### 9. Procedimento de Rollback

Se algo der errado apos deploy:

Passo 1: git log --oneline | head -10 (identificar versao estavel)
Passo 2: git checkout commit-hash
Passo 3: npx prisma migrate resolve --applied migration --rolled-back
Passo 4: npm run build
Passo 5: pm2 restart sale-ia-backend

## LIMITACOES CONHECIDAS

1. Nao suporta uploads de imagens customizadas (usa gradientes CSS)
2. Nao suporta multi-idioma (apenas PT-BR)
3. Nao suporta formularios funcionais (sao apenas visuais)
4. Limite de 10 demos por nicho (pode ser expandido editando o catalogo)

## PROXIMAS EVOLUCOES PLANEJADAS

- [ ] Suporte a imagens customizadas via upload
- [ ] Suporte a multi-idioma (EN, ES)
- [ ] Formularios funcionais com backend
- [ ] Integracao com Google Analytics / Meta Pixel
- [ ] A/B testing automatico de layouts

## APROVACAO FINAL

- [ ] Tech Lead: _______________________ Data: ___/___/___
- [ ] Product Owner: ___________________ Data: ___/___/___
- [ ] DevOps: _________________________ Data: ___/___/___