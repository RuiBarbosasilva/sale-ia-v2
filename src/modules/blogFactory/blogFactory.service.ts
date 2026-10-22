import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export class BlogFactoryService {
  async generateArticle(pauta: any) {
    const openaiKey = process.env.OPENAI_API_KEY;
    const systemPrompt = 'Voce e um redator SEO Senior. Crie um artigo SUPERIOR. Use H1, H2, H3. Seja detalhista. Use gatilhos mentais. Termine com CTA. Retorne APENAS Markdown limpo.';
    const userPrompt = 'Tema: ' + pauta.titulo + '\n\nReferencia: ' + (pauta.conteudo || 'Desenvolva um artigo completo.');
    let articleContent = 'Artigo em processamento...';
    if (openaiKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + openaiKey },
          body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], temperature: 0.7 })
        });
        const data: any = await response.json();
        if (data.choices && data.choices[0]) {
          articleContent = data.choices[0].message.content.replace(/^```markdown|^```|```$/g, '').trim();
        }
      } catch (error) { console.error('Erro na geracao:', error); }
    }
    return await prisma.blogArticle.create({
      data: { pautaId: pauta.id, title: pauta.titulo, content: articleContent, status: 'DRAFT', wordCount: articleContent.split(' ').length }
    });
  }

  async listArticles() {
    return await prisma.blogArticle.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createDraft(data: any) {
    return await prisma.blogArticle.create({ data: { ...data, status: 'DRAFT' } });
  }

  async updateDraft(id: string, data: any) {
    return await prisma.blogArticle.update({ where: { id }, data });
  }

  async approveArticle(id: string) {
    return await prisma.blogArticle.update({ where: { id }, data: { status: 'APPROVED' } });
  }

  async publishArticle(id: string) {
    const article = await this.approveArticle(id);
    console.log('[BlogFactory] Artigo ' + id + ' aprovado e pronto para envio ao WordPress.');
    return article;
  }
}

export const blogFactoryService = new BlogFactoryService();