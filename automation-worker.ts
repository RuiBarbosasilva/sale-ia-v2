import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Função para gerar código aleatório curto (ex: a7b3c9)
function generateTrackingCode() {
  return Math.random().toString(36).substring(2, 8);
}

// Função que simula a IA gerando uma copy baseada no produto
function generateAICopy(productName: string, category: string, trackingCode: string) {
  const hooks = {
    'saude-emagrecimento': `🔥 Cansado de dietas que não funcionam? Descubra o segredo por trás do ${productName} que está mudando vidas!`,
    'saude-geral': `⚡ Sua saúde merece o melhor! Veja como o ${productName} pode transformar sua rotina em poucos dias.`,
    'desenvolvimento-pessoal': `🧠 Desbloqueie seu potencial máximo. O ${productName} é a chave que faltava para sua evolução.`
  };
  
  const hook = hooks[category as keyof typeof hooks] || `🚀 Não perca a chance de conhecer o ${productName}!`;
  
  return `${hook}\n\n✅ Clique no link da bio ou acesse: https://seu-dominio.com/go/${trackingCode}\n\n#affiliate #${category.replace('-', '')} #${productName.replace(/\s+/g, '')}`;
}

async function runAutomation() {
  console.log('\n🔄 Buscando produtos ativos para criar campanhas automáticas...\n');
  
  const produtos = await prisma.afiliadoProduto.findMany({
    where: { status: 'ativo' },
    take: 3 // Vamos automatizar 3 campanhas de uma vez
  });

  if (produtos.length === 0) {
    console.log('⚠️ Nenhum produto ativo encontrado.');
    return;
  }

  for (const produto of produtos) {
    const trackingCode = generateTrackingCode();
    const copy = generateAICopy(produto.nome, produto.categoria || 'outros', trackingCode);
    const linkDivulgacao = `/go/${trackingCode}`; // O sistema de rotas já sabe lidar com isso

    // 1. Salvar a campanha no banco de dados (Rastreabilidade)
    const publicacao = await prisma.afiliadoPublicacao.create({
      data: {
        produtoId: produto.id,
        canal: 'instagram_automated',
        postIdExterno: `AUTO_${Date.now()}`,
        status: 'agendado',
        // O link real será gerado dinamicamente pelo tracking.routes.ts usando o trackingCode
      }
    });

    console.log('==================================================');
    console.log(`✅ CAMPANHA GERADA PARA: ${produto.nome.toUpperCase()}`);
    console.log('==================================================');
    console.log(`🔗 Link Rastreado: https://seu-dominio.com${linkDivulgacao}`);
    console.log(`📊 ID da Publicação no Banco: ${publicacao.id}`);
    console.log('\n📝 COPY PRONTA PARA POSTAR (Instagram/TikTok/WhatsApp):');
    console.log('--------------------------------------------------');
    console.log(copy);
    console.log('--------------------------------------------------\n');
  }

  console.log('🎉 Automação concluída! As campanhas estão salvas no banco.');
  await prisma.$disconnect();
}

runAutomation().catch(e => {
  console.error('❌ Erro na automação:', e);
  process.exit(1);
});
