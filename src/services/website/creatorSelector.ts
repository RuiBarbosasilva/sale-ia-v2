export class CreatorSelector {
  selectCreator(segment: string): string {
    const s = String(segment || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    if (s.includes('clinica') || s.includes('saude') || s.includes('dentista') || s.includes('odont') || s.includes('medic')) return 'clinic';
    if (
      s.includes('hamburguer') || s.includes('hamburgueria') || s.includes('burger') ||
      s.includes('restaurante') || s.includes('lanchonete') || s.includes('pizzaria') ||
      s.includes('cafe')
    ) return 'restaurant';
    if (s.includes('advogado') || s.includes('advocacia') || s.includes('contabil') || s.includes('consultoria') || s.includes('jurid')) return 'professional';
    if (s.includes('salao') || s.includes('barbearia') || s.includes('estetica') || s.includes('pet shop') || s.includes('petshop') || s.includes('pet')) return 'service';
    if (s.includes('loja') || s.includes('ecommerce') || s.includes('varejo')) return 'ecommerce';
    if (s.includes('hotel') || s.includes('resort') || s.includes('spa')) return 'premium';
    return 'local';
  }
}
export const creatorSelector = new CreatorSelector();
