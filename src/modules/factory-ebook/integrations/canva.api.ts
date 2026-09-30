import axios from 'axios';

export class CanvaAPI {
  private clientId = process.env.CANVA_CLIENT_ID || '';
  private clientSecret = process.env.CANVA_CLIENT_SECRET || '';
  private accessToken = process.env.CANVA_ACCESS_TOKEN || '';
  private baseURL = 'https://api.canva.com/rest/v1';

  async criarDesign(tipo: string, titulo: string, subtitulo: string) {
    if (!this.accessToken) {
      return {
        modo: 'manual',
        instrucoes: 'Configure CANVA_ACCESS_TOKEN no .env para automacao completa',
        templateSugerido: this.getTemplateSugerido(tipo, titulo, subtitulo)
      };
    }

    try {
      const response = await axios.post(
        this.baseURL + '/designs',
        {
          template_id: this.getTemplateId(tipo),
          title: titulo,
          fields: { subtitle: subtitulo }
        },
        { headers: { 'Authorization': 'Bearer ' + this.accessToken } }
      );
      return response.data;
    } catch (error: any) {
      console.error('[Canva] Erro:', error.response?.data || error.message);
      return { erro: error.message, fallback: this.getTemplateSugerido(tipo, titulo, subtitulo) };
    }
  }

  private getTemplateId(tipo: string): string {
    const templates: any = {
      'capa_livro_colorir': 'TAC0JjMdQYQ',
      'capa_livro_atividade': 'TAD1KmRe2RZ',
      'interior_pagina': 'TAE2LnSf3SA',
      'capa_ebook': 'TAF4MoTg4TB'
    };
    return templates[tipo] || 'TAC0JjMdQYQ';
  }

  private getTemplateSugerido(tipo: string, titulo: string, subtitulo: string) {
    return {
      tipo: tipo,
      titulo: titulo,
      subtitulo: subtitulo,
      linkCanva: 'https://www.canva.com/templates/books/',
      instrucoes: [
        '1. Acesse canva.com e faca login',
        '2. Busque por "book cover ' + tipo.replace('_', ' ') + '"',
        '3. Escolha um template gratuito',
        '4. Substitua o titulo por: ' + titulo,
        '5. Substitua o subtitulo por: ' + subtitulo,
        '6. Baixe como PDF para impressao'
      ]
    };
  }
}
