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
  const pythonScriptPath = path.join(__dirname, '../../../tools/generate_video.py');
  const outputDir = path.join(__dirname, '../../../public/videos');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputFileName = `video_${params.postId}_${Date.now()}.mp4`;
  const outputPath = path.join(outputDir, outputFileName);

  return new Promise((resolve) => {
    console.log(`[VideoEngine] Iniciando geração para o post: ${params.postId}`);
    
    const pythonProcess = spawn('python', [
      pythonScriptPath,
      '--text', params.scriptText,
      '--output', outputPath,
      '--voice-id', params.voiceId || '21m00Tcm4TlvDq8ikWAM'
    ], {
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    let stderrData = '';

    pythonProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    pythonProcess.on('close', async (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        try {
          // Atualiza o registro no banco de dados
          await prisma.socialPost.update({
            where: { id: params.postId },
            data: { 
              mediaUrls: `/videos/${outputFileName}`,
              status: 'READY'
            }
          });
          console.log(`[VideoEngine] Sucesso! Vídeo salvo e banco atualizado.`);
          resolve({ success: true, videoUrl: `/videos/${outputFileName}` });
        } catch (dbError: any) {
          resolve({ success: false, error: `Falha ao atualizar banco: ${dbError.message}` });
        }
      } else {
        console.error(`[VideoEngine] Falha na geração. Código: ${code}. Erro: ${stderrData}`);
        resolve({ success: false, error: `Script Python falhou (código ${code}). Detalhes: ${stderrData}` });
      }
    });
  });
}
