import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma, PhaseStatus } from "@epic-ai/database";
import {
  FLYWHEEL_PHASES,
  PHASE_INFO,
  isPhaseBlocked,
  getBlockingPhases,
} from "@/lib/flywheel/constants";
import type { FlywheelState, FlywheelPhase, PhaseState } from "@/lib/flywheel/types";

/**
 * GET /api/flywheel/phases
 * Returns the complete flywheel state with all phase statuses
 */
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get or create flywheel progress
    let progress = await prisma.flywheelProgress.findUnique({
      where: { userId },
    });

    if (!progress) {
      // Create initial flywheel progress
      progress = await prisma.flywheelProgress.create({
        data: {
          userId,
          understandPhase: PhaseStatus.NOT_STARTED,
          createPhase: PhaseStatus.NOT_STARTED,
          distributePhase: PhaseStatus.NOT_STARTED,
          learnPhase: PhaseStatus.NOT_STARTED,
          automatePhase: PhaseStatus.NOT_STARTED,
        },
      });
    }

    // Build the flywheel state
    const completedPhases: FlywheelPhase[] = [];

    const phaseStatusMap: Record<FlywheelPhase, { status: PhaseStatus; step: number; data: unknown }> = {
      UNDERSTAND: { status: progress.understandPhase, step: progress.understandStep, data: progress.understandData },
      CREATE: { status: progress.createPhase, step: progress.createStep, data: progress.createData },
      DISTRIBUTE: { status: progress.distributePhase, step: progress.distributeStep, data: progress.distributeData },
      LEARN: { status: progress.learnPhase, step: progress.learnStep, data: progress.learnData },
      AUTOMATE: { status: progress.automatePhase, step: progress.automateStep, data: progress.automateData },
    };

    // Determine completed phases
    for (const phase of FLYWHEEL_PHASES) {
      if (phaseStatusMap[phase].status === PhaseStatus.COMPLETED) {
        completedPhases.push(phase);
      }
    }

    // Build phase states
    const phases: Record<FlywheelPhase, PhaseState> = {} as Record<FlywheelPhase, PhaseState>;

    for (const phase of FLYWHEEL_PHASES) {
      const { status, step, data } = phaseStatusMap[phase];
      const blocked = isPhaseBlocked(phase, completedPhases);
      const blockedBy = blocked ? getBlockingPhases(phase, completedPhases) : [];

      phases[phase] = {
        phase,
        status: status as unknown as PhaseState["status"],
        currentStep: step,
        totalSteps: PHASE_INFO[phase].totalSteps,
        data: data as Record<string, unknown> | null,
        isBlocked: blocked,
        blockedBy,
      };
    }

    const flywheelState: FlywheelState = {
      phases,
      overallProgress: progress.overallProgress,
      flywheelActive: progress.flywheelActive,
      activatedAt: progress.activatedAt ?? undefined,
      lastActivePhase: progress.lastActivePhase as FlywheelPhase | undefined,
      lastActiveAt: progress.lastActiveAt,
      websiteAnalysis: progress.websiteAnalysis as FlywheelState["websiteAnalysis"],
      industryAnalysis: progress.industryAnalysis as FlywheelState["industryAnalysis"],
    };

    return NextResponse.json(flywheelState);
  } catch (error) {
    console.error("Error fetching flywheel phases:", error);
    return NextResponse.json(
      { error: "Failed to fetch flywheel phases" },
      { status: 500 }
    );
  }
}
