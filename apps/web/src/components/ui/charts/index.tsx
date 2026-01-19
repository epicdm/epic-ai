"use client";

import { Card, CardBody } from "@heroui/react";

interface ChartProps {
  brandId: string;
  timeRange: string;
}

export function LineChart({ brandId, timeRange }: ChartProps) {
  return (
    <div className="h-[200px] flex items-center justify-center text-default-400">
      Chart placeholder - brandId: {brandId}, timeRange: {timeRange}
    </div>
  );
}

export function BarChart({ brandId, timeRange }: ChartProps) {
  return (
    <div className="h-[200px] flex items-center justify-center text-default-400">
      Chart placeholder - brandId: {brandId}, timeRange: {timeRange}
    </div>
  );
}
