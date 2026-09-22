// src/services/prospecting/websiteDemoFactoryService.ts

import { prisma } from '../../modules/mercadoLivre/lib/prisma';
import { websiteService } from '../website/websiteService';
import { websiteEnrichmentService } from './websiteEnrichmentService';
import { websiteBrandIdentityService } from './websiteBrandIdentityService';
import { websiteAutoBriefingService } from './websiteAutoBriefingService';
import { websiteOpportunityScoringService } from './websiteOpportunityScoringService';

export class WebsiteDemoFactoryService {
  
  async generateDemoForProspect(prospectId: string, options: any = {}): Promise<any> {
    const prospect = await prisma.websiteProspect.findUnique({
      where: { id: prospectId },
    });

    if (!prospect) {
      throw new Error('PROSPECT_NOT_FOUND');
    }

    try {
      await this.logEvent(prospectId, 'DEMO_STARTED', 'Geracao de demo iniciada');

      let enrichment = null;
      try {
        enrichment = await websiteEnrichmentService.enrichProspect(prospectId);
      } catch (error: any) {
        console.error(`[DemoFactory] Enrichment failed:`, error.message);
      }

      let identity = null;
      try {
        identity = await websiteBrandIdentityService.extractIdentity(prospectId);
      } catch (error: any) {
        console.error(`[DemoFactory] Identity extraction failed:`, error.message);
      }

      let briefing = null;
      try {
        briefing = await websiteAutoBriefingService.generateBriefing(prospectId);
      } catch (error: any) {
        console.error(`[DemoFactory] Briefing failed:`, error.message);
      }

      const customData = {
        businessName: prospect.companyName,
        benchmarkNiche: options.niche || null,
        benchmarkModelIndex: options.modelIndex || null,
        benchmarkSelection: options.niche || options.modelIndex ? {
          niche: options.niche || null,
          index: options.modelIndex || null,
        } : null,
        segment: prospect.segment || prospect.segment || 'empresa',
        category: prospect.segment || prospect.segment,
        city: prospect.city || '',
        state: prospect.state || '',
        phone: prospect.phone || '',
        whatsapp: prospect.whatsapp || '',
        email: prospect.email || '',
        website: prospect.currentWebsite || '',
        description: prospect.description || '',
        businessHours: prospect.businessHours || '',
        address: prospect.address || '',
        
        briefing: briefing,
        identity: identity,
        enrichment: enrichment,
        
        objective: briefing?.objective || 'Presenca digital profissional',
        audience: briefing?.audience || 'Clientes locais',
        conversionGoal: briefing?.conversionGoal || 'Contato direto',
        
        contentConstraints: briefing?.contentConstraints || [],
        factualClaims: briefing?.factualClaims || [],
      };

      const result = await websiteService.generateProfessional(
        prospectId,
        customData,
        options.useAI !== false
      );

      const qualityApproved =
        result.qualityReview?.recommendation === 'approve' &&
        Number(result.qualityReview?.overallScore || 0) >= 7.5 &&
        !(result.qualityReview?.criticalIssues?.length);

      await prisma.websiteProspect.update({
        where: { id: prospectId },
        data: { demoStatus: qualityApproved ? 'READY' : 'NEEDS_REVIEW' },
      });

      await this.logEvent(
        prospectId,
        qualityApproved ? 'DEMO_READY' : 'DEMO_NEEDS_REVIEW',
        `Demo v${result.demo.version} gerada com score ${result.qualityReview.overallScore}${qualityApproved ? '' : ' e encaminhada para revisao de qualidade'}`
      );

      return {
        success: true,
        demoId: result.demo.id,
        version: result.demo.version,
        qualityScore: result.qualityReview.overallScore,
        qualityRecommendation: result.qualityReview.recommendation,
      };
    } catch (error: any) {
      await prisma.websiteProspect.update({
        where: { id: prospectId },
        data: { demoStatus: 'FAILED' },
      });

      await this.logEvent(prospectId, 'DEMO_FAILED', `Erro: ${error.message}`);

      throw error;
    }
  }

