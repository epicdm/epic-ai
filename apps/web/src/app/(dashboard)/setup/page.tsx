/**
 * Setup Hub Page - Main entry point for the 5-Phase Flywheel Wizard
 *
 * Supports multiple setup modes via query parameter:
 * - ?mode=guided → Streamlined wizard (12 essential steps)
 * - Default → Expert mode (Full PhaseHub with all 32 steps)
 */

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma, PhaseStatus } from "@epic-ai/database";
import { StreamlinedFlywheelWizard } from "@/components/flywheel/streamlined-flywheel-wizard";
import {
  FLYWHEEL_PHASES,
  PHASE_INFO,
  isPhaseBlocked,
  getBlockingPhases,
} from "@/lib/flywheel/constants";
import type { FlywheelState, FlywheelPhase, PhaseState } from "@/lib/flywheel/types";
import { SetupDashboard } from "./setup-dashboard";

export const metadata = {
  title: "Setup | Epic AI",
  description: "Set up your AI marketing flywheel",
};

interface SetupPageProps {
  searchParams: Promise<{ mode?: string; "first-time"?: string }>;
}

export default async function SetupPage({ searchParams }: SetupPageProps) {
  const { userId } = await auth();
  const params = await searchParams;
  const mode = params.mode || "expert";
  const isFirstTime = params["first-time"] === "true";

  if (!userId) {
    redirect("/sign-in");
  }

  // Get user's organization and brand
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        include: {
          organization: {
            include: {
              brands: {
                take: 1,
                orderBy: { createdAt: "desc" },
                include: {
                  brandBrain: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user || user.memberships.length === 0) {
    redirect("/onboarding");
  }

  const organization = user.memberships[0].organization;
  const brand = organization.brands[0];

  // For guided mode, we need a brand
  if (mode === "guided" && !brand) {
    redirect("/onboarding");
  }

  // Get or create flywheel progress
  let progress = await prisma.flywheelProgress.findUnique({
    where: { userId },
  });

  if (!progress) {
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

  const phaseStatusMap: Record<
    FlywheelPhase,
    { status: PhaseStatus; step: number; data: unknown }
  > = {
    UNDERSTAND: {
      status: progress.understandPhase,
      step: progress.understandStep,
      data: progress.understandData,
    },
    CREATE: {
      status: progress.createPhase,
      step: progress.createStep,
      data: progress.createData,
    },
    DISTRIBUTE: {
      status: progress.distributePhase,
      step: progress.distributeStep,
      data: progress.distributeData,
    },
    LEARN: {
      status: progress.learnPhase,
      step: progress.learnStep,
      data: progress.learnData,
    },
    AUTOMATE: {
      status: progress.automatePhase,
      step: progress.automateStep,
      data: progress.automateData,
    },
  };

  // Determine completed phases
  for (const phase of FLYWHEEL_PHASES) {
    if (phaseStatusMap[phase].status === PhaseStatus.COMPLETED) {
      completedPhases.push(phase);
    }
  }

  // Build phase states
  const phases: Record<FlywheelPhase, PhaseState> = {} as Record<
    FlywheelPhase,
    PhaseState
  >;

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
    websiteAnalysis: progress.websiteAnalysis as unknown as FlywheelState["websiteAnalysis"],
    industryAnalysis: progress.industryAnalysis as unknown as FlywheelState["industryAnalysis"],
  };

  // For guided mode, show the streamlined wizard
  if (mode === "guided" && brand) {
    // Build initial data for streamlined wizard from existing progress
    const initialData = {
      // From UNDERSTAND phase data
      ...(progress.understandData as Record<string, unknown> || {}),
      // From CREATE phase data
      ...(progress.createData as Record<string, unknown> || {}),
      // From DISTRIBUTE phase data
      ...(progress.distributeData as Record<string, unknown> || {}),
      // From LEARN phase data
      ...(progress.learnData as Record<string, unknown> || {}),
      // From AUTOMATE phase data
      ...(progress.automateData as Record<string, unknown> || {}),
      // Pre-fill from brand if available
      brandName: brand.name || undefined,
      brandDescription: brand.brandBrain?.description || undefined,
    };

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <StreamlinedFlywheelWizard
          initialData={initialData}
          brandId={brand.id}
        />
      </div>
    );
  }

  // Default: Expert mode - show setup dashboard with progress tracking
  return (
    <SetupDashboard
      flywheelState={flywheelState}
      currentMode="expert"
      isFirstTime={isFirstTime}
      brandId={brand?.id}
    />
  );
}
