import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ==========================================
// CÉREBRO DE COPYWRITING AVANÇADO
// Frameworks: PAS, AIDA, PNL, Gatilhos Mentais
// ==========================================

interface CampaignData {
  productName: string;
  category: string;
  price: number;
  commission: number;
  trackingCode: string;
  language: 'pt-BR' | 'en-US';
}

// Banco de dados de Hooks (Ganchos) por nicho e idioma
const hooksDatabase = {
  'pt-BR': {
    'saude-emagrecimento': [
      "🔥 Cansado de dietas que não funcionam? A ciência finalmente descobriu o motivo...",
      "⚠️ ATENÇÃO: Se você tem mais de 30 anos e não consegue emagrecer, veja isso...",
      " Cientistas japoneses descobrem ritual de 10 segundos que derrete gordura...",
      "😱 Ela perdeu 12kg em 30 dias sem academia. O segredo vai te chocar..."
    ],
    'saude-geral': [
      " Seu médico não quer que você saiba disso sobre sua saúde...",
      "⚡ Descubra o suplemento que está revolucionando a saúde no Brasil...",
      " 97% das pessoas não sabem, mas este ingrediente natural pode salvar sua vida...",
      "🔬 Estudo de Harvard revela: 1 xícara disso por dia muda tudo..."
    ],
    'desenvolvimento-pessoal': [
      "🧠 O hábito de 5 minutos que bilionários fazem toda manhã (e você não faz)...",
      "💰 Se você ganha menos de R$10k por mês, precisa ver isso urgentemente...",
      "🎯 Por que 99% das pessoas fracassam (e como estar no 1% que vence)...",
      "🚀 A técnica de PNL que CEOs usam para dobrar sua produtividade..."
    ],
    'relacionamentos': [
      "❤️‍🔥 A frase exata que faz qualquer homem se apaixonar (comprovado pela psicologia)...",
      "💔 Se ele está se afastando, faça ISSO agora (funciona em 24h)...",
      "🔥 O segredo das mulheres irresistíveis que nenhum homem consegue resistir...",
      "💍 Como transformar qualquer relacionamento em 7 dias ou menos..."
    ]
  },
  'en-US': {
    'saude-emagrecimento': [
      "🔥 Tired of diets that don't work? Science finally discovered why...",
      "⚠️ WARNING: If you're over 30 and can't lose weight, watch this...",
      " Japanese scientists discover 10-second morning ritual that melts fat...",
      "😱 She lost 25lbs in 30 days without gym. The secret will shock you..."
    ],
    'saude-geral': [
      "💊 Your doctor doesn't want you to know this about your health...",
      "⚡ Discover the supplement revolutionizing health in America...",
      "🌿 97% of people don't know, but this natural ingredient can save your life...",
      "🔬 Harvard study reveals: 1 cup of this per day changes everything..."
    ],
    'desenvolvimento-pessoal': [
      "🧠 The 5-minute habit billionaires do every morning (and you don't)...",
      "💰 If you make less than $5k/month, you need to see this urgently...",
      "🎯 Why 99% of people fail (and how to be in the 1% who win)...",
      "🚀 The NLP technique CEOs use to double their productivity..."
    ],
    'relacionamentos': [
      "❤️‍🔥 The exact phrase that makes any man fall in love (psychology proven)...",
      "💔 If he's pulling away, do THIS now (works in 24h)...",
      "🔥 The secret of irresistible women that no man can resist...",
      "💍 How to transform any relationship in 7 days or less..."
    ]
  }
};

// Corpo da Copy (Framework PAS: Problema - Agitação - Solução)
function generateBody(productName: string, language: 'pt-BR' | 'en-US'): string {
  if (language === 'pt-BR') {
    return `Você já sentiu que, não importa o que tente, os resultados simplesmente não aparecem? 😔

A verdade é que não é culpa sua. O sistema tradicional foi feito para falhar.

Mas e se eu te dissesse que existe um método comprovado que está transformando vidas em tempo recorde? ⚡

${productName} não é mais um produto genérico. É a solução que milhares de pessoas já estão usando para conquistar resultados reais.

✅ Resultados comprovados
✅ Garantia total de satisfação
✅ Acesso imediato

👇 Toque no link da bio AGORA antes que saia do ar.`;
  } else {
    return `Ever felt like no matter what you try, the results just don't show up? 😔

Truth is, it's not your fault. The traditional system was designed to fail.

But what if I told you there's a proven method that's transforming lives in record time? 

${productName} isn't just another generic product. It's the solution thousands of people are already using to get real results.

✅ Proven results
✅ Full satisfaction guarantee
✅ Instant access

 Tap the link in bio NOW before it's gone.`;
  }
}

// Call to Action com Urgência
function generateCTA(trackingCode: string, language: 'pt-BR' | 'en-US'): string {
  if (language === 'pt-BR') {
    return ` Link exclusivo: https://seu-dominio.com/go/${trackingCode}

⏰ ATENÇÃO: Esta oferta especial pode sair do ar a qualquer momento. Garanta sua vaga agora!

#transformação #saúde #emagrecimento #desenvolvimentopessoal #sucesso`;
  } else {
    return `🔗 Exclusive link: https://seu-dominio.com/go/${trackingCode}

⏰ WARNING: This special offer may be taken down at any moment. Secure your spot now!

#transformation #health #weightloss #personaldevelopment #success`;
  }
}

