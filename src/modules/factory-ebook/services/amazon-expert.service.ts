type BookStructure = Record<string, unknown>;
type Niche = {
  nome: string;
  publico: string;
  precoIdeal: string;
  margemLucro: string;
  potencial: number;
  exemplos: string[];
  palavrasChave: string[];
  dicasEspeciais: string;
};

export class AmazonExpertService {

  async analisarNicho(nicho: string) {
    const nichos = this.getNichosLucrativos();
    const encontrado = nichos.find(n => n.nome.toLowerCase() === nicho.toLowerCase());
    
    if (!encontrado) {
      return {
        erro: 'Nicho nao encontrado na base de dados.',
        nichosDisponiveis: nichos.map(n => n.nome),
        dica: 'Use um dos nichos acima ou consulte /tendencias para ver o que esta em alta.'
      };
    }
    return encontrado;
  }

  async listarTendencias() {
    return {
      titulo: 'Tendencias Atuais da Amazon KDP (Baseado em Best-Sellers)',
      atualizadoEm: '2026',
      categoriasEmAlta: [
        {
          categoria: 'Livros de Colorir de Capa Dura (Hardcover Coloring Books)',
          tendencia: 'EXPLOSAO',
          motivo: 'Pais buscando atividades offline para criancas (longe das telas)',
          exemplosVendidos: ['Animais Fofos para Colorir', 'Dinossauros em 3D', 'Princesas e Fadas'],
          publico: 'Crianças 3-8 anos',
          precoIdeal: 'R$ 49-79 (capa dura) ou R$ 29-39 (capa mole)',
          margemLucro: 'Alta (R$ 15-30 por livro)',
          dificuldade: 'Media',
          potencial: 10
        },
        {
          categoria: 'Livros de Colorir para Adultos (Mandala e Mindfulness)',
          tendencia: 'ALTA',
          motivo: 'Ansiedade e busca por terapia alternativa',
          exemplosVendidos: ['Mandalas Terapeuticas', 'Jardim Secreto', 'Padroes Hipnoticos'],
          publico: 'Mulheres 25-55 anos',
          precoIdeal: 'R$ 39-59',
          margemLucro: 'Media (R$ 10-20 por livro)',
          dificuldade: 'Baixa',
          potencial: 8
        },
        {
          categoria: 'Activity Books (Atividades para Criancas)',
          tendencia: 'MUITO ALTA',
          motivo: 'Pais querem livros educativos + divertidos',
          exemplosVendidos: ['Meu Primeiro Livro de Atividades', 'Labirintos Divertidos', 'Ligue os Pontos'],
          publico: 'Crianças 4-8 anos',
          precoIdeal: 'R$ 29-49',
          margemLucro: 'Alta',
          dificuldade: 'Media',
          potencial: 9
        },
        {
          categoria: 'Low-Content Books (Agendas, Planners, Diarios)',
          tendencia: 'ESTAVEL',
          motivo: 'Produtividade e organizacao pessoal',
          exemplosVendidos: ['Planner 2026 Semanal', 'Diario de Gratidao', 'Bullet Journal'],
          publico: 'Adultos 20-45 anos',
          precoIdeal: 'R$ 39-69',
          margemLucro: 'Media',
          dificuldade: 'Baixa',
          potencial: 7
        },
        {
          categoria: 'Livros de Colorir Tematicos (Anime, K-Pop, Gaming)',
          tendencia: 'EXPLOSAO',
          motivo: 'Comunidades fanaticas compram tudo do nicho',
          exemplosVendidos: ['Personagens de Anime para Colorir', 'Mundos de Games', 'K-Pop Idols'],
          publico: 'Jovens 12-25 anos',
          precoIdeal: 'R$ 39-59',
          margemLucro: 'Alta',
          dificuldade: 'Media (cuidado com copyright)',
          potencial: 9
        },
        {
          categoria: 'Livros de Colorir de Animais Realistas',
          tendencia: 'ALTA',
          motivo: 'Publico adulto busca arte de qualidade',
          exemplosVendidos: ['Floresta Encantada', 'Aves do Brasil', 'Felinos Selvagens'],
          publico: 'Adultos 30-60 anos',
          precoIdeal: 'R$ 49-79',
          margemLucro: 'Alta',
          dificuldade: 'Media',
          potencial: 8
        }
      ],
      palavrasChaveVendaveis: [
        'para colorir', 'colorir', 'atividades', 'planner', 'diario',
        'criancas', 'adultos', 'relaxante', 'terapeutico', 'mandala',
        'animais', 'dinossauros', 'princesas', 'anime', 'k-pop',
        'capa dura', 'grande formato', '50 paginas', '100 paginas'
      ],
      titulosQueMaisVendem: [
        'Meu Primeiro Livro de Colorir: [TEMA]',
        '[TEMA] para Colorir: [NUMERO] Desenhos Incriveis',
        'O Grande Livro de [TEMA] para Colorir',
        '[TEMA] em [NUMERO] Paginas de Relaxamento',
        'Atividades Divertidas: [TEMA] para Criancas de [IDADE] anos',
        'Mandalas Terapeuticas: [NUMERO] Desenhos para Relaxar'
      ]
    };
  }

