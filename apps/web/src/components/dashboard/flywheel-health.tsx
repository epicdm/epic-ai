"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFlywheelStatus } from "@/hooks/use-flywheel-status";
import type { FlywheelStatus } from "@/lib/database/types";

export function FlywheelHealth({ brandId }: { brandId?: string }) {
  const { data: status } = useFlywheelStatus(brandId);

  if (!brandId) {
    return <div className="text-center py-12 text-muted-foreground">No brand data available</div>;
  }

  const { phases = {}, overallHealth = 0 } = status || {};

  const healthColor = overallHealth > 75 ? "bg-green-500" : overallHealth > 50 ? "bg-yellow-500" : "bg-red-500";

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Flywheel Health</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="h-2 w-32 rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${healthColor} transition-all`}
                    style={{ width: `${overallHealth}%` }}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Overall health: {overallHealth}%</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(phases).map(([phase, status]) => {
            const phaseColor = status.percent > 75 ? "bg-green-500" : status.percent > 50 ? "bg-yellow-500" : "bg-red-500";
            return (
              <div key={phase} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm capitalize">{phase.toLowerCase()}</span>
                  <span className="text-sm font-medium">{status.percent}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${phaseColor} transition-all`}
                    style={{ width: `${status.percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
