export interface BrandVoice {
  tone: 'professional' | 'friendly' | 'witty' | 'authoritative';
  formality: number; // 1-5 scale
  emojiUsage: 'none' | 'minimal' | 'moderate' | 'heavy';
  hashtagUsage: boolean;
  prohibitedWords: string[];
  targetAudience: {
    demographics: string;
    painPoints: string[];
    goals: string[];
  };
}
