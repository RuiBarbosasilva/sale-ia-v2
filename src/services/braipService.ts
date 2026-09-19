import { salesPlatformService } from './salesPlatformService';
import { affiliateIntelligenceService } from './affiliateIntelligenceService';

export const braipService = {
  async status() {
    await salesPlatformService.bootstrap();
    const networks:any[] = await affiliateIntelligenceService.listNetworks();
    const braip = networks.find(n => n.slug === 'braip');
    return {
      network: 'braip',
      configured: Boolean(braip?.credentialStatus === 'CONFIGURED'),
      credentialStatus: braip?.credentialStatus || 'NOT_CONFIGURED',
      discoveryMode: 'MANUAL_OR_OFFICIAL_API',
      affiliateMode: 'SUPERVISED',
      postbackSupported: true,
      officialBaseUrl: 'https://braip.com',
      note: 'A integração não inventa endpoints privados. Produtos podem ser importados manualmente até existir uma API oficial de catálogo de afiliados validada.'
    };
  },
  async importProducts(products:any[]) {
    await salesPlatformService.bootstrap();
    const networks:any[] = await affiliateIntelligenceService.listNetworks();
    const braip = networks.find(n => n.slug === 'braip');
    if (!braip) throw new Error('BRAIP_NETWORK_NOT_FOUND');
    return affiliateIntelligenceService.ingestProducts(braip.id, products);
  }
};
