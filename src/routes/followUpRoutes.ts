import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { followUpService, responseDetectionService } from '../services/followUpService';
import { adminAuthorization } from '../middlewares/security';

const router = Router();
const prisma = new PrismaClient();

// Executar o Job de Follow-up (Simula o agendador diário)
router.post('/run-job', adminAuthorization, async (req: Request, res: Response) => {
  try {
    const result = await followUpService.executePendingFollowUps();
    return res.json({ success: true, message: 'Job de follow-up executado', result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Agendar follow-up manual para um lead
router.post('/schedule/:leadId', adminAuthorization, async (req: Request, res: Response) => {
  try {
    await followUpService.scheduleFollowUps(req.params.leadId);
    return res.json({ success: true, message: 'Follow-ups agendados para 3, 7 e 14 dias' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Testar detecção de resposta (IA simples por palavras-chave)
router.post('/analyze-response', adminAuthorization, async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Texto e obrigatorio' });
    
    const classification = responseDetectionService.classifyResponse(text);
    return res.json({ success: true, classification, text });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Estatísticas de Follow-up
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const pending = await prisma.followUp.count({ where: { status: 'PENDING' } });
    const sent = await prisma.followUp.count({ where: { status: 'SENT' } });
    const skipped = await prisma.followUp.count({ where: { status: 'SKIPPED' } });
    
    return res.json({ success: true, stats: { pending, sent, skipped } });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;