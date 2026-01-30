"use client";

/**
 * AI Brand Setup Component
 *
 * Analyzes connected social accounts and automatically configures Brand Brain.
 * This is the "magic button" that sets everything up from existing social posts.
 */

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import {
  Sparkles,
  Brain,
  Check,
  AlertCircle,
  ChevronRight,
  Zap,
  Target,
  MessageSquare,
  Hash,
  Users,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface AIBrandSetupProps {
  brandId: string;
  onComplete?: () => void;
  onSkip?: () => void;
  showSkip?: boolean;
  compact?: boolean;
}

interface AnalysisResult {
  success: boolean;
  analysis?: {
    totalPostsAnalyzed: number;
    platforms: string[];
    voicePatterns: {
      tone: string;
      formality: string;
      personality: string[];
      writingStyle: string;
    };
    contentPatterns: {
      topTopics: string[];
      commonThemes: string[];
      hashtagsUsed: string[];
      emojiUsage: string;
      avgPostLength: number;
      postTypes: string[];
    };
    engagementInsights: {
      bestPerformingTopics: string[];
      bestPostingTimes: string[];
      highEngagementPatterns: string[];
    };
    brandIndicators: {
      industry: string;
      targetAudience: string[];
      uniqueValueProps: string[];
      brandPersonality: string;
    };
  };
  suggestedProfile?: {
    description: string;
    mission: string | null;
    values: string[];
    uniqueSellingPoints: string[];
    voiceTone: string;
    writingStyle: string;
    targetAudience: {
      demographics: string[];
      interests: string[];
      painPoints: string[];
    };
    contentPillars: string[];
    preferredHashtags: string[];
    emojiStyle: string;
    ctaStyle: string;
  };
  suggestedSettings?: {
    brandName: string;
    industry: string;
    voiceTone: string;
    formalityLevel: number;
    emojiPreference: string;
    hashtagPreference: string;
    contentPillars: string[];
    targetAudiences: Array<{
      name: string;
      demographics: string;
      interests: string[];
      painPoints: string[];
    }>;
  };
  confidence?: number;
  dataSourcesSummary?: string;
  accountsAnalyzed?: string[];
  postsAnalyzed?: number;
  error?: string;
  message?: string;
}

type SetupStep = "ready" | "analyzing" | "preview" | "applying" | "complete" | "error";

export function AIBrandSetup({
  brandId,
  onComplete,
  onSkip,
  showSkip = true,
  compact = false,
}: AIBrandSetupProps) {
  const router = useRouter();
  const [step, setStep] = useState<SetupStep>("ready");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  const handleAnalyze = useCallback(async () => {
    setError(null);
    setStep("analyzing");
    setAnalysisProgress(0);

    // Simulate progress while waiting
    const progressInterval = setInterval(() => {
      setAnalysisProgress((prev) => Math.min(prev + 10, 90));
    }, 500);

    try {
      const response = await fetch("/api/brand-brain/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId }),
      });

      clearInterval(progressInterval);
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || data.error || "Failed to analyze social accounts");
        setStep("error");
        return;
      }

      setResult(data);
      setAnalysisProgress(100);
      setStep("preview");
    } catch (err) {
      clearInterval(progressInterval);
      setError("An error occurred while analyzing. Please try again.");
      setStep("error");
    }
  }, [brandId]);

  const handleApply = useCallback(async () => {
    if (!result) return;

    setStep("applying");

    try {
      const response = await fetch("/api/brand-brain/analyze", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          aiSetup: {
            success: true,
            analysis: result.analysis,
            suggestedProfile: result.suggestedProfile,
            suggestedSettings: result.suggestedSettings,
            confidence: result.confidence,
            dataSourcesSummary: result.dataSourcesSummary,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Failed to apply AI setup");
        setStep("error");
        return;
      }

      setStep("complete");

      if (onComplete) {
        setTimeout(onComplete, 1500);
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      setStep("error");
    }
  }, [brandId, result, onComplete]);

  const handleRetry = useCallback(() => {
    setError(null);
    setResult(null);
    setStep("ready");
  }, []);

  // Compact version for dashboard cards
  if (compact) {
    return (
      <Card className="border-2 border-dashed border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white">
                AI Auto-Setup
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Analyze your social posts to configure Brand Brain automatically
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={handleAnalyze}
              disabled={step === "analyzing"}
            >
              {step === "analyzing" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {step === "analyzing" ? "Analyzing..." : "Analyze"}
              {step !== "analyzing" && <Sparkles className="w-4 h-4 ml-2" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Ready State */}
      {step === "ready" && (
        <Card>
          <CardHeader className="flex-col items-center text-center pb-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              AI Brand Setup
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Let AI analyze your social media posts and configure your brand voice automatically
            </p>
          </CardHeader>
          <CardContent className="pt-2">
            {/* What AI will do */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                <MessageSquare className="w-5 h-5 text-purple-500 mb-2" />
                <p className="text-sm font-medium">Analyze Voice</p>
                <p className="text-xs text-gray-500">Tone, style, personality</p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <Target className="w-5 h-5 text-blue-500 mb-2" />
                <p className="text-sm font-medium">Find Patterns</p>
                <p className="text-xs text-gray-500">Topics, themes, engagement</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <Users className="w-5 h-5 text-green-500 mb-2" />
                <p className="text-sm font-medium">Identify Audience</p>
                <p className="text-xs text-gray-500">Who you're reaching</p>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                <TrendingUp className="w-5 h-5 text-amber-500 mb-2" />
                <p className="text-sm font-medium">Best Practices</p>
                <p className="text-xs text-gray-500">What's working well</p>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full"
              onClick={handleAnalyze}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Analyze My Social Posts
            </Button>

            {showSkip && onSkip && (
              <Button
                variant="ghost"
                className="w-full mt-2"
                onClick={onSkip}
              >
                Skip - I&apos;ll set up manually
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Analyzing State */}
      {step === "analyzing" && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div
                className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-spin"
                style={{ clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }}
              />
              <div className="absolute inset-2 rounded-full bg-white dark:bg-gray-900" />
              <Brain className="absolute inset-0 m-auto w-8 h-8 text-purple-500 animate-pulse" />
            </div>

            <h3 className="text-lg font-semibold mb-2">Analyzing Your Social Posts...</h3>
            <p className="text-sm text-gray-500 mb-6">
              AI is reading your posts to understand your brand voice and patterns
            </p>

            <div className="w-full max-w-xs mx-auto mb-4 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-300"
                style={{ width: `${analysisProgress}%` }}
              />
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="secondary">
                <Check className="w-3 h-3 mr-1" />
                Fetching posts
              </Badge>
              {analysisProgress > 30 && (
                <Badge variant="secondary">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Analyzing voice
                </Badge>
              )}
              {analysisProgress > 60 && (
                <Badge variant="secondary">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Finding patterns
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview State */}
      {step === "preview" && result && (
        <div className="space-y-4">
          {/* Success Banner */}
          <Card className="border-2 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                  <Check className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    Analysis Complete
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {result.dataSourcesSummary}
                  </p>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {Math.round((result.confidence || 0.8) * 100)}% confidence
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* AI Insights */}
          <div className="space-y-3">
            {/* Voice Analysis */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-5 h-5 text-purple-500" />
                  <h4 className="font-semibold">Voice & Style</h4>
                  <span className="text-sm text-muted-foreground">{result.analysis?.voicePatterns.tone || "Detected"}</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Tone:</span>
                    <Badge variant="secondary">{result.analysis?.voicePatterns.tone}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Formality:</span>
                    <Badge variant="secondary">{result.analysis?.voicePatterns.formality}</Badge>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Personality:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {result.analysis?.voicePatterns.personality.map((trait, i) => (
                        <Badge key={i} variant="secondary">{trait}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Writing Style:</span>
                    <p className="text-sm mt-1">{result.analysis?.voicePatterns.writingStyle}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Content Patterns */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-5 h-5 text-blue-500" />
                  <h4 className="font-semibold">Content Patterns</h4>
                  <span className="text-sm text-muted-foreground">{`${result.analysis?.contentPatterns.topTopics.length || 0} topics identified`}</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-500">Top Topics:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {result.analysis?.contentPatterns.topTopics.map((topic, i) => (
                        <Badge key={i} variant="default">{topic}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Common Themes:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {result.analysis?.contentPatterns.commonThemes.map((theme, i) => (
                        <Badge key={i} variant="secondary">{theme}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-sm text-gray-500">Emoji Usage:</span>
                      <Badge variant="secondary" className="ml-2">{result.analysis?.contentPatterns.emojiUsage}</Badge>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Avg Length:</span>
                      <span className="text-sm ml-2">{result.analysis?.contentPatterns.avgPostLength} chars</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Hashtags */}
            {(result.analysis?.contentPatterns?.hashtagsUsed?.length ?? 0) > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Hash className="w-5 h-5 text-green-500" />
                    <h4 className="font-semibold">Hashtags Found</h4>
                    <span className="text-sm text-muted-foreground">{`${result.analysis?.contentPatterns?.hashtagsUsed?.length ?? 0} hashtags`}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {result.analysis?.contentPatterns?.hashtagsUsed?.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="bg-green-100 text-green-800">{tag}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Engagement Insights */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-amber-500" />
                  <h4 className="font-semibold">What's Working</h4>
                  <span className="text-sm text-muted-foreground">High-engagement patterns</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-500">Best Topics:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {result.analysis?.engagementInsights.bestPerformingTopics.map((topic, i) => (
                        <Badge key={i} variant="secondary" className="bg-yellow-100 text-yellow-800">{topic}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Success Patterns:</span>
                    <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                      {result.analysis?.engagementInsights.highEngagementPatterns.map((pattern, i) => (
                        <li key={i}>{pattern}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-2">
            <Button
              size="lg"
              className="w-full"
              onClick={handleApply}
            >
              Apply to Brand Brain
              <Zap className="w-5 h-5 ml-2" />
            </Button>
            <Button
              variant="ghost"
              onClick={handleRetry}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Re-analyze
            </Button>
          </div>
        </div>
      )}

      {/* Applying State */}
      {step === "applying" && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Applying AI Setup...</h3>
            <p className="text-sm text-gray-500">
              Configuring your Brand Brain with the analyzed settings
            </p>
          </CardContent>
        </Card>
      )}

      {/* Complete State */}
      {step === "complete" && (
        <Card className="border-2 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Brand Brain Configured!
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              AI has set up your brand voice, content pillars, and target audiences.
            </p>
            <Button
              variant="default"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => router.push("/dashboard/brand")}
            >
              View Brand Brain
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {step === "error" && (
        <Card className="border-2 border-red-200 dark:border-red-800">
          <CardContent className="py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Setup Failed
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {error}
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="secondary" onClick={handleRetry}>
                Try Again
              </Button>
              {showSkip && onSkip && (
                <Button variant="ghost" onClick={onSkip}>
                  Skip for now
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
