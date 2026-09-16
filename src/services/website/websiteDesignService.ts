export class WebsiteDesignService {
  getDesignTokens(creatorType: string) {
    const designs: Record<string, any> = {
      clinic: { primaryColor: '#2563eb', secondaryColor: '#1e40af', accentColor: '#10b981', fontFamily: 'Roboto', headingFont: 'Montserrat', borderRadius: '8px', shadow: '0 10px 40px rgba(37, 99, 235, 0.1)' },
      restaurant: { primaryColor: '#dc2626', secondaryColor: '#991b1b', accentColor: '#f59e0b', fontFamily: 'Open Sans', headingFont: 'Oswald', borderRadius: '6px', shadow: '0 8px 30px rgba(220, 38, 38, 0.15)' },
      professional: { primaryColor: '#0f172a', secondaryColor: '#1e293b', accentColor: '#3b82f6', fontFamily: 'Source Sans Pro', headingFont: 'Merriweather', borderRadius: '4px', shadow: '0 4px 20px rgba(15, 23, 42, 0.1)' },
      service: { primaryColor: '#7c3aed', secondaryColor: '#5b21b6', accentColor: '#ec4899', fontFamily: 'Nunito', headingFont: 'Poppins', borderRadius: '10px', shadow: '0 12px 40px rgba(124, 58, 237, 0.15)' },
      ecommerce: { primaryColor: '#059669', secondaryColor: '#047857', accentColor: '#f97316', fontFamily: 'Inter', headingFont: 'Raleway', borderRadius: '8px', shadow: '0 6px 24px rgba(5, 150, 105, 0.12)' },
      local: { primaryColor: '#0891b2', secondaryColor: '#0e7490', accentColor: '#fbbf24', fontFamily: 'Lato', headingFont: 'Bebas Neue', borderRadius: '6px', shadow: '0 8px 30px rgba(8, 145, 178, 0.12)' },
      conversion: { primaryColor: '#ea580c', secondaryColor: '#c2410c', accentColor: '#84cc16', fontFamily: 'Montserrat', headingFont: 'Anton', borderRadius: '8px', shadow: '0 10px 40px rgba(234, 88, 12, 0.2)' },
      premium: { primaryColor: '#1a1a2e', secondaryColor: '#16213e', accentColor: '#e94560', fontFamily: 'Inter', headingFont: 'Playfair Display', borderRadius: '12px', shadow: '0 20px 60px rgba(0,0,0,0.15)' }
    };
    return designs[creatorType] || designs.local;
  }
}
export const websiteDesignService = new WebsiteDesignService();
