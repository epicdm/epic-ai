"use client";

import { Card, CardBody, Progress, Button } from "@heroui/react";
import { Rocket, ArrowRight, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  FLYWHEEL_PHASES,
  PHASE_INFO,
  getNextAvailablePhase,
} from "@/lib/flywheel/constants";
import type { FlywheelState, FlywheelPhase } from "@/lib/flywheel/types";

interface FlywheelProgressCardProps {
  flywheelState: FlywheelState;
  compact?: boolean;
}

export function FlywheelProgressCard({
  flywheelState,
  compact = false,
}: FlywheelProgressCardProps) {
  const router = useRouter();

  const completedPhases = FLYWHEEL_PHASES.filter(
    (phase) => flywheelState.phases[phase].status === "COMPLETED"
  );
  const nextPhase = getNextAvailablePhase(completedPhases);
  const allComplete = completedPhases.length === 5;

  const handleContinue = () => {
    if (nextPhase) {
      router.push(`/setup/${nextPhase.toLowerCase()}`);
    } else {
      router.push("/setup");
    }
  };

  if (compact) {
    return (
      <Card className="border border-brand-200 dark:border-brand-800">
        <CardBody className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center">
                <Rocket className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Flywheel Setup
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {flywheelState.overallProgress}% complete
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="light"
                onPress={() => router.push("/setup")}
                className="text-brand-600 dark:text-brand-400"
              >
                All Phases
              </Button>
              <Button
                size="sm"
                color="primary"
                variant="flat"
                endContent={<ArrowRight className="w-4 h-4" />}
                onPress={handleContinue}
              >
                {nextPhase ? "Continue" : "View"}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-brand-50 to-purple-50 dark:from-brand-950/30 dark:to-purple-950/30 border-brand-200 dark:border-brand-800">
      <CardBody className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-brand-500 flex items-center justify-center">
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Flywheel Setup
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {allComplete
                  ? flywheelState.flywheelActive
                    ? "Your flywheel is running"
                    : "Ready to activate"
                  : `${completedPhases.length} of 5 phases complete`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {flywheelState.flywheelActive && (
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  Active
                </span>
              </div>
            )}
            <Button
              size="sm"
              variant="light"
              onPress={() => router.push("/setup")}
              className="text-brand-600 dark:text-brand-400"
            >
              All Phases
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600 dark:text-gray-400">Overall Progress</span>
            <span className="font-semibold text-brand-600 dark:text-brand-400">
              {flywheelState.overallProgress}%
            </span>
          </div>
          <Progress
            size="md"
            value={flywheelState.overallProgress}
            classNames={{
              indicator: "bg-gradient-to-r from-brand-500 to-purple-500",
              track: "bg-white/50 dark:bg-gray-800/50",
            }}
          />
        </div>

        {/* Phase Indicators */}
        <div className="flex items-center justify-between mb-4">
          {FLYWHEEL_PHASES.map((phase, index) => {
            const isComplete = flywheelState.phases[phase].status === "COMPLETED";
            const isInProgress = flywheelState.phases[phase].status === "IN_PROGRESS";
            const info = PHASE_INFO[phase];

            return (
              <div key={phase} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                    isComplete
                      ? "bg-green-500 text-white"
                      : isInProgress
                        ? "bg-brand-500 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  }`}
                  title={info.name}
                >
                  {isComplete ? <Check className="w-4 h-4" /> : index + 1}
                </div>
                {index < FLYWHEEL_PHASES.length - 1 && (
                  <div
                    className={`w-6 h-0.5 ${
                      isComplete
                        ? "bg-green-500"
                        : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Next Step Guidance */}
        {nextPhase && (
          <div className="mb-4 p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg">
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              Up Next: {PHASE_INFO[nextPhase].name}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {nextPhase === "UNDERSTAND" && "Set up your brand identity, voice, and target audiences."}
              {nextPhase === "CREATE" && "Configure your content types and AI generation preferences."}
              {nextPhase === "DISTRIBUTE" && "Connect social accounts and set up your posting schedule."}
              {nextPhase === "LEARN" && "Set up analytics tracking and performance goals."}
              {nextPhase === "AUTOMATE" && "Enable AI autopilot to manage content automatically."}
            </p>
          </div>
        )}

        {allComplete && !flywheelState.flywheelActive && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
              Setup Complete!
            </p>
            <p className="text-xs text-green-700 dark:text-green-300">
              All phases are configured. Activate your flywheel to start generating and publishing content.
            </p>
          </div>
        )}

        {/* Action Button */}
        <Button
          color="primary"
          className="w-full"
          endContent={<ArrowRight className="w-4 h-4" />}
          onPress={handleContinue}
        >
          {nextPhase ? `Continue: ${PHASE_INFO[nextPhase].name}` : allComplete && !flywheelState.flywheelActive ? "Activate Flywheel" : "View Setup"}
        </Button>
      </CardBody>
    </Card>
  );
}
