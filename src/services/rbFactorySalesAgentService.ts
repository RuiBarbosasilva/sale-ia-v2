import { prisma } from '../modules/mercadoLivre/lib/prisma';

export const rbFactorySalesAgentService = {
  async dashboard() {
    try {
      const prospects = await (prisma as any).websiteProspect.findMany({
        take: 100,
        orderBy: { websiteOpportunityScore: 'desc' },
        select: {
          id: true,
          companyName: true,
          segment: true,
          city: true,
          phone: true,
          website: true,
          websiteOpportunityScore: true
        }
      });

      return {
        rbFactoryPipeline: [],
        pipeline: prospects.map((p: any) => ({
          id: p.id,
          prospectId: p.id,
          stage: 'DISCOVERED',
          priority: p.websiteOpportunityScore || 5,
          nextAction: 'AUDIT',
          updatedAt: new Date(),
          companyName: p.companyName,
          segment: p.segment,
          city: p.city,
          phone: p.phone,
          websiteOpportunityScore: p.websiteOpportunityScore
        })),
        pendingActions: [],
        pendingFollowUps: []
      };
    } catch (error: any) {
      console.error('[SalesAgent] dashboard error:', error.message);
      return { rbFactoryPipeline: [], pipeline: [], pendingActions: [], pendingFollowUps: [] };
    }
  },

  async nextSellerAction() {
    try {
      const prospects = await (prisma as any).websiteProspect.findMany({
        take: 1,
        orderBy: { websiteOpportunityScore: 'desc' },
        select: { id: true, companyName: true, segment: true, city: true, phone: true, websiteOpportunityScore: true }
      });

      if (prospects.length === 0) {
        return { hasAction: false, action: null };
      }

      const p = prospects[0];
      return {
        hasAction: true,
        action: {
          id: p.id,
          prospectId: p.id,
          type: 'INITIAL_APPROACH',
          title: `Abordar ${p.companyName}`,
          companyName: p.companyName,
          segment: p.segment,
          city: p.city,
          phone: p.phone,
          priority: p.websiteOpportunityScore || 5
        }
      };
    } catch (error: any) {
      console.error('[SalesAgent] nextSellerAction error:', error.message);
      return { hasAction: false, action: null };
    }
  },

  async prepareNextSellerAction() {
    return { hasAction: false, action: null, prepared: false };
  },

  async dueFollowUps(limit: number = 50) {
    return [];
  },

  async sellerQueue(limit: number = 50) {
    try {
      const prospects = await (prisma as any).websiteProspect.findMany({
        take: limit,
        orderBy: { websiteOpportunityScore: 'desc' },
        select: { id: true, companyName: true, segment: true, city: true, phone: true, websiteOpportunityScore: true }
      });

      return prospects.map((p: any) => ({
        id: p.id,
        companyName: p.companyName,
        segment: p.segment,
        city: p.city,
        phone: p.phone,
        priority: p.websiteOpportunityScore || 5
      }));
    } catch (error: any) {
      console.error('[SalesAgent] sellerQueue error:', error.message);
      return [];
    }
  },

  async ensureConversation(prospectId: string, channel: string = 'WHATSAPP') {
    return {
      conversation: {
        id: `conv_${prospectId}_${Date.now()}`,
        prospectId,
        channel,
        stage: 'INITIAL',
        temperature: 'COLD',
        context: '{}'
      },
      reused: false
    };
  },

  async prepareInitialApproach(prospectId: string, channel: string = 'WHATSAPP') {
    try {
      const prospect = await (prisma as any).websiteProspect.findUnique({
        where: { id: prospectId },
        select: { companyName: true, segment: true, city: true }
      });

      if (!prospect) throw new Error('Prospect not found');

      return {
        prospectId,
        channel,
        message: `Olá! Vi que a ${prospect.companyName} atua no segmento de ${prospect.segment} em ${prospect.city}. Temos uma solução especializada. Posso apresentar?`,
        reused: false
      };
    } catch (error: any) {
      console.error('[SalesAgent] prepareInitialApproach error:', error.message);
      throw error;
    }
  },

  async prepareProposalApproach(prospectId: string, channel: string = 'WHATSAPP') {
    return { prospectId, channel, message: 'Proposta em desenvolvimento', reused: false };
  },

  async conversationHistory(prospectId: string, conversationId: string) {
    return { prospectId, conversationId, messages: [] };
  },

  async respond(prospectId: string, conversationId: string, message: string) {
    return { prospectId, conversationId, response: 'Mensagem recebida' };
  },

  async prepareActionChannel(actionId: string) {
    return { actionId, channel: 'WHATSAPP', ready: false };
  },

  async approveAction(actionId: string) {
    return { id: actionId, status: 'APPROVED' };
  },

  async rejectAction(actionId: string, reason: string = '') {
    return { id: actionId, status: 'REJECTED', reason };
  },

  async markActionSent(actionId: string, data: any = {}) {
    return { id: actionId, status: 'SENT' };
  },

  async createConversation(prospectId: string, channel: string = 'WHATSAPP') {
    return {
      conversation: {
        id: `conv_${prospectId}_${Date.now()}`,
        prospectId,
        channel,
        stage: 'INITIAL',
        temperature: 'COLD'
      }
    };
  }
};
