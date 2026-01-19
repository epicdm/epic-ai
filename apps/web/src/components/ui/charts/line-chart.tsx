"use client";

import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { useAnalytics } from "@/hooks/use-analytics";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export function LineChart({
  brandId,
  timeRange
}: {
  brandId: string;
  timeRange: "7d" | "30d" | "90d";
}) {
  const { data, isLoading } = useAnalytics({ brandId, timeRange, metric: "engagement" });

  if (isLoading || !data) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  const chartData = {
    labels: data.map((item: any) => item.date),
    datasets: [{
      label: "Engagement Rate",
      data: data.map((item: any) => item.value),
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1
    }]
  };

  return <Line data={chartData} />;
}
