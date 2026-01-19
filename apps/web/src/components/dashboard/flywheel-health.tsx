"use client";

import { Card, CardBody, Progress, Tooltip } from "@heroui/react";
import { useFlywheelStatus } from "@/hooks/use-flywheel-status";
import type { FlywheelStatus } from "@/lib/database/types";

export function FlywheelHealth({ brandId }: { brandId: string }) {
  const { data: status } = useFlywheelStatus(brandId);
  
  const { phases = {}, overallHealth = 0 } = status || {};
  
  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Flywheel Health</h3>
          <Tooltip content={`Overall health: ${overallHealth}%`}>
            <Progress 
              value={overallHealth} 
              className="w-32" 
              color={overallHealth > 75 ? "success" : overallHealth > 50 ? "warning" : "danger"}
            />
          </Tooltip>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(phases).map(([phase, status]) => (
            <div key={phase} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm capitalize">{phase.toLowerCase()}</span>
                <span className="text-sm font-medium">{status.percent}%</span>
              </div>
              <Progress 
                value={status.percent} 
                size="sm"
                color={status.percent > 75 ? "success" : status.percent > 50 ? "warning" : "danger"}
              />
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
