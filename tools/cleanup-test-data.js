// tools/cleanup-test-data.js
// EXECUTAR MANUALMENTE APENAS SE DESEJAR LIMPAR DADOS DE TESTE
// Este script IDENTIFICA e REMOVE apenas registros com nomes/telefones de teste.
// Ele NÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢O remove vendas ou pagamentos reais vinculados a clientes vÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡lidos.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  console.log("Identificando dados de teste...");
  
  // Identifica leads com nomes ou telefones claramente de teste
  const testLeads = await prisma.lead.findMany({
    where: {
      OR: [
        { name: { contains: 'Teste', mode: 'insensitive' } },
        { phone: { startsWith: '5511999999' } },
        { phone: { startsWith: '5511900000' } }
      ]
    },
    include: { sales: true, orders: true, payments: true }
  });

  if (testLeads.length === 0) {
    console.log("Nenhum dado de teste encontrado.");
    return;
  }

  console.log("Encontrados leads de teste.");
  console.log("ATENÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢O: Isso removerÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ leads, pedidos, pagamentos e vendas vinculadas a estes registros.");
  console.log("Para confirmar, edite este script e remova o comentÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡rio da execuÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o.");
  
  // DESCOMENTE AS LINHAS ABAIXO PARA EXECUTAR A LIMPEZA REAL
  /*
  for (const lead of testLeads) {
    await prisma.sale.deleteMany({ where: { leadId: lead.id } });
    await prisma.payment.deleteMany({ where: { leadId: lead.id } });
    await prisma.order.deleteMany({ where: { leadId: lead.id } });
    await prisma.message.deleteMany({ where: { leadId: lead.id } });
    await prisma.quote.deleteMany({ where: { leadId: lead.id } });
    await prisma.lead.delete({ where: { id: lead.id } });
  }
  console.log("Limpeza concluÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­da.");
  */
}

cleanup().then(() => prisma.$disconnect());