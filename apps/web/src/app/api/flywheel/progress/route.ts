import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma, PhaseStatus, SetupPath, Prisma } from "@epic-ai/database";
import {
  FLYWHEEL_PHASES,
  PHASE_INFO,
  getNextAvailablePhase,
} from "@/lib/flywheel/constants";
import type { FlywheelPhase } from "@/lib/flywheel/types";
import { z } from "zod";

/**
 * Save Progress Request Schema (Phase 3: Polish)
 */
const saveProgressSchema = z.object({
  brandId: z.string(),
  setupPath: z.enum(["AI_EXPRESS", "GUIDED", "EXPERT"]),
  currentStep: z.number().int().min(0),
  stepId: z.string(),
  data: z.record(z.unknown()).optional(),
  overallProgress: z.number().int().min(0).max(100),
  phaseProgress: z.record(z.number()).optional(),
});

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
      // Phase 3: Polish - Resume functionality
      setupPath: progress.setupPath,
      guidedCurrentStep: progress.guidedCurrentStep,
      guidedStepData: progress.guidedStepData,
      aiConfidence: progress.aiConfidence,
      lastSavedAt: progress.lastSavedAt,
    });
  } catch (error) {
    console.error("Error fetching flywheel progress:", error);
    return NextResponse.json(
      { error: "Failed to fetch flywheel progress" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/flywheel/progress
 * Save wizard progress for auto-save and resume functionality
 * Phase 3: Polish - Progress Persistence
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = saveProgressSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { brandId, setupPath, currentStep, stepId, data, overallProgress, phaseProgress } =
      validationResult.data;

    // Convert string enum to Prisma enum
    const setupPathEnum = SetupPath[setupPath as keyof typeof SetupPath];

    // Build the update data
    const updateData: Record<string, unknown> = {
      setupPath: setupPathEnum,
      guidedCurrentStep: currentStep,
      guidedStepData: {
        currentStepId: stepId,
        stepData: data || {},
        phaseProgress: phaseProgress || {},
      },
      overallProgress,
      lastSavedAt: new Date(),
      lastActiveAt: new Date(),
    };

    // Upsert the progress record
    const progress = await prisma.flywheelProgress.upsert({
      where: { userId },
      create: {
        userId,
        brandId,
        setupPath: setupPathEnum,
        guidedCurrentStep: currentStep,
        guidedStepData: {
          currentStepId: stepId,
          stepData: data || {},
          phaseProgress: phaseProgress || {},
        } as Prisma.InputJsonValue,
        overallProgress,
        lastSavedAt: new Date(),
        lastActiveAt: new Date(),
      },
      update: updateData,
    });

    return NextResponse.json({
      success: true,
      savedAt: progress.lastSavedAt,
      overallProgress: progress.overallProgress,
      setupPath: progress.setupPath,
      guidedCurrentStep: progress.guidedCurrentStep,
    });
  } catch (error) {
    console.error("Error saving flywheel progress:", error);
    return NextResponse.json(
      { error: "Failed to save progress" },
      { status: 500 }
    );
  }
}
