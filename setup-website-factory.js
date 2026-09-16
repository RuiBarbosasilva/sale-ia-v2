const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

function writeFile(filePath, content) {
  const fullPath = path.join(ROOT, filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`✓ ${filePath}`);
}

console.log('🚀 Implementando Website AI Factory...\n');

// 1. Tipos TypeScript
writeFile('src/types/website.ts', `export interface WebsiteAnalysis {
  websiteQualityScore: number;
  digitalPresenceScore: number;
  opportunityScore: number;
  hasWebsite: boolean;
  websiteStatus: string;
  hasWhatsApp: boolean;
  hasContactForm: boolean;
  hasCTA: boolean;
  isMobileFriendly: boolean;
  hasSSL: boolean;
  issues: string[];
  recommendations: string[];
}

export interface DesignTokens {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  headingFont: string;
  borderRadius: string;
  shadow: string;
}

export interface WebsiteContent {
  heroHeadline: string;
  heroSubtitle: string;
  ctaText: string;
  aboutText: string;
  services: Array<{ title: string; description: string }>;
  benefits: Array<{ title: string; description: string }>;
  faq: Array<{ question: string; answer: string }>;
  metaTitle: string;
  metaDescription: string;
}

export type CreatorType = 'premium' | 'local-business' | 'conversion' | 'clinic' | 'restaurant' | 'professional' | 'service' | 'ecommerce';
`);

// 2. Design Service
writeFile('src/services/website/websiteDesignService.ts', `export class WebsiteDesignService {
  getDesignTokens(creatorType: string) {
    const designs: Record<string, any> = {
      clinic: { primaryColor: '#2563eb', secondaryColor: '#1e40af', accentColor: '#10b981', fontFamily: 'Roboto', headingFont: 'Montserrat', borderRadius: '8px', shadow: '0 10px 40px rgba(37, 99, 235, 0.1)' },
      restaurant: { primaryColor: '#dc2626', secondaryColor: '#991b1b', accentColor: '#f59e0b', fontFamily: 'Open Sans', headingFont: 'Oswald', borderRadius: '6px', shadow: '0 8px 30px rgba(220, 38, 38, 0.15)' },
      professional: { primaryColor: '#0f172a', secondaryColor: '#1e293b', accentColor: '#3b82f6', fontFamily: 'Source Sans Pro', headingFont: 'Merriweather', borderRadius: '4px', shadow: '0 4px 20px rgba(15, 23, 42, 0.1)' },
      service: { primaryColor: '#7c3aed', secondaryColor: '#5b21b6', accentColor: '#ec4899', fontFamily: 'Nunito', headingFont: 'Poppins', borderRadius: '10px', shadow: '0 12px 40px rgba(124, 58, 237, 0.15)' },
      ecommerce: { primaryColor: '#059669', secondaryColor: '#047857', accentColor: '#f97316', fontFamily: 'Inter', headingFont: 'Raleway', borderRadius: '8px', shadow: '0 6px 24px rgba(5, 150, 105, 0.12)' },
      local: { primaryColor: '#0891b2', secondaryColor: '#0e7490', accentColor: '#fbbf24', fontFamily: 'Lato', headingFont: 'Bebas Neue', borderRadius: '6px', shadow: '0 8px 30px rgba(8, 145, 178, 0.12)' },
      conversion: { primaryColor: '#ea580c', secondaryColor: '#c2410c', accentColor: '#84cc16', fontFamily: 'Montserrat', headingFont: 'Anton', borderRadius: '8px', shadow: '0 10px 40px rgba(234, 88, 12, 0.2)' },
      premium: { primaryColor: '#1a1a2e', secondaryColor: '#16213e', accentColor: '#e94560', fontFamily: 'Inter', headingFont: 'Playfair Display', borderRadius: '12px', shadow: '0 20px 60px rgba(0,0,0,0.15)' }
    };
    return designs[creatorType] || designs.local;
  }
}
export const websiteDesignService = new WebsiteDesignService();
`);

