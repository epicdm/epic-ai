import { NextResponse } from "next/server";
import { prisma } from "@/lib/database/server";
import type { FlywheelStatus } from "@/lib/database/types";

export const runtime = "nodejs";

type PhaseStatus = FlywheelStatus["phases"][string];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const brandId = searchParams.get("brandId");

  if (!brandId) {
    return NextResponse.json({ error: "Missing brandId" }, { status: 400 });
  }

  try {
    const data = await prisma.flywheelStatus.findUnique({
      where: { brandId },
      include: {
        phases: true
      }
    });

    if (!data) {
      const empty: FlywheelStatus = { phases: {}, overallHealth: 0 };
      return NextResponse.json(empty);
    }

    const phases = data.phases.reduce((acc: Record<string, PhaseStatus>, phase) => {
      acc[phase.phase] = {
        percent: phase.percent,
        status: phase.status as PhaseStatus["status"],
        lastUpdated: phase.updatedAt.toISOString()
      };
      return acc;
    }, {});

    return NextResponse.json({
      overallHealth: data.overallHealth,
      phases
    } satisfies FlywheelStatus);
  } catch (error) {
    console.error("Error fetching flywheel status:", error);
    return NextResponse.json({ error: "Failed to fetch flywheel status" }, { status: 500 });
  }
}
