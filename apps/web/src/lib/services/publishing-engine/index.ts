/**
 * Publishing Engine - Automated content publishing
 *
 * Handles:
 * - Scheduled publishing via cron
 * - Rate limiting per platform
 * - Retry logic for failed posts
 * - Auto-scheduling with optimal times
 * - Publishing analytics
 */

export {
  processScheduledContent,
  autoScheduleContent,
  getOptimalTimes,
  getPublishingStats,
} from './scheduler';
