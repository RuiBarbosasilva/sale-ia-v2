import { PrismaClient, SocialWorkspace } from '@prisma/client';
import OpenAI from 'openai';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';

const prisma = new PrismaClient();
const PLATFORMS = ['INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'YOUTUBE', 'GOOGLE_BUSINESS', 'PINTEREST'] as const;
const DAILY_HOURS = [9, 12, 15, 18, 21];

function parseSettings(workspace: SocialWorkspace): Record<string, any> {
  try { return JSON.parse(workspace.settings || '{}'); } catch { return {}; }
}
function localDate(timeZone: string, date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}
function addLocalDays(date: string, days: number): string {
  const d = new Date(date + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function localDateTimeToUtc(date: string, hour: number, minute: number, timeZone: string): Date {
  const target = Date.parse(`${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`);
  let guess = target;
  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(guess));
    const get = (type: string) => Number(parts.find(p => p.type === type)?.value || 0);
    const displayedAsUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
    guess += target - displayedAsUtc;
  }
  return new Date(guess);
}
function slug(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}
function publicBaseUrl(): string | null {
  const value = process.env.PUBLIC_BASE_URL?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.origin : null;
  } catch { return null; }
}
async function generateImage(client: OpenAI, workspace: SocialWorkspace, theme: string, runDate: string, slot: number): Promise<{ imageUrl?: string; videoUrl?: string }> {
  if (String(process.env.SOCIAL_MEDIA_IMAGE_GENERATION_ENABLED).toLowerCase() !== 'true') return {};
  const base = publicBaseUrl();
  if (!base) return {};
  const prompt = `Create a polished social-media marketing photograph for a real business. Business: ${workspace.name}. Segment: ${workspace.niche || 'general business'}. Campaign/theme: ${theme}. Brand voice: ${parseSettings(workspace).brandVoice || 'professional, approachable, Brazilian Portuguese audience'}. Visual concept ${slot + 1} of 5. Premium commercial photography, realistic materials, clear subject, uncluttered composition, no words, no letters, no logos, no watermarks, square 1:1 composition. Do not invent product claims or include fake text.`;
  const imageResult: any = await client.images.generate({
    model: process.env.SOCIAL_MEDIA_IMAGE_MODEL || 'gpt-image-1',
    prompt,
    size: '1024x1024',
    output_format: 'png'
  } as any);
  const encoded = imageResult.data?.[0]?.b64_json;
  if (!encoded) throw new Error('O gerador de imagens não retornou uma imagem válida.');
  const folder = path.join(process.cwd(), 'storage', 'generated-images', 'social-media');
  await fs.mkdir(folder, { recursive: true });
  const stem = `${slug(workspace.id)}-${runDate}-${slot + 1}`;
  const imageName = stem + '.png';
  await fs.writeFile(path.join(folder, imageName), Buffer.from(encoded, 'base64'));
  const imageUrl = new URL('/generated-images/social-media/' + imageName, base).toString();
  let videoUrl: string | undefined;
  if (String(process.env.SOCIAL_MEDIA_VIDEO_GENERATION_ENABLED).toLowerCase() === 'true') {
    const videoName = stem + '.mp4';
    const args = ['-y', '-loop', '1', '-i', path.join(folder, imageName), '-t', '8', '-vf', "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,zoompan=z='min(zoom+0.0008,1.08)':d=240:s=1280x720:fps=30,format=yuv420p", '-r', '30', '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-movflags', '+faststart', path.join(folder, videoName)];
    await new Promise<void>((resolve, reject) => execFile(process.env.FFMPEG_PATH || 'ffmpeg', args, { timeout: 120000, maxBuffer: 1024 * 1024 }, error => error ? reject(error) : resolve()));
    videoUrl = new URL('/generated-images/social-media/' + videoName, base).toString();
  }
  return { imageUrl, videoUrl };
}
async function claimRun(workspaceId: string, runDate: string): Promise<boolean> {
  try {
    await prisma.socialAutomationRun.create({ data: { workspaceId, runDate, status: 'RUNNING' } });
    return true;
  } catch {
    const existing = await prisma.socialAutomationRun.findUnique({ where: { workspaceId_runDate: { workspaceId, runDate } } });
    if (!existing || existing.status === 'COMPLETED' || (existing.status === 'RUNNING' && Date.now() - existing.startedAt.getTime() < 30 * 60 * 1000)) return false;
    const updated = await prisma.socialAutomationRun.updateMany({ where: { id: existing.id, status: { in: ['FAILED', 'RUNNING'] }, startedAt: existing.startedAt }, data: { status: 'RUNNING', startedAt: new Date(), finishedAt: null, error: null } });
    return updated.count > 0;
  }
}
function scheduleFor(runDate: string, slot: number, platformIndex: number, timeZone: string): Date {
  const hour = DAILY_HOURS[slot];
  const minute = platformIndex * 5;
  const now = new Date();
  let target = localDateTimeToUtc(runDate, hour, minute, timeZone);
  if (target.getTime() < now.getTime() + 5 * 60 * 1000) target = localDateTimeToUtc(addLocalDays(runDate, 1), hour, minute, timeZone);
  return target;
}

