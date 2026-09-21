import { websiteAuditService } from './websiteAuditService';
import { PrismaClient } from '@prisma/client';
import { websiteDesignService } from './websiteDesignService';
import { websiteContentService } from './websiteContentService';
import { websiteCompiler } from './websiteCompiler';
import { creatorSelector } from './creatorSelector';
import { websiteImageService } from './websiteImageService';
import { vercelDeploymentProvider } from '../deployment/vercelDeploymentProvider';
import { websiteCommercialService } from '../websiteCommercialService';

const prisma = new PrismaClient();
const PROPOSAL_SNAPSHOT_PREFIX = '<!-- RB_FACTORY_PROPOSAL_SNAPSHOT:';
const PROPOSAL_SNAPSHOT_SUFFIX = ' -->';
const DEPLOYMENT_RECOVERY_TIMEOUT_MS = 15 * 60 * 1000;

function readCommercialSnapshot(content?: string | null): { demoId: string; demoVersion: number } | null {
  if (!content) return null;
  const start = content.indexOf(PROPOSAL_SNAPSHOT_PREFIX);
  if (start < 0) return null;
  const payloadStart = start + PROPOSAL_SNAPSHOT_PREFIX.length;
  const end = content.indexOf(PROPOSAL_SNAPSHOT_SUFFIX, payloadStart);
  if (end < 0) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(content.slice(payloadStart, end), 'base64').toString('utf8')
    );
    if (!parsed?.demoId || !parsed?.demoVersion) return null;
    return { demoId: String(parsed.demoId), demoVersion: Number(parsed.demoVersion) };
  } catch {
    return null;
  }
}


