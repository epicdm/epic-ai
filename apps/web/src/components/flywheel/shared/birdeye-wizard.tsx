"use client";

import { useState, useCallback, useEffect } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Facebook,
  CheckCircle,
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
  initialWebsiteUrl?: string;
  connectedFacebookPage?: { name: string };
  brandId?: string;
}

type SetupStep = "input" | "analyzing" | "preview" | "applying" | "complete";

export function BirdEyeWizard({ onComplete, initialWebsiteUrl, connectedFacebookPage: initialFacebookPage, brandId }: BirdEyeWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<SetupStep>("input");
  const [websiteUrl, setWebsiteUrl] = useState(initialWebsiteUrl || "");
  const [industry, setIndustry] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configuration, setConfiguration] = useState<FullSetupConfiguration | null>(null);
  const [applyingPhase, setApplyingPhase] = useState<string | null>(null);
  const [appliedPhases, setAppliedPhases] = useState<string[]>([]);

  // Dual-source state: both Facebook and Website can be used together
  const [connectedFacebookPage, setConnectedFacebookPage] = useState<{ name: string } | undefined>(initialFacebookPage);
  const [isConnectingFacebook, setIsConnectingFacebook] = useState(false);
  const [useFacebook, setUseFacebook] = useState(!!initialFacebookPage);
  const [useWebsite, setUseWebsite] = useState(true); // Website is default ON

  // New state for enhanced features
  const [timeSaved, setTimeSaved] = useState<number>(25);
  const [analysisTime, setAnalysisTime] = useState<number>(0);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [editingPhase, setEditingPhase] = useState<string | null>(null);
  const [editedConfig, setEditedConfig] = useState<FullSetupConfiguration | null>(null);

  // Listen for OAuth popup completion
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SOCIAL_CONNECT_SUCCESS' && event.data?.platform === 'meta') {
        // Facebook connected successfully
        setIsConnectingFacebook(false);
        setUseFacebook(true);
        // Fetch the connected page info
        fetchConnectedFacebookPage();
      } else if (event.data?.type === 'SOCIAL_CONNECT_ERROR' && event.data?.platform === 'meta') {
        setIsConnectingFacebook(false);
        setError('Failed to connect Facebook. Please try again.');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Fetch connected Facebook page info
  const fetchConnectedFacebookPage = useCallback(async () => {
    try {
      const response = await fetch('/api/social/accounts');
      if (response.ok) {
        const accounts = await response.json();
        const facebookAccount = accounts.find((acc: { platform: string; accountName?: string; username?: string }) =>
          acc.platform === 'FACEBOOK' || acc.platform === 'facebook'
        );
        if (facebookAccount) {
          setConnectedFacebookPage({ name: facebookAccount.accountName || facebookAccount.username || 'Facebook Page' });
        }
      }
    } catch (err) {
      console.error('Error fetching Facebook page:', err);
    }
  }, []);

  // Handle Facebook connection
  const handleConnectFacebook = useCallback(async () => {
    if (!brandId) {
      setError('Brand not found. Please complete onboarding first.');
      return;
    }

    setIsConnectingFacebook(true);
    setError(null);

    // Open Facebook OAuth in popup window
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    window.open(
      `/api/social/connect/meta?brandId=${brandId}&platform=facebook&returnUrl=/setup/ai-setup`,
      'facebook-oauth',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
    );
  }, [brandId]);

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
    // Validate at least one source is selected and has data
    if (!useWebsite && !useFacebook) {
      setError("Please select at least one data source");
      return;
    }

    if (useWebsite && !websiteUrl) {
      setError("Please enter your website URL");
      return;
    }

    if (useFacebook && !connectedFacebookPage) {
      setError("Please connect a Facebook page first");
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
      // Determine data source type for API
      const dataSource = useFacebook && useWebsite ? "both" : (useFacebook ? "facebook" : "website");

      const response = await fetch("/api/flywheel/ai-full-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteUrl: useWebsite ? websiteUrl : undefined,
          facebookPage: useFacebook ? connectedFacebookPage?.name : undefined,
          industry,
          dataSource,
        }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const sourceLabel = useFacebook && useWebsite ? "sources" : (useFacebook ? "Facebook page" : "website");
        throw new Error(`Failed to analyze ${sourceLabel}`);
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
      const sourceLabel = useFacebook && useWebsite ? "your sources" : (useFacebook ? "Facebook page" : "website");
      setError(`Failed to analyze ${sourceLabel}. Please try again.`);
      setStep("input");
    }
  }, [websiteUrl, industry, useFacebook, useWebsite, connectedFacebookPage]);

  const handleApplyAll = useCallback(async () => {
    // Use editedConfig if available, otherwise fall back to configuration
    const configToApply = editedConfig || configuration;
    if (!configToApply) return;

    setStep("applying");
    setAppliedPhases([]);
    const phases = ["understand", "create", "distribute", "learn", "automate"];

    // Review step indices for each phase (last step of each wizard)
    const reviewStepIndices: Record<string, number> = {
      understand: 8,
      create: 5,
      distribute: 5,
      learn: 4,
      automate: 5,
    };

    for (const phase of phases) {
      setApplyingPhase(phase);
      try {
        const phaseData = configToApply[phase as keyof FullSetupConfiguration];

        // Save phase data to flywheel progress using the correct PATCH endpoint
        // Include currentStep so Review button shows the review step
        const response = await fetch(`/api/flywheel/phases/${phase}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "COMPLETED",
            data: phaseData,
            currentStep: reviewStepIndices[phase],
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
      router.push("/dashboard");
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
          variant="ghost"
          
          onClick={handleBack}
        ><ArrowLeft className="w-4 h-4" /> 
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
              Connect your data sources and let AI build your marketing flywheel
            </p>
          </CardHeader>
          <CardContent className="gap-4">
            {/* Dual-Source Selection - Toggle cards */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Data Sources <span className="text-gray-400 font-normal">(select one or both)</span>
              </p>

              {/* Website Source Card */}
              <button
                type="button"
                onClick={() => setUseWebsite(!useWebsite)}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                  useWebsite
                    ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      useWebsite ? "bg-purple-500 text-white" : "bg-gray-100 dark:bg-gray-800"
                    }`}>
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Website</p>
                      <p className="text-xs text-gray-500">Analyze your website content</p>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    useWebsite ? "border-purple-500 bg-purple-500" : "border-gray-300"
                  }`}>
                    {useWebsite && <Check className="w-4 h-4 text-white" />}
                  </div>
                </div>
                {initialWebsiteUrl && useWebsite && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>URL provided from onboarding</span>
                  </div>
                )}
              </button>

              {/* Facebook Source Card */}
              <div
                className={`w-full p-4 rounded-xl border-2 transition-all ${
                  useFacebook && connectedFacebookPage
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                    : "border-gray-200 dark:border-gray-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      useFacebook && connectedFacebookPage ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-gray-800"
                    }`}>
                      <Facebook className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Facebook Page</p>
                      <p className="text-xs text-gray-500">
                        {connectedFacebookPage ? connectedFacebookPage.name : "Connect to analyze posts & engagement"}
                      </p>
                    </div>
                  </div>
                  {connectedFacebookPage ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUseFacebook(!useFacebook);
                      }}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        useFacebook ? "border-blue-500 bg-blue-500" : "border-gray-300"
                      }`}
                    >
                      {useFacebook && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={isConnectingFacebook}
                      onClick={handleConnectFacebook}
                      
                    >!isConnectingFacebook && <Facebook className="w-4 h-4" /> 
                      {isConnectingFacebook ? "Connecting..." : "Connect"}
                    </Button>
                  )}
                </div>
                {connectedFacebookPage && useFacebook && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Page connected - will analyze posts & engagement</span>
                  </div>
                )}
                {!brandId && !connectedFacebookPage && (
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                    Complete onboarding first to connect Facebook
                  </p>
                )}
              </div>

              {/* Dual-source benefit callout */}
              {useWebsite && useFacebook && connectedFacebookPage && (
                <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <p className="text-xs text-purple-700 dark:text-purple-300">
                    <span className="font-medium">Dual-source analysis:</span> Combining website + Facebook for richer insights
                  </p>
                </div>
              )}
            </div>

            <div className="border-t my-4" />

            {/* Website URL Input - show if website source enabled */}
            {useWebsite && (
              <Input
                label="Website URL"
                placeholder="https://yourcompany.com"
                value={websiteUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWebsiteUrl(e.target.value)}
                                isRequired
                description={initialWebsiteUrl ? "Pre-filled from onboarding - you can change it" : "We'll analyze your website to understand your brand"}
              />
            )}

            <Input
              label="Industry (Optional)"
              placeholder="e.g., SaaS, E-commerce, Healthcare"
              value={industry}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIndustry(e.target.value)}
              
            />

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <Button
              size="lg"
              className="w-full mt-2"
              
              onClick={handleAnalyze}
              disabled={(!useWebsite && !useFacebook) || (useWebsite && !websiteUrl) || (useFacebook && !connectedFacebookPage)}
            ><Sparkles className="w-5 h-5" /> 
              {useFacebook && useWebsite ? "Analyze Both Sources" : useFacebook ? "Analyze Facebook Page" : "Analyze Website"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step: Analyzing - Enhanced Animation */}
      {step === "analyzing" && (
        <Card className="max-w-xl mx-auto">
          <CardContent className="py-12 text-center">
            {/* Animated spinner with gradient */}
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div
                className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-spin"
                style={{ clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }}
              />
              <div className="absolute inset-2 rounded-full bg-white dark:bg-gray-900" />
              <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-purple-500 animate-pulse" />
            </div>

            <h3 className="text-lg font-semibold mb-2">
              {useFacebook && useWebsite ? "Analyzing Your Sources..." : useFacebook ? "Analyzing Facebook Page..." : "Analyzing Your Website..."}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {useFacebook && useWebsite
                ? "AI is analyzing your website and Facebook page to generate configurations for all 5 phases."
                : useFacebook
                  ? "AI is analyzing your Facebook posts and engagement to generate configurations for all 5 phases."
                  : "AI is scanning your website and generating configurations for all 5 phases."
              }
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
                  <Badge
                    key={phase.key}
                    variant="secondary"
                  >
                    {phase.title}
                  </Badge>
                );
              })}
            </div>

            <p className="text-xs text-gray-400">
              Estimated time remaining: {Math.max(0, 60 - analysisProgress * 12)} seconds
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step: Preview */}
      {step === "preview" && configuration && editedConfig && (
        <div className="space-y-6">
          {/* Analysis Complete Card */}
          <Card className="border-2 border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
            <CardContent className="p-4">
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
                  
                  onClick={handleApplyAll}
                >
                  Apply All Phases
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Time Savings Banner */}
          <Card className="border-2 border-green-200 dark:border-green-800 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
            <CardContent className="p-4">
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
                    <Badge variant="outline">
                      Brand Brain
                    </Badge>
                    <Badge variant="outline">
                      Content Factory
                    </Badge>
                    <Badge variant="outline">
                      Publishing
                    </Badge>
                    <Badge variant="outline">
                      Analytics
                    </Badge>
                    <Badge variant="outline">
                      Autopilot
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Accordion variant="bordered" selectionMode="multiple" defaultExpandedKeys={["understand"]}>
            {/* Understand Phase Preview */}
            <AccordionItem
              key="understand"
              aria-label="Understand Phase"
                            title={
                <div className="flex items-center gap-2">
                  <span>Understand</span>
                  <Badge variant="secondary">Brand Brain</Badge>
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
                          <Badge key={i}  variant="secondary">{trait}</Badge>
                        )) || "—"}
                      </div>
                    </div>

                    <div className="border-t my-4" />

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
                          <Badge key={i} variant="secondary">
                            {pillar.name} ({pillar.frequency}%)
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Edit Button */}
                    <div className="flex justify-end pt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        
                        onClick={() => setEditingPhase("understand")}
                      >
                        <Edit className="w-4 h-4" />
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
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => { const v = e.target.value; updateEditedConfig("understand", "brandName", v); }}
                    />

                    <div className="space-y-1">
                      <label className="text-sm font-medium">Description</label>
                      <Textarea
                        value={editedConfig.understand.brandDescription || ""}
                        onChange={(e) => { const v = e.target.value; updateEditedConfig("understand", "brandDescription", v); }}
                        rows={2}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium">Industry</label>
                      <Input
                        value={editedConfig.understand.industry || ""}
                        onChange={(e) => { const v = e.target.value; updateEditedConfig("understand", "industry", v); }}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium">Mission</label>
                      <Textarea
                        value={editedConfig.understand.mission || ""}
                        onChange={(e) => { const v = e.target.value; updateEditedConfig("understand", "mission", v); }}
                        rows={2}
                      />
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditedConfig(configuration); // Reset
                          setEditingPhase(null);
                        }}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setEditingPhase(null)}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Save Changes
                      </Button>
                    </div>
                  </div>
                )}

                {/* Confidence Indicator */}
                <div className="border-t my-4" />
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      AI Confidence
                    </span>
                  </div>

                  <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${editedConfig.understand.confidence * 100}%` }} />
            </div>

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
                            title={
                <div className="flex items-center gap-2">
                  <span>Create</span>
                  <Badge variant="secondary">Content Factory</Badge>
                </div>
              }
              subtitle="Content types & generation settings"
            >
              <div className="space-y-4 py-2">
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-2">Enabled Content Types</p>
                  <div className="flex flex-wrap gap-2">
                    {editedConfig.create.enabledTypes?.map((type, i) => (
                      <Badge key={i}  variant="secondary">{type}</Badge>
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
                  <Badge  variant="secondary">{editedConfig.create.hashtagStrategy || "moderate"}</Badge>
                </div>

                {editedConfig.create.savedHashtags && editedConfig.create.savedHashtags.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-2">Saved Hashtags</p>
                    <div className="flex flex-wrap gap-1">
                      {editedConfig.create.savedHashtags.map((tag, i) => (
                        <Badge key={i}  variant="secondary" >{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confidence Indicator */}
                <div className="border-t my-4" />
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      AI Confidence
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${editedConfig.create.confidence * 100}%` }} />
            </div>
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
                            title={
                <div className="flex items-center gap-2">
                  <span>Distribute</span>
                  <Badge variant="secondary">Publishing</Badge>
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
                          <Badge  color={settings.enabled ? "success" : "default"} variant="secondary">
                            {settings.enabled ? "Enabled" : "Disabled"}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {settings.postingFrequency} posts/week
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Confidence Indicator */}
                <div className="border-t my-4" />
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <Sparkles className="w-4 h-4 text-green-500" />
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      AI Confidence
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${editedConfig.distribute.confidence * 100}%` }} />
            </div>
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
                            title={
                <div className="flex items-center gap-2">
                  <span>Learn</span>
                  <Badge variant="secondary">Analytics</Badge>
                </div>
              }
              subtitle="Metrics & reporting"
            >
              <div className="space-y-4 py-2">
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-2">Priority Metrics</p>
                  <div className="flex flex-wrap gap-2">
                    {editedConfig.learn.priorityMetrics?.map((metric, i) => (
                      <Badge key={i}  color={i === 0 ? "warning" : "default"} variant="secondary">
                        {metric}
                      </Badge>
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
                        <Badge
                          key={i}
                          
                          color={goal.priority === "high" ? "warning" : "default"}
                          variant="secondary"
                        >
                          {goal.metric} ({goal.priority})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confidence Indicator */}
                <div className="border-t my-4" />
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      AI Confidence
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${editedConfig.learn.confidence * 100}%` }} />
            </div>
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
                            title={
                <div className="flex items-center gap-2">
                  <span>Automate</span>
                  <Badge variant="secondary">AI Autopilot</Badge>
                </div>
              }
              subtitle="Automation & notifications"
            >
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">Approval Mode</p>
                    <Badge  variant="secondary" className="capitalize">
                      {editedConfig.automate.approvalMode?.replace("_", " ") || "Review"}
                    </Badge>
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
                <div className="border-t my-4" />
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <Sparkles className="w-4 h-4 text-pink-500" />
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      AI Confidence
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${editedConfig.automate.confidence * 100}%` }} />
            </div>
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
              size="lg"
              
              onClick={handleApplyAll}
            >
              Apply All Phases & Activate
            </Button>

            {/* Escape Hatch Button */}
            <Button
              variant="outline"
              onClick={handleSwitchToGuided}
            ><Settings2 className="w-4 h-4" /> 
              Customize Manually Instead
            </Button>
          </div>
        </div>
      )}

      {/* Step: Applying - Enhanced with percentage */}
      {step === "applying" && (
        <Card className="max-w-xl mx-auto">
          <CardContent className="py-8">
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
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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
                      <Badge variant="secondary" className="animate-pulse">
                        Applying...
                      </Badge>
                    )}
                    {isApplied && (
                      <Badge variant="outline">
                        <Check className="w-3 h-3 mr-1" />
                        Done
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(appliedPhases.length / phaseInfo.length) * 100}%` }} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Complete - Enhanced with time saved callout */}
      {step === "complete" && (
        <div className="space-y-6">
          {/* Success Card */}
          <Card className="max-w-xl mx-auto border-2 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20">
            <CardContent className="py-12 text-center">
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
                    <Badge
                      key={phase.key}
                      variant="outline"
                    >
                      {phase.title}
                    </Badge>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="secondary"
                  
                  onClick={() => setShowSummary(true)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Review All Changes
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  
                  onClick={handleComplete}
                >
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Summary Modal */}
      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent>
            <>
              <DialogHeader className="flex flex-col gap-1"><DialogTitle>
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-purple-500" />
                  <span>Configuration Summary</span>
                </div>
                <p className="text-sm font-normal text-gray-500">
                  Review all changes applied by AI to your flywheel
                </p>
              </DialogTitle></DialogHeader>
              <div className="py-4">
                {editedConfig && (
                  <div className="space-y-6">
                    {/* Understand Phase Summary */}
                    <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-xl">
                      <div className="flex items-center gap-2 mb-3">
                        <Brain className="w-5 h-5 text-purple-500" />
                        <h3 className="font-semibold">Understand (Brand Brain)</h3>
                        <Badge variant="outline">Applied</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">Brand:</span>{" "}
                          <span className="font-medium">{editedConfig.understand.brandName || "—"}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Industry:</span>{" "}
                          <span className="font-medium">{editedConfig.understand.industry || "—"}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-500">Audiences:</span>{" "}
                          <span className="font-medium">{editedConfig.understand.audiences?.length || 0} defined</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-500">Content Pillars:</span>{" "}
                          <span className="font-medium">{editedConfig.understand.contentPillars?.length || 0} defined</span>
                        </div>
                      </div>
                    </div>

                    {/* Create Phase Summary */}
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
                      <div className="flex items-center gap-2 mb-3">
                        <Palette className="w-5 h-5 text-blue-500" />
                        <h3 className="font-semibold">Create (Content Factory)</h3>
                        <Badge variant="outline">Applied</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="col-span-2">
                          <span className="text-gray-500">Content Types:</span>{" "}
                          <span className="font-medium">{editedConfig.create.enabledTypes?.join(", ") || "—"}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Image Generation:</span>{" "}
                          <span className="font-medium">{editedConfig.create.imageGeneration ? "Enabled" : "Disabled"}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Hashtag Strategy:</span>{" "}
                          <span className="font-medium capitalize">{editedConfig.create.hashtagStrategy || "moderate"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Distribute Phase Summary */}
                    <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-xl">
                      <div className="flex items-center gap-2 mb-3">
                        <Share2 className="w-5 h-5 text-green-500" />
                        <h3 className="font-semibold">Distribute (Publishing)</h3>
                        <Badge variant="outline">Applied</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">Timezone:</span>{" "}
                          <span className="font-medium">{editedConfig.distribute.timezone || "Auto-detected"}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Platforms:</span>{" "}
                          <span className="font-medium">
                            {Object.entries(editedConfig.distribute.platformSettings || {})
                              .filter(([, s]) => s.enabled)
                              .map(([p]) => p)
                              .join(", ") || "None"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Learn Phase Summary */}
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl">
                      <div className="flex items-center gap-2 mb-3">
                        <BarChart3 className="w-5 h-5 text-amber-500" />
                        <h3 className="font-semibold">Learn (Analytics)</h3>
                        <Badge variant="outline">Applied</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="col-span-2">
                          <span className="text-gray-500">Priority Metrics:</span>{" "}
                          <span className="font-medium">{editedConfig.learn.priorityMetrics?.join(", ") || "—"}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Reports:</span>{" "}
                          <span className="font-medium capitalize">{editedConfig.learn.reportFrequency || "Weekly"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Automate Phase Summary */}
                    <div className="p-4 bg-pink-50 dark:bg-pink-950/30 rounded-xl">
                      <div className="flex items-center gap-2 mb-3">
                        <Zap className="w-5 h-5 text-pink-500" />
                        <h3 className="font-semibold">Automate (AI Autopilot)</h3>
                        <Badge variant="outline">Applied</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">Approval Mode:</span>{" "}
                          <span className="font-medium capitalize">{editedConfig.automate.approvalMode?.replace("_", " ") || "Review"}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Posts/Week:</span>{" "}
                          <span className="font-medium">{editedConfig.automate.postsPerWeek || 7}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setIsOpen(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setIsOpen(false);
                    router.push("/setup");
                  }}
                >
                  <Settings2 className="w-4 h-4 mr-1" />
                  Edit in Expert Mode
                </Button>
              </DialogFooter>
            </>
          </DialogContent>
      </Dialog>
    </div>
  );
}
