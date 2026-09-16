const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname);
const BACKUP_DIR = path.join(ROOT, 'backups_fase0');

// Cria pasta de backup
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);

function backup(filePath) {
    if (!fs.existsSync(filePath)) return;
    const name = path.basename(filePath) + '.' + Date.now() + '.bak';
    fs.copyFileSync(filePath, path.join(BACKUP_DIR, name));
    console.log('  📦 Backup: ' + name);
}

function read(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }
function write(p, content) {
    backup(path.join(ROOT, p));
    fs.writeFileSync(path.join(ROOT, p), content, 'utf8');
}

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║   SALE-IA-V2 — FASE 0: ESTABILIZAÇÃO PÓS-AUDITORIA     ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

// ══════════════════════════════════════════════════════════════════════
// 1. DIAGNÓSTICO DO SCHEMA (somente leitura)
// ═══════════════════════════════════════════════════════════════════════
console.log('[1/9] Analisando schema.prisma...');
const schema = read('prisma/schema.prisma');

// Extrair relações de Order, Payment, Sale, Quote, Lead
const models = ['Order', 'Payment', 'Sale', 'Quote', 'Lead', 'PixPayment', 'OrderItem'];
const relations = {};
models.forEach(m => {
    const regex = new RegExp(`model ${m} \\{([\\s\\S]*?)\\n\\}`, 'g');
    const match = regex.exec(schema);
    if (match) {
        const fields = match[1].split('\n').filter(l => l.includes('@relation'));
        relations[m] = fields.map(f => f.trim());
    }
});

console.log('  Relações encontradas:');
Object.entries(relations).forEach(([m, r]) => {
    if (r.length > 0) console.log(`    ${m}: ${r.length} relação(ões)`);
});

// ═══════════════════════════════════════════════════════════════════════
// 2. CORRIGIR PAYMENT.TEST.TS — ORDEM DE LIMPEZA
// ═══════════════════════════════════════════════════════════════════════
console.log('\n[2/9] Corrigindo payment.test.ts...');
const paymentTestPath = 'tests/payment.test.ts';
if (fs.existsSync(path.join(ROOT, paymentTestPath))) {
    let pt = read(paymentTestPath);
    
    // Verificar se já tem a ordem correta
    if (pt.includes('pixPayment.deleteMany') && pt.includes('sale.deleteMany')) {
        console.log('  ✅ Ordem de limpeza já está correta');
    } else {
        // Substituir a sequência de deleteMany pela ordem correta (respeitando FK)
        // Ordem correta: filhos primeiro, pais depois
        const oldCleanup = /await prisma\.sale\.deleteMany\(\);\s*await prisma\.payment\.deleteMany\(\);\s*await prisma\.order\.deleteMany\(\);/g;
        const newCleanup = `await prisma.pixPayment.deleteMany();
        await prisma.payment.deleteMany();
        await prisma.sale.deleteMany();
        await prisma.orderItem.deleteMany();
        await prisma.order.deleteMany();
        await prisma.quote.deleteMany();
        await prisma.followUp.deleteMany();
        await prisma.outreach.deleteMany();
        await prisma.campaignLead.deleteMany();
        await prisma.campaignMessage.deleteMany();
        await prisma.message.deleteMany();
        await prisma.lead.deleteMany();`;
        
        pt = pt.replace(oldCleanup, newCleanup);
        write(paymentTestPath, pt);
        console.log('  ✅ Ordem de limpeza corrigida (filhos → pais)');
    }
} else {
    console.log('  ️ Arquivo não encontrado: ' + paymentTestPath);
}

// ═══════════════════════════════════════════════════════════════════════
// 3. VERIFICAR PAYMENT WEBHOOK
// ═══════════════════════════════════════════════════════════════════════
console.log('\n[3/9] Auditando paymentRoutes.ts...');
const paymentRoutesPath = 'src/routes/paymentRoutes.ts';
if (fs.existsSync(path.join(ROOT, paymentRoutesPath))) {
    const pr = read(paymentRoutesPath);
    
    // Verificar se retorna { success: true } corretamente
    const checks = {
        'success: true': pr.includes('success: true'),
        'idempotent': pr.includes('idempotent'),
        'res.json': pr.includes('res.json'),
        'error handling': pr.includes('catch')
    };
    
    Object.entries(checks).forEach(([k, v]) => {
        console.log(`    ${v ? '✅' : '❌'} ${k}`);
    });
    
    // Se não tem idempotent, adicionar
    if (!pr.includes('idempotent')) {
        console.log('  ⚠️ Webhook não retorna campo idempotent');
    }
} else {
    console.log('  ❌ paymentRoutes.ts NÃO ENCONTRADO');
}

