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
  try {
    const resultado = await amazonExpert.analisarNicho(req.params.nicho);
    return res.json({ sucesso: true, dados: resultado });
  } catch (error: any) { return res.status(500).json({ sucesso: false, erro: error.message }); }
};

export const listarTendenciasAmazon = async (req: Request, res: Response) => {
  try {
    return res.json({ sucesso: true, dados: await amazonExpert.listarTendencias() });
  } catch (error: any) { return res.status(500).json({ sucesso: false, erro: error.message }); }
};

export const gerarLivroPDF = async (req: Request, res: Response) => {
  try {
    const config = req.body;
    if (!config.titulo || !config.tema) return res.status(400).json({ sucesso: false, erro: 'Titulo e tema obrigatorios' });
    const resultado = await pdfGenerator.gerarLivroColorir(config);
    return res.json(resultado);
  } catch (error: any) { 
    console.error('[Controller] Erro ao gerar PDF:', error);
    return res.status(500).json({ sucesso: false, erro: error.message }); 
  }
};

export const gerarLivroCompleto = async (req: Request, res: Response) => {
  try {
    const config = req.body || {};
    if (!String(config.titulo || '').trim() || !String(config.tema || '').trim()) {
      return res.status(400).json({ sucesso: false, erro: 'Titulo e tema obrigatorios' });
    }

    const numeroPaginas = Math.max(1, Math.min(200, Number(config.numeroPaginas) || 10));
    const prompts = Array.isArray(config.promptsImagem) && config.promptsImagem.length
      ? config.promptsImagem
      : Array.from({ length: numeroPaginas }, (_, i) =>
          String(config.tema) + ', desenho original para colorir, página ' + (i + 1)
        );

    const imagens: any[] = Array.isArray(config.imagens) ? [...config.imagens] : [];
    if (imagens.length < numeroPaginas) {
      for (let i = imagens.length; i < numeroPaginas; i++) {
        const generated = await geminiImage.gerarImagemUnica(
          String(prompts[i] || config.tema),
          'livro-' + Date.now() + '-' + (i + 1)
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
  } catch (error: any) {
    return res.status(500).json({ sucesso: false, erro: error?.message || 'Erro ao gerar livro completo' });
  }
};

export const gerarImagemComGemini = async (req: Request, res: Response) => {
  try {
    const { prompt, fileName } = req.body;
    if (!prompt || !fileName) return res.status(400).json({ sucesso: false, erro: 'Prompt e fileName obrigatorios' });
    const resultado = await geminiImage.gerarImagemUnica(prompt, fileName);
    return res.json(resultado);
  } catch (error: any) { return res.status(500).json({ sucesso: false, erro: error.message }); }
};

export const prepararUploadAmazon = async (req: Request, res: Response) => {
  try {
    const { metadataLivro } = req.body;
    if (!metadataLivro) return res.status(400).json({ sucesso: false, erro: 'Metadata do livro obrigatoria' });
    return res.json({ sucesso: true, dados: amazonUpload.gerarMetadadosKDP(metadataLivro) });
  } catch (error: any) { return res.status(500).json({ sucesso: false, erro: error.message }); }
};

export const gerarCalendarioSocial = async (req: Request, res: Response) => {
  try {
    const { metadataLivro } = req.body;
    if (!metadataLivro) return res.status(400).json({ sucesso: false, erro: 'Metadata do livro obrigatoria' });
    return res.json({ sucesso: true, dados: socialPublisher.gerarCalendario30Dias(metadataLivro) });
  } catch (error: any) { return res.status(500).json({ sucesso: false, erro: error.message }); }
};

export const listarLivrosGerados = async (req: Request, res: Response) => {
  try {
    return res.json({ sucesso: true, livros: await pdfGenerator.listarLivrosGerados() });
  } catch (error: any) { return res.status(500).json({ sucesso: false, erro: error.message }); }
};
