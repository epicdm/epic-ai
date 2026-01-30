"use client";

/**
 * Unified Onboarding Wizard
 *
 * Single entry point for all new users with path selection:
 * - AI Express: Quick setup via website analysis (~5 min)
 * - Guided: Streamlined manual setup (~15 min)
 * - Expert: Full control via setup hub (~30+ min)
 */

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  CheckIcon,
  Phone,
  Share2,
  MessageCircle,
  MessageSquare,
  Volume2,
  Palette,
  Target,
  Users,
  Info,
  ClipboardList,
} from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { brandTemplates, type BrandTemplate } from "@/lib/brand-brain/templates";
import { ChannelSelector } from "@/components/brand/channel-selector";
import {
  getIndustryRecommendations,
  type ChannelRecommendation,
} from "@/lib/brand-brain/industry-channels";
import { AIBadge } from "@/components/ui/ai-badge";
import { AIConfidence } from "@/components/ui/ai-confidence";
import { useSmartNudges } from "@/hooks/use-smart-nudges";
import { SmartNudge } from "@/components/ui/smart-nudge";
import {
  AGENT_WIZARD_STEPS,
  agentTypeRegistry,
  getAgentTypeConfig,
  type AgentTypeId,
  type WizardStepId,
} from "@/lib/agents/agent-registry";

// Types
type UserGoal = "content" | "voice" | "campaigns" | "explore";
type SetupPath = "social_first" | "voice_first" | "hybrid" | "guided";

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

interface AgentTypeOption {
  id: AgentTypeId;
  title: string;
  description: string;
  icon: React.ReactNode;
  requiredTools: string[];
  templateId: string;
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

const agentTypeIconMap: Record<AgentTypeId, React.ReactNode> = {
  sales: <Target className="w-6 h-6" />,
  receptionist: <Phone className="w-6 h-6" />,
  dental_intake: <ClipboardList className="w-6 h-6" />,
  survey: <MessageCircle className="w-6 h-6" />,
};

const agentTypeOptions: AgentTypeOption[] = agentTypeRegistry.map((config) => ({
  id: config.id,
  title: config.name,
  description: config.description,
  icon: agentTypeIconMap[config.id],
  requiredTools: config.requiredTools,
  templateId: config.templateId,
}));
// Channel-centric path options - "One Brain, Many Voices"
const pathOptions: PathOption[] = [
  {
    id: "social_first",
    title: "Social-First Setup",
    description: "AI content creation for social media dominance",
    time: "~5 minutes",
    icon: <SparklesIcon className="w-6 h-6" />,
    features: [
      "AI analyzes your brand voice",
      "Auto-generates content pillars",
      "Optimal posting schedule",
      "Multi-platform content variations",
    ],
  },
  {
    id: "voice_first",
    title: "Voice-First Setup",
    description: "AI voice agents for calls and conversations",
    time: "~5 minutes",
    icon: <MicIcon className="w-6 h-6" />,
    features: [
      "Voice agent personality from Brand Brain",
      "Call handling & scheduling",
      "Lead qualification flows",
      "Conversation intelligence",
    ],
  },
  {
    id: "hybrid",
    title: "Hybrid Cross-Channel",
    description: "One Brand Brain, many voices across all channels",
    time: "~8 minutes",
    icon: <ZapIcon className="w-6 h-6" />,
    recommended: true,
    features: [
      "Social + Voice + Email unified",
      "Cross-channel workflows",
      "Journey attribution tracking",
      "AI optimizes channel mix",
    ],
  },
  {
    id: "guided",
    title: "Custom Setup",
    description: "Configure everything manually with guidance",
    time: "~15 minutes",
    icon: <BookOpenIcon className="w-6 h-6" />,
    features: [
      "Industry templates",
      "Step-by-step configuration",
      "Full customization",
      "Preview before applying",
    ],
  },
];

// Channel icons and colors for preview
const CHANNEL_PREVIEW_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  social: {
    icon: <Share2 className="w-3 h-3" />,
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    label: "Social",
  },
  voice: {
    icon: <Phone className="w-3 h-3" />,
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    label: "Voice",
  },
  email: {
    icon: <MailIcon className="w-3 h-3" />,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    label: "Email",
  },
  chat: {
    icon: <MessageSquare className="w-3 h-3" />,
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    label: "Chat",
  },
};

// Generate sample content based on template
function generateSampleContent(template: BrandTemplate): string[] {
  const samples: Record<string, string[]> = {
    "tech-startup": [
      "Just shipped a new feature that our customers have been asking for. The feedback loop is real. 🚀",
      "Here's what we learned from analyzing 10,000 user sessions. Thread 👇",
      "Building in public: Our engineering team just solved a scaling challenge that was keeping us up at night.",
    ],
    "ecommerce": [
      "✨ NEW DROP ALERT ✨ These won't last long - shop the link in bio!",
      "Your cart is feeling lonely 🛒 Come back and finish what you started!",
      "5-star reviews don't lie. See why customers are obsessed with this product →",
    ],
    "professional-services": [
      "Key regulatory changes are coming in Q2. Here's what you need to know to stay compliant.",
      "We helped our client reduce operational costs by 35%. Read the full case study.",
      "Industry insight: The three metrics that matter most for sustainable growth.",
    ],
    "healthcare": [
      "Small daily habits lead to big health improvements. Start with just 10 minutes of movement today.",
      "Your wellness journey is unique. We're here to guide you every step of the way.",
      "Prevention is the best medicine. Schedule your annual check-up today.",
    ],
    "real-estate": [
      "Just Listed: Stunning 3BR home in sought-after neighborhood. DM for details!",
      "Market update: What rising interest rates mean for buyers this spring.",
      "Another happy family in their dream home! Congratulations to the Johnsons 🏠🎉",
    ],
    "restaurant": [
      "🍝 Tonight's special: Fresh house-made pasta with truffle cream sauce! Reserve your table now!",
      "Behind the scenes: Our chef sourcing ingredients at the local farmers market 🥬🍅",
      "Thank you for making us your neighborhood spot! We appreciate every visit 💕",
    ],
    "creative-agency": [
      "Just wrapped an incredible rebrand project. Sometimes the best work pushes boundaries.",
      "Hot take: Your brand's visual identity should make you uncomfortable (in a good way).",
      "Client win: 340% increase in engagement after our social media overhaul. Let's talk about your brand.",
    ],
    "fitness": [
      "💪 NO EXCUSES! Your 6am crew is waiting. Let's crush this Monday!",
      "Transformation Tuesday: Sarah lost 30lbs in 6 months with our program. Your turn! 🔥",
      "Quick workout you can do anywhere - 15 mins, no equipment. Save this post!",
    ],
    "education": [
      "Learning never stops. Discover our new course catalog for continuous professional development.",
      "Student spotlight: Meet Alex, who turned their passion into a career after completing our program.",
      "The skills gap is real. Here are the 5 competencies every professional needs in 2024.",
    ],
    "custom": [
      "Share your story with your audience in a way that feels authentic to your brand.",
      "Quality content builds lasting relationships with your customers.",
      "Every interaction is an opportunity to demonstrate your values.",
    ],
  };

  return samples[template.id] || samples["custom"];
}

