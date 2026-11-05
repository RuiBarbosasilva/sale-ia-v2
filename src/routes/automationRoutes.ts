import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { campaignQueue, followUpQueue } from '../config/queue';

import { adminAuthorization } from '../middlewares/security';
const router = Router();
router.use(adminAuthorization);
const prisma = new PrismaClient();

// Listar todas as campanhas com estatísticas
router.get('/campaigns', async (req: Request, res: Response) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { leads: true, messages: true }
        }
      }
    });
    return res.json({ success: true, campaigns });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Obter estatísticas da fila de jobs (BullMQ)
router.get('/queue-stats', async (req: Request, res: Response) => {
  try {
    const campaignJobs = await campaignQueue.getJobCounts();
    const followUpJobs = await followUpQueue.getJobCounts();
    
    return res.json({
      success: true,
      queues: {
        campaign: campaignJobs,
        followUp: followUpJobs
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Iniciar uma campanha (adiciona jobs na fila)
router.post('/campaigns/:id/start', async (req: Request, res: Response) => {
  try {
    const campaign = await prisma.campaign.update({
      where: { id: req.params.id },
      data: { status: 'RUNNING' }
    });

    // Simulação: Adicionar jobs na fila para cada lead da campanha
    const campaignLeads = await prisma.campaignLead.findMany({
      where: { campaignId: req.params.id, status: 'PENDING' }
    });

    for (const cl of campaignLeads) {
      await campaignQueue.add('send-campaign-message', {
        campaignId: campaign.id,
        leadId: cl.leadId,
        channel: campaign.channel
      });
    }

    return res.json({ success: true, message: `Campanha iniciada. ${campaignLeads.length} jobs adicionados à fila.` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Pausar campanha
router.post('/campaigns/:id/pause', async (req: Request, res: Response) => {
  try {
    await prisma.campaign.update({
      where: { id: req.params.id },
      data: { status: 'PAUSED' }
    });
    // Nota: Em produção, aqui limparíamos os jobs pendentes da fila BullMQ
    return res.json({ success: true, message: 'Campanha pausada' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Logs recentes de automação (mensagens do sistema)
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const logs = await prisma.message.findMany({
      where: { sender: 'SYSTEM' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { lead: { select: { name: true, phone: true } } }
    });
    return res.json({ success: true, logs });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;