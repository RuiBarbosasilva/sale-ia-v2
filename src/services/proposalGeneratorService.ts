import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ProposalGeneratorService {
  async generateProposal(prospectId: string) {
    const prospect = await prisma.websiteProspect.findUnique({
      where: { id: prospectId },
      include: { demos: { orderBy: { version: 'desc' }, take: 1 } },
    });

    if (!prospect) throw new Error('WEBSITE_PROSPECT_NOT_FOUND');

    const latestDemo = prospect.demos[0];
    if (!latestDemo || latestDemo.status !== 'READY') {
      throw new Error('DEMO_NOT_READY: Gere e aprove uma demo antes da proposta');
    }

    let previewData: any = {};
    try { previewData = JSON.parse(latestDemo.previewData || '{}'); } catch {}

    const qualityScore = Number(previewData.qualityReview?.overallScore || 0);
    const criticalIssues = Array.isArray(previewData.qualityReview?.criticalIssues)
      ? previewData.qualityReview.criticalIssues : [];

    if (qualityScore < 7.5 || criticalIssues.length > 0) {
      throw new Error('DEMO_QUALITY_GATE: A demo precisa atingir score 7.5 e nao possuir problemas criticos');
    }

    const businessName = prospect.companyName || 'Sua Empresa';
    const segment = prospect.segment || 'negócio';
    const city = prospect.city || 'sua cidade';
    const opportunity = prospect.websiteOpportunityStatus || 'UNKNOWN';
    const score = prospect.websiteOpportunityScore || 0;

    const problemStatement =
      opportunity === 'NO_WEBSITE'
        ? `Identificamos uma oportunidade de presença digital para a ${businessName}, que atua no segmento de ${segment} em ${city}.`
        : `A análise da presença digital da ${businessName} identificou oportunidades de melhoria que podem ser trabalhadas com uma apresentação digital mais moderna e orientada à conversão.`;

    const solutionStatement =
      `Preparamos uma demonstração personalizada para ${businessName}, com estrutura responsiva, foco em contato e informações relevantes para clientes da região.`;

    const proposalContent = `PROPOSTA COMERCIAL — RB FACTORY SITES

Para: ${businessName}
Segmento: ${segment}
Localização: ${city}
Score de oportunidade: ${score}/100

O QUE IDENTIFICAMOS:
${problemStatement}

A SOLUÇÃO:
${solutionStatement}

INCLUSO:
- Site profissional e responsivo
- Estrutura otimizada para dispositivos móveis
- Integração com WhatsApp
- Formulário de contato
- SEO básico
- Publicação conforme plano contratado

PRÓXIMOS PASSOS:
1. Validar a demonstração apresentada.
2. Ajustar conteúdo e identidade conforme necessário.
3. Definir investimento, prazo e condições de publicação.
4. Após aprovação comercial, iniciar o projeto.

Atenciosamente,
RB Factory Sites
`;

    const existingProposal = await prisma.websiteProposal.findFirst({
      where: { prospectId }
    });

    const proposal = existingProposal
      ? await prisma.websiteProposal.update({
          where: { id: existingProposal.id },
          data: { content: proposalContent, status: 'READY' }
        })
      : await prisma.websiteProposal.create({
          data: { prospectId, content: proposalContent, status: 'READY' }
        });

    await prisma.websiteProspect.update({
      where: { id: prospectId },
      data: { status: 'PROPOSAL_READY' }
    });

    return proposal;
  }}

export const proposalGeneratorService = new ProposalGeneratorService();