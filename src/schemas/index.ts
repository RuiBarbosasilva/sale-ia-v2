import { z } from 'zod';

export const createLeadSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    phone: z.string().min(8, 'Telefone inválido').optional(),
    email: z.string().email('E-mail inválido').optional(),
    status: z.string().optional(),
  }),
});

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Nome do produto é obrigatório'),
    description: z.string().optional(),
    costPrice: z.number().nonnegative('Preço de custo não pode ser negativo'),
    salePrice: z.number().positive('Preço de venda deve ser maior que zero'),
    sku: z.string().optional(),
    stock: z.number().int().nonnegative().optional().default(0),
    niche: z.string().optional(),
  }),
});

export const webhookMessageSchema = z.object({
  body: z.object({
    phone: z.string().min(8, 'Telefone é obrigatório'),
    message: z.string().min(1, 'Conteúdo da mensagem é obrigatório'),
    name: z.string().optional(),
  }),
});

export const createQuoteSchema = z.object({
  body: z.object({
    leadId: z.string().uuid('ID de Lead inválido'),
    productId: z.string().uuid('ID de Produto inválido').optional(),
    quantity: z.number().int().positive().default(1),
    discount: z.number().nonnegative().optional().default(0),
  }),
});