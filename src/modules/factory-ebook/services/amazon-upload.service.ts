export class AmazonUploadAssistant {
  gerarMetadadosKDP(metadataLivro: any) {
    return {
      titulo_completo: metadataLivro.titulo + (metadataLivro.subtitulo ? ': ' + metadataLivro.subtitulo : ''),
      autor: metadataLivro.autor,
      descricao_html: this.formatarDescricaoAmazon(metadataLivro),
      palavras_chave_7_slots: this.gerarKeywordsAmazon(metadataLivro.tema),
      categorias: this.gerarCategoriasAmazon(metadataLivro.tema),
      faixa_etaria: '3 - 8 anos',
      idioma: 'Português (Brasil)',
      dimensoes: metadataLivro.tamanho === '8.5x11' ? '8.5 x 11 polegadas' : '8.5 x 11 polegadas',
      tipo_capa: metadataLivro.capa,
      aviso_legal: 'Este é um livro de colorir. As imagens são destinadas a ser coloridas pelo usuário.'
    };
  }

  private formatarDescricaoAmazon(meta: any): string {
    return '<b>Descubra a magia de ' + meta.tema + ' com este livro de colorir exclusivo!</b><br><br>' +
           'Perfeito para ' + (meta.capa === 'Capa Dura' ? 'presentear' : 'relaxar e se divertir') + ', este livro oferece ' + meta.paginas + ' desenhos únicos e detalhados.<br><br>' +
           '<b>CARACTERÍSTICAS:</b><br>' +
           '✅ ' + meta.paginas + ' desenhos exclusivos<br>' +
           '✅ Formato ' + meta.tamanho + ' polegadas<br>' +
           '✅ ' + meta.capa + ' de alta qualidade<br>' +
           '✅ Papel adequado para lápis de cor, canetinhas e aquarela<br><br>' +
           '<b>PERFEITO PARA:</b> Relaxamento, criatividade, atividade em família e presentes.<br><br>' +
           '<b>Adquira já o seu e comece sua jornada artística!</b>';
  }

  private gerarKeywordsAmazon(tema: string): string[] {
    const mapa: any = {
      animais: 'livro colorir animais, desenho infantil, atividades kids, natureza, bichos',
      mandala: 'livro colorir adulto, anti estresse, relaxamento, mindfulness, meditação',
      default: 'livro para colorir, atividades criativas, presente infantil, arte, lazer'
    };
    const base = mapa[tema.toLowerCase()] || mapa.default;
    return base.split(',').map((s: string) => s.trim()).slice(0, 7);
  }

  private gerarCategoriasAmazon(tema: string): string[] {
    const mapa: any = {
      animais: ['Juvenile Nonfiction > Art > Drawing', 'Crafts, Hobbies & Home > Animal Coloring Books'],
      mandala: ['Crafts, Hobbies & Home > Flower Coloring Books', 'Self-Help > Meditation'],
      default: ['Crafts, Hobbies & Home > General Coloring Books', 'Juvenile Nonfiction > Art > Drawing']
    };
    return mapa[tema.toLowerCase()] || mapa.default;
  }
}
