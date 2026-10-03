import { prisma } from '../../modules/mercadoLivre/lib/prisma';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// Voice ID padrão (Adam - profissional e natural). Pode ser alterado no .env
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB';
const API_KEY = process.env.ELEVENLABS_API_KEY;

export interface AudioGenerationResult {
  success: boolean;
  audioUrl?: string;
  error?: string;
}

export const generateElevenLabsAudio = async (
  creativeId: string
): Promise<AudioGenerationResult> => {
  if (!API_KEY || API_KEY === 'sua_chave_elevenlabs_aqui') {
    return { success: false, error: 'ELEVENLABS_API_KEY não configurada no .env' };
  }

  try {
    // 1. Buscar o criativo e o roteiro
    const creative = await prisma.affiliateCreative.findUnique({
      where: { id: creativeId },
      include: { produto: true }
    });

    if (!creative) {
      return { success: false, error: 'Criativo não encontrado' };
    }

    // Extrair o roteiro do campo de conteúdo relacionado ou do prompt
    // Vamos buscar a copy associada para pegar o roteiro exato
    const copy = await prisma.affiliateCopy.findFirst({
      where: { produtoId: creative.produtoId }
    });

    let scriptText = creative.promptUsado; // Fallback
    if (copy && copy.conteudo) {
      try {
        const contentObj = JSON.parse(copy.conteudo);
        scriptText = contentObj.roteiroVoz || scriptText;
      } catch (e) {
        // Se não for JSON válido, usa o texto direto
        scriptText = copy.conteudo;
      }
    }

    // Remover marcações de direção que a ElevenLabs não entende (ex: [pausa curta])
    // A ElevenLabs V2 entende pontuação natural, então limpamos os colchetes
    const cleanScript = scriptText.replace(/\[.*?\]/g, '').trim();

    console.log('[ElevenLabs] Gerando áudio para o criativo: ' + creativeId);

    // 2. Chamar a API da ElevenLabs
    const response = await axios.post(
      'https://api.elevenlabs.io/v1/text-to-speech/' + DEFAULT_VOICE_ID,
      {
        text: cleanScript,
        model_id: 'eleven_multilingual_v2', // Melhor modelo para português
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      },
      {
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': API_KEY
        },
        responseType: 'arraybuffer'
      }
    );

    // 3. Salvar o arquivo de áudio
    const audioDir = path.join(process.cwd(), 'public', 'audios');
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    const fileName = 'audio_' + creativeId + '_' + Date.now() + '.mp3';
    const filePath = path.join(audioDir, fileName);
    
    fs.writeFileSync(filePath, response.data);

    // 4. Atualizar o registro no banco de dados com a URL do áudio
    const audioUrl = '/audios/' + fileName;
    await prisma.affiliateCreative.update({
      where: { id: creativeId },
      data: { 
        url: audioUrl,
        tipo: 'video_with_audio' // Atualiza o tipo para indicar que tem áudio
      }
    });

    console.log('[ElevenLabs] Áudio gerado com sucesso: ' + audioUrl);
    return { success: true, audioUrl };

  } catch (error: any) {
    console.error('[ElevenLabs Error]', error.message);
    return { 
      success: false, 
      error: error.response?.data?.detail?.message || error.message || 'Erro desconhecido na ElevenLabs' 
    };
  }
};