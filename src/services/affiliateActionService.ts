import { prisma } from '../modules/mercadoLivre/lib/prisma';
import { affiliateIntelligenceService } from './affiliateIntelligenceService';

function parsePayload(payload: string | null) {
  if (!payload) return {};
  try { return JSON.parse(payload); } catch { throw new Error('ACTION_PAYLOAD_INVALID'); }
}

export const affiliateActionService = {
  async list(status?: string) {
    return prisma.affiliateAction.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        network: { select: { name: true, slug: true } },
        campaign: { select: { name: true, id: true } },
      },
    });
  },

  async approve(id: string) {
    const a = await prisma.affiliateAction.findUnique({ where: { id } });
    if (!a) throw new Error('ACTION_NOT_FOUND');
    if (a.status !== 'PENDING_APPROVAL' && a.status !== 'READY') throw new Error('ACTION_NOT_APPROVABLE');
    return prisma.affiliateAction.update({ where: { id }, data: { status: 'APPROVED' } });
  },

  async reject(id: string, reason?: string) {
    const a = await prisma.affiliateAction.findUnique({ where: { id } });
    if (!a) throw new Error('ACTION_NOT_FOUND');
    return prisma.affiliateAction.update({
      where: { id },
      data: { status: 'REJECTED', result: reason || 'Rejeitada pelo supervisor' },
    });
  },

  async execute(id: string) {
    const action = await prisma.affiliateAction.findUnique({ where: { id } });
    if (!action) throw new Error('ACTION_NOT_FOUND');
    if (action.status !== 'APPROVED') throw new Error('ACTION_NOT_APPROVED');

    const payload = parsePayload(action.payload);

    if (action.type === 'CREATE_CAMPAIGN') {
      if (!payload.productId) throw new Error('ACTION_PRODUCT_REQUIRED');

      const product = await prisma.affiliateProduct.findUnique({
        where: { id: String(payload.productId) },
      });
      if (!product) throw new Error('PRODUCT_NOT_FOUND');

      const existing = await prisma.affiliateCampaign.findFirst({
        where: { productId: product.id, name: product.name + ' - campanha de vendas' },
      });

      const campaign = existing || await affiliateIntelligenceService.createCampaign({
        productId: product.id,
        name: product.name + ' - campanha de vendas',
        objective: 'SALES',
        strategy: 'Campanha criada pelo executor supervisionado do Sale-IA.',
      });

      return prisma.affiliateAction.update({
        where: { id },
        data: {
          status: 'EXECUTED',
          executedAt: new Date(),
          result: JSON.stringify({
            type: 'CREATE_CAMPAIGN',
            campaignId: campaign.id,
            reused: Boolean(existing),
          }),
        },
        include: { campaign: { select: { id: true, name: true } } },
      });
    }

    if (action.type === 'REQUEST_AFFILIATION' || action.type === 'AFFILIATE_PRODUCT') {
      return prisma.affiliateAction.update({
        where: { id },
        data: {
          status: 'MANUAL_REQUIRED',
          result: JSON.stringify({
            type: action.type,
            actionId: action.id,
            status: 'MANUAL_REQUIRED',
            reason: 'EXTERNAL_NETWORK_API_REQUIRED',
            payload,
            nextStep: 'Complete the partner-network operation and register the resulting affiliate link in Sale-IA.',
          }),
        },
      });
    }

    throw new Error('ACTION_TYPE_NOT_SUPPORTED');
  },
};
