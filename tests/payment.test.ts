import { closeRedis } from '../src/config/queue';
import { paymentService } from '../src/services/paymentService';
import { prisma } from '../src/db';

describe('PaymentService', () => {

describe('PaymentService -> Sale Flow (Checkpoint 09.10)', () => {
  beforeEach(async () => {
    // Limpar na ordem correta de dependência (filhos primeiro)
    await prisma.pixPayment.deleteMany();
        await prisma.payment.deleteMany();
        await prisma.sale.deleteMany();
        await prisma.orderItem.deleteMany();
        await prisma.order.deleteMany();
        await prisma.quote.deleteMany();
        await prisma.followUp.deleteMany();
        await prisma.outreach.deleteMany();
        await prisma.campaignLead.deleteMany();
        await prisma.campaignMessage.deleteMany();
        await prisma.message.deleteMany();
        await prisma.lead.deleteMany();
    // NÃO deletar leads aqui - usar telefones únicos por teste
  });

  it('deve criar Payment e Sale ao confirmar pagamento válido', async () => {
    const uniquePhone = '55119' + Date.now().toString().substring(5);
    const lead = await prisma.lead.create({ data: { phone: uniquePhone, name: 'Teste' } });
    const order = await prisma.order.create({ 
      data: { leadId: lead.id, totalValue: 100.00, status: 'AGUARDANDO_PAGAMENTO' } 
    });

    const result = await paymentService.confirmPayment({
      orderId: order.id,
      transactionId: 'tx_valid_123',
      amount: 100.00
    });

    expect(result.status).toBe('COMPLETED');
    
    const sale = await prisma.sale.findFirst({ where: { leadId: lead.id } });
    expect(sale).not.toBeNull();
    expect(sale?.value).toBe(100.00);
    expect(sale?.status).toBe('COMPLETED');

    const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(updatedOrder?.status).toBe('PAID');
    
    const updatedLead = await prisma.lead.findUnique({ where: { id: lead.id } });
    expect(updatedLead?.stage).toBe('PEDIDO_CONFIRMADO');
  });

  it('deve ser idempotente e NÃO criar segundo Payment ou Sale com mesma transactionId', async () => {
    const uniquePhone2 = '55119' + (Date.now() + 1).toString().substring(5);
    const lead = await prisma.lead.create({ data: { phone: uniquePhone2, name: 'Teste 2' } });
    const order = await prisma.order.create({ 
      data: { leadId: lead.id, totalValue: 200.00, status: 'AGUARDANDO_PAGAMENTO' } 
    });

    await paymentService.confirmPayment({ orderId: order.id, transactionId: 'tx_dup_456', amount: 200.00 });
    
    // Segunda chamada com mesma transactionId deve retornar o payment existente e NÃO criar nada novo
    const result2 = await paymentService.confirmPayment({ orderId: order.id, transactionId: 'tx_dup_456', amount: 200.00 });
    
    const payments = await prisma.payment.findMany({ where: { transactionId: 'tx_dup_456' } });
    const sales = await prisma.sale.findMany({ where: { leadId: lead.id } });
    
    expect(payments.length).toBe(1);
    expect(sales.length).toBe(1);
    expect(result2.id).toBe(payments[0].id);
  });

  it('deve rejeitar pagamento com valor incorreto', async () => {
    const uniquePhone3 = '55119' + (Date.now() + 2).toString().substring(5);
    const lead = await prisma.lead.create({ data: { phone: uniquePhone3, name: 'Teste 3' } });
    const order = await prisma.order.create({ 
      data: { leadId: lead.id, totalValue: 150.00, status: 'AGUARDANDO_PAGAMENTO' } 
    });

    await expect(paymentService.confirmPayment({
      orderId: order.id,
      transactionId: 'tx_wrong_789',
      amount: 100.00 // Valor diferente do order.totalValue
    })).rejects.toThrow('Valor do pagamento');
  });
});
});

// ==========================================
// TESTES DE INTEGRAÇÃO HTTP REAL (CHECKPOINT 09.11)
// ==========================================
import request from 'supertest';
import app from '../src/app';

