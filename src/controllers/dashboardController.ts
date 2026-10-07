// src/controllers/dashboardController.ts
import { Request, Response } from 'express';
import { prisma } from '../modules/mercadoLivre/lib/prisma';

export const getMercadoLivreDashboard = async (req: Request, res: Response) => {
  try {
    const { status, accountId, error } = req.query;

    let account = null;
    if (accountId && typeof accountId === 'string') {
      account = await prisma.mercadoLivreAccount.findUnique({
        where: { id: accountId },
        select: {
          id: true,
          mlUserId: true,
          nickname: true,
          siteId: true,
          permalink: true,
          isActive: true,
          createdAt: true
        }
      });
    }

    if (!account) {
      account = await prisma.mercadoLivreAccount.findFirst({
        where: { isActive: true },
        select: {
          id: true,
          mlUserId: true,
          nickname: true,
          siteId: true,
          permalink: true,
          isActive: true,
          createdAt: true
        }
      });
    }

    const statusMessage = status === 'success' 
      ? '<p style="color: #28a745; font-weight: bold;">✅ Conexão com o Mercado Livre realizada com sucesso!</p>' 
      : status === 'error' 
      ? `<p style="color: #dc3545; font-weight: bold;">❌ Erro na conexão: ${error || 'Erro desconhecido'}</p>` 
      : '';

    const accountHtml = account ? `
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Conta Conectada</h3>
        <p><strong>Nickname:</strong> ${account.nickname}</p>
        <p><strong>ML User ID:</strong> ${account.mlUserId}</p>
        <p><strong>Site:</strong> ${account.siteId}</p>
        <p><strong>Status:</strong> ${account.isActive ? '🟢 Ativa' : '🔴 Inativa'}</p>
        ${account.permalink ? `<p><strong>Perfil:</strong> <a href="${account.permalink}" target="_blank">${account.permalink}</a></p>` : ''}
        <p><strong>Conectado em:</strong> ${new Date(account.createdAt).toLocaleString('pt-BR')}</p>
      </div>
    ` : '<p style="color: #6c757d;">Nenhuma conta conectada encontrada.</p>';

    res.send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dashboard Mercado Livre - Sale IA</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
          h1 { color: #333; margin-top: 0; }
          .btn { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 6px; margin-right: 10px; margin-top: 10px; transition: background 0.2s; }
          .btn:hover { background: #0056b3; }
          .btn-success { background: #28a745; }
          .btn-success:hover { background: #218838; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Dashboard Mercado Livre</h1>
          ${statusMessage}
          ${accountHtml}
          <div style="margin-top: 30px;">
            <a href="/api/mercadolivre/account" class="btn">🔍 Ver Dados da API (Account)</a>
            <a href="/api/mercadolivre/health" class="btn btn-success">❤️ Health Check</a>
            <a href="/api/mercadolivre/auth/connect" class="btn">🔗 Conectar Nova Conta</a>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('[Dashboard] Erro:', error);
    res.status(500).send('<h1>Erro ao carregar o dashboard</h1><p>Tente novamente mais tarde.</p>');
  }
};
