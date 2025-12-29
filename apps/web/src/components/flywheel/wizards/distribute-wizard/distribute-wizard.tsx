"use client";

import { useState, useCallback } from "react";
import { Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { WizardLayout } from "../../shared/wizard-layout";
import { DISTRIBUTE_STEPS } from "@/lib/flywheel/constants";
import type { DistributeWizardData } from "@/lib/flywheel/types";

// Step Components
import { ConnectAccountsStep } from "./steps/connect-accounts-step";
import { PlatformSettingsStep } from "./steps/platform-settings-step";
import { ScheduleStep } from "./steps/schedule-step";
import { TimezoneStep } from "./steps/timezone-step";
import { FirstPostStep } from "./steps/first-post-step";
import { DistributeReviewStep } from "./steps/review-step";

interface DistributeWizardProps {
  initialData?: DistributeWizardData;
  initialStep?: number;
  brandId?: string;
}

export function DistributeWizard({
  initialData,
  initialStep = 0,
  brandId,
}: DistributeWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [data, setData] = useState<DistributeWizardData>(initialData ?? {});
  const [isLoading, setIsLoading] = useState(false);

  const updateData = useCallback((updates: Partial<DistributeWizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
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
