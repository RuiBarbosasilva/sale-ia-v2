import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';
import { markStalePublishingPostsAsUnconfirmed, publishQueuedSocialPost, refreshProcessingSocialPosts } from './social-media-factory.service';
import { runDailySocialAutomation } from './social-media-factory.automation';

const prisma = new PrismaClient();
let started = false;

export function startSocialMediaFactoryScheduler() {
  if (started) return;
  started = true;
  cron.schedule('* * * * *', async () => {
    try {
      await runDailySocialAutomation();
      const duePosts = await prisma.socialPost.findMany({
        where: { status: 'SCHEDULED', scheduledFor: { lte: new Date() } },
        orderBy: { scheduledFor: 'asc' },
        take: 25
      });
      for (const post of duePosts) {
        await publishQueuedSocialPost(post.id);
      }
      await refreshProcessingSocialPosts(25);\n      const unconfirmed = await markStalePublishingPostsAsUnconfirmed(30, 100);\n      if (unconfirmed) console.warn('[SOCIAL MEDIA FACTORY] posts moved to DELIVERY_UNKNOWN; manual provider verification required:', unconfirmed);
    } catch (error: any) {
      console.error('[SOCIAL MEDIA FACTORY] scheduler error:', error?.message || error);
    }
  }, { timezone: process.env.SOCIAL_MEDIA_FACTORY_TIMEZONE || 'America/Sao_Paulo' });
  console.log('[SOCIAL MEDIA FACTORY] Scheduler iniciado; posts vencidos serão enviados pelos adaptadores autorizados e cada resultado será registrado.');
}
