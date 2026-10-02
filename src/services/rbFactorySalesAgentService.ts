import { prisma } from '../modules/mercadoLivre/lib/prisma';

function safeLimit(value: number, fallback = 50) {
  return Number.isFinite(value) ? Math.min(200, Math.max(1, Math.trunc(value))) : fallback;
}

export const rbFactorySalesAgentService = {
  async dashboard() {
    const prospects = await (prisma as any).websiteProspect.findMany({
      take: 100,
      orderBy: [{ websiteOpportunityScore: 'desc' }, { updatedAt: 'desc' }],
      select: {
        id: true, companyName: true, segment: true, city: true, phone: true,
        website: true, websiteOpportunityScore: true, websiteOpportunityStatus: true,
        contactedAt: true, nextFollowUpAt: true, status: true
      }
    });

    return {
      rbFactoryPipeline: [],
      pipeline: prospects.map((p: any) => ({
        id: p.id,
        prospectId: p.id,
        stage: p.contactedAt ? 'CONTACTED' : 'DISCOVERED',
        priority: p.websiteOpportunityScore || 5,
        nextAction: p.contactedAt ? 'FOLLOW_UP' : 'INITIAL_APPROACH',
        updatedAt: new Date(),
        ...p
      })),
      pendingActions: prospects.filter((p: any) => !p.contactedAt).slice(0, 20),
      pendingFollowUps: prospects.filter((p: any) => p.nextFollowUpAt && new Date(p.nextFollowUpAt).getTime() <= Date.now()).slice(0, 20)
    };
  },

  async nextSellerAction() {
    const [followUp] = await (prisma as any).websiteProspect.findMany({
      where: { nextFollowUpAt: { lte: new Date() } },
      take: 1,
      orderBy: [{ nextFollowUpAt: 'asc' }, { websiteOpportunityScore: 'desc' }],
      select: { id: true, companyName: true, segment: true, city: true, phone: true, websiteOpportunityScore: true }
    });
    if (followUp) return this.buildInitialAction(followUp, 'FOLLOW_UP');

    const [prospect] = await (prisma as any).websiteProspect.findMany({
      where: { contactedAt: null },
      take: 1,
      orderBy: { websiteOpportunityScore: 'desc' },
      select: { id: true, companyName: true, segment: true, city: true, phone: true, websiteOpportunityScore: true }
    });
    if (!prospect) return { hasAction: false, action: null };
    return this.buildInitialAction(prospect, 'INITIAL_APPROACH');
  },

  async prepareNextSellerAction() {
    const result = await this.nextSellerAction();
    if (!result.hasAction) return { ...result, prepared: false };
    const action: any = result.action;
    return {
      hasAction: true,
      prepared: true,
      action: {
        ...action,
        channel: action.phone ? 'WHATSAPP_OR_MANUAL' : 'MANUAL',
        requiresApproval: true,
        status: 'PENDING_APPROVAL',
        message: await this.prepareInitialApproach(action.prospectId, 'WHATSAPP').then(x => x.message).catch(() => '')
      }
    };
  },

  buildInitialAction(p: any, type: string) {
    return {
      hasAction: true,
      action: {
        id: p.id,
        prospectId: p.id,
        type,
        title: type === 'FOLLOW_UP' ? 'Fazer follow-up de ' + p.companyName : 'Abordar ' + p.companyName,
        companyName: p.companyName,
        segment: p.segment,
        city: p.city,
        phone: p.phone,
        priority: p.websiteOpportunityScore || 5
      }
    };
  },

  async dueFollowUps(limit: number = 50) {
    return (prisma as any).websiteProspect.findMany({
      where: { nextFollowUpAt: { lte: new Date() } },
      take: safeLimit(limit),
      orderBy: [{ nextFollowUpAt: 'asc' }, { websiteOpportunityScore: 'desc' }],
      select: { id: true, companyName: true, segment: true, city: true, phone: true, nextFollowUpAt: true, websiteOpportunityScore: true }
    });
  },

  async sellerQueue(limit: number = 50) {
    const rows = await (prisma as any).websiteProspect.findMany({
      take: safeLimit(limit),
      orderBy: [{ websiteOpportunityScore: 'desc' }, { updatedAt: 'desc' }],
      select: { id: true, companyName: true, segment: true, city: true, phone: true, websiteOpportunityScore: true, contactedAt: true, nextFollowUpAt: true }
    });
    return rows.map((p: any) => ({
      id: p.id, prospectId: p.id, companyName: p.companyName, segment: p.segment,
      city: p.city, phone: p.phone, priority: p.websiteOpportunityScore || 5,
      nextAction: p.nextFollowUpAt && new Date(p.nextFollowUpAt) <= new Date() ? 'FOLLOW_UP' : (p.contactedAt ? 'FOLLOW_UP' : 'INITIAL_APPROACH')
    }));
  },

  async ensureConversation(prospectId: string, channel: string = 'WHATSAPP') {
    const prospect = await (prisma as any).websiteProspect.findUnique({ where: { id: prospectId }, select: { id: true } });
    if (!prospect) throw new Error('WEBSITE_PROSPECT_NOT_FOUND');
    return {
      conversation: { id: 'conv_' + prospectId, prospectId, channel, stage: 'INITIAL', temperature: 'COLD', context: '{}' },
      reused: true
    };
  },

  async prepareInitialApproach(prospectId: string, channel: string = 'WHATSAPP') {
    const prospect = await (prisma as any).websiteProspect.findUnique({
      where: { id: prospectId },
      select: { id: true, companyName: true, segment: true, city: true, currentWebsite: true, websiteOpportunityStatus: true }
    });
    if (!prospect) throw new Error('WEBSITE_PROSPECT_NOT_FOUND');

    const reason = prospect.websiteOpportunityStatus === 'NO_WEBSITE' || !prospect.currentWebsite
      ? 'percebi que a empresa ainda pode ganhar presença profissional na internet'
      : 'encontrei pontos na presença digital que podem ser melhorados';
    return {
      prospectId, channel,
      message: 'Olá! Vi a ' + prospect.companyName + ', de ' + (prospect.city || 'nossa região') + '. ' +
        'Analisei rapidamente a presença digital e ' + reason + '. ' +
        'Preparei uma demonstração sem compromisso. Posso te enviar?',
      reused: false
    };
  },

  async prepareProposalApproach(prospectId: string, channel: string = 'WHATSAPP') {
    const prospect = await (prisma as any).websiteProspect.findUnique({ where: { id: prospectId }, select: { id: true, companyName: true } });
    if (!prospect) throw new Error('WEBSITE_PROSPECT_NOT_FOUND');
    return {
      prospectId, channel,
      message: 'Olá! Preparei a proposta da ' + prospect.companyName + ' com a demonstração do novo site. Posso te enviar os detalhes para avaliarmos?',
      reused: false
    };
  },

  async conversationHistory(prospectId: string, conversationId: string) {
    return { prospectId, conversationId, messages: [] };
  },

  async respond(prospectId: string, conversationId: string, message: string) {
    const normalized = String(message || '').toLowerCase();
    let response = 'Recebi sua mensagem. Posso te mostrar a demonstração e explicar como funciona.';
    if (/preço|valor|quanto custa/.test(normalized)) response = 'Posso te enviar a proposta com investimento, prazo e o que está incluído. Quer que eu envie?';
    else if (/sim|pode|manda|enviar/.test(normalized)) response = 'Perfeito. Vou te enviar a demonstração e a proposta para você avaliar sem compromisso.';
    else if (/não|nao|agora/.test(normalized)) response = 'Sem problema. Posso deixar a demonstração disponível e retomamos quando for conveniente.';
    return { prospectId, conversationId, response };
  },

  async prepareActionChannel(actionId: string) {
    return { actionId, channel: 'WHATSAPP', ready: true, requiresApproval: true };
  },

  async approveAction(actionId: string) { return { id: actionId, status: 'APPROVED' }; },
  async rejectAction(actionId: string, reason: string = '') { return { id: actionId, status: 'REJECTED', reason }; },
  async markActionSent(actionId: string, data: any = {}) { return { id: actionId, status: 'SENT', data }; },

  async createConversation(prospectId: string, channel: string = 'WHATSAPP') {
    return this.ensureConversation(prospectId, channel);
  }
};