// 3. Content Service
writeFile('src/services/website/websiteContentService.ts', `export class WebsiteContentService {
  generateContent(businessName: string, segment: string, city: string, creatorType: string, phone?: string) {
    const cleanPhone = phone?.replace(/\\D/g, '') || '';
    const whatsappLink = cleanPhone.length >= 10 ? 'https://wa.me/55' + cleanPhone : '#';
    
    return {
      heroHeadline: 'Soluções profissionais para seu negócio',
      heroSubtitle: businessName + ' - Excelência em ' + segment + ' em ' + city,
      ctaText: 'Fale Conosco',
      aboutText: 'A ' + businessName + ' é referência em ' + segment + ' em ' + city + ', oferecendo serviços de qualidade com equipe especializada.',
      services: [
        { title: 'Serviço Principal', description: 'Solução completa e profissional' },
        { title: 'Atendimento Personalizado', description: 'Foco nas suas necessidades' },
        { title: 'Suporte Dedicado', description: 'Acompanhamento contínuo' }
      ],
      benefits: [
        { title: 'Qualidade Garantida', description: 'Padrão excellence em todos os serviços' },
        { title: 'Equipe Especializada', description: 'Profissionais qualificados' },
        { title: 'Resultados Comprovados', description: 'Histórico de sucesso' }
      ],
      faq: [
        { question: 'Como solicitar orçamento?', answer: 'Entre em contato pelo WhatsApp ou telefone.' },
        { question: 'Qual o prazo de atendimento?', answer: 'Atendimento rápido, conforme disponibilidade.' },
        { question: 'Atendem em minha região?', answer: 'Atendemos ' + city + ' e região.' }
      ],
      metaTitle: businessName + ' - ' + segment + ' em ' + city,
      metaDescription: 'Empresa especializada em ' + segment + ' em ' + city + '. Entre em contato.'
    };
  }
}
export const websiteContentService = new WebsiteContentService();
`);

// 4. Creator Selector
writeFile('src/services/website/creatorSelector.ts', `export class CreatorSelector {
  selectCreator(segment: string): string {
    const s = segment.toLowerCase();
    if (s.includes('clinica') || s.includes('saude') || s.includes('dentista')) return 'clinic';
    if (s.includes('restaurante') || s.includes('lanchonete') || s.includes('pizzaria')) return 'restaurant';
    if (s.includes('advogado') || s.includes('contabil') || s.includes('consultoria')) return 'professional';
    if (s.includes('salao') || s.includes('barbearia') || s.includes('estetica')) return 'service';
    if (s.includes('loja') || s.includes('ecommerce')) return 'ecommerce';
    if (s.includes('hotel') || s.includes('resort') || s.includes('spa')) return 'premium';
    return 'local';
  }
}
export const creatorSelector = new CreatorSelector();
`);

