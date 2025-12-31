"use client";

import { useState, useCallback } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Progress,
  Accordion,
  AccordionItem,
  Chip,
  Spinner,
  Divider,
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
} from "lucide-react";
import { useRouter } from "next/navigation";
import type {
  UnderstandWizardData,
  CreateWizardData,
  DistributeWizardData,
  LearnWizardData,
  AutomateWizardData,
} from "@/lib/flywheel/types";

interface FullSetupConfiguration {
  understand: Partial<UnderstandWizardData>;
  create: Partial<CreateWizardData>;
  distribute: Partial<DistributeWizardData>;
  learn: Partial<LearnWizardData>;
  automate: Partial<AutomateWizardData>;
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

  const handleAnalyze = useCallback(async () => {
    if (!websiteUrl) {
      setError("Please enter your website URL");
      return;
    }

    setError(null);
    setStep("analyzing");

    try {
      const response = await fetch("/api/flywheel/ai-full-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteUrl, industry }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze website");
      }

      const data = await response.json();
      setConfiguration(data.configuration);
      setStep("preview");
    } catch (err) {
      console.error("Analysis error:", err);
      setError("Failed to analyze website. Please try again.");
      setStep("input");
    }
  }, [websiteUrl, industry]);

  const handleApplyAll = useCallback(async () => {
    if (!configuration) return;

    setStep("applying");
    const phases = ["understand", "create", "distribute", "learn", "automate"];

    for (const phase of phases) {
      setApplyingPhase(phase);
      try {
        const phaseData = configuration[phase as keyof FullSetupConfiguration];

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
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (err) {
        console.error(`Error applying ${phase}:`, err);
      }
    }

    setApplyingPhase(null);
    setStep("complete");
  }, [configuration]);

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

      {/* Step: Analyzing */}
      {step === "analyzing" && (
        <Card className="max-w-xl mx-auto">
          <CardBody className="py-12 text-center">
            <Spinner size="lg" color="secondary" className="mb-4" />
            <h3 className="text-lg font-semibold mb-2">Analyzing Your Website...</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              AI is scanning your website and generating configurations for all 5 phases.
              This may take 30-60 seconds.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {phaseInfo.map((phase) => (
                <Chip key={phase.key} size="sm" variant="flat" color="default">
                  {phase.title}
                </Chip>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Step: Preview */}
      {step === "preview" && configuration && (
        <div className="space-y-6">
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
                      {configuration.understand.brandName || "Your brand"} - {configuration.understand.industry || "Industry detected"}
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

          <Accordion variant="bordered" selectionMode="multiple" defaultExpandedKeys={["understand"]}>
            {/* Understand Phase Preview */}
            <AccordionItem
              key="understand"
              aria-label="Understand Phase"
              startContent={<Brain className="w-5 h-5 text-purple-500" />}
              title={
                <div className="flex items-center gap-2">
                  <span>Understand</span>
                  <Chip size="sm" color="purple" variant="flat">Brand Brain</Chip>
                </div>
              }
              subtitle="Brand identity, voice & audiences"
            >
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">Brand Name</p>
                    <p className="font-medium">{configuration.understand.brandName || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">Industry</p>
                    <p className="font-medium">{configuration.understand.industry || "—"}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Description</p>
                  <p className="text-sm">{configuration.understand.brandDescription || "—"}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Mission</p>
                  <p className="text-sm">{configuration.understand.mission || "—"}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Personality Traits</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {configuration.understand.personality?.map((trait, i) => (
                      <Chip key={i} size="sm" variant="flat">{trait}</Chip>
                    )) || "—"}
                  </div>
                </div>

                <Divider />

                <div>
                  <p className="text-xs text-gray-500 uppercase mb-2">Target Audiences ({configuration.understand.audiences?.length || 0})</p>
                  <div className="space-y-2">
                    {configuration.understand.audiences?.map((audience, i) => (
                      <div key={i} className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="font-medium text-sm">{audience.name}</p>
                        <p className="text-xs text-gray-500">{audience.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 uppercase mb-2">Content Pillars ({configuration.understand.contentPillars?.length || 0})</p>
                  <div className="flex flex-wrap gap-2">
                    {configuration.understand.contentPillars?.map((pillar, i) => (
                      <Chip key={i} size="sm" color="secondary" variant="flat">
                        {pillar.name} ({pillar.frequency}%)
                      </Chip>
                    ))}
                  </div>
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
                    {configuration.create.enabledTypes?.map((type, i) => (
                      <Chip key={i} size="sm" variant="flat">{type}</Chip>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">Image Generation</p>
                    <p className="font-medium">
                      {configuration.create.imageGeneration ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">Image Style</p>
                    <p className="font-medium">{configuration.create.imageStyle || "—"}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Hashtag Strategy</p>
                  <Chip size="sm" variant="flat">{configuration.create.hashtagStrategy || "moderate"}</Chip>
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
                    <p className="font-medium">{configuration.distribute.timezone || "Auto-detected"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">First Post Option</p>
                    <p className="font-medium">{configuration.distribute.firstPostOption || "Skip"}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 uppercase mb-2">Platform Settings</p>
                  <div className="space-y-2">
                    {Object.entries(configuration.distribute.platformSettings || {}).map(([platform, settings]) => (
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
                    {configuration.learn.priorityMetrics?.map((metric, i) => (
                      <Chip key={i} size="sm" color={i === 0 ? "warning" : "default"} variant="flat">
                        {metric}
                      </Chip>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">Report Frequency</p>
                    <p className="font-medium capitalize">{configuration.learn.reportFrequency || "Weekly"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">Email Reports</p>
                    <p className="font-medium">{configuration.learn.reportEmail ? "Enabled" : "Disabled"}</p>
                  </div>
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
                      {configuration.automate.approvalMode?.replace("_", " ") || "Review"}
                    </Chip>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">Posts Per Week</p>
                    <p className="font-medium">{configuration.automate.postsPerWeek || 7}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 uppercase mb-2">Content Mix</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(configuration.automate.contentMix || {}).map(([type, percent]) => (
                      <div key={type} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <span className="text-sm capitalize">{type}</span>
                        <span className="text-sm font-medium">{percent}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </AccordionItem>
          </Accordion>

          <div className="flex justify-center pt-4">
            <Button
              color="primary"
              size="lg"
              endContent={<Rocket className="w-5 h-5" />}
              onPress={handleApplyAll}
            >
              Apply All Phases & Activate
            </Button>
          </div>
        </div>
      )}

      {/* Step: Applying */}
      {step === "applying" && (
        <Card className="max-w-xl mx-auto">
          <CardBody className="py-8">
            <h3 className="text-lg font-semibold text-center mb-6">
              Applying Configuration...
            </h3>

            <div className="space-y-3">
              {phaseInfo.map((phase) => {
                const Icon = phase.icon;
                const isApplying = applyingPhase === phase.key;
                const isApplied = appliedPhases.includes(phase.key);

                return (
                  <div
                    key={phase.key}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      isApplied
                        ? "bg-green-50 dark:bg-green-950/30"
                        : isApplying
                          ? "bg-purple-50 dark:bg-purple-950/30"
                          : "bg-gray-50 dark:bg-gray-800"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isApplied
                        ? "bg-green-500"
                        : isApplying
                          ? "bg-purple-500"
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
                      <Chip size="sm" color="secondary" variant="flat">
                        Applying...
                      </Chip>
                    )}
                    {isApplied && (
                      <Chip size="sm" color="success" variant="flat">
                        Done
                      </Chip>
                    )}
                  </div>
                );
              })}
            </div>

            <Progress
              size="sm"
              value={(appliedPhases.length / phaseInfo.length) * 100}
              className="mt-6"
              classNames={{
                indicator: "bg-gradient-to-r from-purple-500 to-pink-500",
              }}
            />
          </CardBody>
        </Card>
      )}

      {/* Step: Complete */}
      {step === "complete" && (
        <Card className="max-w-xl mx-auto border-2 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
          <CardBody className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Setup Complete!
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              All 5 phases have been configured with AI-generated settings.
              You can review and customize each phase individually.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="flat"
                onPress={() => router.push("/setup")}
              >
                Review All Phases
              </Button>
              <Button
                color="success"
                endContent={<ChevronRight className="w-4 h-4" />}
                onPress={handleComplete}
              >
                Go to Dashboard
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
