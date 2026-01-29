"use client";

import { useState } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Select,
  SelectItem,
  Progress,
} from "@heroui/react";
import { PageHeader } from "@/components/layout/page-header";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Eye,
  Heart,
  MousePointer,
  Share2,
  Users,
  Lightbulb,
  Brain,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Twitter,
  Linkedin,
  Instagram,
  Facebook,
} from "lucide-react";

interface ContentMetric {
  id: string;
  platform: string;
  impressions: number | null;
  engagements: number | null;
  clicks: number | null;
  shares: number | null;
  reach: number | null;
  engagementRate: number | null;
  contentItem: {
    id: string;
    content: string;
    contentType: string;
  };
}

interface Insight {
  id: string;
  type: string;
  title: string;
  description: string;
  confidence: number;
  recommendation: string;
  status: string;
}

interface LearningEntry {
  id: string;
  learningType: string;
  insight: string;
  appliedAt: Date;
}

interface AnalyticsDashboardProps {
  brandId: string;
  totals: {
    impressions: number;
    engagements: number;
    clicks: number;
    shares: number;
    reach: number;
  };
  contentMetrics: ContentMetric[];
  insights: Insight[];
  learningHistory: LearningEntry[];
}

const PLATFORM_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  TWITTER: Twitter,
  LINKEDIN: Linkedin,
  INSTAGRAM: Instagram,
  FACEBOOK: Facebook,
};

const INSIGHT_COLORS: Record<string, "success" | "warning" | "danger" | "primary"> = {
  TIMING: "primary",
  CONTENT_TYPE: "success",
  ENGAGEMENT: "warning",
  PERFORMANCE: "danger",
};

