"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Textarea,
  Progress,
  Accordion,
  AccordionItem,
  Chip,
  Spinner,
  Divider,
  Slider,
} from "@heroui/react";
import {
  Sparkles,
  Globe,
  Brain,
  Palette,
  Share2,
  BarChart3,
  Zap,
  Check,
  ChevronRight,
  ArrowLeft,
  Eye,
  Rocket,
  Clock,
  Edit,
  X,
  Settings2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type {
  UnderstandWizardData,
  CreateWizardData,
  DistributeWizardData,
  LearnWizardData,
  AutomateWizardData,
} from "@/lib/flywheel/types";

interface PhaseWithConfidence<T> {
  confidence: number;
  [key: string]: unknown;
}

interface FullSetupConfiguration {
  understand: Partial<UnderstandWizardData> & { confidence: number };
  create: Partial<CreateWizardData> & { confidence: number };
  distribute: Partial<DistributeWizardData> & { confidence: number };
  learn: Partial<LearnWizardData> & { confidence: number };
  automate: Partial<AutomateWizardData> & { confidence: number };
}

// Helper functions for confidence display
function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return "bg-green-500";
  if (confidence >= 0.6) return "bg-yellow-500";
  return "bg-orange-500";
}

function getConfidenceTextColor(confidence: number): string {
  if (confidence >= 0.8) return "#16a34a"; // green-600
  if (confidence >= 0.6) return "#ca8a04"; // yellow-600
  return "#ea580c"; // orange-600
}

interface BirdEyeWizardProps {
  onComplete?: () => void;
}

type SetupStep = "input" | "analyzing" | "preview" | "applying" | "complete";

