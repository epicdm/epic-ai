"use client";

/**
 * Unified Onboarding Wizard
 *
 * Single entry point for all new users with path selection:
 * - AI Express: Quick setup via website analysis (~5 min)
 * - Guided: Streamlined manual setup (~15 min)
 * - Expert: Full control via setup hub (~30+ min)
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Input,
  Card,
  CardBody,
  ScrollShadow,
  Chip,
} from "@heroui/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Wizard,
  WizardStepContainer,
  WizardStepHeader,
  WizardStepContent,
  useWizard,
  type WizardStep,
} from "@/components/ui/wizard";
import {
  SparklesIcon,
  MicIcon,
  MailIcon,
  CompassIcon,
  BuildingIcon,
  CheckCircleIcon,
  RocketIcon,
  ZapIcon,
  BookOpenIcon,
  WrenchIcon,
  ClockIcon,
  ArrowRightIcon,
  FacebookIcon,
  InstagramIcon,
  LinkIcon,
} from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { brandTemplates, type BrandTemplate } from "@/lib/brand-brain/templates";

// Types
type UserGoal = "content" | "voice" | "campaigns" | "explore";
type SetupPath = "ai_express" | "guided" | "expert";

interface UnifiedOnboardingWizardProps {
  userName: string;
  userEmail: string;
}

interface GoalOption {
  id: UserGoal;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface PathOption {
  id: SetupPath;
  title: string;
  description: string;
  time: string;
  icon: React.ReactNode;
  recommended?: boolean;
  features: string[];
}

// Constants
const goalOptions: GoalOption[] = [
  {
    id: "content",
    title: "Create AI Content",
    description: "Generate social posts, blogs, and marketing copy",
    icon: <SparklesIcon className="w-6 h-6" />,
  },
  {
    id: "voice",
    title: "Build Voice Agents",
    description: "Create AI phone agents for sales and support",
    icon: <MicIcon className="w-6 h-6" />,
  },
  {
    id: "campaigns",
    title: "Run Outreach Campaigns",
    description: "Automate lead generation and follow-ups",
    icon: <MailIcon className="w-6 h-6" />,
  },
  {
    id: "explore",
    title: "Just Exploring",
    description: "Look around and see what Epic AI can do",
    icon: <CompassIcon className="w-6 h-6" />,
  },
];

const pathOptions: PathOption[] = [
  {
    id: "ai_express",
    title: "AI Express Setup",
    description: "Let AI configure everything from your website",
    time: "~5 minutes",
    icon: <ZapIcon className="w-6 h-6" />,
    recommended: true,
    features: [
      "Automatic brand voice detection",
      "Content pillars generated",
      "Optimal posting schedule",
      "AI configures all 5 phases",
    ],
  },
  {
    id: "guided",
    title: "Guided Setup",
    description: "Step-by-step setup with smart defaults",
    time: "~15 minutes",
    icon: <BookOpenIcon className="w-6 h-6" />,
    features: [
      "Industry templates",
      "Customize each setting",
      "Preview before applying",
      "12 essential steps",
    ],
  },
  {
    id: "expert",
    title: "Expert Mode",
    description: "Full control over every setting",
    time: "30+ minutes",
    icon: <WrenchIcon className="w-6 h-6" />,
    features: [
      "All 32 configuration steps",
      "Advanced customization",
      "Complete flexibility",
      "For power users",
    ],
  },
];

// Validation schemas
const businessInfoSchema = z.object({
  organizationName: z.string().min(2, "Organization name must be at least 2 characters"),
  brandName: z.string().min(2, "Brand name must be at least 2 characters"),
  website: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
});

type BusinessInfoFormData = z.infer<typeof businessInfoSchema>;

// Wizard steps
const wizardSteps: WizardStep[] = [
  { id: "welcome", title: "Welcome", description: "What brings you here?" },
  { id: "business", title: "Business", description: "Your workspace info" },
  { id: "path", title: "Setup Path", description: "Choose your journey" },
  { id: "ready", title: "Ready", description: "Let's go!" },
];

export function UnifiedOnboardingWizard({ userName, userEmail }: UnifiedOnboardingWizardProps) {
  const router = useRouter();
  const [selectedGoal, setSelectedGoal] = useState<UserGoal | null>(null);
  const [selectedPath, setSelectedPath] = useState<SetupPath | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<BrandTemplate | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [brandId, setBrandId] = useState<string | null>(null);

  const handleComplete = useCallback(
    async (data: Record<string, unknown>) => {
      try {
        // Mark onboarding as complete with path selection
        await fetch("/api/onboarding/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goal: selectedGoal,
            setupPath: selectedPath,
          }),
        });

        // Track onboarding completion
        trackEvent("onboarding_completed", {
          goal: selectedGoal || "none",
          setup_path: selectedPath || "none",
          template: selectedTemplate?.id || "none",
        });

        // Navigate based on selected path
        if (selectedPath === "ai_express") {
          // Go to Bird's Eye AI wizard
          router.push("/setup/ai");
        } else if (selectedPath === "guided") {
          // Go to streamlined wizard
          router.push("/setup?mode=guided");
        } else {
          // Expert mode - go to full setup hub
          router.push("/setup");
        }

        router.refresh();
      } catch (error) {
        console.error("Failed to complete onboarding:", error);
        router.push("/setup");
      }
    },
    [router, selectedGoal, selectedPath, selectedTemplate]
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Wizard
        steps={wizardSteps}
        onComplete={handleComplete}
        showStepIndicator
        className="w-full max-w-xl"
      >
        {/* Step 1: Welcome & Goal Selection */}
        <WelcomeStep
          userName={userName}
          selectedGoal={selectedGoal}
          onGoalSelect={setSelectedGoal}
        />

        {/* Step 2: Business Info */}
        <BusinessInfoStep
          selectedTemplate={selectedTemplate}
          onTemplateSelect={setSelectedTemplate}
          onSetupComplete={(orgId, brandId) => {
            setOrganizationId(orgId);
            setBrandId(brandId);
          }}
        />

        {/* Step 3: Path Selection */}
        <PathSelectionStep
          selectedPath={selectedPath}
          onPathSelect={setSelectedPath}
        />

        {/* Step 4: Ready */}
        <ReadyStep
          selectedPath={selectedPath}
          selectedGoal={selectedGoal}
        />
      </Wizard>
    </div>
  );
}

