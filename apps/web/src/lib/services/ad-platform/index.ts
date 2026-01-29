/**
 * Ad Platform - Unified ad management for Meta and Google
 *
 * Features:
 * - Connect ad accounts (Meta Ads, Google Ads)
 * - AI-powered ad generation from content
 * - Campaign creation and management
 * - Performance metrics and optimization
 */

export { AdPlatformManager } from './manager';
export { AdGenerator } from './ad-generator';
export { MetaAdsClient } from './clients/meta-ads';
export { GoogleAdsClient } from './clients/google-ads';
export type {
  AdAccountTokens,
  AdAccountInfo,
  AdCampaignConfig,
  AdCreativeConfig,
  CampaignResult,
  AdMetrics,
  AdTargeting,
  CampaignObjective,
  CallToAction,
  AdFormat,
  AdPlatformClient,
} from './types';
