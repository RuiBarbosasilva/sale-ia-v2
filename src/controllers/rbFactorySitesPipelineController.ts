import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { websiteProspectorService } from '../services/prospecting/websiteProspectorService';
import { websiteOpportunityScoringService } from '../services/prospecting/websiteOpportunityScoringService';
import { websiteDemoFactoryService } from '../services/prospecting/websiteDemoFactoryService';
import { proposalGeneratorService } from '../services/proposalGeneratorService';
import { netlifyDeploymentService } from '../services/website/netlifyDeploymentService';
import { websiteService } from '../services/website/websiteService';

const prisma = new PrismaClient();

export const rbFactorySitesPipelineController = {
  async start(req: Request, res: Response) {
    try {
      const city = String(req.body?.city || '').trim();
      const segment = String(req.body?.segment || '').trim();
      const state = String(req.body?.state || 'MG').trim();
      if (!city || !segment) {
        return res.status(400).json({ success: false, error: 'CITY_AND_SEGMENT_REQUIRED' });
      }

      const search = await websiteProspectorService.searchProspects({
        city,
        region: city,
        state,
        niche: segment,
        maxResults: Math.min(Math.max(Number(req.body?.maxResults) || 30, 5), 50),
      });

      const prospects = await prisma.websiteProspect.findMany({
        where: { searchId: search.searchId, websiteOpportunityStatus: 'NO_WEBSITE' },
      });

      if (!prospects.length) {
        return res.status(200).json({
          success: true,
          status: 'NO_NO_WEBSITE_PROSPECT',
          searchId: search.searchId,
          totalFound: search.totalFound,
          totalQualified: search.totalQualified,
          message: 'A pesquisa terminou, mas não encontrou empresa sem site.',
        });
      }

      const ranked: Array<{ prospect: typeof prospects[number]; score: number }> = [];
      for (const prospect of prospects) {
        const result = await websiteOpportunityScoringService.calculateScore(prospect.id);
        ranked.push({ prospect, score: result.score });
      }
      ranked.sort((a, b) => b.score - a.score);

      const selected = ranked[0];
      const demo = await websiteDemoFactoryService.generateDemoForProspect(selected.prospect.id, {
        useAI: req.body?.useAI !== false,
      });
      const qualityPassed =
        demo.qualityRecommendation === 'approve' &&
        Number(demo.qualityScore || 0) >= 7.5 &&
        !(demo.qualityCriticalIssues?.length);

      await prisma.websiteProspect.update({
        where: { id: selected.prospect.id },
        data: { status: qualityPassed ? 'DEMO_READY' : 'NEEDS_REVIEW' },
      });

      return res.status(200).json({
        success: true,
        status: qualityPassed ? 'PENDING_OWNER_APPROVAL' : 'QUALITY_REVIEW_REQUIRED',
        searchId: search.searchId,
        prospect: {
          id: selected.prospect.id,
          companyName: selected.prospect.companyName,
          city: selected.prospect.city,
          segment: selected.prospect.segment,
          websiteOpportunityStatus: selected.prospect.websiteOpportunityStatus,
          opportunityScore: selected.score,
        },
        demo: {
          id: demo.demoId,
          version: demo.version,
          qualityScore: demo.qualityScore,
          qualityRecommendation: demo.qualityRecommendation,
          criticalIssues: demo.qualityCriticalIssues,
          previewUrl: `/api/websites/studio/demos/${demo.demoId}/html`,
        },
        totalProspectsWithoutWebsite: ranked.length,
      });
    } catch (error: any) {
      const message = String(error?.message || 'RB_FACTORY_PIPELINE_FAILED');
      const status = message.includes('NOT_CONFIGURED') ? 503 : 500;
      console.error('[RB Factory Sites] start:', message);
      return res.status(status).json({ success: false, error: message });
    }
  },

  async approveAndPublish(req: Request, res: Response) {
    try {
      const demoId = String(req.params.demoId || '').trim();
      if (!demoId) return res.status(400).json({ success: false, error: 'DEMO_ID_REQUIRED' });

      const demo = await prisma.websiteDemo.findUnique({
        where: { id: demoId },
        include: { prospect: true },
      });
      if (!demo || !demo.prospect) {
        return res.status(404).json({ success: false, error: 'DEMO_NOT_FOUND' });
      }
      if (!['READY', 'APPROVED'].includes(demo.status)) {
        return res.status(409).json({ success: false, error: 'DEMO_QUALITY_GATE_NOT_PASSED' });
      }

      let previewData: any = {};
      try { previewData = JSON.parse(demo.previewData || '{}'); } catch { /* fail closed below */ }
      const qualityScore = Number(previewData.qualityReview?.overallScore || 0);
      const criticalIssues = Array.isArray(previewData.qualityReview?.criticalIssues)
        ? previewData.qualityReview.criticalIssues : [];
      if (qualityScore < 7.5 || criticalIssues.length) {
        return res.status(409).json({
          success: false,
          error: 'DEMO_QUALITY_GATE_NOT_PASSED',
          qualityScore,
          criticalIssues,
        });
      }

      await prisma.websiteDemo.update({ where: { id: demo.id }, data: { status: 'APPROVED' } });
      await prisma.websiteProspect.update({
        where: { id: demo.prospectId },
        data: { status: 'APPROVED', demoStatus: 'APPROVED' },
      });

      // Repeated approval must not create duplicate proposals or leads after publication.
      const existingProject = await prisma.websiteProject.findFirst({
        where: { prospectId: demo.prospectId },
      });
      if (existingProject?.status === 'PUBLISHED' && existingProject.publicUrl) {
        return res.json({
          success: true,
          status: 'PUBLISHED',
          project: existingProject,
          publicUrl: existingProject.publicUrl,
          reusedPublication: true,
        });
      }

      const proposal = await proposalGeneratorService.generateProposal(demo.prospectId);

      const contactFilters: Array<{ phone?: string; email?: string }> = [];
      if (demo.prospect.phone) contactFilters.push({ phone: demo.prospect.phone });
      if (demo.prospect.email) contactFilters.push({ email: demo.prospect.email });
      let lead = contactFilters.length
        ? await prisma.lead.findFirst({ where: { OR: contactFilters } })
        : null;
      if (!lead) {
        lead = await prisma.lead.create({
          data: {
            name: demo.prospect.companyName,
            phone: demo.prospect.phone || null,
            email: demo.prospect.email || null,
            status: 'NEW_LEAD',
            stage: 'PROSPECTADO',
            score: demo.prospect.websiteOpportunityScore || 0,
          },
        });
      }
      await prisma.websiteProspect.update({
        where: { id: demo.prospectId },
        data: { linkedLeadId: lead.id },
      });

      const project = existingProject
        ? await prisma.websiteProject.update({
            where: { id: existingProject.id },
            data: {
              currentVersion: demo.version,
              status: existingProject.status === 'PUBLISHED' ? 'PUBLISHED' : 'PLANNING',
            },
          })
        : await prisma.websiteProject.create({
            data: {
              prospectId: demo.prospectId,
              status: 'PLANNING',
              currentVersion: demo.version,
            },
          });

      if (project.status === 'PUBLISHED' && project.publicUrl) {
        return res.json({
          success: true,
          status: 'PUBLISHED',
          proposalId: proposal.id,
          leadId: lead.id,
          project,
          publicUrl: project.publicUrl,
          reusedPublication: true,
        });
      }

      if (!netlifyDeploymentService.isConfigured()) {
        return res.status(503).json({
          success: false,
          error: 'NETLIFY_NOT_CONFIGURED',
          approvalRecorded: true,
          proposalId: proposal.id,
          leadId: lead.id,
          projectId: project.id,
          requiredEnvironment: 'NETLIFY_AUTH_TOKEN',
        });
      }

      const deployment = await netlifyDeploymentService.deployStaticSite({
        projectId: project.id,
        companyName: demo.prospect.companyName,
        html: demo.sourceCode || '',
        assets: Array.isArray(previewData.assets) ? previewData.assets : [],
        existingSiteId: project.hostingProvider === 'NETLIFY' ? project.hostingSiteId : null,
      });

      const publishedProject = await websiteService.markProjectPublished(project.id, {
        hostingProvider: 'NETLIFY',
        publicUrl: deployment.publicUrl,
        domainName: deployment.publicUrl,
        hostingSiteId: deployment.siteId,
        hostingDeployId: deployment.deployId,
      });

      return res.json({
        success: true,
        status: 'PUBLISHED',
        proposalId: proposal.id,
        leadId: lead.id,
        project: publishedProject,
        deployment,
        publicUrl: deployment.publicUrl,
      });
    } catch (error: any) {
      const message = String(error?.message || 'RB_FACTORY_PUBLISH_FAILED');
      const status = message.includes('NOT_CONFIGURED') ? 503
        : message.includes('NOT_FOUND') ? 404 : 500;
      console.error('[RB Factory Sites] approveAndPublish:', message);
      return res.status(status).json({ success: false, error: message });
    }
  },
};
