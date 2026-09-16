export interface ScoringCriteria {
  noWebsite: number;
  poorWebsite: number;
  hasGoogleBusiness: number;
  hasPhone: number;
  hasWhatsApp: number;
  hasEmail: number;
  hasInstagram: number;
  goodRating: number;
  commercialSegment: number;
}

const DEFAULT_CRITERIA: ScoringCriteria = {
  noWebsite: 30,
  poorWebsite: 20,
  hasGoogleBusiness: 10,
  hasPhone: 5,
  hasWhatsApp: 10,
  hasEmail: 10,
  hasInstagram: 5,
  goodRating: 10,
  commercialSegment: 10
};

export class ProspectScoringService {
  calculateScore(company: {
    websiteStatus?: string;
    websiteScore?: number;
    googleBusiness?: string;
    phone?: string;
    whatsapp?: string;
    email?: string;
    instagram?: string;
    rating?: number;
    segment?: string;
  }): { score: number; grade: string } {
    let score = 0;

    // Website (peso maior)
    if (!company.websiteStatus || company.websiteStatus === 'NO_WEBSITE') {
      score += DEFAULT_CRITERIA.noWebsite;
    } else if (company.websiteStatus === 'WEBSITE_POOR' && company.websiteScore < 40) {
      score += DEFAULT_CRITERIA.poorWebsite;
    }

    // Presenã£Â£ã‚Â§a digital
    if (company.googleBusiness) score += DEFAULT_CRITERIA.hasGoogleBusiness;
    if (company.phone) score += DEFAULT_CRITERIA.hasPhone;
    if (company.whatsapp) score += DEFAULT_CRITERIA.hasWhatsApp;
    if (company.email) score += DEFAULT_CRITERIA.hasEmail;
    if (company.instagram) score += DEFAULT_CRITERIA.hasInstagram;

    // Qualidade
    if (company.rating && company.rating >= 4.0) score += DEFAULT_CRITERIA.goodRating;

    // Segmento comercial
    const commercialSegments = ['restaurante', 'hotel', 'clinica', 'loja', 'servico', 'empresa'];
    if (company.segment && commercialSegments.some(s => company.segment!.toLowerCase().includes(s))) {
      score += DEFAULT_CRITERIA.commercialSegment;
    }

    // Limitar a 100
    score = Math.min(100, score);

    // Classificação
    let grade = 'D';
    if (score >= 80) grade = 'A';
    else if (score >= 60) grade = 'B';
    else if (score >= 40) grade = 'C';

    return { score, grade };
  }
}

export const prospectScoringService = new ProspectScoringService();