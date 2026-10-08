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

const text = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

export const analisarNichoAmazon = async (req: Request, res: Response) => {
  const nicho = text(req.params.nicho, 120);
  if (!nicho) return res.status(400).json({ sucesso: false, erro: 'Nicho invalido' });
  try {
    return res.json({ sucesso: true, dados: await amazonExpert.analisarNicho(nicho) });
  } catch (error: unknown) {
    console.error('[Factory Ebook] Amazon niche error:', error instanceof Error ? error.message : 'UNKNOWN_ERROR');
    return res.status(500).json({ sucesso: false, erro: 'FACTORY_EBOOK_AMAZON_NICHE_FAILED' });
  }
};

export const listarTendenciasAmazon = async (_req: Request, res: Response) => {
  try {
    return res.json({ sucesso: true, dados: await amazonExpert.listarTendencias() });
  } catch (error: unknown) {
    console.error('[Factory Ebook] Trends error:', error instanceof Error ? error.message : 'UNKNOWN_ERROR');
    return res.status(500).json({ sucesso: false, erro: 'FACTORY_EBOOK_TRENDS_FAILED' });
  }
};

export const gerarLivroPDF = async (req: Request, res: Response) => {
  try {
    const config = req.body;
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      return res.status(400).json({ sucesso: false, erro: 'Configuracao invalida' });
    }
    const titulo = text((config as any).titulo, 200);
    const tema = text((config as any).tema, 120);
    if (!titulo || !tema) return res.status(400).json({ sucesso: false, erro: 'Titulo e tema obrigatorios' });
    return res.json(await pdfGenerator.gerarLivroColorir({ ...(config as any), titulo, tema }));
  } catch (error: unknown) {
    console.error('[Factory Ebook] PDF error:', error instanceof Error ? error.message : 'UNKNOWN_ERROR');
    return res.status(500).json({ sucesso: false, erro: 'FACTORY_EBOOK_PDF_FAILED' });
  }
};

export const gerarLivroCompleto = async (req: Request, res: Response) => {
  try {
    const config = req.body;
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      return res.status(400).json({ sucesso: false, erro: 'Configuracao invalida' });
    }

    const titulo = text((config as any).titulo, 200);
    const tema = text((config as any).tema, 120);
    if (!titulo || !tema) return res.status(400).json({ sucesso: false, erro: 'Titulo e tema obrigatorios' });

    const rawPages = Number((config as any).numeroPaginas);
    const numeroPaginas = Math.max(1, Math.min(200, Number.isFinite(rawPages) ? Math.floor(rawPages) : 10));
    const promptsInput = Array.isArray((config as any).promptsImagem) ? (config as any).promptsImagem : [];
    const prompts = Array.from({ length: numeroPaginas }, (_, i) => {
      const supplied = text(promptsInput[i], 2000);
      return supplied || `${tema}, desenho original para colorir, página ${i + 1}`;
    });

    const imagens: Array<string | { filePath?: string }> = Array.isArray((config as any).imagens)
      ? (config as any).imagens.slice(0, numeroPaginas)
      : [];

    if (imagens.length < numeroPaginas) {
      for (let i = imagens.length; i < numeroPaginas; i++) {
        const generated = await geminiImage.gerarImagemUnica(
          prompts[i],
          `livro-${Date.now().toString(36)}-${i}-${Math.random().toString(36).slice(2, 8)}`
        );
        if (!generated.sucesso) {
          return res.status(503).json({
            sucesso: false,
            etapa: 'imagem',
            pagina: i + 1,
            erro: 'FACTORY_EBOOK_IMAGE_GENERATION_FAILED',
            promptsImagem: prompts
          });
        }
        imagens.push(generated);
      }
    }

    const resultado = await pdfGenerator.gerarLivroColorir({
      ...(config as any),
      titulo,
      tema,
      numeroPaginas,
      promptsImagem: prompts,
      imagens
    });
    return res.json({ sucesso: Boolean((resultado as any)?.sucesso), etapa: 'pdf', dados: resultado, imagensGeradas: imagens.length });
  } catch (error: unknown) {
    console.error('[Factory Ebook] Complete book error:', error instanceof Error ? error.message : 'UNKNOWN_ERROR');
    return res.status(500).json({ sucesso: false, erro: 'FACTORY_EBOOK_COMPLETE_FAILED' });
  }
};

export const gerarImagemComGemini = async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ sucesso: false, erro: 'Configuracao invalida' });
    }
    const prompt = text((body as any).prompt, 2000);
    const fileName = text((body as any).fileName, 180);
    if (!prompt || !fileName) return res.status(400).json({ sucesso: false, erro: 'Prompt e fileName obrigatorios' });
    return res.json(await geminiImage.gerarImagemUnica(prompt, fileName));
  } catch (error: unknown) {
    console.error('[Factory Ebook] Image error:', error instanceof Error ? error.message : 'UNKNOWN_ERROR');
    return res.status(500).json({ sucesso: false, erro: 'FACTORY_EBOOK_IMAGE_FAILED' });
  }
};

export const prepararUploadAmazon = async (req: Request, res: Response) => {
  try {
    const metadataLivro = req.body?.metadataLivro;
    if (!metadataLivro || typeof metadataLivro !== 'object' || Array.isArray(metadataLivro)) {
      return res.status(400).json({ sucesso: false, erro: 'Metadata do livro obrigatoria' });
    }
    return res.json({ sucesso: true, dados: amazonUpload.gerarMetadadosKDP(metadataLivro) });
  } catch (error: unknown) {
    console.error('[Factory Ebook] Amazon upload error:', error instanceof Error ? error.message : 'UNKNOWN_ERROR');
    return res.status(500).json({ sucesso: false, erro: 'FACTORY_EBOOK_AMAZON_UPLOAD_FAILED' });
  }
};

export const gerarCalendarioSocial = async (req: Request, res: Response) => {
  try {
    const metadataLivro = req.body?.metadataLivro;
    if (!metadataLivro || typeof metadataLivro !== 'object' || Array.isArray(metadataLivro)) {
      return res.status(400).json({ sucesso: false, erro: 'Metadata do livro obrigatoria' });
    }
    return res.json({ sucesso: true, dados: socialPublisher.gerarCalendario30Dias(metadataLivro) });
  } catch (error: unknown) {
    console.error('[Factory Ebook] Social calendar error:', error instanceof Error ? error.message : 'UNKNOWN_ERROR');
    return res.status(500).json({ sucesso: false, erro: 'FACTORY_EBOOK_SOCIAL_FAILED' });
  }
};

export const listarLivrosGerados = async (_req: Request, res: Response) => {
  try {
    return res.json({ sucesso: true, livros: await pdfGenerator.listarLivrosGerados() });
  } catch (error: unknown) {
    console.error('[Factory Ebook] List books error:', error instanceof Error ? error.message : 'UNKNOWN_ERROR');
    return res.status(500).json({ sucesso: false, erro: 'FACTORY_EBOOK_LIST_FAILED' });
  }
};
