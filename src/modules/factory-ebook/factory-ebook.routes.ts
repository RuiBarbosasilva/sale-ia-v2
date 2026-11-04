import { Router } from 'express';
import { adminAuthorization } from '../../middlewares/security';
import {
  analisarNichoAmazon, listarTendenciasAmazon, gerarLivroPDF, gerarLivroCompleto,
  gerarImagemComGemini, prepararUploadAmazon, gerarCalendarioSocial, listarLivrosGerados
} from './factory-ebook.controller';

export const factoryEbookRoutes = Router();
factoryEbookRoutes.use(adminAuthorization);
factoryEbookRoutes.get('/amazon/nicho/:nicho', analisarNichoAmazon);
factoryEbookRoutes.get('/amazon/tendencias', listarTendenciasAmazon);
factoryEbookRoutes.post('/livro/gerar', gerarLivroPDF);
factoryEbookRoutes.post('/livro/gerar-completo', gerarLivroCompleto);
factoryEbookRoutes.post('/ia/gerar-imagem', gerarImagemComGemini);
factoryEbookRoutes.post('/amazon/preparar-upload', prepararUploadAmazon);
factoryEbookRoutes.post('/social/calendario', gerarCalendarioSocial);
factoryEbookRoutes.get('/livro/listar', listarLivrosGerados);