// 5. Website Compiler
writeFile('src/services/website/websiteCompiler.ts', `export class WebsiteCompiler {
  compile(businessName: string, city: string, phone: string, design: any, content: any): string {
    const cleanPhone = phone.replace(/\\D/g, '');
    const whatsappLink = cleanPhone.length >= 10 ? 'https://wa.me/55' + cleanPhone : '#';
    const year = new Date().getFullYear();
    
    return '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>' + content.metaTitle + '</title><meta name="description" content="' + content.metaDescription + '"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:' + design.fontFamily + ',sans-serif;line-height:1.6;color:#333}header{background:' + design.primaryColor + ';color:white;padding:1rem 0;position:sticky;top:0;z-index:100}nav{max-width:1200px;margin:0 auto;display:flex;justify-content:space-between;padding:0 20px;align-items:center}.logo{font-family:' + design.headingFont + ';font-size:1.5rem;font-weight:bold}.nav-links{display:flex;gap:2rem;list-style:none}.nav-links a{color:white;text-decoration:none}.hero{background:linear-gradient(135deg,' + design.primaryColor + ',' + design.secondaryColor + ');color:white;padding:6rem 20px;text-align:center}.hero h1{font-size:3rem;margin-bottom:1rem;font-family:' + design.headingFont + '}.hero p{font-size:1.3rem;margin-bottom:2rem;opacity:0.95}.btn-primary{display:inline-block;background:' + design.accentColor + ';color:white;padding:1rem 2.5rem;border-radius:' + design.borderRadius + ';font-weight:bold;font-size:1.1rem;text-decoration:none;transition:all 0.3s;box-shadow:' + design.shadow + '}.btn-primary:hover{transform:translateY(-3px)}section{padding:4rem 20px;max-width:1200px;margin:0 auto}.section-title{text-align:center;font-size:2.5rem;margin-bottom:3rem;color:' + design.primaryColor + ';font-family:' + design.headingFont + '}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:2rem}.card{background:white;padding:2rem;border-radius:' + design.borderRadius + ';box-shadow:' + design.shadow + ';transition:transform 0.3s;border-top:4px solid ' + design.accentColor + '}.card:hover{transform:translateY(-8px)}.card h3{color:' + design.primaryColor + ';margin-bottom:1rem;font-size:1.4rem}.benefits{background:#f8fafc}.benefit-card{background:white;padding:2rem;border-radius:' + design.borderRadius + ';box-shadow:0 4px 20px rgba(0,0,0,0.06);text-align:center}.benefit-icon{width:60px;height:60px;background:linear-gradient(135deg,' + design.primaryColor + ',' + design.accentColor + ');border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;color:white;font-size:1.5rem;font-weight:bold}.faq-item{background:white;padding:1.5rem;border-radius:' + design.borderRadius + ';margin-bottom:1rem;box-shadow:0 2px 10px rgba(0,0,0,0.05)}.faq-item h3{color:' + design.primaryColor + ';margin-bottom:0.5rem}.cta-section{background:linear-gradient(135deg,' + design.primaryColor + ',' + design.secondaryColor + ');color:white;text-align:center;padding:4rem 20px}.cta-section h2{font-size:2.5rem;margin-bottom:1rem;font-family:' + design.headingFont + '}footer{background:' + design.primaryColor + ';color:white;text-align:center;padding:2rem 0}.whatsapp-float{position:fixed;bottom:30px;right:30px;width:60px;height:60px;background:#25D366;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 25px rgba(37,211,102,0.4);z-index:999;animation:pulse 2s infinite;text-decoration:none}.whatsapp-float svg{width:32px;height:32px;fill:white}@keyframes pulse{0%,100%{box-shadow:0 8px 25px rgba(37,211,102,0.4)}50%{box-shadow:0 8px 35px rgba(37,211,102,0.6)}}@media(max-width:768px){.hero h1{font-size:2rem}.nav-links{display:none}}</style></head><body><header><nav><div class="logo">' + businessName + '</div><ul class="nav-links"><li><a href="#servicos">Serviços</a></li><li><a href="#beneficios">Benefícios</a></li><li><a href="#sobre">Sobre</a></li><li><a href="#contato">Contato</a></li></ul></nav></header><section class="hero"><h1>' + content.heroHeadline + '</h1><p>' + content.heroSubtitle + '</p><a href="' + whatsappLink + '" class="btn-primary" target="_blank">' + content.ctaText + '</a></section><section id="servicos"><h2 class="section-title">Nossos Serviços</h2><div class="grid">' + content.services.map(s => '<div class="card"><h3>' + s.title + '</h3><p>' + s.description + '</p></div>').join('') + '</div></section><section id="beneficios" class="benefits"><h2 class="section-title">Por Que Nos Escolher</h2><div class="grid">' + content.benefits.map((b, i) => '<div class="benefit-card"><div class="benefit-icon">' + ['✓', '★', '◆'][i % 3] + '</div><h3>' + b.title + '</h3><p>' + b.description + '</p></div>').join('') + '</div></section><section id="sobre"><h2 class="section-title">Sobre a ' + businessName + '</h2><p style="text-align:center;max-width:800px;margin:0 auto;font-size:1.1rem;line-height:1.8;color:#555">' + content.aboutText + '</p></section><section class="faq"><h2 class="section-title">Perguntas Frequentes</h2>' + content.faq.map(f => '<div class="faq-item"><h3>' + f.question + '</h3><p>' + f.answer + '</p></div>').join('') + '</section><section class="cta-section"><h2>Pronto para começar?</h2><p style="font-size:1.2rem;margin-bottom:2rem">Entre em contato agora</p><a href="' + whatsappLink + '" class="btn-primary" style="background:white;color:' + design.primaryColor + '" target="_blank">' + content.ctaText + '</a></section><footer><p>&copy; ' + year + ' ' + businessName + '. Todos os direitos reservados.</p></footer><a href="' + whatsappLink + '" class="whatsapp-float" target="_blank" aria-label="WhatsApp"><svg viewBox="0 0 32 32"><path d="M16.004 0h-.008C7.174 0 0 7.176 0 16c0 3.5 1.128 6.744 3.046 9.378L1.054 31.29l6.118-1.958C9.722 31.016 12.742 32 16.004 32 24.826 32 32 24.822 32 16S24.826 0 16.004 0zm9.35 22.614c-.39 1.1-1.932 2.014-3.164 2.282-.846.18-1.95.324-5.67-1.218-4.762-1.972-7.826-6.79-8.064-7.108-.228-.318-1.932-2.572-1.932-4.904s1.222-3.472 1.658-3.95c.436-.478.952-.596 1.27-.596.318 0 .636.002.914.016.294.014.688-.112 1.078.824.39.936 1.332 3.254 1.448 3.49.118.236.196.512.04.83-.158.318-.236.514-.472.79-.236.276-.496.616-.708.828-.236.236-.482.492-.208.968.276.476 1.222 2.022 2.624 3.268 1.806 1.606 3.332 2.106 3.808 2.342.476.236.752.198 1.028-.118.276-.318 1.186-1.384 1.502-1.86.318-.476.634-.396 1.068-.236.436.158 2.754 1.298 3.228 1.534.476.236.792.354.91.552.118.198.118 1.14-.272 2.24z"/></svg></a></body></html>';
  }
}
export const websiteCompiler = new WebsiteCompiler();
`);

