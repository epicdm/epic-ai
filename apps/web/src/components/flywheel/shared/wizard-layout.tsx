"use client";

import { useState, useCallback } from "react";
import { Card, CardBody, CardHeader, Progress, Button, Link } from "@heroui/react";
import { ChevronLeft, ChevronRight, X, Check, Sparkles, Home, ChevronRight as ChevronRightIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import type { WizardStep, WizardNavigation } from "@/lib/flywheel/types";

interface WizardLayoutProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  steps: WizardStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  onComplete: () => Promise<void>;
  onSave: () => Promise<void>;
  children: React.ReactNode;
  canProceed?: boolean;
  isLoading?: boolean;
}

export function WizardLayout({
  title,
  description,
  icon,
  color,
  steps,
  currentStep,
  onStepChange,
  onComplete,
  onSave,
  children,
  canProceed = true,
  isLoading = false,
}: WizardLayoutProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const totalSteps = steps.length;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const currentStepInfo = steps[currentStep];
  const progressPercent = Math.round(((currentStep + 1) / totalSteps) * 100);

  const navigation: WizardNavigation = {
    currentStep,
    totalSteps,
    canGoBack: !isFirstStep,
    canGoForward: !isLastStep && canProceed,
    canSkip: currentStepInfo?.optional ?? false,
    isComplete: isLastStep && canProceed,
  };

  const handleBack = useCallback(() => {
    if (!isFirstStep) {
      onStepChange(currentStep - 1);
    }
  }, [isFirstStep, currentStep, onStepChange]);

  const handleNext = useCallback(async () => {
    if (isLoading || isSaving) return;

    setIsSaving(true);
    try {
      await onSave();
      if (!isLastStep) {
        onStepChange(currentStep + 1);
      }
    } finally {
      setIsSaving(false);
    }
  }, [isLastStep, isLoading, isSaving, currentStep, onStepChange, onSave]);

  const handleComplete = useCallback(async () => {
    if (isLoading || isCompleting) return;

    setIsCompleting(true);
    try {
      await onSave();
      await onComplete();
    } finally {
      setIsCompleting(false);
    }
  }, [isLoading, isCompleting, onSave, onComplete]);

  const handleClose = () => {
    router.push("/setup");
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm mb-4" aria-label="Breadcrumb">
        <Link
          href="/dashboard"
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1"
        >
          <Home className="w-4 h-4" />
          <span>Dashboard</span>
        </Link>
        <ChevronRightIcon className="w-4 h-4 text-gray-400" />
        <Link
          href="/setup"
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Setup
        </Link>
        <ChevronRightIcon className="w-4 h-4 text-gray-400" />
        <span className="text-gray-900 dark:text-white font-medium">{title}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${color}-100 dark:bg-${color}-900/30`}>
            {icon}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {title}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {description}
            </p>
          </div>
        </div>

        <Button
          isIconOnly
          variant="light"
          onPress={handleClose}
          aria-label="Close wizard"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Progress */}
      <Card className="mb-6">
        <CardBody className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Step {currentStep + 1} of {totalSteps}
            </span>
            <span className={`text-sm font-semibold text-${color}-600 dark:text-${color}-400`}>
              {progressPercent}%
            </span>
          </div>
          <Progress
            size="sm"
            value={progressPercent}
            classNames={{
              indicator: `bg-${color}-500`,
              track: "bg-gray-100 dark:bg-gray-800",
            }}
          />

          {/* Step Indicators */}
          <div className="flex items-center justify-between mt-4 overflow-x-auto">
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => index < currentStep && onStepChange(index)}
                disabled={index > currentStep}
                className={`flex flex-col items-center min-w-[60px] ${
                  index <= currentStep ? "cursor-pointer" : "cursor-not-allowed"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    index < currentStep
                      ? `bg-${color}-500 text-white`
                      : index === currentStep
                        ? `bg-${color}-100 text-${color}-700 dark:bg-${color}-900/50 dark:text-${color}-400 ring-2 ring-${color}-500`
                        : "bg-gray-100 text-gray-400 dark:bg-gray-800"
                  }`}
                >
                  {index < currentStep ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={`text-xs mt-1 text-center hidden sm:block ${
                    index === currentStep
                      ? "text-gray-900 dark:text-white font-medium"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {step.title}
                </span>
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Current Step Content */}
      <Card className="mb-6">
        <CardHeader className="pb-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {currentStepInfo?.title}
            </h2>
            {currentStepInfo?.aiAssisted && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400">
                <Sparkles className="w-3 h-3" />
                AI-Assisted
              </span>
            )}
            {currentStepInfo?.optional && (
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                Optional
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {currentStepInfo?.description}
          </p>
        </CardHeader>
        <CardBody className="pt-4">{children}</CardBody>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="flat"
          startContent={<ChevronLeft className="w-4 h-4" />}
          onPress={handleBack}
          isDisabled={isFirstStep || isLoading || isSaving || isCompleting}
        >
          Back
        </Button>

        <div className="flex items-center gap-3">
          {navigation.canSkip && !isLastStep && (
            <Button
              variant="light"
              onPress={handleNext}
              isDisabled={isLoading || isSaving}
            >
              Skip
            </Button>
          )}

          {isLastStep ? (
            <Button
              color="success"
              endContent={<Check className="w-4 h-4" />}
              onPress={handleComplete}
              isLoading={isCompleting}
              isDisabled={!canProceed || isLoading}
            >
              Complete Phase
            </Button>
          ) : (
            <Button
              color="primary"
              endContent={<ChevronRight className="w-4 h-4" />}
              onPress={handleNext}
              isLoading={isSaving}
              isDisabled={!canProceed || isLoading}
            >
              {isSaving ? "Saving..." : "Next"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
