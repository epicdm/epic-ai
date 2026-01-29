"use client";

interface ChartProps {
  brandId: string;
  timeRange: string;
}

export function LineChart({ brandId, timeRange }: ChartProps) {
  return (
    <div className="h-[200px] flex items-center justify-center text-default-400 border border-default-200 rounded-lg">
      <div className="text-center">
        <p className="font-medium">Line Chart</p>
        <p className="text-xs">brandId: {brandId}, timeRange: {timeRange}</p>
      </div>
    </div>
  );
}

export function BarChart({ brandId, timeRange }: ChartProps) {
  return (
    <div className="h-[200px] flex items-center justify-center text-default-400 border border-default-200 rounded-lg">
      <div className="text-center">
        <p className="font-medium">Bar Chart</p>
        <p className="text-xs">brandId: {brandId}, timeRange: {timeRange}</p>
      </div>
    </div>
  );
}
