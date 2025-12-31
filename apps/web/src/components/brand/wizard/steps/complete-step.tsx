"use client";

/**
 * Complete Step - Success screen after brand creation
 *
 * Shows success message and next steps for the user.
 */

import { Card, CardBody, Button, Avatar } from "@heroui/react";
import {
  WizardStepContainer,
  WizardStepHeader,
  WizardStepContent,
  useWizard,
} from "@/components/ui/wizard";
import {
  PartyPopper,
  Building2,
  ArrowRight,
  Pencil,
  PlusCircle,
  Share2,
  Sparkles,
} from "lucide-react";
import type { BrandWizardData } from "../brand-setup-wizard";

interface CompleteStepProps {
  stepIndex: number;
  onGoToDashboard: () => void;
  brandId: string | null;
}

export function CompleteStep({
  stepIndex,
  onGoToDashboard,
  brandId,
}: CompleteStepProps) {
  const { data } = useWizard();
  const wizardData = data as unknown as BrandWizardData;

  return (
    <WizardStepContainer
      stepIndex={stepIndex}
      showNavigation={false}
    >
      <WizardStepContent>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          {/* Success Animation */}
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-success/20 rounded-full blur-xl animate-pulse" />
            <div className="relative bg-success-50 dark:bg-success-900/30 rounded-full p-6">
              <PartyPopper className="w-12 h-12 text-success" />
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-2">Your Brand is Ready!</h2>
          <p className="text-default-500 max-w-md mb-8">
            We've created your brand profile with all the settings you configured.
            Start creating content that matches your brand voice!
          </p>

          {/* Brand Preview Card */}
          <Card className="w-full max-w-md mb-8">
            <CardBody className="p-4">
              <div className="flex items-center gap-4">
                <Avatar
                  src={wizardData.brandLogo || undefined}
                  className="w-16 h-16 flex-shrink-0"
                  radius="lg"
                  showFallback
                  fallback={<Building2 className="w-8 h-8 text-default-400" />}
                />
                <div className="text-left flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">
                    {wizardData.brandName || "Your Brand"}
                  </h3>
                  {wizardData.brandDescription && (
                    <p className="text-sm text-default-500 line-clamp-2">
                      {wizardData.brandDescription}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    {wizardData.selectedTemplate && (
                      <span className="text-xs bg-secondary-100 dark:bg-secondary-900/30 px-2 py-0.5 rounded-full">
                        {wizardData.selectedTemplate.icon} {wizardData.selectedTemplate.name}
                      </span>
                    )}
                    <span className="text-xs text-default-400">
                      {wizardData.voiceTone} • {wizardData.writingStyle}
                    </span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Next Steps */}
          <div className="w-full max-w-lg space-y-3 mb-8">
            <h4 className="text-sm font-medium text-default-600 mb-3">
              What's Next?
            </h4>

            <NextStepCard
              icon={<Sparkles className="w-5 h-5 text-primary" />}
              title="Generate Content"
              description="Create your first AI-powered content with your brand voice"
            />

            <NextStepCard
              icon={<Share2 className="w-5 h-5 text-secondary" />}
              title="Connect Social Accounts"
              description="Link your social media accounts for direct publishing"
            />

            <NextStepCard
              icon={<Pencil className="w-5 h-5 text-warning" />}
              title="Fine-tune Brand Brain"
              description="Add more details to improve content generation"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
            <Button
              color="primary"
              size="lg"
              className="flex-1"
              onPress={onGoToDashboard}
              endContent={<ArrowRight className="w-4 h-4" />}
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </WizardStepContent>
    </WizardStepContainer>
  );
}

interface NextStepCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function NextStepCard({ icon, title, description }: NextStepCardProps) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-default-50 hover:bg-default-100 transition-colors text-left">
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-default-500">{description}</p>
      </div>
    </div>
  );
}