  async gerarEstruturaLivro(nicho: string, tipo: string) {
    const analise = await this.analisarNicho(nicho);
    if (analise.erro) return analise;

    const estruturas: Record<string, BookStructure> = {
      'colorir': {
        paginas: 50,
        estrutura: [
          { pagina: 1, tipo: 'capa_interna', conteudo: 'Este livro pertence a: _____' },
          { pagina: 2, tipo: 'introducao', conteudo: 'Bem-vindo ao mundo de [NOME DO TEMA]! Neste livro voce vai encontrar [NUMERO] desenhos unicos para colorir e se divertir. Pegue seus lapis de cor, canetinhas ou aquarelas e deixe sua criatividade fluir!' },
          { pagina: 3, tipo: 'indice', conteudo: 'Indice dos desenhos' },
          { paginas: '4-52', tipo: 'desenhos', conteudo: '1 desenho por pagina, fundo branco, linha preta, sem preenchimento' },
          { pagina: 53, tipo: 'bonus', conteudo: 'Pagina de teste de cores' },
          { pagina: 54, tipo: 'agradecimento', conteudo: 'Obrigado por colorir conosco! Deixe sua avaliacao na Amazon.' }
        ],
        especificacoesTecnicas: {
          tamanho: '8.5 x 11 polegadas (21.59 x 27.94 cm)',
          tipoPapel: 'Papel branco 90g (para colorir)',
          capa: 'Capa mole ou capa dura (hardcover)',
          margem: '0.5 polegadas em todos os lados',
          resolucaoImagens: '300 DPI minimo',
          formatoArquivo: 'PDF de alta qualidade'
        }
      },
      'atividade': {
        paginas: 80,
        estrutura: [
          { pagina: 1, tipo: 'capa_interna', conteudo: 'Este livro pertence a: _____' },
          { pagina: 2, tipo: 'introducao', conteudo: 'Prepare-se para horas de diversao! Este livro tem [NUMERO] atividades diferentes para voce se divertir e aprender.' },
          { paginas: '3-10', tipo: 'labirintos', conteudo: '8 paginas de labirintos (facil, medio, dificil)' },
          { paginas: '11-20', tipo: 'ligue_os_pontos', conteudo: '10 paginas de ligue os pontos' },
          { paginas: '21-30', tipo: 'sopa_de_letras', conteudo: '10 paginas de sopa de letras' },
          { paginas: '31-40', tipo: 'desenhos_para_completar', conteudo: '10 paginas de desenhos para completar' },
          { paginas: '41-60', tipo: 'atividades_variadas', conteudo: '20 paginas com atividades mistas' },
          { paginas: '61-75', tipo: 'colorir', conteudo: '15 paginas de colorir' },
          { pagina: 76, tipo: 'respostas', conteudo: 'Respostas dos desafios' },
          { pagina: 77, tipo: 'certificado', conteudo: 'Certificado de Conclusao (para a crianca preencher)' },
          { pagina: 78, tipo: 'agradecimento', conteudo: 'Parabens! Voce completou todas as atividades!' }
        ],
        especificacoesTecnicas: {
          tamanho: '8.5 x 11 polegadas',
          tipoPapel: 'Papel branco 90g',
          capa: 'Capa mole colorida',
          margem: '0.5 polegadas',
          resolucaoImagens: '300 DPI',
          formatoArquivo: 'PDF'
        }
      },
      'low_content': {
        paginas: 120,
        estrutura: [
          { pagina: 1, tipo: 'capa_interna', conteudo: 'Este planner pertence a: _____' },
          { pagina: 2, tipo: 'introducao', conteudo: 'Bem-vindo ao seu novo planner! Use este espaco para organizar sua vida, definir metas e acompanhar seu progresso.' },
          { paginas: '3-6', tipo: 'visao_geral', conteudo: 'Visao geral do ano (calendario anual)' },
          { paginas: '7-18', tipo: 'metas_anuais', conteudo: 'Paginas de metas anuais (12 paginas)' },
          { paginas: '19-120', tipo: 'paginas_semanais', conteudo: '52 semanas com planejamento semanal (2 paginas por semana)' },
          { paginas: '121-124', tipo: 'notas', conteudo: 'Paginas de notas' },
          { pagina: 125, tipo: 'agradecimento', conteudo: 'Obrigado por usar nosso planner!' }
        ],
        especificacoesTecnicas: {
          tamanho: '6 x 9 polegadas (portatil)',
          tipoPapel: 'Papel branco 90g',
          capa: 'Capa mole ou dura',
          margem: '0.375 polegadas',
          resolucaoImagens: '300 DPI',
          formatoArquivo: 'PDF'
        }
      }
    };

    const estrutura = estruturas[tipo.toLowerCase()];
    if (!estrutura) {
      return {
        erro: 'Tipo de livro nao encontrado.',
        tiposDisponiveis: ['colorir', 'atividade', 'low_content']
      };
    }

    return {
      nicho: analise.nome,
      tipo: tipo,
      publicoAlvo: analise.publico,
      precoSugerido: analise.precoIdeal,
      margemLucro: analise.margemLucro,
      estrutura,
      especificacoesTecnicas: estrutura.especificacoesTecnicas,
      dicasSEO: {
        titulo: 'Use palavras-chave principais no titulo + subtitulo. Ex: "Animais para Colorir: 50 Desenhos Relaxantes para Adultos"',
        descricao: 'Primeiras 200 palavras sao cruciais. Inclua palavras-chave naturalmente.',
        palavrasChave: this.gerarPalavrasChave(nicho, tipo),
        categoriasAmazon: this.getCategoriasAmazon(nicho)
      }
    };
  }

