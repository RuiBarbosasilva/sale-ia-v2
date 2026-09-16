// src/modules/mercadoLivre/controllers/authController.ts
import { Request, Response } from 'express';
import axios from 'axios';
import { prisma } from '../lib/prisma';
import { tokenService } from '../auth/tokenService';
import { oauthStateService } from '../auth/oauthStateService';

export const connect = (req: Request, res: Response) => {
  try {
    console.log('[ML OAuth] 🟢 Iniciando fluxo de conexão...');
    const state = oauthStateService.generateState();
    console.log('[ML OAuth] 🔑 State gerado:', state.substring(0, 8) + '...');
    
    const appId = process.env.MERCADO_LIVRE_APP_ID;
    const redirectUri = process.env.MERCADO_LIVRE_REDIRECT_URI;
    
    console.log('[ML OAuth] ⚙️ APP_ID:', appId ? 'CONFIGURADO' : '❌ AUSENTE');
    console.log('[ML OAuth] ⚙️ REDIRECT_URI:', redirectUri);
    
    if (!appId || !redirectUri) {
      throw new Error('Variáveis de ambiente do ML não configuradas no .env');
    }

    const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    
    console.log('[ML OAuth] 🔗 Redirecionando para o Mercado Livre...');
    res.redirect(authUrl);
  } catch (error: any) {
    console.error('[ML OAuth] ❌ Erro ao iniciar conexão:', error.message);
    res.status(500).json({ error: 'MERCADO_LIVRE_INTERNAL_ERROR', message: error.message });
  }
};

export const callback = async (req: Request, res: Response) => {
  console.log('\n========================================');
  console.log('[ML OAuth] 🟡 CALLBACK RECEBIDO');
  console.log('========================================');
  
  const { code, state } = req.query;
  console.log('[ML OAuth] Query params:', { code: code ? 'PRESENTE' : 'AUSENTE', state: state ? String(state).substring(0,8)+'...' : 'AUSENTE' });

  if (!state || typeof state !== 'string' || !oauthStateService.validateAndConsumeState(state)) {
    console.error('[ML OAuth] ❌ State inválido, expirado ou já utilizado');
    return res.redirect(`/dashboard/mercadolivre?status=error&message=${encodeURIComponent('State inválido')}`);
  }
  console.log('[ML OAuth] ✅ State validado');

  if (!code || typeof code !== 'string') {
    console.error('[ML OAuth] ❌ Code ausente');
    return res.redirect(`/dashboard/mercadolivre?status=error&message=${encodeURIComponent('Code ausente')}`);
  }
  console.log('[ML OAuth] ✅ Code presente');

  try {
    console.log('\n[ML OAuth] 🔄 INICIANDO TROCA DE TOKEN (POST /oauth/token)');
    
    const appId = (process.env.MERCADO_LIVRE_APP_ID || '').trim();
    const clientSecret = (process.env.MERCADO_LIVRE_CLIENT_SECRET || '').trim();
    const redirectUri = (process.env.MERCADO_LIVRE_REDIRECT_URI || '').trim();
    
    console.log('[ML OAuth] Dados que serão enviados:');
    console.log('  - grant_type: authorization_code');
    console.log('  - client_id:', appId);
    console.log('  - client_secret:', clientSecret ? '***CONFIGURADO***' : '❌ AUSENTE');
    console.log('  - code:', code);
    console.log('  - redirect_uri:', redirectUri);

    // Montando o payload no formato exato exigido pelo OAuth2 (URL Encoded)
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('client_id', appId);
    params.append('client_secret', clientSecret);
    params.append('code', code);
    params.append('redirect_uri', redirectUri);

    const tokenResponse = await axios.post('https://api.mercadolibre.com/oauth/token', params, {
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded', 
        'Accept': 'application/json' 
      },
      validateStatus: () => true // Impede o Axios de lançar exceção automática para status 4xx/5xx
    });

    // Verificando se a resposta foi um erro HTTP (ex: 400, 401)
    if (tokenResponse.status >= 400) {
      console.error('\n[ML OAuth] 🚨🚨🚨 O MERCADO LIVRE RETORNOU UM ERRO! 🚨🚨🚨');
      console.error('[ML OAuth] Status HTTP:', tokenResponse.status);
      console.error('[ML OAuth] Corpo da Resposta (Data):', JSON.stringify(tokenResponse.data, null, 2));
      console.error('[ML OAuth] Corpo da Resposta (Text):', tokenResponse.data);
      
      const mlErrorMessage = tokenResponse.data?.message || tokenResponse.data?.error_description || tokenResponse.data?.error || `HTTP ${tokenResponse.status}`;
      throw new Error(mlErrorMessage);
    }

    console.log('[ML OAuth] ✅ Token recebido com sucesso!');
    console.log('[ML OAuth] Access Token:', tokenResponse.data.access_token?.substring(0, 10) + '...');

    // Buscando dados do usuário
    console.log('[ML OAuth] 👤 Buscando dados em /users/me...');
    const userResponse = await axios.get('https://api.mercadolibre.com/users/me', {
      headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` }
    });
    const userData = userResponse.data;
    console.log('[ML OAuth] ✅ Usuário:', userData.nickname);

    // Salvando no banco
    const userId = (req as any).user?.id || 'SYSTEM';
    const account = await prisma.mercadoLivreAccount.upsert({
      where: { mlUserId: String(userData.id) },
      update: { nickname: userData.nickname, isActive: true },
      create: {
        userId,
        mlUserId: String(userData.id),
        nickname: userData.nickname,
        siteId: userData.site_id || 'MLB',
        permalink: userData.permalink,
        isActive: true,
      }
    });

    await tokenService.saveInitialTokens(account.id, tokenResponse.data);
    console.log('[ML OAuth] 💾 Conta e tokens salvos no banco.');

    // Redirecionamento final
    const frontendUrl = process.env.FRONTEND_URL;
    const successPath = frontendUrl 
      ? `${frontendUrl}/dashboard/mercadolivre?status=success&accountId=${account.id}` 
      : `/dashboard/mercadolivre?status=success&accountId=${account.id}`;
      
    console.log('[ML OAuth] 🏁 Redirecionando para:', successPath);
    res.redirect(successPath);

  } catch (error: any) {
    console.error('\n========================================');
    console.error('[ML OAuth] ❌ ERRO CRÍTICO NO CALLBACK');
    console.error('========================================');
    console.error('[ML OAuth] Mensagem Final:', error.message);
    console.error('========================================\n');
    
    const encodedError = encodeURIComponent(error.message || 'Erro desconhecido');
    res.redirect(`/dashboard/mercadolivre?status=error&message=${encodedError}`);
  }
};

export const disconnect = async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    await prisma.mercadoLivreAccount.update({ where: { id: accountId }, data: { isActive: false } });
    res.json({ success: true, message: 'Conta desconectada' });
  } catch (error) {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
};

