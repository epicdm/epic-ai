"use client";

import { useState, useCallback } from "react";
import { Brain } from "lucide-react";
import { useRouter } from "next/navigation";
import { WizardLayout } from "../../shared/wizard-layout";
import { UNDERSTAND_STEPS } from "@/lib/flywheel/constants";
import type { UnderstandWizardData } from "@/lib/flywheel/types";

// Step Components
import { IndustryStep } from "./steps/industry-step";
import { WebsiteStep } from "./steps/website-step";
import { IdentityStep } from "./steps/identity-step";
import { VoiceStep } from "./steps/voice-step";
import { AudiencesStep } from "./steps/audiences-step";
import { PillarsStep } from "./steps/pillars-step";
import { CompetitorsStep } from "./steps/competitors-step";
import { SocialProfilesStep } from "./steps/social-profiles-step";
import { ReviewStep } from "./steps/review-step";

interface UnderstandWizardProps {
  initialData?: UnderstandWizardData;
  initialStep?: number;
  brandId?: string;
}

export function UnderstandWizard({
  initialData,
  initialStep = 0,
  brandId,
}: UnderstandWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [data, setData] = useState<UnderstandWizardData>(initialData ?? {});
  const [isLoading, setIsLoading] = useState(false);

  const updateData = useCallback((updates: Partial<UnderstandWizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await fetch("/api/flywheel/phases/understand", {
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
      // Save the Brand Brain data
      await fetch("/api/brand-brain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          ...data,
        }),
      });

      // Mark phase as complete
      await fetch("/api/flywheel/phases/understand", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "COMPLETED",
          currentStep: UNDERSTAND_STEPS.length - 1,
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
      case 0: // Industry
        return !!data.industry;
      case 1: // Website
        return true; // Optional
      case 2: // Identity
        return !!data.brandName;
      case 3: // Voice
        return data.formality !== undefined;
      case 4: // Audiences
        return (data.audiences?.length ?? 0) >= 1;
      case 5: // Pillars
        return (data.contentPillars?.length ?? 0) >= 1;
      case 6: // Competitors
        return true; // Optional
      case 7: // Social Profiles
        return true; // Optional - can skip and connect later
      case 8: // Review
        return data.confirmed === true;
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <IndustryStep data={data} updateData={updateData} />;
      case 1:
        return <WebsiteStep data={data} updateData={updateData} />;
      case 2:
        return <IdentityStep data={data} updateData={updateData} />;
      case 3:
        return <VoiceStep data={data} updateData={updateData} />;
      case 4:
        return <AudiencesStep data={data} updateData={updateData} />;
      case 5:
        return <PillarsStep data={data} updateData={updateData} />;
      case 6:
        return <CompetitorsStep data={data} updateData={updateData} />;
      case 7:
        return <SocialProfilesStep data={data} updateData={updateData} />;
      case 8:
        return <ReviewStep data={data} updateData={updateData} />;
      default:
        return null;
    }
  };

  return (
    <WizardLayout
      title="Understand"
      description="Build your Brand Brain - voice, tone, audiences, and content pillars"
      icon={<Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />}
      color="purple"
      steps={UNDERSTAND_STEPS}
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
