import { prisma } from '../modules/mercadoLivre/lib/prisma';

export class WebsiteCommercialService {
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

    const prospect = proposal.prospect;
    if (!prospect) throw new Error('WEBSITE_PROSPECT_NOT_FOUND');

    const approvedDemo =
      prospect.demos.find(d => d.status === 'APPROVED') ||
      prospect.demos.find(d => d.status === 'READY');

    if (!approvedDemo) {
      throw new Error('DEMO_NOT_READY: Nenhuma demo aprovada encontrada');
    }

    if (!prospect.selectedPlan) {
      throw new Error('WEBSITE_PLAN_REQUIRED: Prospect sem plano selecionado');
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

      const monthlyPrice = Number(prospect.selectedPlan.monthlyPrice || 0);

      let subscription = null;
      if (monthlyPrice > 0) {
        subscription = await tx.websiteSubscription.findFirst({
          where: {
            prospectId: prospect.id,
            planId: prospect.selectedPlan.id,
            status: { in: ['PENDING', 'ACTIVE'] },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (!subscription) {
          subscription = await tx.websiteSubscription.create({
            data: {
              prospectId: prospect.id,
              planId: prospect.selectedPlan.id,
              planCode: prospect.selectedPlan.code,
              amount: monthlyPrice,
              status: 'PENDING',
              billingDay: 1,
              startDate: new Date(),
              notes: 'Criada na aprovacao da proposta; aguarda confirmacao de pagamento.',
            },
          });
        }
      }

      await tx.websiteProspect.update({
        where: { id: prospect.id },
        data: {
          linkedLeadId: updatedLead.id,
          status: 'WON',
          estimatedValue: Number(prospect.selectedPlan.projectPrice || 0) + monthlyPrice,
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
            planId: prospect.selectedPlan.id,
            planCode: prospect.selectedPlan.code,
            projectPrice: prospect.selectedPlan.projectPrice,
            monthlyPrice,
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
