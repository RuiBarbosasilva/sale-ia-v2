import { PROSPECTING_NICHES, DELAY_BETWEEN_NICHES_MS, MAX_RESULTS_PER_NICHE } from '../../config/prospectingNiches';
// src/services/prospecting/websiteProspectorService.ts

import { prisma } from '../../modules/mercadoLivre/lib/prisma';
import { businessProspectingManager } from './providers/businessProspectingManager';
import { websiteAuditService } from '../website/websiteAuditService';
import { BusinessSearchRequest, WebsiteOpportunityStatus } from '../../types/prospecting.types';

export class WebsiteProspectorService {
  
  async searchProspects(request: BusinessSearchRequest) {
    if (request.niche === 'ALL') {
      return this.searchAllNiches(request);
    }

    const search = await prisma.websiteProspectingSearch.create({
      data: {
        region: request.region,
        state: request.state,
        city: request.city,
        country: request.country || 'BR',
        niche: request.niche,
        subniche: request.subniche,
        query: `${request.niche} ${request.city || request.region || ''}`.trim(),
        status: 'RUNNING',
        provider: 'GOOGLE_PLACES',
        startedAt: new Date(),
      },
    });

    try {
      const result = await businessProspectingManager.searchBusinesses(request);
      
      let qualifiedCount = 0;
      let createdCount = 0;
      let updatedCount = 0;
      let duplicateCount = 0;
      let auditedCount = 0;
      
      for (const business of result.businesses) {
        const enrichedBusiness = await this.enrichBusinessWithDetails(business);
        Object.assign(business, enrichedBusiness);

        const existing = await this.findDuplicate(business);
        
        if (existing) {
          duplicateCount++;
          updatedCount++;
          const websiteStatus = await this.detectWebsiteStatus(business.website);

          await prisma.websiteProspect.update({
            where: { id: existing.id },
            data: {
              companyName: business.name || existing.companyName,
              businessName: business.name || existing.businessName,
              category: business.category || existing.category,
              subcategory: business.subcategory || existing.subcategory,
              segment: business.category || existing.segment,
              city: business.city || existing.city,
              state: business.state || existing.state,
              country: existing.country || 'BR',
              address: business.address || existing.address,
              postalCode: business.postalCode || existing.postalCode,
              phone: business.phone || existing.phone,
              whatsapp: business.phone || existing.whatsapp,
              currentWebsite: business.website || existing.currentWebsite,
              googleMapsUrl: business.googleMapsUrl || existing.googleMapsUrl,
              description: business.description || existing.description,
              businessHours: business.businessHours || existing.businessHours,
              rating: business.rating ?? existing.rating,
              reviewCount: business.reviewCount ?? existing.reviewCount,
              photoCount: business.photoCount ?? existing.photoCount,
              websiteStatus: websiteStatus.hasWebsite ? 'HAS_WEBSITE' : 'NO_WEBSITE',
              websiteOpportunityStatus: websiteStatus.opportunityStatus,
              websiteOpportunityScore: websiteStatus.opportunityScore,
              priority: websiteStatus.priority,
              source: 'GOOGLE_PLACES',
              sourceUrl: business.googleMapsUrl || existing.sourceUrl,
              searchId: search.id,
              prospectingDate: new Date(),
              lastEnrichedAt: new Date(),
            },
          });

          if (websiteStatus.audit) {
            await this.persistWebsiteAudit(existing.id, websiteStatus.audit, websiteStatus.opportunityStatus, websiteStatus.opportunityScore, websiteStatus.priority);
            auditedCount++;
          }

          qualifiedCount++;
          continue;
        }

        const websiteStatus = await this.detectWebsiteStatus(business.website);
        
        const prospect = await prisma.websiteProspect.create({
          data: {
            companyName: business.name,
            businessName: business.name,
            legalName: business.legalName,
            category: business.category,
            subcategory: business.subcategory,
            segment: business.category,
            city: business.city || request.city,
            state: business.state || request.state,
            country: request.country || 'BR',
            address: business.address,
            postalCode: business.postalCode,
            phone: business.phone,
            whatsapp: business.phone,
            currentWebsite: business.website,
            googleMapsUrl: business.googleMapsUrl,
            providerPlaceId: business.providerPlaceId,
            description: business.description,
            businessHours: business.businessHours,
            rating: business.rating || 0,
            reviewCount: business.reviewCount || 0,
            photoCount: business.photoCount || 0,
            source: 'GOOGLE_PLACES',
            sourceUrl: business.googleMapsUrl,
            websiteStatus: websiteStatus.hasWebsite ? 'HAS_WEBSITE' : 'NO_WEBSITE',
            websiteOpportunityStatus: websiteStatus.opportunityStatus,
            websiteOpportunityScore: websiteStatus.opportunityScore,
            status: 'DISCOVERED',
            priority: websiteStatus.priority,
            searchId: search.id,
            prospectingDate: new Date()
          },
        });

        if (websiteStatus.audit) {
          await this.persistWebsiteAudit(prospect.id, websiteStatus.audit, websiteStatus.opportunityStatus, websiteStatus.opportunityScore, websiteStatus.priority);
          auditedCount++;
        }

        createdCount++;
        qualifiedCount++;
      }

      await prisma.websiteProspectingSearch.update({
        where: { id: search.id },
        data: {
          status: 'COMPLETED',
          totalFound: result.businesses.length,
          totalQualified: qualifiedCount,
          completedAt: new Date()
        },
      });

      return {
        searchId: search.id,
        totalFound: result.businesses.length,
        totalQualified: qualifiedCount,
        totalDuplicates: duplicateCount,
        totalCreated: createdCount,
        totalUpdated: updatedCount,
        totalAudited: auditedCount,
        nichesSearched: 1,
        failedNiches: [],
        failedNichesCount: 0
      };
    } catch (error: any) {
      await prisma.websiteProspectingSearch.update({
        where: { id: search.id },
        data: {
          status: 'FAILED',
          error: error.message,
          completedAt: new Date()
        },
      });
      throw error;
    }
  }

