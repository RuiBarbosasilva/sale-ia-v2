import { Request, Response } from 'express';
import { CredenciaisService } from './credenciais.service';

const credService = new CredenciaisService();

export const listarPlataformas = async (req: Request, res: Response) => {
  try {
    const plataformas = await credService.listarPlataformas();
    return res.json({ sucesso: true, total: plataformas.length, plataformas });
  } catch (error: any) {
    return res.status(500).json({ sucesso: false, erro: error.message });
  }
};

export const cadastrarCredencial = async (req: Request, res: Response) => {
  try {
    const { plataforma, credenciais } = req.body;
    if (!plataforma || !credenciais) {
      return res.status(400).json({ sucesso: false, erro: 'plataforma e credenciais obrigatorios' });
    }
    const resultado = await credService.cadastrarCredencial(plataforma, credenciais);
    return res.json(resultado);
  } catch (error: any) {
    return res.status(500).json({ sucesso: false, erro: error.message });
  }
};

export const obterStatusPlataforma = async (req: Request, res: Response) => {
  try {
    const { plataforma } = req.params;
    const resultado = await credService.obterStatusPlataforma(plataforma);
    return res.json(resultado);
  } catch (error: any) {
    return res.status(500).json({ sucesso: false, erro: error.message });
  }
};
