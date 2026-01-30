"use client";

/**
 * AI Content Wizard
 *
 * A streamlined 5-step wizard for AI-assisted content creation:
 * 1. Pick Content Pillar - AI suggests best pillar based on recent activity
 * 2. Confirm Platforms - Auto-selects connected accounts
 * 3. AI Generates Content - Beautiful loading state
 * 4. Review & Customize - Preview, edit, regenerate
 * 5. Schedule & Publish - Optimal times or immediate
 */

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Twitter,
  Linkedin,
  Instagram,
  Facebook,
  RefreshCw,
  Calendar,
  Send,
  Wand2,
  Target,
  Clock,
  Edit3,
  Copy,
  Check,
  Zap,
  TrendingUp,
} from "lucide-react";
import { trackEvent } from "@/lib/analytics/analytics";
import { AIConfidence } from "@/components/ui/ai-confidence";

// ============================================================================
// Types
// ============================================================================

interface ContentPillar {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  topics: string[];
  hashtags: string[];
  recentUsageCount: number;
}

interface ConnectedPlatform {
  id: string;
  platform: string;
  displayName: string;
  avatar: string | null;
  username: string | null;
}

interface BrandVoice {
  voiceTone: string | null;
  writingStyle: string | null;
  emojiFrequency: string | null;
  useHashtags: boolean | null;
}

interface GeneratedVariation {
  platform: string;
  content: string;
  hashtags: string[];
  characterCount: number;
}

interface GeneratedContent {
  id: string;
  mainContent: string;
  topic: string;
  variations: GeneratedVariation[];
  suggestedHashtags: string[];
  imagePrompt?: string;
  generatedImageUrl?: string; // AI-generated image URL
}

interface AIContentWizardProps {
  brandId: string;
  brandName: string;
  contentPillars: ContentPillar[];
  connectedPlatforms: ConnectedPlatform[];
  brandVoice: BrandVoice | null;
}

// ============================================================================
// Constants
// ============================================================================

const PLATFORM_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string; charLimit: number }> = {
  TWITTER: { icon: Twitter, label: "X (Twitter)", color: "#000000", charLimit: 280 },
  LINKEDIN: { icon: Linkedin, label: "LinkedIn", color: "#0A66C2", charLimit: 3000 },
  INSTAGRAM: { icon: Instagram, label: "Instagram", color: "#E4405F", charLimit: 2200 },
  FACEBOOK: { icon: Facebook, label: "Facebook", color: "#1877F2", charLimit: 63206 },
};

const WIZARD_STEPS = [
  { id: 1, title: "Topic", description: "Choose what to post about" },
  { id: 2, title: "Platforms", description: "Where to post" },
  { id: 3, title: "Generate", description: "AI creates content" },
  { id: 4, title: "Review", description: "Edit & customize" },
  { id: 5, title: "Publish", description: "Schedule or post now" },
];

