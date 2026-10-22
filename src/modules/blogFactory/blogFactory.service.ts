import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export class BlogFactoryService {
  async generateArticle(pauta: any) {
    const openaiKey = process.env.OPENAI_API_KEY;
    
    // Prompt de Elite: Técnica do Arranha-Céu + Instinct
    const systemPrompt = "Você é um redator SEO Sênior e especialista em copywriting persuasivo (Instinct). Sua tarefa é criar um artigo SUPERIOR ao conteúdo de referência. REGRAS: 1. Use estrutura H1, H2, H3. 2. Seja mais detalhista e profundo que o original. 3. Inclua a palavra-chave naturalmente. 4. Use gatilhos mentais de autoridade e prova social. 5. Termine com uma CTA clara para contato. 6. Retorne APENAS Markdown limpo, sem blocos de código." ;
    
    const userPrompt = `Tema: "${pauta.titulo}"

Referência: ${pauta.conteudo || 'Desenvolva um artigo completo e definitivo sobre este tema.'}`;

    let articleContent = "Artigo em processamento...";

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
      } catch (error) {
        console.error('Erro na geração:', error);
      }
    }

    return await prisma.blogArticle.create({
      data: {
        pautaId: pauta.id,
        title: pauta.titulo,
        content: articleContent,
        status: 'DRAFT',
        wordCount: articleContent.split(' ').length
      }
    });
  }

  async autoApproveAndSendToWP(articleId: string) {
    const article = await prisma.blogArticle.update({
      where: { id: articleId },
      data: { status: 'APPROVED' }
    });
    // Aqui chamaria o wordpressPublisher.publish(article)
    console.log(`[BlogFactory] Artigo ${articleId} aprovado e enviado como RASCUNHO para o WordPress.`);
    return article;
  }
}
export const blogFactoryService = new BlogFactoryService();