// Validation schemas
const businessInfoSchema = z.object({
  organizationName: z.string().min(2, "Organization name must be at least 2 characters"),
  brandName: z.string().min(2, "Brand name must be at least 2 characters"),
  website: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  brandNotes: z.string().max(4000, "Brand notes should be under 4000 characters").optional().or(z.literal("")),
});

type BusinessInfoFormData = z.infer<typeof businessInfoSchema>;

// Helper function to determine which templates are recommended for each goal
function getRecommendedTemplatesForGoal(goal: UserGoal | null): {
  templateId: string;
  confidence: number;
  reason: string;
}[] {
  if (!goal) return [];

  const recommendations: Record<UserGoal, { templateId: string; confidence: number; reason: string }[]> = {
    content: [
      { templateId: "tech-startup", confidence: 92, reason: "Perfect for content marketing with tech-savvy audiences" },
      { templateId: "creative-agency", confidence: 88, reason: "Ideal for showcasing creative content and portfolio work" },
      { templateId: "ecommerce", confidence: 85, reason: "Great for product storytelling and promotional content" },
      { templateId: "education", confidence: 82, reason: "Excellent for educational content and thought leadership" },
    ],
    voice: [
      { templateId: "professional-services", confidence: 90, reason: "Optimized for client communication and consultations" },
      { templateId: "healthcare", confidence: 88, reason: "Perfect for patient outreach and appointment booking" },
      { templateId: "real-estate", confidence: 85, reason: "Ideal for lead qualification and property inquiries" },
      { templateId: "restaurant", confidence: 82, reason: "Great for reservations and customer support" },
    ],
    campaigns: [
      { templateId: "ecommerce", confidence: 92, reason: "Built for conversion-focused outreach campaigns" },
      { templateId: "real-estate", confidence: 88, reason: "Perfect for lead nurturing and follow-ups" },
      { templateId: "fitness", confidence: 85, reason: "Optimized for member acquisition campaigns" },
      { templateId: "professional-services", confidence: 82, reason: "Ideal for B2B outreach and relationship building" },
    ],
    explore: [
      { templateId: "tech-startup", confidence: 85, reason: "Versatile template to explore all features" },
      { templateId: "creative-agency", confidence: 82, reason: "Great for testing creative content capabilities" },
      { templateId: "ecommerce", confidence: 80, reason: "Good balance of content types to explore" },
    ],
  };

  return recommendations[goal] || [];
}

function getRecommendedAgentTypes(input: {
  templateId?: string;
  connectedAccounts?: string[];
}): AgentTypeId[] {
  const picks: AgentTypeId[] = [];
  const templateId = input.templateId || "";
  const connectedAccounts = input.connectedAccounts || [];

  const isHealthcare =
    templateId.includes("healthcare") || templateId.includes("dental");
  const isHospitality =
    templateId.includes("restaurant") || templateId.includes("hospitality");
  const isServiceBusiness =
    templateId.includes("professional-services") ||
    templateId.includes("real-estate") ||
    templateId.includes("fitness");

  if (isHealthcare) picks.push("dental_intake");
  if (isHospitality || isServiceBusiness) picks.push("receptionist");
  if (connectedAccounts.includes("facebook") || connectedAccounts.includes("instagram")) {
    picks.push("sales");
  }
  picks.push("sales", "receptionist", "survey");

  return Array.from(new Set(picks)).slice(0, 3);
}

// Wizard steps
const wizardSteps: WizardStep[] = AGENT_WIZARD_STEPS.map((step) => ({
  id: step.id,
  title: step.title,
  description: step.description,
}));

const wizardStepOrder = AGENT_WIZARD_STEPS.map((step) => step.id);

const nudgeConfigs: NudgeConfig[] = [
  {
    id: "onboarding_help",
    type: "hint",
    title: "Need help?",
    message: "We recommend starting with the quick setup wizard",
    icon: <Info className="w-5 h-5" />,
    triggers: { idle: 30 } // After 30 seconds of inactivity
  },
  {
    id: "agent_type_selection",
    type: "suggestion",
    title: "Agent Type",
    message: "Pick the agent type so we can auto-configure your tools",
    icon: <SparklesIcon className="w-5 h-5" />,
    triggers: { idle: 15, confusion: true }
  }
];

