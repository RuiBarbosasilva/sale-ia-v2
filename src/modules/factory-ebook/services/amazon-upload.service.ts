type LivroMetadata = {
  titulo: string;
  subtitulo?: string;
  autor?: string;
  tema: string;
  paginas?: number;
  tamanho?: string;
  capa?: string;
};

type KeywordMap = Record<string, string>;
type CategoryMap = Record<string, string[]>;

export class AmazonUploadAssistant {
  gerarMetadadosKDP(metadataLivro: LivroMetadata) {
    const titulo = String(metadataLivro?.titulo || '').trim();
    const tema = String(metadataLivro?.tema || '').trim();
    if (!titulo || titulo.length > 200) throw new Error('Título do livro inválido');
    if (!tema || tema.length > 120) throw new Error('Tema do livro inválido');
    const paginas = Math.max(1, Math.min(500, Number(metadataLivro.paginas) || 0));
    const tamanho = metadataLivro.tamanho === '6x9' || metadataLivro.tamanho === '8x10' || metadataLivro.tamanho === '8.5x11' ? metadataLivro.tamanho : '8.5x11';
    return {
      titulo_completo: titulo + (metadataLivro.subtitulo ? ': ' + String(metadataLivro.subtitulo).trim().slice(0, 200) : ''),
      autor: metadataLivro.autor,
      descricao_html: this.formatarDescricaoAmazon({ ...metadataLivro, titulo, tema, paginas, tamanho }),
      palavras_chave_7_slots: this.gerarKeywordsAmazon(tema),
      categorias: this.gerarCategoriasAmazon(tema),
      faixa_etaria: '3 - 8 anos',
      idioma: 'Português (Brasil)',
      dimensoes: tamanho === '6x9' ? '6 x 9 polegadas' : tamanho === '8x10' ? '8 x 10 polegadas' : '8.5 x 11 polegadas',
      tipo_capa: metadataLivro.capa,
      aviso_legal: 'Este é um livro de colorir. As imagens são destinadas a ser coloridas pelo usuário.'
    };
  }

  private formatarDescricaoAmazon(meta: LivroMetadata): string {
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
    const mapa: KeywordMap = {
      animais: 'livro colorir animais, desenho infantil, atividades kids, natureza, bichos',
      mandala: 'livro colorir adulto, anti estresse, relaxamento, mindfulness, meditação',
      default: 'livro para colorir, atividades criativas, presente infantil, arte, lazer'
    };
    const base = mapa[tema.toLowerCase()] || mapa.default;
    return base.split(',').map((s: string) => s.trim()).slice(0, 7);
  }

  private gerarCategoriasAmazon(tema: string): string[] {
    const mapa: CategoryMap = {
      animais: ['Juvenile Nonfiction > Art > Drawing', 'Crafts, Hobbies & Home > Animal Coloring Books'],
      mandala: ['Crafts, Hobbies & Home > Flower Coloring Books', 'Self-Help > Meditation'],
      default: ['Crafts, Hobbies & Home > General Coloring Books', 'Juvenile Nonfiction > Art > Drawing']
    };
    return mapa[tema.toLowerCase()] || mapa.default;
  }
}
