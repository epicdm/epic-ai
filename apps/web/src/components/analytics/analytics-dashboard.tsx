"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  Eye,
  Heart,
  Share2,
  MousePointerClick,
  BarChart3,
  RefreshCw,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MetricCard, MetricCardGrid } from "@/components/ui/metric-card";
import { SectionCard } from "@/components/ui/section-card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { apiClient, endpoints, queryKeys, unwrapArray } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnalyticsOverview {
  totalImpressions: number;
  totalEngagements: number;
  totalClicks: number;
  totalShares: number;
  avgEngagementRate: number;
  totalReach: number;
}

interface ContentPerformance {
  id: string;
  content: string;
  platform: string;
  impressions: number;
  engagements: number;
  engagementRate: number;
  publishedAt: string;
}

interface AIInsight {
  id: string;
  type: string;
  title: string;
  description: string;
  confidence: number;
  recommendation: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map the time-range selector value to the `period` query param (days). */
function timeRangeToDays(range: string): string {
  switch (range) {
    case "7d":
      return "7";
    case "90d":
      return "90";
    case "30d":
    default:
      return "30";
  }
}

// ---------------------------------------------------------------------------
// Table columns
// ---------------------------------------------------------------------------

const contentColumns: DataTableColumn<ContentPerformance>[] = [
  {
    key: "content",
    header: "Content",
    cell: (r) => (
      <div className="max-w-xs truncate text-sm">{r.content}</div>
    ),
  },
  {
    key: "platform",
    header: "Platform",
    cell: (r) => (
      <Badge variant="outline" className="capitalize">
        {r.platform}
      </Badge>
    ),
  },
  {
    key: "impressions",
    header: "Impressions",
    cell: (r) => r.impressions.toLocaleString(),
    headerClassName: "text-right",
    cellClassName: "text-right",
  },
  {
    key: "engagements",
    header: "Engagements",
    cell: (r) => r.engagements.toLocaleString(),
    headerClassName: "text-right",
    cellClassName: "text-right",
  },
  {
    key: "rate",
    header: "Eng. Rate",
    cell: (r) => `${r.engagementRate.toFixed(1)}%`,
    headerClassName: "text-right",
    cellClassName: "text-right",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NewAnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState("7d");

  // ---------- Queries ----------

  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: [
      ...queryKeys.analytics.overview({ timeRange }),
    ],
    queryFn: async () => {
      const res = await apiClient.get<AnalyticsOverview>(
        endpoints.analytics.overview(),
        { params: { period: timeRangeToDays(timeRange) } },
      );
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
  });

  const { data: topContent, isLoading: loadingContent } = useQuery({
    queryKey: [
      ...queryKeys.analytics.overview({ timeRange, scope: "topContent" }),
    ],
    queryFn: async () => {
      const res = await apiClient.get<ContentPerformance[] | { data: ContentPerformance[] | null }>(
        endpoints.analytics.overview(),
        { params: { period: timeRangeToDays(timeRange), view: "topContent" } },
      );
      if (res.error) throw new Error(res.error.message);
      return unwrapArray<ContentPerformance>(res.data);
    },
  });

  const { data: insights } = useQuery({
    queryKey: queryKeys.analytics.learnings(),
    queryFn: async () => {
      const res = await apiClient.get<AIInsight[] | { data: AIInsight[] | null }>(
        endpoints.analytics.learnings(),
      );
      if (res.error) throw new Error(res.error.message);
      return unwrapArray<AIInsight>(res.data);
    },
  });

  // ---------- Render ----------

  return (
    <div className="space-y-8">
      {/* ---- Header ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Track your content performance and AI insights
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ---- Metric cards ---- */}
      <MetricCardGrid>
        <MetricCard
          label="Impressions"
          value={overview?.totalImpressions?.toLocaleString() ?? "–"}
          icon={<Eye className="h-5 w-5" />}
        />
        <MetricCard
          label="Engagements"
          value={overview?.totalEngagements?.toLocaleString() ?? "–"}
          icon={<Heart className="h-5 w-5" />}
        />
        <MetricCard
          label="Clicks"
          value={overview?.totalClicks?.toLocaleString() ?? "–"}
          icon={<MousePointerClick className="h-5 w-5" />}
        />
        <MetricCard
          label="Avg. Engagement Rate"
          value={
            overview?.avgEngagementRate != null
              ? `${overview.avgEngagementRate.toFixed(1)}%`
              : "–"
          }
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </MetricCardGrid>

      {/* ---- Tabs: Content + Insights ---- */}
      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">Top Content</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        {/* -- Top Content tab -- */}
        <TabsContent value="content" className="mt-4">
          <DataTable
            columns={contentColumns}
            data={topContent ?? []}
            rowKey={(r) => r.id}
            disabled={loadingContent}
            emptyMessage="No content performance data yet"
          />
        </TabsContent>

        {/* -- AI Insights tab -- */}
        <TabsContent value="insights" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {(insights ?? []).map((insight) => (
              <Card key={insight.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="capitalize">
                      {insight.type}
                    </Badge>
                    <Badge
                      variant={
                        insight.status === "active" ? "default" : "secondary"
                      }
                      className="capitalize"
                    >
                      {insight.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-base mt-2">
                    {insight.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {insight.description}
                  </p>
                  {insight.recommendation && (
                    <div className="mt-3 rounded-lg bg-muted p-3 text-sm">
                      <span className="font-medium">Recommendation:</span>{" "}
                      {insight.recommendation}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {(!insights || insights.length === 0) && (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                No AI insights yet. Publish more content to generate insights.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
