import { Request, Response } from 'express';
import { AmazonExpertService } from './services/amazon-expert.service';
import { PDFGeneratorService } from './services/pdf-generator.service';
import { GeminiImageService } from './services/gemini-image.service';
import { AmazonUploadAssistant } from './services/amazon-upload.service';
import { SocialPublisherService } from './services/social-publisher.service';

const amazonExpert = new AmazonExpertService();
const pdfGenerator = new PDFGeneratorService();
const geminiImage = new GeminiImageService();
const amazonUpload = new AmazonUploadAssistant();
const socialPublisher = new SocialPublisherService();

export const analisarNichoAmazon = async (req: Request, res: Response) => {
  const nicho = typeof req.params.nicho === 'string' ? req.params.nicho.trim().slice(0,120) : '';
  if (!nicho || nicho.length > 120) return res.status(400).json({ sucesso: false, erro: 'Nicho invalido' });
  try {
    const resultado = await amazonExpert.analisarNicho(nicho);
    return res.json({ sucesso: true, dados: resultado });
  } catch (error: unknown) { console.error('[Factory Ebook] Amazon niche error:', error instanceof Error ? error.message : 'UNKNOWN_ERROR'); return res.status(500).json({ sucesso: false, erro: 'FACTORY_EBOOK_AMAZON_NICHE_FAILED' }); }
};

export const listarTendenciasAmazon = async (req: Request, res: Response) => {
  try {
    return res.json({ sucesso: true, dados: await amazonExpert.listarTendencias() });
  } catch (error: unknown) { console.error('[Factory Ebook] Trends error:', error instanceof Error ? error.message : 'UNKNOWN_ERROR'); return res.status(500).json({ sucesso: false, erro: 'FACTORY_EBOOK_TRENDS_FAILED' }); }
};

export const gerarLivroPDF = async (req: Request, res: Response) => {
  try {
    const config = req.body || {};
    if (typeof config !== 'object' || Array.isArray(config) || !String(config.titulo || '').trim() || !String(config.tema || '').trim()) return res.status(400).json({ sucesso: false, erro: 'Titulo e tema obrigatorios' });
    const resultado = await pdfGenerator.gerarLivroColorir(config);
    return res.json(resultado);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao gerar PDF';
    console.error('[Controller] Erro ao gerar PDF:', message);
    return res.status(500).json({ sucesso: false, erro: message });
  }
};

export const gerarLivroCompleto = async (req: Request, res: Response) => {
  try {
    const config = req.body || {};
    if (typeof config !== 'object' || Array.isArray(config) || !String(config.titulo || '').trim() || !String(config.tema || '').trim() || String(config.titulo).length > 200 || String(config.tema).length > 120) {
      return res.status(400).json({ sucesso: false, erro: 'Titulo e tema obrigatorios' });
    }

    const numeroPaginas = Math.max(1, Math.min(200, Number.isFinite(Number(config.numeroPaginas)) ? Number(config.numeroPaginas) : 10));
    const prompts = Array.isArray(config.promptsImagem) && config.promptsImagem.length
      ? config.promptsImagem
      : Array.from({ length: numeroPaginas }, (_, i) =>
          String(config.tema).trim().slice(0,120) + ', desenho original para colorir, página ' + (i + 1)
        );

    const imagens: Array<string | { filePath?: string }> = Array.isArray(config.imagens) ? [...config.imagens] : [];
    if (imagens.length < numeroPaginas) {
      for (let i = imagens.length; i < numeroPaginas; i++) {
        const generated = await geminiImage.gerarImagemUnica(
          String(prompts[i] || config.tema),
          'livro-' + Date.now().toString(36) + '-' + i + '-' + Math.random().toString(36).slice(2, 8)
        );
        if (!generated.sucesso) {
          return res.status(503).json({
            sucesso: false,
            etapa: 'imagem',
            pagina: i + 1,
            erro: generated.erro,
            promptsImagem: prompts
          });
        }
        imagens.push(generated);
      }
    }

    const resultado = await pdfGenerator.gerarLivroColorir({
      ...config,
      numeroPaginas,
      promptsImagem: prompts,
      imagens
    });
    return res.json({
      sucesso: Boolean(resultado?.sucesso),
      etapa: 'pdf',
      dados: resultado,
      imagensGeradas: imagens.length
    });
  } catch (error: unknown) {
    console.error('[Factory Ebook] Complete book error:', error instanceof Error ? error.message : 'UNKNOWN_ERROR');
    return res.status(500).json({ sucesso: false, erro: 'FACTORY_EBOOK_COMPLETE_FAILED' });
  }
};

export const gerarImagemComGemini = async (req: Request, res: Response) => {
  try {
    const { prompt, fileName } = req.body || {};
    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 2000 || typeof fileName !== 'string' || !fileName.trim() || fileName.length > 180) return res.status(400).json({ sucesso: false, erro: 'Prompt e fileName obrigatorios' });
    const resultado = await geminiImage.gerarImagemUnica(prompt, fileName);
    return res.json(resultado);
  } catch (error: unknown) { console.error('[Factory Ebook] Image error:', error instanceof Error ? error.message : 'UNKNOWN_ERROR'); return res.status(500).json({ sucesso: false, erro: 'FACTORY_EBOOK_IMAGE_FAILED' }); }
};

export const prepararUploadAmazon = async (req: Request, res: Response) => {
  try {
    const { metadataLivro } = req.body;
    if (!metadataLivro) return res.status(400).json({ sucesso: false, erro: 'Metadata do livro obrigatoria' });
    return res.json({ sucesso: true, dados: amazonUpload.gerarMetadadosKDP(metadataLivro) });
  } catch (error: unknown) { return res.status(500).json({ sucesso: false, erro: error instanceof Error ? error.message : 'Erro interno' }); }
};

export const gerarCalendarioSocial = async (req: Request, res: Response) => {
  try {
    const { metadataLivro } = req.body;
    if (!metadataLivro) return res.status(400).json({ sucesso: false, erro: 'Metadata do livro obrigatoria' });
    return res.json({ sucesso: true, dados: socialPublisher.gerarCalendario30Dias(metadataLivro) });
  } catch (error: unknown) { return res.status(500).json({ sucesso: false, erro: error instanceof Error ? error.message : 'Erro interno' }); }
};

export const listarLivrosGerados = async (req: Request, res: Response) => {
  try {
    return res.json({ sucesso: true, livros: await pdfGenerator.listarLivrosGerados() });
  } catch (error: unknown) { return res.status(500).json({ sucesso: false, erro: error instanceof Error ? error.message : 'Erro interno' }); }
};
