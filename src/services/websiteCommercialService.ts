import { prisma } from '../modules/mercadoLivre/lib/prisma';

const PROPOSAL_SNAPSHOT_PREFIX = '<!-- RB_FACTORY_PROPOSAL_SNAPSHOT:';
const PROPOSAL_SNAPSHOT_SUFFIX = ' -->';

type ProposalSnapshot = {
  version: number;
  planId: string;
  planCode: string;
  planName: string;
  projectPrice: number;
  monthlyPrice: number;
  demoVersion: number;
  qualityScore: number;
  paymentTerms: string;
  monthlyStartRule: string;
  generatedAt: string;
};

function readProposalSnapshot(content?: string | null): ProposalSnapshot | null {
  if (!content) return null;
  const start = content.indexOf(PROPOSAL_SNAPSHOT_PREFIX);
  if (start < 0) return null;
  const payloadStart = start + PROPOSAL_SNAPSHOT_PREFIX.length;
  const end = content.indexOf(PROPOSAL_SNAPSHOT_SUFFIX, payloadStart);
  if (end < 0) return null;

  try {
    const json = Buffer.from(content.slice(payloadStart, end), 'base64').toString('utf8');
    const parsed = JSON.parse(json) as Partial<ProposalSnapshot>;
    if (!parsed.planId || !parsed.planCode || !parsed.demoVersion) return null;
    return {
      version: Number(parsed.version || 1),
      planId: String(parsed.planId),
      planCode: String(parsed.planCode),
      planName: String(parsed.planName || parsed.planCode),
      projectPrice: Number(parsed.projectPrice || 0),
      monthlyPrice: Number(parsed.monthlyPrice || 0),
      demoVersion: Number(parsed.demoVersion),
      qualityScore: Number(parsed.qualityScore || 0),
      paymentTerms: String(parsed.paymentTerms || ''),
      monthlyStartRule: String(parsed.monthlyStartRule || ''),
      generatedAt: String(parsed.generatedAt || ''),
    };
  } catch {
    return null;
  }
}

