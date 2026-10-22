import { PrismaClient } from '@prisma/client';
import { blogFactoryService } from './blogFactory.service';

const prisma = new PrismaClient();

export class BlogFactoryScheduler {
  async runCycle() {
    console.log('[BlogFactory] Iniciando ciclo de coleta e geração...');
    try {
      const pautas = await prisma.blogPauta.findMany({ where: { status: 'PENDING' }, take: 3 });
      for (const pauta of pautas) {
        const article = await blogFactoryService.generateArticle(pauta);
        if (process.env.BLOG_AUTO_APPROVE === 'true') {
          await blogFactoryService.publishArticle(article.id);
        }
      }
      console.log('[BlogFactory] Ciclo concluído.');
    } catch (error) { console.error('[BlogFactory] Erro no ciclo:', error); }
  }
}

export const blogFactoryScheduler = new BlogFactoryScheduler();

export function startBlogFactoryScheduler() {
  console.log('[BlogFactory] Scheduler inicializado.');
}