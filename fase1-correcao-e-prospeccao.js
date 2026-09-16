const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname);
const BACKUP_DIR = path.join(ROOT, 'backups_fase1');

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);

function backup(filePath) {
    if (!fs.existsSync(filePath)) return;
    const name = path.basename(filePath) + '.' + Date.now() + '.bak';
    fs.copyFileSync(filePath, path.join(BACKUP_DIR, name));
}

function read(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }
function write(p, content) {
    backup(path.join(ROOT, p));
    fs.writeFileSync(path.join(ROOT, p), content, 'utf8');
}

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║   SALE-IA-V2 — FASE 1: CORREÇÕES + PROSPECÇÃO          ║');
console.log('══════════════════════════════════════════════════════════╝\n');

// ══════════════════════════════════════════════════════════════════════
// 1. CORREÇÃO DE ENCODING
// ═══════════════════════════════════════════════════════════════════════
console.log('[1/4] Corrigindo encoding UTF-8...\n');

const filesToClean = [
    'src/routes/dashboardRoutes.ts',
    'src/services/pricingService.ts'
];

const encodingMap = {
    'nã£Â£ã‚Â£o': 'não',
    'parÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢metro': 'parâmetro',
    'parÃ¢metro': 'parâmetro',
    'sÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o': 'são',
    'sÃ£o': 'são',
    'obrigatÃƒÆ’Ã†â€™Ãâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³rios': 'obrigatórios',
    'mã£Â­nimo': 'mínimo',
    'mÃ­nimo': 'mínimo',
    'invã£Â£ã‚Â¡lido': 'inválido',
    'nÃ£o': 'não',
    'corresponde': 'corresponde'
};

filesToClean.forEach(file => {
    const filePath = path.join(ROOT, file);
    if (fs.existsSync(filePath)) {
        let content = read(file);
        let changed = false;
        
        for (const [bad, good] of Object.entries(encodingMap)) {
            if (content.includes(bad)) {
                content = content.split(bad).join(good);
                changed = true;
            }
        }
        
        if (changed) {
            write(file, content);
            console.log(`  ✅ Encoding corrigido: ${file}`);
        } else {
            console.log(`  ✓ Encoding já está correto: ${file}`);
        }
    }
});

// ═══════════════════════════════════════════════════════════════════════
// 2. CORREÇÃO DA INFRAESTRUTURA DE TESTES
// ═══════════════════════════════════════════════════════════════════════
console.log('\n[2/4] Corrigindo infraestrutura de testes...\n');

// Verificar package.json
const packagePath = path.join(ROOT, 'package.json');
if (fs.existsSync(packagePath)) {
    const pkg = JSON.parse(read('package.json'));
    
    // Garantir que o script de teste está correto
    if (!pkg.scripts.test.includes('--runInBand')) {
        pkg.scripts.test = 'jest --coverage --runInBand';
        write('package.json', JSON.stringify(pkg, null, 2));
        console.log('  ✅ Script de teste atualizado no package.json');
    } else {
        console.log('  ✓ Script de teste já está correto');
    }
}

// Verificar jest.config
const jestConfigPath = path.join(ROOT, 'jest.config.js');
if (!fs.existsSync(jestConfigPath)) {
    const jestConfig = `module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts'
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  forceExit: true,
  detectOpenHandles: true
};`;
    write('jest.config.js', jestConfig);
    console.log('  ✅ jest.config.js criado');
} else {
    console.log('  ✓ jest.config.js já existe');
}

// ═══════════════════════════════════════════════════════════════════════
// 3. IMPLEMENTAR MÓDULO 1: PROSPECÇÃO AUTOMÁTICA
// ═══════════════════════════════════════════════════════════════════════
console.log('\n[3/4] Implementando Módulo 1: Prospecção Automática...\n');

// 3.1. Criar modelo Prisma para Business (empresa prospectada)
const schemaPath = path.join(ROOT, 'prisma/schema.prisma');
let schema = read('prisma/schema.prisma');

