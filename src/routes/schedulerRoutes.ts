
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

import { adminAuthorization } from '../middlewares/security';
const router = Router();
router.use(adminAuthorization);
const prisma = new PrismaClient();

// Agendar novo post
router.post('/', async (req: Request, res: Response) => {
  try {
    const { segmentId, platform, content, hashtags, scheduledFor } = req.body;
    const post = await prisma.scheduledPost.create({
      data: {
        segmentId,
        platform,
        content,
        hashtags,
        scheduledFor: new Date(scheduledFor)
      }
    });
    return res.json({ success: true, post });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Listar posts agendados
router.get('/', async (req: Request, res: Response) => {
  try {
    const posts = await prisma.scheduledPost.findMany({
      orderBy: { scheduledFor: 'asc' }
    });
    return res.json({ success: true, posts });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Dry-run explícito: sem integração de plataforma, nenhum post pode ser marcado como publicado.
router.post('/run-job', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const pendingPosts = await prisma.scheduledPost.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: { lte: now }
      },
      select: { id: true, platform: true, scheduledFor: true }
    });

    return res.json({
      success: true,
      mode: 'DRY_RUN',
      published: 0,
      simulated: pendingPosts.length,
      posts: pendingPosts.map(post => ({
        id: post.id,
        platform: post.platform,
        scheduledFor: post.scheduledFor,
        status: 'PENDING'
      })),
      message: 'Nenhuma publicação foi enviada. Configure e valide a integração oficial da plataforma antes de publicar.'
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Deletar post
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.scheduledPost.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
