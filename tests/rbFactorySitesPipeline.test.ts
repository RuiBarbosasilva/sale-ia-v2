const mockDb = {
  websiteProspect: { findMany: jest.fn(), update: jest.fn() },
  websiteDemo: { findUnique: jest.fn(), update: jest.fn() },
  lead: { findFirst: jest.fn(), create: jest.fn() },
  websiteProject: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockDb),
}));

jest.mock('../src/services/prospecting/websiteProspectorService', () => ({
  websiteProspectorService: { searchProspects: jest.fn() },
}));
jest.mock('../src/services/prospecting/websiteOpportunityScoringService', () => ({
  websiteOpportunityScoringService: { calculateScore: jest.fn() },
}));
jest.mock('../src/services/prospecting/websiteDemoFactoryService', () => ({
  websiteDemoFactoryService: { generateDemoForProspect: jest.fn() },
}));
jest.mock('../src/services/proposalGeneratorService', () => ({
  proposalGeneratorService: { generateProposal: jest.fn() },
}));
jest.mock('../src/services/website/netlifyDeploymentService', () => ({
  netlifyDeploymentService: { isConfigured: jest.fn(), deployStaticSite: jest.fn() },
}));
jest.mock('../src/services/website/websiteService', () => ({
  websiteService: { markProjectPublished: jest.fn() },
}));

import { rbFactorySitesPipelineController } from '../src/controllers/rbFactorySitesPipelineController';
import { websiteProspectorService } from '../src/services/prospecting/websiteProspectorService';
import { websiteOpportunityScoringService } from '../src/services/prospecting/websiteOpportunityScoringService';
import { websiteDemoFactoryService } from '../src/services/prospecting/websiteDemoFactoryService';
import { proposalGeneratorService } from '../src/services/proposalGeneratorService';
import { netlifyDeploymentService } from '../src/services/website/netlifyDeploymentService';
import { websiteService } from '../src/services/website/websiteService';

