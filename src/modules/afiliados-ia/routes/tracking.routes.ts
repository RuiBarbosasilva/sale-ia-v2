import { Router, Request, Response } from 'express';
import { prisma } from '../../../modules/mercadoLivre/lib/prisma';

const router = Router();

/**
 * Rota de redirecionamento e tracking de afiliados
 * Ex: GET /go/abc123xyz
 */
router.get('/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    // 1. Tentar encontrar a publicação/link associado a este código
    // Assumimos que o 'code' pode ser o id da AfiliadoPublicacao ou um campo de short_code
    // Para este MVP, vamos buscar na AfiliadoPublicacao onde o id ou um campo de tracking bata.
    // Se você tiver um modelo AffiliateLink dedicado, ajuste a query abaixo.
    
    const publicacao = await prisma.afiliadoPublicacao.findFirst({
      where: {
        OR: [
          { id: code },
          { postIdExterno: code } // Fallback se o code for o ID da publicação
        ]
      },
      include: {
        produto: true
      }
    });

    if (!publicacao) {
      console.warn(`[Tracking] Código não encontrado: ${code}`);
      return res.status(404).send('Link expirado ou inválido.');
    }

    // 2. Incrementar o contador de cliques (atualização atômica para evitar race conditions)
    await prisma.afiliadoPublicacao.update({
      where: { id: publicacao.id },
      data: {
        cliques: { increment: 1 }
      }
    });

    // 3. O destino é o linkAfiliado salvo no produto (que o ClickBankProvider gerou ou o usuário cadastrou)
    const destinationUrl = publicacao.produto.linkAfiliado;

    if (!destinationUrl || destinationUrl === '') {
      console.error(`[Tracking] Produto sem link de afiliado configurado: ${publicacao.produto.id}`);
      return res.status(500).send('Erro de configuração do link de afiliado.');
    }

    // 4. Redirecionar o usuário (302 Found é o padrão para redirecionamentos temporários/rastreados)
    return res.redirect(302, destinationUrl);

  } catch (error) {
    console.error('[Tracking] Erro ao processar redirect /go/:', error);
    return res.status(500).send('Erro interno no servidor de tracking.');
  }
});

export default router;
