import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface BusinessSearchFilters {
  segment?: string;
  city?: string;
  state?: string;
  category?: string;
  status?: string;
  minScore?: number;
}

export interface BusinessCreateData {
  name: string;
  category?: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  website?: string;
  email?: string;
  segment?: string;
  source?: string;
  notes?: string;
}

export class ProspectingService {
  // Buscar empresas com filtros
  async searchBusinesses(filters: BusinessSearchFilters, page = 1, limit = 20) {
    const where: any = {};
    
    if (filters.segment) where.segment = { contains: filters.segment };
    if (filters.city) where.city = { contains: filters.city };
    if (filters.state) where.state = filters.state;
    if (filters.category) where.category = { contains: filters.category };
    if (filters.status) where.status = filters.status;
    if (filters.minScore) where.score = { gte: filters.minScore };
    
    const skip = (page - 1) * limit;
    
    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.business.count({ where })
    ]);
    
    return {
      businesses,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  // Criar nova empresa prospectada
  async createBusiness(data: BusinessCreateData) {
    // Verificar duplicidade por nome + cidade
    const existing = await prisma.business.findFirst({
      where: {
        name: { contains: data.name },
        city: data.city ? { contains: data.city } : undefined
      }
    });

    if (existing) {
      return { success: false, error: 'Empresa já cadastrada', business: existing };
    }

    const business = await prisma.business.create({
      data: {
        name: data.name,
        category: data.category,
        address: data.address,
        city: data.city,
        state: data.state,
        phone: data.phone,
        website: data.website,
        email: data.email,
        segment: data.segment,
        source: data.source || 'MANUAL',
        notes: data.notes
      }
    });

    return { success: true, business };
  }

  // Atualizar empresa
  async updateBusiness(id: string, data: Partial<BusinessCreateData>) {
    const business = await prisma.business.update({
      where: { id },
      data
    });
    return { success: true, business };
  }

  // Deletar empresa
  async deleteBusiness(id: string) {
    await prisma.business.delete({ where: { id } });
    return { success: true };
  }

  // Obter estatísticas de prospecção
  async getStats() {
    const total = await prisma.business.count();
    const byStatus = await prisma.business.groupBy({
      by: ['status'],
      _count: true
    });
    const bySegment = await prisma.business.groupBy({
      by: ['segment'],
      _count: true,
      orderBy: { _count: { segment: 'desc' } },
      take: 10
    });

    return {
      total,
      byStatus: byStatus.reduce((acc, curr) => {
        acc[curr.status] = curr._count;
        return acc;
      }, {} as Record<string, number>),
      topSegments: bySegment.map(b => ({
        segment: b.segment || 'Não definido',
        count: b._count
      }))
    };
  }

  // Exportar para CSV
  async exportToCSV(filters?: BusinessSearchFilters) {
    const where: any = {};
    if (filters?.segment) where.segment = { contains: filters.segment };
    if (filters?.city) where.city = { contains: filters.city };
    if (filters?.state) where.state = filters.state;

    const businesses = await prisma.business.findMany({ where });

    const csvHeader = 'Nome,Categoria,Cidade,Estado,Telefone,Website,Email,Segmento,Status,Score\n';
    const csvRows = businesses.map(b => 
      `${b.name},${b.category || ''},${b.city || ''},${b.state || ''},${b.phone || ''},${b.website || ''},${b.email || ''},${b.segment || ''},${b.status},${b.score}`
    ).join('\n');

    return csvHeader + csvRows;
  }
}

export const prospectingService = new ProspectingService();