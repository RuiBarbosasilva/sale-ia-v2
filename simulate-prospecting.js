const { PrismaClient } = require('@prisma/client');
const { websiteScoringService } = require('./dist/src/services/websiteScoringService');
const { demoGeneratorService } = require('./dist/src/services/demoGeneratorService');
const { proposalGeneratorService } = require('./dist/src/services/proposalGeneratorService');

const prisma = new PrismaClient();

async function simulateFullFlow() {
  console.log('\n=== SIMULADOR DE FLUXO DE PROSPECÇÃO DE SITES ===\n');

  // 1. Criar um prospect de teste
  console.log('1. Criando WebsiteProspect de teste...');
  const prospect = await prisma.websiteProspect.create({
    data: {
      companyName: 'Clínica Odonto Sorriso',
      segment: 'Clínica Odontológica',
      city: 'Poços de Caldas',
      phone: '35999998888',
      email: 'contato@odontosorriso.com.br',
      currentWebsite: '', // Simulando sem site
      websiteStatus: 'NO_WEBSITE',
      websiteScore: 0
    }
  });
  console.log(`   ✅ Prospect criado: ${prospect.companyName} (ID: ${prospect.id})`);

  // 2. Calcular Score
  console.log('\n2. Calculando Score Comercial...');
  const { score, grade } = websiteScoringService.calculateScore({
    websiteStatus: prospect.websiteStatus,
    websiteScore: prospect.websiteScore,
    phone: prospect.phone,
    email: prospect.email,
    segment: prospect.segment
  });
  
  await prisma.websiteProspect.update({
    where: { id: prospect.id },
    data: { score, scoreGrade: grade, status: 'QUALIFIED' }
  });
  console.log(`   ✅ Score: ${score} | Grade: ${grade}`);

  // 3. Gerar Demo
  console.log('\n3. Gerando Site Demo Automático...');
  const demo = await demoGeneratorService.generateDemo(prospect.id);
  console.log(`   ✅ Demo gerado! Versão: ${demo.version} | Status: ${demo.status}`);
  console.log(`   📄 Preview do código (primeiros 100 chars): ${demo.sourceCode.substring(0, 100)}...`);

  // 4. Gerar Proposta
  console.log('\n4. Gerando Proposta Comercial Personalizada...');
  const proposal = await proposalGeneratorService.generateProposal(prospect.id);
  console.log(`   ✅ Proposta gerada! Status: ${proposal.status}`);
  console.log(`   📝 Trecho da proposta:\n${proposal.content.substring(0, 200)}...\n`);

  console.log('=== SIMULAÇÃO CONCLUÍDA COM SUCESSO ===');
  console.log('Agora você pode ver este prospect na aba "Prospeccao Sites" do dashboard!');
  
  await prisma.$disconnect();
}

simulateFullFlow().catch(console.error);
