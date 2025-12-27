"use client";

import { ReactNode } from "react";
import { Card, CardBody, Progress } from "@heroui/react";
import { cn } from "@/lib/utils";
import { WizardProvider, WizardStep, useWizard } from "./wizard-context";
import { CheckIcon } from "lucide-react";

interface WizardProps {
  children: ReactNode;
  steps: WizardStep[];
  initialStep?: number;
  initialData?: Record<string, unknown>;
  onStepChange?: (step: number, data: Record<string, unknown>) => void;
  onComplete?: (data: Record<string, unknown>) => void;
  className?: string;
  showProgress?: boolean;
  showStepIndicator?: boolean;
  variant?: "default" | "minimal" | "full";
}

export function Wizard({
  children,
  steps,
  initialStep = 0,
  initialData = {},
  onStepChange,
  onComplete,
  className,
  showProgress = true,
  showStepIndicator = true,
  variant = "default",
}: WizardProps) {
  return (
    <WizardProvider
      steps={steps}
      initialStep={initialStep}
      initialData={initialData}
      onStepChange={onStepChange}
      onComplete={onComplete}
    >
      <WizardContent
        className={className}
        showProgress={showProgress}
        showStepIndicator={showStepIndicator}
        variant={variant}
      >
        {children}
      </WizardContent>
    </WizardProvider>
  );
}

interface WizardContentProps {
  children: ReactNode;
  className?: string;
  showProgress?: boolean;
  showStepIndicator?: boolean;
  variant?: "default" | "minimal" | "full";
}

function WizardContent({
  children,
  className,
  showProgress = true,
  showStepIndicator = true,
  variant = "default",
}: WizardContentProps) {
  const { steps, currentStep, progress } = useWizard();

  if (variant === "minimal") {
    return (
      <div className={cn("w-full", className)}>
        {showProgress && (
          <Progress
            value={progress}
            className="mb-6"
            color="primary"
            size="sm"
            aria-label="Wizard progress"
          />
        )}
        {children}
      </div>
    );
  }

  if (variant === "full") {
    return (
      <div className={cn("flex gap-8 w-full max-w-5xl mx-auto", className)}>
        {/* Sidebar with steps */}
        <div className="w-64 flex-shrink-0">
          <nav className="space-y-1" aria-label="Wizard steps">
            {steps.map((step, index) => (
              <StepIndicator
                key={step.id}
                step={step}
                index={index}
                currentStep={currentStep}
                showIcon
              />
            ))}
          </nav>
        </div>

        {/* Main content */}
        <Card className="flex-1">
          <CardBody className="p-6 md:p-8">{children}</CardBody>
        </Card>
      </div>
    );
  }

  // Default variant
  return (
    <Card className={cn("w-full max-w-lg mx-auto", className)}>
      <CardBody className="p-6 md:p-8">
        {showProgress && (
          <Progress
            value={progress}
            className="mb-6"
            color="primary"
            size="sm"
            aria-label="Wizard progress"
          />
        )}

        {showStepIndicator && (
          <div className="flex justify-center gap-2 mb-6">
            {steps.map((step, index) => (
              <StepDot
                key={step.id}
                index={index}
                currentStep={currentStep}
                title={step.title}
              />
            ))}
          </div>
        )}

        {children}
      </CardBody>
    </Card>
  );
}

interface StepDotProps {
  index: number;
  currentStep: number;
  title: string;
}

function StepDot({ index, currentStep, title }: StepDotProps) {
  const isComplete = index < currentStep;
  const isCurrent = index === currentStep;

  return (
    <div
      className={cn(
        "w-2.5 h-2.5 rounded-full transition-all duration-200",
        isComplete && "bg-primary",
        isCurrent && "bg-primary scale-125",
        !isComplete && !isCurrent && "bg-gray-300 dark:bg-gray-600"
      )}
      title={title}
      aria-label={`Step ${index + 1}: ${title}${isComplete ? " (complete)" : isCurrent ? " (current)" : ""}`}
    />
  );
}

interface StepIndicatorProps {
  step: WizardStep;
  index: number;
  currentStep: number;
  showIcon?: boolean;
}

function StepIndicator({ step, index, currentStep, showIcon = false }: StepIndicatorProps) {
  const isComplete = index < currentStep;
  const isCurrent = index === currentStep;

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg transition-colors",
        isCurrent && "bg-primary/10 border border-primary/20",
        isComplete && "text-gray-500",
        !isCurrent && !isComplete && "text-gray-400"
      )}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
          isComplete && "bg-primary text-white",
          isCurrent && "bg-primary text-white",
          !isComplete && !isCurrent && "bg-gray-200 dark:bg-gray-700 text-gray-500"
        )}
      >
        {isComplete ? (
          <CheckIcon className="w-4 h-4" />
        ) : showIcon && step.icon ? (
          step.icon
        ) : (
          index + 1
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium truncate",
            isCurrent && "text-primary",
            isComplete && "text-gray-600 dark:text-gray-400"
          )}
        >
          {step.title}
        </p>
        {step.description && (
          <p className="text-xs text-gray-500 truncate">{step.description}</p>
        )}
      </div>
    </div>
  );
}

// Re-export useful items
export { useWizard } from "./wizard-context";
export type { WizardStep } from "./wizard-context";