function response() {
  const res: any = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

describe('RB Factory Sites production flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prospects a city and segment, scores businesses without a site and generates a demo pending owner approval', async () => {
    (websiteProspectorService.searchProspects as jest.Mock).mockResolvedValue({
      searchId: 'search-1', totalFound: 8, totalQualified: 3,
    });
    mockDb.websiteProspect.findMany.mockResolvedValue([{
      id: 'prospect-1', companyName: 'Empresa Local', city: 'Pocos de Caldas',
      segment: 'pizzaria', websiteOpportunityStatus: 'NO_WEBSITE',
    }]);
    (websiteOpportunityScoringService.calculateScore as jest.Mock).mockResolvedValue({ score: 97 });
    (websiteDemoFactoryService.generateDemoForProspect as jest.Mock).mockResolvedValue({
      demoId: 'demo-1', version: 1, qualityScore: 8.8,
      qualityRecommendation: 'approve', qualityCriticalIssues: [],
    });

    const res = response();
    await rbFactorySitesPipelineController.start({
      body: { city: 'Pocos de Caldas', segment: 'pizzaria' },
    } as any, res);

    expect(websiteProspectorService.searchProspects).toHaveBeenCalledWith(expect.objectContaining({
      city: 'Pocos de Caldas', niche: 'pizzaria',
    }));
    expect(websiteOpportunityScoringService.calculateScore).toHaveBeenCalledWith('prospect-1');
    expect(websiteDemoFactoryService.generateDemoForProspect).toHaveBeenCalledWith('prospect-1', { useAI: true });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true, status: 'PENDING_OWNER_APPROVAL',
      demo: expect.objectContaining({ id: 'demo-1', previewUrl: '/api/websites/studio/demos/demo-1/html' }),
    }));
  });

  it('records approval, proposal, lead and project but never fakes publication when Netlify is not configured', async () => {
    mockDb.websiteDemo.findUnique.mockResolvedValue({
      id: 'demo-3', prospectId: 'prospect-3', status: 'READY', version: 1,
      sourceCode: '<html><body>Demo</body></html>',
      previewData: JSON.stringify({ qualityReview: { overallScore: 8.6, criticalIssues: [] }, assets: [] }),
      prospect: {
        id: 'prospect-3', companyName: 'Empresa Teste', phone: '5535999999999',
        email: 'contato@empresa-teste.invalid', websiteOpportunityScore: 97,
      },
    });
    (proposalGeneratorService.generateProposal as jest.Mock).mockResolvedValue({ id: 'proposal-3' });
    mockDb.lead.findFirst.mockResolvedValue(null);
    mockDb.lead.create.mockResolvedValue({ id: 'lead-3' });
    mockDb.websiteProject.findFirst.mockResolvedValue(null);
    mockDb.websiteProject.create.mockResolvedValue({ id: 'project-3', status: 'PLANNING', publicUrl: null });
    (netlifyDeploymentService.isConfigured as jest.Mock).mockReturnValue(false);

    const res = response();
    await rbFactorySitesPipelineController.approveAndPublish({ params: { demoId: 'demo-3' } } as any, res);

    expect(proposalGeneratorService.generateProposal).toHaveBeenCalledWith('prospect-3');
    expect(mockDb.lead.create).toHaveBeenCalled();
    expect(mockDb.websiteProject.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false, error: 'NETLIFY_NOT_CONFIGURED',
      proposalId: 'proposal-3', leadId: 'lead-3', projectId: 'project-3',
    }));
  });

  it('requires a passed quality gate before owner approval can trigger proposal or publication', async () => {
    mockDb.websiteDemo.findUnique.mockResolvedValue({
      id: 'demo-2', prospectId: 'prospect-2', status: 'READY',
      previewData: JSON.stringify({ qualityReview: { overallScore: 6.4, criticalIssues: ['CTA ausente'] } }),
      prospect: { id: 'prospect-2', companyName: 'Empresa', phone: '5535999999999', email: null },
    });

    const res = response();
    await rbFactorySitesPipelineController.approveAndPublish({ params: { demoId: 'demo-2' } } as any, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(proposalGeneratorService.generateProposal).not.toHaveBeenCalled();
    expect(netlifyDeploymentService.deployStaticSite).not.toHaveBeenCalled();
  });

  it('publishes a quality-approved demo and persists the verified public URL', async () => {
    mockDb.websiteDemo.findUnique.mockResolvedValue({
      id: 'demo-publish', prospectId: 'prospect-publish', status: 'READY', version: 2,
      sourceCode: '<html><body>Site</body></html>',
      previewData: JSON.stringify({ qualityReview: { overallScore: 9, criticalIssues: [] }, assets: [] }),
      prospect: { id: 'prospect-publish', companyName: 'Empresa Publicada', phone: null, email: null, websiteOpportunityScore: 90 },
    });
    (proposalGeneratorService.generateProposal as jest.Mock).mockResolvedValue({ id: 'proposal-publish' });
    mockDb.lead.findFirst.mockResolvedValue({ id: 'lead-existing' });
    mockDb.websiteProject.findFirst.mockResolvedValue(null);
    mockDb.websiteProject.create.mockResolvedValue({ id: 'project-publish', status: 'PLANNING', publicUrl: null });
    (netlifyDeploymentService.isConfigured as jest.Mock).mockReturnValue(true);
    (netlifyDeploymentService.deployStaticSite as jest.Mock).mockResolvedValue({
      siteId: 'site-1', deployId: 'deploy-1', state: 'ready', publicUrl: 'https://empresa.netlify.app',
    });
    (websiteService.markProjectPublished as jest.Mock).mockResolvedValue({
      id: 'project-publish', status: 'PUBLISHED', publicUrl: 'https://empresa.netlify.app',
    });

    const res = response();
    await rbFactorySitesPipelineController.approveAndPublish({ params: { demoId: 'demo-publish' } } as any, res);

    expect(netlifyDeploymentService.deployStaticSite).toHaveBeenCalledWith(expect.objectContaining({
      projectId: 'project-publish', companyName: 'Empresa Publicada',
    }));
    expect(websiteService.markProjectPublished).toHaveBeenCalledWith('project-publish', expect.objectContaining({
      hostingProvider: 'NETLIFY', publicUrl: 'https://empresa.netlify.app',
    }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true, status: 'PUBLISHED', publicUrl: 'https://empresa.netlify.app',
    }));
  });

  it('reuses an existing publication without generating duplicate proposal or lead', async () => {
    mockDb.websiteDemo.findUnique.mockResolvedValue({
      id: 'demo-already-live', prospectId: 'prospect-already-live', status: 'APPROVED', version: 1,
      previewData: JSON.stringify({ qualityReview: { overallScore: 9, criticalIssues: [] } }),
      prospect: { id: 'prospect-already-live', companyName: 'Empresa no Ar' },
    });
    mockDb.websiteProject.findFirst.mockResolvedValue({
      id: 'project-live', status: 'PUBLISHED', publicUrl: 'https://empresa-live.netlify.app',
    });

    const res = response();
    await rbFactorySitesPipelineController.approveAndPublish({ params: { demoId: 'demo-already-live' } } as any, res);

    expect(proposalGeneratorService.generateProposal).not.toHaveBeenCalled();
    expect(mockDb.lead.create).not.toHaveBeenCalled();
    expect(netlifyDeploymentService.deployStaticSite).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true, status: 'PUBLISHED', reusedPublication: true,
      publicUrl: 'https://empresa-live.netlify.app',
    }));
  });

});
