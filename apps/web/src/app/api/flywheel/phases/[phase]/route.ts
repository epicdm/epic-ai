import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma, PhaseStatus } from "@epic-ai/database";
import {
  FLYWHEEL_PHASES,
  PHASE_INFO,
  isPhaseBlocked,
  getBlockingPhases,
  calculateOverallProgress,
} from "@/lib/flywheel/constants";
import type {
  FlywheelPhase,
  PhaseState,
  UpdatePhaseRequest,
  PhaseStatusType,
} from "@/lib/flywheel/types";

type RouteContext = { params: Promise<{ phase: string }> };

/**
 * GET /api/flywheel/phases/[phase]
 * Returns the state of a single phase
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { userId } = await auth();
    const { phase: phaseParam } = await context.params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const phase = phaseParam.toUpperCase() as FlywheelPhase;

    if (!FLYWHEEL_PHASES.includes(phase)) {
      return NextResponse.json({ error: "Invalid phase" }, { status: 400 });
    }

    const progress = await prisma.flywheelProgress.findUnique({
      where: { userId },
    });

    if (!progress) {
      return NextResponse.json({ error: "No flywheel progress found" }, { status: 404 });
    }

    // Get completed phases for dependency checking
    const completedPhases: FlywheelPhase[] = [];
    const phaseStatusMap: Record<FlywheelPhase, PhaseStatus> = {
      UNDERSTAND: progress.understandPhase,
      CREATE: progress.createPhase,
      DISTRIBUTE: progress.distributePhase,
      LEARN: progress.learnPhase,
      AUTOMATE: progress.automatePhase,
    };

    for (const p of FLYWHEEL_PHASES) {
      if (phaseStatusMap[p] === PhaseStatus.COMPLETED) {
        completedPhases.push(p);
      }
    }

    const getPhaseData = () => {
      switch (phase) {
        case "UNDERSTAND":
          return { status: progress.understandPhase, step: progress.understandStep, data: progress.understandData };
        case "CREATE":
          return { status: progress.createPhase, step: progress.createStep, data: progress.createData };
        case "DISTRIBUTE":
          return { status: progress.distributePhase, step: progress.distributeStep, data: progress.distributeData };
        case "LEARN":
          return { status: progress.learnPhase, step: progress.learnStep, data: progress.learnData };
        case "AUTOMATE":
          return { status: progress.automatePhase, step: progress.automateStep, data: progress.automateData };
      }
    };

    const { status, step, data } = getPhaseData();
    const blocked = isPhaseBlocked(phase, completedPhases);
    const blockedBy = blocked ? getBlockingPhases(phase, completedPhases) : [];

    const phaseState: PhaseState = {
      phase,
      status: status as unknown as PhaseStatusType,
      currentStep: step,
      totalSteps: PHASE_INFO[phase].totalSteps,
      data: data as Record<string, unknown> | null,
      isBlocked: blocked,
      blockedBy,
    };

    return NextResponse.json(phaseState);
  } catch (error) {
    console.error("Error fetching phase:", error);
    return NextResponse.json(
      { error: "Failed to fetch phase" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/flywheel/phases/[phase]
 * Updates a single phase's status, step, or data
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { userId } = await auth();
    const { phase: phaseParam } = await context.params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const phase = phaseParam.toUpperCase() as FlywheelPhase;

    if (!FLYWHEEL_PHASES.includes(phase)) {
      return NextResponse.json({ error: "Invalid phase" }, { status: 400 });
    }

    const body: UpdatePhaseRequest = await request.json();

    // Get current progress
    let progress = await prisma.flywheelProgress.findUnique({
      where: { userId },
    });

    if (!progress) {
      // Create initial progress
      progress = await prisma.flywheelProgress.create({
        data: { userId },
      });
    }

    // Check if phase is blocked
    const completedPhases: FlywheelPhase[] = [];
    const phaseStatusMap: Record<FlywheelPhase, PhaseStatus> = {
      UNDERSTAND: progress.understandPhase,
      CREATE: progress.createPhase,
      DISTRIBUTE: progress.distributePhase,
      LEARN: progress.learnPhase,
      AUTOMATE: progress.automatePhase,
    };

    for (const p of FLYWHEEL_PHASES) {
      if (phaseStatusMap[p] === PhaseStatus.COMPLETED) {
        completedPhases.push(p);
      }
    }

    if (isPhaseBlocked(phase, completedPhases) && body.status !== "SKIPPED") {
      return NextResponse.json(
        { error: "Phase is blocked by dependencies" },
        { status: 403 }
      );
    }

    // Build update object based on phase
    const updateData: Record<string, unknown> = {
      lastActivePhase: phase,
      lastActiveAt: new Date(),
    };

    // Map status string to PhaseStatus enum
    const statusToEnum = (status: PhaseStatusType): PhaseStatus => {
      switch (status) {
        case "NOT_STARTED":
          return PhaseStatus.NOT_STARTED;
        case "IN_PROGRESS":
          return PhaseStatus.IN_PROGRESS;
        case "COMPLETED":
          return PhaseStatus.COMPLETED;
        case "SKIPPED":
          return PhaseStatus.SKIPPED;
        default:
          return PhaseStatus.NOT_STARTED;
      }
    };

    // Update phase-specific fields
    switch (phase) {
      case "UNDERSTAND":
        if (body.status !== undefined) updateData.understandPhase = statusToEnum(body.status);
        if (body.currentStep !== undefined) updateData.understandStep = body.currentStep;
        if (body.data !== undefined) updateData.understandData = body.data;
        break;
      case "CREATE":
        if (body.status !== undefined) updateData.createPhase = statusToEnum(body.status);
        if (body.currentStep !== undefined) updateData.createStep = body.currentStep;
        if (body.data !== undefined) updateData.createData = body.data;
        break;
      case "DISTRIBUTE":
        if (body.status !== undefined) updateData.distributePhase = statusToEnum(body.status);
        if (body.currentStep !== undefined) updateData.distributeStep = body.currentStep;
        if (body.data !== undefined) updateData.distributeData = body.data;
        break;
      case "LEARN":
        if (body.status !== undefined) updateData.learnPhase = statusToEnum(body.status);
        if (body.currentStep !== undefined) updateData.learnStep = body.currentStep;
        if (body.data !== undefined) updateData.learnData = body.data;
        break;
      case "AUTOMATE":
        if (body.status !== undefined) updateData.automatePhase = statusToEnum(body.status);
        if (body.currentStep !== undefined) updateData.automateStep = body.currentStep;
        if (body.data !== undefined) updateData.automateData = body.data;

        // If automate is completed, activate the flywheel
        if (body.status === "COMPLETED") {
          updateData.flywheelActive = true;
          updateData.activatedAt = new Date();
        }
        break;
    }

    // Calculate new overall progress
    const newPhaseSteps: Record<FlywheelPhase, number> = {
      UNDERSTAND: phase === "UNDERSTAND" && body.currentStep !== undefined
        ? body.currentStep + 1
        : (body.status === "COMPLETED" ? PHASE_INFO.UNDERSTAND.totalSteps : progress.understandStep + 1),
      CREATE: phase === "CREATE" && body.currentStep !== undefined
        ? body.currentStep + 1
        : (body.status === "COMPLETED" ? PHASE_INFO.CREATE.totalSteps : progress.createStep + 1),
      DISTRIBUTE: phase === "DISTRIBUTE" && body.currentStep !== undefined
        ? body.currentStep + 1
        : (body.status === "COMPLETED" ? PHASE_INFO.DISTRIBUTE.totalSteps : progress.distributeStep + 1),
      LEARN: phase === "LEARN" && body.currentStep !== undefined
        ? body.currentStep + 1
        : (body.status === "COMPLETED" ? PHASE_INFO.LEARN.totalSteps : progress.learnStep + 1),
      AUTOMATE: phase === "AUTOMATE" && body.currentStep !== undefined
        ? body.currentStep + 1
        : (body.status === "COMPLETED" ? PHASE_INFO.AUTOMATE.totalSteps : progress.automateStep + 1),
    };

    // Clamp steps to valid ranges
    for (const p of FLYWHEEL_PHASES) {
      newPhaseSteps[p] = Math.max(0, Math.min(newPhaseSteps[p], PHASE_INFO[p].totalSteps));
    }

    updateData.overallProgress = calculateOverallProgress(newPhaseSteps);

    // Perform update
    const updated = await prisma.flywheelProgress.update({
      where: { userId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      phase,
      overallProgress: updated.overallProgress,
      flywheelActive: updated.flywheelActive,
    });
  } catch (error) {
    console.error("Error updating phase:", error);
    return NextResponse.json(
      { error: "Failed to update phase" },
      { status: 500 }
    );
  }
}
