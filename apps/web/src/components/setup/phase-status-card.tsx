"use client";

/**
 * Phase Status Card Component
 *
 * Displays a flywheel phase with visual status indicators,
 * progress tracking, and action buttons.
 */

import { Card, CardBody, Button, Progress, Chip } from "@heroui/react";
import {
  CheckCircle,
  Circle,
  Loader,
  Lock,
  ArrowRight,
  Edit,
} from "lucide-react";
import type { PhaseInfo, PhaseState, FlywheelPhase } from "@/lib/flywheel/types";

interface PhaseStatusCardProps {
  phase: PhaseInfo;
  state: PhaseState;
  allPhaseStates: Record<FlywheelPhase, PhaseState>;
  currentMode: "ai" | "guided" | "expert";
  onStart: () => void;
  onContinue: () => void;
  onReview: () => void;
}

/**
 * Get step counts for each phase in guided mode (streamlined)
 */
function getTotalStepsForMode(phaseId: string, mode: string): number {
  if (mode === "guided") {
    // Streamlined step counts for guided mode
    const counts: Record<string, number> = {
      UNDERSTAND: 3,
      CREATE: 2,
      DISTRIBUTE: 3,
      LEARN: 2,
      AUTOMATE: 2,
    };
    return counts[phaseId] || 0;
  }
  // Expert mode uses full step counts from phase info
  const fullCounts: Record<string, number> = {
    UNDERSTAND: 9,
    CREATE: 6,
    DISTRIBUTE: 6,
    LEARN: 5,
    AUTOMATE: 6,
  };
  return fullCounts[phaseId] || 0;
}

/**
 * Check if dependencies are met for a phase
 */
function checkDependencies(
  phase: PhaseInfo,
  allPhaseStates: Record<FlywheelPhase, PhaseState>
): boolean {
  if (!phase.dependencies || phase.dependencies.length === 0) return false;

  return phase.dependencies.some((dep) => {
    const depState = allPhaseStates[dep];
    return depState?.status !== "COMPLETED";
  });
}

/**
 * Get the name of the dependency phase
 */
function getDependencyName(phase: PhaseInfo): string {
  if (phase.dependencies && phase.dependencies.length > 0) {
    const depNames: Record<FlywheelPhase, string> = {
      UNDERSTAND: "Understand",
      CREATE: "Create",
      DISTRIBUTE: "Distribute",
      LEARN: "Learn",
      AUTOMATE: "Automate",
    };
    return depNames[phase.dependencies[0]] || "previous phase";
  }
  return "previous phase";
}

export function PhaseStatusCard({
  phase,
  state,
  allPhaseStates,
  currentMode,
  onStart,
  onContinue,
  onReview,
}: PhaseStatusCardProps) {
  const isCompleted = state.status === "COMPLETED";
  const isInProgress = state.status === "IN_PROGRESS";
  const isNotStarted = state.status === "NOT_STARTED";
  const isLocked = checkDependencies(phase, allPhaseStates);

  // Calculate progress percentage
  const totalSteps = getTotalStepsForMode(phase.id, currentMode);
  const progress = totalSteps > 0
    ? Math.round((state.currentStep / totalSteps) * 100)
    : 0;

  // Get status icon
  const StatusIcon = () => {
    if (isCompleted)
      return <CheckCircle className="w-6 h-6 text-green-500" />;
    if (isInProgress)
      return <Loader className="w-6 h-6 text-blue-500 animate-spin" />;
    if (isLocked) return <Lock className="w-6 h-6 text-gray-400" />;
    return <Circle className="w-6 h-6 text-gray-400" />;
  };

  // Get card style based on status
  const getCardStyle = () => {
    if (isCompleted)
      return "border-2 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20";
    if (isInProgress)
      return "border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20";
    if (isLocked) return "opacity-60";
    return "";
  };

  // Get action button
  const ActionButton = () => {
    if (isCompleted) {
      return (
        <Button
          size="sm"
          variant="light"
          startContent={<Edit className="w-4 h-4" />}
          onPress={onReview}
        >
          Review
        </Button>
      );
    }

    if (isInProgress) {
      return (
        <Button
          size="sm"
          color="primary"
          endContent={<ArrowRight className="w-4 h-4" />}
          onPress={onContinue}
        >
          Continue
        </Button>
      );
    }

    if (isLocked) {
      return (
        <Button size="sm" variant="bordered" isDisabled>
          Locked
        </Button>
      );
    }

    return (
      <Button
        size="sm"
        variant="bordered"
        color="default"
        onPress={onStart}
      >
        Start
      </Button>
    );
  };

  return (
    <Card className={getCardStyle()}>
      <CardBody className="p-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0 mt-1">
            <StatusIcon />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                {phase.name}
              </h3>

              {/* Status Badges */}
              {isCompleted && (
                <Chip size="sm" color="success" variant="flat">
                  Complete
                </Chip>
              )}
              {isInProgress && (
                <Chip size="sm" color="primary" variant="flat">
                  In Progress
                </Chip>
              )}
              {isLocked && (
                <Chip size="sm" variant="flat">
                  Locked
                </Chip>
              )}
              {isNotStarted && !isLocked && (
                <Chip size="sm" variant="flat" color="default">
                  Not Started
                </Chip>
              )}
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {phase.description}
            </p>

            {/* Progress Bar (only for in-progress) */}
            {isInProgress && (
              <div className="space-y-2">
                <Progress
                  value={progress}
                  size="sm"
                  color="primary"
                  classNames={{
                    indicator: "bg-gradient-to-r from-blue-500 to-purple-500",
                  }}
                />
                <p className="text-xs text-gray-500">
                  {currentMode === "guided"
                    ? `Step ${state.currentStep || 0} of ${totalSteps}`
                    : `${progress}% complete`}
                </p>
              </div>
            )}

            {/* Completed phase summary */}
            {isCompleted && (
              <p className="text-xs text-green-600 dark:text-green-400">
                All steps completed successfully
              </p>
            )}

            {/* Lock Reason */}
            {isLocked && (
              <p className="text-xs text-gray-500 italic">
                Complete {getDependencyName(phase)} first
              </p>
            )}
          </div>

          {/* Action Button */}
          <div className="flex-shrink-0">
            <ActionButton />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
