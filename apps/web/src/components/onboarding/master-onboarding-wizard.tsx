"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, RadioGroup, Radio, Checkbox, Card, CardBody, ScrollShadow } from "@heroui/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Wizard,
  WizardStepContainer,
  WizardStepHeader,
  WizardStepContent,
  WizardActions,
  useWizard,
  WizardStep,
} from "@/components/ui/wizard";
import {
  SparklesIcon,
  MicIcon,
  MailIcon,
  CompassIcon,
  BuildingIcon,
  CheckCircleIcon,
  RocketIcon,
  PlayIcon,
  ArrowRightIcon,
} from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { brandTemplates, type BrandTemplate } from "@/lib/brand-brain/templates";

interface MasterOnboardingWizardProps {
  userName: string;
  userEmail: string;
}

// Goal type
type UserGoal = "content" | "voice" | "campaigns" | "explore";

interface GoalOption {
  id: UserGoal;
  title: string;
  description: string;
  icon: React.ReactNode;
  quickWin: string;
}

const goalOptions: GoalOption[] = [
  {
    id: "content",
    title: "Create AI Content",
    description: "Generate social posts, blogs, and marketing copy",
    icon: <SparklesIcon className="w-6 h-6" />,
    quickWin: "Generate your first AI-powered social post",
  },
  {
    id: "voice",
    title: "Build Voice Agents",
    description: "Create AI phone agents for sales and support",
    icon: <MicIcon className="w-6 h-6" />,
    quickWin: "Deploy your first voice agent in 2 minutes",
  },
  {
    id: "campaigns",
    title: "Run Outreach Campaigns",
    description: "Automate lead generation and follow-ups",
    icon: <MailIcon className="w-6 h-6" />,
    quickWin: "Set up your first automated campaign",
  },
  {
    id: "explore",
    title: "Just Exploring",
    description: "Look around and see what Epic AI can do",
    icon: <CompassIcon className="w-6 h-6" />,
    quickWin: "Take a tour of the dashboard",
  },
];

// Validation schemas
const orgBrandSchema = z.object({
  organizationName: z.string().min(2, "Organization name must be at least 2 characters"),
  brandName: z.string().min(2, "Brand name must be at least 2 characters"),
  website: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  industry: z.string().optional(),
});

type OrgBrandFormData = z.infer<typeof orgBrandSchema>;

// Wizard steps definition
const wizardSteps: WizardStep[] = [
  { id: "welcome", title: "Welcome", description: "What brings you here?" },
  { id: "setup", title: "Setup", description: "Create your workspace" },
  { id: "quick-win", title: "Quick Win", description: "Your first success" },
  { id: "tour", title: "Tour", description: "Know your dashboard" },
  { id: "complete", title: "Complete", description: "You're all set!" },
];

export function MasterOnboardingWizard({ userName, userEmail }: MasterOnboardingWizardProps) {
  const router = useRouter();
  const [selectedGoal, setSelectedGoal] = useState<UserGoal | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [quickWinCompleted, setQuickWinCompleted] = useState(false);
  const [tourCompleted, setTourCompleted] = useState(false);
  const [enableDemoMode, setEnableDemoMode] = useState(false);

  const handleComplete = useCallback(
    async (data: Record<string, unknown>) => {
      try {
        // Mark onboarding as complete
        await fetch("/api/onboarding/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goal: selectedGoal,
            isDemoMode: enableDemoMode,
          }),
        });

        // Track onboarding completion
        trackEvent("onboarding_completed", {
          goal: selectedGoal || "none",
          demo_mode_enabled: enableDemoMode,
        });

        // Navigate to appropriate page based on goal
        const destinationMap: Record<UserGoal, string> = {
          content: "/dashboard/content",
          voice: "/dashboard/voice/agents",
          campaigns: "/dashboard/voice/campaigns",
          explore: "/dashboard",
        };

        router.push(selectedGoal ? destinationMap[selectedGoal] : "/dashboard");
        router.refresh();
      } catch (error) {
        console.error("Failed to complete onboarding:", error);
        router.push("/dashboard");
      }
    },
    [router, selectedGoal, enableDemoMode]
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

        {/* Step 2: Organization & Brand Setup */}
        <SetupStep
          onSetupComplete={(orgId, brandId) => {
            setOrganizationId(orgId);
            setBrandId(brandId);
          }}
        />

        {/* Step 3: Quick Win based on goal */}
        <QuickWinStep
          selectedGoal={selectedGoal}
          brandId={brandId}
          enableDemoMode={enableDemoMode}
          setEnableDemoMode={setEnableDemoMode}
          onComplete={() => setQuickWinCompleted(true)}
        />

        {/* Step 4: Platform Tour */}
        <TourStep onComplete={() => setTourCompleted(true)} />

        {/* Step 5: Complete */}
        <CompleteStep selectedGoal={selectedGoal} />
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
        description="What would you like to accomplish today?"
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

