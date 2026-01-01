"use client";

/**
 * Resume Prompt Component - Phase 3: Polish
 *
 * Displays when user has incomplete wizard progress,
 * offering options to continue or start fresh.
 */

import { useState } from "react";
import { Button } from "@heroui/react";
import { ArrowRight, RefreshCw, Clock, RotateCcw } from "lucide-react";
import {
  type ResumeState,
  getTimeAway,
  getSetupPathName,
  clearProgress,
} from "@/lib/flywheel/resume-service";

interface ResumePromptProps {
  resumeState: ResumeState;
  onContinue: () => void;
  onStartFresh: () => void;
  onDismiss?: () => void;
}

export function ResumePrompt({
  resumeState,
  onContinue,
  onStartFresh,
  onDismiss,
}: ResumePromptProps) {
  const [isClearing, setIsClearing] = useState(false);
  const timeAway = getTimeAway(resumeState.lastActiveAt);
  const setupPathName = getSetupPathName(resumeState.setupPath);

  const handleStartFresh = async () => {
    setIsClearing(true);
    try {
      await clearProgress();
      onStartFresh();
    } catch (error) {
      console.error("Failed to clear progress:", error);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-950/30 dark:to-secondary-950/30 border border-primary-200 dark:border-primary-800 rounded-xl p-6 shadow-lg">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-primary-100 dark:bg-primary-900/50 rounded-full shrink-0">
          <RefreshCw className="w-6 h-6 text-primary-600 dark:text-primary-400" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-foreground">
            Continue Where You Left Off?
          </h3>

          <p className="text-sm text-foreground-600 mt-1">
            You have an incomplete <strong>{setupPathName}</strong>
          </p>

          <div className="flex items-center gap-4 mt-3 text-sm text-foreground-500">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              Step {resumeState.currentStep + 1} of 12
            </span>
            <span className="text-foreground-400">|</span>
            <span>Last active {timeAway.display}</span>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-foreground-500 mb-1">
              <span>Progress</span>
              <span>{resumeState.progress}%</span>
            </div>
            <div className="h-2 bg-default-200 dark:bg-default-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full transition-all duration-500"
                style={{ width: `${resumeState.progress}%` }}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 mt-5">
            <Button
              color="primary"
              size="md"
              endContent={<ArrowRight className="w-4 h-4" />}
              onPress={onContinue}
              className="font-medium"
            >
              Continue Setup
            </Button>

            <Button
              variant="flat"
              size="md"
              startContent={<RotateCcw className="w-4 h-4" />}
              onPress={handleStartFresh}
              isLoading={isClearing}
              className="font-medium"
            >
              Start Fresh
            </Button>

            {onDismiss && (
              <Button
                variant="light"
                size="md"
                onPress={onDismiss}
                className="text-foreground-500"
              >
                Decide Later
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact version for smaller spaces
 */
export function ResumePromptCompact({
  resumeState,
  onContinue,
}: {
  resumeState: ResumeState;
  onContinue: () => void;
}) {
  const timeAway = getTimeAway(resumeState.lastActiveAt);
  const setupPathName = getSetupPathName(resumeState.setupPath);

  return (
    <div className="flex items-center justify-between p-4 bg-primary-50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-800 rounded-lg">
      <div className="flex items-center gap-3">
        <RefreshCw className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        <div>
          <p className="text-sm font-medium text-foreground">
            Continue {setupPathName}
          </p>
          <p className="text-xs text-foreground-500">
            {resumeState.progress}% complete - {timeAway.display}
          </p>
        </div>
      </div>
      <Button
        color="primary"
        size="sm"
        endContent={<ArrowRight className="w-3.5 h-3.5" />}
        onPress={onContinue}
      >
        Continue
      </Button>
    </div>
  );
}

/**
 * Modal version for overlay display
 */
export function ResumePromptModal({
  resumeState,
  onContinue,
  onStartFresh,
  isOpen,
  onClose,
}: ResumePromptProps & { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-md">
        <ResumePrompt
          resumeState={resumeState}
          onContinue={() => {
            onContinue();
            onClose();
          }}
          onStartFresh={() => {
            onStartFresh();
            onClose();
          }}
          onDismiss={onClose}
        />
      </div>
    </div>
  );
}
