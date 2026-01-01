"use client";

/**
 * Setup Dashboard Component
 *
 * Displays the progress dashboard with:
 * - Overall progress card
 * - Mode switcher
 * - Phase status cards
 * - Help section
 */

import { useRouter } from "next/navigation";
import { Card, CardBody, Button, Progress, Chip } from "@heroui/react";
import {
  CheckCircle,
  ArrowRight,
  Rocket,
  HelpCircle,
  Zap,
  Sparkles,
  Settings2,
} from "lucide-react";
import { PhaseStatusCard, ModeSwitcher } from "@/components/setup";
import { FLYWHEEL_PHASES, PHASE_INFO } from "@/lib/flywheel/constants";
import type { FlywheelState, FlywheelPhase, PhaseState } from "@/lib/flywheel/types";
import Link from "next/link";

interface SetupDashboardProps {
  flywheelState: FlywheelState;
  currentMode: "ai" | "guided" | "expert";
  isFirstTime?: boolean;
  brandId?: string;
}

/**
 * Get a progress message based on completion percentage
 */
function getProgressMessage(progress: number): string {
  if (progress === 0) return "Let's get your AI flywheel configured";
  if (progress < 25) return "Just getting started...";
  if (progress < 50) return "Making good progress!";
  if (progress < 75) return "More than halfway there!";
  if (progress < 100) return "Almost ready to launch!";
  return "Setup complete - ready to activate!";
}

/**
 * Count completed phases
 */
function getCompletedPhaseCount(flywheelState: FlywheelState): number {
  return Object.values(flywheelState.phases).filter(
    (phase) => phase.status === "COMPLETED"
  ).length;
}

/**
 * Get the next phase to work on
 */
function getNextPhase(flywheelState: FlywheelState): FlywheelPhase | null {
  for (const phaseId of FLYWHEEL_PHASES) {
    const phase = flywheelState.phases[phaseId];
    if (phase.status === "IN_PROGRESS") {
      return phaseId;
    }
  }
  for (const phaseId of FLYWHEEL_PHASES) {
    const phase = flywheelState.phases[phaseId];
    if (phase.status === "NOT_STARTED" && !phase.isBlocked) {
      return phaseId;
    }
  }
  return null;
}

export function SetupDashboard({
  flywheelState,
  currentMode,
  isFirstTime,
  brandId,
}: SetupDashboardProps) {
  const router = useRouter();

  const overallProgress = flywheelState.overallProgress;
  const completedPhases = getCompletedPhaseCount(flywheelState);
  const nextPhase = getNextPhase(flywheelState);

  const handleContinueSetup = () => {
    if (nextPhase) {
      router.push(`/setup/${nextPhase.toLowerCase()}`);
    }
  };

  const handleActivateFlywheel = async () => {
    try {
      await fetch("/api/flywheel/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId }),
      });
      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to activate flywheel:", error);
    }
  };

  const handleStartPhase = (phaseId: FlywheelPhase) => {
    if (currentMode === "guided") {
      router.push(`/setup?mode=guided&phase=${phaseId}`);
    } else {
      router.push(`/setup/${phaseId.toLowerCase()}`);
    }
  };

  const handleContinuePhase = (phaseId: FlywheelPhase, state: PhaseState) => {
    if (currentMode === "guided") {
      router.push(`/setup?mode=guided&phase=${phaseId}&step=${state.currentStep}`);
    } else {
      router.push(`/setup/${phaseId.toLowerCase()}?step=${state.currentStep}`);
    }
  };

  const handleReviewPhase = (phaseId: FlywheelPhase) => {
    if (currentMode === "guided") {
      router.push(`/setup?mode=guided&phase=${phaseId}&review=true`);
    } else {
      router.push(`/setup/${phaseId.toLowerCase()}?review=true`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header with Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Setup Hub
            </h1>
            <Chip
              size="lg"
              variant="flat"
              color={currentMode === "guided" ? "primary" : "default"}
              startContent={
                currentMode === "guided" ? (
                  <Sparkles className="w-4 h-4" />
                ) : (
                  <Settings2 className="w-4 h-4" />
                )
              }
            >
              {currentMode === "guided" ? "Guided Mode" : "Expert Mode"}
            </Chip>
          </div>

          <ModeSwitcher currentMode={currentMode} />
        </div>

        {/* First-time user prompt */}
        {isFirstTime && (
          <div className="mb-6 p-4 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl border border-purple-200 dark:border-purple-800">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  Welcome to Your Setup Hub!
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Configure your AI marketing flywheel step by step. You can also
                  let AI do the heavy lifting with our Express Setup.
                </p>
                <Button
                  color="secondary"
                  size="sm"
                  endContent={<ArrowRight className="w-4 h-4" />}
                  onPress={() => router.push("/setup/ai")}
                >
                  Try AI Express Setup
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Overall Progress Card */}
        <Card className="mb-6 border-2 border-purple-200 dark:border-purple-800">
          <CardBody className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Your Epic AI Setup
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {getProgressMessage(overallProgress)}
                </p>
              </div>

              <div className="text-right">
                <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                  {overallProgress}%
                </div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Complete
                </p>
              </div>
            </div>

            <Progress
              value={overallProgress}
              size="lg"
              className="mb-4"
              classNames={{
                indicator:
                  "bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500",
                track: "bg-gray-200 dark:bg-gray-700",
              }}
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>
                  {completedPhases} of 5 phases complete
                </span>
              </div>

              {overallProgress < 100 && nextPhase && (
                <Button
                  color="primary"
                  size="sm"
                  endContent={<ArrowRight className="w-4 h-4" />}
                  onPress={handleContinueSetup}
                >
                  Continue Setup
                </Button>
              )}

              {overallProgress === 100 && !flywheelState.flywheelActive && (
                <Button
                  color="success"
                  size="sm"
                  endContent={<Rocket className="w-4 h-4" />}
                  onPress={handleActivateFlywheel}
                >
                  Activate Flywheel
                </Button>
              )}

              {flywheelState.flywheelActive && (
                <Chip color="success" variant="flat" startContent={<Rocket className="w-3 h-3" />}>
                  Flywheel Active
                </Chip>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Phase Status Cards */}
        <div className="space-y-4 mb-6">
          {FLYWHEEL_PHASES.map((phaseId) => {
            const phaseInfo = PHASE_INFO[phaseId];
            const phaseState = flywheelState.phases[phaseId];

            return (
              <PhaseStatusCard
                key={phaseId}
                phase={phaseInfo}
                state={phaseState}
                allPhaseStates={flywheelState.phases}
                currentMode={currentMode}
                onStart={() => handleStartPhase(phaseId)}
                onContinue={() => handleContinuePhase(phaseId, phaseState)}
                onReview={() => handleReviewPhase(phaseId)}
              />
            );
          })}
        </div>

        {/* Help Section */}
        <Card className="bg-gray-100 dark:bg-gray-800">
          <CardBody className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <HelpCircle className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                  Need Help?
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Not sure which mode to use? Try AI Express for fastest setup,
                  or Guided for step-by-step configuration.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="flat"
                    color="secondary"
                    onPress={() => router.push("/setup/ai")}
                  >
                    Try AI Express
                  </Button>
                  <Button
                    size="sm"
                    variant="flat"
                    as={Link}
                    href="/docs/setup"
                  >
                    View Setup Guide
                  </Button>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
