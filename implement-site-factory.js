const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
console.log(' INICIANDO IMPLEMENTAÃƒÆ’Ã¢â‚¬Â¡ÃƒÆ’Ã†â€™O COMPLETA DO SITE FACTORY...\n');

function writeFile(filePath, content) {
  const fullPath = path.join(ROOT, filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log('  ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“ ' + filePath);
}

function readFile(filePath) {
  const fullPath = path.join(ROOT, filePath);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, 'utf8');
}

// ============================================================================
// FASE 2: CATEGORIAS
// ============================================================================
console.log('\n[FASE 2] Criando sistema de categorias...');

const categorySchema = `
model WebsiteCategory {
  id          String   @id @default(cuid())
  name        String   @unique
  slug        String   @unique
  description String?
  icon        String?
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  templates   WebsiteTemplate[]
}
`;

// Adicionar ao schema
let schema = readFile('prisma/schema.prisma') || '';
if (!schema.includes('model WebsiteCategory')) {
  schema += categorySchema;
  writeFile('prisma/schema.prisma', schema);
  console.log('  ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“ Model WebsiteCategory adicionado ao schema');
}

// ============================================================================
// FASE 3: TEMPLATES
// ============================================================================
console.log('\n[FASE 3] Criando sistema de templates...');

const templateSchema = `
model WebsiteTemplate {
  id            String   @id @default(cuid())
  name          String
  slug          String   @unique
  categoryId    String
  category      WebsiteCategory @relation(fields: [categoryId], references: [id])
  description   String?
  thumbnailUrl  String?
  demoUrl       String?
  repositoryUrl String?
  sourceType    String   @default("LOCAL")
  price         Float    @default(0)
  active        Boolean  @default(true)
  featured      Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  demos         WebsiteDemo[]
}
`;

if (!schema.includes('model WebsiteTemplate')) {
  schema += templateSchema;
  writeFile('prisma/schema.prisma', schema);
  console.log('  ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“ Model WebsiteTemplate adicionado ao schema');
}

// Atualizar WebsiteDemo para ter templateId
if (!schema.includes('templateId')) {
  schema = schema.replace(
    'model WebsiteDemo {',
    'model WebsiteDemo {\n  templateId  String?\n  template    WebsiteTemplate? @relation(fields: [templateId], references: [id])'
  );
  writeFile('prisma/schema.prisma', schema);
  console.log('  ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“ WebsiteDemo atualizado com templateId');
}

// ============================================================================
// FASE 4-5: ROTAS DE CATEGORIAS E TEMPLATES
// ============================================================================
console.log('\n[FASE 4-5] Criando rotas de categorias e templates...');

const categoryRoutes = `import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req: Request, res: Response) => {
  try {
    const categories = await prisma.websiteCategory.findMany({
      where: { active: true },
      include: { _count: { select: { templates: true } } },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, categories });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, icon } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const category = await prisma.websiteCategory.create({
      data: { name, slug, description, icon }
    });
    res.json({ success: true, category });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const category = await prisma.websiteCategory.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json({ success: true, category });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.websiteCategory.update({
      where: { id: req.params.id },
      data: { active: false }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
`;

writeFile('src/routes/categoryRoutes.ts', categoryRoutes);

const templateRoutes = `import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { categoryId, active, featured } = req.query;
    const where: any = {};
    if (categoryId) where.categoryId = categoryId as string;
    if (active !== undefined) where.active = active === 'true';
    if (featured !== undefined) where.featured = featured === 'true';
    
    const templates = await prisma.websiteTemplate.findMany({
      where,
      include: { category: true },
      orderBy: { featured: 'desc' }
    });
    res.json({ success: true, templates });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, categoryId, description, thumbnailUrl, demoUrl, sourceType, price, featured } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const template = await prisma.websiteTemplate.create({
      data: { name, slug, categoryId, description, thumbnailUrl, demoUrl, sourceType, price, featured }
    });
    res.json({ success: true, template });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const template = await prisma.websiteTemplate.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json({ success: true, template });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.websiteTemplate.update({
      where: { id: req.params.id },
      data: { active: false }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
`;

writeFile('src/routes/templateRoutes.ts', templateRoutes);

