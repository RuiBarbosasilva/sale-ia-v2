export interface WebsiteAnalysis {
  websiteQualityScore: number;
  digitalPresenceScore: number;
  opportunityScore: number;
  hasWebsite: boolean;
  websiteStatus: string;
  hasWhatsApp: boolean;
  hasContactForm: boolean;
  hasCTA: boolean;
  isMobileFriendly: boolean;
  hasSSL: boolean;
  issues: string[];
  recommendations: string[];
}

export interface DesignTokens {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  headingFont: string;
  borderRadius: string;
  shadow: string;
}

export interface WebsiteContent {
  heroHeadline: string;
  heroSubtitle: string;
  ctaText: string;
  aboutText: string;
  services: Array<{ title: string; description: string }>;
  benefits: Array<{ title: string; description: string }>;
  faq: Array<{ question: string; answer: string }>;
  metaTitle: string;
  metaDescription: string;
}

export type CreatorType = 'premium' | 'local-business' | 'conversion' | 'clinic' | 'restaurant' | 'professional' | 'service' | 'ecommerce';