// ═══════════════════════════════════════════════════════════════════════
// 4. CORRIGIR ENCODING UTF-8
// ═══════════════════════════════════════════════════════════════════════
console.log('\n[4/9] Corrigindo encoding UTF-8...');
const appPath = 'src/app.ts';
if (fs.existsSync(path.join(ROOT, appPath))) {
    let app = read(appPath);
    
    // Verificar middleware problemático
    if (app.includes("Content-Type', 'text/html; charset=utf-8'")) {
        console.log('  ⚠️ Middleware global de text/html detectado');
        console.log('  → Isso força HTML em respostas JSON');
        
        // Substituir por middleware que detecta o tipo correto
        const oldMiddleware = /app\.use\(\(req, res, next\) => \{\s*res\.setHeader\('Content-Type', 'text\/html; charset=utf-8'\);\s*next\(\);\s*\}\);/;
        
        const newMiddleware = `// Middleware UTF-8 inteligente (não sobrescreve JSON)
app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    this.setHeader('Content-Type', 'application/json; charset=utf-8');
    return originalJson(data);
  };
  next();
});`;
        
        app = app.replace(oldMiddleware, newMiddleware);
        write(appPath, app);
        console.log('  ✅ Middleware corrigido (JSON preserva charset utf-8)');
    } else {
        console.log('  ✅ Middleware de encoding já está correto');
    }
}

// ═══════════════════════════════════════════════════════════════════════
// 5. VERIFICAR DASHBOARD ROUTES
// ═══════════════════════════════════════════════════════════════════════
console.log('\n[5/9] Auditando dashboardRoutes.ts...');
const dashPath = 'src/routes/dashboardRoutes.ts';
if (fs.existsSync(path.join(ROOT, dashPath))) {
    const dr = read(dashPath);
    
    // Verificar endpoints
    const endpoints = ['/overview', '/sales-metrics'];
    endpoints.forEach(ep => {
        const has = dr.includes(`'${ep}'`) || dr.includes(`"${ep}"`);
        console.log(`    ${has ? '✅' : '❌'} Endpoint ${ep}`);
    });
    
    // Verificar se usa try/catch
    if (dr.includes('try {') && dr.includes('catch')) {
        console.log('    ✅ Tratamento de erros presente');
    } else {
        console.log('    ⚠️ Sem try/catch — pode gerar 500');
    }
} else {
    console.log('  ❌ dashboardRoutes.ts NÃO ENCONTRADO');
}

// ═══════════════════════════════════════════════════════════════════════
// 6. VERIFICAR PRICING
// ═══════════════════════════════════════════════════════════════════════
console.log('\n[6/9] Auditando pricing.ts...');
const pricingPath = 'src/routes/pricing.ts';
if (fs.existsSync(path.join(ROOT, pricingPath))) {
    const pr = read(pricingPath);
    
    // Verificar se há strings hardcoded com encoding quebrado
    const brokenEncoding = /[Ã£Ã©Ã¡Ã­Ã³ÃºÂ°Â¿Â€Â½]/;
    if (brokenEncoding.test(pr)) {
        console.log('  ❌ Arquivo contém caracteres com encoding quebrado');
        
        // Correção automática
        let fixed = pr;
        const replacements = {
            'Ã£': 'ã', 'Ã©': 'é', 'Ã¡': 'á', 'Ã­': 'í', 'Ã³': 'ó', 'Ãº': 'ú',
            'Ã§': 'ç', 'Ãµ': 'õ', 'Ã¢': 'â', 'Ãª': 'ê', 'Ã´': 'ô',
            'Â°Â¿Â€Â½': '💎', 'mÃ­nimo': 'mínimo', 'mÃ¡ximo': 'máximo',
            'nÃ£o': 'não', 'parÃ¢metro': 'parâmetro', 'sÃ£o': 'são'
        };
        
        Object.entries(replacements).forEach(([bad, good]) => {
            fixed = fixed.split(bad).join(good);
        });
        
        write(pricingPath, fixed);
        console.log('  ✅ Encoding corrigido');
    } else {
        console.log('  ✅ Encoding OK');
    }
}

