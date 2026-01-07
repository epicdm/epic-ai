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

/**
 * Social post data for AI analysis
 */
export interface SocialPostData {
  platform: string;
  content: string;
  createdAt: string;
  likes?: number;
  comments?: number;
  shares?: number;
  reach?: number;
}

/**
 * Result of analyzing social posts
 */
export interface SocialPostAnalysis {
  totalPostsAnalyzed: number;
  platforms: string[];
  voicePatterns: {
    tone: string;
    formality: 'casual' | 'balanced' | 'formal';
    personality: string[];
    writingStyle: string;
  };
  contentPatterns: {
    topTopics: string[];
    commonThemes: string[];
    hashtagsUsed: string[];
    emojiUsage: 'none' | 'minimal' | 'moderate' | 'heavy';
    avgPostLength: number;
    postTypes: string[];
  };
  engagementInsights: {
    bestPerformingTopics: string[];
    bestPostingTimes: string[];
    highEngagementPatterns: string[];
  };
  brandIndicators: {
    industry: string;
    targetAudience: string[];
    uniqueValueProps: string[];
    brandPersonality: string;
  };
}

/**
 * Complete AI setup result
 */
export interface AISetupResult {
  success: boolean;
  analysis: SocialPostAnalysis;
  suggestedProfile: BrandProfile;
  suggestedSettings: {
    brandName: string;
    industry: string;
    voiceTone: string;
    formalityLevel: number;
    emojiPreference: string;
    hashtagPreference: string;
    contentPillars: string[];
    targetAudiences: Array<{
      name: string;
      demographics: string;
      interests: string[];
      painPoints: string[];
    }>;
    postingSchedule: {
      timezone: string;
      optimalTimes: Array<{
        dayOfWeek: number;
        hour: number;
      }>;
    };
  };
  confidence: number;
  dataSourcesSummary: string;
}
