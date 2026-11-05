import { adminAuthorization } from '../middlewares/security';
﻿import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
router.use(adminAuthorization);
const prisma = new PrismaClient();

router.post('/campaigns', async (req: Request, res: Response) => {
  try {
    const { name, type, channel, dailyLimit, frequencyLimit } = req.body;
    const campaign = await prisma.campaign.create({
      data: { name, type, channel, dailyLimit: dailyLimit || 100, frequencyLimit: frequencyLimit || 1, status: 'DRAFT' }
    });
    return res.json({ success: true, campaign });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/campaigns/:id/leads', async (req: Request, res: Response) => {
  try {
    const { leadIds } = req.body;
    const results = [];
    for (const leadId of leadIds) {
      try {
        await prisma.campaignLead.create({ data: { campaignId: req.params.id, leadId, status: 'PENDING' } });
        results.push({ leadId, status: 'added' });
      } catch (e: any) {
        results.push({ leadId, status: 'error', error: e.message });
      }
    }
    return res.json({ success: true, results });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/campaigns/:id/start', async (req: Request, res: Response) => {
  try {
    const campaign = await prisma.campaign.update({ where: { id: req.params.id }, data: { status: 'RUNNING' } });
    return res.json({ success: true, campaign });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;