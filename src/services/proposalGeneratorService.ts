import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type GenerateProposalOptions = {
  planId?: string;
  planCode?: string;
  demoId?: string;
  demoVersion?: number;
};

function parseFeatures(value?: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return value.split(/\r?\n|,/).map(v => v.trim()).filter(Boolean);
  }
}

function brl(value?: number | null): string {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return 'A definir';
  }
  return Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export class ProposalGeneratorService {
  async listPlans() {
    return prisma.websitePlan.findMany({
      where: { active: true },
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
    });
  }

  async generateProposal(prospectId: string, options: GenerateProposalOptions = {}) {
    const prospect = await prisma.websiteProspect.findUnique({
      where: { id: prospectId },
      include: {
        demos: {
          where: options.demoId ? { id: options.demoId } : undefined,
          orderBy: { version: 'desc' },
          take: 10,
        },
        selectedPlan: true,
      },
    });

    if (!prospect) throw new Error('WEBSITE_PROSPECT_NOT_FOUND');

    const latestDemo = options.demoId
      ? prospect.demos.find(d => d.id === options.demoId)
      : options.demoVersion !== undefined
        ? prospect.demos.find(d => d.version === options.demoVersion)
        : prospect.demos[0];

    if (!latestDemo || !['READY', 'APPROVED'].includes(latestDemo.status)) {
      throw new Error('DEMO_NOT_READY: Gere e aprove uma demo antes da proposta');
    }

    let previewData: any = {};
    try {
      previewData = JSON.parse(latestDemo.previewData || '{}');
    } catch {}

    const qualityScore = Number(previewData.qualityReview?.overallScore || 0);
    const criticalIssues = Array.isArray(previewData.qualityReview?.criticalIssues)
      ? previewData.qualityReview.criticalIssues
      : [];

    if (qualityScore < 7.5 || criticalIssues.length > 0) {
      throw new Error(
        'DEMO_QUALITY_GATE: A demo precisa atingir score 7.5 e nao possuir problemas criticos'
      );
    }

    let plan = prospect.selectedPlan;

    if (options.planId) {
      plan = await prisma.websitePlan.findFirst({
        where: { id: options.planId, active: true },
      });
    } else if (options.planCode) {
      plan = await prisma.websitePlan.findFirst({
        where: { code: options.planCode, active: true },
      });
    }

    if (!plan) {
      throw new Error('WEBSITE_PLAN_REQUIRED: Informe um plano ativo para gerar a proposta');
    }

    const businessName = prospect.companyName || 'Sua Empresa';
    const segment = prospect.segment || 'negócio';
    const city = prospect.city || 'sua cidade';
    const opportunity = prospect.websiteStatus || 'UNKNOWN';
    const score = prospect.score ?? prospect.websiteScore ?? 0;
    const features = parseFeatures(plan.features);

    const problemStatement =
      opportunity === 'NO_WEBSITE'
        ? `Identificamos uma oportunidade de presença digital para a ${businessName}, que atua no segmento de ${segment} em ${city}.`
        : `A análise da presença digital da ${businessName} identificou oportunidades de melhoria que podem ser trabalhadas com uma apresentação digital mais moderna e orientada à conversão.`;

    const featureLines = features.length
      ? features.map(feature => `- ${feature}`).join('\n')
      : [
          '- Site profissional e responsivo',
          '- Estrutura otimizada para dispositivos móveis',
          '- Integração com WhatsApp',
          '- Formulário de contato',
          '- SEO básico',
        ].join('\n');

    const monthlyLine =
      Number(plan.monthlyPrice || 0) > 0
        ? `Manutenção/serviços mensais: ${brl(plan.monthlyPrice)}`
        : 'Manutenção/serviços mensais: não incluídos';

    const proposalSnapshot = {
      version: 1,
      planId: plan.id,
      planCode: plan.code,
      planName: plan.name,
      projectPrice: Number(plan.projectPrice || 0),
      monthlyPrice: Number(plan.monthlyPrice || 0),
      demoId: latestDemo.id,
      demoVersion: latestDemo.version,
      qualityScore,
      paymentTerms: '50% na aprovação + 50% na publicação',
      monthlyStartRule: 'A mensalidade começa somente após a publicação do site',
      generatedAt: new Date().toISOString(),
    };

    const proposalSnapshotMarker = `<!-- RB_FACTORY_PROPOSAL_SNAPSHOT:${Buffer.from(JSON.stringify(proposalSnapshot), 'utf8').toString('base64')} -->`;

    const proposalContent = `PROPOSTA COMERCIAL — RB FACTORY SITES

Para: ${businessName}
Segmento: ${segment}
Localização: ${city}
Score de oportunidade: ${score}/100

O QUE IDENTIFICAMOS:
${problemStatement}

A SOLUÇÃO:
Preparamos uma demonstração personalizada para ${businessName}, com estrutura responsiva, foco em contato e informações relevantes para clientes da região.

PLANO SELECIONADO:
${plan.name}
${plan.description || ''}

INCLUSO:
${featureLines}

INVESTIMENTO:
Projeto: ${brl(plan.projectPrice)}
${monthlyLine}

DEMONSTRAÇÃO:
Versão: v${latestDemo.version}
Score de qualidade: ${qualityScore.toFixed(1)}/10

PRÓXIMOS PASSOS:
1. Validar a demonstração apresentada.
2. Ajustar conteúdo e identidade conforme necessário.
3. Confirmar o plano e as condições comerciais.
4. Após aprovação comercial, iniciar o projeto.

Atenciosamente,
RB Factory Sites
`;

    if (prospect.selectedPlanId !== plan.id) {
      await prisma.websiteProspect.update({
        where: { id: prospectId },
        data: { selectedPlanId: plan.id },
      });
    }

    const existingProposal = await prisma.websiteProposal.findFirst({
      where: { prospectId },
      orderBy: { id: 'desc' },
    });

    if (existingProposal?.status === 'ACCEPTED') {
      throw new Error('PROPOSAL_ALREADY_ACCEPTED: A proposta aceita nao pode ser sobrescrita');
    }

    if (existingProposal?.status === 'SENT') {
      throw new Error('PROPOSAL_ALREADY_SENT: A proposta enviada nao pode ser sobrescrita');
    }

    if (existingProposal?.status === 'ACCEPTING') {
      throw new Error('PROPOSAL_ACCEPTANCE_IN_PROGRESS: A proposta está em processo de aceite');
    }

    const proposal = existingProposal
      ? await prisma.websiteProposal.update({
          where: { id: existingProposal.id },
          data: { content: proposalContent, status: 'READY' },
        })
      : await prisma.websiteProposal.create({
          data: {
            prospectId,
            content: proposalContent,
            status: 'READY',
          },
        });

    await prisma.websiteProspect.update({
      where: { id: prospectId },
      data: { status: 'PROPOSAL_READY' },
    });

    await prisma.websiteProspectEvent.create({
      data: {
        prospectId,
        type: 'PROPOSAL_CREATED',
        description: `Proposta gerada com o plano ${plan.code}, projeto ${brl(plan.projectPrice)} e mensalidade ${brl(plan.monthlyPrice)}. Demo v${latestDemo.version}.`,
        metadata: JSON.stringify({
          proposalId: proposal.id,
          planId: plan.id,
          planCode: plan.code,
          projectPrice: plan.projectPrice,
          monthlyPrice: plan.monthlyPrice,
          demoVersion: latestDemo.version,
          qualityScore,
        }),
      },
    });

    return {
      ...proposal,
      plan,
      demoVersion: latestDemo.version,
      qualityScore,
    };
  }
}

export const proposalGeneratorService = new ProposalGeneratorService();