export async function generateDailySocialContent(workspaceId: string): Promise<{ skipped?: boolean; created?: number; error?: string }> {
  const workspace = await prisma.socialWorkspace.findUnique({ where: { id: workspaceId } });
  if (!workspace || !workspace.active) return { skipped: true };
  const settings = parseSettings(workspace);
  if (settings.autoGenerateEnabled !== true) return { skipped: true };
  const runDate = localDate(workspace.timezone || 'America/Sao_Paulo');
  const claimed = await claimRun(workspace.id, runDate);
  if (!claimed) return { skipped: true };
  try {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY não está configurada.');
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const theme = String(settings.contentTheme || workspace.niche || workspace.name).slice(0, 300);
    const assigned = Array.from({ length: 5 }, (_, slot) => PLATFORMS.map((platform, platformIndex) => ({ slot, platformIndex, platform }))).flat();
    const response = await client.chat.completions.create({
      model: process.env.SOCIAL_MEDIA_AI_MODEL || 'gpt-4.1-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Você é diretor editorial e social media sênior brasileiro. Gere exatamente 30 conteúdos originais, em português brasileiro, 5 para cada uma das seis redes. Retorne somente JSON {"posts":[{"platform":"...","slot":0,"title":"...","caption":"...","hashtags":["..."]}]}. Siga rigorosamente a lista de tarefas e a ordem recebidas; mantenha o platform e slot indicados em cada tarefa. Cada legenda deve ser própria da rede, útil e natural, sem afirmações factuais inventadas, sem alegações enganosas, com CTA discreto e no máximo 5 hashtags. Instagram: legenda visual e curta; Facebook: conversacional; TikTok: gancho breve; YouTube: título claro e descrição; Google Business: local e objetivo; Pinterest: descrição pesquisável. Não inclua URLs inventadas.' },
        { role: 'user', content: JSON.stringify({ empresa: workspace.name, segmento: workspace.niche, campanha: theme, tomDeVoz: settings.brandVoice || 'profissional, humano e confiável', dataLocal: runDate, tarefas: assigned.map(x => ({ platform: x.platform, slot: x.slot, horaLocal: DAILY_HOURS[x.slot], objetivo: 'criar um conteúdo único para este canal e horário' })), instrucoes: String(settings.contentInstructions || '').slice(0, 2000) }) }
      ]
    });
    let generated: any;
    try { generated = JSON.parse(response.choices[0]?.message?.content || '{}'); } catch { throw new Error('A IA retornou conteúdo em formato inválido.'); }
    if (!Array.isArray(generated.posts) || generated.posts.length !== 30) throw new Error('A IA não retornou exatamente 30 conteúdos; lote diário cancelado para evitar calendário incompleto.');
    const normalized = generated.posts.map((item: any, index: number) => ({ ...item, ...assigned[index] }));
    const images: Array<{ imageUrl?: string; videoUrl?: string }> = [];
    for (let slot = 0; slot < 5; slot++) {
      try { images[slot] = await generateImage(client, workspace, theme, runDate, slot); }
      catch (error: any) {
        images[slot] = {};
        console.error('[SOCIAL MEDIA FACTORY] image generation failed:', String(error?.message || error).slice(0, 250));
      }
    }
    let created = 0;
    for (let index = 0; index < normalized.length; index++) {
      const item = normalized[index];
      const slot = item.slot as number;
      const platform = item.platform as typeof PLATFORMS[number];
      const caption = String(item.caption || '').trim();
      if (!caption) continue;
      const imageUrl = images[slot]?.imageUrl;
      const videoUrl = images[slot]?.videoUrl;
      let mediaUrls: string[] = [];
      let contentType = 'TEXT';
      if (platform === 'YOUTUBE' && videoUrl) { mediaUrls = [videoUrl]; contentType = 'VIDEO'; }
      else if (imageUrl) { mediaUrls = [imageUrl]; contentType = 'IMAGE'; }
      const tiktokNeedsConsent = platform === 'TIKTOK';
      const canSchedule = settings.autoPublishEnabled === true && !tiktokNeedsConsent &&
        (platform === 'FACEBOOK' || platform === 'GOOGLE_BUSINESS' || (mediaUrls.length > 0 && ['INSTAGRAM', 'PINTEREST'].includes(platform)) || (platform === 'YOUTUBE' && Boolean(videoUrl)));
      const scheduledFor = canSchedule ? scheduleFor(runDate, slot, item.platformIndex, workspace.timezone || 'America/Sao_Paulo') : null;
      const status = canSchedule ? 'SCHEDULED' : 'DRAFT';
      await prisma.socialPost.create({ data: {
        workspaceId: workspace.id, platform, title: item.title ? String(item.title).slice(0, 200) : null,
        caption: caption.slice(0, 5000), hashtags: Array.isArray(item.hashtags) ? item.hashtags.map(String).join(' ') : null,
        contentType, mediaUrls: mediaUrls.length ? JSON.stringify(mediaUrls) : null,
        status, scheduledFor,
        metadata: JSON.stringify({ autoGenerated: true, runDate, slot, requiresManualConsent: tiktokNeedsConsent, mediaGenerated: Boolean(imageUrl), videoGenerated: Boolean(videoUrl) })
      } });
      created++;
    }
    await prisma.socialAutomationRun.update({ where: { workspaceId_runDate: { workspaceId: workspace.id, runDate } }, data: { status: 'COMPLETED', finishedAt: new Date(), postCount: created, error: null } });
    return { created };
  } catch (error: any) {
    const message = String(error?.message || 'Falha na geração diária.').slice(0, 500);
    await prisma.socialAutomationRun.update({ where: { workspaceId_runDate: { workspaceId: workspace.id, runDate } }, data: { status: 'FAILED', finishedAt: new Date(), error: message } }).catch(() => undefined);
    return { error: message };
  }
}

export async function runDailySocialAutomation() {
  const workspaces = await prisma.socialWorkspace.findMany({ where: { active: true }, select: { id: true, timezone: true, settings: true } });
  const now = new Date();
  for (const workspace of workspaces) {
    const settings = parseSettings(workspace as SocialWorkspace);
    if (settings.autoGenerateEnabled !== true) continue;
    const localHour = Number(new Intl.DateTimeFormat('en-US', { timeZone: workspace.timezone || 'America/Sao_Paulo', hour: '2-digit', hourCycle: 'h23' }).format(now));
    if (localHour < 6) continue;
    const result = await generateDailySocialContent(workspace.id);
    if (result.error) console.error('[SOCIAL MEDIA FACTORY] daily generation failed:', workspace.id, result.error);
  }
}
