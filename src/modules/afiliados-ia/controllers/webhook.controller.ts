import { Request, Response } from 'express';
import { prisma } from '../../mercadoLivre/lib/prisma';

export const handleAffiliateWebhook = async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    const webhookKey = req.headers['x-affiliate-webhook-key'] as string;

    // 1. Validação da chave de segurança
    const expectedKey = process.env.AFFILIATE_WEBHOOK_KEY;
    if (!expectedKey || webhookKey !== expectedKey) {
      console.warn('[Webhook] Chave inválida para provider: ' + provider);
      return res.status(401).json({ error: 'Chave de webhook inválida ou não configurada' });
    }

    const payload = req.body;
    const rawPayload = JSON.stringify(payload);

    // 2. Extração de dados (mapeamento flexível para diferentes providers)
    const externalId = String(
      payload.transaction_id || payload.id || payload.receipt || payload.order_id
    );
    const productExternalId = String(
      payload.product_id || payload.produtoid || 'UNKNOWN'
    );
    const amount = parseFloat(
      payload.amount || payload.valor || payload.total || 0
    );
    const commission = parseFloat(
      payload.commission || payload.comissao || (amount * 0.1)
    );
    const affiliateCode = String(
      payload.affiliate_code || payload.afiliado || payload.clickbank_affiliate || 'UNKNOWN'
    );
    const statusRaw = String(payload.status || 'CONFIRMED').toUpperCase();

    if (!externalId || externalId === 'undefined') {
      return res.status(400).json({ error: 'ID externo da transação não encontrado no payload' });
    }

    // 3. Idempotência: Verifica se já processamos essa transação
    const existingTransaction = await prisma.affiliateTransaction.findUnique({
      where: { externalId }
    });

    if (existingTransaction) {
      console.log('[Webhook] Transação já processada (idempotente): ' + externalId);
      return res.status(200).json({
        message: 'Webhook recebido e já processado anteriormente',
        id: existingTransaction.id
      });
    }

    // 4. Processamento Atômico (Transação no Prisma)
    const result = await prisma.$transaction(async (tx) => {
      // 4.1. Buscar ou criar o produto (fallback seguro)
      let network = await tx.affiliateNetwork.findFirst({ where: { slug: provider.toLowerCase() } });
      if (!network) {
        network = await tx.affiliateNetwork.create({
          data: {
            name: provider,
            slug: provider.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
            type: 'AFFILIATE_NETWORK',
            status: 'CONFIGURED'
          }
        });
      }

      let product = await tx.affiliateProduct.findFirst({
        where: { networkId: network.id, externalId: productExternalId }
      });

      if (!product) {
        product = await tx.affiliateProduct.create({
          data: {
            networkId: network.id,
            externalId: productExternalId,
            name: payload.product_name || payload.titulo || ('Produto ' + productExternalId),
            price: amount,
            commissionRate: 10,
            affiliateUrl: payload.link || null,
            opportunityScore: 0,
            status: 'DISCOVERED'
          }
        });
      }

      // 4.2. Buscar afiliado pelo código (slug ou código externo)
      const affiliate = await tx.affiliate.findFirst({
        where: {
          OR: [
            { slug: affiliateCode },
            { name: { contains: affiliateCode } }
          ]
        }
      });

      // 4.3. Criar a Transação Financeira (Ledger)
      const transaction = await tx.affiliateTransaction.create({
        data: {
          externalId,
          provider,
          produtoId: product.id,
          affiliateId: affiliate ? affiliate.id : null,
          amount,
          commission,
          status: statusRaw,
          rawPayload
        }
      });

      // 4.4. Criar a Venda (Sale) vinculada, se houver afiliado identificado
      if (affiliate) {
        await tx.affiliateSale.create({
          data: {
            affiliateId: affiliate.id,
            externalOrderId: externalId,
            webhookEventId: transaction.id,
            source: provider.toUpperCase(),
            amount,
            commissionRate: product.commissionRate || 10,
            commissionAmount: commission,
            status: (statusRaw === 'CONFIRMED' || statusRaw === 'APPROVED') ? 'APPROVED' : 'PENDING',
            metadata: rawPayload
          }
        });

        // Atualiza métricas do produto automaticamente
        await tx.affiliateProduct.update({
          where: { id: product.id },
          data: {
            lastScannedAt: new Date()
          }
        });
      }

      return { transaction, product, affiliate };
    });

    console.log('[Webhook] Processado com sucesso: ' + provider + ' - ' + externalId);
    return res.status(200).json({
      message: 'Webhook processado com sucesso',
      transactionId: result.transaction.id
    });

  } catch (error) {
    console.error('[Webhook Error]', error);
    return res.status(500).json({
      error: 'Erro interno ao processar webhook',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};