// Step 2: Setup
interface SetupStepProps {
  onSetupComplete: (orgId: string, brandId: string) => void;
}

function SetupStep({ onSetupComplete }: SetupStepProps) {
  const { setData, setError, setLoading } = useWizard();
  const [selectedTemplate, setSelectedTemplate] = useState<BrandTemplate | null>(null);
  const [showForm, setShowForm] = useState(false);

  const form = useForm<OrgBrandFormData>({
    resolver: zodResolver(orgBrandSchema),
    defaultValues: {
      organizationName: "",
      brandName: "",
      website: "",
      industry: "",
    },
  });

  // When template is selected, update industry field
  const handleTemplateSelect = (template: BrandTemplate) => {
    setSelectedTemplate(template);
    if (template.id !== "custom") {
      form.setValue("industry", template.name);
    }
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
          industry: data.industry || undefined,
          organizationId: org.id,
          // Pass template data for Brand Brain initialization
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
      trackEvent("onboarding_template_selected", {
        template_id: selectedTemplate?.id || "none",
        template_name: selectedTemplate?.name || "none",
      });

      setData("organizationId", org.id);
      setData("brandId", brand.id);
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
          description="Choose a template to pre-configure your Brand Brain"
        />

        <WizardStepContent>
          <ScrollShadow className="max-h-[400px]">
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
            Don&apos;t worry, you can customize everything later!
          </p>
        </WizardStepContent>
      </WizardStepContainer>
    );
  }

  // Form view (after template selection)
  return (
    <WizardStepContainer stepIndex={1} onNext={handleSubmit}>
      <WizardStepHeader
        icon={<BuildingIcon className="w-8 h-8 text-primary" />}
        title="Set Up Your Workspace"
        description={selectedTemplate ? `Using ${selectedTemplate.name} template` : "This takes less than a minute"}
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
          label="Website (Optional)"
          placeholder="https://example.com"
          {...form.register("website")}
          isInvalid={!!form.formState.errors.website}
          errorMessage={form.formState.errors.website?.message}
        />
      </WizardStepContent>
    </WizardStepContainer>
  );
}

// Step 3: Quick Win
interface QuickWinStepProps {
  selectedGoal: UserGoal | null;
  brandId: string | null;
  onComplete: () => void;
  enableDemoMode: boolean;
  setEnableDemoMode: (value: boolean) => void;
}

function QuickWinStep({
  selectedGoal,
  brandId,
  onComplete,
  enableDemoMode,
  setEnableDemoMode,
}: QuickWinStepProps) {
  const { setData } = useWizard();
  const [isStarting, setIsStarting] = useState(false);
  const [quickWinDone, setQuickWinDone] = useState(false);

  const goalInfo = goalOptions.find((g) => g.id === selectedGoal);

  const handleStartQuickWin = async () => {
    setIsStarting(true);

    try {
      // Simulate quick win based on goal
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Mark quick win as complete in backend
      await fetch("/api/onboarding/quick-win", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: selectedGoal,
          brandId,
          isDemoMode: enableDemoMode,
        }),
      });

      setQuickWinDone(true);
      setData("quickWinCompleted", true);
      onComplete();
    } catch (error) {
      console.error("Quick win error:", error);
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <WizardStepContainer stepIndex={2} disableNext={!quickWinDone}>
      <WizardStepHeader
        icon={<RocketIcon className="w-8 h-8 text-primary" />}
        title="Your First Quick Win"
        description={goalInfo?.quickWin || "Let's get you started with something quick"}
      />

      <WizardStepContent>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 text-center">
          {!quickWinDone ? (
            <>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Ready to see Epic AI in action? This will only take a moment.
              </p>

              <Checkbox
                isSelected={enableDemoMode}
                onValueChange={setEnableDemoMode}
                className="mb-4"
              >
                <span className="text-sm">
                  Use demo mode (no real API calls or costs)
                </span>
              </Checkbox>

              <Button
                color="primary"
                size="lg"
                onPress={handleStartQuickWin}
                isLoading={isStarting}
                startContent={!isStarting && <PlayIcon className="w-5 h-5" />}
              >
                {isStarting ? "Setting things up..." : "Let's Do It!"}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
                <CheckCircleIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Amazing! You did it! 🎉
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your quick win is complete. Let's take a quick tour of your new dashboard.
              </p>
            </div>
          )}
        </div>
      </WizardStepContent>
    </WizardStepContainer>
  );
}

