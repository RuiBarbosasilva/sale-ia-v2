import * as fs from 'fs';
import * as path from 'path';

export class CredenciaisService {
  private credPath = path.resolve(process.cwd(), 'credenciais.json');

  private getTodasPlataformas() {
    return [
      { nome: 'mercadolivre', categoria: 'marketplace', status: 'integrado', campos: ['client_id', 'client_secret', 'access_token'] },
      { nome: 'hotmart', categoria: 'infoprodutos', status: 'integrado', campos: ['client_id', 'client_secret', 'webhook_secret'] },
      { nome: 'kiwify', categoria: 'infoprodutos', status: 'pendente', campos: ['api_token'] },
      { nome: 'braip', categoria: 'encapsulados', status: 'pendente', campos: ['api_token'] },
      { nome: 'clickbank', categoria: 'internacional', status: 'pendente', campos: ['dev_key', 'affiliate_key'] },
      { nome: 'shopee', categoria: 'marketplace', status: 'nao_integrado', campos: ['partner_id', 'partner_key', 'shop_id'] },
      { nome: 'amazon', categoria: 'marketplace', status: 'nao_integrado', campos: ['access_key', 'secret_key', 'associate_tag'] },
      { nome: 'monetizze', categoria: 'infoprodutos', status: 'nao_integrado', campos: ['api_token', 'public_token'] },
      { nome: 'eduzz', categoria: 'infoprodutos', status: 'nao_integrado', campos: ['client_id', 'client_secret'] },
      { nome: 'ticto', categoria: 'high_ticket', status: 'nao_integrado', campos: ['api_token'] },
      { nome: 'jvzoo', categoria: 'internacional', status: 'nao_integrado', campos: ['api_key', 'vendor_id'] },
      { nome: 'warriorplus', categoria: 'internacional', status: 'nao_integrado', campos: ['api_key'] },
      { nome: 'shareasale', categoria: 'rede_afiliados', status: 'nao_integrado', campos: ['api_token', 'merchant_id'] },
      { nome: 'cj_affiliate', categoria: 'rede_afiliados', status: 'nao_integrado', campos: ['developer_key', 'site_id'] },
      { nome: 'impact', categoria: 'parcerias', status: 'nao_integrado', campos: ['account_sid', 'auth_token', 'program_id'] },
      { nome: 'lomadee', categoria: 'rede_brasileira', status: 'nao_integrado', campos: ['app_token', 'source_id'] },
      { nome: 'awin', categoria: 'rede_global', status: 'nao_integrado', campos: ['auth_token', 'publisher_id'] }
    ];
  }

  async listarPlataformas() {
    const credenciais = this.lerCredenciais();
    const plataformas = this.getTodasPlataformas();

    return plataformas.map(p => {
      const cred = credenciais[p.nome] || {};
      const camposPreenchidos = p.campos.filter(c => cred[c] && cred[c] !== '').length;
      const totalCampos = p.campos.length;
      const percentual = totalCampos > 0 ? Math.round((camposPreenchidos / totalCampos) * 100) : 0;

      return {
        nome: p.nome,
        categoria: p.categoria,
        status: p.status,
        camposObrigatorios: p.campos,
        camposPreenchidos: camposPreenchidos,
        totalCampos: totalCampos,
        percentualConfigurado: percentual,
        prontoParaAtivar: percentual === 100 && p.status !== 'integrado'
      };
    });
  }

  async cadastrarCredencial(plataforma: string, credenciais: any) {
    const todas = this.getTodasPlataformas();
    const plat = todas.find(p => p.nome === plataforma.toLowerCase());
    
    if (!plat) {
      return { sucesso: false, erro: 'Plataforma nao encontrada: ' + plataforma };
    }

    const atuais = this.lerCredenciais();
    atuais[plataforma.toLowerCase()] = { ...atuais[plataforma.toLowerCase()], ...credenciais };
    this.salvarCredenciais(atuais);

    return { 
      sucesso: true, 
      mensagem: 'Credenciais de ' + plataforma + ' salvas com sucesso!',
      plataforma: plataforma,
      camposAtualizados: Object.keys(credenciais)
    };
  }

  async obterStatusPlataforma(plataforma: string) {
    const todas = this.getTodasPlataformas();
    const plat = todas.find(p => p.nome === plataforma.toLowerCase());
    
    if (!plat) {
      return { sucesso: false, erro: 'Plataforma nao encontrada' };
    }

    const credenciais = this.lerCredenciais();
    const cred = credenciais[plataforma.toLowerCase()] || {};

    return {
      sucesso: true,
      dados: {
        nome: plat.nome,
        categoria: plat.categoria,
        status: plat.status,
        camposObrigatorios: plat.campos.map(c => ({
          campo: c,
          preenchido: !!(cred[c] && cred[c] !== ''),
          valorMascarado: cred[c] ? this.mascarar(cred[c]) : null
        }))
      }
    };
  }

  private mascarar(valor: string): string {
    if (valor.length <= 8) return '****';
    return valor.substring(0, 4) + '...' + valor.substring(valor.length - 4);
  }

  private lerCredenciais(): any {
    try {
      if (fs.existsSync(this.credPath)) {
        return JSON.parse(fs.readFileSync(this.credPath, 'utf-8'));
      }
    } catch (e) {}
    return {};
  }

  private salvarCredenciais(credenciais: any) {
    fs.writeFileSync(this.credPath, JSON.stringify(credenciais, null, 2));
  }
}