  async gerarTitulosVendaveis(nicho: string, tipo: string) {
    const templates = [
      '[TEMA] para Colorir: [NUMERO] Desenhos Incriveis para [PUBLICO]',
      'O Grande Livro de [TEMA]: [NUMERO] Paginas de [BENEFICIO]',
      'Meu Primeiro Livro de [TEMA] para Colorir',
      '[TEMA]: [NUMERO] Desenhos Unicos para Relaxar e Criar',
      'Colecao [TEMA]: Atividades Divertidas para [PUBLICO]',
      '[TEMA] em [NUMERO] Paginas: [BENEFICIO] para [PUBLICO]'
    ];

    const temas: Record<string, string[]> = {
      animais: ['Animais da Floresta', 'Animais Marinhos', 'Dinossauros', 'Borboletas', 'Gatos', 'Cachorros'],
      natureza: ['Flores', 'Jardim Encantado', 'Paisagens', 'Arvores', 'Frutas'],
      fantasia: ['Princesas', 'Fadas', 'Unicornios', 'Sereias', 'Dragoes'],
      mindfulness: ['Mandalas', 'Padroes Hipnoticos', 'Meditacao Visual', 'Yoga Visual'],
      infantil: ['Veiculos', 'Espaco Sideral', 'Super-Herois', 'Desenhos Animados']
    };

    const publicos: Record<string, string> = {
      colorir: 'Adultos e Criancas',
      atividade: 'Criancas de 4-8 anos',
      low_content: 'Adultos Organizados'
    };

    const beneficios: Record<string, string> = {
      colorir: 'Relaxamento e Criatividade',
      atividade: 'Diversao e Aprendizado',
      low_content: 'Organizacao e Produtividade'
    };

    const titulosGerados = [];
    const nichoLower = nicho.toLowerCase();
    const temaBase = temas[nichoLower] || temas.animais;

    for (const tema of temaBase.slice(0, 3)) {
      for (const template of templates.slice(0, 2)) {
        const titulo = template
          .replace('[TEMA]', tema)
          .replace('[NUMERO]', String(Math.floor(Math.random() * 30) + 30))
          .replace('[PUBLICO]', publicos[tipo] || 'Todos')
          .replace('[BENEFICIO]', beneficios[tipo] || 'Diversao');
        titulosGerados.push(titulo);
      }
    }

    return {
      nicho: nicho,
      tipo: tipo,
      titulosSugeridos: titulosGerados,
      dicas: [
        'Use numeros impares (ex: 51 desenhos) - convertem melhor',
        'Inclua a palavra "para colorir" ou "atividades" no titulo',
        'Mencione o publico-alvo (adultos, criancas, idosos)',
        'Use palavras de beneficio (relaxante, terapeutico, divertido)',
        'Subtitulo deve ter palavras-chave adicionais para SEO'
      ]
    };
  }

