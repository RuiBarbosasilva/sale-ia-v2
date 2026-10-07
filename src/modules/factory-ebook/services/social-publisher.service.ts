type LivroSocialMetadata = {
  titulo: string;
  tema: string;
};

type HookMap = Record<string, string>;

export class SocialPublisherService {
  gerarCalendario30Dias(metadataLivro: LivroSocialMetadata) {
    const temas = ['Bastidores da criação', 'Dica de colorir', 'Desafio da semana', 'Depoimento de cliente real', 'Antes e Depois'];
    const dias = [];
    
    for (let i = 1; i <= 30; i++) {
      const tema = temas[(i - 1) % temas.length];
      dias.push({
        dia: i,
        plataforma: i % 2 === 0 ? 'TikTok / Reels' : 'Telegram / Instagram Stories',
        tema: tema,
        hook: this.getHook(tema, metadataLivro.tema),
        acao: 'Mostrar página do livro sendo colorida em timelapse',
        legenda: this.getLegenda(tema, metadataLivro.titulo),
        hashtags: '#livroparacolorir #' + metadataLivro.tema.replace(/ /g, '') + ' #arteterapia #rbfactory #amazonkdp'
      });
    }
    return dias;
  }

  private getHook(tema: string, nicho: string): string {
    const hooks: HookMap = {
      'Bastidores da criação': 'Você não vai acreditar em quanto tempo levei para criar este desenho de ' + nicho + '...',
      'Dica de colorir': 'Pare de estragar seus desenhos! Use esta dica simples para ' + nicho + '...',
      'Desafio da semana': 'Duvido você colorir esta página de ' + nicho + ' em menos de 10 minutos!',
      'Depoimento de cliente real': 'Compartilhe aqui um depoimento real e autorizado de um cliente sobre o livro.',
      'Antes e Depois': 'O resultado final deste desenho de ' + nicho + ' vai te deixar de queixo caído!'
    };
    return hooks[tema] || 'Olha só isso!';
  }

  private getLegenda(tema: string, titulo: string): string {
    return tema === 'Desafio da semana' 
      ? 'Comente "EU QUERO" que te envio o link do livro completo na Amazon! 🎨👇'
      : 'Gostou? O livro completo "' + titulo + '" já está disponível na Amazon! Link na bio. 🔗';
  }
}
