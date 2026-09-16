import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ProductSegmentService {
  async create(name: string, description?: string, color?: string, icon?: string) {
    return prisma.productSegment.create({
      data: { name, description, color, icon }
    });
  }

  async list(activeOnly = true) {
    const where = activeOnly ? { isActive: true } : {};
    return prisma.productSegment.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });
  }

  async update(id: string, data: any) {
    return prisma.productSegment.update({
      where: { id },
      data
    });
  }

  async delete(id: string) {
    return prisma.productSegment.update({
      where: { id },
      data: { isActive: false }
    });
  }

  async getStats() {
    const segments = await this.list(false);
    return segments.map(s => ({
      id: s.id,
      name: s.name,
      productCount: s._count.products,
      isActive: s.isActive
    }));
  }
}

export const productSegmentService = new ProductSegmentService();