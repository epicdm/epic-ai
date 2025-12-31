"use client";

import { useState, useCallback } from "react";
import { BarChart3, Wand2, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardBody, Button } from "@heroui/react";
import { WizardLayout } from "../../shared/wizard-layout";
import { AIQuickSetup } from "../../shared/ai-quick-setup";
import { LEARN_STEPS } from "@/lib/flywheel/constants";
import type { LearnWizardData } from "@/lib/flywheel/types";

// Step Components
import { AnalyticsIntroStep } from "./steps/analytics-intro-step";
import { MetricsStep } from "./steps/metrics-step";
import { ReportingStep } from "./steps/reporting-step";
import { GoalsStep } from "./steps/goals-step";
import { LearnReviewStep } from "./steps/review-step";

type SetupMode = "choosing" | "ai_quick" | "manual";

interface LearnWizardProps {
  initialData?: LearnWizardData;
  initialStep?: number;
  brandId?: string;
  skipModeSelection?: boolean;
}

export function LearnWizard({
  initialData,
  initialStep = 0,
  brandId,
  skipModeSelection = false,
}: LearnWizardProps) {
  const router = useRouter();
  const hasExistingData = initialData && Object.keys(initialData).length > 0;
  const [setupMode, setSetupMode] = useState<SetupMode>(
    skipModeSelection || hasExistingData ? "manual" : "choosing"
  );
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [data, setData] = useState<LearnWizardData>(initialData ?? {});
  const [isLoading, setIsLoading] = useState(false);

  const updateData = useCallback((updates: Partial<LearnWizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleAIQuickSetupComplete = useCallback((aiData: Record<string, unknown>) => {
    setData((prev) => ({
      ...prev,
      ...(aiData as Partial<LearnWizardData>),
    }));
    setSetupMode("manual");
    setCurrentStep(LEARN_STEPS.length - 1); // Jump to review
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

  // Mode Selection Screen
  if (setupMode === "choosing") {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-100 dark:bg-pink-900/30 mb-4">
            <BarChart3 className="w-8 h-8 text-pink-600 dark:text-pink-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Set Up Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            How would you like to configure your analytics and reporting?
          </p>
        </div>

        <div className="grid gap-4">
          <Card
            isPressable
            onPress={() => setSetupMode("ai_quick")}
            className="border-2 border-pink-200 dark:border-pink-800 hover:border-pink-400 dark:hover:border-pink-600 transition-colors"
          >
            <CardBody className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 p-3 rounded-xl bg-pink-100 dark:bg-pink-900/30">
                  <Wand2 className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    AI Quick Setup
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Tell us your primary goal and AI will set up the right metrics, reports, and optimization targets for you.
                  </p>
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-400">
                    Recommended • ~30 seconds
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card
            isPressable
            onPress={() => setSetupMode("manual")}
            className="border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
          >
            <CardBody className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 p-3 rounded-xl bg-gray-100 dark:bg-gray-800">
                  <Settings2 className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    Manual Setup
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Choose specific metrics, reporting schedules, and goals yourself.
                  </p>
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    ~3-5 minutes
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  if (setupMode === "ai_quick") {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="mb-6">
          <Button
            variant="light"
            size="sm"
            onPress={() => setSetupMode("choosing")}
            className="text-gray-500"
          >
            ← Back to setup options
          </Button>
        </div>
        <AIQuickSetup
          phase="LEARN"
          onComplete={handleAIQuickSetupComplete}
          onSkip={() => setSetupMode("manual")}
          existingData={data}
        />
      </div>
    );
  }

  return (
    <WizardLayout
      title="Learn"
      description="Set up your analytics and learning loop"
      icon={<BarChart3 className="w-6 h-6 text-pink-600 dark:text-pink-400" />}
      color="pink"
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
