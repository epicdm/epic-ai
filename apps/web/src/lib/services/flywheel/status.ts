import type { FlywheelStatus } from "@/lib/database/types";

export async function getFlywheelStatus(brandId: string): Promise<FlywheelStatus> {
  const response = await fetch(`/api/flywheel/status?brandId=${encodeURIComponent(brandId)}`);

  if (!response.ok) {
    return {
      phases: {},
      overallHealth: 0
    };
  }

  return response.json();
}
