import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { siteProspectingService } from '../services/siteProspectingService';
import { siteAuditService } from '../services/siteAuditService';
import { adminAuthorization } from '../middlewares/security';

const router = Router();
const prisma = new PrismaClient();

router.post('/prospect', adminAuthorization, async (req: Request, res: Response) => {
  try {
    const { city, state, segment, quantity } = req.body;
    if (!city || !state || !segment) return res.status(400).json({ error: 'Cidade, estado e segmento sao obrigatorios' });
    const { businesses } = await siteProspectingService.searchBusinesses({ city, state, segment, quantity });
    const saved = [];
    for (const b of businesses) saved.push(await siteProspectingService.saveProspect(b));
    res.json({ success: true, prospects: saved, total: saved.length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/prospects/:id/audit', adminAuthorization, async (req: Request, res: Response) => {
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

router.post('/prospects/:id/demo', adminAuthorization, async (_req: Request, res: Response) => {
  return res.status(410).json({
    success: false,
    error: 'LEGACY_DEMO_FLOW_DISABLED',
    message: 'A geracao de demos deve ocorrer pelo pipeline RB Factory Sites, que usa enriquecimento, imagens, quality gate e idempotencia.'
  });
});

router.get('/demo/:id', adminAuthorization, async (req: Request, res: Response) => {
  try {
    const demo = await prisma.websiteDemo.findUnique({ where: { id: req.params.id } });
    if (!demo) return res.status(404).json({ error: 'Demo nao encontrado' });
    res.set('Content-Type', 'text/html');
    res.send(demo.sourceCode);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/prospects/:id/proposal', adminAuthorization, async (_req: Request, res: Response) => {
  return res.status(410).json({
    success: false,
    error: 'LEGACY_COMMERCIAL_FLOW_DISABLED',
    message: 'Use o pipeline RB Factory Sites em /api/rb-factory-sales para gerar propostas com snapshot comercial, demo aprovada e regras de idempotencia.'
  });
});

router.post('/prospects/:id/convert-lead', adminAuthorization, async (_req: Request, res: Response) => {
  return res.status(410).json({
    success: false,
    error: 'LEGACY_COMMERCIAL_FLOW_DISABLED',
    message: 'A conversao comercial deve ocorrer pelo pipeline RB Factory Sites, que controla Lead, proposta, aceite e projeto de forma atomica.'
  });
});

router.get('/prospects', adminAuthorization, async (req: Request, res: Response) => {
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

export default router;