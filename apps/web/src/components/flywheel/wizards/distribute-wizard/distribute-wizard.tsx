"use client";

import { useState, useCallback } from "react";
import { Share2, Wand2, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardBody, Button } from "@heroui/react";
import { WizardLayout } from "../../shared/wizard-layout";
import { AIQuickSetup } from "../../shared/ai-quick-setup";
import { DISTRIBUTE_STEPS } from "@/lib/flywheel/constants";
import type { DistributeWizardData } from "@/lib/flywheel/types";

// Step Components
import { ConnectAccountsStep } from "./steps/connect-accounts-step";
import { PlatformSettingsStep } from "./steps/platform-settings-step";
import { ScheduleStep } from "./steps/schedule-step";
import { TimezoneStep } from "./steps/timezone-step";
import { FirstPostStep } from "./steps/first-post-step";
import { DistributeReviewStep } from "./steps/review-step";

type SetupMode = "choosing" | "ai_quick" | "manual";

interface DistributeWizardProps {
  initialData?: DistributeWizardData;
  initialStep?: number;
  brandId?: string;
  skipModeSelection?: boolean;
}

export function DistributeWizard({
  initialData,
  initialStep = 0,
  brandId,
  skipModeSelection = false,
}: DistributeWizardProps) {
  const router = useRouter();
  const hasExistingData = initialData && Object.keys(initialData).length > 0;
  const [setupMode, setSetupMode] = useState<SetupMode>(
    skipModeSelection || hasExistingData ? "manual" : "choosing"
  );
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [data, setData] = useState<DistributeWizardData>(initialData ?? {});
  const [isLoading, setIsLoading] = useState(false);

  const updateData = useCallback((updates: Partial<DistributeWizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleAIQuickSetupComplete = useCallback((aiData: Record<string, unknown>) => {
    setData((prev) => ({
      ...prev,
      ...(aiData as Partial<DistributeWizardData>),
    }));
    setSetupMode("manual");
    setCurrentStep(DISTRIBUTE_STEPS.length - 1); // Jump to review
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await fetch("/api/flywheel/phases/distribute", {
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
      // Save publishing settings
      await fetch("/api/social/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          ...data,
        }),
      });

      // Mark phase as complete
      await fetch("/api/flywheel/phases/distribute", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "COMPLETED",
          currentStep: DISTRIBUTE_STEPS.length - 1,
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
      case 0: // Connect Accounts
        return (data.connectedAccounts?.filter((a) => a.connected).length ?? 0) >= 1;
      case 1: // Platform Settings
        return true; // Optional settings
      case 2: // Schedule Setup
        return data.schedule !== undefined;
      case 3: // Timezone
        return data.timezone !== undefined;
      case 4: // First Post
        return true; // Optional
      case 5: // Review
        return data.confirmed === true;
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <ConnectAccountsStep data={data} updateData={updateData} />;
      case 1:
        return <PlatformSettingsStep data={data} updateData={updateData} />;
      case 2:
        return <ScheduleStep data={data} updateData={updateData} />;
      case 3:
        return <TimezoneStep data={data} updateData={updateData} />;
      case 4:
        return <FirstPostStep data={data} updateData={updateData} brandId={brandId} />;
      case 5:
        return <DistributeReviewStep data={data} updateData={updateData} />;
      default:
        return null;
    }
  };

  // Mode Selection Screen
  if (setupMode === "choosing") {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
            <Share2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Set Up Distribution
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            How would you like to configure your posting schedule?
          </p>
        </div>

        <div className="grid gap-4">
          <Card
            isPressable
            onPress={() => setSetupMode("ai_quick")}
            className="border-2 border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-600 transition-colors"
          >
            <CardBody className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 p-3 rounded-xl bg-green-100 dark:bg-green-900/30">
                  <Wand2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    AI Quick Setup
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Choose your posting goal and let AI create an optimal schedule based on your audience. You can fine-tune later.
                  </p>
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400">
                    Recommended • ~1 minute
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
                    Configure each platform, time slot, and setting manually. Best for specific scheduling needs.
                  </p>
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    ~5-10 minutes
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
          phase="DISTRIBUTE"
          onComplete={handleAIQuickSetupComplete}
          onSkip={() => setSetupMode("manual")}
          existingData={data}
        />
      </div>
    );
  }

  return (
    <WizardLayout
      title="Distribute"
      description="Connect your publishing engine - social accounts and schedules"
      icon={<Share2 className="w-6 h-6 text-green-600 dark:text-green-400" />}
      color="green"
      steps={DISTRIBUTE_STEPS}
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