// Step 1: Welcome
interface WelcomeStepProps {
  userName: string;
  selectedGoal: UserGoal | null;
  onGoalSelect: (goal: UserGoal) => void;
}

function WelcomeStep({ userName, selectedGoal, onGoalSelect }: WelcomeStepProps) {
  const { setData } = useWizard();

  const handleGoalSelect = (goal: UserGoal) => {
    onGoalSelect(goal);
    setData("goal", goal);
  };

  return (
    <WizardStepContainer stepIndex={0} disableNext={!selectedGoal}>
      <WizardStepHeader
        icon={<span className="text-3xl">👋</span>}
        title={`Welcome, ${userName}!`}
        description="What would you like to accomplish with Epic AI?"
      />

      <WizardStepContent>
        <div className="grid gap-3">
          {goalOptions.map((option) => (
            <Card
              key={option.id}
              isPressable
              isHoverable
              className={`transition-all ${
                selectedGoal === option.id
                  ? "border-2 border-primary bg-primary/5"
                  : "border-2 border-transparent"
              }`}
              onPress={() => handleGoalSelect(option.id)}
            >
              <CardBody className="flex flex-row items-center gap-4 p-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    selectedGoal === option.id
                      ? "bg-primary text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {option.icon}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white">{option.title}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{option.description}</p>
                </div>
                {selectedGoal === option.id && (
                  <CheckCircleIcon className="w-6 h-6 text-primary" />
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      </WizardStepContent>
    </WizardStepContainer>
  );
}

// Step 2: Business Info
interface BusinessInfoStepProps {
  selectedTemplate: BrandTemplate | null;
  onTemplateSelect: (template: BrandTemplate) => void;
  onSetupComplete: (orgId: string, brandId: string) => void;
}

function BusinessInfoStep({ selectedTemplate, onTemplateSelect, onSetupComplete }: BusinessInfoStepProps) {
  const { setData, setError, setLoading } = useWizard();
  const [showForm, setShowForm] = useState(false);

  const form = useForm<BusinessInfoFormData>({
    resolver: zodResolver(businessInfoSchema),
    defaultValues: {
      organizationName: "",
      brandName: "",
      website: "",
    },
  });

  const handleTemplateSelect = (template: BrandTemplate) => {
    onTemplateSelect(template);
    setShowForm(true);
  };

  const handleSubmit = async (): Promise<boolean> => {
    const isValid = await form.trigger();
    if (!isValid) return false;

    const data = form.getValues();
    setLoading(true);

    try {
      // Create organization
      const orgResponse = await fetch("/api/onboarding/organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.organizationName }),
      });

      if (!orgResponse.ok) {
        const error = await orgResponse.json();
        throw new Error(error.error || "Failed to create organization");
      }

      const org = await orgResponse.json();

      // Create brand with template data
      const brandResponse = await fetch("/api/onboarding/brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.brandName,
          website: data.website || undefined,
          industry: selectedTemplate?.name,
          organizationId: org.id,
          templateId: selectedTemplate?.id,
          templateData: selectedTemplate?.id !== "custom" ? {
            voiceTone: selectedTemplate?.voiceTone,
            writingStyle: selectedTemplate?.writingStyle,
            emojiStyle: selectedTemplate?.emojiStyle,
            ctaStyle: selectedTemplate?.ctaStyle,
            contentPillars: selectedTemplate?.contentPillars,
            targetAudience: selectedTemplate?.targetAudience,
            suggestedHashtags: selectedTemplate?.suggestedHashtags,
            sampleValues: selectedTemplate?.sampleValues,
          } : undefined,
        }),
      });

      if (!brandResponse.ok) {
        const error = await brandResponse.json();
        throw new Error(error.error || "Failed to create brand");
      }

      const brand = await brandResponse.json();

      // Track template usage
      trackEvent("onboarding_business_created", {
        template_id: selectedTemplate?.id || "none",
        has_website: !!data.website,
      });

      setData("organizationId", org.id);
      setData("brandId", brand.id);
      setData("websiteUrl", data.website);
      onSetupComplete(org.id, brand.id);

      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to create workspace");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Template selection view
  if (!showForm) {
    return (
      <WizardStepContainer stepIndex={1} disableNext>
        <WizardStepHeader
          icon={<BuildingIcon className="w-8 h-8 text-primary" />}
          title="What type of business are you?"
          description="Choose a template to pre-configure your settings"
        />

        <WizardStepContent>
          <ScrollShadow className="max-h-[350px]">
            <div className="grid grid-cols-2 gap-3">
              {brandTemplates.map((template) => (
                <Card
                  key={template.id}
                  isPressable
                  isHoverable
                  className={`transition-all ${
                    selectedTemplate?.id === template.id
                      ? "border-2 border-primary bg-primary/5"
                      : "border-2 border-transparent"
                  }`}
                  onPress={() => handleTemplateSelect(template)}
                >
                  <CardBody className="p-4 text-center">
                    <span className="text-3xl mb-2 block">{template.icon}</span>
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">
                      {template.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {template.description}
                    </p>
                  </CardBody>
                </Card>
              ))}
            </div>
          </ScrollShadow>

          <p className="text-xs text-center text-gray-500 mt-4">
            You can customize everything later!
          </p>
        </WizardStepContent>
      </WizardStepContainer>
    );
  }

  // Form view
  return (
    <WizardStepContainer stepIndex={1} onNext={handleSubmit}>
      <WizardStepHeader
        icon={<BuildingIcon className="w-8 h-8 text-primary" />}
        title="Set Up Your Workspace"
        description={selectedTemplate ? `Using ${selectedTemplate.name} template` : "Tell us about your business"}
      />

      <WizardStepContent>
        {selectedTemplate && (
          <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg mb-4">
            <span className="text-2xl">{selectedTemplate.icon}</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {selectedTemplate.name} Template
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Voice: {selectedTemplate.voiceTone} • Style: {selectedTemplate.writingStyle}
              </p>
            </div>
            <Button
              size="sm"
              variant="flat"
              onPress={() => setShowForm(false)}
            >
              Change
            </Button>
          </div>
        )}

        <Input
          label="Organization Name"
          placeholder="Acme Inc."
          {...form.register("organizationName")}
          isInvalid={!!form.formState.errors.organizationName}
          errorMessage={form.formState.errors.organizationName?.message}
          autoFocus
        />

        <Input
          label="Brand Name"
          placeholder="My Awesome Brand"
          {...form.register("brandName")}
          isInvalid={!!form.formState.errors.brandName}
          errorMessage={form.formState.errors.brandName?.message}
        />

        <Input
          label="Website URL (Optional - helps AI setup)"
          placeholder="https://example.com"
          {...form.register("website")}
          isInvalid={!!form.formState.errors.website}
          errorMessage={form.formState.errors.website?.message}
          description="If provided, AI can analyze your website for faster setup"
        />

        {/* Social Connection Option */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <LinkIcon className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Connect Social Accounts (Optional)
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="flat"
              className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
              startContent={<FacebookIcon className="w-4 h-4" />}
              isDisabled={isLoading}
              onPress={async () => {
                // Validate and submit form first to create brand
                const isValid = await form.trigger();
                if (!isValid) return;

                const data = form.getValues();
                if (!data.organizationName || !data.brandName) {
                  setError("Please fill in organization and brand name first");
                  return;
                }

                setLoading(true);
                try {
                  // Create org
                  const orgResponse = await fetch("/api/onboarding/organization", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: data.organizationName }),
                  });
                  if (!orgResponse.ok) throw new Error("Failed to create organization");
                  const org = await orgResponse.json();

                  // Create brand
                  const brandResponse = await fetch("/api/onboarding/brand", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      name: data.brandName,
                      website: data.website || undefined,
                      industry: selectedTemplate?.name,
                      organizationId: org.id,
                      templateId: selectedTemplate?.id,
                      templateData: selectedTemplate?.id !== "custom" ? {
                        voiceTone: selectedTemplate?.voiceTone,
                        writingStyle: selectedTemplate?.writingStyle,
                        emojiStyle: selectedTemplate?.emojiStyle,
                        ctaStyle: selectedTemplate?.ctaStyle,
                        contentPillars: selectedTemplate?.contentPillars,
                        targetAudience: selectedTemplate?.targetAudience,
                        suggestedHashtags: selectedTemplate?.suggestedHashtags,
                        sampleValues: selectedTemplate?.sampleValues,
                      } : undefined,
                    }),
                  });
                  if (!brandResponse.ok) throw new Error("Failed to create brand");
                  const brand = await brandResponse.json();

                  // Store IDs before redirect
                  onSetupComplete(org.id, brand.id);

                  // Redirect to Facebook OAuth
                  window.location.href = `/api/social/connect/meta?brandId=${brand.id}&platform=facebook&returnUrl=/onboarding`;
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to connect");
                  setLoading(false);
                }
              }}
            >
              Facebook
            </Button>
            <Button
              size="sm"
              variant="flat"
              className="flex-1 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 text-white"
              startContent={<InstagramIcon className="w-4 h-4" />}
              isDisabled={isLoading}
              onPress={async () => {
                // Validate and submit form first to create brand
                const isValid = await form.trigger();
                if (!isValid) return;

                const data = form.getValues();
                if (!data.organizationName || !data.brandName) {
                  setError("Please fill in organization and brand name first");
                  return;
                }

                setLoading(true);
                try {
                  // Create org
                  const orgResponse = await fetch("/api/onboarding/organization", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: data.organizationName }),
                  });
                  if (!orgResponse.ok) throw new Error("Failed to create organization");
                  const org = await orgResponse.json();

                  // Create brand
                  const brandResponse = await fetch("/api/onboarding/brand", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      name: data.brandName,
                      website: data.website || undefined,
                      industry: selectedTemplate?.name,
                      organizationId: org.id,
                      templateId: selectedTemplate?.id,
                      templateData: selectedTemplate?.id !== "custom" ? {
                        voiceTone: selectedTemplate?.voiceTone,
                        writingStyle: selectedTemplate?.writingStyle,
                        emojiStyle: selectedTemplate?.emojiStyle,
                        ctaStyle: selectedTemplate?.ctaStyle,
                        contentPillars: selectedTemplate?.contentPillars,
                        targetAudience: selectedTemplate?.targetAudience,
                        suggestedHashtags: selectedTemplate?.suggestedHashtags,
                        sampleValues: selectedTemplate?.sampleValues,
                      } : undefined,
                    }),
                  });
                  if (!brandResponse.ok) throw new Error("Failed to create brand");
                  const brand = await brandResponse.json();

                  // Store IDs before redirect
                  onSetupComplete(org.id, brand.id);

                  // Redirect to Instagram OAuth
                  window.location.href = `/api/social/connect/meta?brandId=${brand.id}&platform=instagram&returnUrl=/onboarding`;
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to connect");
                  setLoading(false);
                }
              }}
            >
              Instagram
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Connect now to let AI analyze your existing content
          </p>
        </div>
      </WizardStepContent>
    </WizardStepContainer>
  );
}

