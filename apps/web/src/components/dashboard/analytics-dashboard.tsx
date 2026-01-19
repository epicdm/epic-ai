"use client";

import { useState, Suspense } from "react";
import { Card, CardBody, Tab, Tabs, Spinner } from "@heroui/react";
import { LineChart, BarChart } from "@/components/ui/charts";

type TimeRange = "7d" | "30d" | "90d";

export function AnalyticsDashboard({ brandId }: { brandId?: string }) {
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  
  if (!brandId) {
    return <div className="text-center py-12 text-default-500">No brand data available</div>;
  }
  
  return (
    <div className="space-y-6 min-h-[500px]">
      <h2 className="text-xl font-semibold">Analytics</h2>
      
      <Tabs 
        selectedKey={timeRange}
        onSelectionChange={(key) => setTimeRange(key as TimeRange)}
      >
        <Tab key="7d" title="7 Days" />
        <Tab key="30d" title="30 Days" />
        <Tab key="90d" title="90 Days" />
      </Tabs>
      
      <Suspense fallback={<div className="flex justify-center py-12"><Spinner size="lg" /></div>}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="min-h-[300px]">
            <CardBody>
              <h3 className="font-medium mb-4">Engagement Rate</h3>
              <LineChart brandId={brandId} timeRange={timeRange} />
            </CardBody>
          </Card>
          
          <Card className="min-h-[300px]">
            <CardBody>
              <h3 className="font-medium mb-4">Content Performance</h3>
              <BarChart brandId={brandId} timeRange={timeRange} />
            </CardBody>
          </Card>
        </div>
      </Suspense>
    </div>
  );
}
