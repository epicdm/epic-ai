"use client";

import { useState, useCallback } from "react";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { WizardLayout } from "../../shared/wizard-layout";
import { CREATE_STEPS } from "@/lib/flywheel/constants";
import type { CreateWizardData } from "@/lib/flywheel/types";

// Step Components
import { TemplatesStep } from "./steps/templates-step";
import { FirstContentStep } from "./steps/first-content-step";
import { ContentTypesStep } from "./steps/content-types-step";
import { MediaSettingsStep } from "./steps/media-settings-step";
import { HashtagStep } from "./steps/hashtag-step";
import { CreateReviewStep } from "./steps/review-step";

interface CreateWizardProps {
  initialData?: CreateWizardData;
  initialStep?: number;
  brandId?: string;
}

export function CreateWizard({
  initialData,
  initialStep = 0,
  brandId,
}: CreateWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [data, setData] = useState<CreateWizardData>(initialData ?? {});
  const [isLoading, setIsLoading] = useState(false);

  const updateData = useCallback((updates: Partial<CreateWizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await fetch("/api/flywheel/phases/create", {
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
      // Save content factory settings
      await fetch("/api/content/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          ...data,
        }),
      });

      // Mark phase as complete
      await fetch("/api/flywheel/phases/create", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "COMPLETED",
          currentStep: CREATE_STEPS.length - 1,
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
      case 0: // Templates
        return (data.templates?.length ?? 0) >= 1;
      case 1: // First Content
        return (data.generatedContent?.length ?? 0) >= 1;
      case 2: // Content Types
        return (data.enabledTypes?.length ?? 0) >= 1;
      case 3: // Media Settings
        return true; // Optional
      case 4: // Hashtags
        return data.hashtagStrategy !== undefined;
      case 5: // Review
        return data.confirmed === true;
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <TemplatesStep data={data} updateData={updateData} />;
      case 1:
        return <FirstContentStep data={data} updateData={updateData} brandId={brandId} />;
      case 2:
        return <ContentTypesStep data={data} updateData={updateData} />;
      case 3:
        return <MediaSettingsStep data={data} updateData={updateData} />;
      case 4:
        return <HashtagStep data={data} updateData={updateData} brandId={brandId} />;
      case 5:
        return <CreateReviewStep data={data} updateData={updateData} />;
      default:
        return null;
    }
  };

  return (
    <WizardLayout
      title="Create"
      description="Set up your Content Factory - templates, media, and AI settings"
      icon={<Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
      color="blue"
      steps={CREATE_STEPS}
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
