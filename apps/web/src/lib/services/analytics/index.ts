/**
 * Analytics & Learning Loop - PKG-025
 *
 * Features:
 * - Social metrics collection from all platforms
 * - AI-powered performance analysis
 * - Automatic learning and optimization
 * - Feedback loop to improve content generation
 *
 * Closes the flywheel by:
 * 1. Collecting metrics from platform APIs
 * 2. Aggregating analytics for trend analysis
 * 3. Generating AI-powered learnings
 * 4. Feeding insights back to Brand Brain
 */

// New PKG-025 exports
export { collectVariationMetrics, collectOrgMetrics, collectAllMetrics } from './metrics-collector';

export {
  aggregateAnalytics,
  createAnalyticsSnapshot,
  generateSnapshots,
  getAnalyticsOverview,
} from './aggregator';

export { generateLearnings, processAllLearnings, getBrandLearnings } from './learning-generator';

// Legacy exports (if files exist)
// export { SocialMetricsCollector } from './collectors/social-metrics';
// export { AnalyticsAnalyzer } from './analyzer';
// export { FeedbackLoop } from './feedback-loop';
// export type {
//   ContentPerformance,
//   AggregatedMetrics,
//   ContentInsight,
//   LearningData,
//   PerformanceTrend,
// } from './types';
