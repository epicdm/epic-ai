"use client";

import { useQuery } from "@tanstack/react-query";
import { getFlywheelStatus } from "@/lib/services/flywheel/status";
import type { FlywheelStatus } from "@/lib/database/types";

export function useFlywheelStatus(brandId: string | undefined) {
  return useQuery<FlywheelStatus>({
    queryKey: ["flywheel-status", brandId],
    queryFn: () => brandId ? getFlywheelStatus(brandId) : Promise.resolve({ phases: {}, overallHealth: 0 }),
    enabled: !!brandId,
    initialData: {
      phases: {},
      overallHealth: 0
    }
  });
}
