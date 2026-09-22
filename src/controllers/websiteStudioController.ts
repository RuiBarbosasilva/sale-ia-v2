
// Helper function for image extension guessing (forbidden as 'private' inside object literal)
function guessExtHelper(url: string, mime?: string): string {
  const u = url.toLowerCase();
  if (mime) {
    if (/jpeg|jpg/.test(mime)) return '.jpg';
    if (/png/.test(mime)) return '.png';
    if (/webp/.test(mime)) return '.webp';
    if (/gif/.test(mime)) return '.gif';
    if (/svg/.test(mime)) return '.svg';
  }
  if (/\.png(\?|$)/.test(u)) return '.png';
  if (/\.webp(\?|$)/.test(u)) return '.webp';
  if (/\.gif(\?|$)/.test(u)) return '.gif';
  if (/\.svg(\?|$)/.test(u)) return '.svg';
  return '.jpg';
}
// src/controllers/websiteStudioController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { websiteService } from '../services/website/websiteService';
import { buildZip } from '../utils/zipUtils';
import { websiteImportedTemplateService } from '../services/website/websiteImportedTemplateService';
import { rbFactorySiteMaintenanceService } from '../services/website/rbFactorySiteMaintenanceService';
import { netlifyDeploymentService } from '../services/website/netlifyDeploymentService';

const prisma = new PrismaClient();

const slugify = (s: string) =>
  (s || 'site').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 40) || 'site';

