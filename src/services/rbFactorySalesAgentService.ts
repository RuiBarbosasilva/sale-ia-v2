import crypto from 'crypto';
import { prisma } from '../modules/mercadoLivre/lib/prisma';

function conversationBelongsToProspect(context: unknown, prospectId: string): boolean {
  if (typeof context !== 'string' || !context.trim()) return false;
  try {
    const parsed = JSON.parse(context);
    return Boolean(parsed && typeof parsed === 'object' && parsed.prospectId === prospectId);
  } catch {
    return false;
  }
}

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
    const message = action.type === 'FOLLOW_UP'
      ? await this.prepareFollowUpApproach(action.prospectId, 'WHATSAPP').then(x => x.message).catch(() => '')
      : await this.prepareInitialApproach(action.prospectId, 'WHATSAPP').then(x => x.message).catch(() => '');
    if (!message.trim()) throw new Error('SALES_MESSAGE_PREPARATION_FAILED');

    const idempotencyKey = `RBFACTORY:${action.type}:${action.prospectId}:${new Date().toISOString().slice(0, 10)}`;
    let outreach = await (prisma as any).websiteOutreach.findUnique({ where: { idempotencyKey } });
    if (!outreach) {
      try {
        outreach = await (prisma as any).websiteOutreach.create({
          data: {
            prospectId: action.prospectId,
            channel: 'WHATSAPP',
            status: 'PENDING_APPROVAL',
            subject: action.title,
            body: message,
            recipient: action.phone || null,
            idempotencyKey,
          }
        });
      } catch (error: any) {
        // Another worker may have created the same idempotent action concurrently.
        outreach = await (prisma as any).websiteOutreach.findUnique({ where: { idempotencyKey } });
        if (!outreach) throw error;
      }
    }

    if (outreach.status === 'REJECTED') {
      outreach = await (prisma as any).websiteOutreach.update({
        where: { id: outreach.id },
        data: {
          status: 'PENDING_APPROVAL',
          subject: action.title,
          body: message,
          recipient: action.phone || null,
          error: null
        }
      });
    }

    return {
      hasAction: true,
      prepared: true,
      action: {
        ...action,
        id: outreach.id,
        outreachId: outreach.id,
        channel: action.phone ? 'WHATSAPP_OR_MANUAL' : 'MANUAL',
        requiresApproval: outreach.status !== 'SENT',
        status: outreach.status,
        message: outreach.body || message
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
    const prospect = await (prisma as any).websiteProspect.findUnique({
      where: { id: prospectId },
      select: { id: true, linkedLeadId: true }
    });
    if (!prospect) throw new Error('WEBSITE_PROSPECT_NOT_FOUND');

    const leadId = prospect.linkedLeadId || null;
    const openConversations = await prisma.salesConversation.findMany({
      where: { leadId, channel, status: 'OPEN' },
      orderBy: { updatedAt: 'desc' },
      take: 100
    });
    let conversation = openConversations.find((item) =>
      conversationBelongsToProspect(item.context, prospectId)
    ) || null;

    if (!conversation) {
      conversation = await prisma.salesConversation.create({
        data: {
          id: crypto.randomUUID(),
          leadId,
          channel,
          context: JSON.stringify({ prospectId }),
          stage: 'INITIAL',
          temperature: 'COLD',
          status: 'OPEN'
        }
      });
    }

    return { conversation, reused: Boolean(conversation && conversationBelongsToProspect(conversation.context, prospectId)) };
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

  async prepareFollowUpApproach(prospectId: string, channel: string = 'WHATSAPP') {
    const prospect = await (prisma as any).websiteProspect.findUnique({
      where: { id: prospectId },
      select: { id: true, companyName: true, city: true }
    });
    if (!prospect) throw new Error('WEBSITE_PROSPECT_NOT_FOUND');

    return {
      prospectId,
      channel,
      message: 'Olá! Passando para retomar nosso contato sobre a demonstração da ' + prospect.companyName +
        '. Posso te enviar novamente os detalhes e a proposta para você avaliar?',
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
    const prospect = await (prisma as any).websiteProspect.findUnique({ where: { id: prospectId }, select: { id: true } });
    if (!prospect) throw new Error('WEBSITE_PROSPECT_NOT_FOUND');
    const conversation = await prisma.salesConversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 200 } }
    });
    if (!conversation) throw new Error('SALES_CONVERSATION_NOT_FOUND');
    if (!conversationBelongsToProspect(conversation.context, prospectId)) throw new Error('SALES_CONVERSATION_PROSPECT_MISMATCH');
    return conversation;
  },

  async respond(prospectId: string, conversationId: string, message: string) {
    const normalized = String(message || '').trim().toLowerCase();
    if (!normalized) throw new Error('SALES_MESSAGE_REQUIRED');
    const conversation = await prisma.salesConversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw new Error('SALES_CONVERSATION_NOT_FOUND');
    if (!conversation.context?.includes(prospectId)) throw new Error('SALES_CONVERSATION_PROSPECT_MISMATCH');
    if (conversation.status !== 'OPEN') throw new Error('SALES_CONVERSATION_CLOSED');

    let intent = 'INFO';
    let response = 'Recebi sua mensagem. Posso te mostrar a demonstração e explicar como funciona.';
    if (/preço|valor|quanto custa/.test(normalized)) {
      intent = 'PRICE';
      response = 'Posso te enviar a proposta com investimento, prazo e o que está incluído. Quer que eu envie?';
    } else if (/sim|pode|manda|enviar/.test(normalized)) {
      intent = 'POSITIVE';
      response = 'Perfeito. Vou te enviar a demonstração e a proposta para você avaliar sem compromisso.';
    } else if (/não|nao|agora/.test(normalized)) {
      intent = 'DEFERRED';
      response = 'Sem problema. Posso deixar a demonstração disponível e retomamos quando for conveniente.';
    }

    const now = new Date();
    await prisma.salesConversationMessage.create({
      data: { id: crypto.randomUUID(), conversationId, role: 'USER', content: String(message).trim(), intent }
    });
    await prisma.salesConversationMessage.create({
      data: { id: crypto.randomUUID(), conversationId, role: 'ASSISTANT', content: response, intent }
    });
    await prisma.salesConversation.update({
      where: { id: conversationId },
      data: {
        lastIntent: intent,
        intentScore: intent === 'POSITIVE' ? 0.8 : intent === 'PRICE' ? 0.6 : intent === 'DEFERRED' ? 0.2 : conversation.intentScore,
        temperature: intent === 'POSITIVE' ? 'HOT' : intent === 'PRICE' ? 'WARM' : conversation.temperature,
        nextBestAction: intent === 'POSITIVE' ? 'SEND_DEMO_AND_PROPOSAL' : intent === 'PRICE' ? 'SEND_PRICING' : intent === 'DEFERRED' ? 'SCHEDULE_FOLLOW_UP' : 'CONTINUE_CONVERSATION'
      }
    });
    return { prospectId, conversationId, intent, response, createdAt: now.toISOString() };
  },

  async prepareActionChannel(actionId: string) {
    const outreach = await (prisma as any).websiteOutreach.findUnique({ where: { id: actionId } });
    if (!outreach) throw new Error('SALES_ACTION_NOT_FOUND');
    return {
      actionId,
      channel: outreach.channel || 'WHATSAPP',
      recipient: outreach.recipient || null,
      ready: Boolean(outreach.body),
      status: outreach.status,
      requiresApproval: outreach.status !== 'SENT'
    };
  },

  async approveAction(actionId: string) {
    const outreach = await (prisma as any).websiteOutreach.findUnique({ where: { id: actionId } });
    if (!outreach) throw new Error('SALES_ACTION_NOT_FOUND');
    if (outreach.status === 'SENT') return { id: actionId, status: 'SENT' };
    await (prisma as any).websiteOutreach.update({
      where: { id: actionId },
      data: { status: 'APPROVED', error: null }
    });
    return { id: actionId, status: 'APPROVED' };
  },

  async rejectAction(actionId: string, reason: string = '') {
    const outreach = await (prisma as any).websiteOutreach.findUnique({ where: { id: actionId } });
    if (!outreach) throw new Error('SALES_ACTION_NOT_FOUND');
    await (prisma as any).websiteOutreach.update({
      where: { id: actionId },
      data: { status: 'REJECTED', error: reason || null }
    });
    return { id: actionId, status: 'REJECTED', reason };
  },

  async markActionSent(actionId: string, data: any = {}) {
    const sentAt = new Date();
    const nextFollowUpAt = data?.nextFollowUpAt ? new Date(data.nextFollowUpAt) : new Date(sentAt.getTime() + 48 * 60 * 60 * 1000);
    const outreach = await (prisma as any).websiteOutreach.findUnique({ where: { id: actionId } });
    if (!outreach) throw new Error('SALES_ACTION_NOT_FOUND');
    if (outreach.status !== 'APPROVED') {
      if (outreach.status === 'SENT') return { id: actionId, status: 'SENT', sentAt: outreach.sentAt?.toISOString?.() || null };
      throw new Error('SALES_ACTION_NOT_APPROVED');
    }

    await (prisma as any).websiteOutreach.update({
      where: { id: actionId },
      data: {
        status: 'SENT',
        sentAt,
        recipient: data?.recipient || outreach.recipient || null,
        provider: data?.provider || 'MANUAL',
        messageId: data?.messageId || null,
        error: null,
      },
    });

    await (prisma as any).websiteProspect.update({
      where: { id: outreach.prospectId },
      data: {
        contactedAt: sentAt,
        lastContactAt: sentAt,
        nextFollowUpAt,
        status: 'CONTACTED',
      },
    });

    await (prisma as any).websiteOutreachEvent.create({
      data: {
        outreachId: actionId,
        type: 'SENT',
        metadata: JSON.stringify({ nextFollowUpAt: nextFollowUpAt.toISOString(), provider: data?.provider || 'MANUAL' })
      }
    }).catch(() => undefined);

    return {
      id: actionId,
      status: 'SENT',
      sentAt: sentAt.toISOString(),
      nextFollowUpAt: nextFollowUpAt.toISOString(),
      data,
    };
  },

  async createConversation(prospectId: string, channel: string = 'WHATSAPP') {
    return this.ensureConversation(prospectId, channel);
  }
};
