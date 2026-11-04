import { PrismaClient } from '@prisma/client';
import { checkSocialPostProcessing, publishSocialPost } from './social-media-factory.publisher';

const prisma = new PrismaClient();

export async function publishQueuedSocialPost(postId: string) {
  const claimed = await prisma.socialPost.updateMany({
    where: { id: postId, status: { in: ['DRAFT', 'SCHEDULED', 'FAILED', 'INTEGRATION_REQUIRED'] } },
    data: { status: 'PUBLISHING', attempts: { increment: 1 }, lastError: null }
  });
  if (!claimed.count) {
    const current = await prisma.socialPost.findUnique({ where: { id: postId }, select: { status: true } });
    return { accepted: false, status: current?.status || 'NOT_FOUND' };
  }
  const post = await prisma.socialPost.findUnique({ where: { id: postId } });
  if (!post) return { accepted: false, status: 'NOT_FOUND' };
  await prisma.socialPublishLog.create({ data: { postId, platform: post.platform, outcome: 'STARTED', message: 'Tentativa de publicação iniciada.' } });
  try {
    const result = await publishSocialPost(postId);
    const updated = await prisma.socialPost.update({ where: { id: postId }, data: {
      status: result.status,
      externalPostId: result.externalPostId || null,
      publishedUrl: result.publishedUrl || null,
      publishedAt: result.status === 'PUBLISHED' ? new Date() : null,
      lastError: null
    } });
    await prisma.socialPublishLog.create({ data: { postId, platform: post.platform, outcome: result.status, message: result.message, response: JSON.stringify({ externalPostId: result.externalPostId || null, publishedUrl: result.publishedUrl || null }) } });
    return { accepted: true, status: updated.status, message: result.message };
  } catch (error: any) {
    const message = String(error?.message || 'Falha desconhecida na publicação.').slice(0, 500);
    const updated = await prisma.socialPost.update({ where: { id: postId }, data: { status: 'FAILED', lastError: message } });
    await prisma.socialPublishLog.create({ data: { postId, platform: post.platform, outcome: 'FAILED', message } });
    return { accepted: false, status: updated.status, error: message };
  }
}

export async function refreshProcessingSocialPosts(limit = 25) {
  const posts = await prisma.socialPost.findMany({ where: { status: 'PROCESSING', platform: 'TIKTOK', externalPostId: { not: null } }, orderBy: { updatedAt: 'asc' }, take: limit });
  for (const post of posts) {
    try {
      const status = await checkSocialPostProcessing(post.id);
      if (status === 'PROCESSING') continue;
      const message = status === 'PUBLISHED' ? 'TikTok confirmou a publicação.' : 'TikTok informou falha no processamento.';
      await prisma.socialPost.updateMany({ where: { id: post.id, status: 'PROCESSING' }, data: {
        status, publishedAt: status === 'PUBLISHED' ? new Date() : null, lastError: status === 'FAILED' ? message : null
      } });
      await prisma.socialPublishLog.create({ data: { postId: post.id, platform: post.platform, outcome: status, message } });
    } catch (error: any) {
      const message = String(error?.message || 'Não foi possível consultar o status do provedor.').slice(0, 400);
      await prisma.socialPublishLog.create({ data: { postId: post.id, platform: post.platform, outcome: 'STATUS_CHECK_FAILED', message } });
    }
  }
}

/**
 * Move abandoned publication attempts to a manual-review state.
 * Never retry automatically: the provider may have accepted the request before
 * the process stopped, so a retry could create a duplicate post.
 */
export async function markStalePublishingPostsAsUnconfirmed(
  staleAfterMinutes = 30,
  limit = 100
): Promise<number> {
  const safeMinutes = Number.isFinite(staleAfterMinutes)
    ? Math.min(24 * 60, Math.max(5, Math.floor(staleAfterMinutes)))
    : 30;
  const safeLimit = Number.isFinite(limit) ? Math.min(500, Math.max(1, Math.floor(limit))) : 100;
  const cutoff = new Date(Date.now() - safeMinutes * 60 * 1000);
  const stalePosts = await prisma.socialPost.findMany({
    where: { status: 'PUBLISHING', updatedAt: { lte: cutoff } },
    orderBy: { updatedAt: 'asc' },
    take: safeLimit,
    select: { id: true, platform: true }
  });
  let marked = 0;
  for (const post of stalePosts) {
    const result = await prisma.socialPost.updateMany({
      where: { id: post.id, status: 'PUBLISHING', updatedAt: { lte: cutoff } },
      data: {
        status: 'DELIVERY_UNKNOWN',
        lastError: 'A tentativa foi interrompida sem confirmação do provedor. Verifique a conta de destino antes de qualquer reenvio.'
      }
    });
    if (!result.count) continue;
    marked++;
    await prisma.socialPublishLog.create({
      data: {
        postId: post.id,
        platform: post.platform,
        outcome: 'DELIVERY_UNKNOWN',
        message: 'Tentativa antiga interrompida. Entrega não confirmada; reenvio automático bloqueado para evitar duplicidade.'
      }
    });
  }
  return marked;
}
