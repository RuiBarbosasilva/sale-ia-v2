export class EspecialistaService {

  async consultarPlataforma(plataforma: string) {
    const base = this.getBaseConhecimento();
    const info = (base as any)[plataforma.toLowerCase()];
    if (!info) {
      return { erro: 'Plataforma nao encontrada.', disponiveis: Object.keys(base) };
    }
    return info;
  }

  async compararPlataformas() {
    const base = this.getBaseConhecimento();
    const comparacao = Object.entries(base).map(([nome, info]: [string, any]) => ({
      plataforma: nome,
      tipo: info.tipo,
      comissaoMedia: info.comissaoMedia,
      melhorNicho: info.melhorNicho,
      dificuldade: info.dificuldade,
      potencialLucro: info.potencialLucro,
      recomendacao: info.recomendacao
    }));
    return comparacao.sort((a: any, b: any) => b.potencialLucro - a.potencialLucro);
  }

  async guiaProdutor(tipoProduto: string) {
    const guias: any = {
      ebook: {
        titulo: 'Como Criar e Vender um E-book do Zero',
        passos: [
          '1. ESCOLHA O NICHO: Use o Hunter para identificar dores reais. Top 3: Saude/Emagrecimento, Renda Extra, Relacionamento.',
          '2. ESTRUTURE: 7-10 capitulos, cada um resolve UMA dor. Use IA para rascunho inicial.',
          '3. DESIGN: Canva (gratis) para capa e PDF. Formato A4, fonte legivel.',
          '4. CADASTRE: Kiwify (rapida, 24h) ou Hotmart (mais trafego).',
          '5. PRECO: Entrada R$ 27-47. Completo R$ 67-97. Pack com bonus R$ 97-147.',
          '6. PAGINA: Construtor da propria plataforma ou WordPress + Elementor.',
          '7. UPSELL: Segundo produto complementar no checkout por +R$ 27-47.',
          '8. TRAFEGO: TikTok/Reels organico (3 videos/dia). Depois Facebook Ads R$ 20-50/dia.'
        ],
        ferramentasGratuitas: ['Canva', 'Google Docs', 'ChatGPT/Claude', 'Kiwify', 'CapCut'],
        tempoEstimado: '3-7 dias',
        investimentoInicial: 'R$ 0'
      },
      curso: {
        titulo: 'Como Criar e Vender um Curso Online',
        passos: [
          '1. VALIDE: Pagina de captura + lista de espera. 50+ cadastros em 7 dias = valido.',
          '2. ESTRUTURE: Modulos de 3-5 aulas, 10-20 min cada. Problema > Explicacao > Exemplo > Tarefa.',
          '3. GRAVE: Celular + microfone lapela R$ 30 + luz natural. Tela com OBS Studio.',
          '4. EDICAO: CapCut gratis para cortar silos e legendas.',
          '5. HOSPEDAGEM: Kiwify (simples) ou Hotmart (robusta).',
          '6. PRECO: Basico R$ 97-197. Completo R$ 297-497. Mentoria R$ 497-997.',
          '7. LANCAMENTO: Webinar ao vivo + oferta 48h. Depois perpetuo.',
          '8. ESCALA: Afiliados 40-60% + trafego pago Facebook/YouTube Ads.'
        ],
        ferramentasGratuitas: ['OBS Studio', 'CapCut', 'Canva', 'Kiwify/Hotmart', 'Zoom/Meet'],
        tempoEstimado: '2-4 semanas',
        investimentoInicial: 'R$ 30-100'
      },
      template: {
        titulo: 'Como Criar e Vender Templates Digitais',
        passos: [
          '1. IDENTIFIQUE A DOR: Templates resolvem tempo. Ex: planilhas, templates Canva, prompts IA, contratos.',
          '2. CRIE: Ferramenta nativa (Excel, Canva, Notion). Algo que VOCE usaria.',
          '3. MOCKUPS: Canva cria imagens 3D do template.',
          '4. CADASTRE: Kiwify para ticket baixo R$ 9-47.',
          '5. PRECO: Unico R$ 9-27. Pack R$ 27-67. +Tutorial R$ 47-97.',
          '6. DIVULGACAO: TikTok/Reels mostrando antes/depois. Pinterest para design.',
          '7. ESCALA: Bundle com todos os templates como produto premium.'
        ],
        ferramentasGratuitas: ['Canva', 'Notion', 'Google Sheets', 'Kiwify'],
        tempoEstimado: '1-3 dias por template',
        investimentoInicial: 'R$ 0'
      }
    };
    const guia = guias[tipoProduto.toLowerCase()];
    if (!guia) {
      return { erro: 'Tipo nao encontrado.', tiposDisponiveis: ['ebook', 'curso', 'template'] };
    }
    return guia;
  }

  async estrategiaCompleta() {
    return {
      titulo: 'Estrategia: De Afiliado a Produtor em 90 Dias',
      fase1: {
        periodo: 'Dias 1-30 (AFILIADO)',
        acoes: [
          'Escolha 2 produtos alta comissao (Kiwify/Braip: encapsulados 50-70%)',
          'Gere 3 copies AIDA por produto',
          'Crie 3 videos/dia no TikTok/Reels',
          'Use Vendedor Virtual para atender leads',
          'Meta: R$ 1.000-3.000 em comissoes'
        ]
      },
      fase2: {
        periodo: 'Dias 31-60 (PRODUTOR)',
        acoes: [
          'Analise duvidas frequentes dos leads',
          'Crie e-book ou template que resolve dor principal',
          'Cadastre na Kiwify preco R$ 27-47',
          'Ofereca para base de leads da Fase 1',
          'Meta: R$ 2.000-5.000'
        ]
      },
      fase3: {
        periodo: 'Dias 61-90 (ESCALA)',
        acoes: [
          'Crie curso completo baseado no e-book (upsell R$ 97-197)',
          'Funil automatico: Video gratis > E-book R$ 27 > Curso R$ 97',
          'Abra programa de afiliados 50% comissao',
          'Invista 30% lucro em trafego pago',
          'Meta: R$ 5.000-15.000/mes recorrente'
        ]
      }
    };
  }

  private getBaseConhecimento(): any {
    return {
      hotmart: {
        tipo: 'Infoprodutos e Cursos', comissaoMedia: '30-80%', melhorNicho: 'Cursos, mentorias, e-books',
        dificuldade: 'Media', potencialLucro: 9, taxaPlataforma: '9.9% + R$ 1', saqueMinimo: 'R$ 20', tempoSaque: '30 dias',
        pontosFortes: 'Maior marketplace BR, trafego organico, API robusta',
        pontosFracos: 'Taxa alta, concorrencia brutal',
        recomendacao: 'Ideal para quem ja tem audiencia ou cursos proprios.',
        dicaProdutor: 'Curso R$ 97-297 com 3-5 modulos. Lancamento semente com webinar.'
      },
      kiwify: {
        tipo: 'Infoprodutos e Encapsulados', comissaoMedia: '40-80%', melhorNicho: 'Encapsulados, e-books emagrecimento',
        dificuldade: 'Baixa', potencialLucro: 9, taxaPlataforma: '8.99% + R$ 2.49', saqueMinimo: 'R$ 20', tempoSaque: '15 dias',
        pontosFortes: 'Checkout mais rapido do Brasil, liberacao rapida, suporta encapsulados',
        pontosFracos: 'Menos trafego organico',
        recomendacao: 'MELHOR para comecar com encapsulados. Comissao alta, checkout converte muito.',
        dicaProdutor: 'Order bump R$ 19-27 no checkout aumenta ticket medio.'
      },
      braip: {
        tipo: 'Encapsulados Fisicos', comissaoMedia: '40-70%', melhorNicho: 'Saude, emagrecimento, pele',
        dificuldade: 'Baixa', potencialLucro: 8, taxaPlataforma: '9.9% + R$ 1', saqueMinimo: 'R$ 20', tempoSaque: '30 dias',
        pontosFortes: 'Especialista em encapsulados, logistica integrada',
        pontosFracos: 'Focado apenas em encapsulados',
        recomendacao: 'Perfeita para encapsulados. Produtor cuida de tudo, voce so divulga.',
        dicaProdutor: 'Encapsulado proprio com laboratorio terceirizado + Braip = logistica completa.'
      },
      monetizze: {
        tipo: 'Digitais e Fisicos', comissaoMedia: '40-70%', melhorNicho: 'Encapsulados, cursos',
        dificuldade: 'Media', potencialLucro: 7, taxaPlataforma: '9.9% + R$ 1', saqueMinimo: 'R$ 20', tempoSaque: '30 dias',
        pontosFortes: 'Aceita fisicos e digitais, boa variedade',
        pontosFracos: 'Interface menos moderna',
        recomendacao: 'Alternativa a Braip. Teste ambos.',
        dicaProdutor: 'Use para produtos fisicos variados (nao so encapsulados).'
      },
      clickbank: {
        tipo: 'Infoprodutos Internacional', comissaoMedia: '50-75%', melhorNicho: 'Health & Fitness, E-business',
        dificuldade: 'Alta', potencialLucro: 10, taxaPlataforma: '7.5% + US$ 1', saqueMinimo: 'US$ 10', tempoSaque: 'Semanal',
        pontosFortes: 'Comissao em DOLAR, mercado global, produtos validados',
        pontosFracos: 'Precisa trafego em ingles',
        recomendacao: 'MAIOR potencial. Gravity 50-100, comissao >50%.',
        dicaProdutor: 'Produto em ingles com VSL + 60-75% comissao = US$ 5k-50k/mes.'
      },
      shopee: {
        tipo: 'Marketplace Fisico', comissaoMedia: '3-15%', melhorNicho: 'Eletronicos, casa, moda',
        dificuldade: 'Baixa', potencialLucro: 5, taxaPlataforma: '0%', saqueMinimo: 'R$ 10', tempoSaque: '15 dias',
        pontosFortes: 'Volume altissimo, Shopee Video entrega trafego',
        pontosFracos: 'Comissao baixa, cookie curto 7 dias',
        recomendacao: 'Ideal para comecar. Foque em R$ 50-150 com muitas avaliacoes.',
        dicaProdutor: 'Loja propria + programa de afiliados Shopee = exercito de vendedores.'
      },
      amazon: {
        tipo: 'Marketplace Global', comissaoMedia: '4-15%', melhorNicho: 'Eletronicos, livros, casa',
        dificuldade: 'Media', potencialLucro: 6, taxaPlataforma: '0%', saqueMinimo: 'R$ 50', tempoSaque: '60 dias',
        pontosFortes: 'Confianca total, cookie 24h (qualquer compra conta)',
        pontosFracos: 'Comissao baixa, cookie curto',
        recomendacao: 'Complementar. Reviews no YouTube convertem muito.',
        dicaProdutor: 'Amazon FBA + programa afiliados = escala global.'
      },
      eduzz: {
        tipo: 'Infoprodutos (Alternativa Hotmart)', comissaoMedia: '40-80%', melhorNicho: 'Cursos, mentorias',
        dificuldade: 'Media', potencialLucro: 8, taxaPlataforma: '4.99% + R$ 1', saqueMinimo: 'R$ 25', tempoSaque: '30 dias',
        pontosFortes: 'Taxa menor que Hotmart, checkout bom, upsells',
        pontosFracos: 'Menos trafego organico',
        recomendacao: 'Excelente para diversificar da Hotmart.',
        dicaProdutor: 'Ticket medio R$ 97-497. Taxa menor = margem maior.'
      },
      ticto: {
        tipo: 'High-Ticket', comissaoMedia: '50-80%', melhorNicho: 'Mentorias premium',
        dificuldade: 'Alta', potencialLucro: 10, taxaPlataforma: '8.99%', saqueMinimo: 'R$ 50', tempoSaque: '30 dias',
        pontosFortes: 'Foco em high-ticket R$ 997+, checkout otimizado',
        pontosFracos: 'Precisa estrategia de lancamento',
        recomendacao: 'Para produtos caros. Uma venda = R$ 500-4000 comissao.',
        dicaProdutor: 'Mentoria R$ 997-2997 + lancamento semente webinar.'
      },
      jvzoo: {
        tipo: 'Softwares Internacional', comissaoMedia: '50-75%', melhorNicho: 'Softwares, plugins',
        dificuldade: 'Media', potencialLucro: 8, taxaPlataforma: '5.4% + US$ 1', saqueMinimo: 'US$ 50', tempoSaque: 'Semanal',
        pontosFortes: 'DOLAR, receita recorrente',
        pontosFracos: 'Precisa entender software',
        recomendacao: 'Otimo para tech. Software com comissao recorrente = mina de ouro.',
        dicaProdutor: 'Software/plugin proprio + 50-75% recorrente.'
      },
      warriorplus: {
        tipo: 'Marketing Digital Internacional', comissaoMedia: '50-100%', melhorNicho: 'Marketing, trafego, SEO',
        dificuldade: 'Media', potencialLucro: 7, taxaPlataforma: '6% + US$ 1', saqueMinimo: 'US$ 50', tempoSaque: 'Imediato',
        pontosFortes: 'DOLAR, comunidade forte',
        pontosFracos: 'Muitos produtos ruins',
        recomendacao: 'Filtre: rating >4 estrelas, gravidade >20.',
        dicaProdutor: 'Curso marketing digital em ingles = mercado gigante.'
      },
      shareasale: {
        tipo: 'Rede Global', comissaoMedia: '5-20%', melhorNicho: 'E-commerce, SaaS',
        dificuldade: 'Media', potencialLucro: 7, taxaPlataforma: '0%', saqueMinimo: 'US$ 50', tempoSaque: 'Mensal',
        pontosFortes: '4.800+ merchants, marcas conhecidas',
        pontosFracos: 'Comissao menor',
        recomendacao: 'Reviews em blogs/YouTube.',
        dicaProdutor: 'E-commerce proprio + exercito de afiliados.'
      },
      cj_affiliate: {
        tipo: 'Rede Premium Global', comissaoMedia: '3-15%', melhorNicho: 'Grandes marcas (Nike, Best Buy)',
        dificuldade: 'Alta', potencialLucro: 8, taxaPlataforma: '0%', saqueMinimo: 'US$ 50', tempoSaque: 'Mensal',
        pontosFortes: 'Marcas GIGANTES, confiabilidade',
        pontosFracos: 'Aprovacao rigorosa',
        recomendacao: 'Blog/site com trafego consolidado.',
        dicaProdutor: 'Marca estabelecida + CJ = exercito de afiliados.'
      },
      impact: {
        tipo: 'Parcerias Premium', comissaoMedia: '5-25%', melhorNicho: 'SaaS, e-commerce premium',
        dificuldade: 'Media', potencialLucro: 9, taxaPlataforma: '0%', saqueMinimo: 'US$ 10', tempoSaque: 'Mensal',
        pontosFortes: 'Shopify, Uber, Airbnb. Rastreamento avancado.',
        pontosFracos: 'Aprovacao seletiva',
        recomendacao: 'MELHOR para SaaS e marcas premium. Comissoes recorrentes.',
        dicaProdutor: 'SaaS proprio + Impact = melhor plataforma de afiliados.'
      },
      lomadee: {
        tipo: 'Rede Brasileira', comissaoMedia: '2-15%', melhorNicho: 'Magalu, Casas Bahia, Americanas',
        dificuldade: 'Baixa', potencialLucro: 6, taxaPlataforma: '0%', saqueMinimo: 'R$ 50', tempoSaque: 'Mensal',
        pontosFortes: 'Grandes varejistas BR, facil aprovacao',
        pontosFracos: 'Comissao baixa',
        recomendacao: 'Reviews de produtos BR com audiencia local.',
        dicaProdutor: 'E-commerce BR + Lomadee = afiliados promovendo.'
      },
      awin: {
        tipo: 'Rede Global (Europa + BR)', comissaoMedia: '3-15%', melhorNicho: 'Moda, beleza, viagens',
        dificuldade: 'Media', potencialLucro: 8, taxaPlataforma: '0%', saqueMinimo: 'US$ 20', tempoSaque: 'Mensal',
        pontosFortes: 'Forte na Europa, AliExpress, Etsy, Booking',
        pontosFracos: 'Taxa adesao US$ 5 (reembolsada)',
        recomendacao: 'Essencial para mercado europeu.',
        dicaProdutor: 'Vende para Europa? Awin obrigatoria.'
      }
    };
  }
}
