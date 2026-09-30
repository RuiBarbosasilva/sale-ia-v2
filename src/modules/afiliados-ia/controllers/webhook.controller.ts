import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { clickBankProvider } from '../providers/ClickBankProvider';

const prisma = new PrismaClient();

export const handleAffiliateWebhook = async (req: Request, res: Response) => {
  try {
    const provider = req.params.provider; // ex: 'clickbank'
    const rawPayload = req.body;

    console.log(`[Webhook] Recebido evento do provedor: ${provider}`);

    if (provider === 'clickbank') {
      const normalizedData = await clickBankProvider.processWebhook(rawPayload);

      if (!normalizedData) {
        return res.status(200).json({ status: 'IGNORED', reason: 'Invalid or test payload' });
      }

      const { externalId, offerExternalId, amount, commission, status, rawPayload: raw } = normalizedData;

      // 1. Buscar o produto interno baseado no vendor (offerExternalId)
      const produto = await prisma.afiliadoProduto.findFirst({
        where: {
          plataforma: 'clickbank',
          linkAfiliado: offerExternalId // Assumindo que o vendor nickname está salvo aqui
        }
      });

      if (!produto) {
        console.warn(`[Webhook] Produto não encontrado para vendor: ${offerExternalId}`);
        return res.status(200).json({ status: 'IGNORED', reason: 'Product not found in DB' });
      }

      // 2. Tentar registrar a transação (A MÁGICA DA IDEMPOTÊNCIA)
      try {
        await prisma.affiliateTransaction.create({
          data: {
            externalId: externalId,
            provider: provider,
            afiliadoProdutoId: produto.id,
            amount: amount,
            commission: commission,
            status: status,
            rawPayload: JSON.stringify(raw)
          }
        });

        // 3. Se criou com sucesso, atualizar as métricas do produto atomicamente
        await prisma.afiliadoProduto.update({
          where: { id: produto.id },
          data: {
            vendasConfirmadas: { increment: status === 'CONFIRMED' ? 1 : 0 },
            comissaoTotal: { increment: status === 'CONFIRMED' ? commission : 0 },
            status: status === 'REFUNDED' || status === 'CANCELLED' ? 'reembolsado' : produto.status
          }
        });

        console.log(`[Webhook] ✅ Venda processada e salva. Receipt: ${externalId}`);
        return res.status(200).json({ status: 'SUCCESS', receipt: externalId });

      } catch (dbError: any) {
        // Se for erro de restrição única, significa que já processamos esse webhook antes
        if (dbError.code === 'P2002') {
          console.log(`[Webhook] ⚠️ Webhook duplicado ignorado (Idempotência funcionou). Receipt: ${externalId}`);
          return res.status(200).json({ status: 'DUPLICATE_IGNORED', receipt: externalId });
        }
        throw dbError; // Se for outro erro de banco, lança para o catch geral
      }
    }

    return res.status(400).json({ error: 'Provedor não suportado' });

  } catch (error: any) {
    console.error('[Webhook] ❌ Erro crítico ao processar evento:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