// 6. Website Service (orquestrador)
writeFile('src/services/website/websiteService.ts', `import { PrismaClient } from '@prisma/client';
import { websiteDesignService } from './websiteDesignService';
import { websiteContentService } from './websiteContentService';
import { websiteCompiler } from './websiteCompiler';
import { creatorSelector } from './creatorSelector';

const prisma = new PrismaClient();

export class WebsiteService {
  async analyzeProspect(prospectId: string) {
    const prospect = await prisma.websiteProspect.findUnique({ where: { id: prospectId } });
    if (!prospect) throw new Error('Prospect não encontrado');
    
    const creatorType = creatorSelector.selectCreator(prospect.segment || '');
    const design = websiteDesignService.getDesignTokens(creatorType);
    
    return {
      prospectId,
      creatorType,
      design,
      recommendation: 'Gerar demo com creator ' + creatorType
    };
  }

  async generateWebsite(prospectId: string) {
    const prospect = await prisma.websiteProspect.findUnique({ where: { id: prospectId } });
    if (!prospect) throw new Error('Prospect não encontrado');
    
    const creatorType = creatorSelector.selectCreator(prospect.segment || '');
    const design = websiteDesignService.getDesignTokens(creatorType);
    const content = websiteContentService.generateContent(
      prospect.companyName || 'Sua Empresa',
      prospect.segment || 'negócio',
      prospect.city || 'sua cidade',
      creatorType,
      prospect.phone
    );
    
    const html = websiteCompiler.compile(
      prospect.companyName || 'Sua Empresa',
      prospect.city || 'sua cidade',
      prospect.phone || '',
      design,
      content
    );
    
    const slug = (prospect.companyName || 'empresa').toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50);
    
    let demo = await prisma.websiteDemo.findFirst({ where: { prospectId } });
    
    if (demo) {
      demo = await prisma.websiteDemo.update({
        where: { id: demo.id },
        data: {
          sourceCode: html,
          status: 'READY',
          version: demo.version + 1,
          previewData: JSON.stringify({ businessName: prospect.companyName, segment: prospect.segment, city: prospect.city, generatedAt: new Date().toISOString() })
        }
      });
    } else {
      demo = await prisma.websiteDemo.create({
        data: {
          prospectId,
          sourceCode: html,
          status: 'READY',
          version: 1,
          previewData: JSON.stringify({ businessName: prospect.companyName, segment: prospect.segment, city: prospect.city, generatedAt: new Date().toISOString() })
        }
      });
    }
    
    await prisma.websiteProspect.update({
      where: { id: prospectId },
      data: { status: 'DEMO_READY' }
    });
    
    return {
      success: true,
      demoId: demo.id,
      previewUrl: '/api/websites/demo/' + demo.id,
      version: demo.version
    };
  }

  async getDemo(demoId: string) {
    const demo = await prisma.websiteDemo.findUnique({ where: { id: demoId } });
    return demo?.sourceCode || null;
  }

  async getDemoBySlug(slug: string) {
    const demo = await prisma.websiteDemo.findFirst({ 
      where: { prospect: { companyName: { contains: slug } } }
    });
    return demo?.sourceCode || null;
  }
}

export const websiteService = new WebsiteService();
`);

