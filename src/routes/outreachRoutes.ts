import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { outreachService } from '../services/outreachService';

const router = Router();
const prisma = new PrismaClient();

router.post('/send', async (req: Request, res: Response) => {
  try {
    const { leadIds, creativeText, channel } = req.body;
    
    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'leadIds e obrigatorio e deve ser um array' });
    }
    if (!creativeText) {
      return res.status(400).json({ error: 'creativeText e obrigatorio' });
    }

    const validChannels = ['WHATSAPP', 'EMAIL', 'BOTH'];
    if (!validChannels.includes(channel)) {
      return res.status(400).json({ error: 'channel deve ser WHATSAPP, EMAIL ou BOTH' });
    }

    const results = await outreachService.sendCampaign(leadIds, creativeText, channel);
    
    return res.json({ success: true, results });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const total = await prisma.outreach.count();
    const sent = await prisma.outreach.count({ where: { status: 'SENT' } });
    const failed = await prisma.outreach.count({ where: { status: 'FAILED' } });
    
    return res.json({ success: true, stats: { total, sent, failed } });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;