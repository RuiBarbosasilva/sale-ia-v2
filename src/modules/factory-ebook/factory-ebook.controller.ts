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
