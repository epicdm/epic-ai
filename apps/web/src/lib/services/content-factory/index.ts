/**
 * Content Factory - AI-powered content generation
 *
 * Generates social media posts using:
 * - Brand Brain (voice, tone, style)
 * - Context Engine (relevant content)
 * - Platform-specific optimization
 */

export { ContentGenerator } from './generator';
export { ContentScheduler } from './scheduler';
export { ContentQueueManager } from './queue-manager';
export type {
  GeneratedContent,
  ContentRequest,
  PlatformVariation,
  QueuedContent,
  SavedVariation,
  BatchRequest,
} from './types';
export { PLATFORM_LIMITS, PLATFORM_BEST_PRACTICES } from './types';
