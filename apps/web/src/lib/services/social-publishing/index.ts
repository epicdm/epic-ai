/**
 * Social Publishing - Native platform integrations
 *
 * Direct API integration with social platforms:
 * - Twitter/X
 * - LinkedIn
 * - Meta (Facebook/Instagram)
 * - TikTok (coming soon)
 */

export { SocialPublisher } from './publisher';
export { TwitterClient } from './clients/twitter';
export { LinkedInClient } from './clients/linkedin';
export { MetaClient } from './clients/meta';
export type { PublishOptions, PublishResult, OAuthTokens, SocialClient } from './types';
