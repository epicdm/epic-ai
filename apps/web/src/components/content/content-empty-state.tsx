"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Zap,
  Plus,
  Brain,
  Share2,
  CalendarCheck,
  ArrowRight,
  CheckCircle2,
  Circle,
  Lightbulb,
  Rocket,
} from "lucide-react";

interface FlywheelStep {
  id: string;
  label: string;
  description: string;
  done: boolean;
  href: string;
  icon: React.ReactNode;
}

interface ContentEmptyStateProps {
  onQuickGenerate: () => void;
  generating: boolean;
  brandId: string;
  brandName: string;
  hasConnectedAccounts: boolean;
}

export function ContentEmptyState({
  onQuickGenerate,
  generating,
  brandId,
  brandName,
  hasConnectedAccounts,
}: ContentEmptyStateProps) {
  const [flywheelStatus, setFlywheelStatus] = useState<{
    brandSetup: boolean;
    socialConnected: boolean;
    contentCreated: boolean;
    autoPublishing: boolean;
  }>({
    brandSetup: true, // They got here, so brand exists
    socialConnected: hasConnectedAccounts,
    contentCreated: false,
    autoPublishing: false,
  });

  useEffect(() => {
    // Fetch flywheel status
    const fetchStatus = async () => {
      try {
        const response = await fetch("/api/dashboard");
        if (response.ok) {
          const data = await response.json();
          setFlywheelStatus({
            brandSetup: data.brandBrain?.isSetup ?? true,
            socialConnected: (data.accounts?.connected ?? 0) > 0,
            contentCreated: (data.content?.total ?? 0) > 0,
            autoPublishing: data.publishing?.autoEnabled ?? false,
          });
        }
      } catch (error) {
        console.error("Error fetching flywheel status:", error);
      }
    };
    fetchStatus();
  }, []);

  const flywheelSteps: FlywheelStep[] = [
    {
      id: "brand",
      label: "Brand Brain Setup",
      description: "Your brand voice & personality",
      done: flywheelStatus.brandSetup,
      href: "/dashboard/brand",
      icon: <Brain className="w-4 h-4" />,
    },
    {
      id: "social",
      label: "Connect Social Accounts",
      description: "Where your content will be posted",
      done: flywheelStatus.socialConnected,
      href: "/dashboard/social/accounts",
      icon: <Share2 className="w-4 h-4" />,
    },
    {
      id: "content",
      label: "Generate Content",
      description: "Create AI-powered posts",
      done: flywheelStatus.contentCreated,
      href: "#",
      icon: <Sparkles className="w-4 h-4" />,
    },
    {
      id: "autopublish",
      label: "Enable Auto-Publishing",
      description: "Set it and forget it",
      done: flywheelStatus.autoPublishing,
      href: "/dashboard/settings",
      icon: <CalendarCheck className="w-4 h-4" />,
    },
  ];

  const completedSteps = flywheelSteps.filter((s) => s.done).length;
  const progress = Math.round((completedSteps / flywheelSteps.length) * 100);

  // Determine current step (first incomplete one)
  const currentStepIndex = flywheelSteps.findIndex((s) => !s.done);
  const isOnContentStep = currentStepIndex === 2; // Content is step 3 (index 2)

  return (
    <div className="space-y-6">
      {/* Hero CTA Section */}
      <Card className="bg-gradient-to-br from-brand-500/10 via-purple-500/10 to-pink-500/10 border-2 border-brand-500/30">
        <CardContent className="p-8">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            {/* Left side - Main CTA */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-500/20 rounded-full text-brand-600 dark:text-brand-400 text-sm font-medium mb-4">
                <Rocket className="w-4 h-4" />
                {isOnContentStep ? "You're Ready!" : "Almost There"}
              </div>

              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-3">
                {isOnContentStep
                  ? "Let's Create Your First AI-Powered Content!"
                  : "Set Up Your Content Flywheel"
                }
              </h2>

              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-xl">
                {isOnContentStep ? (
                  <>
                    Your Brand Brain knows your voice. Click the button below and watch as AI generates
                    <strong className="text-brand-600 dark:text-brand-400"> 3 platform-optimized posts </strong>
                    ready for review and publishing.
                  </>
                ) : (
                  <>
                    Complete the setup steps below to unlock autonomous content creation and publishing.
                    The flywheel will work for you 24/7!
                  </>
                )}
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  size="lg"
                  className="font-semibold"
                  onClick={onQuickGenerate}
                  disabled={generating || (!isOnContentStep && !flywheelStatus.socialConnected)}
                >
                  {generating ? "Generating..." : "Quick Generate 3 Posts"}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>

                <Link href="/dashboard/content/generate">
                  <Button
                    variant="outline"
                    size="lg"
                                      >
                    Custom Generate
                  </Button>
                </Link>
              </div>

              {!flywheelStatus.socialConnected && (
                <div className="mt-4 flex items-center gap-2 text-warning-600 dark:text-warning-400 text-sm">
                  <Lightbulb className="w-4 h-4" />
                  <span>
                    Tip: <Link href="/dashboard/social/accounts" className="underline font-medium">
                      Connect your social accounts
                    </Link> first to see platform-specific variations
                  </span>
                </div>
              )}
            </div>

            {/* Right side - Flywheel Progress */}
            <div className="w-full lg:w-80 shrink-0">
              <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Flywheel Setup
                    </span>
                    <Badge variant="secondary" className={progress === 100 ? "bg-green-100 text-green-800" : ""}>
                      {completedSteps}/{flywheelSteps.length}
                    </Badge>
                  </div>

                  <div className="mb-4 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${progress === 100 ? "bg-green-500" : "bg-primary"}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="space-y-2">
                    {flywheelSteps.map((step, index) => (
                      <Link
                        key={step.id}
                        href={step.done ? "#" : step.href}
                        className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                          step.done
                            ? "bg-success-50 dark:bg-success-900/20"
                            : index === currentStepIndex
                            ? "bg-brand-50 dark:bg-brand-900/20 ring-2 ring-brand-500"
                            : "bg-gray-50 dark:bg-gray-800/50 opacity-60"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            step.done
                              ? "bg-success-500 text-white"
                              : index === currentStepIndex
                              ? "bg-brand-500 text-white"
                              : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                          }`}
                        >
                          {step.done ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            step.icon
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium truncate ${
                              step.done
                                ? "text-success-700 dark:text-success-400"
                                : index === currentStepIndex
                                ? "text-brand-700 dark:text-brand-400"
                                : "text-gray-500"
                            }`}
                          >
                            {step.label}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {step.description}
                          </p>
                        </div>
                        {!step.done && index === currentStepIndex && (
                          <ArrowRight className="w-4 h-4 text-brand-500 shrink-0" />
                        )}
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How it works section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gray-50 dark:bg-gray-800/50">
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center mx-auto mb-3">
              <span className="text-lg font-bold text-brand-600">1</span>
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
              AI Generates Content
            </h4>
            <p className="text-sm text-gray-500">
              Using your Brand Brain settings, AI creates content matching your voice
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-50 dark:bg-gray-800/50">
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-3">
              <span className="text-lg font-bold text-purple-600">2</span>
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
              Review & Approve
            </h4>
            <p className="text-sm text-gray-500">
              Quick review each post, edit if needed, then approve for publishing
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-50 dark:bg-gray-800/50">
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center mx-auto mb-3">
              <span className="text-lg font-bold text-pink-600">3</span>
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
              Auto-Publish & Learn
            </h4>
            <p className="text-sm text-gray-500">
              Content is posted automatically, and the AI learns from results
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
