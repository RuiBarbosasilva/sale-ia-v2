const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
console.log('🔧 Corrigindo arquivos do Site Sales Factory...\n');

// 1. siteProspectingService.ts
const prospectingService = `import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export interface SearchParams { city: string; state: string; segment: string; quantity?: number; }
export interface BusinessData { name: string; category: string; city: string; state: string; phone?: string; website?: string; rating?: number; source: string; }

export class SiteProspectingService {
  async searchBusinesses(params: SearchParams): Promise<{ businesses: BusinessData[]; total: number }> {
    const qty = params.quantity || 10;
    const names: Record<string, string[]> = {
      'restaurante': ['Restaurante Sabor & Cia', 'Cantina Italiana', 'Churrascaria Gaucha'],
      'clinica': ['Clinica Saude Total', 'Clinica Bem Estar', 'Centro Medico Vida'],
      'advocacia': ['Escritorio Silva Advogados', 'Advocacia Associados', 'Escritorio Juridico'],
      'academia': ['Academia Fitness Pro', 'Academia Corpo & Mente', 'Academia Iron'],
      'salao': ['Salao Beleza Pura', 'Salao Elegance', 'Salao Estilo'],
      'imobiliaria': ['Imobiliaria Lar Doce Lar', 'Imobiliaria Negocios', 'Imobiliaria Prime']
    };
    const list = names[params.segment.toLowerCase()] || names['restaurante'];
    const businesses: BusinessData[] = [];
    for (let i = 0; i < qty; i++) {
      const hasSite = Math.random() > 0.6;
      businesses.push({
        name: \`\${list[i % list.length]} \${i + 1}\`,
        category: params.segment,
        city: params.city,
        state: params.state,
        phone: \`119\${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}\`,
        website: hasSite ? \`https://\${params.segment.toLowerCase().replace(/\\s/g, '')}-\${i}.com.br\` : undefined,
        rating: 3.5 + Math.random() * 1.5,
        source: 'SIMULATED'
      });
    }
    return { businesses, total: businesses.length };
  }

  async saveProspect(b: BusinessData): Promise<any> {
    const existing = await prisma.websiteProspect.findFirst({ where: { companyName: b.name, city: b.city } });
    if (existing) return existing;
    return prisma.websiteProspect.create({
      data: {
        companyName: b.name, segment: b.category, city: b.city, state: b.state,
        phone: b.phone, email: null, currentWebsite: b.website || null,
        websiteStatus: b.website ? 'UNKNOWN' : 'NO_WEBSITE',
        websiteScore: 0, status: 'DISCOVERED', score: 0, scoreGrade: null
      }
    });
  }

  calculateOpportunityScore(p: any): number {
    let score = 0;
    if (p.websiteStatus === 'NO_WEBSITE') score += 40;
    else if (p.websiteStatus === 'WEBSITE_POOR' || p.websiteScore < 40) score += 30;
    else if (p.websiteStatus === 'HAS_WEBSITE' && p.websiteScore < 70) score += 15;
    if (p.phone) score += 10;
    if (p.rating && p.rating >= 4.0) score += 10;
    return Math.min(100, score);
  }
}
export const siteProspectingService = new SiteProspectingService();`;

fs.writeFileSync(path.join(ROOT, 'src/services/siteProspectingService.ts'), prospectingService, 'utf8');
console.log('✅ siteProspectingService.ts corrigido');