// 7. Controller
writeFile('src/controllers/websiteController.ts', `import { Request, Response } from 'express';
import { websiteService } from '../services/website/websiteService';

export class WebsiteController {
  async analyze(req: Request, res: Response) {
    try {
      const { prospectId } = req.body;
      if (!prospectId) return res.status(400).json({ error: 'prospectId obrigatório' });
      const analysis = await websiteService.analyzeProspect(prospectId);
      res.json({ success: true, analysis });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async generate(req: Request, res: Response) {
    try {
      const { prospectId } = req.body;
      if (!prospectId) return res.status(400).json({ error: 'prospectId obrigatório' });
      const result = await websiteService.generateWebsite(prospectId);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getDemo(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const code = await websiteService.getDemo(id);
      if (!code) return res.status(404).json({ error: 'Demo não encontrado' });
      res.set('Content-Type', 'text/html; charset=utf-8');
      res.send(code);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async listDemos(req: Request, res: Response) {
    try {
      const demos = await (require('@prisma/client').PrismaClient ? new (require('@prisma/client').PrismaClient)().websiteDemo.findMany({ orderBy: { createdAt: 'desc' }, take: 50, include: { prospect: true } }) : []);
      res.json({ success: true, demos });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export const websiteController = new WebsiteController();
`);

// 8. Routes
writeFile('src/routes/websiteRoutes.ts', `import { Router } from 'express';
import { websiteController } from '../controllers/websiteController';

const router = Router();

router.post('/analyze', (req, res) => websiteController.analyze(req, res));
router.post('/generate', (req, res) => websiteController.generate(req, res));
router.get('/demos', (req, res) => websiteController.listDemos(req, res));
router.get('/demo/:id', (req, res) => websiteController.getDemo(req, res));

export default router;
`);

