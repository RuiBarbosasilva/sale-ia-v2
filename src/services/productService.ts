import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ProductService {
  async create(data: {
    name: string;
    description?: string;
    costPrice: number;
    salePrice: number;
    sku?: string;
    stock?: number;
    niche?: string;
  }) {
    return prisma.product.create({
      data: {
        name: data.name,
        description: data.description || '',
        costPrice: data.costPrice,
        salePrice: data.salePrice,
        sku: data.sku || '',
        stock: data.stock || 0,
        niche: data.niche || 'BRINDES',
        active: true
      }
    });
  }

  async list(niche?: string, activeOnly = true) {
    const where: any = {};
    if (niche) where.niche = niche;
    if (activeOnly) where.active = true;
    return prisma.product.findMany({ where, orderBy: { name: 'asc' } });
  }

  async getById(id: string) {
    return prisma.product.findUnique({ where: { id } });
  }

  async update(id: string, data: any) {
    return prisma.product.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.product.update({ where: { id }, data: { active: false } });
  }

  async getNiches() {
    const products = await prisma.product.findMany({
      where: { active: true },
      select: { niche: true }
    });
    const unique = [...new Set(products.map(p => p.niche).filter(Boolean))];
    return unique;
  }

  async seedDemoProducts() {
    const existing = await prisma.product.count();
    if (existing > 0) {
      console.log('[SEED] Ja existem', existing, 'produtos. Pulando seed.');
      return;
    }

    const products = [
      { name: 'Caneca de Ceramica 300ml', description: 'Caneca branca personalizada com arte full color', costPrice: 12.00, salePrice: 25.00, niche: 'CANECAS', stock: 500 },
      { name: 'Caneca Magica', description: 'Revela a arte com liquido quente', costPrice: 18.00, salePrice: 35.00, niche: 'CANECAS', stock: 200 },
      { name: 'Caneca de Vidro', description: 'Caneca transparente com jateamento', costPrice: 22.00, salePrice: 45.00, niche: 'CANECAS', stock: 150 },
      { name: 'Kit Corporativo Basico', description: 'Caneca + Caneta + Bloco de notas', costPrice: 40.00, salePrice: 75.00, niche: 'KITS', stock: 100 },
      { name: 'Kit Premium Executivo', description: 'Caneca termica + Caderno + Caneta metalica', costPrice: 80.00, salePrice: 150.00, niche: 'KITS', stock: 50 },
      { name: 'Camiseta Polo Bordada', description: 'Polo piquet com bordado do logo', costPrice: 28.00, salePrice: 55.00, niche: 'BRINDES', stock: 300 },
      { name: 'Ecobag Personalizada', description: 'Ecobag de algodao com silk screen', costPrice: 8.00, salePrice: 18.00, niche: 'BRINDES', stock: 1000 },
      { name: 'Garrafa Termica 500ml', description: 'Garrafa inox com gravacao a laser', costPrice: 32.00, salePrice: 65.00, niche: 'BRINDES', stock: 200 },
      { name: 'Brinde para Evento - Pacote', description: 'Kit completo para eventos corporativos', costPrice: 65.00, salePrice: 120.00, niche: 'EVENTOS', stock: 100 },
    ];

    for (const p of products) {
      await prisma.product.create({ data: p });
    }
    console.log('[SEED] Produtos de demonstracao criados:', products.length);
  }
}

export const productService = new ProductService();