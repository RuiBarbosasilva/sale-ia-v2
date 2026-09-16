import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ProposalGeneratorService {
  async generateProposal(prospectId: string) {
    const prospect = await prisma.websiteProspect.findUnique({
      where: { id: prospectId }
    });

    if (!prospect) {
      throw new Error('WebsiteProspect não encontrado');
    }

    const businessName = prospect.companyName || 'Sua Empresa';
    const segment = prospect.segment || 'negócio';
    const city = prospect.city || 'sua cidade';
    const hasWebsite = prospect.websiteStatus === 'HAS_WEBSITE';
    const websiteQuality = prospect.websiteScore || 0;

    let problemStatement = "";
    let solutionStatement = "";

    if (!hasWebsite || prospect.websiteStatus === 'NO_WEBSITE') {
      problemStatement = `Identificamos que a ${businessName}, apesar de atuar no segmento de ${segment} em ${city}, ainda não possui um site próprio.`;
      solutionStatement = `A criação de um site profissional colocará sua empresa no mapa digital, gerando credibilidade e facilitando o contato direto.`;
    } else if (websiteQuality < 50) {
      problemStatement = `Notamos que a ${businessName} possui um site, mas ele apresenta oportunidades de melhoria (Score atual: ${websiteQuality}/100).`;
      solutionStatement = `Propomos uma modernização completa do seu site, com design profissional e foco em conversão.`;
    } else {
      problemStatement = `A ${businessName} já possui uma boa presença digital, mas há espaço para otimizar a conversão.`;
      solutionStatement = `Oferecemos uma consultoria de otimização e uma nova versão do seu site focada em resultados.`;
    }

    const proposalContent = `Prezado(a) responsável pela ${businessName},

Realizamos uma análise digital da sua empresa.

ã£Â°ã…Â¸ã¢â‚¬Âã‚Â O QUE IDENTIFICAMOS:
${problemStatement}

ã£Â°ã…Â¸ã¢â‚¬â„¢ã‚Â¡ A SOLUã£Â£ã¢â‚¬Â¡ã£Â£ã†â€™O:
${solutionStatement}

ã£Â°ã…Â¸ã…Â¡ã¢â€šÂ¬ O QUE ESTã£Â£ã‚Â INCLUSO:
ã£Â¢ã¢â€šÂ¬ã‚Â¢ Site profissional e responsivo
ã£Â¢ã¢â€šÂ¬ã‚Â¢ Otimização para Google (SEO básico)
ã£Â¢ã¢â€šÂ¬ã‚Â¢ Botão direto para o seu WhatsApp
ã£Â¢ã¢â€šÂ¬ã‚Â¢ Painel para atualizar conteúdos

Gostaria de ver uma demonstração exclusiva e gratuita? Responda com "QUERO VER".

Atenciosamente,
Equipe SALE-IA-V2
`;

    // Lógica segura: encontrar proposta existente pelo prospectId ou criar nova
    const existingProposal = await prisma.websiteProposal.findFirst({
      where: { prospectId }
    });

    let proposal;
    if (existingProposal) {
      proposal = await prisma.websiteProposal.update({
        where: { id: existingProposal.id },
        data: {
          content: proposalContent,
          status: 'READY'
        }
      });
    } else {
      proposal = await prisma.websiteProposal.create({
        data: {
          prospectId,
          content: proposalContent,
          status: 'READY'
        }
      });
    }

    await prisma.websiteProspect.update({
      where: { id: prospectId },
      data: { status: 'PROPOSAL_READY' }
    });

    return proposal;
  }
}

export const proposalGeneratorService = new ProposalGeneratorService();