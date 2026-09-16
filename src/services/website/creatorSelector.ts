export class CreatorSelector {
  selectCreator(segment: string): string {
    const s = segment.toLowerCase();
    if (s.includes('clinica') || s.includes('saude') || s.includes('dentista')) return 'clinic';
    if (s.includes('restaurante') || s.includes('lanchonete') || s.includes('pizzaria')) return 'restaurant';
    if (s.includes('advogado') || s.includes('contabil') || s.includes('consultoria')) return 'professional';
    if (s.includes('salao') || s.includes('barbearia') || s.includes('estetica')) return 'service';
    if (s.includes('loja') || s.includes('ecommerce')) return 'ecommerce';
    if (s.includes('hotel') || s.includes('resort') || s.includes('spa')) return 'premium';
    return 'local';
  }
}
export const creatorSelector = new CreatorSelector();
