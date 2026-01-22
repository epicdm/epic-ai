import { prisma } from "@/lib/database";

type MetricType = 
  | 'impressions' 
  | 'reach' 
  | 'likes' 
  | 'comments' 
  | 'shares' 
  | 'engagement_rate' 
  | 'link_clicks';

interface AnalyticsRecord {
  brandId: string;
  metricType: MetricType;
  value: number;
  platform?: string;
  contentId?: string;
  date?: Date;
}

export async function getBrandAnalytics(brandId: string) {
  return prisma.analytics.findMany({
    where: { brandId },
    select: {
      id: true,
      metricType: true,
      value: true,
      date: true,
      platform: true,
      contentId: true
    },
    orderBy: { date: "desc" },
    take: 100
  });
}

export async function recordAnalyticsEvent(event: AnalyticsRecord) {
  return prisma.analytics.create({
    data: {
      brandId: event.brandId,
      metricType: event.metricType,
      value: event.value,
      platform: event.platform,
      contentId: event.contentId,
      date: event.date || new Date()
    }
  });
}

export async function generateAIInsights(brandId: string) {
  const data = await getBrandAnalytics(brandId);
  // TODO: Implement AI analysis of metrics
  return {
    topPerformingContent: [],
    suggestedImprovements: [],
    engagementTrends: {}
  };
}
