import axios from 'axios';

export interface WebsiteDetectionResult {
  status: 'NO_WEBSITE' | 'HAS_WEBSITE' | 'WEBSITE_UNAVAILABLE' | 'WEBSITE_INVALID' | 'WEBSITE_POOR' | 'WEBSITE_UNKNOWN';
  score: number;
  hasHttps: boolean;
  responseTime: number;
  hasMobile: boolean;
  hasContactForm: boolean;
  hasCTA: boolean;
}

export class WebsiteDetectionService {
  async detect(website: string): Promise<WebsiteDetectionResult> {
    if (!website || website.trim() === '') {
      return {
        status: 'NO_WEBSITE',
        score: 0,
        hasHttps: false,
        responseTime: 0,
        hasMobile: false,
        hasContactForm: false,
        hasCTA: false
      };
    }

    try {
      const url = website.startsWith('http') ? website : `https://${website}`;
      const startTime = Date.now();
      
      const response = await axios.get(url, {
        timeout: 10000,
        validateStatus: () => true,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SALE-IA-V2/1.0)'
        }
      });

      const responseTime = Date.now() - startTime;
      const html = response.data || '';
      const statusCode = response.status;

      if (statusCode >= 400) {
        return {
          status: 'WEBSITE_UNAVAILABLE',
          score: 10,
          hasHttps: url.startsWith('https'),
          responseTime,
          hasMobile: false,
          hasContactForm: false,
          hasCTA: false
        };
      }

      // Anã£Â£ã‚Â¡lise bã£Â£ã‚Â¡sica de qualidade
      const hasMobile = html.includes('viewport') || html.includes('mobile');
      const hasContactForm = html.includes('<form') || html.includes('contato') || html.includes('contact');
      const hasCTA = html.includes('cta') || html.includes('call-to-action') || html.includes('saiba mais') || html.includes('entre em contato');
      const hasHttps = url.startsWith('https');

      // Calcular score (0-100)
      let score = 0;
      if (hasHttps) score += 20;
      if (responseTime < 3000) score += 20;
      if (hasMobile) score += 20;
      if (hasContactForm) score += 20;
      if (hasCTA) score += 20;

      let status: WebsiteDetectionResult['status'] = 'HAS_WEBSITE';
      if (score < 40) status = 'WEBSITE_POOR';

      return {
        status,
        score,
        hasHttps,
        responseTime,
        hasMobile,
        hasContactForm,
        hasCTA
      };
    } catch (error) {
      return {
        status: 'WEBSITE_UNAVAILABLE',
        score: 0,
        hasHttps: false,
        responseTime: 0,
        hasMobile: false,
        hasContactForm: false,
        hasCTA: false
      };
    }
  }
}

export const websiteDetectionService = new WebsiteDetectionService();