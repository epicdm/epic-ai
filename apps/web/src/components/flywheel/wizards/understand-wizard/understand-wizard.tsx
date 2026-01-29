"use client";

import { useState, useCallback } from "react";
import { Brain, Wand2, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardBody, Button } from "@heroui/react";
import { WizardLayout } from "../../shared/wizard-layout";
import { AIQuickSetup } from "../../shared/ai-quick-setup";
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

type SetupMode = "choosing" | "ai_quick" | "manual";

interface UnderstandWizardProps {
  initialData?: UnderstandWizardData;
  initialStep?: number;
  brandId?: string;
  skipModeSelection?: boolean;
}

export function UnderstandWizard({
  initialData,
  initialStep = 0,
  brandId,
  skipModeSelection = false,
}: UnderstandWizardProps) {
  const router = useRouter();
  // If there's existing data, skip mode selection and go to manual
  const hasExistingData = initialData && Object.keys(initialData).length > 0;
  const [setupMode, setSetupMode] = useState<SetupMode>(
    skipModeSelection || hasExistingData ? "manual" : "choosing"
  );
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [data, setData] = useState<UnderstandWizardData>(initialData ?? {});
  const [isLoading, setIsLoading] = useState(false);

  const updateData = useCallback((updates: Partial<UnderstandWizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleAIQuickSetupComplete = useCallback((aiData: Record<string, unknown>) => {
    // Merge AI-generated data with existing data
    setData((prev) => ({
      ...prev,
      ...(aiData as Partial<UnderstandWizardData>),
    }));
    // Switch to manual mode and jump to review step
    setSetupMode("manual");
    setCurrentStep(UNDERSTAND_STEPS.length - 1); // Jump to review
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
      case 1: // Social Profiles
        return true; // Optional - can skip and connect later
      case 2: // Website
        return true; // Optional
      case 3: // Identity
        return !!data.brandName;
      case 4: // Voice
        return data.formality !== undefined;
      case 5: // Audiences
        return (data.audiences?.length ?? 0) >= 1;
      case 6: // Pillars
        return (data.contentPillars?.length ?? 0) >= 1;
      case 7: // Competitors
        return true; // Optional
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
        return <SocialProfilesStep data={data} updateData={updateData} />;
      case 2:
        return <WebsiteStep data={data} updateData={updateData} />;
      case 3:
        return <IdentityStep data={data} updateData={updateData} />;
      case 4:
        return <VoiceStep data={data} updateData={updateData} />;
      case 5:
        return <AudiencesStep data={data} updateData={updateData} />;
      case 6:
        return <PillarsStep data={data} updateData={updateData} />;
      case 7:
        return <CompetitorsStep data={data} updateData={updateData} />;
      case 8:
        return <ReviewStep data={data} updateData={updateData} />;
      default:
        return null;
    }
  };

  // Mode Selection Screen
  if (setupMode === "choosing") {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 mb-4">
            <Brain className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Build Your Brand Brain
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            How would you like to set up your brand profile?
          </p>
        </div>

        <div className="grid gap-4">
          {/* AI Quick Setup Option */}
          <Card
            isPressable
            onPress={() => setSetupMode("ai_quick")}
            className="border-2 border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 transition-colors"
          >
            <CardBody className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30">
                  <Wand2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    AI Quick Setup
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Just enter your website URL and let AI analyze your brand, generate audiences, content pillars, and more. You can edit everything later.
                  </p>
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400">
                    Recommended • ~2 minutes
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Manual Setup Option */}
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
                    Go through each step manually and configure every detail yourself. Best if you have specific requirements.
                  </p>
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    ~10-15 minutes
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  // AI Quick Setup Screen
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
          phase="UNDERSTAND"
          onComplete={handleAIQuickSetupComplete}
          onSkip={() => setSetupMode("manual")}
          existingData={data}
        />
      </div>
    );
  }

  // Manual Wizard Mode
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