  async generateDemosBatch(prospectIds: string[]): Promise<any> {
    const uniqueIds = [...new Set(prospectIds.map(String).map(id => id.trim()).filter(Boolean))];
    if (!uniqueIds.length) throw new Error('PROSPECT_IDS_OBRIGATORIOS');

    const prospects = await prisma.websiteProspect.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true },
    });
    const existingIds = new Set(prospects.map(p => p.id));
    const missingIds = uniqueIds.filter(id => !existingIds.has(id));
    if (missingIds.length) throw new Error('PROSPECT_NOT_FOUND');

    const jobs: any[] = [];
    const newJobIds: string[] = [];
    const reusedJobIds: string[] = [];
    for (const prospectId of uniqueIds) {
      const activeJob = await prisma.websiteDemoJob.findFirst({
        where: {
          prospectId,
          status: { in: ['QUEUED', 'RESEARCHING'] },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (activeJob) {
        jobs.push(activeJob);
        reusedJobIds.push(activeJob.id);
        continue;
      }

      const job = await prisma.websiteDemoJob.create({
        data: { prospectId, status: 'QUEUED', priority: 5 },
      });
      jobs.push(job);
      newJobIds.push(job.id);
    }

    return {
      queuedJobs: newJobIds.length,
      reusedJobs: reusedJobIds.length,
      jobIds: jobs.map(j => j.id),
      newJobIds,
      reusedJobIds,
      uniqueProspects: uniqueIds.length,
    };
  }

  async recoverStaleJobs(maxAgeMinutes = 120): Promise<number> {
    const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
    const staleJobs = await prisma.websiteDemoJob.findMany({
      where: {
        status: 'RESEARCHING',
        OR: [
          { startedAt: { lt: cutoff } },
          { startedAt: null, updatedAt: { lt: cutoff } },
        ],
      },
      select: { id: true },
    });

    if (!staleJobs.length) return 0;

    await prisma.websiteDemoJob.updateMany({
      where: { id: { in: staleJobs.map(job => job.id) } },
      data: {
        status: 'QUEUED',
        progress: 0,
        currentStage: 'Recuperado apos interrupcao',
        error: null,
        startedAt: null,
        completedAt: null,
      },
    });

    return staleJobs.length;
  }

  async processJob(jobId: string): Promise<void> {
    const job = await prisma.websiteDemoJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error('JOB_NOT_FOUND');
    }

    if (job.status !== 'QUEUED' && job.status !== 'FAILED') {
      return;
    }

    try {
      await prisma.websiteDemoJob.update({
        where: { id: jobId },
        data: {
          status: 'RESEARCHING',
          currentStage: 'Enriquecendo dados',
          progress: 10,
          startedAt: new Date(),
        },
      });

      const result = await this.generateDemoForProspect(job.prospectId);
      const qualityApproved =
        result.qualityRecommendation === 'approve' &&
        Number(result.qualityScore || 0) >= 7.5;

      await prisma.websiteDemoJob.update({
        where: { id: jobId },
        data: {
          status: qualityApproved ? 'READY' : 'NEEDS_REVIEW',
          currentStage: qualityApproved ? 'Concluido' : 'Aguardando revisao de qualidade',
          progress: 100,
          demoId: result.demoId,
          completedAt: new Date(),
        },
      });
    } catch (error: any) {
      await prisma.websiteDemoJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          currentStage: 'Erro',
          error: error.message,
          completedAt: new Date(),
        },
      });
    }
  }

  async getJobStatus(jobId: string): Promise<any> {
    return prisma.websiteDemoJob.findUnique({
      where: { id: jobId },
    });
  }

  async getProspectJobs(prospectId: string): Promise<any[]> {
    return prisma.websiteDemoJob.findMany({
      where: { prospectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async logEvent(prospectId: string, type: string, description: string) {
    try {
      await prisma.websiteProspectEvent.create({
        data: {
          prospectId,
          type,
          description,
        },
      });
    } catch (error) {
      console.error('[DemoFactory] Failed to log event:', error);
    }
  }
}

export const websiteDemoFactoryService = new WebsiteDemoFactoryService();