"use client";

import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { useAnalytics } from "@/hooks/use-analytics";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export function BarChart({
  brandId,
  timeRange
}: {
  brandId: string;
  timeRange: "7d" | "30d" | "90d";
}) {
  const { data, isLoading } = useAnalytics({ brandId, timeRange, metric: "content" });

  if (isLoading || !data) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  const chartData = {
    labels: data.map((item: any) => item.label),
    datasets: [{
      label: "Content Performance",
      data: data.map((item: any) => item.value),
      backgroundColor: 'rgba(54, 162, 235, 0.5)',
    }]
  };

  return <Bar data={chartData} />;
}
