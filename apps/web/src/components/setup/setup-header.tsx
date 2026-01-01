"use client";

/**
 * Setup Header Component
 *
 * Displays setup progress and allows switching between setup modes.
 */

import { useRouter } from "next/navigation";
import { Button, Progress, Chip } from "@heroui/react";
import {
  ZapIcon,
  BookOpenIcon,
  WrenchIcon,
  ArrowRightIcon,
} from "lucide-react";

type SetupMode = "guided" | "expert";

interface SetupHeaderProps {
  mode: SetupMode;
  isFirstTime?: boolean;
  overallProgress: number;
}

export function SetupHeader({
  mode,
  isFirstTime,
  overallProgress,
}: SetupHeaderProps) {
  const router = useRouter();

  const handleSwitchToAI = () => {
    router.push("/setup/ai");
  };

  const handleSwitchMode = (newMode: SetupMode) => {
    if (newMode === mode) return;
    router.push(`/setup?mode=${newMode}`);
  };

  return (
    <div className="mb-8">
      {/* Welcome message for first-time users */}
      {isFirstTime && (
        <div className="mb-6 p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl border border-primary/20">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">🎯</span>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Welcome to Your Setup Hub!
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Configure your AI marketing flywheel step by step. You can also let AI
                do the heavy lifting with our Express Setup.
              </p>
              <Button
                color="primary"
                size="sm"
                endContent={<ArrowRightIcon className="w-4 h-4" />}
                onPress={handleSwitchToAI}
              >
                Try AI Express Setup
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header with progress and mode switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Setup Your Flywheel
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
            {mode === "guided"
              ? "Streamlined setup with 12 essential steps"
              : "Full control over all configuration options"}
          </p>
        </div>

        {/* Mode switcher */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={mode === "guided" ? "solid" : "flat"}
            color={mode === "guided" ? "primary" : "default"}
            startContent={<BookOpenIcon className="w-4 h-4" />}
            onPress={() => handleSwitchMode("guided")}
          >
            Guided
          </Button>
          <Button
            size="sm"
            variant={mode === "expert" ? "solid" : "flat"}
            color={mode === "expert" ? "primary" : "default"}
            startContent={<WrenchIcon className="w-4 h-4" />}
            onPress={() => handleSwitchMode("expert")}
          >
            Expert
          </Button>
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
          <Button
            size="sm"
            variant="flat"
            color="secondary"
            startContent={<ZapIcon className="w-4 h-4" />}
            onPress={handleSwitchToAI}
          >
            AI Setup
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Overall Progress
          </span>
          <Chip
            size="sm"
            variant="flat"
            color={overallProgress === 100 ? "success" : "primary"}
          >
            {overallProgress}% Complete
          </Chip>
        </div>
        <Progress
          value={overallProgress}
          color={overallProgress === 100 ? "success" : "primary"}
          size="md"
          className="w-full"
        />
        {overallProgress === 100 && (
          <p className="text-sm text-green-600 dark:text-green-400 mt-2">
            Your flywheel is fully configured! Head to the dashboard to start.
          </p>
        )}
      </div>
    </div>
  );
}