export function UnifiedOnboardingWizard({ userName, userEmail }: UnifiedOnboardingWizardProps) {
  const router = useRouter();
  const [selectedGoal, setSelectedGoal] = useState<UserGoal | null>(null);
  const [selectedAgentType, setSelectedAgentType] = useState<AgentTypeId | null>(null);
  const [selectedAgentTemplateId, setSelectedAgentTemplateId] = useState<string | null>(null);
  const [agentName, setAgentName] = useState<string>("");
  const [createdAgentId, setCreatedAgentId] = useState<string | null>(null);
  const [agentCreationError, setAgentCreationError] = useState<string | null>(null);
  const [agentProvisioning, setAgentProvisioning] = useState(false);
  const [agentCreating, setAgentCreating] = useState(false);
  const [agentSkipped, setAgentSkipped] = useState(false);
  const [autoConfig, setAutoConfig] = useState<{
    systemPrompt?: string;
    greeting?: string;
    suggestedVoice?: string;
    temperature?: number;
  } | null>(null);
  const [autoConfigLoading, setAutoConfigLoading] = useState(false);
  const [autoConfigError, setAutoConfigError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<SetupPath | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<BrandTemplate | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [enabledTools, setEnabledTools] = useState<string[]>([]);
  const [connectedAccounts, setConnectedAccounts] = useState<string[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const { activeNudge, trackAction, dismissNudge } = useSmartNudges(nudgeConfigs);

  const handleLoadAutoConfig = useCallback(async (nextBrandId: string) => {
    if (!nextBrandId) return;
    setAutoConfigLoading(true);
    setAutoConfigError(null);
    try {
      const res = await fetch(`/api/voice/agents/auto-config?brandId=${nextBrandId}`);
      if (!res.ok) {
        const payload = await res.json();
        throw new Error(payload.error || "Failed to generate AI defaults");
      }
      const payload = await res.json();
      setAutoConfig(payload.config || null);
    } catch (err) {
      setAutoConfigError(err instanceof Error ? err.message : "Failed to generate AI defaults");
    } finally {
      setAutoConfigLoading(false);
    }
  }, []);

  const handleComplete = useCallback(
    async (data: Record<string, unknown>) => {
      try {
        // Mark onboarding as complete with path and channel selection
        await fetch("/api/onboarding/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goal: selectedGoal,
            agentType: selectedAgentType,
            agentTemplateId: selectedAgentTemplateId,
            enabledTools,
            enabledChannels: selectedChannels,
            setupPath: selectedPath,
            channels: selectedChannels,
          }),
        });

        // Track onboarding completion
        trackEvent("onboarding_completed", {
          goal: selectedGoal || "none",
          setup_path: `${selectedPath || "none"}:${selectedChannels.join(",")}`,
          template: selectedTemplate?.id || "none",
        });

        // Route directly to dashboard - onboarding complete
        if (selectedAgentTemplateId && !agentSkipped) {
          router.push(`/dashboard/voice/agents/new?template=${selectedAgentTemplateId}`);
        } else {
          router.push("/dashboard/voice");
        }

        router.refresh();
      } catch (error) {
        console.error("Failed to complete onboarding:", error);
        router.push("/setup");
      }
    },
    [router, selectedGoal, selectedAgentType, selectedAgentTemplateId, enabledTools, selectedPath, selectedTemplate, selectedChannels, agentSkipped]
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {activeNudge && (
        <div className="mb-4">
          <SmartNudge 
            nudge={activeNudge} 
            onDismiss={dismissNudge}
          />
        </div>
      )}
      <Wizard
        steps={wizardSteps}
        onComplete={handleComplete}
        showStepIndicator
        className="w-full max-w-xl"
      >
        {wizardStepOrder.map((stepId) => {
          const stepIndex = wizardStepOrder.indexOf(stepId);

          if (stepId === "brand_kit") {
            return (
              <BusinessInfoStep
                key={stepId}
                stepIndex={stepIndex}
                selectedGoal={selectedGoal}
                selectedTemplate={selectedTemplate}
                onTemplateSelect={setSelectedTemplate}
                onSetupComplete={(orgId, bId) => {
                  setOrganizationId(orgId);
                  setBrandId(bId);
                }}
                onAccountsConnected={setConnectedAccounts}
              />
            );
          }

          if (stepId === "agent_type") {
            return (
              <AgentTypeStep
                key={stepId}
                stepIndex={stepIndex}
                userName={userName}
                selectedAgentType={selectedAgentType}
                brandTemplateId={selectedTemplate?.id}
                connectedAccounts={connectedAccounts}
                onAgentTypeSelect={(agentType) => {
                  const config = getAgentTypeConfig(agentType);
                  setSelectedAgentType(agentType);
                  setSelectedGoal("voice");
                  setSelectedPath("voice_first");
                  setSelectedAgentTemplateId(config?.templateId || null);
                  setEnabledTools(config?.requiredTools || []);
                  setSelectedChannels(config?.requiredChannels || ["voice"]);
                }}
              />
            );
          }

          if (stepId === "agent_setup") {
            return (
              <AgentSetupStep
                key={stepId}
                stepIndex={stepIndex}
                brandId={brandId}
                selectedAgentType={selectedAgentType}
                selectedAgentTemplateId={selectedAgentTemplateId}
                agentName={agentName}
                onAgentNameChange={setAgentName}
                createdAgentId={createdAgentId}
                agentSkipped={agentSkipped}
                isCreating={agentCreating}
                isProvisioning={agentProvisioning}
                error={agentCreationError}
                autoConfig={autoConfig}
                autoConfigLoading={autoConfigLoading}
                autoConfigError={autoConfigError}
          onCreateAgent={async (name) => {
            if (!brandId || !selectedAgentTemplateId) return;
            setAgentCreating(true);
            setAgentCreationError(null);
            try {
              const trimmedName = name.trim();
              if (!trimmedName) {
                throw new Error("Agent name is required");
              }

              const resolvedCustomizations = autoConfig
                ? {
                    ...(typeof autoConfig.systemPrompt === "string"
                      ? { systemPrompt: autoConfig.systemPrompt }
                      : {}),
                    ...(typeof autoConfig.greeting === "string"
                      ? { greetingMessage: autoConfig.greeting }
                      : {}),
                    ...(typeof autoConfig.suggestedVoice === "string"
                      ? { voiceId: autoConfig.suggestedVoice }
                      : {}),
                    ...(typeof autoConfig.temperature === "number"
                      ? { temperature: autoConfig.temperature }
                      : {}),
                  }
                : {};
              const customizations =
                Object.keys(resolvedCustomizations).length > 0
                  ? resolvedCustomizations
                  : undefined;

              const res = await fetch("/api/voice/templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  templateId: selectedAgentTemplateId,
                  name: trimmedName,
                  brandId,
                  customizations,
                }),
              });
              if (!res.ok) {
                const payload = await res.json();
                const detail =
                  payload.details?.[0]?.message || payload.details?.message;
                throw new Error(detail || payload.error || "Failed to create agent");
              }
                    const payload = await res.json();
                    setCreatedAgentId(payload.agent?.id || null);
                    setAgentSkipped(false);
                  } catch (err) {
                    setAgentCreationError(err instanceof Error ? err.message : "Failed to create agent");
                  } finally {
                    setAgentCreating(false);
                  }
                }}
                onProvisionPhone={async () => {
                  if (!createdAgentId) return;
                  setAgentProvisioning(true);
                  setAgentCreationError(null);
                  try {
                    const res = await fetch(`/api/voice/agents/${createdAgentId}/provision-phone`, {
                      method: "POST",
                    });
                    if (!res.ok) {
                      const payload = await res.json();
                      throw new Error(payload.error || "Phone provisioning failed");
                    }
                  } catch (err) {
                    setAgentCreationError(err instanceof Error ? err.message : "Phone provisioning failed");
                  } finally {
                    setAgentProvisioning(false);
                  }
                }}
                onSkipAgent={() => {
                  setAgentSkipped(true);
                  setAgentCreationError(null);
                }}
                onLoadAutoConfig={handleLoadAutoConfig}
              />
            );
          }

          if (stepId === "channels") {
            return (
              <ChannelSelectionStep
                key={stepId}
                stepIndex={stepIndex}
                selectedChannels={selectedChannels}
                onChannelsChange={setSelectedChannels}
                brandName={selectedTemplate?.name}
                industryId={selectedTemplate?.id}
                lockedChannels={selectedAgentType ? selectedChannels : undefined}
                lockedTools={selectedAgentType ? enabledTools : undefined}
              />
            );
          }

          if (stepId === "path") {
            return (
              <PathSelectionStep
                key={stepId}
                stepIndex={stepIndex}
                selectedPath={selectedPath}
                onPathSelect={setSelectedPath}
                connectedAccounts={connectedAccounts}
                selectedChannels={selectedChannels}
                lockedPath={selectedAgentType ? "voice_first" : null}
              />
            );
          }

          if (stepId === "ready") {
            return (
              <ReadyStep
                key={stepId}
                stepIndex={stepIndex}
                selectedPath={selectedPath}
                selectedGoal={selectedGoal}
                selectedAgentType={selectedAgentType}
              />
            );
          }

          return null;
        })}
      </Wizard>
    </div>
  );
}

