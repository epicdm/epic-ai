/**
 * Resume Service - Phase 3: Polish
 *
 * Handles detection of incomplete wizard setups and restoration of wizard state.
 * Enables users to return exactly where they left off.
 */

import type { SetupPath } from "@epic-ai/database";
import type { FlywheelPhase, PhaseState, PhaseStatusType } from "./types";

/**
 * Setup path type for client-side usage
 */
export type SetupPathType = "AI_EXPRESS" | "GUIDED" | "EXPERT";

/**
 * Resume state returned from detection
 */
export interface ResumeState {
  hasIncomplete: boolean;
  setupPath: SetupPathType;
  currentStep: number;
  stepId: string;
  lastActiveAt: Date;
  progress: number; // 0-100
  phaseStates: PhaseState[];
  stepData: Record<string, unknown>;
}

/**
 * Full wizard data for restoration
 */
export interface WizardRestoreData {
  setupPath: SetupPathType;
  currentStep: number;
  stepId: string;
  stepData: Record<string, unknown>;
  phaseProgress: Record<string, number>;
  overallProgress: number;
  lastSavedAt: Date;
}

/**
 * Progress API response type
 */
interface ProgressResponse {
  overallProgress: number;
  completedPhases: number;
  totalPhases: number;
  flywheelActive: boolean;
  activatedAt?: string;
  nextPhase: FlywheelPhase;
  lastActivePhase?: FlywheelPhase;
  lastActiveAt?: string;
  setupPath?: SetupPath;
  guidedCurrentStep?: number;
  guidedStepData?: {
    currentStepId?: string;
    stepData?: Record<string, unknown>;
    phaseProgress?: Record<string, number>;
  };
  aiConfidence?: Record<string, number>;
  lastSavedAt?: string;
  phases: Record<
    FlywheelPhase,
    {
      status: PhaseStatusType;
      step: number;
      totalSteps: number;
    }
  >;
}

/**
 * Detect if user has an incomplete wizard setup
 */
export async function detectIncompleteSetup(): Promise<ResumeState | null> {
  try {
    const response = await fetch("/api/flywheel/progress");

    if (!response.ok) {
      console.error("Failed to fetch progress:", response.status);
      return null;
    }

    const data: ProgressResponse = await response.json();

    // Check if there's an incomplete setup
    const hasIncomplete =
      data.overallProgress > 0 &&
      data.overallProgress < 100 &&
      !data.flywheelActive;

    if (!hasIncomplete) {
      return null;
    }

    // Build phase states from response
    const phaseStates: PhaseState[] = Object.entries(data.phases).map(
      ([phase, state]) => ({
        phase: phase as FlywheelPhase,
        status: state.status,
        currentStep: state.step,
        totalSteps: state.totalSteps,
        data: null,
        isBlocked: false,
        blockedBy: [],
      })
    );

    return {
      hasIncomplete: true,
      setupPath: (data.setupPath as SetupPathType) || "EXPERT",
      currentStep: data.guidedCurrentStep || 0,
      stepId: data.guidedStepData?.currentStepId || "industry",
      lastActiveAt: data.lastSavedAt
        ? new Date(data.lastSavedAt)
        : new Date(data.lastActiveAt || Date.now()),
      progress: data.overallProgress,
      phaseStates,
      stepData: data.guidedStepData?.stepData || {},
    };
  } catch (error) {
    console.error("Error detecting incomplete setup:", error);
    return null;
  }
}

/**
 * Restore full wizard state for resuming
 */
export async function restoreWizardState(): Promise<WizardRestoreData | null> {
  try {
    const response = await fetch("/api/flywheel/progress");

    if (!response.ok) {
      console.error("Failed to fetch progress for restore:", response.status);
      return null;
    }

    const data: ProgressResponse = await response.json();

    // Only restore if there's actual progress
    if (!data.guidedStepData || data.overallProgress === 0) {
      return null;
    }

    return {
      setupPath: (data.setupPath as SetupPathType) || "EXPERT",
      currentStep: data.guidedCurrentStep || 0,
      stepId: data.guidedStepData.currentStepId || "industry",
      stepData: data.guidedStepData.stepData || {},
      phaseProgress: data.guidedStepData.phaseProgress || {},
      overallProgress: data.overallProgress,
      lastSavedAt: data.lastSavedAt
        ? new Date(data.lastSavedAt)
        : new Date(),
    };
  } catch (error) {
    console.error("Error restoring wizard state:", error);
    return null;
  }
}

/**
 * Calculate time since last active
 */
export function getTimeAway(lastActiveAt: Date): {
  value: number;
  unit: "minutes" | "hours" | "days";
  display: string;
} {
  const now = new Date();
  const diffMs = now.getTime() - lastActiveAt.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return {
      value: diffDays,
      unit: "days",
      display: diffDays === 1 ? "1 day ago" : `${diffDays} days ago`,
    };
  }

  if (diffHours > 0) {
    return {
      value: diffHours,
      unit: "hours",
      display: diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`,
    };
  }

  return {
    value: diffMinutes,
    unit: "minutes",
    display: diffMinutes <= 1 ? "Just now" : `${diffMinutes} minutes ago`,
  };
}

/**
 * Get human-readable setup path name
 */
export function getSetupPathName(setupPath: SetupPathType): string {
  switch (setupPath) {
    case "AI_EXPRESS":
      return "AI Express Setup";
    case "GUIDED":
      return "Guided Setup";
    case "EXPERT":
      return "Expert Setup";
    default:
      return "Setup";
  }
}

/**
 * Check if resume should be shown (within 30-day window)
 */
export function shouldShowResume(lastActiveAt: Date): boolean {
  const now = new Date();
  const diffMs = now.getTime() - lastActiveAt.getTime();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  return diffMs < thirtyDays;
}

/**
 * Clear saved progress (when user chooses "Start Fresh")
 */
export async function clearProgress(): Promise<boolean> {
  try {
    const response = await fetch("/api/flywheel/progress/clear", {
      method: "POST",
    });
    return response.ok;
  } catch (error) {
    console.error("Error clearing progress:", error);
    return false;
  }
}
