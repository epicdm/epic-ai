export enum FeatureGate {
  CONTENT_FACTORY = "content_factory",
  BRAND_BRAIN = "brand_brain",
  ANALYTICS = "analytics",
  AUTOMATION = "automation"
}

export const featureRequirements: Record<FeatureGate, string[]> = {
  [FeatureGate.CONTENT_FACTORY]: ["onboarding_complete"],
  [FeatureGate.BRAND_BRAIN]: ["onboarding_complete", "content_factory_unlocked"],
  [FeatureGate.ANALYTICS]: ["brand_brain_unlocked"],
  [FeatureGate.AUTOMATION]: ["analytics_unlocked"]
};

export function checkFeatureAccess(
  unlockedFeatures: string[], 
  feature: FeatureGate
): boolean {
  const requirements = featureRequirements[feature];
  return requirements.every(req => unlockedFeatures.includes(req));
}
