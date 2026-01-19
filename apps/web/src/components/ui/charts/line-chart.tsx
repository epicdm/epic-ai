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
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1
    }]
  };

  return <Line data={chartData} />;
}
