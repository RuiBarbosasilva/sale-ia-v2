import { adminAuthorization } from '../middlewares/security';
﻿import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
router.use(adminAuthorization);
const prisma = new PrismaClient();

router.post('/segments/query', async (req: Request, res: Response) => {
  try {
    const { status, segment, scoreMin, scoreMax } = req.body;
    const where: any = {};
    if (status) where.status = status;
    if (segment) where.segment = { contains: segment, mode: 'insensitive' };
    if (scoreMin !== undefined || scoreMax !== undefined) {
      where.score = {};
      if (scoreMin !== undefined) where.score.gte = scoreMin;
      if (scoreMax !== undefined) where.score.lte = scoreMax;
    }
    const leads = await prisma.lead.findMany({ where, take: 100 });
    return res.json({ success: true, count: leads.length, leads });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/segments/stats', async (req: Request, res: Response) => {
  try {
    const total = await prisma.lead.count();
    const byStatus = await prisma.lead.groupBy({ by: ['status'], _count: true });
    return res.json({ total, byStatus });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;