
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
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

// Simular Job de Publicação (Verifica posts pendentes e "publica")
router.post('/run-job', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const pendingPosts = await prisma.scheduledPost.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: { lte: now }
      }
    });

    let publishedCount = 0;
    for (const post of pendingPosts) {
      // AQUI entraria a chamada real para a API do Instagram/Facebook
      console.log(`[PUBLICADO] Post para ${post.platform} agendado para ${post.scheduledFor}`);
      
      await prisma.scheduledPost.update({
        where: { id: post.id },
        data: { status: 'PUBLISHED', publishedAt: new Date() }
      });
      publishedCount++;
    }

    return res.json({ success: true, published: publishedCount });
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