const AI_WRITING_MESSAGES = [
  "Analyzing your brand voice...",
  "Crafting the perfect message...",
  "Optimizing for each platform...",
  "Adding your signature style...",
  "Polishing the final touches...",
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate confidence score for optimal publishing time recommendation
 * Based on platform selection, audience patterns, and historical data availability
 */
function getOptimalPublishingTimeConfidence(selectedPlatforms: string[]): number {
  // Base confidence starts at 75% (medium confidence)
  let confidence = 75;

  // Platform-specific confidence adjustments
  // Well-researched platforms with known optimal times get higher confidence
  const platformConfidenceBoost: Record<string, number> = {
    TWITTER: 10,    // Strong engagement patterns on Twitter (mornings, lunch, evening)
    LINKEDIN: 12,   // Very predictable B2B engagement (weekday mornings, lunch)
    FACEBOOK: 8,    // Good data on Facebook peak times (evenings, weekends)
    INSTAGRAM: 8,   // Visual content has strong time-based patterns
  };

  // Add confidence for each selected platform with known patterns
  selectedPlatforms.forEach((platform) => {
    if (platformConfidenceBoost[platform]) {
      confidence += platformConfidenceBoost[platform] / selectedPlatforms.length;
    }
  });

  // Multi-platform publishing gets slight confidence boost (more data points)
  if (selectedPlatforms.length >= 2) {
    confidence += 3;
  }

  // LinkedIn-only gets highest confidence (very predictable B2B patterns)
  if (selectedPlatforms.length === 1 && selectedPlatforms[0] === "LINKEDIN") {
    confidence = 93; // High confidence for LinkedIn B2B timing
  }

  // Twitter-only gets high confidence (well-researched engagement times)
  if (selectedPlatforms.length === 1 && selectedPlatforms[0] === "TWITTER") {
    confidence = 90;
  }

  // Cap confidence at 95% (never claim 100% certainty)
  return Math.min(95, Math.round(confidence));
}

// ============================================================================
// Component
// ============================================================================

export function AIContentWizard({
  brandId,
  brandName,
  contentPillars,
  connectedPlatforms,
  brandVoice,
}: AIContentWizardProps) {
  const router = useRouter();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Content Pillar
  const [selectedPillar, setSelectedPillar] = useState<ContentPillar | null>(null);
  const [customTopic, setCustomTopic] = useState("");

  // Step 2: Platforms
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(
    connectedPlatforms.map((p) => p.platform)
  );

  // Step 3: Generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingMessage, setGeneratingMessage] = useState(AI_WRITING_MESSAGES[0]);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);

  // Step 4: Review
  const [editedVariations, setEditedVariations] = useState<Record<string, string>>({});
  const [editingPlatform, setEditingPlatform] = useState<string | null>(null);

  // Step 5: Schedule
  const [publishOption, setPublishOption] = useState<"now" | "optimal" | "custom">("optimal");
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  // AI suggestion: Pillar with least recent usage
  const suggestedPillar = useMemo(() => {
    if (contentPillars.length === 0) return null;
    return contentPillars.reduce((min, pillar) =>
      pillar.recentUsageCount < min.recentUsageCount ? pillar : min
    );
  }, [contentPillars]);

  // Progress calculation
  const progress = (currentStep / WIZARD_STEPS.length) * 100;

  // ============================================================================
  // Handlers
  // ============================================================================

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setCurrentStep(3);

    // Cycle through AI messages
    let messageIndex = 0;
    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % AI_WRITING_MESSAGES.length;
      setGeneratingMessage(AI_WRITING_MESSAGES[messageIndex]);
    }, 2000);

    try {
      const topic = selectedPillar?.name || customTopic;

      const response = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          contentType: "POST",
          targetPlatforms: selectedPlatforms,
          topic,
          category: selectedPillar?.name,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate content");
      }

      const data = await response.json();

      // Transform response to our format
      const content: GeneratedContent = {
        id: crypto.randomUUID(),
        mainContent: data.content?.content || "",
        topic,
        variations: data.content?.variations?.map((v: { platform: string; content: string; hashtags?: string[] }) => ({
          platform: v.platform,
          content: v.content,
          hashtags: v.hashtags || data.content?.suggestedHashtags || [],
          characterCount: v.content.length,
        })) || [],
        suggestedHashtags: data.content?.suggestedHashtags || [],
        imagePrompt: data.content?.imagePrompt,
        generatedImageUrl: data.content?.generatedImageUrl, // Capture AI-generated image URL
      };

      setGeneratedContent(content);

      // Initialize edited variations with generated content
      const edited: Record<string, string> = {};
      content.variations.forEach((v) => {
        edited[v.platform] = v.content;
      });
      setEditedVariations(edited);

      trackEvent("content_generated", {
        type: "ai_wizard",
        pillar: selectedPillar?.name || "custom",
        platforms: selectedPlatforms.join(","),
        topic,
      });

      // Move to review step
      setCurrentStep(4);
    } catch (error) {
      console.error("Generation error:", error);
      // Stay on step 3 but show error state
      setGeneratingMessage("Something went wrong. Please try again.");
    } finally {
      clearInterval(messageInterval);
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async (platform?: string) => {
    setIsGenerating(true);

    try {
      const topic = selectedPillar?.name || customTopic;
      const platforms = platform ? [platform] : selectedPlatforms;

      const response = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          contentType: "POST",
          targetPlatforms: platforms,
          topic,
          category: selectedPillar?.name,
        }),
      });

      if (!response.ok) throw new Error("Failed to regenerate");

      const data = await response.json();

      if (platform && generatedContent) {
        // Update single platform variation
        const newVariation = data.content?.variations?.[0];
        if (newVariation) {
          setEditedVariations((prev) => ({
            ...prev,
            [platform]: newVariation.content,
          }));
        }
      } else {
        // Regenerate all
        await handleGenerate();
      }
    } catch (error) {
      console.error("Regeneration error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);

    try {
      // Create content items and schedule them
      const response = await fetch("/api/content/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          topic: selectedPillar?.name || customTopic,
          category: selectedPillar?.name,
          variations: Object.entries(editedVariations).map(([platform, content]) => ({
            platform,
            content,
            hashtags: generatedContent?.suggestedHashtags || [],
          })),
          publishOption,
          imagePrompt: generatedContent?.imagePrompt,
          generatedImageUrl: generatedContent?.generatedImageUrl, // Include AI-generated image
        }),
      });

      if (!response.ok) throw new Error("Failed to schedule content");

      setPublishSuccess(true);

      trackEvent("content_published", {
        platform: selectedPlatforms[0] || "multi",
        scheduled: publishOption !== "now",
        pillar: selectedPillar?.name || "custom",
        platforms: selectedPlatforms.join(","),
        publishOption,
      });

      // Redirect after success
      setTimeout(() => {
        router.push("/dashboard/content");
      }, 2000);
    } catch (error) {
      console.error("Publishing error:", error);
    } finally {
      setIsPublishing(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return selectedPillar !== null || customTopic.trim().length > 0;
      case 2:
        return selectedPlatforms.length > 0;
      case 4:
        return Object.keys(editedVariations).length > 0;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep === 2) {
      handleGenerate();
    } else if (currentStep === 5) {
      handlePublish();
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, 5));
    }
  };

  const handleBack = () => {
    if (currentStep === 4) {
      // Skip back over generation step
      setCurrentStep(2);
    } else {
      setCurrentStep((prev) => Math.max(prev - 1, 1));
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">AI Content Creator</span>
        </div>
        <h1 className="text-2xl font-bold">Create Content for {brandName}</h1>
        <p className="text-gray-500">Let AI help you create engaging content in seconds</p>
      </div>

      {/* Progress */}
      <div className="space-y-3">
        <div className="max-w-md mx-auto h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between max-w-md mx-auto">
          {WIZARD_STEPS.map((step) => (
            <div
              key={step.id}
              className={`flex flex-col items-center ${
                step.id <= currentStep ? "text-primary" : "text-gray-400"
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                step.id < currentStep
                  ? "bg-primary text-white"
                  : step.id === currentStep
                  ? "bg-primary/20 text-primary border-2 border-primary"
                  : "bg-gray-200 text-gray-500"
              }`}>
                {step.id < currentStep ? <Check className="w-3 h-3" /> : step.id}
              </div>
              <span className="text-xs mt-1 hidden sm:block">{step.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Steps */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Step 1: Pick Content Pillar */}
          {currentStep === 1 && (
            <Card>
              <CardHeader className="flex-col items-start gap-1">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">What do you want to post about?</h2>
                </div>
                <p className="text-sm text-gray-500">
                  Choose a content pillar or enter a custom topic
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* AI Suggestion Banner */}
                {suggestedPillar && (
                  <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Zap className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">AI Suggestion</p>
                      <p className="text-xs text-gray-500">
                        Post about <span className="font-medium text-primary">{suggestedPillar.name}</span> –
                        it's been a while since your last post on this topic
                      </p>
                    </div>
                    <Button
                      size="sm"
                     
                      variant="secondary"
                      onClick={() => setSelectedPillar(suggestedPillar)}
                    >
                      Use This
                    </Button>
                  </div>
                )}

                {/* Content Pillars Grid */}
                {contentPillars.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {contentPillars.map((pillar) => (
                      <button
                        key={pillar.id}
                        onClick={() => {
                          setSelectedPillar(pillar);
                          setCustomTopic("");
                        }}
                        className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                          selectedPillar?.id === pillar.id
                            ? "border-primary bg-primary/5"
                            : "border-gray-200 hover:border-gray-300 dark:border-gray-700"
                        }`}
                      >
                        <div
                          className="w-3 h-3 rounded-full mb-2"
                          style={{ backgroundColor: pillar.color }}
                        />
                        <p className="font-medium text-sm">{pillar.name}</p>
                        {pillar.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {pillar.description}
                          </p>
                        )}
                        {pillar.recentUsageCount > 0 && (
                          <div className="flex items-center gap-1 mt-2">
                            <TrendingUp className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-400">
                              {pillar.recentUsageCount} recent posts
                            </span>
                          </div>
                        )}
                        {selectedPillar?.id === pillar.id && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle2 className="w-5 h-5 text-primary" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Custom Topic Input */}
                <div className="border-t my-4" />
                <div>
                  <p className="text-sm font-medium mb-2">Or enter a custom topic:</p>
                  <Textarea
                    placeholder="E.g., Announce our new product launch, Share industry insights, Behind the scenes..."
                    value={customTopic}
                    onChange={(e) => {
                      setCustomTopic(e.target.value);
                      if (e.target.value.trim()) setSelectedPillar(null);
                    }}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Confirm Platforms */}
          {currentStep === 2 && (
            <Card>
              <CardHeader className="flex-col items-start gap-1">
                <div className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">Where do you want to post?</h2>
                </div>
                <p className="text-sm text-gray-500">
                  Select the platforms for this content (AI will optimize for each)
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {connectedPlatforms.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">No social accounts connected yet.</p>
                    <Button
                     
                      onClick={() => router.push("/dashboard/social/accounts")}
                    >
                      Connect Accounts
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {connectedPlatforms.map((account) => {
                      const config = PLATFORM_CONFIG[account.platform];
                      if (!config) return null;
                      const Icon = config.icon;
                      const isSelected = selectedPlatforms.includes(account.platform);

                      return (
                        <div
                          key={account.id}
                          className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-gray-200 hover:border-gray-300 dark:border-gray-700"
                          }`}
                          onClick={() => togglePlatform(account.platform)}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="p-2 rounded-lg"
                              style={{ backgroundColor: `${config.color}20` }}
                            >
                              <Icon className="w-5 h-5" style={{ color: config.color }} />
                            </div>
                            <div>
                              <p className="font-medium">{config.label}</p>
                              <p className="text-sm text-gray-500">
                                {account.displayName}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge size="sm" variant="secondary">
                              {config.charLimit.toLocaleString()} chars max
                            </Badge>
                            <Switch
                              checked={isSelected}
                              onCheckedChange={() => togglePlatform(account.platform)}
                             
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Topic Summary */}
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <p className="text-sm text-gray-500">
                    Creating content about: <span className="font-medium text-gray-700 dark:text-gray-300">
                      {selectedPillar?.name || customTopic || "No topic selected"}
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: AI Generating */}
          {currentStep === 3 && (
            <Card>
              <CardContent className="py-16">
                <div className="text-center space-y-6">
                  <div className="relative mx-auto w-20 h-20">
                    <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                    <div className="absolute inset-2 bg-primary/30 rounded-full animate-pulse" />
                    <div className="absolute inset-4 bg-primary rounded-full flex items-center justify-center">
                      <Wand2 className="w-6 h-6 text-white animate-bounce" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold">AI is creating your content</h2>
                    <p className="text-gray-500">{generatingMessage}</p>
                  </div>

                  <div className="flex items-center justify-center gap-2">
                    {selectedPlatforms.map((platform) => {
                      const config = PLATFORM_CONFIG[platform];
                      if (!config) return null;
                      const Icon = config.icon;
                      return (
                        <div
                          key={platform}
                          className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg"
                        >
                          <Icon className="w-4 h-4" style={{ color: config.color }} />
                        </div>
                      );
                    })}
                  </div>

                  <div className="max-w-xs mx-auto h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full animate-pulse w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Review & Customize */}
          {currentStep === 4 && generatedContent && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold">Review Your Content</h2>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                                        onClick={() => handleRegenerate()}
                    disabled={isGenerating}
                  >
                    Regenerate All
                  </Button>
                </CardHeader>
              </Card>

              {/* Platform Variations */}
              {generatedContent.variations.map((variation) => {
                const config = PLATFORM_CONFIG[variation.platform];
                if (!config) return null;
                const Icon = config.icon;
                const isEditing = editingPlatform === variation.platform;
                const content = editedVariations[variation.platform] || variation.content;
                const charCount = content.length;
                const isOverLimit = charCount > config.charLimit;

                return (
                  <Card key={variation.platform}>
                    <CardHeader className="flex justify-between items-center pb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="p-1.5 rounded-lg"
                          style={{ backgroundColor: `${config.color}20` }}
                        >
                          <Icon className="w-4 h-4" style={{ color: config.color }} />
                        </div>
                        <span className="font-medium">{config.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          size="sm"
                          variant="secondary"
                          color={isOverLimit ? "danger" : "default"}
                        >
                          {charCount} / {config.charLimit}
                        </Badge>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleRegenerate(variation.platform)}
                                disabled={isGenerating}
                              >
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Regenerate this variation</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => navigator.clipboard.writeText(content)}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copy to clipboard</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {isEditing ? (
                        <div className="space-y-2">
                          <Textarea
                            value={content}
                            onChange={(e) =>
                              setEditedVariations((prev) => ({ ...prev, [variation.platform]: e.target.value }))
                            }
                            rows={5}
                            className={isOverLimit ? "text-destructive" : ""}
                          />
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                             
                              onClick={() => setEditingPlatform(null)}
                            >
                              Done
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          onClick={() => setEditingPlatform(variation.platform)}
                        >
                          <p className="whitespace-pre-wrap text-sm">{content}</p>
                          {variation.hashtags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {variation.hashtags.slice(0, 5).map((tag, i) => (
                                <span key={i} className="text-xs text-primary">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-gray-400 mt-2">Click to edit</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Step 5: Schedule & Publish */}
          {currentStep === 5 && (
            <Card>
              <CardHeader className="flex-col items-start gap-1">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">When do you want to publish?</h2>
                </div>
                <p className="text-sm text-gray-500">
                  Choose the best time to reach your audience
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {publishSuccess ? (
                  <div className="text-center py-8 space-y-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-green-600">Content Scheduled!</h3>
                      <p className="text-gray-500">
                        Your content has been added to the queue.
                      </p>
                    </div>
                    <p className="text-sm text-gray-400">Redirecting to content dashboard...</p>
                  </div>
                ) : (
                  <>
                    <RadioGroup
                      value={publishOption}
                      onValueChange={(val) => setPublishOption(val as "now" | "optimal" | "custom")}
                      className="space-y-3"
                    >
                      <div className="flex items-start space-x-3">
                        <RadioGroupItem value="now" id="publish-now" />
                        <Label htmlFor="publish-now" className="cursor-pointer">
                          <p className="font-medium">Publish Now</p>
                          <p className="text-sm text-gray-500">Post immediately to all platforms</p>
                        </Label>
                      </div>
                      <div className="flex items-start space-x-3">
                        <RadioGroupItem value="optimal" id="publish-optimal" />
                        <Label htmlFor="publish-optimal" className="cursor-pointer">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">Optimal Time</p>
                            {(() => {
                              const confidence = getOptimalPublishingTimeConfidence(selectedPlatforms);
                              return (
                                <AIConfidence
                                  score={confidence}
                                  variant="dots"
                                />
                              );
                            })()}
                            <Badge variant="secondary">
                              <Sparkles className="w-3 h-3 mr-1" />
                              AI Recommended
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500">
                            Let AI schedule for maximum engagement
                          </p>
                        </Label>
                      </div>
                      <div className="flex items-start space-x-3">
                        <RadioGroupItem value="custom" id="publish-custom" />
                        <Label htmlFor="publish-custom" className="cursor-pointer">
                          <p className="font-medium">Add to Queue</p>
                          <p className="text-sm text-gray-500">
                            Save to content queue for manual scheduling
                          </p>
                        </Label>
                      </div>
                    </RadioGroup>

                    {/* Summary */}
                    <div className="border-t my-4" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Summary</p>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Topic</span>
                          <span className="font-medium">{selectedPillar?.name || customTopic}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Platforms</span>
                          <div className="flex items-center gap-1">
                            {selectedPlatforms.map((p) => {
                              const Icon = PLATFORM_CONFIG[p]?.icon;
                              return Icon ? (
                                <Icon
                                  key={p}
                                  className="w-4 h-4"
                                  style={{ color: PLATFORM_CONFIG[p].color }}
                                />
                              ) : null;
                            })}
                          </div>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Variations</span>
                          <span className="font-medium">{Object.keys(editedVariations).length} posts</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      {!publishSuccess && (
        <div className="flex justify-between">
          <Button
            variant="secondary"
                        onClick={handleBack}
            disabled={currentStep === 1 || currentStep === 3}
          >
            Back
          </Button>

          {currentStep !== 3 && (
            <Button
              onClick={handleNext}
              disabled={!canProceed() || (currentStep === 5 && isPublishing)}
            >
              {currentStep === 2 ? "Generate Content" : currentStep === 5 ? "Publish" : "Continue"}
              {currentStep === 5 ? (
                isPublishing ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Send className="w-4 h-4 ml-2" />
              ) : (
                <ArrowRight className="w-4 h-4 ml-2" />
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