export class WebsiteService {
  private async validateGeneratedAssets(assets: any): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];
    const candidates: any[] = [];
    if (assets?.hero) candidates.push({ slot: 'hero', asset: assets.hero });
    if (Array.isArray(assets?.gallery)) assets.gallery.forEach((asset: any, i: number) => candidates.push({ slot: 'gallery-' + i, asset }));
    if (assets?.services) Object.entries(assets.services).forEach(([name, asset]) => candidates.push({ slot: 'service-' + name, asset }));
    for (const candidate of candidates) {
      const result = await websiteImageService.validateImageAsset(candidate.asset);
      if (!result.valid) issues.push('Imagem ' + candidate.slot + ': ' + result.reason);
    }
    if (!assets?.hero) issues.push('Imagem hero ausente');
    if (!Array.isArray(assets?.gallery) || assets.gallery.length < 3) issues.push('Galeria com menos de 3 imagens');
    return { valid: issues.length === 0, issues };
  }


  async analyzeProspect(prospectId: string) {
    const prospect = await prisma.websiteProspect.findUnique({ where: { id: prospectId } });
    if (!prospect) throw new Error('Prospect não encontrado');
    
    const creatorType = creatorSelector.selectCreator(prospect.segment || '');
    const design = websiteDesignService.getDesignTokens(creatorType);
    
    return {
      prospectId,
      creatorType,
      design,
      recommendation: 'Gerar demo com creator ' + creatorType
    };
  }

  async generateWebsite(prospectId: string) {
    // Compatibilidade legada: toda geração comercial passa pelo pipeline
    // profissional, Image Engine e Quality Gate. Nunca gravamos READY aqui.
    const prospect = await prisma.websiteProspect.findUnique({ where: { id: prospectId } });
    if (!prospect) throw new Error('Prospect não encontrado');

    const result = await this.generateProfessional(
      prospectId,
      {
        businessName: prospect.companyName || 'Sua Empresa',
        category: prospect.segment || 'negócio',
        city: prospect.city || 'sua cidade',
        phone: prospect.phone || '',
        whatsapp: prospect.phone || '',
        email: prospect.email || '',
        website: prospect.currentWebsite || ''
      },
      true
    );

    return {
      success: true,
      demoId: result.demo.id,
      previewUrl: '/api/websites/studio/demos/' + result.demo.id + '/html',
      version: result.demo.version,
      status: result.demo.status,
      qualityScore: result.qualityReview.overallScore,
      qualityRecommendation: result.qualityReview.recommendation,
      criticalIssues: result.criticalIssues
    };
  }

  async getDemo(demoId: string) {
    const demo = await prisma.websiteDemo.findUnique({ where: { id: demoId } });
    return demo?.sourceCode || null;
  }

  async getDemoBySlug(slug: string) {
    const demo = await prisma.websiteDemo.findFirst({ 
      where: { prospect: { companyName: { contains: slug } } }
    });
    return demo?.sourceCode || null;
  }

  /**
   * MIGRADO da raiz: cria site a partir de template com dados customizados
   * (businessName, category, city, whatsapp personalizados pelo usuario)
   */
  async createSiteFromTemplate(templateId: string, prospectId: string, customData: any) {
    const template = await prisma.websiteTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new Error('Template não encontrado');

    const prospect = await prisma.websiteProspect.findUnique({ where: { id: prospectId } });
    if (!prospect) throw new Error('Prospect não encontrado');

    // Template continua sendo validado para compatibilidade comercial, mas
    // não controla mais a geração visual. A Factory usa o pipeline profissional
    // para garantir Research -> PRD -> Creative -> Images -> Quality Gate.
    const result = await this.generateProfessional(
      prospectId,
      {
        ...customData,
        businessName: customData?.businessName || prospect.companyName || 'Sua Empresa',
        category: customData?.category || prospect.segment || 'negócio',
        city: customData?.city || prospect.city || 'sua cidade',
        phone: customData?.phone || customData?.whatsapp || prospect.phone || '',
        whatsapp: customData?.whatsapp || customData?.phone || prospect.phone || '',
        templateId
      },
      customData?.useAI !== false
    );

    return {
      success: true,
      demoId: result.demo.id,
      version: result.demo.version,
      status: result.demo.status,
      templateId,
      qualityScore: result.qualityReview.overallScore,
      qualityRecommendation: result.qualityReview.recommendation,
      criticalIssues: result.criticalIssues
    };
  }
  /**
   * MIGRADO da raiz: gera proposta comercial com base em template.
   * Nota: para o fluxo de vendas via siteSalesRoutes, o service dedicado
   * proposalGeneratorService tambem possui generateProposal.
   */
  async generateProposal(prospectId: string, templateId: string) {
    const prospect = await prisma.websiteProspect.findUnique({ where: { id: prospectId } });
    const template = await prisma.websiteTemplate.findUnique({ where: { id: templateId } });

    const proposalContent = JSON.stringify({
      title: 'Proposta de Website - ' + (prospect?.companyName || ''),
      description: 'Criação de website profissional baseado no modelo ' + (template?.name || ''),
      templateId,
      templateName: template?.name || '',
      price: template?.price || 0,
      generatedAt: new Date().toISOString()
    });

    const proposal = await prisma.websiteProposal.create({
      data: {
        prospectId,
        content: proposalContent,
        status: 'DRAFT'
      }
    });

    await prisma.websiteProspect.update({
      where: { id: prospectId },
      data: { status: 'PROPOSTA_ENVIADA' }
    });

    return { success: true, proposalId: proposal.id };
  }


  private readonly CREATOR_ORDER = ['local','clinic','restaurant','professional','service','ecommerce','conversion','premium'];

  private nextCreatorType(current: string): string {
    const idx = this.CREATOR_ORDER.indexOf(current);
    return this.CREATOR_ORDER[(idx + 1) % this.CREATOR_ORDER.length];
  }

  async generateFromBriefing(prospectId: string, templateId: string | null, customData: any, useAI: boolean) {
    const prospect = await prisma.websiteProspect.findUnique({ where: { id: prospectId } });
    if (!prospect) throw new Error('Prospect não encontrado');
    if (templateId) {
      const tpl = await prisma.websiteTemplate.findUnique({ where: { id: templateId } });
      if (!tpl) throw new Error('Template não encontrado');
    }
    const businessName = customData.businessName || prospect.companyName || 'Sua Empresa';
    const category = customData.category || prospect.segment || 'negócio';
    const city = customData.city || prospect.city || 'sua cidade';
    const phone = customData.whatsapp || customData.phone || prospect.phone || '';
    const creatorType = customData.visualStyle && String(customData.visualStyle).length > 0
      ? String(customData.visualStyle)
      : creatorSelector.selectCreator(prospect.segment || '');
    const design = websiteDesignService.getDesignTokens(creatorType);
    let content = websiteContentService.generateContent(businessName, category, city, creatorType, phone, {
      headline: customData.headline,
      slogan: customData.slogan,
      description: customData.description,
      services: customData.services,
      differentials: customData.differentials,
      benefits: customData.benefits,
      faq: customData.faq,
      ctaText: customData.ctaText,
      tone: customData.tone,
      targetAudience: customData.targetAudience
    });
    let aiUsed = false;
    if (useAI) {
      try {
        const { websiteAIEnhancerService } = await import('./websiteAIEnhancerService');
        const aiContent = await websiteAIEnhancerService.enhance({ businessName, category, city, ...customData }, content, 0);
        if (aiContent) { content = { ...content, ...aiContent }; aiUsed = true; }
      } catch (e: any) { console.error('[generateFromBriefing] IA falhou, usando fallback:', e?.message); }
    }
    const html = websiteCompiler.compile(businessName, city, phone, design, content);
    const latestVersion = await prisma.websiteDemo.findFirst({
      where: { prospectId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const version = (latestVersion?.version || 0) + 1;
    const demo = await prisma.websiteDemo.create({
      data: {
        prospectId,
        templateId: templateId || undefined,
        sourceCode: html,
        status: (
          resultQualityApproved(customData)
            ? 'READY'
            : 'NEEDS_REVIEW'
        ),
        version,
        previewData: JSON.stringify({ briefing: customData, creatorType, useAI: aiUsed, generatedAt: new Date().toISOString() })
      }
    });
    await prisma.websiteProspect.update({ where: { id: prospectId }, data: { status: 'DEMO_GERADA' } });
    return { demo, aiUsed, creatorType };
  }

  async regenerateDemo(demoId: string, mode: 'content' | 'design' | 'full') {
    const demo = await prisma.websiteDemo.findUnique({ where: { id: demoId } });
    if (!demo) throw new Error('Demo não encontrada');
    let briefing: any = {}; let prevCreator: string | null = null; let useAI = false; let prevAssetsMeta: any[] = []; let prevPd: any = {};
    try {
      const pd = JSON.parse(demo.previewData || '{}');
      briefing = pd.briefing || pd || {}; prevCreator = pd.creatorType || null; useAI = !!pd.useAI; prevAssetsMeta = pd.assets || []; prevPd = pd;
    } catch {}
    const prospect = await prisma.websiteProspect.findUnique({ where: { id: demo.prospectId } });
    if (!prospect) throw new Error('Prospect não encontrado');
    const businessName = briefing.businessName || prospect.companyName || 'Sua Empresa';
    const category = briefing.category || prospect.segment || 'negócio';
    const city = briefing.city || prospect.city || 'sua cidade';
    const phone = briefing.whatsapp || briefing.phone || prospect.phone || '';
    let creatorType = prevCreator || creatorSelector.selectCreator(prospect.segment || '');
    if (mode === 'design' || mode === 'full') creatorType = this.nextCreatorType(creatorType);
    const design = websiteDesignService.getDesignTokens(creatorType);
    let content = websiteContentService.generateContent(businessName, category, city, creatorType, phone, {
      headline: briefing.headline, slogan: briefing.slogan, description: briefing.description,
      services: briefing.services, differentials: briefing.differentials, benefits: briefing.benefits,
      faq: briefing.faq, ctaText: briefing.ctaText, tone: briefing.tone, targetAudience: briefing.targetAudience
    });
    let aiUsed = false;
    if (mode === 'content' || mode === 'full') {
      try {
        const { websiteAIEnhancerService } = await import('./websiteAIEnhancerService');
        const aiContent = await websiteAIEnhancerService.enhance({ businessName, category, city, ...briefing }, content, demo.version);
        if (aiContent) { content = { ...content, ...aiContent }; aiUsed = true; }
      } catch (e: any) { console.error('[regenerateDemo] IA falhou:', e?.message); }
    }
    const { websiteImageService } = await import('./websiteImageService');
    const { websiteQualityService } = await import('./websiteQualityService');

    const prdForReview = prevPd.prd || {
      business: { businessName, category, city, objective: '' },
      content: {
        services: (content.services || []).map((s: any) => ({ title: s.title, description: s.description })),
        benefits: content.benefits,
        faq: content.faq,
        heroHeadline: content.heroHeadline
      },
      design: { visualDirection: design.visualStyle || '' }
    };

    // Demos antigas podem ter sido criadas antes do Image Engine. Se os
    // metadados estiverem ausentes, tiverem placeholders ou não tiverem
    // hero + galeria suficiente, reacquirimos imagens reais antes de compilar.
    const previousAssetsSummary = websiteImageService.analyzeAssetsMetadata(prevAssetsMeta);
    const needsImageRepair =
      !Array.isArray(prevAssetsMeta) ||
      prevAssetsMeta.length === 0 ||
      previousAssetsSummary.placeholderCount > 0 ||
      !previousAssetsSummary.hasHero ||
      previousAssetsSummary.imageCount < 4 ||
      previousAssetsSummary.realImageCount < 4;

    let assets: any;
    let assetsMeta = prevAssetsMeta;

    if (needsImageRepair) {
      console.log('[regenerateDemo] Image Engine: reparando/acquirindo imagens para demo ' + demoId);
      const imageResult = await websiteImageService.acquireAssets(
        briefing,
        prdForReview,
        prevPd.designSystem || design
      );
      assets = imageResult.assets;
      assetsMeta = imageResult.metadata;
    } else {
      assets = websiteImageService.rebuildAssets(prevAssetsMeta);
    }

    const assetValidation = await this.validateGeneratedAssets(assets);
    if (!assetValidation.valid) {
      console.warn('[regenerateDemo] Imagens ainda apresentam problemas: ' + assetValidation.issues.join(' | '));
    }

    content = {
      ...content,
      services: (content.services || []).map((s: any) => ({
        ...s,
        image: (assets.services || {})[s.title] || null
      }))
    };

    const html = websiteCompiler.compileProfessional(businessName, city, phone, design, content, assets);
    const assetsSummary = websiteImageService.analyzeAssetsMetadata(assetsMeta);
    const qualityReview = await websiteQualityService.review(html, prdForReview, design, assetsSummary);
    const version = (await prisma.websiteDemo.count({ where: { prospectId: demo.prospectId } })) + 1;
    const newDemo = await prisma.websiteDemo.create({
      data: {
        prospectId: demo.prospectId,
        templateId: demo.templateId || undefined,
        sourceCode: html,
        status: (
          qualityReview.recommendation === 'approve' &&
          Number(qualityReview.overallScore || 0) >= 7.5 &&
          !(qualityReview.criticalIssues?.length)
        ) ? 'READY' : 'NEEDS_REVIEW',
        version,
        previewData: JSON.stringify({ briefing, creatorType, useAI: aiUsed, regeneratedFrom: demoId, mode, assets: assetsMeta, assetsSummary, qualityReview, prd: prevPd.prd, designSystem: prevPd.designSystem, generatedAt: new Date().toISOString() })
      }
    });
    return newDemo;
  }

  async repairDemoImages(demoId: string) {
    return this.regenerateDemo(demoId, 'content');
  }

  async listVersionsByProspect(prospectId: string) {
    const demos = await prisma.websiteDemo.findMany({ where: { prospectId }, orderBy: { version: 'desc' } });
    return demos.map(d => ({
      id: d.id, version: d.version, status: d.status, generatedAt: d.generatedAt,
      previewUrl: `/api/websites/studio/demos/${d.id}/html`,
      exportUrl: `/api/websites/studio/demos/${d.id}/export`
    }));
  }

  /**
   * Publicação real: só marca PUBLISHED depois de o provedor entregar
   * uma URL acessível e verificável.
   */
  async publishProject(projectId: string, providerName: string = 'VERCEL') {
    const project = await prisma.websiteProject.findUnique({
      where: { id: projectId },
      include: { prospect: true }
    });
    if (!project) throw new Error('WEBSITE_PROJECT_NOT_FOUND');

    if (project.status === 'PUBLISHED' && project.publishedUrl) {
      // Publicação já confirmada: uma nova chamada também funciona como
      // reconciliação pós-publicação (ex.: mensalidade/evento falhou antes).
      try {
        await websiteCommercialService.activateSubscriptionAfterPublication(
          project.prospectId,
          project.publishedAt || new Date()
        );

        const existingEvent = await prisma.websiteProspectEvent.findFirst({
          where: {
            prospectId: project.prospectId,
            type: 'PROJECT_PUBLISHED',
            metadata: { contains: project.id }
          }
        });

        if (!existingEvent) {
          await prisma.websiteProspectEvent.create({
            data: {
              prospectId: project.prospectId,
              type: 'PROJECT_PUBLISHED',
              description: 'Website publicado e verificado automaticamente',
              metadata: JSON.stringify({
                projectId: project.id,
                provider: project.hostingProvider,
                deploymentId: project.deploymentId,
                publishedUrl: project.publishedUrl,
                demoVersion: project.currentVersion,
                verified: true,
                reconciled: true
              })
            }
          });
        }
      } catch (postPublishError: any) {
        console.error('[WebsiteService] reconciliação pós-publicação falhou:', postPublishError?.message || postPublishError);
      }
      return project;
    }

    const acceptedProposal = await prisma.websiteProposal.findFirst({
      where: { prospectId: project.prospectId, status: 'ACCEPTED' },
      orderBy: { acceptedAt: 'desc' }
    });
    if (!acceptedProposal) throw new Error('PROPOSAL_NOT_ACCEPTED');

    const commercialSnapshot = readCommercialSnapshot(acceptedProposal.content);
    if (!commercialSnapshot) throw new Error('PROPOSAL_SNAPSHOT_MISSING');

    const demo = await prisma.websiteDemo.findFirst({
      where: {
        id: commercialSnapshot.demoId,
        prospectId: project.prospectId,
        version: commercialSnapshot.demoVersion,
        status: { in: ['READY', 'APPROVED'] }
      }
    });
    if (!demo) throw new Error('APPROVED_DEMO_VERSION_NOT_FOUND');

    if (project.currentVersion !== demo.version) {
      throw new Error('APPROVED_DEMO_VERSION_MISMATCH');
    }

    let previewData: any = {};
    try { previewData = JSON.parse(demo.previewData || '{}'); } catch {}

    const qualityReview = previewData.qualityReview;
    if (
      !qualityReview ||
      qualityReview.recommendation !== 'approve' ||
      Number(qualityReview.overallScore || 0) < 7.5 ||
      (qualityReview.criticalIssues || []).length > 0
    ) {
      throw new Error('DEMO_QUALITY_GATE_FAILED');
    }

    if (providerName.toUpperCase() !== 'VERCEL') {
      throw new Error('DEPLOYMENT_PROVIDER_NOT_SUPPORTED');
    }

    if (!vercelDeploymentProvider.isConfigured()) {
      await prisma.websiteProject.update({
        where: { id: projectId },
        data: { deploymentStatus: 'FAILED' }
      });
      throw new Error('VERCEL_TOKEN_NOT_CONFIGURED');
    }

    // Recuperação segura de um deployment abandonado: nunca liberamos um
    // DEPLOYING antigo apenas pelo relógio, pois o deployment externo pode
    // continuar vivo. Se já temos o deploymentId, consultamos a Vercel e
    // reconciliamos o estado real antes de permitir uma nova tentativa.
    if (project.deploymentStatus === 'DEPLOYING' && project.deploymentStartedAt) {
      const cutoff = new Date(Date.now() - DEPLOYMENT_RECOVERY_TIMEOUT_MS);
      if (project.deploymentStartedAt < cutoff) {
        if (!project.deploymentId) {
          throw new Error('DEPLOYMENT_RECOVERY_REQUIRED');
        }

        const recovered = await vercelDeploymentProvider.getDeployment(project.deploymentId);

        if (!recovered) {
          const released = await prisma.websiteProject.updateMany({
            where: {
              id: projectId,
              status: 'CODING',
              deploymentStatus: 'DEPLOYING',
              deploymentStartedAt: project.deploymentStartedAt,
              deploymentId: project.deploymentId
            },
            data: {
              deploymentStatus: 'FAILED',
              status: 'REVIEW',
              deploymentStartedAt: null
            }
          });
          if (released.count === 0) {
            const current = await prisma.websiteProject.findUnique({ where: { id: projectId } });
            if (current?.status === 'PUBLISHED' && current.publishedUrl) return current;
          }
        } else if (recovered.state === 'READY' && recovered.verified && recovered.url) {
          const publishedAt = new Date();
          const reconciled = await prisma.websiteProject.updateMany({
            where: {
              id: projectId,
              status: 'CODING',
              deploymentStatus: 'DEPLOYING',
              deploymentStartedAt: project.deploymentStartedAt,
              deploymentId: project.deploymentId
            },
            data: {
              status: 'PUBLISHED',
              hostingProvider: recovered.provider,
              deploymentId: recovered.deploymentId,
              deploymentStatus: 'READY',
              deploymentStartedAt: null,
              publishedUrl: recovered.url,
              publishedAt
            }
          });
          if (reconciled.count > 0) {
            try {
              await websiteCommercialService.activateSubscriptionAfterPublication(
                project.prospectId,
                publishedAt
              );
              const existingEvent = await prisma.websiteProspectEvent.findFirst({
                where: {
                  prospectId: project.prospectId,
                  type: 'PROJECT_PUBLISHED',
                  metadata: { contains: project.id }
                }
              });
              if (!existingEvent) {
                await prisma.websiteProspectEvent.create({
                  data: {
                    prospectId: project.prospectId,
                    type: 'PROJECT_PUBLISHED',
                    description: 'Website publicado e reconciliado automaticamente',
                    metadata: JSON.stringify({
                      projectId: project.id,
                      provider: recovered.provider,
                      deploymentId: recovered.deploymentId,
                      publishedUrl: recovered.url,
                      demoVersion: project.currentVersion,
                      verified: true,
                      reconciled: true
                    })
                  }
                });
              }
            } catch (postRecoveryError: any) {
              console.error('[WebsiteService] reconciliação pós-recovery falhou:', postRecoveryError?.message || postRecoveryError);
            }
          }
          const current = await prisma.websiteProject.findUnique({ where: { id: projectId } });
          if (current?.status === 'PUBLISHED' && current.publishedUrl) return current;
        } else if (['ERROR', 'CANCELED', 'CANCELLED'].includes(recovered.state)) {
          await prisma.websiteProject.updateMany({
            where: {
              id: projectId,
              status: 'CODING',
              deploymentStatus: 'DEPLOYING',
              deploymentStartedAt: project.deploymentStartedAt,
              deploymentId: project.deploymentId
            },
            data: {
              deploymentStatus: 'FAILED',
              status: 'REVIEW',
              deploymentStartedAt: null
            }
          });
        } else {
          throw new Error('DEPLOYMENT_RECOVERY_PENDING');
        }
      }
    }

    // Lock atomico de publicação: evita dois cliques/webhooks iniciarem
    // deployments simultâneos para o mesmo projeto.
    const claim = await prisma.websiteProject.updateMany({
      where: {
        id: projectId,
        status: { not: 'PUBLISHED' },
        deploymentStatus: { not: 'DEPLOYING' }
      },
      data: {
        deploymentStatus: 'DEPLOYING',
        deploymentStartedAt: new Date(),
        status: 'CODING',
        currentVersion: demo.version
      }
    });

    if (claim.count === 0) {
      const current = await prisma.websiteProject.findUnique({ where: { id: projectId } });
      if (current?.status === 'PUBLISHED' && current.publishedUrl) return current;
      throw new Error('DEPLOYMENT_ALREADY_IN_PROGRESS');
    }

    let deployment;
    try {
      deployment = await vercelDeploymentProvider.deploy({
        projectName: project.prospect.companyName,
        html: demo.sourceCode || '',
        target: 'production',
        metadata: {
          saleIaProjectId: project.id,
          prospectId: project.prospectId,
          demoVersion: String(demo.version)
        }
      });
    } catch (error: any) {
      await prisma.websiteProject.update({
        where: { id: projectId },
        data: {
          deploymentStatus: 'FAILED',
          deploymentStartedAt: null,
          status: 'REVIEW'
        }
      }).catch(() => undefined);
      throw error;
    }

    if (!deployment?.verified || !deployment?.url) {
      await prisma.websiteProject.update({
        where: { id: projectId },
        data: { deploymentStatus: 'FAILED', deploymentStartedAt: null, status: 'REVIEW' }
      }).catch(() => undefined);
      throw new Error('DEPLOYMENT_URL_NOT_VERIFIED');
    }

    const publishedAt = new Date();

    // Persistimos o deploymentId imediatamente após o retorno do provedor.
    // Assim, se a gravação final falhar ou o processo reiniciar, a próxima
    // execução consegue consultar a Vercel e reconciliar o deployment real.
    let deploymentIdPersisted = false;
    let lastDeploymentIdPersistenceError: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const persisted = await prisma.websiteProject.updateMany({
          where: {
            id: projectId,
            status: 'CODING',
            deploymentStatus: 'DEPLOYING'
          },
          data: {
            deploymentId: deployment.deploymentId,
            hostingProvider: deployment.provider
          }
        });
        if (persisted.count === 1) {
          deploymentIdPersisted = true;
          break;
        }
      } catch (error: any) {
        lastDeploymentIdPersistenceError = error;
      }
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
    }

    if (!deploymentIdPersisted) {
      throw new Error(
        'PUBLICATION_STATE_SYNC_FAILED:' +
        (lastDeploymentIdPersistenceError?.message || 'DEPLOYMENT_ID_PERSISTENCE_FAILED')
      );
    }

    // A Vercel deployment that already reached READY is an external fact.
    // Persist that fact with bounded retries so a transient DB failure does
    // not leave the project permanently in DEPLOYING after the site is live.
    let published;
    let lastPersistenceError: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        published = await prisma.websiteProject.update({
          where: { id: projectId },
          data: {
            status: 'PUBLISHED',
            hostingProvider: deployment.provider,
            deploymentId: deployment.deploymentId,
            deploymentStatus: 'READY',
            deploymentStartedAt: null,
            publishedUrl: deployment.url,
            publishedAt
          }
        });
        break;
      } catch (error: any) {
        lastPersistenceError = error;
        if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
      }
    }

    if (!published) {
      // Keep DEPLOYING: this is safer than marking FAILED, because the
      // provider has already confirmed a real production deployment. The
      // recorded deploymentStartedAt lets the recovery/reconciliation flow
      // identify the stale state without falsely declaring the site failed.
      throw new Error(
        'PUBLICATION_STATE_SYNC_FAILED:' +
        (lastPersistenceError?.message || 'DATABASE_UPDATE_FAILED')
      );
    }

    // A publicação é um fato externo já confirmado pelo provedor. Falhas
    // posteriores (assinatura/evento) não podem transformar um site publicado
    // em REVIEW nem apagar o estado real de publicação.
    try {
      await websiteCommercialService.activateSubscriptionAfterPublication(
        project.prospectId,
        publishedAt
      );

      await prisma.websiteProspectEvent.create({
        data: {
          prospectId: project.prospectId,
          type: 'PROJECT_PUBLISHED',
          description: 'Website publicado e verificado automaticamente',
          metadata: JSON.stringify({
            projectId,
            provider: deployment.provider,
            deploymentId: deployment.deploymentId,
            publishedUrl: deployment.url,
            demoVersion: demo.version,
            verified: deployment.verified
          })
        }
      });
    } catch (postPublishError: any) {
      console.error('[WebsiteService] pós-publicação falhou sem reverter PUBLISHED:', postPublishError?.message || postPublishError);
    }

    return published;
  }

  async preparePublication(demoId: string, domainName?: string) {
    const demo = await prisma.websiteDemo.findUnique({ where: { id: demoId } });
    if (!demo) throw new Error('Demo não encontrada');
    if (!['READY', 'APPROVED'].includes(demo.status)) {
      throw new Error('DEMO_NOT_PUBLISHABLE');
    }

    // Regra comercial da Factory: a publicação deve usar exatamente a demo
    // que foi vinculada à proposta aceita, nunca uma versão posterior.
    const acceptedProposal = await prisma.websiteProposal.findFirst({
      where: { prospectId: demo.prospectId, status: 'ACCEPTED' },
      orderBy: { acceptedAt: 'desc' }
    });
    if (!acceptedProposal) {
      throw new Error('PROPOSAL_NOT_ACCEPTED');
    }

    const commercialSnapshot = readCommercialSnapshot(acceptedProposal.content);
    if (
      !commercialSnapshot ||
      commercialSnapshot.demoId !== demo.id ||
      commercialSnapshot.demoVersion !== demo.version
    ) {
      throw new Error('APPROVED_DEMO_VERSION_MISMATCH');
    }

    const existing = await prisma.websiteProject.findFirst({ where: { prospectId: demo.prospectId } });
    if (existing) {
      if (existing.currentVersion !== demo.version && existing.status !== 'PUBLISHED') {
        throw new Error('APPROVED_DEMO_VERSION_MISMATCH');
      }
      if (existing.status === 'PUBLISHED' && existing.publishedUrl) {
        return existing;
      }
      return prisma.websiteProject.update({
        where: { id: existing.id },
        data: {
          domainName: domainName || existing.domainName,
          status: existing.status === 'PUBLISHED' ? existing.status : 'PLANNING',
          currentVersion: existing.currentVersion,
          deploymentStatus: existing.deploymentStatus || 'NOT_DEPLOYED'
        }
      });
    }
    try {
      return await prisma.websiteProject.create({
        data: {
          prospectId: demo.prospectId,
          status: 'PLANNING',
          domainName: domainName || null,
          currentVersion: demo.version,
          deploymentStatus: 'NOT_DEPLOYED'
        }
      });
    } catch (error: any) {
      // O índice único por prospectId protege contra duas preparações simultâneas.
      // Se outra requisição venceu a corrida, reutilizamos o projeto vencedor.
      if (error?.code === 'P2002') {
        const winner = await prisma.websiteProject.findFirst({
          where: { prospectId: demo.prospectId }
        });
        if (winner) {
          return prisma.websiteProject.update({
            where: { id: winner.id },
            data: {
              domainName: domainName || winner.domainName,
              status: winner.status === 'PUBLISHED' ? winner.status : 'PLANNING',
              currentVersion: winner.currentVersion,
              deploymentStatus: winner.deploymentStatus || 'NOT_DEPLOYED'
            }
          });
        }
      }
      throw error;
    }
  }

  async markProjectPublished(
    _projectId: string,
    _details: { domainName?: string; hostingProvider?: string; sourceCodeRepo?: string }
  ) {
    throw new Error('REAL_DEPLOYMENT_REQUIRED');
  }


  /**
   * Pipeline completo: Research -> PRD -> Creative -> Generate -> Review -> Improve
   */
  async generateProfessional(prospectId: string, briefing: any, useAI: boolean = true): Promise<{
    demo: any; research: any; prd: any; designSystem: any;
    qualityReview: any; improvementCycles: number; assets: any[];
    assetsSummary: any; criticalIssues: string[];
  }> {
    const prospect = await prisma.websiteProspect.findUnique({ where: { id: prospectId } });
    if (!prospect) throw new Error('Prospect não encontrado');
    console.log(`[Pipeline] Iniciando pipeline profissional para ${prospect.companyName}`);

    const { websiteResearchService } = await import('./websiteResearchService');
    const { websitePRDService } = await import('./websitePRDService');
    const { websiteCreativeDirectorService } = await import('./websiteCreativeDirectorService');
    const { websiteQualityService } = await import('./websiteQualityService');

    const research = await websiteResearchService.analyze(briefing, prospect);
    const prd = await websitePRDService.generate(briefing, research, prospect);
    const designSystem = await websiteCreativeDirectorService.direct(prd, research, briefing);

    const businessName = briefing.businessName || prospect.companyName || 'Sua Empresa';
    const category = briefing.category || prospect.segment || 'negócio';
    const city = briefing.city || prospect.city || 'sua cidade';
    const phone = briefing.whatsapp || briefing.phone || prospect.phone || '';
    const creatorType = designSystem.visualStyle.toLowerCase().split(' ')[0] || creatorSelector.selectCreator(prospect.segment || '');

    let content = websiteContentService.generateContent(businessName, category, city, creatorType, phone, {
      headline: prd.content.heroHeadline,
      slogan: briefing.slogan,
      description: prd.content.services.map((s: any) => s.description).join(' '),
      services: prd.content.services.map((s: any) => s.title),
      differentials: prd.content.benefits.map((b: any) => b.title),
      benefits: prd.content.benefits,
      faq: prd.content.faq,
      ctaText: prd.content.primaryCTA,
      tone: briefing.tone,
      targetAudience: prd.business.targetAudience
    });

    const { websiteImageService } = await import('./websiteImageService');
    const imageResult = await websiteImageService.acquireAssets(briefing, prd, designSystem);
    const assets = imageResult.assets;
    const assetValidation = await this.validateGeneratedAssets(assets);
    if (!assetValidation.valid) {
      console.warn('[Pipeline] Algumas imagens não passaram na validação final: ' + assetValidation.issues.join(' | '));
    }
    content = { ...content, services: (content.services || []).map((s: any) => ({ ...s, image: (assets.services || {})[s.title] || null })) };
    console.log('[Pipeline] Imagens: ' + imageResult.metadata.length + ' assets | providers: ' + [...new Set(imageResult.metadata.map((m: any) => m.provider))].join(', '));

    let html = websiteCompiler.compileProfessional(businessName, city, phone, designSystem, content, assets);
    let assetsSummary = websiteImageService.analyzeAssetsMetadata(imageResult.metadata);
    let qualityReview = await websiteQualityService.review(html, prd, designSystem, assetsSummary);
    let improvementCycles = 0;
    const MAX_CYCLES = 2;

    while (qualityReview.recommendation === 'improve' && improvementCycles < MAX_CYCLES && useAI) {
      improvementCycles++;
      console.log(`[Pipeline] Ciclo de melhoria ${improvementCycles}/${MAX_CYCLES}`);
      try {
        const { websiteAIEnhancerService } = await import('./websiteAIEnhancerService');
        const aiContent = await websiteAIEnhancerService.enhance(
          { ...briefing, businessName, category, city, improvements: qualityReview.improvements },
          content,
          improvementCycles
        );
        if (aiContent) {
          content = { ...content, ...aiContent };
          // Se a falha envolve imagens/assets, reacquire antes de reavaliar.
          // Isso evita que o loop apenas reescreva texto enquanto mantém placeholders.
          const imageIssues = (qualityReview.criticalIssues || []).some((issue: string) =>
            /imagem|hero|placeholder|asset|foto/i.test(issue)
          ) || assetsSummary.placeholderCount > 0 || !assetsSummary.hasHero;
          let cycleAssets = assets;
          let cycleAssetsSummary = assetsSummary;
          if (imageIssues) {
            try {
              const repaired = await websiteImageService.acquireAssets(
                { ...briefing, businessName, category, city },
                prd,
                designSystem
              );
              cycleAssets = repaired.assets;
              cycleAssetsSummary = websiteImageService.analyzeAssetsMetadata(repaired.metadata);
              content = {
                ...content,
                services: (content.services || []).map((s: any) => ({
                  ...s,
                  image: (cycleAssets.services || {})[s.title] || null
                }))
              };
              assetsSummary = cycleAssetsSummary;
            } catch (imageError: any) {
              console.warn('[Pipeline] Reparacao de imagens falhou:', imageError?.message);
            }
          }
          html = websiteCompiler.compileProfessional(businessName, city, phone, designSystem, content, cycleAssets);
          qualityReview = await websiteQualityService.review(html, prd, designSystem, cycleAssetsSummary);
        } else { break; }
      } catch (e: any) {
        console.error('[Pipeline] Melhoria falhou:', e?.message);
        break;
      }
    }

    const latestVersion = await prisma.websiteDemo.findFirst({
      where: { prospectId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const version = (latestVersion?.version || 0) + 1;
    const demo = await prisma.websiteDemo.create({
      data: {
        prospectId,
        sourceCode: html,
        status: (
          qualityReview.recommendation === 'approve' &&
          Number(qualityReview.overallScore || 0) >= 7.5 &&
          !(qualityReview.criticalIssues?.length)
        ) ? 'READY' : 'NEEDS_REVIEW',
        version,
        previewData: JSON.stringify({
          briefing, research, prd, designSystem, qualityReview, assets: imageResult.metadata, assetsSummary: assetsSummary,
          improvementCycles, creatorType, useAI, pipeline: 'professional',
          generatedAt: new Date().toISOString()
        })
      }
    });

    await prisma.websiteProspect.update({ where: { id: prospectId }, data: { status: 'DEMO_GERADA' } });
    console.log(`[Pipeline] Concluído! Score: ${qualityReview.overallScore}, Ciclos: ${improvementCycles}`);
    return { demo, research, prd, designSystem, qualityReview, improvementCycles, assets: imageResult.metadata, assetsSummary: assetsSummary, criticalIssues: qualityReview.criticalIssues || [] };
  }


  /**
   * Auto Improvement Loop (P9): ate 3 ciclos tentando resolver critical issues.
   * Threshold: score < 7.5 OU criticalIssues.length > 0
   * Nao loop infinito: retorna apos 3 ciclos mesmo se nao atingir threshold.
   */
  async improveDemo(demoId: string, maxCycles: number = 3): Promise<{
    success: boolean; demoId: string; cycles: number;
    scoreBefore: number; scoreAfter: number; improvements: string[];
  }> {
    const demo = await prisma.websiteDemo.findUnique({ where: { id: demoId } });
    if (!demo) throw new Error('Demo nao encontrada');

    let pd: any = {};
    try { pd = JSON.parse(demo.previewData || '{}'); } catch {}
    const briefing = pd.briefing || {};
    const prd = pd.prd;
    const designSystem = pd.designSystem;

    if (!prd || !designSystem) {
      return { success: false, demoId, cycles: 0, scoreBefore: 0, scoreAfter: 0, improvements: [] };
    }

    const prospect = await prisma.websiteProspect.findUnique({ where: { id: demo.prospectId } });
    if (!prospect) throw new Error('Prospect nao encontrado');

    const businessName = briefing.businessName || prospect.companyName || 'Sua Empresa';
    const category = briefing.category || prospect.segment || 'negocio';
    const city = briefing.city || prospect.city || 'sua cidade';
    const phone = briefing.whatsapp || briefing.phone || prospect.phone || '';

    let currentHtml = demo.sourceCode || '';
    let currentReview = await (async () => {
      const { websiteImageService } = await import('./websiteImageService');
      const { websiteQualityService } = await import('./websiteQualityService');
      const assetsSummary = websiteImageService.analyzeAssetsMetadata(pd.assets || []);
      return websiteQualityService.review(currentHtml, prd, designSystem, assetsSummary);
    })();

    const scoreBefore = currentReview.overallScore;
    const improvements: string[] = [];
    let cycles = 0;

    for (let i = 1; i <= maxCycles; i++) {
      const needsImprovement = currentReview.overallScore < 7.5 || (currentReview.criticalIssues && currentReview.criticalIssues.length > 0);
      if (!needsImprovement) break;

      cycles++;
      console.log(`[Improve] Ciclo ${cycles}/${maxCycles} | score=${currentReview.overallScore} | issues=${(currentReview.criticalIssues || []).length}`);
      const focus = (currentReview.criticalIssues || []).slice(0, 3).join(' | ') || (currentReview.improvements || []).slice(0, 2).join(' | ') || 'melhorar qualidade geral';
      improvements.push(`Ciclo ${cycles}: foco em [${focus}]`);

      // Gerar nova versao usando regenerateDemo existente (herda briefing + design)
      try {
        const newDemo = await this.regenerateDemo(demoId, 'full');
        currentHtml = newDemo.sourceCode;
        const { websiteImageService } = await import('./websiteImageService');
        const { websiteQualityService } = await import('./websiteQualityService');
        let newPd: any = {};
        try { newPd = JSON.parse(newDemo.previewData || '{}'); } catch {}
        const assetsSummary = websiteImageService.analyzeAssetsMetadata(newPd.assets || []);
        const newReview = await websiteQualityService.review(currentHtml, prd, designSystem, assetsSummary);
        if (newReview.overallScore >= currentReview.overallScore) {
          currentReview = newReview;
          demoId = newDemo.id;
        } else {
          console.log(`[Improve] nova versao piorou (${newReview.overallScore} < ${currentReview.overallScore}), mantendo anterior`);
          await prisma.websiteDemo.update({ where: { id: newDemo.id }, data: { status: 'SUPERSEDED' } });
          break;
        }
      } catch (e: any) {
        console.error('[Improve] ciclo falhou:', e?.message);
        break;
      }
    }

    return {
      success: true,
      demoId,
      cycles,
      scoreBefore: Math.round(scoreBefore * 10) / 10,
      scoreAfter: Math.round(currentReview.overallScore * 10) / 10,
      improvements
    };
  }

  /**
   * History rico (P10): retorna todas as versoes de um prospect com metadata.
   */
  async getHistoryByProspect(prospectId: string): Promise<any[]> {
    const demos = await prisma.websiteDemo.findMany({
      where: { prospectId },
      orderBy: { version: 'desc' }
    });
    return demos.map(d => {
      let pd: any = {};
      try { pd = JSON.parse(d.previewData || '{}'); } catch {}
      const qualityReview = pd.qualityReview || null;
      const assetsMeta = Array.isArray(pd.assets) ? pd.assets : [];
      const realImages = assetsMeta.filter((m: any) => m.provider !== 'local-placeholder' && m.provider !== 'client-provided').length;
      const placeholders = assetsMeta.filter((m: any) => m.provider === 'local-placeholder').length;
      return {
        id: d.id,
        version: d.version,
        status: d.status,
        generatedAt: d.generatedAt,
        score: qualityReview?.overallScore || null,
        recommendation: qualityReview?.recommendation || null,
        criticalIssues: (qualityReview?.criticalIssues || []).length,
        assetsTotal: assetsMeta.length,
        assetsReal: realImages,
        assetsPlaceholders: placeholders,
        improvementCycles: pd.improvementCycles || 0,
        regeneratedFrom: pd.regeneratedFrom || null,
        mode: pd.mode || 'initial',
        previewUrl: `/api/websites/studio/demos/${d.id}/html`,
        exportUrl: `/api/websites/studio/demos/${d.id}/export`,
        detailsUrl: `/api/websites/studio/demos/${d.id}/details`
      };
    });
  }

  /**
   * Preview indicators (P11): metadata rica da demo para exibir no Studio.
   */
  async getDemoDetails(demoId: string): Promise<any> {
    const demo = await prisma.websiteDemo.findUnique({
      where: { id: demoId },
      include: { prospect: true }
    });
    if (!demo) throw new Error('Demo nao encontrada');
    let pd: any = {};
    try { pd = JSON.parse(demo.previewData || '{}'); } catch {}
    const qualityReview = pd.qualityReview || null;
    const assetsMeta = Array.isArray(pd.assets) ? pd.assets : [];
    return {
      id: demo.id,
      version: demo.version,
      status: demo.status,
      generatedAt: demo.generatedAt,
      prospectName: demo.prospect?.companyName || '',
      score: qualityReview?.overallScore || null,
      recommendation: qualityReview?.recommendation || null,
      strengths: qualityReview?.strengths || [],
      weaknesses: qualityReview?.weaknesses || [],
      criticalIssues: qualityReview?.criticalIssues || [],
      improvements: qualityReview?.improvements || [],
      assets: {
        total: assetsMeta.length,
        real: assetsMeta.filter((m: any) => m.provider !== 'local-placeholder' && m.provider !== 'client-provided').length,
        placeholders: assetsMeta.filter((m: any) => m.provider === 'local-placeholder').length,
        providers: [...new Set(assetsMeta.map((m: any) => m.provider))]
      },
      designSystem: pd.designSystem ? {
        visualStyle: pd.designSystem.visualStyle,
        primaryColor: pd.designSystem.colors?.primary,
        secondaryColor: pd.designSystem.colors?.secondary,
        typography: pd.designSystem.typography?.fontFamily
      } : null,
      improvementCycles: pd.improvementCycles || 0,
      mode: pd.mode || 'initial'
    };
  }

  /**
   * Rollback seguro: criar NOVA versao a partir de uma versao anterior (nao apaga nada).
   */
  async rollbackTo(demoId: string): Promise<{ success: boolean; newDemoId: string; newVersion: number }> {
    const sourceDemo = await prisma.websiteDemo.findUnique({ where: { id: demoId } });
    if (!sourceDemo) throw new Error('Demo origem nao encontrada');
    const latestVersion = await prisma.websiteDemo.findFirst({
      where: { prospectId: sourceDemo.prospectId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const newVersion = (latestVersion?.version || 0) + 1;
    let pd: any = {};
    try { pd = JSON.parse(sourceDemo.previewData || '{}'); } catch {}
    pd.rolledBackFrom = demoId;
    pd.mode = 'rollback';
    pd.rolledBackAt = new Date().toISOString();
    const newDemo = await prisma.websiteDemo.create({
      data: {
        prospectId: sourceDemo.prospectId,
        templateId: sourceDemo.templateId || undefined,
        sourceCode: sourceDemo.sourceCode,
        status: sourceDemo.status,
        version: newVersion,
        previewData: JSON.stringify(pd)
      }
    });
    return { success: true, newDemoId: newDemo.id, newVersion };
  }
}


// Compatibility guard for the legacy generate() path. The professional pipeline
// performs the authoritative quality gate; this helper only prevents an unknown
// quality payload from being marked READY.
function resultQualityApproved(data: any): boolean {
  const review = data?.qualityReview;
  return !!review && review.recommendation === 'approve' && Number(review.overallScore || 0) >= 7.5 && !(review.criticalIssues?.length);
}

export const websiteService = new WebsiteService();