// 2. siteAuditService.ts
const auditService = `import axios from 'axios';
export interface AuditResult { status: string; score: number; issues: string[]; recommendations: string[]; https: boolean; responseTime: number; mobileFriendly: boolean; hasContactForm: boolean; hasCTA: boolean; hasWhatsApp: boolean; }

export class SiteAuditService {
  async auditWebsite(url: string): Promise<AuditResult> {
    if (!url) return { status: 'NO_WEBSITE', score: 0, issues: ['Empresa nao possui website'], recommendations: ['Criar um website profissional'], https: false, responseTime: 0, mobileFriendly: false, hasContactForm: false, hasCTA: false, hasWhatsApp: false };
    try {
      const start = Date.now();
      const res = await axios.get(url, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' }, validateStatus: s => s < 500 });
      const time = Date.now() - start;
      const html = res.data.toLowerCase();
      const isHttps = url.startsWith('https://');
      const hasMobile = html.includes('viewport');
      const hasForm = html.includes('<form') || html.includes('contato');
      const hasCTA = html.includes('cta') || html.includes('saiba mais') || html.includes('orcamento');
      const hasZap = html.includes('wa.me') || html.includes('whatsapp');
      const hasTitle = html.includes('<title>');
      const hasMeta = html.includes('meta name="description"');
      const hasH1 = html.includes('<h1>');

      let score = 0;
      if (isHttps) score += 15; if (time < 3000) score += 15; if (hasMobile) score += 15;
      if (hasForm) score += 15; if (hasCTA) score += 15; if (hasZap) score += 10;
      if (hasTitle) score += 5; if (hasMeta) score += 5; if (hasH1) score += 5;

      const issues: string[] = [];
      const recs: string[] = [];
      if (!isHttps) { issues.push('Sem HTTPS'); recs.push('Instalar certificado SSL'); }
      if (!hasMobile) { issues.push('Nao otimizado para mobile'); recs.push('Implementar design responsivo'); }
      if (!hasForm) { issues.push('Sem formulario de contato'); recs.push('Adicionar formulario'); }
      if (!hasZap) { issues.push('Sem WhatsApp'); recs.push('Adicionar botao de WhatsApp'); }

      let status = 'HAS_WEBSITE';
      if (score < 40) status = 'WEBSITE_POOR';
      else if (score < 70) status = 'WEBSITE_NEEDS_IMPROVEMENT';
      else if (score >= 80) status = 'WEBSITE_GOOD';

      return { status, score, issues, recommendations: recs, https: isHttps, responseTime: time, mobileFriendly: hasMobile, hasContactForm: hasForm, hasCTA, hasWhatsApp: hasZap };
    } catch {
      return { status: 'WEBSITE_UNREACHABLE', score: 0, issues: ['Site inacessivel'], recommendations: ['Verificar hospedagem'], https: false, responseTime: 0, mobileFriendly: false, hasContactForm: false, hasCTA: false, hasWhatsApp: false };
    }
  }
}
export const siteAuditService = new SiteAuditService();`;

fs.writeFileSync(path.join(ROOT, 'src/services/siteAuditService.ts'), auditService, 'utf8');
console.log('✅ siteAuditService.ts corrigido');

