"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { WizardLayout } from "@/components/flywheel/shared/wizard-layout";
import type { AutomateWizardData } from "@/lib/flywheel/types";
import {
  AutopilotIntroStep,
  ApprovalModeStep,
  ContentMixStep,
  FrequencyStep,
  NotificationsStep,
  AutomateReviewStep,
} from "./steps";

interface AutomateWizardProps {
  initialData?: Partial<AutomateWizardData>;
  initialStep?: number;
  brandId?: string;
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
}: AutomateWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [data, setData] = useState<AutomateWizardData>({
    ...DEFAULT_DATA,
    ...initialData,
  });
  const [isSaving, setIsSaving] = useState(false);

  const updateData = useCallback((updates: Partial<AutomateWizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const saveProgress = async (status: string = "IN_PROGRESS") => {
    setIsSaving(true);
    try {
      await fetch("/api/flywheel/phases/automate", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          currentStep,
          data,
        }),
      });
    } catch (error) {
      console.error("Failed to save progress:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = async () => {
    await saveProgress();
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsSaving(true);
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
      setIsSaving(false);
    }
  };

  const handleClose = async () => {
    await saveProgress();
    router.push("/setup");
  };

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

  return (
    <WizardLayout
      phase="AUTOMATE"
      phaseName="Automate"
      phaseIcon={<Zap className="w-6 h-6" />}
      phaseColor="orange"
      steps={STEPS}
      currentStep={currentStep}
      onNext={currentStep === STEPS.length - 1 ? handleComplete : handleNext}
      onBack={handleBack}
      onClose={handleClose}
      canProceed={canProceed()}
      isSaving={isSaving}
      isLastStep={currentStep === STEPS.length - 1}
      completionText="Activate Flywheel"
    >
      {renderStep()}
    </WizardLayout>
  );
}
