const mockDb = {
  websiteProspect: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  websiteProposal: {
    findFirst: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockDb),
}));

import { proposalGeneratorService } from '../src/services/proposalGeneratorService';

describe('RB Factory Sites proposal generation', () => {
  const prospect = {
    id: 'prospect-1',
    companyName: 'Empresa Teste',
    segment: 'pizzaria',
    city: 'Poços de Caldas',
    websiteOpportunityStatus: 'NO_WEBSITE',
    websiteOpportunityScore: 91,
    demos: [{
      status: 'READY',
      previewData: JSON.stringify({
        qualityReview: { overallScore: 8.7, criticalIssues: [] },
      }),
    }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.websiteProspect.findUnique.mockResolvedValue(prospect);
    mockDb.websiteProspect.update.mockResolvedValue({ id: prospect.id, status: 'PROPOSAL_READY' });
  });

  it('creates a proposal only after the latest demo passes the quality gate', async () => {
    mockDb.websiteProposal.findFirst.mockResolvedValue(null);
    mockDb.websiteProposal.create.mockResolvedValue({
      id: 'proposal-1', prospectId: prospect.id, status: 'READY',
    });

    const result = await proposalGeneratorService.generateProposal(prospect.id);

    expect(mockDb.websiteProposal.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        prospectId: prospect.id,
        status: 'READY',
        content: expect.stringContaining('Empresa Teste'),
      }),
    });
    expect(mockDb.websiteProposal.update).not.toHaveBeenCalled();
    expect(mockDb.websiteProspect.update).toHaveBeenCalledWith({
      where: { id: prospect.id },
      data: { status: 'PROPOSAL_READY' },
    });
    expect(result.id).toBe('proposal-1');
  });

  it('updates the existing proposal on retry instead of creating another one', async () => {
    mockDb.websiteProposal.findFirst.mockResolvedValue({
      id: 'proposal-existing', prospectId: prospect.id,
    });
    mockDb.websiteProposal.update.mockResolvedValue({
      id: 'proposal-existing', prospectId: prospect.id, status: 'READY',
    });

    const result = await proposalGeneratorService.generateProposal(prospect.id);

    expect(mockDb.websiteProposal.update).toHaveBeenCalledWith({
      where: { id: 'proposal-existing' },
      data: expect.objectContaining({
        status: 'READY',
        content: expect.stringContaining('Empresa Teste'),
      }),
    });
    expect(mockDb.websiteProposal.create).not.toHaveBeenCalled();
    expect(result.id).toBe('proposal-existing');
  });

  it.each([
    ['demo ausente', []],
    ['demo ainda pendente', [{ status: 'PENDING', previewData: '{}' }]],
    ['score abaixo do mínimo', [{
      status: 'READY',
      previewData: JSON.stringify({ qualityReview: { overallScore: 7.4, criticalIssues: [] } }),
    }]],
    ['problema crítico', [{
      status: 'READY',
      previewData: JSON.stringify({ qualityReview: { overallScore: 9, criticalIssues: ['Contato ausente'] } }),
    }]],
  ])('blocks proposal generation when the quality gate fails: %s', async (_caseName, demos) => {
    mockDb.websiteProspect.findUnique.mockResolvedValue({ ...prospect, demos });

    await expect(proposalGeneratorService.generateProposal(prospect.id))
      .rejects.toThrow(demos.length === 0 || demos[0].status !== 'READY'
        ? 'DEMO_NOT_READY'
        : 'DEMO_QUALITY_GATE');

    expect(mockDb.websiteProposal.findFirst).not.toHaveBeenCalled();
    expect(mockDb.websiteProposal.create).not.toHaveBeenCalled();
    expect(mockDb.websiteProposal.update).not.toHaveBeenCalled();
  });

  it('returns a clear error when the prospect does not exist', async () => {
    mockDb.websiteProspect.findUnique.mockResolvedValue(null);

    await expect(proposalGeneratorService.generateProposal('missing'))
      .rejects.toThrow('WEBSITE_PROSPECT_NOT_FOUND');

    expect(mockDb.websiteProposal.create).not.toHaveBeenCalled();
  });
});