export const websiteStudioController = {
  // ---------- PROSPECTS ----------
  async listProspects(req: Request, res: Response) {
    try {
      const prospects = await prisma.websiteProspect.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200
      });
      res.json({
        success: true,
        prospects: prospects.map((p) => ({
          id: p.id,
          companyName: p.companyName,
          segment: p.segment,
          city: p.city,
          phone: p.phone,
          email: p.email,
          status: p.status
        }))
      });
    } catch (e: any) {
      console.error('[Studio] listProspects:', e.message);
      res.status(500).json({ success: false, error: 'Erro ao listar prospects' });
    }
  },

  async createProspect(req: Request, res: Response) {
    try {
      const { companyName, segment, city, phone, email } = req.body || {};
      if (!companyName || String(companyName).trim().length === 0) {
        return res.status(400).json({ success: false, error: 'companyName é obrigatório' });
      }
      const prospect = await prisma.websiteProspect.create({
        data: {
          companyName: String(companyName).trim(),
          segment: segment || null,
          city: city || null,
          phone: phone || null,
          email: email || null,
          status: 'DISCOVERED'
        }
      });
      res.status(201).json({ success: true, prospect });
    } catch (e: any) {
      console.error('[Studio] createProspect:', e.message);
      res.status(500).json({ success: false, error: 'Erro ao criar prospect' });
    }
  },

  // ---------- TEMPLATES ----------
  async listTemplates(req: Request, res: Response) {
    try {
      const [templates, importedTemplates] = await Promise.all([
        prisma.websiteTemplate.findMany({
          where: { active: true },
          include: { category: { select: { name: true, slug: true } } },
          orderBy: { featured: 'desc' }
        }),
        websiteImportedTemplateService.listActive()
      ]);
      const imported = importedTemplates.map((t) => ({
        ...t,
        id: 'imported:' + t.id,
        source: 'IMPORTED',
        category: t.segment ? { name: t.segment, slug: t.segment } : null,
        featured: true
      }));
      res.json({ success: true, templates: [...templates, ...imported] });
    } catch (e: any) {
      console.error('[Studio] listTemplates:', e.message);
      res.status(500).json({ success: false, error: 'Erro ao listar templates' });
    }
  },

  // ---------- IMPORTAÇÃO DE MODELOS HTML / ZIP ----------
  async importTemplate(req: Request, res: Response) {
    try {
      const file = (req as any).file;
      if (!file) return res.status(400).json({ success: false, error: 'Envie um arquivo HTML ou ZIP no campo file' });
      const template = await websiteImportedTemplateService.importFile(file, {
        name: req.body?.name,
        description: req.body?.description,
        segment: req.body?.segment
      });
      res.status(201).json({
        success: true,
        template: {
          ...template,
          archiveData: undefined,
          id: 'imported:' + template.id,
          source: 'IMPORTED'
        }
      });
    } catch (e: any) {
      console.error('[Studio] importTemplate:', e.message);
      res.status(400).json({ success: false, error: e.message || 'Falha ao importar modelo' });
    }
  },

  // ---------- BIBLIOTECA DE MODELOS IMPORTADOS ----------
  async listImportedTemplateLibrary(req: Request, res: Response) {
    try {
      const items = await websiteImportedTemplateService.listLibrary({
        includeInactive: String(req.query.includeInactive || '') === 'true',
        search: req.query.search ? String(req.query.search) : undefined,
        segment: req.query.segment ? String(req.query.segment) : undefined,
        favorite: String(req.query.favorite || '') === 'true' ? true : undefined
      });
      res.json({success:true,templates:items.map(t=>({...t,id:'imported:'+t.id,source:'IMPORTED'}))});
    } catch(e:any) { console.error('[Studio] listImportedTemplateLibrary:',e.message); res.status(500).json({success:false,error:'Erro ao listar biblioteca de modelos'}); }
  },
  async updateImportedTemplate(req: Request, res: Response) {
    try { const id=String(req.params.id).replace(/^imported:/,''); const template=await websiteImportedTemplateService.update(id,req.body||{}); res.json({success:true,template:{...template,id:'imported:'+template.id,source:'IMPORTED'}}); }
    catch(e:any) { res.status(e.message==='Modelo importado não encontrado'?404:400).json({success:false,error:e.message}); }
  },
  async previewImportedTemplate(req: Request, res: Response) {
    try { const id=String(req.params.id).replace(/^imported:/,''); const html=await websiteImportedTemplateService.preview(id,req.body||{}); res.setHeader('Content-Type','text/html; charset=utf-8'); res.setHeader('Cache-Control','no-store'); res.send(html); }
    catch(e:any) { res.status(e.message==='Modelo importado não encontrado'?404:400).send(e.message||'Erro ao gerar prévia'); }
  },
  async downloadImportedTemplate(req: Request, res: Response) {
    try { const id=String(req.params.id).replace(/^imported:/,''); const archive=await websiteImportedTemplateService.getArchive(id); res.setHeader('Content-Type','application/zip'); res.setHeader('Content-Disposition','attachment; filename="'+archive.slug+'.zip"'); res.send(archive.archiveData); }
    catch(e:any) { res.status(404).json({success:false,error:e.message}); }
  },
  async deleteImportedTemplate(req: Request, res: Response) {
    try { const id=String(req.params.id).replace(/^imported:/,''); await websiteImportedTemplateService.remove(id); res.json({success:true,id:'imported:'+id}); }
    catch(e:any) { res.status(e.message==='Modelo importado não encontrado'?404:400).json({success:false,error:e.message}); }
  },

  // ---------- BRIEFING ----------
  async getBriefing(req: Request, res: Response) {
    try {
      const { prospectId } = req.params;
      const prospect = await prisma.websiteProspect.findUnique({ where: { id: prospectId } });
      if (!prospect) return res.status(404).json({ success: false, error: 'Prospect não encontrado' });

      const lastDemo = await prisma.websiteDemo.findFirst({
        where: { prospectId },
        orderBy: { generatedAt: 'desc' }
      });

      let briefing: any = null;
      if (lastDemo?.previewData) {
        try {
          const pd = JSON.parse(lastDemo.previewData);
          briefing = pd.briefing || pd;
        } catch {
          briefing = null;
        }
      }

      res.json({
        success: true,
        briefing: briefing || {
          businessName: prospect.companyName || '',
          category: prospect.segment || '',
          city: prospect.city || '',
          phone: prospect.phone || '',
          whatsapp: prospect.phone || '',
          email: prospect.email || '',
          website: prospect.currentWebsite || ''
        },
        fromDemo: !!briefing
      });
    } catch (e: any) {
      console.error('[Studio] getBriefing:', e.message);
      res.status(500).json({ success: false, error: 'Erro ao carregar briefing' });
    }
  },

  // ---------- GERACAO ----------
  async generateFromBriefing(req: Request, res: Response) {
    try {
      const { prospectId, templateId, customData, useAI } = req.body || {};
      if (!prospectId) return res.status(400).json({ success: false, error: 'prospectId é obrigatório' });
      if (!customData || !customData.businessName) {
        return res.status(400).json({ success: false, error: 'customData.businessName é obrigatório' });
      }

      const result = await websiteService.generateFromBriefing(
        prospectId,
        templateId || null,
        customData,
        useAI !== false
      );

      res.json({
        success: true,
        demoId: result.demo.id,
        version: result.demo.version,
        aiUsed: result.aiUsed,
        creatorType: result.creatorType,
        assets: result.assets || [],
        assetsSummary: result.assetsSummary || null,
        qualityScore: result.qualityReview?.overallScore ?? null,
        previewUrl: `/api/websites/studio/demos/${result.demo.id}/html`,
        exportUrl: `/api/websites/studio/demos/${result.demo.id}/export`
      });
    } catch (e: any) {
      console.error('[Studio] generateFromBriefing:', e.message);
      const known = ['Prospect não encontrado', 'Template não encontrado'];
      res.status(known.includes(e.message) ? 400 : 500).json({ success: false, error: e.message });
    }
  },

  async listVersions(req: Request, res: Response) {
    try {
      const { prospectId } = req.params;
      const versions = await websiteService.listVersionsByProspect(prospectId);
      res.json({ success: true, versions });
    } catch (e: any) {
      console.error('[Studio] listVersions:', e.message);
      res.status(500).json({ success: false, error: 'Erro ao listar versões' });
    }
  },

  // ---------- REGENERACAO ----------
  async regenerate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const mode = ['content', 'design', 'full'].includes(req.body?.mode) ? req.body.mode : 'full';
      const newDemo = await websiteService.regenerateDemo(id, mode);
      res.json({
        success: true,
        demoId: newDemo.id,
        version: newDemo.version,
        mode,
        previewUrl: `/api/websites/studio/demos/${newDemo.id}/html`,
        exportUrl: `/api/websites/studio/demos/${newDemo.id}/export`
      });
    } catch (e: any) {
      console.error('[Studio] regenerate:', e.message);
      res.status(e.message.includes('não encontrada') ? 404 : 500).json({ success: false, error: e.message });
    }
  },

  // ---------- REPARO DE IMAGENS ----------
  async repairImages(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const newDemo = await websiteService.repairDemoImages(id);
      res.json({
        success: true,
        demoId: newDemo.id,
        version: newDemo.version,
        repairedFrom: id,
        previewUrl: `/api/websites/studio/demos/${newDemo.id}/html`,
        exportUrl: `/api/websites/studio/demos/${newDemo.id}/export`
      });
    } catch (e: any) {
      console.error('[Studio] repairImages:', e.message);
      res.status(e.message.includes('não encontrada') ? 404 : 500).json({ success: false, error: e.message });
    }
  },

  // ---------- PREVIEW (HTML isolado para iframe) ----------
  async getHtml(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const demo = await prisma.websiteDemo.findUnique({ where: { id } });
      if (!demo || !demo.sourceCode) {
        return res.status(404).send('Demo não encontrada');
      }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.send(demo.sourceCode);
    } catch (e: any) {
      console.error('[Studio] getHtml:', e.message);
      res.status(500).send('Erro ao carregar preview');
    }
  },

  // ---------- EXPORTACAO ZIP ----------
  async exportZip(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const demo = await prisma.websiteDemo.findUnique({
        where: { id },
        include: { prospect: true }
      });
      if (!demo || !demo.sourceCode) {
        return res.status(404).json({ success: false, error: 'Demo não encontrada' });
      }

      const businessName = demo.prospect?.companyName || 'site';
      const slug = (businessName || 'site').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 40) || 'site';

      // Extrair metadados do previewData
      let assetsMeta: any[] = [];
      let assetsSummary: any = null;
      try {
        const pd = JSON.parse(demo.previewData || '{}');
        assetsMeta = Array.isArray(pd.assets) ? pd.assets : [];
        assetsSummary = pd.assetsSummary || null;
      } catch {}

      // --- DOWNLOAD DE ASSETS (P0.2) ---
      const downloadedFiles: Array<{ name: string; content: Buffer; meta: any }> = [];
      const urlToLocal: Record<string, string> = {};
      const downloadFailures: Array<{ url: string; reason: string }> = [];

      const axios = (await import('axios')).default;
      const path = await import('path');

      // RB FACTORY: funcao local pura para extensoes (nao depende de this)
      const guessExtLocal = (url: string, mime?: string): string => {
        if (mime) {
          const m = mime.toLowerCase();
          if (m.includes('jpeg') || m.includes('jpg')) return '.jpg';
          if (m.includes('png')) return '.png';
          if (m.includes('webp')) return '.webp';
          if (m.includes('gif')) return '.gif';
          if (m.includes('svg')) return '.svg';
        }
        const u = (url || '').toLowerCase();
        if (u.includes('.png')) return '.png';
        if (u.includes('.webp')) return '.webp';
        if (u.includes('.gif')) return '.gif';
        if (u.includes('.svg')) return '.svg';
        return '.jpg';
      };

      for (let i = 0; i < assetsMeta.length; i++) {
        const meta = assetsMeta[i];
        if (!meta.sourceUrl || meta.sourceUrl.startsWith('data:')) continue;
        if (!/^https?:\/\//i.test(meta.sourceUrl)) continue;

        const ext = guessExtLocal(meta.sourceUrl, meta.mime);
        const usageSlug = String(meta.usage || 'img').toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 24);
        const localName = `${usageSlug}-${i + 1}${ext}`;
        const localPath = `assets/images/${localName}`;

        try {
          const r = await axios.get(meta.sourceUrl, {
            responseType: 'arraybuffer', timeout: 15000,
            headers: { 'User-Agent': 'SaleIA-SiteFactory/3.0' }, maxRedirects: 3
          });
          const buf = Buffer.isBuffer(r.data) ? r.data : Buffer.from(r.data);
          const ct = String(r.headers['content-type'] || '').toLowerCase();
          if (buf.length < 100) { downloadFailures.push({ url: meta.sourceUrl, reason: 'arquivo muito pequeno' }); continue; }
          if (ct && !/image\/(jpeg|jpg|png|webp|gif|svg\+xml)/.test(ct)) {
            downloadFailures.push({ url: meta.sourceUrl, reason: 'MIME ' + ct });
            continue;
          }
          downloadedFiles.push({ name: localPath, content: buf, meta });
          urlToLocal[meta.sourceUrl] = localPath;
        } catch (e: any) {
          downloadFailures.push({ url: meta.sourceUrl, reason: (e?.message || '').substring(0, 80) });
        }
      }

      // --- SUBSTITUIR URLs no HTML por caminhos locais ---
      let html = demo.sourceCode || '';
      for (const [remote, local] of Object.entries(urlToLocal)) {
        html = html.split(remote).join(local);
      }

      // --- README com creditos ---
      const readmeLines = [
        `SITE GERADO - SALE-IA-V2 SITE FACTORY`,
        ``,
        `Cliente: ${businessName}`,
        `Versao: ${demo.version}`,
        `Gerado em: ${demo.generatedAt}`,
        `Score de qualidade: ${assetsSummary?.imageCount !== undefined ? 'disponivel no site.json' : 'n/d'}`,
        ``,
        `COMO PUBLICAR:`,
        `1. Vercel: arraste a pasta em https://vercel.com/new`,
        `2. Netlify: arraste a pasta em https://app.netlify.com/drop`,
        `3. Host proprio: envie via FTP`,
        ``,
        `O ZIP e offline-friendly: imagens foram baixadas para assets/images/.`,
        ``
      ];
      if (assetsMeta.length > 0) {
        readmeLines.push(`IMAGENS E CREDITOS (${assetsMeta.length} total):`);
        readmeLines.push('='.repeat(60));
        for (const m of assetsMeta) {
          const local = urlToLocal[m.sourceUrl] || '(mantida URL externa - ver falhas abaixo)';
          readmeLines.push(`\n[${m.usage}]`);
          readmeLines.push(`  provider:  ${m.provider}`);
          readmeLines.push(`  autor:     ${m.author || '(n/d)'}`);
          readmeLines.push(`  licenca:   ${m.license || '(n/d)'}`);
          readmeLines.push(`  alt:       ${m.alt || '(n/d)'}`);
          readmeLines.push(`  dimensoes: ${m.width}x${m.height}`);
          readmeLines.push(`  sourceUrl: ${m.sourceUrl}`);
          readmeLines.push(`  local:     ${local}`);
          if (m.pageUrl) readmeLines.push(`  pageUrl:   ${m.pageUrl}`);
        }
      }
      if (downloadFailures.length > 0) {
        readmeLines.push(`\n\nFALHAS NO DOWNLOAD (${downloadFailures.length}):`);
        readmeLines.push('='.repeat(60));
        for (const f of downloadFailures) {
          readmeLines.push(`  ${f.url}`);
          readmeLines.push(`    -> ${f.reason}`);
        }
      }
      const readme = readmeLines.join('\n');

      // --- site.json (P12) ---
      const siteJson = {
        projectId: demo.prospectId,
        prospectId: demo.prospectId,
        demoId: demo.id,
        version: demo.version,
        generatedAt: demo.generatedAt,
        businessName,
        assets: {
          total: assetsMeta.length,
          realImages: assetsMeta.filter(m => m.provider !== 'local-placeholder' && m.provider !== 'client-provided').length,
          placeholders: assetsMeta.filter(m => m.provider === 'local-placeholder').length,
          clientProvided: assetsMeta.filter(m => m.provider === 'client-provided').length,
          downloaded: downloadedFiles.length,
          keptRemote: downloadFailures.length,
          items: assetsMeta.map(m => ({
            usage: m.usage,
            provider: m.provider,
            author: m.author || null,
            license: m.license || null,
            dimensions: `${m.width}x${m.height}`,
            alt: m.alt || null,
            sourceUrl: m.sourceUrl,
            localPath: urlToLocal[m.sourceUrl] || null,
            downloaded: !!urlToLocal[m.sourceUrl]
          }))
        },
        providers: [...new Set(assetsMeta.map(m => m.provider))],
        qualityScore: null,
        licenses: [...new Set(assetsMeta.filter(m => m.license).map(m => m.license))],
        // SEGURANCA: nenhum secret incluido
        securityNote: 'This archive contains no API keys, tokens, or secrets.'
      };

      // --- Montar ZIP ---
      const { buildZip } = await import('../utils/zipUtils');
      const files = [
        { name: 'index.html', content: html },
        { name: 'README.txt', content: readme },
        { name: 'metadata/site.json', content: JSON.stringify(siteJson, null, 2) },
        ...downloadedFiles.map(f => ({ name: f.name, content: f.content }))
      ];
      const zip = buildZip(files);

      const filename = `site-${slug}-v${demo.version}.zip`;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(zip);
    } catch (e: any) {
      console.error('[Studio] exportZip:', e.message);
      res.status(500).json({ success: false, error: 'Erro ao exportar ZIP' });
    }
  },

  guessExt(url: string, mime?: string): string {
    return guessExtHelper(url, mime);
  },

  async approve(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const demo = await prisma.websiteDemo.findUnique({
        where: { id },
      });

      if (!demo) {
        return res.status(404).json({ success: false, error: 'Demo não encontrada' });
      }

      const approvedDemo = await prisma.websiteDemo.update({
        where: { id },
        data: { status: 'APPROVED' },
      });

      // Aprovar a demo não significa venda fechada.
      // O projeto só deve ser criado após a aceitação comercial da proposta.
      await prisma.websiteProspect.update({
        where: { id: approvedDemo.prospectId },
        data: { status: 'APPROVED' },
      });

      res.json({
        success: true,
        demoId: approvedDemo.id,
        prospectId: approvedDemo.prospectId,
        status: approvedDemo.status,
        publicationStatus: 'AWAITING_COMMERCIAL_ACCEPTANCE',
      });
    } catch (e: any) {
      console.error('[Studio] approve:', e.message);
      const message = e?.message || '';
      const statusCode = message.includes('não encontrada') || message.includes('nao encontrada') ? 404 : 500;
      res.status(statusCode).json({ success: false, error: message || 'Erro ao aprovar demo' });
    }
  },

  async markProjectPublished(req: Request, res: Response) {
    try {
      const { projectId, domainName, hostingProvider, sourceCodeRepo } = req.body || {};
      if (!projectId) return res.status(400).json({ success: false, error: 'projectId é obrigatório' });
      const project = await websiteService.markProjectPublished(projectId, {
        domainName, hostingProvider, sourceCodeRepo
      });

      let maintenanceClient = null;
      try {
        maintenanceClient = await rbFactorySiteMaintenanceService.createFromProject(project.id, {
          maintenancePlan: 'MONITORING',
          suggestionIntervalDays: 30
        });
      } catch (maintenanceError: any) {
        console.error('[Studio] maintenance client:', maintenanceError?.message || maintenanceError);
      }

      res.json({
        success: true,
        project,
        maintenanceClient,
        publicationStatus: 'PUBLISHED'
      });
    } catch (e: any) {
      const message = e?.message || 'Erro ao registrar publicação';
      const status = ['WEBSITE_PROJECT_NOT_FOUND'].includes(message) ? 404
        : ['DOMAIN_REQUIRED', 'HOSTING_PROVIDER_REQUIRED'].includes(message) ? 400 : 500;
      res.status(status).json({ success: false, error: message });
    }
  },

  // ---------- DEPLOY REAL NO NETLIFY ----------
  async deployNetlify(req: Request, res: Response) {
    try {
      const { demoId, projectId, customDomain } = req.body || {};
      if (!demoId && !projectId) {
        return res.status(400).json({ success: false, error: 'demoId ou projectId é obrigatório' });
      }
      if (!netlifyDeploymentService.isConfigured()) {
        return res.status(503).json({ success: false, error: 'NETLIFY_NOT_CONFIGURED' });
      }

      let project: any = null;
      let demo: any = null;

      if (projectId) {
        project = await prisma.websiteProject.findUnique({
          where: { id: projectId },
          include: { prospect: true }
        });
        if (!project) return res.status(404).json({ success: false, error: 'WEBSITE_PROJECT_NOT_FOUND' });
        demo = await prisma.websiteDemo.findFirst({
          where: { prospectId: project.prospectId, status: { in: ['APPROVED', 'READY'] } },
          orderBy: { generatedAt: 'desc' }
        });
      } else {
        demo = await prisma.websiteDemo.findUnique({
          where: { id: demoId },
          include: { prospect: true }
        });
        if (!demo) return res.status(404).json({ success: false, error: 'Demo não encontrada' });
        if (!['APPROVED', 'READY'].includes(demo.status)) {
          return res.status(400).json({ success: false, error: 'DEMO_NOT_PUBLISHABLE' });
        }
        project = await websiteService.preparePublication(demo.id, customDomain);
        project = await prisma.websiteProject.findUnique({
          where: { id: project.id },
          include: { prospect: true }
        });
      }

      if (!demo?.sourceCode) {
        return res.status(400).json({ success: false, error: 'SOURCE_CODE_NOT_AVAILABLE' });
      }

      const result = await netlifyDeploymentService.deployStaticSite({
        projectId: project.id,
        companyName: project.prospect.companyName,
        html: demo.sourceCode,
        customDomain: customDomain || project.domainName || undefined,
        existingSiteId: project.hostingProvider === 'NETLIFY' ? project.hostingSiteId : null
      });

      const published = await websiteService.markProjectPublished(project.id, {
        domainName: customDomain || project.domainName || result.publicUrl,
        hostingProvider: 'NETLIFY',
        publicUrl: result.publicUrl,
        hostingSiteId: result.siteId,
        hostingDeployId: result.deployId
      });

      let maintenanceClient = null;
      try {
        maintenanceClient = await rbFactorySiteMaintenanceService.createFromProject(published.id, {
          maintenancePlan: 'MONITORING',
          suggestionIntervalDays: 30
        });
      } catch (maintenanceError: any) {
        console.error('[Studio] Netlify maintenance client:', maintenanceError?.message || maintenanceError);
      }

      return res.json({
        success: true,
        publicationStatus: 'PUBLISHED',
        project: published,
        deployment: result,
        publicUrl: result.publicUrl,
        maintenanceClient
      });
    } catch (e: any) {
      const message = e?.message || 'Erro ao publicar no Netlify';
      const status = ['NETLIFY_NOT_CONFIGURED'].includes(message) ? 503
        : ['DEMO_NOT_PUBLISHABLE', 'SOURCE_CODE_NOT_AVAILABLE', 'DOMAIN_REQUIRED'].includes(message) ? 400
        : ['WEBSITE_PROJECT_NOT_FOUND'].includes(message) ? 404 : 500;
      console.error('[Studio] deployNetlify:', message);
      return res.status(status).json({ success: false, error: message });
    }
  },

  // ---------- PREPARACAO DE PUBLICACAO (real, sem falso deploy) ----------
  async preparePublication(req: Request, res: Response) {
    try {
      const { demoId, domainName } = req.body || {};
      if (!demoId) return res.status(400).json({ success: false, error: 'demoId é obrigatório' });

      const project = await websiteService.preparePublication(demoId, domainName);

      res.json({
        success: true,
        project,
        publicationStatus: 'READY_TO_PUBLISH',
        note: 'Publicação automática requer integração com provedor (Vercel/Netlify). Use o ZIP para publicar manualmente.',
        instructions: {
          vercel: [
            'Exporte o ZIP (botão Exportar ZIP)',
            'Acesse https://vercel.com/new',
            'Arraste a pasta extraída com index.html',
            'Configure o domínio se necessário'
          ],
          netlify: [
            'Exporte o ZIP',
            'Acesse https://app.netlify.com/drop',
            'Arraste a pasta extraída',
            'Site publicado instantaneamente'
          ],
          hosting: [
            'Exporte o ZIP',
            'Envie index.html via FTP para public_html'
          ]
        }
      });
    } catch (e: any) {
      console.error('[Studio] preparePublication:', e.message);
      res.status(500).json({ success: false, error: e.message });
    }
  },

  // === PIPELINE PROFISSIONAL ===
  async generateProfessional(req: Request, res: Response) {
    try {
      const { prospectId, customData, useAI } = req.body || {};
      if (!prospectId) return res.status(400).json({ success: false, error: 'prospectId é obrigatório' });
      if (!customData?.businessName) return res.status(400).json({ success: false, error: 'businessName é obrigatório' });

      const result = await websiteService.generateProfessional(prospectId, customData, useAI !== false);

      res.json({
        success: true,
        demoId: result.demo.id,
        version: result.demo.version,
        aiUsed: Boolean(result.demo?.previewData?.useAI ?? useAI),
        improvementCycles: result.improvementCycles,
        qualityScore: result.qualityReview.overallScore,
        qualityRecommendation: result.qualityReview.recommendation,
        research: {
          summary: result.research.summary,
          marketInsights: result.research.marketInsights,
          competitorInsights: result.research.competitorInsights,
          recommendedStructure: result.research.recommendedStructure,
          recommendedVisualDirection: result.research.recommendedVisualDirection
        },
        prd: {
          business: result.prd.business,
          strategy: result.prd.strategy,
          content: { heroHeadline: result.prd.content.heroHeadline, primaryCTA: result.prd.content.primaryCTA }
        },
        designSystem: {
          visualStyle: result.designSystem.visualStyle,
          layoutStyle: result.designSystem.layoutStyle,
          colors: result.designSystem.colors,
          typography: result.designSystem.typography
        },
        qualityReview: result.qualityReview,
        assets: result.assets || [],
        previewUrl: `/api/websites/studio/demos/${result.demo.id}/html`
      });
    } catch (e: any) {
      console.error('[Studio] generateProfessional:', e.message);
      res.status(500).json({ success: false, error: e.message });
    }
  },


  // === DIAGNOSTICO DA IA ===
  async aiStatus(req: Request, res: Response) {
    try {
      const { websiteAIEnhancerService } = await import('../services/website/websiteAIEnhancerService');
      res.json({ success: true, ...websiteAIEnhancerService.getModelInfo() });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  },


  // === ASSETS DE IMAGEM ===
  async getAssets(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const demo = await prisma.websiteDemo.findUnique({ where: { id } });
      if (!demo) return res.status(404).json({ success: false, error: 'Demo não encontrada' });
      let assets: any[] = [];
      try {
        const pd = JSON.parse(demo.previewData || '{}');
        assets = Array.isArray(pd.assets) ? pd.assets : [];
      } catch {}
      res.json({ success: true, assets });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  },

  // === AUTO IMPROVEMENT (P9) ===
  async improveDemo(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const maxCycles = Number(req.body?.maxCycles) || 3;
      const result = await websiteService.improveDemo(id, Math.min(maxCycles, 3));
      res.json({ success: result.success, ...result });
    } catch (e: any) {
      console.error('[Studio] improveDemo:', e.message);
      res.status(e.message.includes('não encontrada') ? 404 : 500).json({ success: false, error: e.message });
    }
  },

  // === HISTORY RICO (P10) ===
  async getHistory(req: Request, res: Response) {
    try {
      const { prospectId } = req.params;
      const history = await websiteService.getHistoryByProspect(prospectId);
      res.json({ success: true, history });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  },

  // === PREVIEW INDICATORS (P11) ===
  async getDemoDetails(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const details = await websiteService.getDemoDetails(id);
      res.json({ success: true, details });
    } catch (e: any) {
      res.status(e.message.includes('não encontrada') ? 404 : 500).json({ success: false, error: e.message });
    }
  },

  // === ROLLBACK (P10) ===
  async rollbackTo(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await websiteService.rollbackTo(id);
      res.json(result);
    } catch (e: any) {
      res.status(e.message.includes('não encontrada') ? 404 : 500).json({ success: false, error: e.message });
    }
  }
};











