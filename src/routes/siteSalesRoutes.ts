import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { siteProspectingService } from '../services/siteProspectingService';
import { siteAuditService } from '../services/siteAuditService';
import { siteGeneratorService } from '../services/siteGeneratorService';
import { proposalGeneratorService } from '../services/proposalGeneratorService';
import { getOrCreateLead } from '../services/leadService';
import { websiteCommercialService } from '../services/websiteCommercialService';

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
    const { planId, planCode } = req.body || {};
    if (!planId && !planCode) {
      return res.status(400).json({ error: 'PLANO_OBRIGATORIO: informe planId ou planCode' });
    }

    const proposal = await proposalGeneratorService.generateProposal(req.params.id, {
      planId,
      planCode,
    });

    res.json({ success: true, proposal });
  } catch (e: any) {
    const message = e?.message || 'Erro ao gerar proposta';
    const status = message.startsWith('WEBSITE_') || message.startsWith('DEMO_') ? 400 : 500;
    res.status(status).json({ error: message });
  }
});



router.post('/prospects/:id/convert-lead', async (req: Request, res: Response) => {
  try {
    const p = await prisma.websiteProspect.findUnique({ where: { id: req.params.id } });
    if (!p) return res.status(404).json({ error: 'Prospect nao encontrado' });
    if (!p.phone) return res.status(400).json({ error: 'Prospect precisa de telefone' });

    if (p.linkedLeadId) {
      const existing = await prisma.lead.findUnique({ where: { id: p.linkedLeadId } });
      if (existing) return res.json({ success: true, lead: existing, reused: true });
    }

    const lead = await getOrCreateLead(p.phone, p.companyName);

    if (p.email && !lead.email) {
      await prisma.lead.update({ where: { id: lead.id }, data: { email: p.email } });
    }

    const updatedLead = await prisma.lead.update({
      where: { id: lead.id },
      data: { score: Math.max(lead.score || 0, p.score || 0), stage: 'PROSPECTADO' },
    });

    await prisma.websiteProspect.update({
      where: { id: p.id },
      data: { linkedLeadId: updatedLead.id, status: 'NEGOCIACAO', contactedAt: p.contactedAt || new Date() },
    });

    await prisma.websiteProspectEvent.create({
      data: {
        prospectId: p.id,
        type: 'NEGOTIATION_STARTED',
        description: 'Prospect convertido em lead comercial para negociação.',
        metadata: JSON.stringify({ leadId: updatedLead.id }),
      },
    });

    res.json({ success: true, lead: updatedLead, reused: false });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Erro ao converter prospect em lead' });
  }
});



router.get('/plans', async (req: Request, res: Response) => {
  try {
    const plans = await proposalGeneratorService.listPlans();
    res.json({ success: true, plans });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Erro ao listar planos' });
  }
});

router.post('/prospects/:id/accept-proposal', async (req: Request, res: Response) => {
  try {
    const proposalId = req.body?.proposalId;
    if (!proposalId) {
      return res.status(400).json({ error: 'PROPOSTA_OBRIGATORIA: informe proposalId' });
    }

    const proposal = await prisma.websiteProposal.findUnique({
      where: { id: proposalId },
      select: { prospectId: true },
    });

    if (!proposal || proposal.prospectId !== req.params.id) {
      return res.status(404).json({ error: 'WEBSITE_PROPOSAL_NOT_FOUND' });
    }

    const result = await websiteCommercialService.acceptProposal(proposalId);
    res.json(result);
  } catch (e: any) {
    const message = e?.message || 'Erro ao aceitar proposta';
    const status = message.startsWith('WEBSITE_') || message.startsWith('DEMO_') || message.startsWith('LEAD_') ? 400 : 500;
    res.status(status).json({ error: message });
  }
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