if (!schema.includes('model Business')) {
    const businessModel = `

model Business {
  id          String   @id @default(uuid())
  name        String
  category    String?
  address     String?
  city        String?
  state       String?
  phone       String?
  website     String?
  email       String?
  segment     String?
  source      String   @default("MANUAL")
  status      String   @default("NEW")
  score       Int      @default(0)
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([city])
  @@index([segment])
  @@index([status])
}`;
    
    schema = schema.trimEnd() + businessModel;
    write('prisma/schema.prisma', schema);
    console.log('  ✅ Modelo Business adicionado ao schema');
} else {
    console.log('  ✓ Modelo Business já existe');
}

// 3.2. Criar serviço de prospecção
const prospectingServicePath = path.join(ROOT, 'src/services/prospectingService.ts');
const prospectingService = `import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface BusinessSearchFilters {
  segment?: string;
  city?: string;
  state?: string;
  category?: string;
  status?: string;
  minScore?: number;
}

export interface BusinessCreateData {
  name: string;
  category?: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  website?: string;
  email?: string;
  segment?: string;
  source?: string;
  notes?: string;
}

export class ProspectingService {
  // Buscar empresas com filtros
  async searchBusinesses(filters: BusinessSearchFilters, page = 1, limit = 20) {
    const where: any = {};
    
    if (filters.segment) where.segment = { contains: filters.segment, mode: 'insensitive' };
    if (filters.city) where.city = { contains: filters.city, mode: 'insensitive' };
    if (filters.state) where.state = filters.state;
    if (filters.category) where.category = { contains: filters.category, mode: 'insensitive' };
    if (filters.status) where.status = filters.status;
    if (filters.minScore) where.score = { gte: filters.minScore };
    
    const skip = (page - 1) * limit;
    
    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.business.count({ where })
    ]);
    
    return {
      businesses,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  // Criar nova empresa prospectada
  async createBusiness(data: BusinessCreateData) {
    // Verificar duplicidade por nome + cidade
    const existing = await prisma.business.findFirst({
      where: {
        name: { contains: data.name, mode: 'insensitive' },
        city: data.city ? { contains: data.city, mode: 'insensitive' } : undefined
      }
    });

    if (existing) {
      return { success: false, error: 'Empresa já cadastrada', business: existing };
    }

    const business = await prisma.business.create({
      data: {
        name: data.name,
        category: data.category,
        address: data.address,
        city: data.city,
        state: data.state,
        phone: data.phone,
        website: data.website,
        email: data.email,
        segment: data.segment,
        source: data.source || 'MANUAL',
        notes: data.notes
      }
    });

    return { success: true, business };
  }

  // Atualizar empresa
  async updateBusiness(id: string, data: Partial<BusinessCreateData>) {
    const business = await prisma.business.update({
      where: { id },
      data
    });
    return { success: true, business };
  }

  // Deletar empresa
  async deleteBusiness(id: string) {
    await prisma.business.delete({ where: { id } });
    return { success: true };
  }

  // Obter estatísticas de prospecção
  async getStats() {
    const total = await prisma.business.count();
    const byStatus = await prisma.business.groupBy({
      by: ['status'],
      _count: true
    });
    const bySegment = await prisma.business.groupBy({
      by: ['segment'],
      _count: true,
      orderBy: { _count: { segment: 'desc' } },
      take: 10
    });

    return {
      total,
      byStatus: byStatus.reduce((acc, curr) => {
        acc[curr.status] = curr._count;
        return acc;
      }, {} as Record<string, number>),
      topSegments: bySegment.map(b => ({
        segment: b.segment || 'Não definido',
        count: b._count
      }))
    };
  }

  // Exportar para CSV
  async exportToCSV(filters?: BusinessSearchFilters) {
    const where: any = {};
    if (filters?.segment) where.segment = { contains: filters.segment, mode: 'insensitive' };
    if (filters?.city) where.city = { contains: filters.city, mode: 'insensitive' };
    if (filters?.state) where.state = filters.state;

    const businesses = await prisma.business.findMany({ where });

    const csvHeader = 'Nome,Categoria,Cidade,Estado,Telefone,Website,Email,Segmento,Status,Score\\n';
    const csvRows = businesses.map(b => 
      \`\${b.name},\${b.category || ''},\${b.city || ''},\${b.state || ''},\${b.phone || ''},\${b.website || ''},\${b.email || ''},\${b.segment || ''},\${b.status},\${b.score}\`
    ).join('\\n');

    return csvHeader + csvRows;
  }
}

export const prospectingService = new ProspectingService();`;