describe('Payment Webhook HTTP Integration (Checkpoint 09.11)', () => {
  let testLeadId: string;
  let testOrderId: string;
  const testTransactionId = 'webhook_tx_' + Date.now().toString();
  const testAmount = 150.00;

  beforeAll(async () => {
    // Criar dados de teste únicos
    const lead = await prisma.lead.create({ 
      data: { phone: '55119' + Date.now().toString().substring(5), name: 'Webhook Test Lead' } 
    });
    testLeadId = lead.id;
    
    const order = await prisma.order.create({ 
      data: { leadId: lead.id, totalValue: testAmount, status: 'AGUARDANDO_PAGAMENTO' } 
    });
    testOrderId = order.id;
  });

  afterAll(async () => {
    // Limpeza segura: deletar apenas os registros criados por este teste
    await prisma.sale.deleteMany({ where: { leadId: testLeadId } });
    await prisma.payment.deleteMany({ where: { orderId: testOrderId } });
    await prisma.order.deleteMany({ where: { id: testOrderId } });
    await prisma.lead.deleteMany({ where: { id: testLeadId } });
  });

  it('TESTE 1: Webhook válido deve retornar 200 e criar Payment + Sale', async () => {
    const res = await request(app)
      .post('/api/payments/webhook')
      .send({ orderId: testOrderId, transactionId: testTransactionId, amount: testAmount, provider: 'MANUAL' })
      .expect(200);

    expect(res.body.success).toBe(true);
    
    // Validar banco
    const payment = await prisma.payment.findUnique({ where: { transactionId: testTransactionId } });
    expect(payment).not.toBeNull();
    expect(payment?.status).toBe('COMPLETED');

    const sale = await prisma.sale.findFirst({ where: { leadId: testLeadId } });
    expect(sale).not.toBeNull();
    expect(sale?.status).toBe('COMPLETED');
    expect(sale?.value).toBe(testAmount);

    const order = await prisma.order.findUnique({ where: { id: testOrderId } });
    expect(order?.status).toBe('PAID');

    const lead = await prisma.lead.findUnique({ where: { id: testLeadId } });
    expect(lead?.stage).toBe('PEDIDO_CONFIRMADO');
  });

  it('TESTE 2: Idempotência - mesma transactionId NÃO deve criar novo Payment ou Sale', async () => {
    const initialPayments = await prisma.payment.count({ where: { transactionId: testTransactionId } });
    const initialSales = await prisma.sale.count({ where: { leadId: testLeadId } });

    const res = await request(app)
      .post('/api/payments/webhook')
      .send({ orderId: testOrderId, transactionId: testTransactionId, amount: testAmount })
      .expect(200);

    expect(res.body.success).toBe(true);
    
    const finalPayments = await prisma.payment.count({ where: { transactionId: testTransactionId } });
    const finalSales = await prisma.sale.count({ where: { leadId: testLeadId } });

    expect(finalPayments).toBe(initialPayments); // Deve ser 1
    expect(finalSales).toBe(initialSales);       // Deve ser 1
  });

  it('TESTE 3: Order inexistente deve retornar 400', async () => {
    const res = await request(app)
      .post('/api/payments/webhook')
      .send({ orderId: 'order-inexistente-123', transactionId: 'tx_novo_1', amount: 100 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/não encontrado/i);
  });

  it('TESTE 4: Valor incorreto (amount divergente) deve retornar 400', async () => {
    const res = await request(app)
      .post('/api/payments/webhook')
      .send({ orderId: testOrderId, transactionId: 'tx_novo_2', amount: 999.99 }) // Valor diferente de 150.00
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/não corresponde/i);
  });

  it('TESTE 5: transactionId ausente deve retornar 400', async () => {
    const res = await request(app)
      .post('/api/payments/webhook')
      .send({ orderId: testOrderId, amount: testAmount })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/transactionId é obrigatório/i);
  });

  it('TESTE 6: orderId ausente deve retornar 400', async () => {
    const res = await request(app)
      .post('/api/payments/webhook')
      .send({ transactionId: 'tx_novo_3', amount: testAmount })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/orderId é obrigatório/i);
  });

  it('TESTE 7: amount inválido (0 ou negativo) deve retornar 400', async () => {
    const res = await request(app)
      .post('/api/payments/webhook')
      .send({ orderId: testOrderId, transactionId: 'tx_novo_4', amount: 0 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/inválido/i);
  });

  it('TESTE 8: provider ausente deve usar default MANUAL', async () => {
    const newTxId = 'tx_manual_' + Date.now().toString();
    const res = await request(app)
      .post('/api/payments/webhook')
      .send({ orderId: testOrderId, transactionId: newTxId, amount: testAmount }) // sem provider
      .expect(200);

    expect(res.body.success).toBe(true);
    const payment = await prisma.payment.findUnique({ where: { transactionId: newTxId } });
    expect(payment?.provider).toBe('MANUAL');
  });
});

afterAll(async () => {
  await closeRedis();
});