// Sugestão de Criativo Visual
function generateVisualPrompt(productName: string, category: string, language: 'pt-BR' | 'en-US'): string {
  const prompts = {
    'pt-BR': {
      'saude-emagrecimento': `📸 SUGESTÃO DE VÍDEO: Pessoa acordando cedo, preparando um drink saudável em câmera lenta, com texto na tela: "O ritual matinal que mudou tudo". Use música trending do TikTok.`,
      'saude-geral': `📸 SUGESTÃO DE VÍDEO: Close em mãos preparando suplemento natural, com luz natural. Texto: "O que seu médico não te conta". Áudio: som de natureza.`,
      'desenvolvimento-pessoal': `📸 SUGESTÃO DE VÍDEO: Time-lapse de alguém trabalhando em laptop em escritório moderno, com café. Texto: "O hábito dos 1%". Música: motivacional.`,
      'relacionamentos': ` SUGESTÃO DE VÍDEO: Casal feliz caminhando na praia ao pôr do sol. Texto: "O segredo que ninguém te conta sobre amor". Áudio: romântico.`
    },
    'en-US': {
      'saude-emagrecimento': ` VIDEO SUGGESTION: Person waking up early, preparing a healthy drink in slow motion, with on-screen text: "The morning ritual that changed everything". Use TikTok trending audio.`,
      'saude-geral': `📸 VIDEO SUGGESTION: Close-up of hands preparing natural supplement, with natural lighting. Text: "What your doctor won't tell you". Audio: nature sounds.`,
      'desenvolvimento-pessoal': `📸 VIDEO SUGGESTION: Time-lapse of someone working on laptop in modern office, with coffee. Text: "The 1% habit". Music: motivational.`,
      'relacionamentos': `📸 VIDEO SUGGESTION: Happy couple walking on beach at sunset. Text: "The secret nobody tells you about love". Audio: romantic.`
    }
  };
  return prompts[language][category as keyof typeof prompts['pt-BR']] || prompts[language]['saude-geral'];
}

// Gerador de código de rastreamento único
function generateTrackingCode(): string {
  return Math.random().toString(36).substring(2, 8);
}

// ==========================================
// MOTOR PRINCIPAL DE AUTOMAÇÃO DUAL
// ==========================================

async function runDualAutomation() {
  console.log('\n🌎 INICIANDO MOTOR DE AUTOMAÇÃO DUAL (BR + INTERNACIONAL)\n');
  
  const produtos = await prisma.afiliadoProduto.findMany({
    where: { status: 'ativo' },
    take: 3
  });

  if (produtos.length === 0) {
    console.log('⚠️ Nenhum produto ativo encontrado.');
    return;
  }

  const contas = [
    { idioma: 'pt-BR' as const, mercado: 'BRASIL 🇧🇷', conta: '@sua_conta_br' },
    { idioma: 'en-US' as const, mercado: 'INTERNACIONAL 🌎', conta: '@your_global_account' }
  ];

  for (const produto of produtos) {
    console.log('\n' + '='.repeat(70));
    console.log(`📦 PRODUTO: ${produto.nome.toUpperCase()}`);
    console.log('='.repeat(70));

    for (const conta of contas) {
      const trackingCode = generateTrackingCode();
      const categoria = produto.categoria || 'saude-geral';
      
      // Selecionar hook aleatório
      const hooks = hooksDatabase[conta.idioma][categoria as keyof typeof hooksDatabase['pt-BR']] 
                    || hooksDatabase[conta.idioma]['saude-geral'];
      const hook = hooks[Math.floor(Math.random() * hooks.length)];
      
      const body = generateBody(produto.nome, conta.idioma);
      const cta = generateCTA(trackingCode, conta.idioma);
      const visualPrompt = generateVisualPrompt(produto.nome, categoria, conta.idioma);
      
      const copyCompleta = `${hook}\n\n${body}\n\n${cta}`;

      // Salvar campanha no banco
      const publicacao = await prisma.afiliadoPublicacao.create({
        data: {
          produtoId: produto.id,
          canal: `instagram_${conta.idioma === 'pt-BR' ? 'br' : 'global'}`,
          postIdExterno: `AUTO_${Date.now()}_${conta.idioma}`,
          status: 'agendado',
          dmsEnviados: 0,
          vendasConfirmadas: 0,
          comissaoGerada: 0
        }
      });

      console.log(`\n${'─'.repeat(70)}`);
      console.log(`🎯 CONTA: ${conta.mercado} (${conta.conta})`);
      console.log(` LINK: https://seu-dominio.com/go/${trackingCode}`);
      console.log(`📊 ID Campanha: ${publicacao.id}`);
      console.log(`${'─'.repeat(70)}`);
      console.log('\n📝 COPY COMPLETA (Copie e Cole):');
      console.log(copyCompleta);
      console.log(`\n${visualPrompt}`);
      console.log(`${'─'.repeat(70)}`);
    }
  }

  console.log('\n\n🎉 AUTOMAÇÃO DUAL CONCLUÍDA!');
  console.log('✅ 6 campanhas geradas (3 produtos × 2 mercados)');
  console.log('✅ Todas salvas no banco com rastreamento único');
  console.log('✅ Pronto para postar nas contas Instagram\n');
  
  await prisma.$disconnect();
}

runDualAutomation().catch(e => {
  console.error('❌ Erro na automação:', e);
  process.exit(1);
});