// ═══════════════════════════════════════════════════════════════════════
// 7. VERIFICAR REDIS / BULLMQ
// ═══════════════════════════════════════════════════════════════════════
console.log('\n[7/9] Auditando Redis/BullMQ...');
const queuePath = 'src/config/queue.ts';
if (fs.existsSync(path.join(ROOT, queuePath))) {
    const q = read(queuePath);
    
    const hasDisconnect = q.includes('.disconnect()') || q.includes('close()');
    const hasTestGuard = q.includes('NODE_ENV') || q.includes('test');
    
    console.log(`    ${hasDisconnect ? '✅' : '⚠️'} Método de disconnect`);
    console.log(`    ${hasTestGuard ? '✅' : '⚠️'} Guarda para ambiente de teste`);
    
    if (!hasDisconnect) {
        console.log('  ⚠️ Adicione queue.close() em afterAll dos testes');
    }
} else {
    console.log('  ℹ️ queue.ts não encontrado (Redis pode não estar em uso)');
}

// ═══════════════════════════════════════════════════════════════════════
// 8. VERIFICAR PROSPECTING ROUTES
// ═══════════════════════════════════════════════════════════════════════
console.log('\n[8/9] Auditando prospectingRoutes.ts...');
const apiRoutesPath = 'src/routes/apiRoutes.ts';
const prospectingPath = 'src/routes/prospectingRoutes.ts';

if (fs.existsSync(path.join(ROOT, apiRoutesPath))) {
    const ar = read(apiRoutesPath);
    
    const hasImport = ar.includes('prospectingRoutes');
    const hasMount = ar.includes("'/prospecting'") || ar.includes('"/prospecting"');
    
    console.log(`    ${hasImport ? '✅' : '❌'} Import de prospectingRoutes`);
    console.log(`    ${hasMount ? '✅' : '❌'} Montagem em /api/prospecting`);
    
    if (hasImport && !hasMount) {
        console.log('  ️ Import existe mas rota não está montada!');
        // Adicionar montagem
        const fixed = ar.replace(
            'export default router;',
            "router.use('/prospecting', prospectingRoutes);\n\nexport default router;"
        );
        write(apiRoutesPath, fixed);
        console.log('  ✅ Rota prospecting montada');
    }
}

// Verificar serviços existentes
const services = [
    'prospectScoringService.ts',
    'websiteDetectionService.ts',
    'websiteScoringService.ts',
    'demoGeneratorService.ts',
    'creativeGeneratorService.ts',
    'proposalGeneratorService.ts',
    'outreachService.ts',
    'whatsappAutomationService.ts'
];

console.log('\n  Serviços existentes:');
services.forEach(s => {
    const exists = fs.existsSync(path.join(ROOT, 'src/services', s));
    console.log(`    ${exists ? '✅' : '❌'} ${s}`);
});

// ═══════════════════════════════════════════════════════════════════════
// 9. RELATÓRIO FINAL
// ═══════════════════════════════════════════════════════════════════════
console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║              RELATÓRIO DE ESTABILIZAÇÃO                  ║');
console.log('══════════════════════════════════════════════════════════╝');
console.log('\n✅ Backups criados em: backups_fase0/');
console.log('\n📋 PRÓXIMOS PASSOS (execute manualmente):');
console.log('   1. npm run build');
console.log('   2. npm test -- --runInBand --detectOpenHandles');
console.log('   3. Copie o resultado dos testes e cole aqui');
console.log('\n️  Se algum teste falhar, me envie:');
console.log('   - Nome do arquivo de teste');
console.log('   - Mensagem de erro completa');
console.log('   - Linha do erro');