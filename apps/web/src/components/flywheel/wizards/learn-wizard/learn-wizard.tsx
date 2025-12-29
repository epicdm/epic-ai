"use client";

import { useState, useCallback } from "react";
import { BarChart3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { WizardLayout } from "../../shared/wizard-layout";
import { LEARN_STEPS } from "@/lib/flywheel/constants";
import type { LearnWizardData } from "@/lib/flywheel/types";

// Step Components
import { AnalyticsIntroStep } from "./steps/analytics-intro-step";
import { MetricsStep } from "./steps/metrics-step";
import { ReportingStep } from "./steps/reporting-step";
import { GoalsStep } from "./steps/goals-step";
import { LearnReviewStep } from "./steps/review-step";

interface LearnWizardProps {
  initialData?: LearnWizardData;
  initialStep?: number;
  brandId?: string;
}

export function LearnWizard({
  initialData,
  initialStep = 0,
  brandId,
}: LearnWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [data, setData] = useState<LearnWizardData>(initialData ?? {});
  const [isLoading, setIsLoading] = useState(false);

  const updateData = useCallback((updates: Partial<LearnWizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await fetch("/api/flywheel/phases/learn", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "IN_PROGRESS",
          currentStep,
          data,
        }),
      });
    } catch (error) {
      console.error("Error saving progress:", error);
    }
  }, [currentStep, data]);

  const handleComplete = useCallback(async () => {
    setIsLoading(true);
    try {
      // Save analytics preferences
      await fetch("/api/analytics/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          ...data,
        }),
      });

      // Mark phase as complete
      await fetch("/api/flywheel/phases/learn", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "COMPLETED",
          currentStep: LEARN_STEPS.length - 1,
          data,
        }),
      });

      router.push("/setup");
    } catch (error) {
      console.error("Error completing phase:", error);
    } finally {
      setIsLoading(false);
    }
  }, [data, brandId, router]);

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Analytics Intro
        return data.seenIntro === true;
      case 1: // Metrics Preferences
        return (data.priorityMetrics?.length ?? 0) >= 1;
      case 2: // Reporting Schedule
        return data.reportFrequency !== undefined;
      case 3: // Learning Goals
        return (data.optimizationGoals?.length ?? 0) >= 1;
      case 4: // Review
        return data.confirmed === true;
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <AnalyticsIntroStep data={data} updateData={updateData} />;
      case 1:
        return <MetricsStep data={data} updateData={updateData} />;
      case 2:
        return <ReportingStep data={data} updateData={updateData} />;
      case 3:
        return <GoalsStep data={data} updateData={updateData} />;
      case 4:
        return <LearnReviewStep data={data} updateData={updateData} />;
      default:
        return null;
    }
  };

  return (
    <WizardLayout
      title="Learn"
      description="Set up your analytics and learning loop"
      icon={<BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />}
      color="purple"
      steps={LEARN_STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      onComplete={handleComplete}
      onSave={handleSave}
      canProceed={canProceed()}
      isLoading={isLoading}
    >
      {renderStep()}
    </WizardLayout>
  );
}
