"use client";

/**
 * Brand Setup Wizard
 *
 * A wizard-driven brand creation flow that auto-populates settings from:
 * - Industry templates
 * - Website scraping
 * - Connected social accounts
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Wizard,
  WizardStepContainer,
  WizardStepHeader,
  WizardStepContent,
  useWizard,
  type WizardStep,
} from "@/components/ui/wizard";
import { TemplateStep } from "./steps/template-step";
import { WebsiteStep } from "./steps/website-step";
import { SocialStep } from "./steps/social-step";
import { ReviewStep } from "./steps/review-step";
import { CompleteStep } from "./steps/complete-step";
import { type BrandTemplate } from "@/lib/brand-brain/templates";
import {
  LayoutTemplate,
  Globe,
  Share2,
  CheckCircle,
  PartyPopper,
} from "lucide-react";

export interface WebsiteData {
  companyName: string | null;
  description: string | null;
  logo: string | null;
  favicon: string | null;
  socialLinks: {
    twitter?: string;
    linkedin?: string;
    facebook?: string;
    instagram?: string;
  };
  colors: string[];
  keywords: string[];
  suggestedTemplate: string | null;
  suggestedTemplateReason: string | null;
}

export interface SocialProfile {
  platform: string;
  username: string | null;
  displayName: string | null;
  avatar: string | null;
  profileUrl: string | null;
}

export interface SocialData {
  profiles: SocialProfile[];
  suggestedLogo: string | null;
  suggestedName: string | null;
}

export interface BrandWizardData {
  // From template step
  selectedTemplate: BrandTemplate | null;
  // From website step
  websiteUrl: string;
  websiteData: WebsiteData | null;
  // From social step
  socialData: SocialData | null;
  // Final brand settings (can be edited in review step)
  brandName: string;
  brandDescription: string;
  brandLogo: string | null;
  brandWebsite: string;
  // Merged from template
  voiceTone: string;
  writingStyle: string;
  emojiStyle: "none" | "minimal" | "moderate" | "heavy";
  ctaStyle: "none" | "soft" | "direct" | "urgent";
  contentPillars: string[];
  targetAudience: {
    demographics: string[];
    interests: string[];
    painPoints: string[];
  };
  suggestedHashtags: string[];
  sampleValues: string[];
}

const WIZARD_STEPS: WizardStep[] = [
  {
    id: "template",
    title: "Choose Template",
    description: "Select your industry",
    icon: <LayoutTemplate className="w-4 h-4" />,
  },
  {
    id: "website",
    title: "Import Website",
    description: "Auto-fill from URL",
    icon: <Globe className="w-4 h-4" />,
    isOptional: true,
  },
  {
    id: "social",
    title: "Social Profiles",
    description: "Connect accounts",
    icon: <Share2 className="w-4 h-4" />,
    isOptional: true,
  },
  {
    id: "review",
    title: "Review & Edit",
    description: "Customize settings",
    icon: <CheckCircle className="w-4 h-4" />,
  },
  {
    id: "complete",
    title: "Complete",
    description: "You're all set!",
    icon: <PartyPopper className="w-4 h-4" />,
  },
];

const DEFAULT_WIZARD_DATA: BrandWizardData = {
  selectedTemplate: null,
  websiteUrl: "",
  websiteData: null,
  socialData: null,
  brandName: "",
  brandDescription: "",
  brandLogo: null,
  brandWebsite: "",
  voiceTone: "professional",
  writingStyle: "balanced",
  emojiStyle: "minimal",
  ctaStyle: "soft",
  contentPillars: [],
  targetAudience: {
    demographics: [],
    interests: [],
    painPoints: [],
  },
  suggestedHashtags: [],
  sampleValues: [],
};

interface BrandSetupWizardProps {
  organizationId: string;
  onComplete?: (brandId: string) => void;
  onCancel?: () => void;
}

export function BrandSetupWizard({
  organizationId,
  onComplete,
  onCancel,
}: BrandSetupWizardProps) {
  const router = useRouter();
  const [createdBrandId, setCreatedBrandId] = useState<string | null>(null);

  const handleComplete = useCallback(async (data: Record<string, unknown>) => {
    const wizardData = data as unknown as BrandWizardData;

    try {
      // Format data for the existing brand API
      const templateData = wizardData.selectedTemplate ? {
        name: wizardData.selectedTemplate.name,
        voiceTone: wizardData.voiceTone,
        writingStyle: wizardData.writingStyle,
        emojiStyle: wizardData.emojiStyle,
        ctaStyle: wizardData.ctaStyle,
        contentPillars: wizardData.contentPillars,
        targetAudience: wizardData.targetAudience,
        suggestedHashtags: wizardData.suggestedHashtags,
        sampleValues: wizardData.sampleValues,
      } : null;

      // Create the brand via API
      const response = await fetch("/api/onboarding/brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          name: wizardData.brandName,
          website: wizardData.brandWebsite || undefined,
          industry: wizardData.selectedTemplate?.name,
          templateId: wizardData.selectedTemplate?.id || "custom",
          templateData,
          logo: wizardData.brandLogo || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create brand");
      }

      setCreatedBrandId(result.id);
      onComplete?.(result.id);
    } catch (error) {
      console.error("Failed to create brand:", error);
      throw error;
    }
  }, [organizationId, onComplete]);

  const handleGoToDashboard = useCallback(() => {
    if (createdBrandId) {
      router.push(`/dashboard/brand?id=${createdBrandId}`);
    } else {
      router.push("/dashboard");
    }
  }, [createdBrandId, router]);

  return (
    <div className="min-h-[70vh] flex items-start justify-center p-4 pt-8">
      <Wizard
        steps={WIZARD_STEPS}
        initialData={DEFAULT_WIZARD_DATA as unknown as Record<string, unknown>}
        onComplete={handleComplete}
        variant="full"
        showProgress
        className="w-full"
      >
        <BrandWizardSteps
          organizationId={organizationId}
          onCancel={onCancel}
          onGoToDashboard={handleGoToDashboard}
          createdBrandId={createdBrandId}
        />
      </Wizard>
    </div>
  );
}

interface BrandWizardStepsProps {
  organizationId: string;
  onCancel?: () => void;
  onGoToDashboard: () => void;
  createdBrandId: string | null;
}

function BrandWizardSteps({
  organizationId,
  onCancel,
  onGoToDashboard,
  createdBrandId,
}: BrandWizardStepsProps) {
  return (
    <>
      <TemplateStep stepIndex={0} />
      <WebsiteStep stepIndex={1} />
      <SocialStep stepIndex={2} organizationId={organizationId} />
      <ReviewStep stepIndex={3} onCancel={onCancel} />
      <CompleteStep
        stepIndex={4}
        onGoToDashboard={onGoToDashboard}
        brandId={createdBrandId}
      />
    </>
  );
}

export { WIZARD_STEPS, DEFAULT_WIZARD_DATA };
