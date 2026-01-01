"use client";

/**
 * Streamlined Flywheel Wizard
 *
 * 12-step unified wizard for guided setup mode.
 * Reduces the full 32-step experience to essential configuration
 * with smart defaults from industry templates.
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardBody,
  CardHeader,
  Progress,
  Button,
  Link,
  Chip,
} from "@heroui/react";
import { useWizardAutoSave, getSaveStatusText } from "@/hooks/use-wizard-autosave";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Sparkles,
  Home,
  ChevronRight as ChevronRightIcon,
  Brain,
  Palette,
  Target,
  FileText,
  PenTool,
  Share2,
  Calendar,
  Send,
  BarChart2,
  Goal,
  Zap,
  CheckCircle2,
  Cloud,
  CloudOff,
  Loader2,
} from "lucide-react";
import type {
  FlywheelPhase,
  UnderstandWizardData,
  CreateWizardData,
  DistributeWizardData,
  LearnWizardData,
  AutomateWizardData,
  AudienceData,
  ContentPillarData,
  ContentType,
  MetricType,
  OptimizationGoal,
} from "@/lib/flywheel/types";
import { INDUSTRY_TEMPLATES } from "@/lib/flywheel/constants";

// Import streamlined step components
import {
  BrandIdentityStep,
  VoiceToneStep,
  ContentStrategyStep,
  ContentTypesStep,
  FirstContentStep,
  ConnectAccountsStep,
  PostingScheduleStep,
  FirstPostStep,
  KeyMetricsStep,
  OptimizationGoalsStep,
  AutopilotSettingsStep,
  ReviewActivateStep,
} from "./streamlined-steps";

// ============================================================================
// Types
// ============================================================================

export interface StreamlinedWizardData {
  // Brand identification
  brandId?: string;

  // UNDERSTAND phase
  industry?: string;
  brandName?: string;
  brandDescription?: string;
  mission?: string;
  formality?: number;
  personality?: string[];
  personalityTraits?: string[];
  writingStyle?: string;
  audiences?: AudienceData[];
  targetAudiences?: AudienceData[];
  contentPillars?: ContentPillarData[];

  // CREATE phase
  enabledTypes?: ContentType[];
  enabledContentTypes?: string[];
  generatedContent?: Array<{
    id?: string;
    topic: string;
    content: string;
    platform: string;
    status: "draft" | "approved" | "scheduled";
  }>;

  // DISTRIBUTE phase
  connectedAccounts?: Array<{
    id?: string;
    platform: string;
    handle?: string;
    username?: string;
    connected?: boolean;
  }>;
  schedule?: Record<string, Array<{ time: string; platforms: string[] }>>;
  postingSchedule?: Record<string, Array<{ time: string; enabled: boolean }>>;
  timezone?: string;
  firstPostOption?: "skip" | "schedule" | "publish";
  firstPostAction?: "skip" | "schedule" | "publish_now";
  selectedPostId?: string;
  scheduledTime?: string;

  // LEARN phase
  priorityMetrics?: MetricType[] | string[];
  optimizationGoals?: OptimizationGoal[];
  reportFrequency?: "weekly" | "biweekly" | "monthly";
  primaryGoal?: OptimizationGoal | string;
  optimizationTarget?: number;

  // AUTOMATE phase
  approvalMode?: "review" | "auto_queue" | "auto_post";
  postsPerWeek?: number;
  contentMix?: {
    educational: number;
    promotional: number;
    entertaining: number;
    engaging: number;
  };

  // Activation
  activated?: boolean;
  activatedAt?: string;
}

export interface StreamlinedStep {
  id: string;
  title: string;
  description: string;
  phase: FlywheelPhase;
  aiAssisted: boolean;
  icon: React.ReactNode;
}

// ============================================================================
// Constants
// ============================================================================

const PHASE_COLORS: Record<FlywheelPhase, string> = {
  UNDERSTAND: "purple",
  CREATE: "blue",
  DISTRIBUTE: "green",
  LEARN: "orange",
  AUTOMATE: "pink",
};

const STREAMLINED_STEPS: StreamlinedStep[] = [
  // UNDERSTAND (3 steps)
  {
    id: "identity",
    title: "Brand Identity",
    description: "Define your brand name, description, mission, and industry",
    phase: "UNDERSTAND",
    aiAssisted: true,
    icon: <Brain className="w-5 h-5" />,
  },
  {
    id: "voice",
    title: "Voice & Tone",
    description: "Set your communication style and personality",
    phase: "UNDERSTAND",
    aiAssisted: true,
    icon: <Palette className="w-5 h-5" />,
  },
  {
    id: "strategy",
    title: "Content Strategy",
    description: "Define target audiences and content pillars",
    phase: "UNDERSTAND",
    aiAssisted: true,
    icon: <Target className="w-5 h-5" />,
  },
  // CREATE (2 steps)
  {
    id: "types",
    title: "Content Types",
    description: "Enable the post types you want to create",
    phase: "CREATE",
    aiAssisted: false,
    icon: <FileText className="w-5 h-5" />,
  },
  {
    id: "first-content",
    title: "First Content",
    description: "Generate your first posts using Brand Brain",
    phase: "CREATE",
    aiAssisted: true,
    icon: <PenTool className="w-5 h-5" />,
  },
  // DISTRIBUTE (3 steps)
  {
    id: "connect",
    title: "Connect Accounts",
    description: "Link your social media accounts",
    phase: "DISTRIBUTE",
    aiAssisted: false,
    icon: <Share2 className="w-5 h-5" />,
  },
  {
    id: "schedule",
    title: "Posting Schedule",
    description: "Set up your weekly posting schedule",
    phase: "DISTRIBUTE",
    aiAssisted: true,
    icon: <Calendar className="w-5 h-5" />,
  },
  {
    id: "first-post",
    title: "First Post",
    description: "Schedule or publish your first content",
    phase: "DISTRIBUTE",
    aiAssisted: false,
    icon: <Send className="w-5 h-5" />,
  },
  // LEARN (2 steps)
  {
    id: "metrics",
    title: "Key Metrics",
    description: "Select the metrics that matter most to you",
    phase: "LEARN",
    aiAssisted: false,
    icon: <BarChart2 className="w-5 h-5" />,
  },
  {
    id: "goals",
    title: "Optimization Goals",
    description: "Tell AI what to optimize for",
    phase: "LEARN",
    aiAssisted: true,
    icon: <Goal className="w-5 h-5" />,
  },
  // AUTOMATE (2 steps)
  {
    id: "autopilot",
    title: "Autopilot Settings",
    description: "Configure automation preferences",
    phase: "AUTOMATE",
    aiAssisted: true,
    icon: <Zap className="w-5 h-5" />,
  },
  {
    id: "activate",
    title: "Review & Activate",
    description: "Review settings and activate your flywheel",
    phase: "AUTOMATE",
    aiAssisted: false,
    icon: <CheckCircle2 className="w-5 h-5" />,
  },
];

// ============================================================================
// Component
// ============================================================================

interface StreamlinedFlywheelWizardProps {
  initialData?: Partial<StreamlinedWizardData>;
  brandId: string;
  onSaveProgress?: (data: StreamlinedWizardData, step: number) => Promise<void>;
}

export function StreamlinedFlywheelWizard({
  initialData,
  brandId,
  onSaveProgress,
}: StreamlinedFlywheelWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardData, setWizardData] = useState<StreamlinedWizardData>(
    initialData || getDefaultData()
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  // Auto-save hook for debounced progress persistence
  const { saveProgress: autoSave, saveStatus, lastSaved } = useWizardAutoSave({
    brandId,
    setupPath: "GUIDED",
    debounceMs: 1500,
  });

  const totalSteps = STREAMLINED_STEPS.length;
  const currentStepInfo = STREAMLINED_STEPS[currentStep];
  const currentPhase = currentStepInfo.phase;
  const phaseColor = PHASE_COLORS[currentPhase];
  const progressPercent = Math.round(((currentStep + 1) / totalSteps) * 100);

  // Group steps by phase for the progress indicator
  const phaseGroups = useMemo(() => {
    const groups: Record<FlywheelPhase, number[]> = {
      UNDERSTAND: [],
      CREATE: [],
      DISTRIBUTE: [],
      LEARN: [],
      AUTOMATE: [],
    };
    STREAMLINED_STEPS.forEach((step, index) => {
      groups[step.phase].push(index);
    });
    return groups;
  }, []);

  // Auto-save when wizard data changes (debounced)
  useEffect(() => {
    // Skip auto-save if no brand ID or data is at initial state
    if (!brandId || !wizardData.brandName) return;

    const stepId = currentStepInfo?.id || "unknown";
    autoSave(currentStep, stepId, wizardData as Record<string, unknown>);
  }, [wizardData, currentStep, brandId, autoSave, currentStepInfo?.id]);

  // Update wizard data
  const updateData = useCallback(
    (updates: Partial<StreamlinedWizardData>) => {
      setWizardData((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  // Handle navigation
  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleNext = useCallback(async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      // Save progress
      if (onSaveProgress) {
        await onSaveProgress(wizardData, currentStep);
      } else {
        await saveProgressToAPI(brandId, wizardData, currentStep);
      }

      // Move to next step
      if (currentStep < totalSteps - 1) {
        setCurrentStep(currentStep + 1);
      }
    } catch (error) {
      console.error("Error saving progress:", error);
    } finally {
      setIsSaving(false);
    }
  }, [currentStep, totalSteps, wizardData, brandId, isSaving, onSaveProgress]);

  const handleActivate = useCallback(async () => {
    if (isActivating) return;

    setIsActivating(true);
    try {
      // Save final data
      if (onSaveProgress) {
        await onSaveProgress({ ...wizardData, activated: true }, currentStep);
      } else {
        await activateFlywheel(brandId, wizardData);
      }

      // Redirect to dashboard
      router.push("/dashboard?setup=complete");
    } catch (error) {
      console.error("Error activating flywheel:", error);
    } finally {
      setIsActivating(false);
    }
  }, [wizardData, brandId, isActivating, router, currentStep, onSaveProgress]);

  const handleClose = () => {
    router.push("/setup");
  };

  const handleStepClick = (stepIndex: number) => {
    // Only allow clicking on completed or current steps
    if (stepIndex <= currentStep) {
      setCurrentStep(stepIndex);
    }
  };

  // Handle going to a specific step (for ReviewActivateStep)
  const handleGoToStep = useCallback((step: number) => {
    if (step >= 0 && step < totalSteps) {
      setCurrentStep(step);
    }
  }, [totalSteps]);

  // Render current step content
  const renderStepContent = () => {
    switch (currentStepInfo.id) {
      // UNDERSTAND Phase (Steps 1-3)
      case "identity":
        return (
          <BrandIdentityStep
            data={wizardData}
            updateData={updateData}
            industryTemplates={INDUSTRY_TEMPLATES}
          />
        );
      case "voice":
        return <VoiceToneStep data={wizardData} updateData={updateData} />;
      case "strategy":
        return <ContentStrategyStep data={wizardData} updateData={updateData} />;

      // CREATE Phase (Steps 4-5)
      case "types":
        return <ContentTypesStep data={wizardData} updateData={updateData} />;
      case "first-content":
        return <FirstContentStep data={wizardData} updateData={updateData} />;

      // DISTRIBUTE Phase (Steps 6-8)
      case "connect":
        return <ConnectAccountsStep data={wizardData} updateData={updateData} />;
      case "schedule":
        return <PostingScheduleStep data={wizardData} updateData={updateData} />;
      case "first-post":
        return <FirstPostStep data={wizardData} updateData={updateData} />;

      // LEARN Phase (Steps 9-10)
      case "metrics":
        return <KeyMetricsStep data={wizardData} updateData={updateData} />;
      case "goals":
        return <OptimizationGoalsStep data={wizardData} updateData={updateData} />;

      // AUTOMATE Phase (Steps 11-12)
      case "autopilot":
        return <AutopilotSettingsStep data={wizardData} updateData={updateData} />;
      case "activate":
        return (
          <ReviewActivateStep
            data={wizardData}
            updateData={updateData}
            onGoToStep={handleGoToStep}
          />
        );

      default:
        return (
          <div className="text-center py-12 text-gray-500">
            <p>Unknown step: {currentStepInfo.id}</p>
          </div>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Breadcrumb Navigation */}
      <nav
        className="flex items-center gap-2 text-sm mb-4"
        aria-label="Breadcrumb"
      >
        <Link
          href="/dashboard"
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1"
        >
          <Home className="w-4 h-4" />
          <span>Dashboard</span>
        </Link>
        <ChevronRightIcon className="w-4 h-4 text-gray-400" />
        <Link
          href="/setup"
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Setup
        </Link>
        <ChevronRightIcon className="w-4 h-4 text-gray-400" />
        <span className="text-gray-900 dark:text-white font-medium">
          Guided Setup
        </span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${phaseColor}-100 dark:bg-${phaseColor}-900/30 text-${phaseColor}-600 dark:text-${phaseColor}-400`}
          >
            {currentStepInfo.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Guided Setup
              </h1>
              <Chip
                size="sm"
                variant="flat"
                color={
                  phaseColor === "purple"
                    ? "secondary"
                    : phaseColor === "blue"
                      ? "primary"
                      : phaseColor === "green"
                        ? "success"
                        : phaseColor === "orange"
                          ? "warning"
                          : "danger"
                }
              >
                {currentPhase}
              </Chip>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              12 steps to activate your AI marketing flywheel
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Auto-save Status Indicator */}
          {saveStatus !== "idle" && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              {saveStatus === "saving" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : saveStatus === "saved" ? (
                <Cloud className="w-3.5 h-3.5 text-success" />
              ) : saveStatus === "error" ? (
                <CloudOff className="w-3.5 h-3.5 text-danger" />
              ) : null}
              <span className={saveStatus === "error" ? "text-danger" : ""}>
                {getSaveStatusText(saveStatus)}
              </span>
            </div>
          )}

          <Button
            isIconOnly
            variant="light"
            onPress={handleClose}
            aria-label="Close wizard"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Progress Card */}
      <Card className="mb-6">
        <CardBody className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Step {currentStep + 1} of {totalSteps}
            </span>
            <span
              className={`text-sm font-semibold text-${phaseColor}-600 dark:text-${phaseColor}-400`}
            >
              {progressPercent}%
            </span>
          </div>
          <Progress
            size="sm"
            value={progressPercent}
            classNames={{
              indicator: `bg-${phaseColor}-500`,
              track: "bg-gray-100 dark:bg-gray-800",
            }}
          />

          {/* Phase Progress Indicators */}
          <div className="flex items-center justify-between mt-4 gap-1 overflow-x-auto pb-2">
            {STREAMLINED_STEPS.map((step, index) => {
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;
              const stepPhaseColor = PHASE_COLORS[step.phase];

              return (
                <button
                  key={step.id}
                  onClick={() => handleStepClick(index)}
                  disabled={index > currentStep}
                  className={`flex flex-col items-center min-w-[48px] transition-all ${
                    index <= currentStep
                      ? "cursor-pointer hover:opacity-80"
                      : "cursor-not-allowed opacity-50"
                  }`}
                  title={step.title}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                      isCompleted
                        ? `bg-${stepPhaseColor}-500 text-white`
                        : isCurrent
                          ? `bg-${stepPhaseColor}-100 text-${stepPhaseColor}-700 dark:bg-${stepPhaseColor}-900/50 dark:text-${stepPhaseColor}-400 ring-2 ring-${stepPhaseColor}-500`
                          : "bg-gray-100 text-gray-400 dark:bg-gray-800"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span
                    className={`text-[10px] mt-1 text-center hidden md:block truncate max-w-[60px] ${
                      isCurrent
                        ? "text-gray-900 dark:text-white font-medium"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {step.title}
                  </span>
                </button>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* Current Step Content */}
      <Card className="mb-6">
        <CardHeader className="pb-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {currentStepInfo.title}
            </h2>
            {currentStepInfo.aiAssisted && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400">
                <Sparkles className="w-3 h-3" />
                AI-Assisted
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {currentStepInfo.description}
          </p>
        </CardHeader>
        <CardBody className="pt-4">{renderStepContent()}</CardBody>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="flat"
          startContent={<ChevronLeft className="w-4 h-4" />}
          onPress={handleBack}
          isDisabled={currentStep === 0 || isSaving || isActivating}
        >
          Back
        </Button>

        <div className="flex items-center gap-3">
          {currentStep === totalSteps - 1 ? (
            <Button
              color="success"
              endContent={<Check className="w-4 h-4" />}
              onPress={handleActivate}
              isLoading={isActivating}
            >
              Activate Flywheel
            </Button>
          ) : (
            <Button
              color="primary"
              endContent={<ChevronRight className="w-4 h-4" />}
              onPress={handleNext}
              isLoading={isSaving}
            >
              {isSaving ? "Saving..." : "Next"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getDefaultData(): StreamlinedWizardData {
  return {
    formality: 3,
    personality: [],
    writingStyle: "conversational",
    audiences: [],
    contentPillars: [],
    enabledTypes: ["text", "image"],
    priorityMetrics: ["engagement", "reach"],
    approvalMode: "review",
    postsPerWeek: 7,
    contentMix: {
      educational: 40,
      promotional: 20,
      entertaining: 20,
      engaging: 20,
    },
  };
}

async function saveProgressToAPI(
  brandId: string,
  data: StreamlinedWizardData,
  step: number
): Promise<void> {
  const response = await fetch("/api/flywheel/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      brandId,
      setupPath: "GUIDED",
      currentStep: step,
      data,
      overallProgress: Math.round(((step + 1) / 12) * 100),
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to save progress");
  }
}

async function activateFlywheel(
  brandId: string,
  data: StreamlinedWizardData
): Promise<void> {
  const response = await fetch("/api/flywheel/activate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      brandId,
      setupPath: "GUIDED",
      data,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to activate flywheel");
  }
}