export function BirdEyeWizard({ onComplete }: BirdEyeWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<SetupStep>("input");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [industry, setIndustry] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [configuration, setConfiguration] = useState<FullSetupConfiguration | null>(null);
  const [applyingPhase, setApplyingPhase] = useState<string | null>(null);
  const [appliedPhases, setAppliedPhases] = useState<string[]>([]);

  // New state for enhanced features
  const [timeSaved, setTimeSaved] = useState<number>(25);
  const [analysisTime, setAnalysisTime] = useState<number>(0);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [editingPhase, setEditingPhase] = useState<string | null>(null);
  const [editedConfig, setEditedConfig] = useState<FullSetupConfiguration | null>(null);

  // Sync editedConfig when configuration changes
  useEffect(() => {
    if (configuration) {
      setEditedConfig(configuration);
    }
  }, [configuration]);

  // Update edited config helper
  const updateEditedConfig = useCallback((phase: string, field: string, value: unknown) => {
    setEditedConfig(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [phase]: {
          ...prev[phase as keyof FullSetupConfiguration],
          [field]: value,
        },
      };
    });
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!websiteUrl) {
      setError("Please enter your website URL");
      return;
    }

    setError(null);
    setStep("analyzing");
    setAnalysisProgress(0);

    // Simulate progress while waiting for AI
    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => Math.min(prev + 1, 4));
    }, 12000); // Every 12 seconds = 5 phases in 60 seconds

    try {
      const response = await fetch("/api/flywheel/ai-full-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteUrl, industry }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error("Failed to analyze website");
      }

      const data = await response.json();
      setConfiguration(data.configuration);
      setTimeSaved(data.timeSaved || 25);
      setAnalysisTime(data.analysisTime || 0);
      setAnalysisProgress(5); // Complete
      setStep("preview");
    } catch (err) {
      clearInterval(progressInterval);
      console.error("Analysis error:", err);
      setError("Failed to analyze website. Please try again.");
      setStep("input");
    }
  }, [websiteUrl, industry]);

  const handleApplyAll = useCallback(async () => {
    // Use editedConfig if available, otherwise fall back to configuration
    const configToApply = editedConfig || configuration;
    if (!configToApply) return;

    setStep("applying");
    setAppliedPhases([]);
    const phases = ["understand", "create", "distribute", "learn", "automate"];

    for (const phase of phases) {
      setApplyingPhase(phase);
      try {
        const phaseData = configToApply[phase as keyof FullSetupConfiguration];

        // Save phase data to flywheel progress
        const response = await fetch("/api/flywheel/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phase: phase.toUpperCase(),
            data: phaseData,
            step: 0,
            status: "COMPLETED",
          }),
        });

        if (!response.ok) {
          console.error(`Failed to apply ${phase} phase`);
        }

        setAppliedPhases((prev) => [...prev, phase]);

        // Small delay for visual feedback
        await new Promise((resolve) => setTimeout(resolve, 600));
      } catch (err) {
        console.error(`Error applying ${phase}:`, err);
      }
    }

    setApplyingPhase(null);
    setStep("complete");
  }, [editedConfig, configuration]);

  // Handle switching to guided mode
  const handleSwitchToGuided = useCallback(() => {
    // Save AI config as draft to localStorage
    if (editedConfig) {
      localStorage.setItem("ai-draft-config", JSON.stringify(editedConfig));
    }
    router.push("/setup?mode=guided&ai-draft=true");
  }, [editedConfig, router]);

  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    } else {
      router.push("/setup");
    }
  };

  const handleBack = () => {
    router.push("/setup");
  };

  const phaseInfo = [
    {
      key: "understand",
      title: "Understand",
      icon: Brain,
      color: "purple",
      description: "Brand identity, voice, audiences & content pillars",
    },
    {
      key: "create",
      title: "Create",
      icon: Palette,
      color: "blue",
      description: "Content types, image generation & hashtag strategy",
    },
    {
      key: "distribute",
      title: "Distribute",
      icon: Share2,
      color: "green",
      description: "Posting schedule, platforms & automation",
    },
    {
      key: "learn",
      title: "Learn",
      icon: BarChart3,
      color: "amber",
      description: "Analytics, metrics & optimization goals",
    },
    {
      key: "automate",
      title: "Automate",
      icon: Zap,
      color: "pink",
      description: "AI autopilot settings & notifications",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="light"
          startContent={<ArrowLeft className="w-4 h-4" />}
          onPress={handleBack}
        >
          Back to Setup
        </Button>
      </div>

      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
          <Eye className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Bird&apos;s Eye AI Setup
        </h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
          Let AI configure your entire marketing flywheel in one go. Just provide your website
          and we&apos;ll analyze it to set up all 5 phases automatically.
        </p>
      </div>

      {/* Step: Input */}
      {step === "input" && (
        <Card className="max-w-xl mx-auto">
          <CardHeader className="flex-col items-start">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <h2 className="text-lg font-semibold">AI-Powered Setup</h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter your website URL to get started
            </p>
          </CardHeader>
          <CardBody className="gap-4">
            <Input
              label="Website URL"
              placeholder="https://yourcompany.com"
              value={websiteUrl}
              onValueChange={setWebsiteUrl}
              startContent={<Globe className="w-4 h-4 text-gray-400" />}
              isRequired
              description="We'll analyze your website to understand your brand"
            />

            <Input
              label="Industry (Optional)"
              placeholder="e.g., SaaS, E-commerce, Healthcare"
              value={industry}
              onValueChange={setIndustry}
              description="Helps AI tailor recommendations to your market"
            />

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <Button
              color="primary"
              size="lg"
              className="w-full mt-2"
              startContent={<Sparkles className="w-5 h-5" />}
              onPress={handleAnalyze}
            >
              Analyze & Configure
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Step: Analyzing - Enhanced Animation */}
      {step === "analyzing" && (
        <Card className="max-w-xl mx-auto">
          <CardBody className="py-12 text-center">
            {/* Animated spinner with gradient */}
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div
                className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-spin"
                style={{ clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }}
              />
              <div className="absolute inset-2 rounded-full bg-white dark:bg-gray-900" />
              <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-purple-500 animate-pulse" />
            </div>

            <h3 className="text-lg font-semibold mb-2">Analyzing Your Website...</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              AI is scanning your website and generating configurations for all 5 phases.
            </p>

            {/* Progress indicators */}
            <div className="flex items-center justify-center gap-2 mb-4">
              {phaseInfo.map((phase, i) => (
                <div
                  key={phase.key}
                  className={`h-1.5 w-12 rounded-full transition-all duration-500 ${
                    i < analysisProgress ? "bg-purple-500" : "bg-gray-200 dark:bg-gray-700"
                  }`}
                />
              ))}
            </div>

            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {phaseInfo.map((phase, i) => {
                const Icon = phase.icon;
                const isAnalyzed = i < analysisProgress;
                return (
                  <Chip
                    key={phase.key}
                    size="sm"
                    variant="flat"
                    color={isAnalyzed ? "success" : "default"}
                    startContent={isAnalyzed ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                  >
                    {phase.title}
                  </Chip>
                );
              })}
            </div>

            <p className="text-xs text-gray-400">
              Estimated time remaining: {Math.max(0, 60 - analysisProgress * 12)} seconds
            </p>
          </CardBody>
        </Card>
      )}

      {/* Step: Preview */}
      {step === "preview" && configuration && editedConfig && (
        <div className="space-y-6">
          {/* Analysis Complete Card */}
          <Card className="border-2 border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      Analysis Complete
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {editedConfig.understand.brandName || "Your brand"} - {editedConfig.understand.industry || "Industry detected"}
                    </p>
                  </div>
                </div>
                <Button
                  color="primary"
                  endContent={<Rocket className="w-4 h-4" />}
                  onPress={handleApplyAll}
                >
                  Apply All Phases
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Time Savings Banner */}
          <Card className="border-2 border-green-200 dark:border-green-800 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
            <CardBody className="p-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-green-900 dark:text-green-100 mb-1">
                    AI saved you {timeSaved}+ minutes
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                    Manual setup would take 30-45 minutes. AI configured your entire flywheel in just {analysisTime || 60} seconds.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <Chip size="sm" variant="flat" color="success" startContent={<Check className="w-3 h-3" />}>
                      Brand Brain
                    </Chip>
                    <Chip size="sm" variant="flat" color="success" startContent={<Check className="w-3 h-3" />}>
                      Content Factory
                    </Chip>
                    <Chip size="sm" variant="flat" color="success" startContent={<Check className="w-3 h-3" />}>
                      Publishing
                    </Chip>
                    <Chip size="sm" variant="flat" color="success" startContent={<Check className="w-3 h-3" />}>
                      Analytics
                    </Chip>
                    <Chip size="sm" variant="flat" color="success" startContent={<Check className="w-3 h-3" />}>
                      Autopilot
                    </Chip>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          <Accordion variant="bordered" selectionMode="multiple" defaultExpandedKeys={["understand"]}>
            {/* Understand Phase Preview */}
            <AccordionItem
              key="understand"
              aria-label="Understand Phase"
              startContent={<Brain className="w-5 h-5 text-purple-500" />}
              title={
                <div className="flex items-center gap-2">
                  <span>Understand</span>
                  <Chip size="sm" color="secondary" variant="flat">Brand Brain</Chip>
                </div>
              }
              subtitle="Brand identity, voice & audiences"
            >
              <div className="space-y-4 py-2">
                {editingPhase !== "understand" ? (
                  // View Mode
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase mb-1">Brand Name</p>
                        <p className="font-medium">{editedConfig.understand.brandName || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase mb-1">Industry</p>
                        <p className="font-medium">{editedConfig.understand.industry || "—"}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-1">Description</p>
                      <p className="text-sm">{editedConfig.understand.brandDescription || "—"}</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-1">Mission</p>
                      <p className="text-sm">{editedConfig.understand.mission || "—"}</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-1">Personality Traits</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {editedConfig.understand.personality?.map((trait, i) => (
                          <Chip key={i} size="sm" variant="flat">{trait}</Chip>
                        )) || "—"}
                      </div>
                    </div>

                    <Divider />

                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-2">Target Audiences ({editedConfig.understand.audiences?.length || 0})</p>
                      <div className="space-y-2">
                        {editedConfig.understand.audiences?.map((audience, i) => (
                          <div key={i} className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <p className="font-medium text-sm">{audience.name}</p>
                            <p className="text-xs text-gray-500">{audience.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-2">Content Pillars ({editedConfig.understand.contentPillars?.length || 0})</p>
                      <div className="flex flex-wrap gap-2">
                        {editedConfig.understand.contentPillars?.map((pillar, i) => (
                          <Chip key={i} size="sm" color="secondary" variant="flat">
                            {pillar.name} ({pillar.frequency}%)
                          </Chip>
                        ))}
                      </div>
                    </div>

                    {/* Edit Button */}
                    <div className="flex justify-end pt-2">
                      <Button
                        size="sm"
                        variant="light"
                        startContent={<Edit className="w-4 h-4" />}
                        onPress={() => setEditingPhase("understand")}
                      >
                        Edit Phase
                      </Button>
                    </div>
                  </>
                ) : (
                  // Edit Mode
                  <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Input
                      label="Brand Name"
                      value={editedConfig.understand.brandName || ""}
                      onValueChange={(v) => updateEditedConfig("understand", "brandName", v)}
                    />

                    <Textarea
                      label="Description"
                      value={editedConfig.understand.brandDescription || ""}
                      onValueChange={(v) => updateEditedConfig("understand", "brandDescription", v)}
                      minRows={2}
                    />

                    <Input
                      label="Industry"
                      value={editedConfig.understand.industry || ""}
                      onValueChange={(v) => updateEditedConfig("understand", "industry", v)}
                    />

                    <Textarea
                      label="Mission"
                      value={editedConfig.understand.mission || ""}
                      onValueChange={(v) => updateEditedConfig("understand", "mission", v)}
                      minRows={2}
                    />

                    <div className="flex gap-2 justify-end pt-2">
                      <Button
                        size="sm"
                        variant="light"
                        startContent={<X className="w-4 h-4" />}
                        onPress={() => {
                          setEditedConfig(configuration); // Reset
                          setEditingPhase(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        color="primary"
                        startContent={<Check className="w-4 h-4" />}
                        onPress={() => setEditingPhase(null)}
                      >
                        Save Changes
                      </Button>
                    </div>
                  </div>
                )}

                {/* Confidence Indicator */}
                <Divider className="my-4" />
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      AI Confidence
                    </span>
                  </div>

                  <Progress
                    value={editedConfig.understand.confidence * 100}
                    size="sm"
                    className="flex-1 max-w-[200px]"
                    classNames={{
                      indicator: getConfidenceColor(editedConfig.understand.confidence),
                    }}
                  />

                  <span
                    className="text-sm font-bold"
                    style={{ color: getConfidenceTextColor(editedConfig.understand.confidence) }}
                  >
                    {Math.round(editedConfig.understand.confidence * 100)}%
                  </span>
                </div>
              </div>
            </AccordionItem>

            {/* Create Phase Preview */}
            <AccordionItem
              key="create"
              aria-label="Create Phase"
              startContent={<Palette className="w-5 h-5 text-blue-500" />}
              title={
                <div className="flex items-center gap-2">
                  <span>Create</span>
                  <Chip size="sm" color="primary" variant="flat">Content Factory</Chip>
                </div>
              }
              subtitle="Content types & generation settings"
            >
              <div className="space-y-4 py-2">
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-2">Enabled Content Types</p>
                  <div className="flex flex-wrap gap-2">
                    {editedConfig.create.enabledTypes?.map((type, i) => (
                      <Chip key={i} size="sm" variant="flat">{type}</Chip>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">Image Generation</p>
                    <p className="font-medium">
                      {editedConfig.create.imageGeneration ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">Image Style</p>
                    <p className="font-medium">{editedConfig.create.imageStyle || "—"}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Hashtag Strategy</p>
                  <Chip size="sm" variant="flat">{editedConfig.create.hashtagStrategy || "moderate"}</Chip>
                </div>

                {editedConfig.create.savedHashtags && editedConfig.create.savedHashtags.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-2">Saved Hashtags</p>
                    <div className="flex flex-wrap gap-1">
                      {editedConfig.create.savedHashtags.map((tag, i) => (
                        <Chip key={i} size="sm" variant="flat" color="primary">{tag}</Chip>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confidence Indicator */}
                <Divider className="my-4" />
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      AI Confidence
                    </span>
                  </div>
                  <Progress
                    value={editedConfig.create.confidence * 100}
                    size="sm"
                    className="flex-1 max-w-[200px]"
                    classNames={{
                      indicator: getConfidenceColor(editedConfig.create.confidence),
                    }}
                  />
                  <span
                    className="text-sm font-bold"
                    style={{ color: getConfidenceTextColor(editedConfig.create.confidence) }}
                  >
                    {Math.round(editedConfig.create.confidence * 100)}%
                  </span>
                </div>
              </div>
            </AccordionItem>

            {/* Distribute Phase Preview */}
            <AccordionItem
              key="distribute"
              aria-label="Distribute Phase"
              startContent={<Share2 className="w-5 h-5 text-green-500" />}
              title={
                <div className="flex items-center gap-2">
                  <span>Distribute</span>
                  <Chip size="sm" color="success" variant="flat">Publishing</Chip>
                </div>
              }
              subtitle="Schedule & platform settings"
            >
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">Timezone</p>
                    <p className="font-medium">{editedConfig.distribute.timezone || "Auto-detected"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">First Post Option</p>
                    <p className="font-medium capitalize">{editedConfig.distribute.firstPostOption || "Skip"}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 uppercase mb-2">Platform Settings</p>
                  <div className="space-y-2">
                    {Object.entries(editedConfig.distribute.platformSettings || {}).map(([platform, settings]) => (
                      <div key={platform} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <span className="font-medium capitalize">{platform}</span>
                        <div className="flex items-center gap-2">
                          <Chip size="sm" color={settings.enabled ? "success" : "default"} variant="flat">
                            {settings.enabled ? "Enabled" : "Disabled"}
                          </Chip>
                          <span className="text-sm text-gray-500">
                            {settings.postingFrequency} posts/week
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Confidence Indicator */}
                <Divider className="my-4" />
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <Sparkles className="w-4 h-4 text-green-500" />
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      AI Confidence
                    </span>
                  </div>
                  <Progress
                    value={editedConfig.distribute.confidence * 100}
                    size="sm"
                    className="flex-1 max-w-[200px]"
                    classNames={{
                      indicator: getConfidenceColor(editedConfig.distribute.confidence),
                    }}
                  />
                  <span
                    className="text-sm font-bold"
                    style={{ color: getConfidenceTextColor(editedConfig.distribute.confidence) }}
                  >
                    {Math.round(editedConfig.distribute.confidence * 100)}%
                  </span>
                </div>
              </div>
            </AccordionItem>

            {/* Learn Phase Preview */}
            <AccordionItem
              key="learn"
              aria-label="Learn Phase"
              startContent={<BarChart3 className="w-5 h-5 text-amber-500" />}
              title={
                <div className="flex items-center gap-2">
                  <span>Learn</span>
                  <Chip size="sm" color="warning" variant="flat">Analytics</Chip>
                </div>
              }
              subtitle="Metrics & reporting"
            >
              <div className="space-y-4 py-2">
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-2">Priority Metrics</p>
                  <div className="flex flex-wrap gap-2">
                    {editedConfig.learn.priorityMetrics?.map((metric, i) => (
                      <Chip key={i} size="sm" color={i === 0 ? "warning" : "default"} variant="flat">
                        {metric}
                      </Chip>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">Report Frequency</p>
                    <p className="font-medium capitalize">{editedConfig.learn.reportFrequency || "Weekly"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">Email Reports</p>
                    <p className="font-medium">{editedConfig.learn.reportEmail ? "Enabled" : "Disabled"}</p>
                  </div>
                </div>

                {editedConfig.learn.optimizationGoals && editedConfig.learn.optimizationGoals.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-2">Optimization Goals</p>
                    <div className="flex flex-wrap gap-2">
                      {editedConfig.learn.optimizationGoals.map((goal, i) => (
                        <Chip
                          key={i}
                          size="sm"
                          color={goal.priority === "high" ? "warning" : "default"}
                          variant="flat"
                        >
                          {goal.metric} ({goal.priority})
                        </Chip>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confidence Indicator */}
                <Divider className="my-4" />
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      AI Confidence
                    </span>
                  </div>
                  <Progress
                    value={editedConfig.learn.confidence * 100}
                    size="sm"
                    className="flex-1 max-w-[200px]"
                    classNames={{
                      indicator: getConfidenceColor(editedConfig.learn.confidence),
                    }}
                  />
                  <span
                    className="text-sm font-bold"
                    style={{ color: getConfidenceTextColor(editedConfig.learn.confidence) }}
                  >
                    {Math.round(editedConfig.learn.confidence * 100)}%
                  </span>
                </div>
              </div>
            </AccordionItem>

            {/* Automate Phase Preview */}
            <AccordionItem
              key="automate"
              aria-label="Automate Phase"
              startContent={<Zap className="w-5 h-5 text-pink-500" />}
              title={
                <div className="flex items-center gap-2">
                  <span>Automate</span>
                  <Chip size="sm" color="danger" variant="flat">AI Autopilot</Chip>
                </div>
              }
              subtitle="Automation & notifications"
            >
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">Approval Mode</p>
                    <Chip size="sm" variant="flat" className="capitalize">
                      {editedConfig.automate.approvalMode?.replace("_", " ") || "Review"}
                    </Chip>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">Posts Per Week</p>
                    <p className="font-medium">{editedConfig.automate.postsPerWeek || 7}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 uppercase mb-2">Content Mix</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(editedConfig.automate.contentMix || {}).map(([type, percent]) => (
                      <div key={type} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <span className="text-sm capitalize">{type}</span>
                        <span className="text-sm font-medium">{percent}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Confidence Indicator */}
                <Divider className="my-4" />
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <Sparkles className="w-4 h-4 text-pink-500" />
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      AI Confidence
                    </span>
                  </div>
                  <Progress
                    value={editedConfig.automate.confidence * 100}
                    size="sm"
                    className="flex-1 max-w-[200px]"
                    classNames={{
                      indicator: getConfidenceColor(editedConfig.automate.confidence),
                    }}
                  />
                  <span
                    className="text-sm font-bold"
                    style={{ color: getConfidenceTextColor(editedConfig.automate.confidence) }}
                  >
                    {Math.round(editedConfig.automate.confidence * 100)}%
                  </span>
                </div>
              </div>
            </AccordionItem>
          </Accordion>

          {/* Action Buttons */}
          <div className="flex flex-col items-center gap-4 pt-4">
            <Button
              color="primary"
              size="lg"
              endContent={<Rocket className="w-5 h-5" />}
              onPress={handleApplyAll}
            >
              Apply All Phases & Activate
            </Button>

            {/* Escape Hatch Button */}
            <Button
              variant="light"
              color="default"
              startContent={<Settings2 className="w-4 h-4" />}
              onPress={handleSwitchToGuided}
            >
              Customize Manually Instead
            </Button>
          </div>
        </div>
      )}

      {/* Step: Applying - Enhanced with percentage */}
      {step === "applying" && (
        <Card className="max-w-xl mx-auto">
          <CardBody className="py-8">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">
                Applying Configuration...
              </h3>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                {Math.round((appliedPhases.length / phaseInfo.length) * 100)}%
              </p>
              <p className="text-sm text-gray-500">
                {appliedPhases.length} of {phaseInfo.length} phases complete
              </p>
            </div>

            <div className="space-y-3">
              {phaseInfo.map((phase) => {
                const Icon = phase.icon;
                const isApplying = applyingPhase === phase.key;
                const isApplied = appliedPhases.includes(phase.key);

                return (
                  <div
                    key={phase.key}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
                      isApplied
                        ? "bg-green-50 dark:bg-green-950/30 scale-[1.01]"
                        : isApplying
                          ? "bg-purple-50 dark:bg-purple-950/30 scale-[1.02] shadow-sm"
                          : "bg-gray-50 dark:bg-gray-800"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      isApplied
                        ? "bg-green-500"
                        : isApplying
                          ? "bg-purple-500 animate-pulse"
                          : "bg-gray-200 dark:bg-gray-700"
                    }`}>
                      {isApplied ? (
                        <Check className="w-4 h-4 text-white" />
                      ) : isApplying ? (
                        <Spinner size="sm" color="white" />
                      ) : (
                        <Icon className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${isApplied ? "text-green-700 dark:text-green-300" : ""}`}>
                        {phase.title}
                      </p>
                      <p className="text-xs text-gray-500">{phase.description}</p>
                    </div>
                    {isApplying && (
                      <Chip size="sm" color="secondary" variant="flat" className="animate-pulse">
                        Applying...
                      </Chip>
                    )}
                    {isApplied && (
                      <Chip size="sm" color="success" variant="flat">
                        <Check className="w-3 h-3 mr-1" />
                        Done
                      </Chip>
                    )}
                  </div>
                );
              })}
            </div>

            <Progress
              size="md"
              value={(appliedPhases.length / phaseInfo.length) * 100}
              className="mt-6"
              classNames={{
                indicator: "bg-gradient-to-r from-purple-500 to-pink-500",
                track: "h-3",
              }}
            />
          </CardBody>
        </Card>
      )}

      {/* Step: Complete - Enhanced with time saved callout */}
      {step === "complete" && (
        <div className="space-y-6">
          {/* Success Card */}
          <Card className="max-w-xl mx-auto border-2 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20">
            <CardBody className="py-12 text-center">
              {/* Animated Success Icon */}
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-25" />
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30">
                  <Check className="w-10 h-10 text-white" />
                </div>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Setup Complete!
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Your entire marketing flywheel is now configured and ready to go.
              </p>

              {/* Time Saved Callout */}
              <div className="bg-white/70 dark:bg-gray-800/70 rounded-xl p-4 mb-6 inline-flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm text-gray-500 dark:text-gray-400">You saved</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">
                    {timeSaved}+ minutes
                  </p>
                </div>
              </div>

              {/* Phase Summary */}
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {phaseInfo.map((phase) => {
                  const Icon = phase.icon;
                  return (
                    <Chip
                      key={phase.key}
                      size="sm"
                      variant="flat"
                      color="success"
                      startContent={<Icon className="w-3 h-3" />}
                    >
                      {phase.title}
                    </Chip>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="flat"
                  startContent={<Settings2 className="w-4 h-4" />}
                  onPress={() => router.push("/setup")}
                >
                  Review All Phases
                </Button>
                <Button
                  color="success"
                  size="lg"
                  endContent={<ChevronRight className="w-4 h-4" />}
                  onPress={handleComplete}
                >
                  Go to Dashboard
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
