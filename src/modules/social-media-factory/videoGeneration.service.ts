import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface VideoGenerationParams {
  postId: string;
  scriptText: string;
  voiceId?: string;
}
export interface VideoGenerationResult {
  success: boolean;
  videoUrl?: string;
  error?: string;
}

export async function generateVideoForPost(params: VideoGenerationParams): Promise<VideoGenerationResult> {
  const safePostId = String(params.postId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
  const scriptText = String(params.scriptText || '').trim();
  if (!safePostId || scriptText.length < 20 || scriptText.length > 5000) {
    return { success: false, error: 'postId inválido ou roteiro fora do limite de 20 a 5000 caracteres.' };
  }
  const publicBase = String(process.env.PUBLIC_BASE_URL || '').trim();
  if (!publicBase) return { success: false, error: 'PUBLIC_BASE_URL HTTPS é obrigatória para gerar mídia publicável.' };
  let publicBaseUrl: URL;
  try {
    publicBaseUrl = new URL(publicBase);
    if (publicBaseUrl.protocol !== 'https:') throw new Error('HTTPS obrigatório.');
  } catch {
    return { success: false, error: 'PUBLIC_BASE_URL deve ser uma URL HTTPS válida.' };
  }
  const pythonScriptPath = path.join(process.cwd(), 'tools', 'generate_video.py');
  if (!fs.existsSync(pythonScriptPath)) return { success: false, error: 'Script tools/generate_video.py não encontrado na raiz do projeto.' };
  const outputDir = path.join(process.cwd(), 'public', 'videos');
  fs.mkdirSync(outputDir, { recursive: true });
  const outputFileName = `video_${safePostId}_${Date.now()}.mp4`;
  const outputPath = path.join(outputDir, outputFileName);
  const videoUrl = new URL('/videos/' + outputFileName, publicBaseUrl).toString();

  return new Promise(resolve => {
    const child = spawn(process.env.PYTHON_PATH || 'python', [pythonScriptPath, '--text', scriptText, '--output', outputPath, '--voice-id', String(params.voiceId || '21m00Tcm4TlvDq8ikWAM').slice(0, 120)], {
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });
    let stderr = '';
    let settled = false;
    const finish = (result: VideoGenerationResult) => { if (!settled) { settled = true; resolve(result); } };
    child.stderr.on('data', data => { stderr = (stderr + data.toString()).slice(-2000); });
    child.on('error', error => finish({ success: false, error: `Não foi possível iniciar Python: ${error.message}` }));
    child.on('close', async code => {
      if (code !== 0 || !fs.existsSync(outputPath)) {
        finish({ success: false, error: `Geração de vídeo falhou (código ${code}). ${stderr}`.slice(0, 2200) });
        return;
      }
      try {
        await prisma.socialPost.update({ where: { id: safePostId }, data: { mediaUrls: JSON.stringify([videoUrl]) } });
        finish({ success: true, videoUrl });
      } catch (error: any) {
        finish({ success: false, error: `Vídeo criado, mas não foi possível vinculá-lo ao post: ${String(error?.message || error).slice(0, 500)}` });
      }
    });
  });
}
