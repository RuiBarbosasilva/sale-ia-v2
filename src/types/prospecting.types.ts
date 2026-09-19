// src/types/prospecting.types.ts
// RB Factory Sites - Tipos de Prospeccao

export type WebsiteOpportunityStatus = 
  | 'NO_WEBSITE'
  | 'WEBSITE_OFFLINE'
  | 'WEBSITE_BROKEN'
  | 'WEBSITE_OUTDATED'
  | 'WEBSITE_NEEDS_IMPROVEMENT'
  | 'WEBSITE_GOOD'
  | 'UNKNOWN'
  | 'ERROR';

export type ProspectingProviderStatus = 
  | 'CONFIGURED'
  | 'NOT_CONFIGURED'
  | 'ERROR'
  | 'RATE_LIMITED';

export type DemoJobStatus = 
  | 'QUEUED'
  | 'RESEARCHING'
  | 'AUDITING'
  | 'BUILDING'
  | 'IMAGES'
  | 'COMPILING'
  | 'QA'
  | 'IMPROVING'
  | 'READY'
  | 'FAILED';

export type OutreachStatus = 
  | 'NOT_READY'
  | 'READY'
  | 'QUEUED'
  | 'SENT'
  | 'FAILED'
  | 'REPLIED'
  | 'INTERESTED'
  | 'NOT_INTERESTED';

export type IdentityConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export interface BusinessSearchRequest {
  region?: string;
  state?: string;
  city?: string;
  country?: string;
  niche: string;
  subniche?: string;
  maxResults?: number;
}

export interface BusinessSearchResult {
  provider: string;
  providerSearchId?: string;
  totalFound: number;
  businesses: FoundBusiness[];
}

export interface FoundBusiness {
  providerPlaceId?: string;
  name: string;
  legalName?: string;
  category?: string;
  subcategory?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  photoCount?: number;
  googleMapsUrl?: string;
  businessHours?: string;
  description?: string;
}

export interface OpportunityScore {
  score: number;
  status: WebsiteOpportunityStatus;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  reasons: string[];
  recommendedAction: string;
}

export interface BrandIdentityData {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontSuggestions?: string[];
  visualStyle?: string;
  photoStyle?: string;
  toneOfVoice?: string;
  identityConfidence: IdentityConfidence;
  sources: string[];
}

export interface ProspectingStats {
  totalProspects: number;
  noWebsite: number;
  websiteOffline: number;
  websiteBroken: number;
  websiteOutdated: number;
  needsImprovement: number;
  websiteGood: number;
  demosReady: number;
  demosGenerating: number;
  emailsReady: number;
  emailsSent: number;
  proposalsCreated: number;
  projectsCreated: number;
}