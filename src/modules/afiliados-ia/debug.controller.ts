import { Request, Response } from 'express';
import { KiwifyAPI } from '../afiliados-ia/integrations/kiwify.api';

const kiwifyAPI = new KiwifyAPI();

export const debugKiwify = async (req: Request, res: Response) => {
  try {
    const debug = {
      credenciais: {
        client_id_configurado: !!(process.env.KIWIFY_CLIENT_ID && process.env.KIWIFY_CLIENT_ID !== ''),
        client_secret_configurado: !!(process.env.KIWIFY_CLIENT_SECRET && process.env.KIWIFY_CLIENT_SECRET !== ''),
        account_id_configurado: !!(process.env.KIWIFY_ACCOUNT_ID && process.env.KIWIFY_ACCOUNT_ID !== ''),
        client_id_mascarado: process.env.KIWIFY_CLIENT_ID ? process.env.KIWIFY_CLIENT_ID.substring(0, 4) + '...' : null,
        client_secret_mascarado: process.env.KIWIFY_CLIENT_SECRET ? process.env.KIWIFY_CLIENT_SECRET.substring(0, 4) + '...' : null
      },
      token: null,
      produtos: [],
      erros: []
    };

    // Tentar gerar token
    try {
      const token = await kiwifyAPI.getAccessToken();
      debug.token = token ? 'Gerado com sucesso (' + token.substring(0, 20) + '...)' : 'Falha ao gerar';
    } catch (error: any) {
      debug.erros.push('Erro ao gerar token: ' + (error.response?.data || error.message));
    }

    // Tentar buscar produtos
    try {
      const produtos = await kiwifyAPI.buscarProdutosAfiliados();
      debug.produtos = produtos;
    } catch (error: any) {
      debug.erros.push('Erro ao buscar produtos: ' + (error.response?.data || error.message));
    }

    return res.json({ sucesso: true, debug });
  } catch (error: any) {
    return res.status(500).json({ sucesso: false, erro: error.message });
  }
};
