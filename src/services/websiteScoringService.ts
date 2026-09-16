export interface WebsiteScoringCriteria {
  noWebsite: number;
  poorWebsite: number;
  hasPhone: number;
  hasEmail: number;
  commercialSegment: number;
}

const DEFAULT_CRITERIA: WebsiteScoringCriteria = {
  noWebsite: 40,
  poorWebsite: 20,
  hasPhone: 15,
  hasEmail: 15,
  commercialSegment: 10
};

export class WebsiteScoringService {
  calculateScore(data: {
    websiteStatus?: string;
    websiteScore?: number;
    phone?: string;
    email?: string;
    segment?: string;
  }): { score: number; grade: string } {
    let score = 0;

    if (!data.websiteStatus || data.websiteStatus === 'NO_WEBSITE') {
      score += DEFAULT_CRITERIA.noWebsite;
    } else if (data.websiteStatus === 'WEBSITE_POOR' && (data.websiteScore || 0) < 40) {
      score += DEFAULT_CRITERIA.poorWebsite;
    }

    if (data.phone) score += DEFAULT_CRITERIA.hasPhone;
    if (data.email) score += DEFAULT_CRITERIA.hasEmail;

    const commercialSegments = ['restaurante', 'hotel', 'clinica', 'loja', 'servico', 'advocacia', 'contabilidade'];
    if (data.segment && commercialSegments.some(s => data.segment!.toLowerCase().includes(s))) {
      score += DEFAULT_CRITERIA.commercialSegment;
    }

    score = Math.min(100, score);

    let grade = 'D';
    if (score >= 80) grade = 'A';
    else if (score >= 60) grade = 'B';
    else if (score >= 40) grade = 'C';

    return { score, grade };
  }
}

export const websiteScoringService = new WebsiteScoringService();