// 9. Frontend HTML
writeFile('public/website-factory.html', `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Website AI Factory - SALE-IA-V2</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f5f7fa; color: #333; }
    .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
    header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem 0; margin-bottom: 2rem; border-radius: 10px; text-align: center; }
    header h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
    header p { font-size: 1.2rem; opacity: 0.9; }
    .card { background: white; padding: 2rem; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 2rem; }
    .card h2 { color: #667eea; margin-bottom: 1.5rem; font-size: 1.8rem; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .stat-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1.5rem; border-radius: 10px; text-align: center; }
    .stat-card h3 { font-size: 2rem; margin-bottom: 0.5rem; }
    .stat-card p { opacity: 0.9; }
    .btn { padding: 0.8rem 1.5rem; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.3s; color: white; margin-right: 0.5rem; margin-bottom: 0.5rem; }
    .btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    .btn-success { background: #10b981; }
    .btn-warning { background: #f59e0b; }
    .btn-info { background: #3b82f6; }
    .btn:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    th, td { padding: 1rem; text-align: left; border-bottom: 1px solid #e0e0e0; }
    th { background: #f8f9fa; font-weight: 600; color: #555; }
    .badge { padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.85rem; font-weight: 600; }
    .badge-success { background: #d1fae5; color: #065f46; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-info { background: #dbeafe; color: #1e40af; }
    .loading { text-align: center; padding: 2rem; color: #667eea; }
    .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #667eea; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 1rem; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); }
    .modal-content { background: white; margin: 3% auto; padding: 2rem; border-radius: 10px; width: 95%; max-width: 1200px; max-height: 90vh; overflow-y: auto; }
    .close { float: right; font-size: 2rem; cursor: pointer; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🌐 Website AI Factory</h1>
      <p>Máquina Automática de Venda de Sites</p>
    </header>

    <div class="stats-grid" id="statsGrid">
      <div class="stat-card"><h3 id="statTotal">0</h3><p>Demos Geradas</p></div>
      <div class="stat-card"><h3 id="statReady">0</h3><p>Prontas</p></div>
      <div class="stat-card"><h3 id="statPending">0</h3><p>Pendentes</p></div>
    </div>

    <div class="card">
      <h2>🚀 Demos de Websites</h2>
      <button class="btn btn-info" onclick="loadDemos()">🔄 Atualizar Lista</button>
      <div id="demosList" class="loading"><div class="spinner"></div>Carregando...</div>
    </div>
  </div>

  <div id="previewModal" class="modal">
    <div class="modal-content">
      <span class="close" onclick="closeModal()">&times;</span>
      <h2>Preview do Website</h2>
      <iframe id="previewFrame" style="width: 100%; height: 700px; border: 2px solid #e0e0e0; border-radius: 8px; margin-top: 1rem;"></iframe>
    </div>
  </div>

  <script>
    const API = '/api/websites';
    
    async function loadDemos() {
      const list = document.getElementById('demosList');
      list.innerHTML = '<div class="loading"><div class="spinner"></div>Carregando...</div>';
      
      try {
        const res = await fetch(API + '/demos');
        const data = await res.json();
        
        if (!data.demos || data.demos.length === 0) {
          list.innerHTML = '<p>Nenhuma demo gerada ainda. Use a Prospecção de Sites para criar websites.</p>';
          updateStats(0, 0, 0);
          return;
        }

        let html = '<table><thead><tr><th>Empresa</th><th>Segmento</th><th>Cidade</th><th>Versão</th><th>Status</th><th>Ações</th></tr></thead><tbody>';
        
        let ready = 0, pending = 0;
        
        data.demos.forEach(d => {
          if (d.status === 'READY') ready++; else pending++;
          
          const statusBadge = d.status === 'READY' ? '<span class="badge badge-success">Pronta</span>' : '<span class="badge badge-warning">Pendente</span>';
          html += '<tr>';
          html += '<td><strong>' + (d.prospect?.companyName || 'N/A') + '</strong></td>';
          html += '<td>' + (d.prospect?.segment || '-') + '</td>';
          html += '<td>' + (d.prospect?.city || '-') + '</td>';
          html += '<td>v' + d.version + '</td>';
          html += '<td>' + statusBadge + '</td>';
          html += '<td>';
          if (d.status === 'READY') html += '<button class="btn btn-success" onclick="viewDemo(' + d.id + ')" style="padding:0.5rem 1rem;font-size:0.9rem;">Ver Demo</button>';
          html += '</td></tr>';
        });
        
        html += '</tbody></table>';
        list.innerHTML = html;
        updateStats(data.demos.length, ready, pending);
      } catch (e) {
        list.innerHTML = '<p>Erro ao carregar demos.</p>';
      }
    }

    function updateStats(total, ready, pending) {
      document.getElementById('statTotal').textContent = total;
      document.getElementById('statReady').textContent = ready;
      document.getElementById('statPending').textContent = pending;
    }

    async function viewDemo(id) {
      const modal = document.getElementById('previewModal');
      const iframe = document.getElementById('previewFrame');
      iframe.src = API + '/demo/' + id;
      modal.style.display = 'block';
    }

    function closeModal() {
      document.getElementById('previewModal').style.display = 'none';
    }

    loadDemos();
  </script>
</body>
</html>
`);

console.log('\n✅ Website AI Factory implementado com sucesso!');
console.log('\n📋 Próximos passos:');
console.log('1. npm run build');
console.log('2. npm start');
console.log('3. Acesse: http://localhost:3000/website-factory.html');