  private async findDuplicate(business: any) {
    // 1) O identificador do provedor é a identidade mais confiável.
    if (business.providerPlaceId) {
      const byPlaceId = await prisma.websiteProspect.findFirst({
        where: { providerPlaceId: business.providerPlaceId },
      });
      if (byPlaceId) return byPlaceId;
    }

    // 2) Telefone + cidade é mais seguro que nome + cidade.
    // Evita fundir filiais ou negócios diferentes com nomes iguais.
    const phone = String(business.phone || '').replace(/\\D/g, '');
    if (phone && business.city) {
      const byPhoneCity = await prisma.websiteProspect.findFirst({
        where: {
          city: { equals: business.city },
          phone: { not: null },
        },
      });

      if (byPhoneCity) {
        const storedPhone = String(byPhoneCity.phone || '').replace(/\\D/g, '');
        if (storedPhone && storedPhone === phone) return byPhoneCity;
      }
    }

    // 3) Site + cidade também é um identificador forte.
    const website = String(business.website || '').trim().toLowerCase();
    if (website && business.city) {
      const byWebsiteCity = await prisma.websiteProspect.findFirst({
        where: {
          city: { equals: business.city },
          currentWebsite: { not: null },
        },
      });

      if (byWebsiteCity) {
        const normalizeUrl = (value: string) =>
          value
            .trim()
            .toLowerCase()
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .replace(/\/$/, '');

        if (normalizeUrl(String(byWebsiteCity.currentWebsite || '')) === normalizeUrl(website)) {
          return byWebsiteCity;
        }
      }
    }

    // 4) Nome + endereço + cidade: fallback conservador.
    // Não usar apenas nome + cidade, pois homônimos são comuns.
    const name = String(business.name || '').trim();
    const address = String(business.address || '').trim();

    if (name && business.city && address) {
      const candidates = await prisma.websiteProspect.findMany({
        where: {
          companyName: { equals: name },
          city: { equals: business.city },
        },
        take: 10,
      });

      const normalizeText = (value: string) =>
        value
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\\u0300-\\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '');

      const normalizedAddress = normalizeText(address);

      return candidates.find((candidate) => {
        const candidateAddress = normalizeText(String(candidate.address || ''));
        return candidateAddress && candidateAddress === normalizedAddress;
      }) || null;
    }