// 3. siteGeneratorService.ts
const generatorService = `import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export class SiteGeneratorService {
  async generateDemo(prospectId: string): Promise<{ demo: any; previewUrl: string }> {
    const p = await prisma.websiteProspect.findUnique({ where: { id: prospectId } });
    if (!p) throw new Error('Prospect nao encontrado');

    const name = p.companyName || 'Sua Empresa';
    const seg = p.segment || 'negocio';
    const city = p.city || 'sua cidade';
    const phone = (p.phone || '0000000000').replace(/\\D/g, '');
    const zap = phone.length >= 10 ? \`https://wa.me/55\${phone}\` : '#';

    const html = \`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>\${name} | \${seg} em \${city}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;line-height:1.6;color:#333}
header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:1rem 0;position:sticky;top:0;z-index:100}
nav{max-width:1200px;margin:0 auto;display:flex;justify-content:space-between;padding:0 20px;align-items:center}
.logo{font-size:1.5rem;font-weight:bold}.hero{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:6rem 20px;text-align:center}
.hero h1{font-size:3rem;margin-bottom:1rem}.hero p{font-size:1.3rem;margin-bottom:2rem;opacity:0.9}
.cta{display:inline-block;background:#fff;color:#667eea;padding:1rem 2.5rem;border-radius:50px;text-decoration:none;font-weight:bold;font-size:1.1rem;transition:transform .3s}
.cta:hover{transform:translateY(-3px);box-shadow:0 10px 30px rgba(0,0,0,0.2)}
section{padding:4rem 20px;max-width:1200px;margin:0 auto}.section-title{text-align:center;font-size:2.5rem;margin-bottom:3rem}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:2rem}
.card{background:#fff;padding:2rem;border-radius:10px;box-shadow:0 5px 20px rgba(0,0,0,0.1);transition:transform .3s}.card:hover{transform:translateY(-5px)}
.card h3{color:#667eea;margin-bottom:1rem}.contact{background:#f8f9fa;text-align:center}
.btn-zap{background:#25D366;color:#fff;padding:1rem 2rem;border-radius:50px;text-decoration:none;font-weight:bold;display:inline-block;margin-top:1rem}
footer{background:#2d3748;color:#fff;text-align:center;padding:2rem 0;margin-top:4rem}
@media(max-width:768px){.hero h1{font-size:2rem}}
</style></head><body>
<header><nav><div class="logo">\${name}</div></nav></header>
<section class="hero"><h1>\${name}</h1><p>\${seg} profissional em \${city}</p><a href="\${zap}" class="cta">Solicitar Orcamento</a></section>
<section><h2 class="section-title">Nossos Servicos</h2><div class="grid">
<div class="card"><h3>Servico 1</h3><p>Solucao completa com qualidade e profissionalismo.</p></div>
<div class="card"><h3>Servico 2</h3><p>Atendimento personalizado e resultados garantidos.</p></div>
<div class="card"><h3>Servico 3</h3><p>Tecnologia e inovacao para o seu negocio.</p></div>
</div></section>
<section class="contact"><h2 class="section-title">Entre em Contato</h2><p>Estamos prontos para atender voce!</p><a href="\${zap}" class="btn-zap">Falar no WhatsApp</a></section>
<footer><p>&copy; \${new Date().getFullYear()} \${name}. Todos os direitos reservados.</p></footer>
</body></html>\`;

    let demo = await prisma.websiteDemo.findFirst({ where: { prospectId } });
    if (demo) {
      demo = await prisma.websiteDemo.update({ where: { id: demo.id }, data: { sourceCode: html, status: 'READY', version: demo.version + 1 } });
    } else {
      demo = await prisma.websiteDemo.create({ data: { prospectId, sourceCode: html, status: 'READY', version: 1 } });
    }
    await prisma.websiteProspect.update({ where: { id: prospectId }, data: { status: 'DEMO_READY' } });
    return { demo, previewUrl: \`/api/site-sales/demo/\${demo.id}\` };
  }
}
export const siteGeneratorService = new SiteGeneratorService();`;

fs.writeFileSync(path.join(ROOT, 'src/services/siteGeneratorService.ts'), generatorService, 'utf8');
console.log('✅ siteGeneratorService.ts corrigido');

