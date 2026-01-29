export enum FeatureGate {
  CONTENT_GENERATOR = "content_generator",
  CROSS_CHANNEL_WORKFLOWS = "workflows",
  ADVANCED_ANALYTICS = "advanced_analytics",
  AI_VOICE_AGENTS = "voice_agents",
  BRAND_BRAIN = "brand_brain"
}

export const FEATURE_DEPENDENCIES: Record<FeatureGate, FeatureGate[]> = {
  [FeatureGate.CONTENT_GENERATOR]: [],
  [FeatureGate.CROSS_CHANNEL_WORKFLOWS]: [FeatureGate.CONTENT_GENERATOR],
  [FeatureGate.ADVANCED_ANALYTICS]: [FeatureGate.CROSS_CHANNEL_WORKFLOWS],
  [FeatureGate.AI_VOICE_AGENTS]: [],
  [FeatureGate.BRAND_BRAIN]: []
};

export const FEATURE_UNLOCK_CONDITIONS: Record<FeatureGate, {type: 'wizard' | 'event_count', value: string | number}> = {
  [FeatureGate.CONTENT_GENERATOR]: { type: 'wizard', value: 'onboarding' },
  [FeatureGate.CROSS_CHANNEL_WORKFLOWS]: { type: 'event_count', value: 3 },
  [FeatureGate.ADVANCED_ANALYTICS]: { type: 'wizard', value: 'analytics' },
  [FeatureGate.AI_VOICE_AGENTS]: { type: 'wizard', value: 'voice_setup' },
  [FeatureGate.BRAND_BRAIN]: { type: 'wizard', value: 'brand_setup' }
};