// ============================================================================
// FASE 6-10: WEBSITE SERVICE EVOLUÃƒÆ’Ã‚ÂDO
// ============================================================================
console.log('\n[FASE 6-10] Criando Website Service evoluÃƒÆ’Ã‚Â­do...');

const websiteService = `import { PrismaClient } from '@prisma/client';
import { websiteDesignService } from './website/websiteDesignService';
import { websiteContentService } from './website/websiteContentService';
import { websiteCompiler } from './website/websiteCompiler';
import { creatorSelector } from './website/creatorSelector';

const prisma = new PrismaClient();

export class WebsiteService {
  async createSiteFromTemplate(templateId: string, prospectId: string, customData: any) {
    const template = await prisma.websiteTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new Error('Template nÃƒÆ’Ã‚Â£o encontrado');
    
    const prospect = await prisma.websiteProspect.findUnique({ where: { id: prospectId } });
    if (!prospect) throw new Error('Prospect nÃƒÆ’Ã‚Â£o encontrado');
    
    const creatorType = creatorSelector.selectCreator(prospect.segment || '');
    const design = websiteDesignService.getDesignTokens(creatorType);
    const content = websiteContentService.generateContent(
      customData.businessName || prospect.companyName || 'Sua Empresa',
      customData.category || prospect.segment || 'negÃƒÆ’Ã‚Â³cio',
      customData.city || prospect.city || 'sua cidade',
      creatorType,
      customData.whatsapp || prospect.phone
    );
    
    const html = websiteCompiler.compile(
      customData.businessName || prospect.companyName || 'Sua Empresa',
      customData.city || prospect.city || 'sua cidade',
      customData.whatsapp || prospect.phone || '',
      design,
      content
    );
    
    const demo = await prisma.websiteDemo.create({
      data: {
        prospectId,
        templateId,
        sourceCode: html,
        status: 'READY',
        version: 1,
        previewData: JSON.stringify({ ...customData, generatedAt: new Date().toISOString() })
      }
    });
    
    await prisma.websiteProspect.update({
      where: { id: prospectId },
      data: { status: 'DEMO_GERADA' }
    });
    
    return { success: true, demoId: demo.id };
  }
  
  async generateProposal(prospectId: string, templateId: string) {
    const prospect = await prisma.websiteProspect.findUnique({ where: { id: prospectId } });
    const template = await prisma.websiteTemplate.findUnique({ where: { id: templateId } });
    
    const proposal = await prisma.websiteProposal.create({
      data: {
        prospectId,
        title: 'Proposta de Website - ' + (prospect?.companyName || ''),
        description: 'CriaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de website profissional baseado no modelo ' + (template?.name || ''),
        price: template?.price || 0,
        status: 'DRAFT'
      }
    });
    
    await prisma.websiteProspect.update({
      where: { id: prospectId },
      data: { status: 'PROPOSTA_ENVIADA' }
    });
    
    return { success: true, proposalId: proposal.id };
  }
}

export const websiteService = new WebsiteService();
`;

writeFile('src/services/websiteService.ts', websiteService);

// ============================================================================
// FASE 11: FUNIL DE VENDAS
// ============================================================================
console.log('\n[FASE 11] Atualizando funil de vendas...');

// Atualizar status do WebsiteProspect
if (schema.includes('status')) {
  // Adicionar comentÃƒÆ’Ã‚Â¡rio sobre os novos status
  console.log('  ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“ Status do funil: NOVO, ANALISADO, DEMO_GERADA, DEMO_ENVIADA, PROPOSTA_ENVIADA, NEGOCIACAO, AGUARDANDO_PAGAMENTO, PAGO, CLIENTE, PROJETO, PUBLICADO, PERDIDO');
}

// ============================================================================
// FASE 13: DASHBOARD DO SITE FACTORY
// ============================================================================
console.log('\n[FASE 13] Criando rotas do dashboard do Site Factory...');

