"use client";

import { useState, useCallback } from "react";
import { Zap, Wand2, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardBody, Button } from "@heroui/react";
import { WizardLayout } from "@/components/flywheel/shared/wizard-layout";
import { AIQuickSetup } from "../../shared/ai-quick-setup";
import type { AutomateWizardData } from "@/lib/flywheel/types";
import {
  AutopilotIntroStep,
  ApprovalModeStep,
  ContentMixStep,
  FrequencyStep,
  NotificationsStep,
  AutomateReviewStep,
} from "./steps";

type SetupMode = "choosing" | "ai_quick" | "manual";

interface AutomateWizardProps {
  initialData?: Partial<AutomateWizardData>;
  initialStep?: number;
  brandId?: string;
  skipModeSelection?: boolean;
}

const STEPS = [
  {
    id: "intro",
    title: "Meet Your AI Autopilot",
    description: "Learn how automation can supercharge your content",
  },
  {
    id: "approval",
    title: "Approval Mode",
    description: "Choose how much control you want over content",
  },
  {
    id: "mix",
    title: "Content Mix",
    description: "Define the balance of your content types",
  },
  {
    id: "frequency",
    title: "Posting Frequency",
    description: "Set how often to post per platform",
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Configure alert preferences",
  },
  {
    id: "review",
    title: "Review & Activate",
    description: "Confirm and launch your AI autopilot",
  },
];

const DEFAULT_DATA: AutomateWizardData = {
  seenIntro: false,
  approvalMode: undefined,
  contentMix: {
    educational: 40,
    promotional: 20,
    entertaining: 20,
    engaging: 20,
  },
  postsPerWeek: 5,
  platformFrequency: {},
  notifications: {
    email: true,
    inApp: true,
    contentGenerated: true,
    postPublished: true,
    weeklyReport: true,
    performanceAlerts: true,
  },
  confirmed: false,
  activated: false,
};

export function AutomateWizard({
  initialData = {},
  initialStep = 0,
  brandId,
  skipModeSelection = false,
}: AutomateWizardProps) {
  const router = useRouter();
  const hasExistingData = initialData && Object.keys(initialData).length > 0;
  const [setupMode, setSetupMode] = useState<SetupMode>(
    skipModeSelection || hasExistingData ? "manual" : "choosing"
  );
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [data, setData] = useState<AutomateWizardData>({
    ...DEFAULT_DATA,
    ...initialData,
  });
  const [isLoading, setIsLoading] = useState(false);

  const updateData = useCallback((updates: Partial<AutomateWizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleAIQuickSetupComplete = useCallback((aiData: Record<string, unknown>) => {
    setData((prev) => ({
      ...prev,
      ...(aiData as Partial<AutomateWizardData>),
    }));
    setSetupMode("manual");
    setCurrentStep(STEPS.length - 1); // Jump to review
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await fetch("/api/flywheel/phases/automate", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "IN_PROGRESS",
          currentStep,
          data,
        }),
      });
    } catch (error) {
      console.error("Failed to save progress:", error);
    }
  }, [currentStep, data]);

  const handleComplete = useCallback(async () => {
    setIsLoading(true);
    try {
      // Save as completed with activated flywheel
      await fetch("/api/flywheel/phases/automate", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "COMPLETED",
          currentStep,
          data: { ...data, activated: true },
        }),
      });

      // Activate the flywheel
      await fetch("/api/flywheel/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      router.push("/dashboard?flywheel=activated");
    } catch (error) {
      console.error("Failed to complete wizard:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentStep, data, router]);

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return data.seenIntro === true;
      case 1:
        return data.approvalMode !== undefined;
      case 2:
        const mix = data.contentMix;
        return mix && (mix.educational + mix.promotional + mix.entertaining + mix.engaging) === 100;
      case 3:
        return (data.postsPerWeek ?? 0) >= 1;
      case 4:
        return data.notifications !== undefined;
      case 5:
        return data.confirmed === true;
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <AutopilotIntroStep data={data} updateData={updateData} />;
      case 1:
        return <ApprovalModeStep data={data} updateData={updateData} />;
      case 2:
        return <ContentMixStep data={data} updateData={updateData} />;
      case 3:
        return <FrequencyStep data={data} updateData={updateData} />;
      case 4:
        return <NotificationsStep data={data} updateData={updateData} />;
      case 5:
        return <AutomateReviewStep data={data} updateData={updateData} />;
      default:
        return null;
    }
  };

  // Mode Selection Screen
  if (setupMode === "choosing") {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 mb-4">
            <Zap className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Set Up Automation
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            How would you like to configure your AI autopilot?
          </p>
        </div>

        <div className="grid gap-4">
          <Card
            isPressable
            onPress={() => setSetupMode("ai_quick")}
            className="border-2 border-orange-200 dark:border-orange-800 hover:border-orange-400 dark:hover:border-orange-600 transition-colors"
          >
            <CardBody className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 p-3 rounded-xl bg-orange-100 dark:bg-orange-900/30">
                  <Wand2 className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    AI Quick Setup
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Choose your automation level and AI will configure content mix, posting frequency, and notifications for you.
                  </p>
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400">
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
                    Configure approval mode, content mix, posting frequency, and notifications yourself.
                  </p>
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    ~5 minutes
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
          phase="AUTOMATE"
          onComplete={handleAIQuickSetupComplete}
          onSkip={() => setSetupMode("manual")}
          existingData={data}
        />
      </div>
    );
  }

  return (
    <WizardLayout
      title="Automate"
      description="Configure your AI autopilot to manage content automatically"
      icon={<Zap className="w-6 h-6 text-orange-600 dark:text-orange-400" />}
      color="orange"
      steps={STEPS}
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
