import { prisma } from '../modules/mercadoLivre/lib/prisma';
// src/controllers/prospectingController.ts

import { Request, Response } from 'express';
import { websiteProspectorService } from '../services/prospecting/websiteProspectorService';
import { websiteEnrichmentService } from '../services/prospecting/websiteEnrichmentService';
import { websiteBrandIdentityService } from '../services/prospecting/websiteBrandIdentityService';
import { websiteAutoBriefingService } from '../services/prospecting/websiteAutoBriefingService';
import { websiteOpportunityScoringService } from '../services/prospecting/websiteOpportunityScoringService';
import { websiteDemoFactoryService } from '../services/prospecting/websiteDemoFactoryService';
import { websiteAuditService } from '../services/website/websiteAuditService';
import { businessProspectingManager } from '../services/prospecting/providers/businessProspectingManager';
import { websiteOutreachService } from '../services/prospecting/websiteOutreachService';

export const prospectingController = {
  
  async health(req: Request, res: Response) {
    try {
      const providers = businessProspectingManager.getStatus();
      
      res.json({
        success: true,
        status: 'OK',
        timestamp: new Date().toISOString(),
        providers,
        database: 'CONNECTED',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        status: 'ERROR',
        error: error.message,
      });
    }
  },

  async searchProspects(req: Request, res: Response) {
    try {
      const { region, state, city, niche, subniche, maxResults } = req.body;

      if (!niche) {
        return res.status(400).json({
          success: false,
          error: 'NICHO_OBRIGATORIO: Informe o nicho para pesquisa',
        });
      }

      if (!city && !region) {
        return res.status(400).json({
          success: false,
          error: 'LOCALIZACAO_OBRIGATORIA: Informe cidade ou regiao',
        });
      }

      const result = await websiteProspectorService.searchProspects({
        region,
        state,
        city,
        niche,
        subniche,
        maxResults: maxResults || 50,
      });

      res.json({
        success: true,
        searchId: result.searchId,
        totalFound: result.totalFound,
        totalQualified: result.totalQualified,
        totalCreated: result.totalCreated ?? 0,
        totalUpdated: result.totalUpdated ?? 0,
        totalDuplicates: result.totalDuplicates ?? 0,
        totalAudited: result.totalAudited ?? 0,
      });
    } catch (error: any) {
      const statusCode = error.message.includes('NOT_CONFIGURED') ? 503 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: error.message,
        status: error.message.includes('NOT_CONFIGURED') ? 'NOT_CONFIGURED' : 'ERROR',
      });
    }
  },

  async getSearchStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const search = await prisma.websiteProspectingSearch.findUnique({
        where: { id },
        include: {
          _count: { select: { prospects: true } },
        },
      });

      if (!search) {
        return res.status(404).json({
          success: false,
          error: 'SEARCH_NOT_FOUND',
        });
      }

      res.json({
        success: true,
        search,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  async listProspects(req: Request, res: Response) {
    try {
      const { city, state, niche, status, minScore, priority, limit, searchId } = req.query;

      const prospects = await websiteProspectorService.getProspects({
        city: city as string,
        state: state as string,
        niche: niche as string,
        status: status as string,
        minScore: minScore ? parseInt(minScore as string) : undefined,
        priority: priority as string,
        searchId: searchId as string,
        limit: limit ? parseInt(limit as string) : 50,
      });

      res.json({
        success: true,
        count: prospects.length,
        prospects,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  async getProspectDetails(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const prospect = await prisma.websiteProspect.findUnique({
        where: { id },
        include: {
          identity: true,
          demos: {
            orderBy: { version: 'desc' },
            take: 5,
          },
          events: {
            orderBy: { createdAt: 'desc' },
            take: 20,
          },
          outreaches: true,
        },
      });

      if (!prospect) {
        return res.status(404).json({
          success: false,
          error: 'PROSPECT_NOT_FOUND',
        });
      }

      res.json({
        success: true,
        prospect,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  async enrichProspect(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const enrichment = await websiteEnrichmentService.enrichProspect(id);

      res.json({
        success: true,
        enrichment,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  async auditProspectWebsite(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const prospect = await prisma.websiteProspect.findUnique({
        where: { id },
      });

      if (!prospect) {
        return res.status(404).json({
          success: false,
          error: 'PROSPECT_NOT_FOUND',
        });
      }

      if (!prospect.currentWebsite) {
        return res.json({
          success: true,
          status: 'NO_WEBSITE',
          message: 'Empresa nao possui site para auditar',
        });
      }

      const audit = await websiteAuditService.audit(prospect.currentWebsite);

      await prisma.websiteProspect.update({
        where: { id },
        data: {
          websiteHealthScore: audit.auditScore,
          lastAuditAt: new Date(),
        },
      });

      res.json({
        success: true,
        audit,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  async scoreProspect(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const score = await websiteOpportunityScoringService.calculateScore(id);

      res.json({
        success: true,
        score,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  async generateDemo(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { useAI } = req.body;

      const result = await websiteDemoFactoryService.generateDemoForProspect(id, { useAI });

      res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  async generateDemosBatch(req: Request, res: Response) {
    try {
      const { prospectIds } = req.body;

      if (!Array.isArray(prospectIds) || prospectIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'PROSPECT_IDS_OBRIGATORIOS',
        });
      }

      const result = await websiteDemoFactoryService.generateDemosBatch(prospectIds);

      for (const jobId of result.jobIds) {
        setImmediate(() => websiteDemoFactoryService.processJob(jobId));
      }

      res.json({
        success: true,
        ...result,
        message: 'Demos em processamento assincrono',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  async getJobStatus(req: Request, res: Response) {
    try {
      const { jobId } = req.params;

      const job = await websiteDemoFactoryService.getJobStatus(jobId);

      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'JOB_NOT_FOUND',
        });
      }

      res.json({
        success: true,
        job,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  async getStats(req: Request, res: Response) {
    try {
      const stats = await websiteProspectorService.getStats();

      res.json({
        success: true,
        stats,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
  async prepareOutreach(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await websiteOutreachService.prepareOutreach(id);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async sendOutreach(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await websiteOutreachService.sendOutreach(id);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getWhatsAppLink(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await websiteOutreachService.getWhatsAppLink(id);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getGroupedProspects(req: Request, res: Response) {
    try {
      const filters = { city: req.query.city, state: req.query.state, niche: req.query.niche, status: req.query.status, priority: req.query.priority, minScore: req.query.minScore ? parseInt(String(req.query.minScore)) : undefined, searchId: req.query.searchId };
      const grouped = await websiteProspectorService.getGroupedProspects(filters);
      res.json({ success: true, data: grouped, totalCities: grouped.length, totalProspects: grouped.reduce((s: number, c: any) => s + c.total, 0) });
    } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
  },
};
