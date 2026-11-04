import { generateTikTokAffiliatePackage } from '../src/modules/afiliados-ia/services/tiktokAffiliateContent.service';

describe('TikTok affiliate content planner', () => {
  const validInput = {
    productName: 'Garrafa térmica',
    category: 'casa',
    description: 'Garrafa reutilizável com tampa rosqueável',
    affiliateUrl: 'https://example.com/affiliate?ref=abc'
  };

  it('creates a reviewable script with commercial disclosure and no fake performance claims', () => {
    const result = generateTikTokAffiliatePackage(validInput);
    expect(result.platform).toBe('tiktok');
    expect(result.scenes).toHaveLength(3);
    expect(result.affiliateDisclosure.toLowerCase()).toContain('afiliado');
    expect(result.publicationMode).toBe('DRAFT_REQUIRES_HUMAN_REVIEW');
    expect(result.validationNotes.some(note => note.includes('nenhuma publicação'))).toBe(true);
    expect(result.caption).not.toMatch(/milhares de vendas|5 estrelas|garantido/i);
  });

  it('rejects missing product and affiliate URL', () => {
    expect(() => generateTikTokAffiliatePackage({ ...validInput, productName: ' ' }))
      .toThrow('TIKTOK_PRODUCT_NAME_REQUIRED');
    expect(() => generateTikTokAffiliatePackage({ ...validInput, affiliateUrl: '' }))
      .toThrow('TIKTOK_AFFILIATE_URL_REQUIRED');
  });

  it('rejects unsafe protocols and embedded credentials', () => {
    expect(() => generateTikTokAffiliatePackage({ ...validInput, affiliateUrl: 'javascript:alert(1)' }))
      .toThrow('TIKTOK_AFFILIATE_URL_INVALID');
    expect(() => generateTikTokAffiliatePackage({ ...validInput, affiliateUrl: 'https://user:pass@example.com/path' }))
      .toThrow('TIKTOK_AFFILIATE_URL_INVALID');
  });

  it('enforces a 15 to 60 second duration', () => {
    expect(() => generateTikTokAffiliatePackage({ ...validInput, durationSeconds: 10 }))
      .toThrow('TIKTOK_DURATION_INVALID');
    expect(() => generateTikTokAffiliatePackage({ ...validInput, durationSeconds: 61 }))
      .toThrow('TIKTOK_DURATION_INVALID');
  });
});