    return null;
  }

  private async enrichBusinessWithDetails(business: any): Promise<any> {
    if (!business?.providerPlaceId) {
      return business;
    }

    try {
      const details = await businessProspectingManager.getBusinessDetails(
        business.providerPlaceId
      );

      if (!details) {
        return business;
      }

      return {
        ...business,
        city: details.city || business.city,
        state: details.state || business.state,
        postalCode: details.postalCode || business.postalCode,
        address: details.formattedAddress || business.address,
        phone: details.phone || business.phone,
        website: details.website || business.website,
        rating: details.rating ?? business.rating,
        reviewCount: details.reviewCount ?? business.reviewCount,
        businessHours: details.businessHours || business.businessHours,
        googleMapsUrl: details.googleMapsUrl || business.googleMapsUrl,
      };
    } catch (error: any) {
      console.error(
        '[RB FACTORY] Erro ao enriquecer negocio: ' + error.message
      );

      return business;
    }
  }
  private async detectWebsiteStatus(website?: string) {
    if (!website) {
      return {
        hasWebsite: false,
        opportunityStatus: 'NO_WEBSITE' as WebsiteOpportunityStatus,
        opportunityScore: 95,
        priority: 'HIGH',
        audit: null
      };
    }

    try {
      const audit = await websiteAuditService.audit(website);
      
      let status: WebsiteOpportunityStatus;
      let score: number;
      let priority: string;

      if (!audit.reachable) {
        status = 'WEBSITE_OFFLINE';
        score = 85;
        priority = 'HIGH';
      } else if (audit.auditScore < 30) {
        status = 'WEBSITE_BROKEN';
        score = 80;
        priority = 'HIGH';
      } else if (audit.auditScore < 60) {
        status = 'WEBSITE_OUTDATED';
        score = 70;
        priority = 'MEDIUM';
      } else if (audit.auditScore < 80) {
        status = 'WEBSITE_NEEDS_IMPROVEMENT';
        score = 50;
        priority = 'MEDIUM';
      } else {
        status = 'WEBSITE_GOOD';
        score = 20;
        priority = 'LOW';
      }

      return {
        hasWebsite: true,
        opportunityStatus: status,
        opportunityScore: score,
        priority,
        auditScore: audit.auditScore,
        audit
      };
    } catch {
      return {
        hasWebsite: true,
        opportunityStatus: 'ERROR' as WebsiteOpportunityStatus,
        opportunityScore: 0,
        priority: 'LOW',
        audit: null
      };
    }
  }

  private async persistWebsiteAudit(
    prospectId: string,
    audit: any,
    opportunityStatus?: WebsiteOpportunityStatus,
    opportunityScore?: number,
    priority?: string
  ) {
    await prisma.websiteProspect.update({
      where: { id: prospectId },
      data: {
        websiteHealthScore: audit.auditScore,
        ...(opportunityStatus ? { websiteOpportunityStatus: opportunityStatus } : {}),
        ...(opportunityScore !== undefined ? { websiteOpportunityScore: opportunityScore } : {}),
        ...(priority ? { priority } : {}),
        lastAuditAt: new Date()
      },
    });
  }

  async getProspects(filters: any = {}) {
    const where: any = {};
    
    if (filters.city) where.city = { contains: filters.city };
    if (filters.state) where.state = filters.state;
    if (filters.niche) where.segment = { contains: filters.niche };
    if (filters.status) where.websiteOpportunityStatus = filters.status;
    if (filters.opportunityOnly === true) {
      where.websiteOpportunityStatus = {
        in: [
          'NO_WEBSITE',
          'WEBSITE_OFFLINE',
          'WEBSITE_BROKEN',
          'WEBSITE_OUTDATED',
          'WEBSITE_NEEDS_IMPROVEMENT',
        ],
      };
    }
    if (filters.minScore) where.websiteOpportunityScore = { gte: filters.minScore };
    if (filters.priority) where.priority = filters.priority;
    if (filters.searchId) where.searchId = filters.searchId;

    return prisma.websiteProspect.findMany({
      where,
      orderBy: { websiteOpportunityScore: 'desc' },
      take: filters.limit || 50,
      include: {
        identity: true,
        demos: { orderBy: { version: 'desc' }, take: 1 },
      },
    });
  }

  async getGroupedProspects(filters: any = {}) {
    const where: any = {};

    if (filters.city) {
      where.city = {
        contains: filters.city
      };
    }

    if (filters.state) {
      where.state = {
        contains: filters.state
      };
    }

    if (filters.niche) {
      where.OR = [
        {
          segment: {
            contains: filters.niche
          }
        },
        {
          category: {
            contains: filters.niche
          }
        },
        {
          subcategory: {
            contains: filters.niche
          }
        }
      ];
    }

    if (filters.status) {
      where.websiteOpportunityStatus = filters.status;
    }

    if (filters.opportunityOnly === true) {
      where.websiteOpportunityStatus = {
        in: [
          'NO_WEBSITE',
          'WEBSITE_OFFLINE',
          'WEBSITE_BROKEN',
          'WEBSITE_OUTDATED',
          'WEBSITE_NEEDS_IMPROVEMENT',
        ],
      };
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (filters.minScore !== undefined && !Number.isNaN(Number(filters.minScore))) {
      where.websiteOpportunityScore = {
        gte: Number(filters.minScore),
      };
    }

    if (filters.searchId) {
      where.searchId = filters.searchId;
    }

    const prospects = await prisma.websiteProspect.findMany({
      where,
      orderBy: [
        { websiteOpportunityScore: 'desc' },
        { companyName: 'asc' },
      ],
    });

    const priorityOrder: Record<string, number> = {
      HIGH: 1,
      MEDIUM: 2,
      LOW: 3,
    };

    const cityMap = new Map<string, any>();

    for (const prospect of prospects) {
      const city = prospect.city || 'SEM_CIDADE';
      const niche = prospect.segment || prospect.category || 'OUTROS';
      const priority = prospect.priority || 'LOW';

      if (!cityMap.has(city)) {
        cityMap.set(city, {
          city,
          total: 0,
          niches: new Map<string, any>(),
        });
      }

      const cityGroup = cityMap.get(city);
      cityGroup.total++;

      if (!cityGroup.niches.has(niche)) {
        cityGroup.niches.set(niche, {
          niche,
          total: 0,
          priorities: new Map<string, any>(),
        });
      }

      const nicheGroup = cityGroup.niches.get(niche);
      nicheGroup.total++;

      if (!nicheGroup.priorities.has(priority)) {
        nicheGroup.priorities.set(priority, {
          priority,
          total: 0,
          prospects: [],
        });
      }

      const priorityGroup = nicheGroup.priorities.get(priority);
      priorityGroup.total++;
      priorityGroup.prospects.push(prospect);
    }

    return Array.from(cityMap.values()).map((cityGroup: any) => ({
      city: cityGroup.city,
      total: cityGroup.total,

      niches: Array.from(cityGroup.niches.values())
        .sort((a: any, b: any) => b.total - a.total)
        .map((nicheGroup: any) => ({
          niche: nicheGroup.niche,
          total: nicheGroup.total,

          priorities: Array.from(nicheGroup.priorities.values())
            .sort(
              (a: any, b: any) =>
                (priorityOrder[a.priority] || 99) -
                (priorityOrder[b.priority] || 99)
            )
            .map((priorityGroup: any) => ({
              priority: priorityGroup.priority,
              total: priorityGroup.total,
              prospects: priorityGroup.prospects,
            })),
        })),
    }));
  }
  async getStats() {
    const [
      totalProspects,
      noWebsite,
      websiteOffline,
      websiteBroken,
      websiteOutdated,
      needsImprovement,
      websiteGood,
    ] = await Promise.all([
      prisma.websiteProspect.count(),
      prisma.websiteProspect.count({ where: { websiteOpportunityStatus: 'NO_WEBSITE' } }),
      prisma.websiteProspect.count({ where: { websiteOpportunityStatus: 'WEBSITE_OFFLINE' } }),
      prisma.websiteProspect.count({ where: { websiteOpportunityStatus: 'WEBSITE_BROKEN' } }),
      prisma.websiteProspect.count({ where: { websiteOpportunityStatus: 'WEBSITE_OUTDATED' } }),
      prisma.websiteProspect.count({ where: { websiteOpportunityStatus: 'WEBSITE_NEEDS_IMPROVEMENT' } }),
      prisma.websiteProspect.count({ where: { websiteOpportunityStatus: 'WEBSITE_GOOD' } }),
    ]);

    return {
      totalProspects,
      noWebsite,
      websiteOffline,
      websiteBroken,
      websiteOutdated,
      needsImprovement,
      websiteGood
    };
  }

  async searchAllNiches(request: any) {
    console.log('[RB FACTORY] Pesquisa multi-nicho iniciada');
    console.log('[RB FACTORY] Nichos planejados: ' + PROSPECTING_NICHES.length);

    const search = await prisma.websiteProspectingSearch.create({
      data: {
        region: request.region,
        state: request.state,
        city: request.city,
        country: request.country || 'BR',
        niche: 'ALL',
        query: 'Todos os nichos em ' + (request.city || request.region || 'regiao'),
        status: 'RUNNING',
        provider: 'GOOGLE_PLACES',
        startedAt: new Date()
      }
    });

    const seenPlaceIds = new Set<string>();
    const seenKeys = new Set<string>();

    let totalFound = 0;
    let totalQualified = 0;
    let totalDuplicates = 0;
    let totalUpdated = 0;
    let totalCreated = 0;
    let totalAudited = 0;
    const failedNiches: Array<{ niche: string; error: string }> = [];

    try {
      for (let i = 0; i < PROSPECTING_NICHES.length; i++) {
        const niche = PROSPECTING_NICHES[i];

        console.log(
          '[RB FACTORY] [' +
          (i + 1) +
          '/' +
          PROSPECTING_NICHES.length +
          '] Pesquisando: ' +
          niche
        );

        try {
          const nicheRequest = {
            ...request,
            niche,
            maxResults: request.maxResults || MAX_RESULTS_PER_NICHE
          };

          const result = await businessProspectingManager.searchBusinesses(
            nicheRequest
          );

          console.log(
            '[RB FACTORY] Encontrados em ' +
            niche +
            ': ' +
            result.businesses.length
          );

          totalFound += result.businesses.length;

          for (const originalBusiness of result.businesses) {
            try {
              const rawPlaceId = originalBusiness.providerPlaceId;

              const rawKey =
                ((originalBusiness.name || '').toLowerCase().trim()) +
                '|' +
                ((originalBusiness.address || '').toLowerCase().trim()) +
                '|' +
                ((originalBusiness.phone || '').replace(/\D/g, ''));

              // ------------------------------------------------
              // DEDUPLICAÇÃO DENTRO DA PRÓPRIA PESQUISA
              // ------------------------------------------------
              if (
                rawPlaceId &&
                seenPlaceIds.has(rawPlaceId)
              ) {
                totalDuplicates++;
                continue;
              }

              if (
                rawKey !== '||' &&
                seenKeys.has(rawKey)
              ) {
                totalDuplicates++;
                continue;
              }

              // ------------------------------------------------
              // ENRIQUECIMENTO ANTES DE CONSULTAR O BANCO
              // ------------------------------------------------
              const enrichedBusiness =
                await this.enrichBusinessWithDetails(
                  originalBusiness
                );

              const business = {
                ...originalBusiness,
                ...enrichedBusiness
              };

              // Garantia: cidade/estado da pesquisa permanecem
              // quando o Google não retornar esses componentes.
              business.city =
                request.city ||
                business.city ||
                request.region;

              business.state =
                request.state ||
                business.state;

              // Registrar como visto somente depois do
              // enriquecimento/deduplicação.
              if (business.providerPlaceId) {
                seenPlaceIds.add(business.providerPlaceId);
              }

              const enrichedKey =
                ((business.name || '').toLowerCase().trim()) +
                '|' +
                ((business.address || '').toLowerCase().trim()) +
                '|' +
                ((business.phone || '').replace(/\D/g, ''));

              if (enrichedKey !== '||') {
                seenKeys.add(enrichedKey);
              }

              // ------------------------------------------------
              // DETECÇÃO DA SITUAÇÃO DO SITE
              // ------------------------------------------------
              const websiteStatus =
                await this.detectWebsiteStatus(
                  business.website
                );

              // ------------------------------------------------
              // VERIFICAÇÃO DE DUPLICIDADE NO BANCO
              // ------------------------------------------------
              const existing =
                await this.findDuplicate(business);

              if (existing) {
                // ----------------------------------------------
                // EMPRESA JÁ EXISTE → ATUALIZAR
                // ----------------------------------------------
                await prisma.websiteProspect.update({
                  where: {
                    id: existing.id
                  },
                  data: {
                    companyName:
                      business.name ||
                      existing.companyName,

                    businessName:
                      business.name ||
                      existing.businessName,

                    category:
                      business.category ||
                      existing.category ||
                      niche,

                    subcategory:
                      business.subcategory ||
                      existing.subcategory,

                    segment:
                      business.category ||
                      existing.segment ||
                      niche,

                    city:
                      request.city ||
                      business.city ||
                      existing.city,

                    state:
                      request.state ||
                      business.state ||
                      existing.state,

                    country:
                      business.country ||
                      existing.country ||
                      request.country ||
                      'BR',

                    address:
                      business.address ||
                      existing.address,

                    postalCode:
                      business.postalCode ||
                      existing.postalCode,

                    phone:
                      business.phone ||
                      existing.phone,

                    whatsapp:
                      business.phone ||
                      existing.whatsapp,

                    currentWebsite:
                      business.website ||
                      existing.currentWebsite,

                    googleMapsUrl:
                      business.googleMapsUrl ||
                      existing.googleMapsUrl,

                    description:
                      business.description ||
                      existing.description,

                    businessHours:
                      business.businessHours ||
                      existing.businessHours,

                    rating:
                      business.rating ??
                      existing.rating,

                    reviewCount:
                      business.reviewCount ??
                      existing.reviewCount,

                    photoCount:
                      business.photoCount ??
                      existing.photoCount,

                    providerPlaceId:
                      business.providerPlaceId ||
                      existing.providerPlaceId,

                    source:
                      'GOOGLE_PLACES',

                    sourceUrl:
                      business.googleMapsUrl ||
                      existing.sourceUrl,

                    websiteStatus:
                      websiteStatus.hasWebsite
                        ? 'HAS_WEBSITE'
                        : 'NO_WEBSITE',

                    websiteOpportunityStatus:
                      websiteStatus.opportunityStatus,

                    websiteOpportunityScore:
                      websiteStatus.opportunityScore,

                    priority:
                      websiteStatus.priority,

                    searchId:
                      search.id,

                    prospectingDate:
                      new Date(),

                    lastEnrichedAt:
                      new Date()
                  }
                });

                totalUpdated++;

                // ----------------------------------------------
                // AUDITORIA DO SITE EXISTENTE
                // ----------------------------------------------
                if (websiteStatus.audit) {
                  await this.persistWebsiteAudit(
                    existing.id,
                    websiteStatus.audit,
                    websiteStatus.opportunityStatus,
                    websiteStatus.opportunityScore,
                    websiteStatus.priority
                  );

                  totalAudited++;
                }

                totalQualified++;
                continue;
              }

              // ------------------------------------------------
              // NOVA EMPRESA → CREATE
              // ------------------------------------------------
              const prospect =
                await prisma.websiteProspect.create({
                  data: {
                    companyName:
                      business.name,

                    businessName:
                      business.name,

                    legalName:
                      business.legalName,

                    category:
                      business.category ||
                      niche,

                    subcategory:
                      business.subcategory,

                    segment:
                      business.category ||
                      niche,

                    city:
                      request.city ||
                      business.city ||
                      request.region,

                    state:
                      request.state ||
                      business.state ||
                      request.state,

                    country:
                      business.country ||
                      request.country ||
                      'BR',

                    address:
                      business.address,

                    postalCode:
                      business.postalCode,

                    phone:
                      business.phone,

                    whatsapp:
                      business.phone,

                    currentWebsite:
                      business.website,

                    googleMapsUrl:
                      business.googleMapsUrl,

                    providerPlaceId:
                      business.providerPlaceId,

                    description:
                      business.description,

                    businessHours:
                      business.businessHours,

                    rating:
                      business.rating || 0,

                    reviewCount:
                      business.reviewCount || 0,

                    photoCount:
                      business.photoCount || 0,

                    source:
                      'GOOGLE_PLACES',

                    sourceUrl:
                      business.googleMapsUrl,

                    websiteStatus:
                      websiteStatus.hasWebsite
                        ? 'HAS_WEBSITE'
                        : 'NO_WEBSITE',

                    websiteOpportunityStatus:
                      websiteStatus.opportunityStatus,

                    websiteOpportunityScore:
                      websiteStatus.opportunityScore,

                    status:
                      'DISCOVERED',

                    priority:
                      websiteStatus.priority,

                    searchId:
                      search.id,

                    prospectingDate:
                      new Date()
                  }
                });

              totalCreated++;

              // ------------------------------------------------
              // AUDITORIA DO SITE NOVO
              // ------------------------------------------------
              if (websiteStatus.audit) {
                await this.persistWebsiteAudit(
                  prospect.id,
                  websiteStatus.audit,
                  websiteStatus.opportunityStatus,
                  websiteStatus.opportunityScore,
                  websiteStatus.priority
                );

                totalAudited++;
              }

              totalQualified++;

            } catch (businessError: any) {
              console.error(
                '[RB FACTORY] Erro processando empresa do nicho ' +
                niche +
                ': ' +
                businessError.message
              );
            }
          }

          // ------------------------------------------------
          // DELAY ENTRE NICHOS
          // ------------------------------------------------
          if (
            i <
            PROSPECTING_NICHES.length - 1
          ) {
            await new Promise(resolve =>
              setTimeout(
                resolve,
                DELAY_BETWEEN_NICHES_MS
              )
            );
          }

        } catch (nicheError: any) {
          const errorMessage = String(nicheError?.message || 'Erro desconhecido');
          failedNiches.push({ niche, error: errorMessage });
          console.error(
            '[RB FACTORY] Erro no nicho ' +
            niche +
            ': ' +
            errorMessage
          );
        }
      }

      console.log(
        '[RB FACTORY] Duplicados removidos: ' +
        totalDuplicates
      );

      console.log(
        '[RB FACTORY] Empresas novas: ' +
        totalCreated
      );

      console.log(
        '[RB FACTORY] Empresas atualizadas: ' +
        totalUpdated
      );

      console.log(
        '[RB FACTORY] Sites auditados: ' +
        totalAudited
      );

      console.log(
        '[RB FACTORY] Total final: ' +
        totalQualified
      );

      await prisma.websiteProspectingSearch.update({
        where: {
          id: search.id
        },
        data: {
          status: failedNiches.length ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
          totalFound,
          totalQualified,
          completedAt: new Date()
        }
      });

      return {
        searchId: search.id,
        totalFound,
        totalQualified,
        totalDuplicates,
        totalCreated,
        totalUpdated,
        totalAudited,
        nichesSearched:
          PROSPECTING_NICHES.length,
        failedNiches,
        failedNichesCount: failedNiches.length
      };

    } catch (error: any) {

      await prisma.websiteProspectingSearch.update({
        where: {
          id: search.id
        },
        data: {
          status: 'FAILED',
          error: error.message,
          completedAt: new Date()
        }
      });

      throw error;
    }
  }
}

export const websiteProspectorService = new WebsiteProspectorService();









