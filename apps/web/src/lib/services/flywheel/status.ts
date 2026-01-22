import { prisma } from "@/lib/database";

type PhaseStatus = {
  percent: number;
  status: "healthy" | "degraded" | "blocked";
  lastUpdated: Date;
};

export type FlywheelStatus = {
  phases: Record<string, PhaseStatus>;
  overallHealth: number;
};

export async function getFlywheelStatus(brandId: string): Promise<FlywheelStatus> {
  const data = await prisma.flywheelStatus.findUnique({
    where: { brandId },
    include: {
      phases: true
    }
  });

  if (!data) {
    return {
      phases: {},
      overallHealth: 0
    };
  }

  return {
    overallHealth: data.overallHealth,
    phases: data.phases.reduce((acc: Record<string, PhaseStatus>, phase) => ({
      ...acc,
      [phase.phase]: {
        percent: phase.percent,
        status: phase.status as PhaseStatus["status"],
        lastUpdated: phase.updatedAt
      }
    }), {})
  };
}
