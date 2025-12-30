"use client";

import { Card, CardBody, Progress, Button } from "@heroui/react";
import {
  Brain,
  Sparkles,
  Share2,
  TrendingUp,
  Zap,
  Lock,
  Check,
  Play,
  Pause,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import type { PhaseInfo, PhaseState, FlywheelPhase } from "@/lib/flywheel/types";

const PHASE_ICONS: Record<string, LucideIcon> = {
  Brain,
  Sparkles,
  Share2,
  TrendingUp,
  Zap,
};

const PHASE_COLORS: Record<string, { bg: string; text: string; border: string; progress: string }> = {
  purple: {
    bg: "bg-purple-50 dark:bg-purple-950/30",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-200 dark:border-purple-800",
    progress: "bg-purple-500",
  },
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
    progress: "bg-blue-500",
  },
  green: {
    bg: "bg-green-50 dark:bg-green-950/30",
    text: "text-green-600 dark:text-green-400",
    border: "border-green-200 dark:border-green-800",
    progress: "bg-green-500",
  },
  orange: {
    bg: "bg-orange-50 dark:bg-orange-950/30",
    text: "text-orange-600 dark:text-orange-400",
    border: "border-orange-200 dark:border-orange-800",
    progress: "bg-orange-500",
  },
  pink: {
    bg: "bg-pink-50 dark:bg-pink-950/30",
    text: "text-pink-600 dark:text-pink-400",
    border: "border-pink-200 dark:border-pink-800",
    progress: "bg-pink-500",
  },
};

interface PhaseCardProps {
  phaseInfo: PhaseInfo;
  phaseState: PhaseState;
  onClick: () => void;
  index: number;
}

export function PhaseCard({ phaseInfo, phaseState, onClick, index }: PhaseCardProps) {
  const Icon = PHASE_ICONS[phaseInfo.icon] || Brain;
  const colors = PHASE_COLORS[phaseInfo.color] || PHASE_COLORS.purple;

  const isBlocked = phaseState.isBlocked;
  const isCompleted = phaseState.status === "COMPLETED";
  const isInProgress = phaseState.status === "IN_PROGRESS";
  const isNotStarted = phaseState.status === "NOT_STARTED";
  const isSkipped = phaseState.status === "SKIPPED";

  const progressPercent =
    phaseState.currentStep >= 0
      ? Math.round(((phaseState.currentStep + 1) / phaseState.totalSteps) * 100)
      : 0;

  const getStatusBadge = () => {
    if (isBlocked) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          <Lock className="w-3 h-3" />
          Locked
        </span>
      );
    }
    if (isCompleted) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400">
          <Check className="w-3 h-3" />
          Complete
        </span>
      );
    }
    if (isInProgress) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400">
          <Play className="w-3 h-3" />
          In Progress
        </span>
      );
    }
    if (isSkipped) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400">
          <Pause className="w-3 h-3" />
          Skipped
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
        Ready
      </span>
    );
  };

  const getButtonLabel = () => {
    if (isBlocked) return `Complete ${phaseState.blockedBy[0]} first`;
    if (isCompleted) return "Edit";
    if (isInProgress) return "Continue";
    if (isSkipped) return "Complete";
    return "Start";
  };

  const getButtonVariant = () => {
    if (isBlocked) return "flat";
    if (isCompleted) return "bordered";
    if (isInProgress) return "solid";
    return "solid";
  };

  return (
    <Card
      className={`relative transition-all duration-200 ${
        isBlocked
          ? "opacity-60 cursor-not-allowed border-dashed"
          : "hover:shadow-lg cursor-pointer"
      } ${isCompleted ? "border-2 border-green-500/50" : ""} ${
        isInProgress ? `border-2 ${colors.border}` : ""
      }`}
      isPressable={!isBlocked}
      onPress={isBlocked ? undefined : onClick}
    >
      <CardBody className="p-5">
        {/* Phase Number Badge */}
        <div className="absolute -top-3 -left-2">
          <span
            className={`inline-flex items-center justify-center w-7 h-7 text-sm font-bold rounded-full ${
              isCompleted
                ? "bg-green-500 text-white"
                : isInProgress
                  ? `${colors.progress} text-white`
                  : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
            }`}
          >
            {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
          </span>
        </div>

        <div className="flex items-start gap-4">
          {/* Icon */}
          <div
            className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
              isBlocked ? "bg-gray-100 dark:bg-gray-800" : colors.bg
            }`}
          >
            <Icon
              className={`w-6 h-6 ${isBlocked ? "text-gray-400" : colors.text}`}
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3
                className={`text-lg font-semibold ${
                  isBlocked ? "text-gray-400" : "text-gray-900 dark:text-white"
                }`}
              >
                {phaseInfo.name}
              </h3>
              {getStatusBadge()}
            </div>

            <p
              className={`text-sm mb-3 ${
                isBlocked
                  ? "text-gray-400"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              {phaseInfo.description}
            </p>

            {/* Progress Bar (only show if in progress or completed) */}
            {(isInProgress || isCompleted) && (
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-500 dark:text-gray-400">
                    Step {Math.max(1, phaseState.currentStep + 1)} of {phaseState.totalSteps}
                  </span>
                  <span className={colors.text}>{progressPercent}%</span>
                </div>
                <Progress
                  size="sm"
                  value={progressPercent}
                  classNames={{
                    indicator: colors.progress,
                    track: "bg-gray-100 dark:bg-gray-800",
                  }}
                />
              </div>
            )}

            {/* Action Button */}
            <Button
              size="sm"
              variant={getButtonVariant()}
              color={isBlocked ? "default" : isCompleted ? "success" : "primary"}
              className={`${isBlocked ? "pointer-events-none" : ""}`}
              endContent={!isBlocked && <ChevronRight className="w-4 h-4" />}
              isDisabled={isBlocked}
              onPress={!isBlocked ? onClick : undefined}
            >
              {getButtonLabel()}
            </Button>
          </div>
        </div>

        {/* Connecting Line (except last card) */}
        {index < 4 && (
          <div
            className={`absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-0.5 h-8 ${
              isCompleted
                ? "bg-green-500"
                : "bg-gray-200 dark:bg-gray-700"
            }`}
          />
        )}
      </CardBody>
    </Card>
  );
}
