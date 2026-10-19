import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';

const prisma = new PrismaClient();
let started = false;
const platforms = ['INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'YOUTUBE', 'GOOGLE_BUSINESS', 'PINTEREST'];

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
        const message = `Publicação agendada atingiu o horário, mas ${post.platform} ainda exige configuração do adaptador OAuth/API oficial. Nenhum post foi enviado.`;
        const changed = await prisma.socialPost.updateMany({
          where: { id: post.id, status: 'SCHEDULED' },
          data: { status: 'INTEGRATION_REQUIRED', attempts: { increment: 1 }, lastError: message }
        });
        if (!changed.count) continue;
        await prisma.socialPublishLog.create({
          data: { postId: post.id, platform: post.platform, outcome: 'INTEGRATION_REQUIRED', message }
        });
      }
    } catch (error: any) {
      console.error('[SOCIAL MEDIA FACTORY] scheduler error:', error?.message || error);
    }
  }, { timezone: process.env.SOCIAL_MEDIA_FACTORY_TIMEZONE || 'America/Sao_Paulo' });
  console.log('[SOCIAL MEDIA FACTORY] Scheduler iniciado; posts sem integração oficial ficam registrados como pendentes de configuração.');
}