// Step 1: Agent Type
interface AgentTypeStepProps {
  stepIndex: number;
  userName: string;
  selectedAgentType: AgentTypeId | null;
  brandTemplateId?: string;
  connectedAccounts?: string[];
  onAgentTypeSelect: (agentType: AgentTypeId) => void;
}

function AgentTypeStep({
  stepIndex,
  userName,
  selectedAgentType,
  brandTemplateId,
  connectedAccounts,
  onAgentTypeSelect,
}: AgentTypeStepProps) {
  const { setData } = useWizard();
  const recommendedIds = getRecommendedAgentTypes({
    templateId: brandTemplateId,
    connectedAccounts,
  });
  const recommendedOptions = agentTypeOptions.filter((option) => recommendedIds.includes(option.id));
  const otherOptions = agentTypeOptions.filter((option) => !recommendedIds.includes(option.id));

  const handleAgentTypeSelect = (agentType: AgentTypeId) => {
    onAgentTypeSelect(agentType);
    setData("agentType", agentType);
    setData("goal", "voice");
  };

  return (
    <WizardStepContainer stepIndex={stepIndex} disableNext={!selectedAgentType}>
      <WizardStepHeader
        icon={<span className="text-3xl">🧭</span>}
        title={`Welcome, ${userName}!`}
        description="Here are the top 3 agent types recommended for your brand."
      />

      <WizardStepContent>
        <div className="space-y-6">
          <div className="grid gap-3">
            {recommendedOptions.map((option) => (
              <Card
                key={option.id}
                className={`cursor-pointer transition-all ${
                  selectedAgentType === option.id
                    ? "border-2 border-primary bg-primary/5"
                    : "border-2 border-transparent"
                }`}
                onClick={() => handleAgentTypeSelect(option.id)}
              >
                <CardContent className="flex flex-row items-center gap-4 p-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      selectedAgentType === option.id
                        ? "bg-primary text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {option.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 dark:text-white">{option.title}</p>
                      <Badge   variant="secondary">Recommended</Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{option.description}</p>
                  </div>
                  {selectedAgentType === option.id && (
                    <CheckCircleIcon className="w-6 h-6 text-primary" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Browse all agent types</p>
            <div className="grid gap-3">
              {otherOptions.map((option) => (
                <Card
                  key={option.id}
                  className={`cursor-pointer transition-all ${
                    selectedAgentType === option.id
                      ? "border-2 border-primary bg-primary/5"
                      : "border-2 border-transparent"
                  }`}
                  onClick={() => handleAgentTypeSelect(option.id)}
                >
                  <CardContent className="flex flex-row items-center gap-4 p-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        selectedAgentType === option.id
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
                    {selectedAgentType === option.id && (
                      <CheckCircleIcon className="w-6 h-6 text-primary" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </WizardStepContent>
    </WizardStepContainer>
  );
}

// Step 2: Business Info
interface BusinessInfoStepProps {
  stepIndex: number;
  selectedGoal: UserGoal | null;
  selectedTemplate: BrandTemplate | null;
  onTemplateSelect: (template: BrandTemplate) => void;
  onSetupComplete: (orgId: string, brandId: string) => void;
  onAccountsConnected: (accounts: string[]) => void;
}

function BusinessInfoStep({
  stepIndex,
  selectedGoal,
  selectedTemplate,
  onTemplateSelect,
  onSetupComplete,
  onAccountsConnected,
}: BusinessInfoStepProps) {
  const { setData, setError, setLoading, isLoading } = useWizard();
  const [showForm, setShowForm] = useState(false);
  const [localConnectedAccounts, setLocalConnectedAccounts] = useState<string[]>([]);
  const [facebookConnecting, setFacebookConnecting] = useState(false);
  const [pendingBrandId, setPendingBrandId] = useState<string | null>(null);
  const [pendingOrgId, setPendingOrgId] = useState<string | null>(null);
  // Template preview modal state
  const [previewTemplate, setPreviewTemplate] = useState<BrandTemplate | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Notify parent when connected accounts change
  useEffect(() => {
    onAccountsConnected(localConnectedAccounts);
  }, [localConnectedAccounts, onAccountsConnected]);

  const form = useForm<BusinessInfoFormData>({
    resolver: zodResolver(businessInfoSchema),
    defaultValues: {
      organizationName: "",
      brandName: "",
      website: "",
      brandNotes: "",
    },
  });

  // Listen for OAuth popup completion and auto-populate form
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      console.log("[Quick FB Connect] Received postMessage:", event.data);

      if (event.data?.type === 'SOCIAL_CONNECT_SUCCESS' && event.data?.platform === 'meta') {
        console.log("[Quick FB Connect] Success! Business data:", event.data.businessData);

        // Mark both Facebook and Instagram as connected (Meta connects both)
        setLocalConnectedAccounts(prev => [...new Set([...prev, 'facebook', 'instagram'])]);
        setFacebookConnecting(false);
        setLoading(false);

        // Auto-populate form with Facebook business data
        const businessData = event.data.businessData;
        if (businessData) {
          console.log("[Quick FB Connect] Auto-filling form with:", {
            name: businessData.name,
            website: businessData.website
          });

          if (businessData.name) {
            form.setValue('organizationName', businessData.name);
            form.setValue('brandName', businessData.name);
          }
          if (businessData.website) {
            form.setValue('website', businessData.website);
          }
        }

        // Show the form view with auto-filled data so user can review/proceed
        setShowForm(true);

        // If we have pending org/brand IDs, mark setup as complete
        if (pendingOrgId && pendingBrandId) {
          console.log("[Quick FB Connect] Marking setup complete with org:", pendingOrgId, "brand:", pendingBrandId);
          setData("organizationId", pendingOrgId);
          setData("brandId", pendingBrandId);
          onSetupComplete(pendingOrgId, pendingBrandId);
        }
      } else if (event.data?.type === 'SOCIAL_CONNECT_ERROR' && event.data?.platform === 'meta') {
        console.error("[Quick FB Connect] Error from popup:", event.data.error);
        setError(event.data.error || 'Failed to connect social account');
        setFacebookConnecting(false);
        setLoading(false);
      }
    };

    console.log("[Quick FB Connect] Message listener registered");
    window.addEventListener('message', handleMessage);
    return () => {
      console.log("[Quick FB Connect] Message listener removed");
      window.removeEventListener('message', handleMessage);
    };
  }, [setError, setLoading, form, pendingOrgId, pendingBrandId, setData, onSetupComplete]);

  // Quick connect with Facebook - creates org/brand then opens OAuth
  const handleQuickFacebookConnect = async () => {
    setFacebookConnecting(true);
    setLoading(true);

    try {
      console.log("[Quick FB Connect] Step 1: Creating organization...");

      // Create org with temporary name
      const orgResponse = await fetch("/api/onboarding/organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "My Organization" }),
      });

      if (!orgResponse.ok) {
        const errorData = await orgResponse.json();
        console.error("[Quick FB Connect] Org creation failed:", errorData);
        throw new Error("Failed to create organization");
      }

      const org = await orgResponse.json();
      console.log("[Quick FB Connect] Org created:", org.id);
      setPendingOrgId(org.id);

      console.log("[Quick FB Connect] Step 2: Creating brand...");

      // Create brand with temporary name
      const brandResponse = await fetch("/api/onboarding/brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "My Brand",
          organizationId: org.id,
          templateId: selectedTemplate?.id || "custom",
        }),
      });

      if (!brandResponse.ok) {
        const errorData = await brandResponse.json();
        console.error("[Quick FB Connect] Brand creation failed:", errorData);
        throw new Error("Failed to create brand");
      }

      const brand = await brandResponse.json();
      console.log("[Quick FB Connect] Brand created:", brand.id);
      setPendingBrandId(brand.id);

      console.log("[Quick FB Connect] Step 3: Opening Facebook OAuth popup...");

      // Open Facebook OAuth in popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const oauthUrl = `/api/social/connect/meta?brandId=${brand.id}&platform=facebook&returnUrl=/onboarding`;
      console.log("[Quick FB Connect] OAuth URL:", oauthUrl);

      const popup = window.open(
        oauthUrl,
        'facebook-oauth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
      );

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        console.error("[Quick FB Connect] Popup was blocked by browser");
        throw new Error("Popup was blocked. Please allow popups for this site.");
      }

      console.log("[Quick FB Connect] Popup opened successfully");
    } catch (err) {
      console.error("[Quick FB Connect] Error:", err);
      setError(err instanceof Error ? err.message : "Failed to connect");
      setFacebookConnecting(false);
      setLoading(false);
    }
  };

  const handleTemplateSelect = (template: BrandTemplate) => {
    onTemplateSelect(template);
    setShowForm(true);
  };

  // Open template preview modal instead of immediately selecting
  const handleTemplatePreview = (template: BrandTemplate) => {
    setPreviewTemplate(template);
    setShowPreviewModal(true);
  };

  // Confirm template from preview modal
  const handleConfirmTemplate = () => {
    if (previewTemplate) {
      handleTemplateSelect(previewTemplate);
    }
    setShowPreviewModal(false);
    setPreviewTemplate(null);
  };

  // Close preview and show other options
  const handleClosePreview = () => {
    setShowPreviewModal(false);
    setPreviewTemplate(null);
  };

  const createContextSources = async (brandId: string, data: BusinessInfoFormData) => {
    const sources: Array<{ type: string; name: string; config: Record<string, unknown> }> = [];

    if (data.website) {
      sources.push({
        type: "WEBSITE",
        name: "Website",
        config: { url: data.website },
      });
    }

    if (data.brandNotes) {
      sources.push({
        type: "MANUAL_NOTE",
        name: "Brand Notes",
        config: { title: "Brand Notes", content: data.brandNotes },
      });
    }

    if (sources.length === 0) return;

    for (const source of sources) {
      try {
        await fetch("/api/context/sources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brandId,
            type: source.type,
            name: source.name,
            config: source.config,
          }),
        });
      } catch (error) {
        console.warn("Failed to add context source:", error);
      }
    }
  };

  const handleSubmit = async (): Promise<boolean> => {
    const isValid = await form.trigger();
    if (!isValid) return false;

    // If org/brand already created (e.g., via Facebook Quick Setup), just proceed
    if (pendingOrgId && pendingBrandId) {
      const data = form.getValues();

      // Update brand/org names if user changed them
      try {
        await fetch("/api/onboarding/organization", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: pendingOrgId,
            name: data.organizationName
          }),
        });

        await fetch("/api/onboarding/brand", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: pendingBrandId,
            name: data.brandName,
            website: data.website || undefined,
          }),
        });
      } catch (e) {
        console.warn("Failed to update org/brand names:", e);
        // Continue anyway - names are just cosmetic updates
      }

      await createContextSources(pendingBrandId, data);
      setData("websiteUrl", data.website);
      return true;
    }

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
      await createContextSources(brand.id, data);

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
      <WizardStepContainer stepIndex={stepIndex} disableNext>
        <WizardStepHeader
          icon={<BuildingIcon className="w-8 h-8 text-primary" />}
          title="Build Your Brand Kit"
          description="Connect Facebook, add a website, or upload notes to train your AI"
        />

        <WizardStepContent>
          {/* Quick Setup with Facebook - PROMINENT at top */}
          <div className="mb-6">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 border-0">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 rounded-full p-3">
                    <FacebookIcon className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-white text-lg">
                      Quick Setup with Facebook
                    </p>
                    <p className="text-white/80 text-sm">
                      Auto-fill your business name, website & connect your page in one click
                    </p>
                  </div>
                  <Button
                    size="lg"
                    className="bg-white text-blue-600 font-semibold hover:bg-white/90"
                    disabled={facebookConnecting}
                    onClick={handleQuickFacebookConnect}
                  >
                    {facebookConnecting ? 'Connecting...' : 'Connect Facebook'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="relative flex items-center gap-4 my-4">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-sm text-gray-500">or choose a template</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>

          <div className="max-h-[280px] overflow-auto">
            <div className="grid grid-cols-2 gap-3">
              {brandTemplates.map((template) => {
                const recommendation = getRecommendedTemplatesForGoal(selectedGoal)
                  .find(r => r.templateId === template.id);
                  
                return (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-all ${selectedTemplate?.id === template.id ? "border-2 border-primary bg-primary/5" : "border-2 border-transparent"}`}
                    onClick={() => handleTemplatePreview(template)}
                  >
                    <CardContent className="flex flex-col gap-2">
                      <div className="flex items-start justify-between">
                        <span className="text-2xl">{template.icon}</span>
                        {recommendation && (
                          <AIBadge 
                            type="recommended" 
                            size="sm"
                            reason={recommendation.reason}
                            confidence={recommendation.confidence}
                            position="corner"
                          />
                        )}
                      </div>
                      <h3 className="font-medium">{template.name}</h3>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {template.tags?.map((tag) => (
                          <Badge key={tag}  variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-center text-gray-500 mt-4">
            You can customize everything later!
          </p>

          {/* Template Preview Modal */}
          <Dialog
            open={showPreviewModal}
            onOpenChange={(open) => { if (!open) handleClosePreview(); }}
          >
            <DialogContent>
              {previewTemplate && (
                <>
                  <DialogHeader className="flex flex-col gap-1 pb-0"><DialogTitle>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{previewTemplate.icon}</span>
                      <div>
                        <h2 className="text-xl font-semibold">{previewTemplate.name}</h2>
                        <p className="text-sm text-gray-500 font-normal">{previewTemplate.description}</p>
                      </div>
                    </div>
                  </DialogTitle></DialogHeader>
                  <div className="py-4">
                    {/* Voice & Tone Section */}
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Volume2 className="w-4 h-4 text-primary" />
                          <h3 className="font-medium text-sm">Voice & Tone</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <p className="text-xs text-gray-500">Tone</p>
                            <p className="text-sm font-medium capitalize">{previewTemplate.voiceTone}</p>
                          </div>
                          <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <p className="text-xs text-gray-500">Writing Style</p>
                            <p className="text-sm font-medium capitalize">{previewTemplate.writingStyle}</p>
                          </div>
                          <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <p className="text-xs text-gray-500">Emoji Usage</p>
                            <p className="text-sm font-medium capitalize">{previewTemplate.emojiStyle}</p>
                          </div>
                          <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <p className="text-xs text-gray-500">Call-to-Action</p>
                            <p className="text-sm font-medium capitalize">{previewTemplate.ctaStyle}</p>
                          </div>
                        </div>
                      </div>

                      <div className="border-t my-4" />

                      {/* Sample Content Section */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Palette className="w-4 h-4 text-primary" />
                          <h3 className="font-medium text-sm">Sample Content in This Voice</h3>
                        </div>
                        <div className="space-y-2">
                          {generateSampleContent(previewTemplate).map((sample, idx) => (
                            <div
                              key={idx}
                              className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm italic text-gray-700 dark:text-gray-300 border-l-2 border-primary"
                            >
                              "{sample}"
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border-t my-4" />

                      {/* Content Pillars Section */}
                      {previewTemplate.contentPillars && previewTemplate.contentPillars.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Target className="w-4 h-4 text-primary" />
                            <h3 className="font-medium text-sm">Content Pillars</h3>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {previewTemplate.contentPillars.map((pillar, idx) => (
                              <Badge key={idx}  variant="secondary" >
                                {pillar}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Target Audience Section */}
                      {previewTemplate.targetAudience && previewTemplate.targetAudience.demographics?.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="w-4 h-4 text-primary" />
                            <h3 className="font-medium text-sm">Target Audiences</h3>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {previewTemplate.targetAudience.demographics.map((audience, idx) => (
                              <Badge key={idx} variant="secondary">
                                {audience}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="border-t my-4" />

                      {/* Recommended Channels Section */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Share2 className="w-4 h-4 text-primary" />
                          <h3 className="font-medium text-sm">Recommended Channels</h3>
                        </div>
                        {(() => {
                          const recommendations = getIndustryRecommendations(previewTemplate.id);
                          if (!recommendations) return (
                            <p className="text-sm text-gray-500">All channels available</p>
                          );

                          return (
                            <div className="space-y-2">
                              {recommendations.map((rec) => {
                                const config = CHANNEL_PREVIEW_CONFIG[rec.channelId];
                                if (!config) return null;

                                return (
                                  <div
                                    key={rec.channelId}
                                    className="flex items-start gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800"
                                  >
                                    <div className={`p-1.5 rounded ${config.color}`}>
                                      {config.icon}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">{config.label}</span>
                                        <Badge
                                          
                                          variant="secondary"
                                          color={rec.priority === 'high' ? 'success' : rec.priority === 'medium' ? 'warning' : 'default'}
                                          className="h-5 text-xs"
                                        >
                                          {rec.priority === 'high' ? 'Recommended' : rec.priority === 'medium' ? 'Good fit' : 'Optional'}
                                        </Badge>
                                      </div>
                                      <p className="text-xs text-gray-500 mt-0.5">{rec.reason}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="secondary"
                      onClick={handleClosePreview}
                    >
                      Show Me Others
                    </Button>
                    <Button
                      onClick={handleConfirmTemplate}
                      
                    ><CheckCircleIcon className="w-4 h-4" /> 
                      This Looks Right
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </WizardStepContent>
      </WizardStepContainer>
    );
  }

  // Form view
  return (
    <WizardStepContainer stepIndex={stepIndex} onNext={handleSubmit}>
      <WizardStepHeader
        icon={<BuildingIcon className="w-8 h-8 text-primary" />}
        title="Build Your Brand Kit"
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
              variant="secondary"
              onClick={() => setShowForm(false)}
            >
              Change
            </Button>
          </div>
        )}

        <Input
          label="Organization Name"
          placeholder="Acme Inc."
          {...form.register("organizationName")}
          
          
          autoFocus
        />

        <Input
          label="Brand Name"
          placeholder="My Awesome Brand"
          {...form.register("brandName")}
          
          
        />

        <Input
          label="Website URL (Optional - helps AI setup)"
          placeholder="https://example.com"
          {...form.register("website")}
          
          
          
        />

        <Textarea
          label="Brand Notes or Docs (Optional)"
          placeholder="Paste key details, offers, or a short brand brief..."
          minRows={4}
          {...form.register("brandNotes")}
                              description="We’ll use this to enrich your Brand Brain and tailor the agent recommendations."
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
              variant="secondary"
              className={`flex-1 ${localConnectedAccounts.includes('facebook') ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              
              disabled={isLoading || localConnectedAccounts.includes('facebook')}
              onClick={async () => {
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

                  // Open Facebook OAuth in popup window
                  const width = 600;
                  const height = 700;
                  const left = window.screenX + (window.outerWidth - width) / 2;
                  const top = window.screenY + (window.outerHeight - height) / 2;
                  window.open(
                    `/api/social/connect/meta?brandId=${brand.id}&platform=facebook&returnUrl=/onboarding`,
                    'facebook-oauth',
                    `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
                  );
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to connect");
                  setLoading(false);
                }
              }}
            >
              {localConnectedAccounts.includes('facebook') ? <CheckIcon className="w-4 h-4 mr-1" /> : <FacebookIcon className="w-4 h-4 mr-1" />}
              {localConnectedAccounts.includes('facebook') ? 'Connected' : 'Facebook'}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className={`flex-1 ${localConnectedAccounts.includes('instagram') ? 'bg-green-600 text-white' : 'bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 text-white'}`}
              
              disabled={isLoading || localConnectedAccounts.includes('instagram')}
              onClick={async () => {
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

                  // Open Instagram OAuth in popup window
                  const width = 600;
                  const height = 700;
                  const left = window.screenX + (window.outerWidth - width) / 2;
                  const top = window.screenY + (window.outerHeight - height) / 2;
                  window.open(
                    `/api/social/connect/meta?brandId=${brand.id}&platform=instagram&returnUrl=/onboarding`,
                    'instagram-oauth',
                    `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
                  );
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to connect");
                  setLoading(false);
                }
              }}
            >
              {localConnectedAccounts.includes('instagram') ? <CheckIcon className="w-4 h-4 mr-1" /> : <InstagramIcon className="w-4 h-4 mr-1" />}
              {localConnectedAccounts.includes('instagram') ? 'Connected' : 'Instagram'}
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

// Step 3: Agent Setup (AI defaults + tools)
interface AgentSetupStepProps {
  stepIndex: number;
  brandId: string | null;
  selectedAgentType: AgentTypeId | null;
  selectedAgentTemplateId: string | null;
  agentName: string;
  onAgentNameChange: (name: string) => void;
  createdAgentId: string | null;
  agentSkipped: boolean;
  isCreating: boolean;
  isProvisioning: boolean;
  error: string | null;
  autoConfig: {
    systemPrompt?: string;
    greeting?: string;
    suggestedVoice?: string;
    temperature?: number;
  } | null;
  autoConfigLoading: boolean;
  autoConfigError: string | null;
  onCreateAgent: (name: string) => Promise<void>;
  onProvisionPhone: () => Promise<void>;
  onSkipAgent: () => void;
  onLoadAutoConfig: (brandId: string) => Promise<void>;
}

function AgentSetupStep({
  stepIndex,
  brandId,
  selectedAgentType,
  selectedAgentTemplateId,
  agentName,
  onAgentNameChange,
  createdAgentId,
  agentSkipped,
  isCreating,
  isProvisioning,
  error,
  autoConfig,
  autoConfigLoading,
  autoConfigError,
  onCreateAgent,
  onProvisionPhone,
  onSkipAgent,
  onLoadAutoConfig,
}: AgentSetupStepProps) {
  const { setData } = useWizard();
  const agentConfig = selectedAgentType ? getAgentTypeConfig(selectedAgentType) : undefined;

  useEffect(() => {
    if (brandId) {
      onLoadAutoConfig(brandId);
    }
  }, [brandId, onLoadAutoConfig]);

  useEffect(() => {
    if (!agentName && agentConfig?.template) {
      onAgentNameChange(`${agentConfig.template.name}`);
    }
  }, [agentName, agentConfig, onAgentNameChange]);

  const handleCreate = async () => {
    if (!agentName || !brandId || !selectedAgentTemplateId) return;
    setData("agentName", agentName);
    await onCreateAgent(agentName);
  };

  return (
    <WizardStepContainer stepIndex={stepIndex} disableNext={!createdAgentId && !agentSkipped}>
      <WizardStepHeader
        icon={<MicIcon className="w-8 h-8 text-primary" />}
        title="AI agent defaults"
        description="We’ll generate a ready-to-go agent based on your selection."
      />

      <WizardStepContent>
        <div className="space-y-4">
          <Input
            label="Agent name"
            value={agentName}
            onChange={(e) => onAgentNameChange(e.target.value)}
            placeholder="e.g. Atlas Sales Agent"
          />

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-sm text-gray-600 dark:text-gray-400">
            {autoConfigLoading ? (
              "Generating AI defaults from your Brand Brain..."
            ) : autoConfigError ? (
              `AI defaults unavailable: ${autoConfigError}`
            ) : (
              "AI defaults will personalize your script, greeting, and voice."
            )}
          </div>

          {agentConfig?.template && (
            <Card>
              <CardContent className="space-y-2">
                <p className="font-semibold text-gray-900 dark:text-white">
                  Template: {agentConfig.template.name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {agentConfig.template.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {agentConfig.template.features.map((feature) => (
                    <Badge key={feature}   variant="secondary">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleCreate}
              disabled={isCreating || !brandId || !selectedAgentTemplateId}
            >
              Create agent with AI defaults
            </Button>
            <Button
              variant="outline"
              onClick={onProvisionPhone}
              disabled={isProvisioning || !createdAgentId}
            >
              Provision phone number
            </Button>
            <Button
              variant="ghost"
              onClick={onSkipAgent}
              disabled={isCreating || isProvisioning}
            >
              Skip for now
            </Button>
          </div>

          {(createdAgentId || agentSkipped) && (
            <div className="text-xs text-gray-500">
              {createdAgentId
                ? "Agent created. You can finish onboarding and fine-tune later."
                : "Skipped agent creation. You can finish onboarding and set it up later."}
            </div>
          )}

          {createdAgentId && agentConfig?.requiredTools?.length ? (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Connect required tools</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {agentConfig.requiredTools.includes("calendar") && (
                  <Button size="sm" variant="outline" onClick={() => window.open("/dashboard/calendar", "_blank")}>
                    Connect calendar
                  </Button>
                )}
                {agentConfig.requiredTools.includes("leads") && (
                  <Button size="sm" variant="outline" onClick={() => window.open("/dashboard/leads", "_blank")}>
                    Connect CRM
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                These connections improve scheduling and lead qualification accuracy.
              </p>
            </div>
          ) : null}
        </div>
      </WizardStepContent>
    </WizardStepContainer>
  );
}

// Step 3: Channel Selection - "One Brain, Many Voices"
interface ChannelSelectionStepProps {
  stepIndex: number;
  selectedChannels: string[];
  onChannelsChange: (channels: string[]) => void;
  brandName?: string;
  industryId?: string;
  lockedChannels?: string[];
  lockedTools?: string[];
}

function ChannelSelectionStep({
  stepIndex,
  selectedChannels,
  onChannelsChange,
  brandName,
  industryId,
  lockedChannels,
  lockedTools,
}: ChannelSelectionStepProps) {
  const { setData } = useWizard();

  useEffect(() => {
    if (lockedChannels && lockedChannels.length > 0) {
      onChannelsChange(lockedChannels);
      setData("channels", lockedChannels);
    }
  }, [lockedChannels, onChannelsChange, setData]);

  const handleChannelsChange = (channels: string[]) => {
    onChannelsChange(channels);
    setData("channels", channels);
  };

  return (
    <WizardStepContainer stepIndex={stepIndex} disableNext={selectedChannels.length === 0}>
      <WizardStepContent>
        {lockedChannels && lockedChannels.length > 0 ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Tools selected for your agent
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                We pre-selected only the tools required for your agent type.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {lockedTools?.map((tool) => (
                  <Badge key={tool}   variant="secondary">
                    {tool.replace("_", " ")}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Required channels
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {lockedChannels.map((channel) => (
                  <Badge key={channel} variant="secondary">
                    {channel.toUpperCase()}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <ChannelSelector
            selectedChannels={selectedChannels}
            onChannelsChange={handleChannelsChange}
            showContinueButton={false}
            brandName={brandName}
            mode="onboarding"
            industryId={industryId}
            autoSelectRecommended={true}
          />
        )}
      </WizardStepContent>
    </WizardStepContainer>
  );
}

// Step 4: Path Selection - Channel-Centric
interface PathSelectionStepProps {
  stepIndex: number;
  selectedPath: SetupPath | null;
  onPathSelect: (path: SetupPath) => void;
  connectedAccounts: string[];
  selectedChannels: string[];
  lockedPath?: SetupPath | null;
}

function PathSelectionStep({
  stepIndex,
  selectedPath,
  onPathSelect,
  connectedAccounts,
  selectedChannels,
  lockedPath,
}: PathSelectionStepProps) {
  const { setData } = useWizard();

  // Determine channel focus from selected channels
  const hasSocial = selectedChannels.includes("social");
  const hasVoice = selectedChannels.includes("voice");
  const hasEmail = selectedChannels.includes("email");
  const hasMultipleChannels = selectedChannels.length >= 2;

  const handlePathSelect = (path: SetupPath) => {
    if (lockedPath) return;
    onPathSelect(path);
    setData("setupPath", path);
  };

  // Recommend path based on channel selection - "One Brain, Many Voices"
  const getPathOptions = () => {
    if (lockedPath) {
      const lockedOption = pathOptions.find((option) => option.id === lockedPath);
      return lockedOption ? [{ ...lockedOption, recommended: true }] : [];
    }

    return pathOptions.map(option => {
      let isRecommended = false;

      // Hybrid recommended when multiple channels selected
      if (hasMultipleChannels && option.id === 'hybrid') {
        isRecommended = true;
      }
      // Social-first recommended when only social selected
      else if (hasSocial && !hasVoice && option.id === 'social_first') {
        isRecommended = true;
      }
      // Voice-first recommended when only voice selected
      else if (hasVoice && !hasSocial && option.id === 'voice_first') {
        isRecommended = true;
      }
      // Default to hybrid if nothing specific
      else if (selectedChannels.length === 0 && option.id === 'hybrid') {
        isRecommended = true;
      }

      return {
        ...option,
        recommended: isRecommended,
      };
    });
  };

  // Generate dynamic description based on channels
  const getDescription = () => {
    if (hasMultipleChannels) {
      return `You've enabled ${selectedChannels.length} channels. Hybrid setup will unify them under one Brand Brain.`;
    }
    if (hasSocial && !hasVoice) {
      return "Social channel selected. Social-First setup optimizes AI content creation.";
    }
    if (hasVoice && !hasSocial) {
      return "Voice channel selected. Voice-First setup configures AI phone agents.";
    }
    return "Choose how to configure your marketing channels.";
  };

  return (
    <WizardStepContainer stepIndex={stepIndex} disableNext={!selectedPath}>
      <WizardStepHeader
        icon={<RocketIcon className="w-8 h-8 text-primary" />}
        title="Choose Your Setup Path"
        description={getDescription()}
      />

      <WizardStepContent>
        <div className="space-y-3">
          {getPathOptions().map((option) => (
            <Card
              key={option.id}
              className={`cursor-pointer transition-all ${
                selectedPath === option.id
                  ? "border-2 border-primary bg-primary/5"
                  : "border-2 border-transparent"
              } ${option.recommended ? "ring-2 ring-primary/20" : ""}`}
              onClick={() => handlePathSelect(option.id)}
            >
              <CardContent className="p-4">
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
                        <Badge   variant="secondary">
                          Recommended
                        </Badge>
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
              </CardContent>
            </Card>
          ))}
        </div>
      </WizardStepContent>
    </WizardStepContainer>
  );
}

// Step 5: Ready
interface ReadyStepProps {
  stepIndex: number;
  selectedPath: SetupPath | null;
  selectedGoal: UserGoal | null;
  selectedAgentType: AgentTypeId | null;
}

function ReadyStep({ stepIndex, selectedPath, selectedGoal, selectedAgentType }: ReadyStepProps) {
  const pathInfo = pathOptions.find((p) => p.id === selectedPath);
  const goalInfo = goalOptions.find((g) => g.id === selectedGoal);
  const agentInfo = agentTypeOptions.find((a) => a.id === selectedAgentType);

  const getNextStepDescription = () => {
    switch (selectedPath) {
      case "social_first":
        return "AI will configure your Brand Brain for social content creation - generating content pillars, voice settings, and optimal posting schedules.";
      case "voice_first":
        return "AI will set up your Brand Brain for voice agents - configuring conversation flows, call handling, and lead qualification.";
      case "hybrid":
        return "AI will configure your unified Brand Brain to power all channels - social, voice, and email working together with cross-channel workflows.";
      case "guided":
        return "You'll configure each setting step-by-step with guidance and smart defaults based on your industry.";
      default:
        return "";
    }
  };

  return (
    <WizardStepContainer stepIndex={stepIndex} completeLabel="Start Setup" hidePrev>
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

          {agentInfo && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center text-white">
                {agentInfo.icon}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Agent: {agentInfo.title}</p>
                <p className="text-sm text-gray-500">{agentInfo.description}</p>
              </div>
            </div>
          )}

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

interface BrandTemplate {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  tags?: string[];
  voiceTone: string;
  writingStyle: string;
  emojiStyle: string;
  ctaStyle: string;
  contentPillars: string[];
  targetAudience: string;
  suggestedHashtags: string[];
  sampleValues: string[];
  recommendedFor?: string[];
  popular?: boolean;
}