// Step 4: Tour
interface TourStepProps {
  onComplete: () => void;
}

function TourStep({ onComplete }: TourStepProps) {
  const { setData } = useWizard();
  const [tourStarted, setTourStarted] = useState(false);

  const tourHighlights = [
    { icon: "📊", title: "Dashboard", description: "Your command center for all activities" },
    { icon: "🎨", title: "Content Factory", description: "AI-powered content generation" },
    { icon: "🎙️", title: "Voice Agents", description: "Create AI phone agents" },
    { icon: "📈", title: "Analytics", description: "Track performance and insights" },
  ];

  const handleSkipTour = () => {
    setData("tourSkipped", true);
    onComplete();
  };

  const handleStartTour = () => {
    setTourStarted(true);
    // Simulate tour completion after viewing highlights
    setTimeout(() => {
      setData("tourCompleted", true);
      onComplete();
    }, 500);
  };

  return (
    <WizardStepContainer
      stepIndex={3}
      disableNext={!tourStarted}
      nextLabel="Finish Setup"
    >
      <WizardStepHeader
        icon={<CompassIcon className="w-8 h-8 text-primary" />}
        title="Know Your Dashboard"
        description="A quick overview of what you can do"
      />

      <WizardStepContent>
        <div className="grid grid-cols-2 gap-3">
          {tourHighlights.map((item, index) => (
            <Card key={index} className="p-4">
              <div className="text-2xl mb-2">{item.icon}</div>
              <p className="font-medium text-sm text-gray-900 dark:text-white">{item.title}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{item.description}</p>
            </Card>
          ))}
        </div>

        <WizardActions>
          <Button color="primary" className="w-full" onPress={handleStartTour}>
            Got It!
          </Button>
          <Button variant="light" className="w-full" onPress={handleSkipTour}>
            Skip Tour
          </Button>
        </WizardActions>
      </WizardStepContent>
    </WizardStepContainer>
  );
}

// Step 5: Complete
interface CompleteStepProps {
  selectedGoal: UserGoal | null;
}

function CompleteStep({ selectedGoal }: CompleteStepProps) {
  const goalInfo = goalOptions.find((g) => g.id === selectedGoal);

  const nextSteps = [
    { done: true, text: "Created your workspace" },
    { done: true, text: "Completed your first quick win" },
    { done: true, text: "Explored the dashboard" },
    { done: false, text: goalInfo?.quickWin || "Start creating" },
  ];

  return (
    <WizardStepContainer stepIndex={4} completeLabel="Go to Dashboard" hidePrev>
      <WizardStepHeader
        icon={<span className="text-4xl">🎉</span>}
        title="You're All Set!"
        description="Your Epic AI workspace is ready to go"
      />

      <WizardStepContent>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">What's next:</h4>
          <div className="space-y-2">
            {nextSteps.map((step, index) => (
              <div key={index} className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    step.done
                      ? "bg-green-500 text-white"
                      : "bg-primary text-white"
                  }`}
                >
                  {step.done ? (
                    <CheckCircleIcon className="w-3 h-3" />
                  ) : (
                    <ArrowRightIcon className="w-3 h-3" />
                  )}
                </div>
                <span
                  className={`text-sm ${
                    step.done
                      ? "text-gray-500 line-through"
                      : "text-gray-900 dark:text-white font-medium"
                  }`}
                >
                  {step.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Need help? Our AI assistant is always available in the bottom-right corner.
          </p>
        </div>
      </WizardStepContent>
    </WizardStepContainer>
  );
}
