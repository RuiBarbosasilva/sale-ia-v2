// src/types/websiteV2.ts

export interface ResearchInsight {
  topic: string;
  findings: string[];
  opportunities: string[];
  risks?: string[];
}

export interface CompetitorAnalysis {
  name: string;
  url?: string;
  segment: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
}

export interface ResearchResult {
  marketInsights: ResearchInsight;
  competitorInsights: CompetitorAnalysis[];
  designReferences: ResearchInsight;
  conversionInsights: ResearchInsight;
  recommendedStructure: string[];
  recommendedVisualDirection: string;
  summary: string;
}

export interface PRDSection {
  title: string;
  description: string;
  elements?: string[];
}

export interface PRD {
  business: {
    businessName: string;
    category: string;
    city: string;
    positioning: string;
    valueProposition: string;
    targetAudience: string;
    objective: string;
  };
  strategy: {
    primaryGoal: string;
    secondaryGoals: string[];
    primaryCTA: string;
    secondaryCTA?: string;
    conversionStrategy: string;
  };
  ux: {
    informationArchitecture: PRDSection[];
    navigation: string[];
    userJourney: string[];
    sectionOrder: string[];
  };
  content: {
    heroHeadline: string;
    heroSubheadline: string;
    primaryCTA: string;
    secondaryCTA?: string;
    services: Array<{ title: string; description: string; icon?: string }>;
    benefits: Array<{ title: string; description: string }>;
    socialProof?: Array<{ type: string; content: string }>;
    faq: Array<{ question: string; answer: string }>;
    contactContent: string;
  };
  design: {
    visualDirection: string;
    mood: string;
    colorStrategy: string;
    typographyStrategy: string;
    spacingStrategy: string;
    componentStrategy: string;
    imageStrategy: string;
  };
  responsive: {
    desktop: string;
    tablet: string;
    mobile: string;
  };
  seo: {
    title: string;
    metaDescription: string;
    keywords: string[];
    headingStrategy: string;
  };
}

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
}

export interface Typography {
  fontFamily: string;
  headingFont: string;
  baseSize: string;
  headingSizes: { h1: string; h2: string; h3: string; h4: string };
  lineHeight: string;
  letterSpacing: string;
}

export interface DesignSystem {
  visualStyle: string;
  layoutStyle: string;
  colors: ColorPalette;
  typography: Typography;
  spacing: { xs: string; sm: string; md: string; lg: string; xl: string; xxl: string };
  borderRadius: { sm: string; md: string; lg: string; xl: string; full: string };
  shadows: { sm: string; md: string; lg: string; xl: string };
  buttons: {
    primary: { background: string; color: string; padding: string; borderRadius: string; fontSize: string; fontWeight: string; hoverEffect: string };
    secondary: { background: string; color: string; padding: string; borderRadius: string; fontSize: string; fontWeight: string; border: string };
  };
  cards: { background: string; padding: string; borderRadius: string; boxShadow: string; border?: string };
  hero: { background: string; minHeight: string; padding: string; textAlign: string; overlay?: string };
  sections: { padding: string; maxWidth: string; gap: string };
  navigation: { background: string; padding: string; position: string; boxShadow: string };
  footer: { background: string; color: string; padding: string };
}

export interface QualityCriterion {
  name: string;
  score: number;
  feedback: string;
}

export interface QualityReview {
  overallScore: number;
  criteria: QualityCriterion[];
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  recommendation: 'approve' | 'improve' | 'regenerate';
}
