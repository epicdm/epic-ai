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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export function BarChart({
  data,
  xKey,
  yKey
}: {
  data: Record<string, any>[];
  xKey: string;
  yKey: string;
}) {
  const chartData = {
    labels: data.map(item => item[xKey]),
    datasets: [{
      label: yKey,
      data: data.map(item => item[yKey]),
      backgroundColor: 'rgba(54, 162, 235, 0.5)',
    }]
  };

  return <Bar data={chartData} />;
}