const siteFactoryDashboardRoutes = `import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/overview', async (req: Request, res: Response) => {
  try {
    const totalModels = await prisma.websiteTemplate.count({ where: { active: true } });
    const totalCategories = await prisma.websiteCategory.count({ where: { active: true } });
    const totalProspects = await prisma.websiteProspect.count();
    const totalDemos = await prisma.websiteDemo.count({ where: { status: 'READY' } });
    const totalProposals = await prisma.websiteProposal.count();
    const totalSales = await prisma.websiteProposal.count({ where: { status: 'APPROVED' } });
    
    const revenue = await prisma.websiteProposal.aggregate({
      where: { status: 'APPROVED' },
      _sum: { price: true }
    });
    
    res.json({
      success: true,
      data: {
        totalModels,
        totalCategories,
        totalProspects,
        totalDemos,
        totalProposals,
        totalSales,
        revenue: revenue._sum.price || 0
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
`;

writeFile('src/routes/siteFactoryDashboardRoutes.ts', siteFactoryDashboardRoutes);

// ============================================================================
// FASE 16: FRONTEND CONSOLIDADO
// ============================================================================
console.log('\n[FASE 16] Criando frontend do Site Factory...');

const siteFactoryHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Site Factory - SALE-IA-V2</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', sans-serif; background: #f5f7fa; color: #333; }
    .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
    header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; border-radius: 10px; margin-bottom: 2rem; }
    header h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
    .nav { display: flex; gap: 1rem; margin-bottom: 2rem; flex-wrap: wrap; }
    .nav button { padding: 0.75rem 1.5rem; border: none; border-radius: 8px; background: white; color: #667eea; cursor: pointer; font-weight: 600; }
    .nav button.active { background: #667eea; color: white; }
    .section { display: none; }
    .section.active { display: block; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .stat { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1.5rem; border-radius: 10px; }
    .stat-value { font-size: 2rem; font-weight: bold; }
    .stat-label { font-size: 0.875rem; opacity: 0.9; }
    .card { background: white; padding: 2rem; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 2rem; }
    .card h2 { color: #667eea; margin-bottom: 1.5rem; }
    .btn { padding: 0.75rem 1.5rem; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; margin: 0.25rem; }
    .btn-primary { background: #667eea; color: white; }
    .btn-success { background: #10b981; color: white; }
    .btn-warning { background: #f59e0b; color: white; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; }
    .template-card { background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); transition: transform 0.3s; }
    .template-card:hover { transform: translateY(-5px); }
    .template-card img { width: 100%; height: 200px; object-fit: cover; }
    .template-card .content { padding: 1rem; }
    .template-card h3 { color: #667eea; margin-bottom: 0.5rem; }
    .template-card .price { font-size: 1.5rem; font-weight: bold; color: #10b981; margin: 0.5rem 0; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 1rem; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; }
    .badge { padding: 0.375rem 0.875rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
    .badge-success { background: #d1fae5; color: #065f46; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-info { background: #dbeafe; color: #1e40af; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>ÃƒÂ°Ã…Â¸Ã…â€™Ã‚Â Site Factory</h1>
      <p>MÃƒÆ’Ã‚Â¡quina de CriaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o e Venda de Sites</p>
    </header>

    <nav class="nav">
      <button onclick="showSection('overview')" id="btn-overview" class="active">ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã…Â  VisÃƒÆ’Ã‚Â£o Geral</button>
      <button onclick="showSection('templates')" id="btn-templates">ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â¦ Modelos</button>
      <button onclick="showSection('categories')" id="btn-categories">ÃƒÂ¯Ã‚Â¸Ã‚Â Categorias</button>
      <button onclick="showSection('prospects')" id="btn-prospects">ÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ‚Â¥ Prospects</button>
      <button onclick="showSection('demos')" id="btn-demos">ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¨ Demos</button>
      <button onclick="showSection('proposals')" id="btn-proposals"> Propostas</button>
    </nav>

    <section id="overview" class="section active">
      <div class="stats" id="statsGrid"></div>
      <div class="card"><h2>ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‹â€  Resumo</h2><div id="overviewContent"></div></div>
    </section>

    <section id="templates" class="section">
      <div class="card">
        <h2>ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â¦ Biblioteca de Modelos</h2>
        <button onclick="loadTemplates()" class="btn btn-primary"> Atualizar</button>
        <div id="templatesGrid" class="grid" style="margin-top:1rem"></div>
      </div>
    </section>

    <section id="categories" class="section">
      <div class="card">
        <h2>ÃƒÂ°Ã…Â¸Ã‚ÂÃ‚Â·ÃƒÂ¯Ã‚Â¸Ã‚Â Categorias</h2>
        <button onclick="loadCategories()" class="btn btn-primary">ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾ Atualizar</button>
        <div id="categoriesList" style="margin-top:1rem"></div>
      </div>
    </section>

    <section id="prospects" class="section">
      <div class="card">
        <h2> Prospects</h2>
        <button onclick="loadProspects()" class="btn btn-primary">ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾ Atualizar</button>
        <div id="prospectsList" style="margin-top:1rem"></div>
      </div>
    </section>

    <section id="demos" class="section">
      <div class="card">
        <h2>ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¨ Demos Geradas</h2>
        <button onclick="loadDemos()" class="btn btn-primary">ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾ Atualizar</button>
        <div id="demosList" style="margin-top:1rem"></div>
      </div>
    </section>

    <section id="proposals" class="section">
      <div class="card">
        <h2>ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã¢â‚¬Å¾ Propostas</h2>
        <button onclick="loadProposals()" class="btn btn-primary">ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾ Atualizar</button>
        <div id="proposalsList" style="margin-top:1rem"></div>
      </div>
    </section>
  </div>

  <script>
    const API = '/api';
    
    function showSection(section) {
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      document.getElementById(section).classList.add('active');
      document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
      document.getElementById('btn-' + section).classList.add('active');
      
      if (section === 'overview') loadOverview();
      if (section === 'templates') loadTemplates();
      if (section === 'categories') loadCategories();
      if (section === 'prospects') loadProspects();
      if (section === 'demos') loadDemos();
      if (section === 'proposals') loadProposals();
    }

    async function loadOverview() {
      try {
        const res = await fetch(API + '/site-factory-dashboard/overview');
        const data = await res.json();
        if (data.success) {
          const d = data.data;
          document.getElementById('statsGrid').innerHTML = \`
            <div class="stat"><div class="stat-value">\${d.totalModels}</div><div class="stat-label">Modelos</div></div>
            <div class="stat" style="background:linear-gradient(135deg,#10b981,#059669)"><div class="stat-value">\${d.totalProspects}</div><div class="stat-label">Prospects</div></div>
            <div class="stat" style="background:linear-gradient(135deg,#f59e0b,#d97706)"><div class="stat-value">\${d.totalDemos}</div><div class="stat-label">Demos</div></div>
            <div class="stat" style="background:linear-gradient(135deg,#ef4444,#dc2626)"><div class="stat-value">R$\${d.revenue.toFixed(2)}</div><div class="stat-label">Receita</div></div>
          \`;
        }
      } catch (err) { console.error('Erro:', err); }
    }

    async function loadTemplates() {
      try {
        const res = await fetch(API + '/templates');
        const data = await res.json();
        const templates = data.templates || [];
        let html = '';
        templates.forEach(t => {
          html += \`<div class="template-card">
            <img src="\${t.thumbnailUrl || 'https://via.placeholder.com/300x200'}" alt="\${t.name}">
            <div class="content">
              <h3>\${t.name}</h3>
              <p>\${t.category?.name || 'Sem categoria'}</p>
              <div class="price">R$\${t.price.toFixed(2)}</div>
              <button class="btn btn-primary" onclick="window.open('\${t.demoUrl}', '_blank')">Ver Demo</button>
              <button class="btn btn-success">Usar Modelo</button>
            </div>
          </div>\`;
        });
        document.getElementById('templatesGrid').innerHTML = html || '<p>Nenhum modelo encontrado</p>';
      } catch (err) { console.error('Erro:', err); }
    }

    async function loadCategories() {
      try {
        const res = await fetch(API + '/categories');
        const data = await res.json();
        const categories = data.categories || [];
        let html = '<table><thead><tr><th>Nome</th><th>Slug</th><th>Templates</th><th>Status</th></tr></thead><tbody>';
        categories.forEach(c => {
          html += '<tr><td>' + c.name + '</td><td>' + c.slug + '</td><td>' + (c._count?.templates || 0) + '</td><td><span class="badge badge-success">Ativo</span></td></tr>';
        });
        html += '</tbody></table>';
        document.getElementById('categoriesList').innerHTML = html;
      } catch (err) { console.error('Erro:', err); }
    }

    async function loadProspects() {
      try {
        const res = await fetch(API + '/site-sales/prospects');
        const data = await res.json();
        const prospects = data.prospects || [];
        let html = '<table><thead><tr><th>Empresa</th><th>Cidade</th><th>Score</th><th>Status</th></tr></thead><tbody>';
        prospects.forEach(p => {
          html += '<tr><td>' + (p.companyName || 'N/A') + '</td><td>' + (p.city || 'N/A') + '</td><td>' + (p.score || 0) + '</td><td><span class="badge badge-info">' + (p.status || 'N/A') + '</span></td></tr>';
        });
        html += '</tbody></table>';
        document.getElementById('prospectsList').innerHTML = html;
      } catch (err) { console.error('Erro:', err); }
    }

    async function loadDemos() {
      try {
        const res = await fetch(API + '/websites/demos');
        const data = await res.json();
        const demos = data.demos || [];
        let html = '<table><thead><tr><th>Empresa</th><th>VersÃƒÆ’Ã‚Â£o</th><th>Status</th><th>AÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes</th></tr></thead><tbody>';
        demos.forEach(d => {
          html += '<tr><td>' + (d.prospect?.companyName || 'N/A') + '</td><td>v' + d.version + '</td><td><span class="badge badge-success">' + d.status + '</span></td><td><button class="btn btn-primary" onclick="window.open(\\'/api/websites/demo/' + d.id + '\\', \\'_blank\\')">Ver</button></td></tr>';
        });
        html += '</tbody></table>';
        document.getElementById('demosList').innerHTML = html;
      } catch (err) { console.error('Erro:', err); }
    }

    async function loadProposals() {
      document.getElementById('proposalsList').innerHTML = '<p>Em desenvolvimento...</p>';
    }

    window.onload = function() { loadOverview(); };
  </script>
</body>
</html>
}`;

writeFile('public/site-factory.html', siteFactoryHtml);

// ============================================================================
// FASE 17: REGISTRAR TODAS AS ROTAS
// ============================================================================
console.log('\n[FASE 17] Registrando todas as rotas...');

let apiRoutes = readFile('src/routes/apiRoutes.ts') || '';

const routesToRegister = [
  { import: "import categoryRoutes from './categoryRoutes';", use: "router.use('/categories', categoryRoutes);" },
  { import: "import templateRoutes from './templateRoutes';", use: "router.use('/templates', templateRoutes);" },
  { import: "import siteFactoryDashboardRoutes from './siteFactoryDashboardRoutes';", use: "router.use('/site-factory-dashboard', siteFactoryDashboardRoutes);" }
];

routesToRegister.forEach(route => {
  if (!apiRoutes.includes(route.import)) {
    apiRoutes = route.import + '\n' + apiRoutes;
  }
  if (!apiRoutes.includes(route.use)) {
    apiRoutes = apiRoutes.replace('export default router;', route.use + '\n\nexport default router;');
  }
});

writeFile('src/routes/apiRoutes.ts', apiRoutes);
console.log('  ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“ Todas as rotas registradas');

// ============================================================================
// FASE 18: CRIAR CATEGORIAS INICIAIS
// ============================================================================
console.log('\n[FASE 18] Criando seed de categorias iniciais...');

const seedScript = String.raw`import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  { name: 'Dentistas', slug: 'dentistas', icon: 'ÃƒÂ°Ã…Â¸Ã‚Â¦Ã‚Â·' },
  { name: 'MÃƒÆ’Ã‚Â©dicos', slug: 'medicos', icon: 'ÃƒÂ¢Ã…Â¡Ã¢â‚¬Â¢ÃƒÂ¯Ã‚Â¸Ã‚Â' },
  { name: 'Nutricionistas', slug: 'nutricionistas', icon: 'ÃƒÂ°Ã…Â¸Ã‚Â¥Ã¢â‚¬â€' },
  { name: 'ClÃƒÆ’Ã‚Â­nicas', slug: 'clinicas', icon: 'ÃƒÂ°Ã…Â¸Ã‚ÂÃ‚Â¥' },
  { name: 'EstÃƒÆ’Ã‚Â©tica', slug: 'estetica', icon: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬â„¢Ã¢â‚¬Â ' },
  { name: 'PsicÃƒÆ’Ã‚Â³logos', slug: 'psicologos', icon: 'ÃƒÂ°Ã…Â¸Ã‚Â§Ã‚Â ' },
  { name: 'Advogados', slug: 'advogados', icon: 'ÃƒÂ¢Ã…Â¡Ã¢â‚¬â€œÃƒÂ¯Ã‚Â¸Ã‚Â' },
  { name: 'Contadores', slug: 'contadores', icon: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã…Â ' },
  { name: 'ImobiliÃƒÆ’Ã‚Â¡rias', slug: 'imobiliarias', icon: 'ÃƒÂ°Ã…Â¸Ã‚ÂÃ‚Â ' },
  { name: 'Restaurantes', slug: 'restaurantes', icon: 'ÃƒÂ°Ã…Â¸Ã‚ÂÃ‚Â½ÃƒÂ¯Ã‚Â¸Ã‚Â' },
  { name: 'HotÃƒÆ’Ã‚Â©is', slug: 'hoteis', icon: 'ÃƒÂ°Ã…Â¸Ã‚ÂÃ‚Â¨' },
  { name: 'Academias', slug: 'academias', icon: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬â„¢Ã‚Âª' },
  { name: 'SalÃƒÆ’Ã‚Âµes', slug: 'saloes', icon: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬â„¢Ã¢â‚¬Â¡' },
  { name: 'Barbearias', slug: 'barbearias', icon: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬â„¢Ã‹â€ ' },
  { name: 'FotÃƒÆ’Ã‚Â³grafos', slug: 'fotografos', icon: '' },
  { name: 'Arquitetos', slug: 'arquitetos', icon: 'ÃƒÂ¯Ã‚Â¸Ã‚Â' },
  { name: 'Engenheiros', slug: 'engenheiros', icon: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â§' },
  { name: 'Prestadores de ServiÃƒÆ’Ã‚Â§os', slug: 'prestadores', icon: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂºÃ‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â' },
  { name: 'ComÃƒÆ’Ã‚Â©rcio', slug: 'comercio', icon: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂºÃ¢â‚¬â„¢' },
  { name: 'Empresas', slug: 'empresas', icon: 'ÃƒÂ°Ã…Â¸Ã‚ÂÃ‚Â¢' },
  { name: 'EducaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o', slug: 'educacao', icon: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã…Â¡' },
  { name: 'Eventos', slug: 'eventos', icon: 'ÃƒÂ°Ã…Â¸Ã…Â½Ã¢â‚¬Â°' },
  { name: 'Outros', slug: 'outros', icon: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â¦' }
];

async function seed() {
  console.log('ÃƒÂ°Ã…Â¸Ã…â€™Ã‚Â± Criando categorias iniciais...');
  for (const cat of categories) {
    await prisma.websiteCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat
    });
  }
  console.log('ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ ' + categories.length + ' categorias criadas!');
  await prisma.\$disconnect();
}

seed().catch(console.error);
`;

writeFile('prisma/seed-site-factory.ts', seedScript);

// ============================================================================
// FINAL: INSTRUÃƒÆ’Ã¢â‚¬Â¡ÃƒÆ’Ã¢â‚¬Â¢ES
// ============================================================================
console.log('\n============================================================');
console.log('  ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ IMPLEMENTAÃƒÆ’Ã¢â‚¬Â¡ÃƒÆ’Ã†â€™O CONCLUÃƒÆ’Ã‚ÂDA!');
console.log('============================================================');
console.log('\nÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã¢â‚¬Â¹ PRÃƒÆ’Ã¢â‚¬Å“XIMOS PASSOS:');
console.log('1. npx prisma migrate dev --name add-site-factory-models');
console.log('2. npx ts-node prisma/seed-site-factory.ts');
console.log('3. npm run build');
console.log('4. npm start');
console.log('5. Acesse: http://localhost:3000/site-factory.html');
console.log('\n============================================================');