// 4. siteSalesRoutes.ts
const routes = `import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { siteProspectingService } from '../services/siteProspectingService';
import { siteAuditService } from '../services/siteAuditService';
import { siteGeneratorService } from '../services/siteGeneratorService';

const router = Router();
const prisma = new PrismaClient();

router.post('/prospect', async (req: Request, res: Response) => {
  try {
    const { city, state, segment, quantity } = req.body;
    if (!city || !state || !segment) return res.status(400).json({ error: 'Cidade, estado e segmento sao obrigatorios' });
    const { businesses } = await siteProspectingService.searchBusinesses({ city, state, segment, quantity });
    const saved = [];
    for (const b of businesses) saved.push(await siteProspectingService.saveProspect(b));
    res.json({ success: true, prospects: saved, total: saved.length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/prospects/:id/audit', async (req: Request, res: Response) => {
  try {
    const p = await prisma.websiteProspect.findUnique({ where: { id: req.params.id } });
    if (!p) return res.status(404).json({ error: 'Prospect nao encontrado' });
    const audit = await siteAuditService.auditWebsite(p.currentWebsite || '');
    const score = siteProspectingService.calculateOpportunityScore({ ...p, websiteStatus: audit.status, websiteScore: audit.score });
    const updated = await prisma.websiteProspect.update({
      where: { id: p.id },
      data: { websiteStatus: audit.status, websiteScore: audit.score, score, scoreGrade: score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D', status: audit.status === 'NO_WEBSITE' ? 'SEM_SITE' : audit.status === 'WEBSITE_POOR' ? 'SITE_COM_PROBLEMAS' : 'QUALIFIED' }
    });
    res.json({ success: true, prospect: updated, audit, opportunityScore: score });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/prospects/:id/demo', async (req: Request, res: Response) => {
  try {
    const result = await siteGeneratorService.generateDemo(req.params.id);
    res.json({ success: true, demo: result.demo, previewUrl: result.previewUrl });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/demo/:id', async (req: Request, res: Response) => {
  try {
    const demo = await prisma.websiteDemo.findUnique({ where: { id: req.params.id } });
    if (!demo) return res.status(404).json({ error: 'Demo nao encontrado' });
    res.set('Content-Type', 'text/html');
    res.send(demo.sourceCode);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/prospects/:id/proposal', async (req: Request, res: Response) => {
  try {
    const p = await prisma.websiteProspect.findUnique({ where: { id: req.params.id } });
    if (!p) return res.status(404).json({ error: 'Prospect nao encontrado' });
    const content = \`PROPOSTA COMERCIAL\\n\\nPara: \${p.companyName}\\nSegmento: \${p.segment}\\n\\nPROJETO: Criacao de Website Profissional\\n\\nINCLUI:\\n- Design personalizado e responsivo\\n- Otimizacao para mobile\\n- Integracao com WhatsApp\\n- Formulario de contato\\n- SEO basico\\n- Hospedagem por 1 ano\\n\\nINVESTIMENTO: A consultar\\n\\nPrazo: 15 dias uteis\`;
    const proposal = await prisma.websiteProposal.create({ data: { prospectId: p.id, content, status: 'DRAFT' } });
    await prisma.websiteProspect.update({ where: { id: p.id }, data: { status: 'PROPOSAL_SENT' } });
    res.json({ success: true, proposal });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/prospects/:id/convert-lead', async (req: Request, res: Response) => {
  try {
    const p = await prisma.websiteProspect.findUnique({ where: { id: req.params.id } });
    if (!p) return res.status(404).json({ error: 'Prospect nao encontrado' });
    if (!p.phone) return res.status(400).json({ error: 'Prospect precisa de telefone' });
    const lead = await prisma.lead.create({ data: { name: p.companyName, phone: p.phone, email: p.email || undefined, status: 'NEW_LEAD', stage: 'PROSPECTADO', score: p.score } });
    await prisma.websiteProspect.update({ where: { id: p.id }, data: { linkedLeadId: lead.id, status: 'NEGOCIACAO' } });
    res.json({ success: true, lead });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/prospects', async (req: Request, res: Response) => {
  try {
    const { city, segment, status } = req.query;
    const where: any = {};
    if (city) where.city = { contains: city as string };
    if (segment) where.segment = { contains: segment as string };
    if (status) where.status = status;
    const prospects = await prisma.websiteProspect.findMany({ where, orderBy: { score: 'desc' }, take: 50 });
    res.json({ success: true, prospects });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;`;

fs.writeFileSync(path.join(ROOT, 'src/routes/siteSalesRoutes.ts'), routes, 'utf8');
console.log('✅ siteSalesRoutes.ts corrigido');

// 5. apiRoutes.ts
const apiPath = path.join(ROOT, 'src/routes/apiRoutes.ts');
let apiContent = fs.readFileSync(apiPath, 'utf8');
if (!apiContent.includes("siteSalesRoutes")) {
    apiContent = "import siteSalesRoutes from './siteSalesRoutes';\n" + apiContent;
    apiContent = apiContent.replace("export default router;", "router.use('/site-sales', siteSalesRoutes);\n\nexport default router;");
    fs.writeFileSync(apiPath, apiContent, 'utf8');
    console.log('✅ Rotas registradas em apiRoutes.ts');
}

console.log('\n🎉 TODOS OS ARQUIVOS FORAM ESCRITOS COM SUCESSO!');
console.log('Agora execute: npm run build');