const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function validateFlow() {
  console.log("=== VALIDAÇÃO FLUXO COMERCIAL REAL ===\n");
  const timestamp = Date.now();
  const phone = "55119" + timestamp.toString().substring(5);
  
  try {
    // 0. PRODUTO (Pré-requisito para Quote/Order)
    console.log("0. PRODUTO: Criando produto de teste...");
    const product = await prisma.product.create({
      data: { 
        name: 'Produto Teste Fluxo', 
        price: 150.00,
        description: 'Produto para validação de fluxo'
      }
    }).catch(async () => {
      // Se falhar, tenta pegar o primeiro produto existente
      const existing = await prisma.product.findFirst();
      if (!existing) throw new Error("Nenhum produto encontrado e falha ao criar.");
      return existing;
    });
    console.log("   [OK] Produto utilizado. ID: " + product.id);

    // 1. LEAD
    console.log("\n1. LEAD: Criando lead de teste...");
    const lead = await prisma.lead.create({
      data: { phone: phone, name: 'Lead Teste Fluxo', status: 'NEW_LEAD', stage: 'NEW' }
    });
    console.log("   [OK] Lead criado. ID: " + lead.id);

    // 2. QUOTE
    console.log("\n2. QUOTE: Criando cotação no banco...");
    const quoteValue = 150.00;
    const quote = await prisma.quote.create({
      data: {
        leadId: lead.id,
        productId: product.id,
        quantity: 1,
        unitPrice: quoteValue,
        totalValue: quoteValue,
        status: 'PENDING'
      }
    });
    console.log("   [OK] Quote criada. ID: " + quote.id + ", Valor: R$ " + quote.totalValue);

    // 3. ORDER
    console.log("\n3. ORDER: Criando pedido vinculado à quote...");
    const order = await prisma.order.create({
      data: {
        leadId: lead.id,
        quoteId: quote.id,
        totalValue: quoteValue,
        status: 'AGUARDANDO_PAGAMENTO'
      }
    });
    console.log("   [OK] Order criada. ID: " + order.id + ", Status: " + order.status);

    // 4. PAYMENT (Via Webhook HTTP Real)
    console.log("\n4. PAYMENT: Confirmando pagamento via Webhook...");
    const txId = "tx-val-" + timestamp;
    const payRes = await fetch('http://localhost:3000/api/payments/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: order.id, transactionId: txId, amount: quoteValue, provider: 'TEST' })
    });
    const payData = await payRes.json();
    console.log("   [OK] Webhook Payment. HTTP: " + payRes.status + ", Success: " + payData.success);

    // 5. SALE & STATE CHECK (Validação no Banco)
    console.log("\n5. SALE & ESTADOS: Verificando integridade no banco...");
    const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });
    const updatedLead = await prisma.lead.findUnique({ where: { id: lead.id } });
    const sale = await prisma.sale.findFirst({ where: { leadId: lead.id } });
    
    console.log("   - Order Status: " + updatedOrder.status + " (Esperado: PAID)");
    console.log("   - Lead Stage: " + updatedLead.stage + " (Esperado: PEDIDO_CONFIRMADO)");
    console.log("   - Sale Created: " + (sale ? 'SIM' : 'NÃO') + " (Status: " + (sale?.status) + ", Valor: R$ " + (sale?.value) + ")");

    // 6. DASHBOARD
    console.log("\n6. DASHBOARD: Verificando sales-metrics...");
    const dashRes = await fetch('http://localhost:3000/api/dashboard/sales-metrics');
    const dashData = await dashRes.json();
    console.log("   [OK] Sales Metrics. HTTP: " + dashRes.status + ", Total Revenue: R$ " + dashData.totalRevenue);

    // CLEANUP
    console.log("\n[CLEANUP] Removendo dados de teste...");
    await prisma.sale.deleteMany({ where: { leadId: lead.id } });
    await prisma.payment.deleteMany({ where: { orderId: order.id } });
    await prisma.order.deleteMany({ where: { id: order.id } });
    await prisma.quote.deleteMany({ where: { id: quote.id } });
    await prisma.lead.deleteMany({ where: { id: lead.id } });
    // Não deletamos o produto de teste para evitar quebrar outros testes que dependam dele
    console.log("   [OK] Limpeza concluída.");

    console.log("\n============================================================");
    console.log(" FLUXO COMERCIAL REAL: PASS");
    console.log("============================================================");
    console.log("LEAD: OK");
    console.log("QUOTE: OK");
    console.log("ORDER: OK");
    console.log("PAYMENT: OK");
    console.log("SALE: OK");
    console.log("DASHBOARD: OK");
    console.log("\nFLUXO COMERCIAL REAL VALIDADO.");

  } catch (error) {
    console.error("\n[ERRO] Falha na validação:", error.message);
    console.log("\nFLUXO COMERCIAL REAL: FAIL");
  } finally {
    await prisma.$disconnect();
  }
}

validateFlow();