  async calcularPrecificacao(tipo: string, paginas: number, capaDura: boolean) {
    const custoImpressaoAmazon = 0.85 + (0.02 * paginas); // USD
    const precoVenda = capaDura ? 12.99 : 7.99; // USD
    const royalty = (precoVenda - custoImpressaoAmazon) * 0.60; // 60% de royalty
    
    return {
      tipo: tipo,
      paginas: paginas,
      capaDura: capaDura,
      custoImpressao: 'US$ ' + custoImpressaoAmazon.toFixed(2),
      precoSugerido: 'US$ ' + precoVenda.toFixed(2),
      royaltyPorVenda: 'US$ ' + royalty.toFixed(2),
      royaltyEmReais: 'R$ ' + (royalty * 5.5).toFixed(2),
      metaVendasMensais: 50,
      receitaMensalEstimada: 'US$ ' + (royalty * 50).toFixed(2) + ' (R$ ' + (royalty * 50 * 5.5).toFixed(2) + ')'
    };
  }

  private gerarPalavrasChave(nicho: string, tipo: string): string[] {
    const base = [
      'livro para colorir', 'coloring book', 'atividades para criancas',
      'livro de atividades', 'planner semanal', 'diario', 'mandala',
      'relaxante', 'terapeutico', 'anti-estresse', 'mindfulness'
    ];
    const especificas = [
      nicho.toLowerCase(),
      tipo.toLowerCase(),
      'presente criativo',
      'livro grande formato',
      '50 paginas',
      '100 paginas',
      'capa dura'
    ];
    return [...base, ...especificas].slice(0, 7); // Amazon permite 7 keywords
  }

  private getCategoriasAmazon(nicho: string): string[] {
    const categorias: Record<string, string[]> = {
      animais: ['Crafts, Hobbies & Home > Animal & Nature Coloring Books', 'Childrens Books > Animals'],
      natureza: ['Crafts, Hobbies & Home > Nature Coloring Books', 'Arts & Photography > Landscape'],
      mindfulness: ['Self-Help > Meditation > Coloring Books', 'Health & Wellness > Stress Management'],
      infantil: ['Childrens Books > Activities & Crafts', 'Education & Teaching > Activities'],
      fantasia: ['Crafts, Hobbies & Home > Fantasy Coloring Books', 'Childrens Books > Fantasy']
    };
    return categorias[nicho.toLowerCase()] || ['Crafts, Hobbies & Home > General Coloring Books'];
  }

