"use client";

import { useState } from "react";
import { Card, CardBody, Progress, Button } from "@heroui/react";
import { Rocket, RefreshCw, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { PhaseCard } from "./phase-card";
import {
  FLYWHEEL_PHASES,
  PHASE_INFO,
  getNextAvailablePhase,
} from "@/lib/flywheel/constants";
import type { FlywheelState, FlywheelPhase } from "@/lib/flywheel/types";

interface PhaseHubProps {
  flywheelState: FlywheelState;
  onRefresh?: () => void;
}

export function PhaseHub({ flywheelState, onRefresh }: PhaseHubProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handlePhaseSelect = (phase: FlywheelPhase) => {
    router.push(`/setup/${phase.toLowerCase()}`);
  };

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
  };

  const completedPhases = FLYWHEEL_PHASES.filter(
    (phase) => flywheelState.phases[phase].status === "COMPLETED"
  );
  const nextPhase = getNextAvailablePhase(completedPhases);
  const allComplete = completedPhases.length === 5;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Setup Your Flywheel
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Complete each phase to activate your AI marketing engine
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onRefresh && (
            <Button
              variant="flat"
              size="sm"
              startContent={<RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />}
              onPress={handleRefresh}
              isDisabled={isRefreshing}
            >
              Refresh
            </Button>
          )}

          {nextPhase && !allComplete && (
            <Button
              color="primary"
              size="sm"
              endContent={<ArrowRight className="w-4 h-4" />}
              onPress={() => handlePhaseSelect(nextPhase)}
            >
              Continue: {PHASE_INFO[nextPhase].name}
            </Button>
          )}
        </div>
      </div>

      {/* Overall Progress */}
      <Card className="bg-gradient-to-r from-brand-50 to-purple-50 dark:from-brand-950/30 dark:to-purple-950/30 border-brand-200 dark:border-brand-800">
        <CardBody className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-500 flex items-center justify-center">
                <Rocket className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Flywheel Progress
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {allComplete
                    ? "Your flywheel is fully activated!"
                    : flywheelState.flywheelActive
                      ? "Flywheel is running"
                      : `${completedPhases.length} of 5 phases complete`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 min-w-[200px]">
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Overall</span>
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
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Phase Cards */}
      <div className="space-y-6">
        {FLYWHEEL_PHASES.map((phase, index) => (
          <PhaseCard
            key={phase}
            phaseInfo={PHASE_INFO[phase]}
            phaseState={flywheelState.phases[phase]}
            onClick={() => handlePhaseSelect(phase)}
            index={index}
          />
        ))}
      </div>

      {/* Activation Message */}
      {allComplete && !flywheelState.flywheelActive && (
        <Card className="border-2 border-dashed border-green-500 bg-green-50 dark:bg-green-950/30">
          <CardBody className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4">
              <Rocket className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              All Phases Complete!
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Complete the final step in the Automate phase to activate your flywheel.
            </p>
            <Button
              color="success"
              size="lg"
              endContent={<Rocket className="w-5 h-5" />}
              onPress={() => handlePhaseSelect("AUTOMATE")}
            >
              Activate Flywheel
            </Button>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
