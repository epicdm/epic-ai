import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma, PhaseStatus } from "@epic-ai/database";
import {
  FLYWHEEL_PHASES,
  PHASE_INFO,
  getNextAvailablePhase,
} from "@/lib/flywheel/constants";
import type { FlywheelPhase } from "@/lib/flywheel/types";

/**
 * GET /api/flywheel/progress
 * Returns a summary of overall flywheel progress
 */
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const progress = await prisma.flywheelProgress.findUnique({
      where: { userId },
    });

    if (!progress) {
      return NextResponse.json({
        overallProgress: 0,
        completedPhases: 0,
        totalPhases: 5,
        flywheelActive: false,
        nextPhase: "UNDERSTAND",
        phases: {
          UNDERSTAND: { status: "NOT_STARTED", step: -1, totalSteps: 8 },
          CREATE: { status: "NOT_STARTED", step: -1, totalSteps: 6 },
          DISTRIBUTE: { status: "NOT_STARTED", step: -1, totalSteps: 6 },
          LEARN: { status: "NOT_STARTED", step: -1, totalSteps: 5 },
          AUTOMATE: { status: "NOT_STARTED", step: -1, totalSteps: 6 },
        },
      });
    }

    // Count completed phases
    const phaseStatuses: Record<FlywheelPhase, PhaseStatus> = {
      UNDERSTAND: progress.understandPhase,
      CREATE: progress.createPhase,
      DISTRIBUTE: progress.distributePhase,
      LEARN: progress.learnPhase,
      AUTOMATE: progress.automatePhase,
    };

    const completedPhases: FlywheelPhase[] = [];
    for (const phase of FLYWHEEL_PHASES) {
      if (phaseStatuses[phase] === PhaseStatus.COMPLETED) {
        completedPhases.push(phase);
      }
    }

    const nextPhase = getNextAvailablePhase(completedPhases);

    const phases = {
      UNDERSTAND: {
        status: progress.understandPhase,
        step: progress.understandStep,
        totalSteps: PHASE_INFO.UNDERSTAND.totalSteps,
      },
      CREATE: {
        status: progress.createPhase,
        step: progress.createStep,
        totalSteps: PHASE_INFO.CREATE.totalSteps,
      },
      DISTRIBUTE: {
        status: progress.distributePhase,
        step: progress.distributeStep,
        totalSteps: PHASE_INFO.DISTRIBUTE.totalSteps,
      },
      LEARN: {
        status: progress.learnPhase,
        step: progress.learnStep,
        totalSteps: PHASE_INFO.LEARN.totalSteps,
      },
      AUTOMATE: {
        status: progress.automatePhase,
        step: progress.automateStep,
        totalSteps: PHASE_INFO.AUTOMATE.totalSteps,
      },
    };

    return NextResponse.json({
      overallProgress: progress.overallProgress,
      completedPhases: completedPhases.length,
      totalPhases: 5,
      flywheelActive: progress.flywheelActive,
      activatedAt: progress.activatedAt,
      nextPhase,
      lastActivePhase: progress.lastActivePhase,
      lastActiveAt: progress.lastActiveAt,
      phases,
    });
  } catch (error) {
    console.error("Error fetching flywheel progress:", error);
    return NextResponse.json(
      { error: "Failed to fetch flywheel progress" },
      { status: 500 }
    );
  }
}
