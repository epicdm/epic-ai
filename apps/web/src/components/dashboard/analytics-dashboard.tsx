"use client";

import { useState, Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, BarChart } from "@/components/ui/charts";

type TimeRange = "7d" | "30d" | "90d";

export function AnalyticsDashboard({ brandId }: { brandId?: string }) {
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");

  if (!brandId) {
    return <div className="text-center py-12 text-muted-foreground">No brand data available</div>;
  }

  return (
    <div className="space-y-6 min-h-[500px]">
      <h2 className="text-xl font-semibold">Analytics</h2>

      <Tabs
        value={timeRange}
        onValueChange={(value) => setTimeRange(value as TimeRange)}
      >
        <TabsList>
          <TabsTrigger value="7d">7 Days</TabsTrigger>
          <TabsTrigger value="30d">30 Days</TabsTrigger>
          <TabsTrigger value="90d">90 Days</TabsTrigger>
        </TabsList>
      </Tabs>

      <Suspense fallback={<div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="min-h-[300px]">
            <CardContent>
              <h3 className="font-medium mb-4">Engagement Rate</h3>
              <LineChart brandId={brandId} timeRange={timeRange} />
            </CardContent>
          </Card>

          <Card className="min-h-[300px]">
            <CardContent>
              <h3 className="font-medium mb-4">Content Performance</h3>
              <BarChart brandId={brandId} timeRange={timeRange} />
            </CardContent>
          </Card>
        </div>
      </Suspense>
    </div>
  );
}