export function AnalyticsDashboard({
  brandId,
  totals,
  contentMetrics,
  insights,
  learningHistory,
}: AnalyticsDashboardProps) {
  const [period, setPeriod] = useState("week");
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch(`/api/analytics/sync?brandId=${brandId}`, { method: "POST" });
      window.location.reload();
    } catch (error) {
      console.error("Sync error:", error);
    } finally {
      setSyncing(false);
    }
  };

  const avgEngagementRate =
    contentMetrics.length > 0
      ? contentMetrics.reduce((acc, m) => acc + (m.engagementRate || 0), 0) / contentMetrics.length
      : 0;

  // Calculate platform breakdown
  const platformBreakdown = contentMetrics.reduce((acc, m) => {
    if (!acc[m.platform]) {
      acc[m.platform] = { impressions: 0, engagements: 0, count: 0 };
    }
    acc[m.platform].impressions += m.impressions || 0;
    acc[m.platform].engagements += m.engagements || 0;
    acc[m.platform].count += 1;
    return acc;
  }, {} as Record<string, { impressions: number; engagements: number; count: number }>);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        description="Track your content performance and AI learning insights."
        actions={
          <div className="flex gap-2">
            <Select
              size="sm"
              selectedKeys={[period]}
              onSelectionChange={(keys) => setPeriod(Array.from(keys)[0] as string)}
              className="w-32"
            >
              <SelectItem key="day">Today</SelectItem>
              <SelectItem key="week">This Week</SelectItem>
              <SelectItem key="month">This Month</SelectItem>
              <SelectItem key="quarter">Quarter</SelectItem>
            </Select>
            <Button
              variant="flat"
              startContent={<RefreshCw className="w-4 h-4" />}
              onPress={handleSync}
              isLoading={syncing}
            >
              Sync
            </Button>
          </div>
        }
      />

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          title="Impressions"
          value={formatNumber(totals.impressions)}
          icon={Eye}
          change="+12%"
          positive
        />
        <StatCard
          title="Engagements"
          value={formatNumber(totals.engagements)}
          icon={Heart}
          change="+8%"
          positive
        />
        <StatCard
          title="Clicks"
          value={formatNumber(totals.clicks)}
          icon={MousePointer}
          change="+15%"
          positive
        />
        <StatCard
          title="Shares"
          value={formatNumber(totals.shares)}
          icon={Share2}
          change="-3%"
          positive={false}
        />
        <StatCard
          title="Avg Engagement"
          value={`${avgEngagementRate.toFixed(2)}%`}
          icon={TrendingUp}
          change="+5%"
          positive
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Platform Breakdown */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Performance by Platform</h3>
            </CardHeader>
            <CardBody>
              {Object.keys(platformBreakdown).length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No platform data yet. Publish content to see performance.
                </p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(platformBreakdown).map(([platform, data]) => {
                    const Icon = PLATFORM_ICONS[platform] || BarChart3;
                    const percentage = totals.impressions > 0
                      ? (data.impressions / totals.impressions) * 100
                      : 0;
                    return (
                      <div key={platform} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            <span className="font-medium">{platform}</span>
                            <Chip size="sm" variant="flat">
                              {data.count} posts
                            </Chip>
                          </div>
                          <span className="text-sm text-gray-500">
                            {formatNumber(data.impressions)} impressions
                          </span>
                        </div>
                        <Progress
                          value={percentage}
                          size="sm"
                          color="primary"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Top Performing Content */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Top Performing Content</h3>
            </CardHeader>
            <CardBody>
              {contentMetrics.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No content metrics yet. Publish and wait for engagement data.
                </p>
              ) : (
                <div className="space-y-3">
                  {contentMetrics
                    .sort((a, b) => (b.engagementRate || 0) - (a.engagementRate || 0))
                    .slice(0, 5)
                    .map((metric) => {
                      const Icon = PLATFORM_ICONS[metric.platform] || BarChart3;
                      return (
                        <div
                          key={metric.id}
                          className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                        >
                          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm line-clamp-2">
                              {metric.contentItem.content}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span>{formatNumber(metric.impressions || 0)} views</span>
                              <span>{formatNumber(metric.engagements || 0)} engagements</span>
                              <Chip size="sm" color="success" variant="flat">
                                {(metric.engagementRate || 0).toFixed(2)}% rate
                              </Chip>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* AI Insights */}
          <Card>
            <CardHeader className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-warning" />
                <h3 className="font-semibold">AI Insights</h3>
              </div>
            </CardHeader>
            <CardBody>
              {insights.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No insights yet. AI will analyze your content as you publish.
                </p>
              ) : (
                <div className="space-y-3">
                  {insights.slice(0, 5).map((insight) => (
                    <div
                      key={insight.id}
                      className="p-3 rounded-lg bg-warning/10 border border-warning/20"
                    >
                      <div className="flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-warning mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">{insight.title}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {insight.recommendation}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Chip
                              size="sm"
                              color={INSIGHT_COLORS[insight.type] || "default"}
                              variant="flat"
                            >
                              {insight.type}
                            </Chip>
                            <span className="text-xs text-gray-400">
                              {insight.confidence}% confidence
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Learning History */}
          <Card>
            <CardHeader className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-500" />
                <h3 className="font-semibold">Learning History</h3>
              </div>
            </CardHeader>
            <CardBody>
              {learningHistory.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No learning updates yet. AI learns from your content performance.
                </p>
              ) : (
                <div className="space-y-3">
                  {learningHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20"
                    >
                      <p className="text-sm">{entry.insight}</p>
                      <div className="flex items-center justify-between mt-2">
                        <Chip size="sm" variant="flat" color="secondary">
                          {entry.learningType}
                        </Chip>
                        <span className="text-xs text-gray-400">
                          {new Date(entry.appliedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  change,
  positive,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  change: string;
  positive: boolean;
}) {
  return (
    <Card>
      <CardBody className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div className={`flex items-center gap-1 text-xs ${
            positive ? "text-success" : "text-danger"
          }`}>
            {positive ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : (
              <ArrowDownRight className="w-3 h-3" />
            )}
            {change}
          </div>
        </div>
        <p className="text-xl font-bold">{value}</p>
        <p className="text-xs text-gray-500">{title}</p>
      </CardBody>
    </Card>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}
