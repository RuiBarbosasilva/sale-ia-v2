import { Request, Response } from 'express';
import { generateElevenLabsAudio } from '../../../services/contentFactory/elevenLabsAudio.service';
import { generateAffiliateContent, generateContentForAllActiveProducts } from '../../../services/contentFactory/affiliateContentGenerator.service';

/**
 * POST /api/afiliados/gerar-conteudo/:productId
 * Gera conteúdo de IA para um produto específico
 */
export const generateContent = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({ error: 'ID do produto é obrigatório' });
    }

    console.log('[Content Generator] Iniciando geração para produto:', productId);
    
    const result = await generateAffiliateContent(productId);

    return res.status(200).json({
      message: 'Conteúdo gerado com sucesso',
      data: result
    });

  } catch (error) {
    console.error('[Content Generator Error]', error);
    
    if (error instanceof Error) {
      if (error.message.includes('não encontrado')) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('OPENAI_API_KEY')) {
        return res.status(500).json({ error: 'Chave da OpenAI não configurada no .env' });
      }
    }

    return res.status(500).json({
      error: 'Erro ao gerar conteúdo',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * POST /api/afiliados/gerar-conteudo/lote
 * Gera conteúdo para todos os produtos ativos sem conteúdo
 */
export const generateContentBatch = async (req: Request, res: Response) => {
  try {
    console.log('[Content Generator] Iniciando geração em lote...');
    
    const results = await generateContentForAllActiveProducts();

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return res.status(200).json({
      message: 'Geração em lote concluída',
      summary: {
        total: results.length,
        success: successCount,
        failed: failCount
      },
      results
    });

  } catch (error) {
    console.error('[Content Generator Batch Error]', error);
    return res.status(500).json({
      error: 'Erro ao gerar conteúdo em lote',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * POST /api/afiliados/conteudo/gerar-audio/:creativeId
 * Gera áudio real via ElevenLabs para um criativo existente
 */
export const generateAudio = async (req: Request, res: Response) => {
  try {
    const { creativeId } = req.params;

    if (!creativeId) {
      return res.status(400).json({ error: 'ID do criativo é obrigatório' });
    }

    console.log('[Audio Generator] Iniciando geração de áudio para:', creativeId);
    
    const result = await generateElevenLabsAudio(creativeId);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    return res.status(200).json({
      message: 'Áudio gerado com sucesso',
      data: { audioUrl: result.audioUrl }
    });

  } catch (error) {
    console.error('[Audio Generator Error]', error);
    return res.status(500).json({
      error: 'Erro ao gerar áudio',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};