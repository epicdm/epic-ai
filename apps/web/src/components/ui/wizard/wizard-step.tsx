"use client";

import { ReactNode } from "react";
import { Button } from "@heroui/react";
import { cn } from "@/lib/utils";
import { useWizard } from "./wizard-context";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, Loader2Icon } from "lucide-react";

interface WizardStepProps {
  stepIndex: number;
  children: ReactNode;
  className?: string;
  showNavigation?: boolean;
  nextLabel?: string;
  prevLabel?: string;
  completeLabel?: string;
  onNext?: () => Promise<boolean> | boolean | void;
  onPrev?: () => void;
  disableNext?: boolean;
  disablePrev?: boolean;
  hideNext?: boolean;
  hidePrev?: boolean;
}

export function WizardStep({
  stepIndex,
  children,
  className,
  showNavigation = true,
  nextLabel,
  prevLabel = "Back",
  completeLabel = "Complete",
  onNext,
  onPrev,
  disableNext = false,
  disablePrev = false,
  hideNext = false,
  hidePrev = false,
}: WizardStepProps) {
  const {
    currentStep,
    nextStep,
    prevStep,
    isLoading,
    setLoading,
    setError,
    isFirstStep,
    isLastStep,
  } = useWizard();

  // Only render if this is the current step
  if (currentStep !== stepIndex) {
    return null;
  }

  const handleNext = async () => {
    if (onNext) {
      setLoading(true);
      setError(null);
      try {
        const result = await onNext();
        // If onNext returns false, don't proceed
        if (result === false) {
          setLoading(false);
          return;
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : "An error occurred");
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    nextStep();
  };

  const handlePrev = () => {
    if (onPrev) {
      onPrev();
    }
    prevStep();
  };

  const defaultNextLabel = isLastStep ? completeLabel : "Continue";

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Step Content */}
      <div className="flex-1">{children}</div>

      {/* Navigation */}
      {showNavigation && (
        <div className="flex justify-between items-center mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
          {!hidePrev && !isFirstStep ? (
            <Button
              variant="light"
              onPress={handlePrev}
              isDisabled={disablePrev || isLoading}
              startContent={<ArrowLeftIcon className="w-4 h-4" />}
            >
              {prevLabel}
            </Button>
          ) : (
            <div />
          )}

          {!hideNext && (
            <Button
              color="primary"
              onPress={handleNext}
              isDisabled={disableNext || isLoading}
              isLoading={isLoading}
              endContent={
                isLoading ? null : isLastStep ? (
                  <CheckIcon className="w-4 h-4" />
                ) : (
                  <ArrowRightIcon className="w-4 h-4" />
                )
              }
            >
              {nextLabel || defaultNextLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

interface WizardStepHeaderProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  className?: string;
}

export function WizardStepHeader({ icon, title, description, className }: WizardStepHeaderProps) {
  return (
    <div className={cn("text-center mb-6", className)}>
      {icon && (
        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          {icon}
        </div>
      )}
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
      {description && (
        <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">{description}</p>
      )}
    </div>
  );
}

interface WizardStepContentProps {
  children: ReactNode;
  className?: string;
}

export function WizardStepContent({ children, className }: WizardStepContentProps) {
  return <div className={cn("space-y-4", className)}>{children}</div>;
}

interface WizardActionsProps {
  children: ReactNode;
  className?: string;
}

export function WizardActions({ children, className }: WizardActionsProps) {
  return (
    <div className={cn("flex flex-col gap-2 mt-6", className)}>
      {children}
    </div>
  );
}