  private getNichosLucrativos(): Niche[] {
    return [
      {
        nome: 'animais',
        publico: 'Crianças 3-10 anos e Adultos',
        precoIdeal: 'R$ 39-79',
        margemLucro: 'Alta (R$ 15-30 por livro)',
        potencial: 9,
        exemplos: ['Animais da Floresta', 'Dinossauros', 'Borboletas', 'Gatos', 'Cachorros', 'Animais Marinhos'],
        palavrasChave: ['animais para colorir', 'animais da floresta', 'dinossauros para colorir'],
        dicasEspeciais: 'Livros com animais realistas vendem mais para adultos. Animais fofos (kawaii) vendem mais para crianças.'
      },
      {
        nome: 'natureza',
        publico: 'Adultos 25-60 anos',
        precoIdeal: 'R$ 49-79',
        margemLucro: 'Alta',
        potencial: 8,
        exemplos: ['Flores', 'Jardins', 'Paisagens', 'Florestas', 'Frutas e Vegetais'],
        palavrasChave: ['flores para colorir', 'jardim encantado', 'paisagens'],
        dicasEspeciais: 'Livros botânicos com detalhes realistas são tendência forte.'
      },
      {
        nome: 'mindfulness',
        publico: 'Adultos 30-55 anos (principalmente mulheres)',
        precoIdeal: 'R$ 49-69',
        margemLucro: 'Alta',
        potencial: 9,
        exemplos: ['Mandalas', 'Padroes Hipnoticos', 'Meditacao Visual', 'Yoga Visual'],
        palavrasChave: ['mandalas para colorir', 'relaxante', 'anti-estresse', 'mindfulness'],
        dicasEspeciais: 'Mandalas são o nicho mais consistente. Combine com título "terapêutico" ou "anti-estresse".'
      },
      {
        nome: 'infantil',
        publico: 'Crianças 3-8 anos (pais compram)',
        precoIdeal: 'R$ 29-49',
        margemLucro: 'Media-Alta',
        potencial: 10,
        exemplos: ['Veiculos', 'Espaco Sideral', 'Super-Herois', 'Princesas', 'Unicornios', 'Dinossauros'],
        palavrasChave: ['livro infantil', 'atividades para criancas', 'colorir criancas'],
        dicasEspeciais: 'Livros de capa dura com tema de dinossauros/unicornios são BEST-SELLERS constantes.'
      },
      {
        nome: 'fantasia',
        publico: 'Crianças 5-12 anos e Jovens',
        precoIdeal: 'R$ 39-59',
        margemLucro: 'Alta',
        potencial: 8,
        exemplos: ['Fadas', 'Sereias', 'Dragoes', 'Unicornios', 'Castelos'],
        palavrasChave: ['fantasia para colorir', 'fadas', 'sereias'],
        dicasEspeciais: 'Cuidado com copyright de personagens famosos. Crie designs originais inspirados.'
      },
      {
        nome: 'anime',
        publico: 'Jovens 12-25 anos',
        precoIdeal: 'R$ 39-59',
        margemLucro: 'Alta',
        potencial: 9,
        exemplos: ['Personagens Anime', 'Chibi', 'Mangas', 'Kawaii'],
        palavrasChave: ['anime para colorir', 'manga', 'chibi', 'kawaii'],
        dicasEspeciais: 'Nicho em EXPLOSAO. Comunidade fanática compra tudo. Cuidado com copyright.'
      },
      {
        nome: 'atividade',
        publico: 'Crianças 4-8 anos',
        precoIdeal: 'R$ 29-49',
        margemLucro: 'Alta',
        potencial: 10,
        exemplos: ['Labirintos', 'Ligue os Pontos', 'Sopa de Letras', 'Atividades Variadas'],
        palavrasChave: ['atividades para criancas', 'labirintos', 'ligue os pontos'],
        dicasEspeciais: 'Livros de atividades com 80+ paginas vendem MUITO. Pais adoram custo-benefício.'
      }
    ];
  }
}
