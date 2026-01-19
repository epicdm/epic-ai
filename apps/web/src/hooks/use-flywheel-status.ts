"use client";

import { useQuery } from "@tanstack/react-query";
import { getFlywheelStatus } from "@/lib/services/flywheel/status";
import type { FlywheelStatus } from "@/lib/database/types";

export function useFlywheelStatus(brandId: string) {
  return useQuery<FlywheelStatus>({
    queryKey: ["flywheel-status", brandId],
    queryFn: () => getFlywheelStatus(brandId),
    initialData: {
      phases: {},
      overallHealth: 0
    }
  });
}