export class WebsiteCommercialService {
  async activateSubscriptionAfterPublication(prospectId: string, publishedAt: Date = new Date()) {
    const prospect = await prisma.websiteProspect.findUnique({
      where: { id: prospectId },
      include: { selectedPlan: true }
    });

    if (!prospect) throw new Error('WEBSITE_PROSPECT_NOT_FOUND');
    if (!prospect.selectedPlan) throw new Error('WEBSITE_PLAN_REQUIRED');

    const monthlyPrice = Number(prospect.selectedPlan.monthlyPrice || 0);
    if (monthlyPrice <= 0) return null;

    const existing = await prisma.websiteSubscription.findFirst({
      where: {
        prospectId,
        planId: prospect.selectedPlan.id,
        status: { in: ['PENDING', 'ACTIVE'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    const nextBillingDate = new Date(publishedAt);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

    if (existing) {
      if (existing.status === 'ACTIVE') return existing;

      return prisma.websiteSubscription.update({
        where: { id: existing.id },
        data: {
          status: 'ACTIVE',
          startDate: publishedAt,
          nextBillingDate,
          amount: monthlyPrice,
          billingDay: publishedAt.getDate(),
          notes: 'Mensalidade ativada após publicação do site.'
        }
      });
    }

    return prisma.websiteSubscription.create({
      data: {
        prospectId,
        planId: prospect.selectedPlan.id,
        planCode: prospect.selectedPlan.code,
        amount: monthlyPrice,
        status: 'ACTIVE',
        billingDay: publishedAt.getDate(),
        startDate: publishedAt,
        nextBillingDate,
        notes: 'Mensalidade iniciada após publicação do site.'
      }
    });
  }

  async acceptProposal(proposalId: string, domainName?: string) {
    const proposal = await prisma.websiteProposal.findUnique({
      where: { id: proposalId },
      include: {
        prospect: {
          include: {
            selectedPlan: true,
            demos: { orderBy: { version: 'desc' }, take: 10 },
          },
        },
      },
    });

    if (!proposal) throw new Error('WEBSITE_PROPOSAL_NOT_FOUND');

    // Idempotência: uma proposta já aceita não deve criar outro Lead/Projeto.
    if (proposal.status === 'ACCEPTED') {
      const existingProject = await prisma.websiteProject.findFirst({
        where: { prospectId: proposal.prospectId },
      });

      if (!existingProject) {
        throw new Error('WEBSITE_PROJECT_NOT_FOUND_FOR_ACCEPTED_PROPOSAL');
      }

      if (domainName && !existingProject.domainName) {
        await prisma.websiteProject.update({
          where: { id: existingProject.id },
          data: { domainName },
        });
      }

      const currentProject = domainName && !existingProject.domainName
        ? await prisma.websiteProject.findUnique({ where: { id: existingProject.id } })
        : existingProject;

      const existingLead = proposal.prospect.linkedLeadId
        ? await prisma.lead.findUnique({ where: { id: proposal.prospect.linkedLeadId } })
        : null;

      return {
        success: true,
        idempotent: true,
        proposal: proposal.id,
        lead: existingLead,
        project: currentProject,
        subscription: null,
      };
    }

    const prospect = proposal.prospect;
    if (!prospect) throw new Error('WEBSITE_PROSPECT_NOT_FOUND');

    const snapshot = readProposalSnapshot(proposal.content);
    if (!snapshot) {
      throw new Error('PROPOSAL_SNAPSHOT_MISSING: A proposta nao possui o snapshot comercial necessario para aceite');
    }

    const approvedDemo = prospect.demos.find(
      d => d.version === snapshot.demoVersion && ['APPROVED', 'READY'].includes(d.status)
    );

    if (!approvedDemo) {
      throw new Error('DEMO_NOT_READY: Nenhuma demo aprovada encontrada');
    }

    const acceptedPlan = await prisma.websitePlan.findFirst({
      where: { id: snapshot.planId, code: snapshot.planCode, active: true },
    });

    if (!acceptedPlan) {
      throw new Error('WEBSITE_PLAN_SNAPSHOT_INVALID: O plano registrado na proposta nao esta mais disponivel');
    }

    if (!prospect.phone) {
      throw new Error('LEAD_PHONE_REQUIRED: Prospect precisa de telefone para conversao');
    }

    const result = await prisma.$transaction(async tx => {
      let safeLead = prospect.linkedLeadId
        ? await tx.lead.findUnique({ where: { id: prospect.linkedLeadId } })
        : null;

      if (!safeLead) {
        safeLead = await tx.lead.findUnique({ where: { phone: prospect.phone! } });
      }

      if (!safeLead) {
        safeLead = await tx.lead.create({
          data: {
            name: prospect.companyName,
            phone: prospect.phone!,
            email: prospect.email || undefined,
            status: 'NEW_LEAD',
            stage: 'PROSPECTADO',
            score: prospect.score || 0,
          },
        });
      } else if (prospect.email && !safeLead.email) {
        safeLead = await tx.lead.update({
          where: { id: safeLead.id },
          data: { email: prospect.email },
        });
      }

      const updatedLead = await tx.lead.update({
        where: { id: safeLead.id },
        data: {
          status: 'CLOSED_WON',
          stage: 'PEDIDO_CONFIRMADO',
          score: Math.max(safeLead.score || 0, prospect.score || 0),
        },
      });

      await tx.websiteProposal.update({
        where: { id: proposal.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
        },
      });

      const existingProject = await tx.websiteProject.findFirst({
        where: { prospectId: prospect.id },
      });

      if (existingProject && domainName && !existingProject.domainName) {
        await tx.websiteProject.update({ where: { id: existingProject.id }, data: { domainName } });
      }

      const project = existingProject || await tx.websiteProject.create({
        data: {
          prospectId: prospect.id,
          status: 'PLANNING',
          currentVersion: approvedDemo.version,
          domainName: domainName || undefined,
        },
      });

      const monthlyPrice = snapshot.monthlyPrice;

      const subscription = null;

      await tx.websiteProspect.update({
        where: { id: prospect.id },
        data: {
          linkedLeadId: updatedLead.id,
          status: 'WON',
          selectedPlanId: acceptedPlan.id,
          estimatedValue: snapshot.projectPrice + snapshot.monthlyPrice,
        },
      });

      await tx.websiteProspectEvent.create({
        data: {
          prospectId: prospect.id,
          type: 'PRODUCTION_STARTED',
          description: `Proposta aceita. Projeto vinculado a demo v${approvedDemo.version}.`,
          metadata: JSON.stringify({
            proposalId: proposal.id,
            projectId: project.id,
            demoVersion: approvedDemo.version,
            planId: acceptedPlan.id,
            planCode: snapshot.planCode,
            projectPrice: snapshot.projectPrice,
            monthlyPrice,
            paymentTerms: snapshot.paymentTerms,
            monthlyStartRule: snapshot.monthlyStartRule,
            leadId: updatedLead.id,
          }),
        },
      });

      return { proposal: proposal.id, lead: updatedLead, project, subscription };
    });

    return { success: true, ...result };
  }
}

export const websiteCommercialService = new WebsiteCommercialService();
