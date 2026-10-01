import { Router } from 'express';
import { generateContent, generateContentBatch, generateAudio } from '../controllers/contentGenerator.controller';

const router = Router();

// Gera conteúdo para um produto específico
router.post('/gerar-conteudo/:productId', generateContent);

// Gera conteúdo em lote para todos os produtos ativos
router.post('/gerar-conteudo/lote', generateContentBatch);

// Gera áudio ElevenLabs para um criativo específico
router.post('/gerar-audio/:creativeId', generateAudio);

export default router;