// Step 3: Path Selection
interface PathSelectionStepProps {
  selectedPath: SetupPath | null;
  onPathSelect: (path: SetupPath) => void;
}

function PathSelectionStep({ selectedPath, onPathSelect }: PathSelectionStepProps) {
  const { setData } = useWizard();

  const handlePathSelect = (path: SetupPath) => {
    onPathSelect(path);
    setData("setupPath", path);
  };

  return (
    <WizardStepContainer stepIndex={2} disableNext={!selectedPath}>
      <WizardStepHeader
        icon={<RocketIcon className="w-8 h-8 text-primary" />}
        title="Choose Your Setup Path"
        description="How would you like to configure your marketing flywheel?"
      />

      <WizardStepContent>
        <div className="space-y-3">
          {pathOptions.map((option) => (
            <Card
              key={option.id}
              isPressable
              isHoverable
              className={`transition-all ${
                selectedPath === option.id
                  ? "border-2 border-primary bg-primary/5"
                  : "border-2 border-transparent"
              } ${option.recommended ? "ring-2 ring-primary/20" : ""}`}
              onPress={() => handlePathSelect(option.id)}
            >
              <CardBody className="p-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      selectedPath === option.id
                        ? "bg-primary text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {option.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {option.title}
                      </p>
                      {option.recommended && (
                        <Chip size="sm" color="primary" variant="flat">
                          Recommended
                        </Chip>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {option.description}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <ClockIcon className="w-3 h-3" />
                      <span>{option.time}</span>
                    </div>

                    {selectedPath === option.id && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <ul className="space-y-1">
                          {option.features.map((feature, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                              <CheckCircleIcon className="w-3 h-3 text-green-500" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  {selectedPath === option.id && (
                    <CheckCircleIcon className="w-6 h-6 text-primary flex-shrink-0" />
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </WizardStepContent>
    </WizardStepContainer>
  );
}

// Step 4: Ready
interface ReadyStepProps {
  selectedPath: SetupPath | null;
  selectedGoal: UserGoal | null;
}

function ReadyStep({ selectedPath, selectedGoal }: ReadyStepProps) {
  const pathInfo = pathOptions.find((p) => p.id === selectedPath);
  const goalInfo = goalOptions.find((g) => g.id === selectedGoal);

  const getNextStepDescription = () => {
    switch (selectedPath) {
      case "ai_express":
        return "AI will analyze your website and configure all 5 phases of your marketing flywheel automatically.";
      case "guided":
        return "You'll go through 12 essential steps to configure your flywheel with smart defaults.";
      case "expert":
        return "You'll have access to all 32 configuration steps for complete control.";
      default:
        return "";
    }
  };

  return (
    <WizardStepContainer stepIndex={3} completeLabel="Start Setup" hidePrev>
      <WizardStepHeader
        icon={<span className="text-4xl">🚀</span>}
        title="You're All Set!"
        description="Your workspace is ready. Let's configure your marketing flywheel."
      />

      <WizardStepContent>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
              <CheckCircleIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Workspace Created</p>
              <p className="text-sm text-gray-500">Organization and brand are ready</p>
            </div>
          </div>

          {goalInfo && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center text-white">
                {goalInfo.icon}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Goal: {goalInfo.title}</p>
                <p className="text-sm text-gray-500">{goalInfo.description}</p>
              </div>
            </div>
          )}

          {pathInfo && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center text-white">
                {pathInfo.icon}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{pathInfo.title}</p>
                <p className="text-sm text-gray-500">{pathInfo.time}</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-start gap-3">
            <ArrowRightIcon className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">What happens next</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {getNextStepDescription()}
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-center text-gray-500 mt-4">
          You can always change your settings later in the dashboard.
        </p>
      </WizardStepContent>
    </WizardStepContainer>
  );
}
