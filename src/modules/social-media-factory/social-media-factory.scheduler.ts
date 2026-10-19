import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';
import { publishQueuedSocialPost, refreshProcessingSocialPosts } from './social-media-factory.service';

const prisma = new PrismaClient();
let started = false;

export function startSocialMediaFactoryScheduler() {
  if (started) return;
  started = true;
  cron.schedule('* * * * *', async () => {
    try {
      const duePosts = await prisma.socialPost.findMany({
        where: { status: 'SCHEDULED', scheduledFor: { lte: new Date() } },
        orderBy: { scheduledFor: 'asc' },
        take: 25
      });
      for (const post of duePosts) {
        await publishQueuedSocialPost(post.id);
      }
      await refreshProcessingSocialPosts(25);
    } catch (error: any) {
      console.error('[SOCIAL MEDIA FACTORY] scheduler error:', error?.message || error);
    }
  }, { timezone: process.env.SOCIAL_MEDIA_FACTORY_TIMEZONE || 'America/Sao_Paulo' });
  console.log('[SOCIAL MEDIA FACTORY] Scheduler iniciado; posts vencidos serão enviados pelos adaptadores autorizados e cada resultado será registrado.');
}
