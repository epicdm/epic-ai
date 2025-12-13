/**
 * Brand Brain Types
 */

export interface BrandProfile {
  description: string;
  mission: string | null;
  values: string[];
  uniqueSellingPoints: string[];
  voiceTone: string;
  writingStyle: string;
  targetAudience: {
    demographics: string[];
    interests: string[];
    painPoints: string[];
  };
  contentPillars: string[];
  preferredHashtags: string[];
  emojiStyle: 'none' | 'minimal' | 'moderate' | 'heavy';
  ctaStyle: 'none' | 'soft' | 'direct' | 'urgent';
  doNotMention: string[];
  mustMention: string[];
  competitors: Array<{
    name: string;
    url?: string;
    notes?: string;
  }>;
  differentiators: string[];
}

export interface ContentPrompt {
  systemPrompt: string;
  brandContext: string;
  styleGuidelines: string;
}

export interface WebsiteAnalysis {
  companyName: string;
  industry: string;
  description: string;
  products: string[];
  services: string[];
  targetAudience: string[];
  uniqueSellingPoints: string[];
  tone: string;
  keyMessages: string[];
}