write('src/services/prospectingService.ts', prospectingService);
console.log('  ✅ ProspectingService criado');

// 3.3. Criar rotas de prospecção
const prospectingRoutesPath = path.join(ROOT, 'src/routes/prospectingRoutes.ts');
const prospectingRoutes = `import { Router, Request, Response } from 'express';
import { prospectingService } from '../services/prospectingService';

const router = Router();

// Buscar empresas
router.get('/', async (req: Request, res: Response) => {
  try {
    const { segment, city, state, category, status, minScore, page, limit } = req.query;
    const result = await prospectingService.searchBusinesses(
      {
        segment: segment as string,
        city: city as string,
        state: state as string,
        category: category as string,
        status: status as string,
        minScore: minScore ? parseInt(minScore as string) : undefined
      },
      parseInt(page as string) || 1,
      parseInt(limit as string) || 20
    );
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Criar empresa
router.post('/', async (req: Request, res: Response) => {
  try {
    const result = await prospectingService.createBusiness(req.body);
    if (!result.success) {
      return res.status(409).json(result);
    }
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Atualizar empresa
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const result = await prospectingService.updateBusiness(req.params.id, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Deletar empresa
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await prospectingService.deleteBusiness(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Estatísticas
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await prospectingService.getStats();
    res.json({ success: true, stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Exportar CSV
router.get('/export', async (req: Request, res: Response) => {
  try {
    const { segment, city, state } = req.query;
    const csv = await prospectingService.exportToCSV({
      segment: segment as string,
      city: city as string,
      state: state as string
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=empresas.csv');
    res.send(csv);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;`;

write('src/routes/prospectingRoutes.ts', prospectingRoutes);
console.log('  ✅ Rotas de prospecção criadas');

// 3.4. Garantir que a rota está montada
const apiRoutesPath = path.join(ROOT, 'src/routes/apiRoutes.ts');
let apiRoutes = read('src/routes/apiRoutes.ts');

if (!apiRoutes.includes("router.use('/prospecting'")) {
    if (!apiRoutes.includes('prospectingRoutes')) {
        apiRoutes = "import prospectingRoutes from './prospectingRoutes';\n" + apiRoutes;
    }
    apiRoutes = apiRoutes.replace(
        'export default router;',
        "router.use('/prospecting', prospectingRoutes);\n\nexport default router;"
    );
    write('src/routes/apiRoutes.ts', apiRoutes);
    console.log('  ✅ Rota /api/prospecting montada');
} else {
    console.log('  ✓ Rota /api/prospecting já está montada');
}

// ═══════════════════════════════════════════════════════════════════════
// 4. RESUMO E PRÓXIMOS PASSOS
// ═══════════════════════════════════════════════════════════════════════
console.log('\n[4/4] Finalizando...\n');

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║   ✅ FASE 1 CONCLUÍDA!                                  ║');
console.log('══════════════════════════════════════════════════════════╝');
console.log('\n O que foi feito:');
console.log('   1. ✅ Encoding UTF-8 corrigido');
console.log('   2. ✅ Infraestrutura de testes corrigida');
console.log('   3. ✅ Módulo de Prospecção Automática implementado');
console.log('      - Modelo Business no schema');
console.log('      - ProspectingService completo');
console.log('      - Rotas CRUD + estatísticas + export CSV');
console.log('      - Filtros por segmento, cidade, estado');
console.log('      - Detecção de duplicidade');
console.log('\n PRÓXIMOS PASSOS:');
console.log('   1. Execute: npx prisma generate');
console.log('   2. Execute: npx prisma db push');
console.log('   3. Execute: npm run build');
console.log('   4. Execute: npm test -- --runInBand');
console.log('   5. Me envie o resultado dos testes');
console.log('\n📊 APÓS VALIDAÇÃO, IMPLEMENTAREI:');
console.log('   - Módulo 2: Importação de Contatos (CSV/XLSX)');
console.log('   - Módulo 3: CRM com Pipeline de Vendas');
console.log('   - Módulo 4: Lead Scoring Automático');
console.log('\n⚠️  IMPORTANTE:');
console.log('   Não implementarei todos os 53 itens de uma vez.');
console.log('   Vou implementar UM MÓDULO DE CADA VEZ, testar,');
console.log('   e só então avançar para o próximo.');
console.log('   Isso garante estabilidade e qualidade.');