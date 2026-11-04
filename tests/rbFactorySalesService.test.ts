import { prisma } from '../src/modules/mercadoLivre/lib/prisma';
import { rbFactorySalesAgentService } from '../src/services/rbFactorySalesAgentService';
import { rbFactorySalesService } from '../src/services/rbFactorySalesService';

jest.mock('../src/modules/mercadoLivre/lib/prisma', () => ({
  prisma: {
    $executeRawUnsafe: jest.fn().mockResolvedValue(0),
    websiteProposal: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    websiteProspect: {
      update: jest.fn(),
    },
  },
}));

jest.mock('../src/services/rbFactorySalesAgentService', () => ({
  rbFactorySalesAgentService: {
    ensureConversation: jest.fn(),
    prepareProposalApproach: jest.fn(),
  },
}));

describe('RB Factory proposal delivery state', () => {
  beforeEach(() => jest.clearAllMocks());

  it('keeps a prepared proposal READY and does not claim delivery', async () => {
    const proposal = { id: 'proposal-1', prospectId: 'prospect-1', status: 'READY', sentAt: null, content: 'Proposal' };
    (prisma as any).websiteProposal.findFirst.mockResolvedValue(proposal);
    (rbFactorySalesAgentService as any).ensureConversation.mockResolvedValue({
      conversation: { id: 'conversation-1' }, reused: false
    });
    (rbFactorySalesAgentService as any).prepareProposalApproach.mockResolvedValue({
      message: 'Posso te enviar os detalhes?'
    });

    const result = await rbFactorySalesService.sendProposal('prospect-1');

    expect(result.status).toBe('READY');
    expect(result.delivery).toEqual({
      status: 'NOT_SENT',
      sentAt: null,
      requiresManualConfirmation: true
    });
    expect(result.salesAgent.proposalApproach).toBe('Posso te enviar os detalhes?');
    expect((prisma as any).websiteProposal.update).not.toHaveBeenCalled();
    expect((prisma as any).websiteProspect.update).not.toHaveBeenCalled();
  });

  it('does not treat legacy SENT records as verified provider delivery', async () => {
    const sentAt = new Date('2026-11-01T12:00:00.000Z');
    (prisma as any).websiteProposal.findFirst.mockResolvedValue({
      id: 'proposal-2', prospectId: 'prospect-1', status: 'SENT', sentAt
    });
    (rbFactorySalesAgentService as any).ensureConversation.mockResolvedValue({
      conversation: { id: 'conversation-1' }, reused: true
    });
    (rbFactorySalesAgentService as any).prepareProposalApproach.mockResolvedValue({
      message: 'Retomando a proposta.'
    });

    const result = await rbFactorySalesService.sendProposal('prospect-1');

    expect(result.delivery).toEqual({
      status: 'LEGACY_UNVERIFIED',
      sentAt,
      requiresManualConfirmation: true
    });
    expect((prisma as any).websiteProposal.update).not.toHaveBeenCalled();
  });
});
