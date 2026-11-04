import { prisma } from '../src/modules/mercadoLivre/lib/prisma';
import { rbFactoryCommercialService } from '../src/services/rbFactoryCommercialService';

jest.mock('../src/modules/mercadoLivre/lib/prisma', () => ({
  prisma: {
    websiteProspect: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    $queryRawUnsafe: jest.fn(),
  },
}));

describe('RB Factory commercial daily dashboard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses prospect follow-up and status fields to classify daily actions', async () => {
    const dueAt = new Date(Date.now() - 60_000);
    const futureAt = new Date(Date.now() + 86_400_000);
    (prisma as any).websiteProspect.findMany.mockResolvedValue([
      { id: 'p-due', nextFollowUpAt: dueAt, contactedAt: new Date(), updatedAt: new Date(), score: 90 },
      { id: 'p-proposal', nextFollowUpAt: futureAt, contactedAt: new Date(), updatedAt: new Date(), score: 80 },
      { id: 'p-new', nextFollowUpAt: null, contactedAt: null, updatedAt: new Date(), score: 70 },
    ]);
    (prisma as any).$queryRawUnsafe.mockResolvedValue([
      { id: 'pipe-1', prospectId: 'p-due', stage: 'CONTACTED', status: 'OPEN', prospectStatus: 'CONTACTED', nextFollowUpAt: dueAt, contactedAt: new Date(), updatedAt: new Date() },
      { id: 'pipe-2', prospectId: 'p-proposal', stage: 'CONTACTED', status: 'OPEN', prospectStatus: 'PROPOSAL_SENT', nextFollowUpAt: futureAt, contactedAt: new Date(), updatedAt: new Date() },
      { id: 'pipe-3', prospectId: 'p-new', stage: 'DISCOVERED', status: 'OPEN', prospectStatus: 'DISCOVERED', nextFollowUpAt: null, contactedAt: null, updatedAt: new Date() },
    ]);

    const result = await rbFactoryCommercialService.today();

    expect(result.summary.FOLLOW_UP_DUE).toBe(1);
    expect(result.summary.PROPOSAL_WAITING).toBe(1);
    expect(result.summary.NEW_CONTACT).toBe(1);
    expect(result.buckets.FOLLOW_UP_DUE[0].prospectId).toBe('p-due');
  });

  it('schedules a follow-up without falsely recording a completed contact', async () => {
    (prisma as any).websiteProspect.update.mockResolvedValue({ id: 'p-1' });

    await rbFactoryCommercialService.scheduleFollowUp('p-1', 3, 'Retomar na semana');

    const args = (prisma as any).websiteProspect.update.mock.calls[0][0];
    expect(args.where).toEqual({ id: 'p-1' });
    expect(args.data.nextFollowUpAt).toBeInstanceOf(Date);
    expect(args.data.notes).toBe('Retomar na semana');
    expect(args.data).not.toHaveProperty('lastContactAt');
  });
});
