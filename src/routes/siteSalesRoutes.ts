import { Router, Request, Response } from 'express';
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
    const content = `PROPOSTA COMERCIAL\n\nPara: ${p.companyName}\nSegmento: ${p.segment}\n\nPROJETO: Criacao de Website Profissional\n\nINCLUI:\n- Design personalizado e responsivo\n- Otimizacao para mobile\n- Integracao com WhatsApp\n- Formulario de contato\n- SEO basico\n- Hospedagem por 1 ano\n\nINVESTIMENTO: A consultar\n\nPrazo: 15 dias uteis`;
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

export default router;