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

      await prisma.websiteProspect.update({
        where: { id: prospectId },
        data: { demoStatus: 'READY' },
      });

      await this.logEvent(prospectId, 'DEMO_READY', 
        `Demo v${result.demo.version} gerada com score ${result.qualityReview.overallScore}`);

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
    const jobs: any[] = [];

    for (const prospectId of prospectIds) {
      const job = await prisma.websiteDemoJob.create({
        data: {
          prospectId,
          status: 'QUEUED',
          priority: 5,
        },
      });
      jobs.push(job);
    }

    return {
      queuedJobs: jobs.length,
      jobIds: jobs.map(j => j.id),
    };
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

      await prisma.websiteDemoJob.update({
        where: { id: jobId },
        data: {
          status: 'READY',
          currentStage: 'Concluido',
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