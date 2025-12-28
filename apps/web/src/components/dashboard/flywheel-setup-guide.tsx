"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Progress,
  Chip,
  Accordion,
  AccordionItem,
  Divider,
} from "@heroui/react";
import {
  Brain,
  Share2,
  Sparkles,
  CalendarCheck,
  BarChart3,
  Zap,
  CheckCircle2,
  Circle,
  ChevronRight,
  Play,
  Settings,
  Lightbulb,
  Trophy,
  Rocket,
  ArrowRight,
} from "lucide-react";

interface FlywheelSetupGuideProps {
  dashboardData?: {
    brandBrain?: { isSetup: boolean; learningCount?: number };
    accounts?: { connected: number; total: number };
    content?: { total: number; published: number };
    publishing?: { autoEnabled: boolean };
  };
  onDismiss?: () => void;
  compact?: boolean;
}

interface SetupStep {
  id: string;
  number: number;
  title: string;
  description: string;
  detailedDescription: string;
  href: string;
  action: string;
  icon: React.ReactNode;
  done: boolean;
  tips: string[];
}

export function FlywheelSetupGuide({
  dashboardData,
  onDismiss,
  compact = false,
}: FlywheelSetupGuideProps) {
  const [status, setStatus] = useState({
    brandSetup: dashboardData?.brandBrain?.isSetup ?? false,
    socialConnected: (dashboardData?.accounts?.connected ?? 0) > 0,
    contentCreated: (dashboardData?.content?.total ?? 0) > 0,
    contentPublished: (dashboardData?.content?.published ?? 0) > 0,
    autoPublishing: dashboardData?.publishing?.autoEnabled ?? false,
    hasLearnings: (dashboardData?.brandBrain?.learningCount ?? 0) > 0,
  });

  const [loading, setLoading] = useState(!dashboardData);

  useEffect(() => {
    if (dashboardData) {
      setStatus({
        brandSetup: dashboardData.brandBrain?.isSetup ?? false,
        socialConnected: (dashboardData.accounts?.connected ?? 0) > 0,
        contentCreated: (dashboardData.content?.total ?? 0) > 0,
        contentPublished: (dashboardData.content?.published ?? 0) > 0,
        autoPublishing: dashboardData.publishing?.autoEnabled ?? false,
        hasLearnings: (dashboardData.brandBrain?.learningCount ?? 0) > 0,
      });
      setLoading(false);
    }
  }, [dashboardData]);

  useEffect(() => {
    if (!dashboardData) {
      const fetchStatus = async () => {
        try {
          const response = await fetch("/api/dashboard");
          if (response.ok) {
            const data = await response.json();
            setStatus({
              brandSetup: data.brandBrain?.isSetup ?? false,
              socialConnected: (data.accounts?.connected ?? 0) > 0,
              contentCreated: (data.content?.total ?? 0) > 0,
              contentPublished: (data.content?.published ?? 0) > 0,
              autoPublishing: data.publishing?.autoEnabled ?? false,
              hasLearnings: (data.brandBrain?.learningCount ?? 0) > 0,
            });
          }
        } catch (error) {
          console.error("Error fetching flywheel status:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchStatus();
    }
  }, [dashboardData]);

  const steps: SetupStep[] = [
    {
      id: "brand",
      number: 1,
      title: "Set Up Brand Brain",
      description: "Define your brand voice & personality",
      detailedDescription:
        "Your Brand Brain is the AI's understanding of your business. Configure your tone, style, target audience, and content pillars to ensure all generated content matches your brand perfectly.",
      href: "/dashboard/brand",
      action: "Configure Brand",
      icon: <Brain className="w-5 h-5" />,
      done: status.brandSetup,
      tips: [
        "Start with a template that matches your industry",
        "Add your target audience personas for better content",
        "Include content pillars (topics you regularly post about)",
      ],
    },
    {
      id: "social",
      number: 2,
      title: "Connect Social Accounts",
      description: "Link your social media platforms",
      detailedDescription:
        "Connect your Twitter, LinkedIn, Facebook, and Instagram accounts. This allows the AI to generate platform-specific content variations and publish directly to your accounts.",
      href: "/dashboard/social/accounts",
      action: "Connect Accounts",
      icon: <Share2 className="w-5 h-5" />,
      done: status.socialConnected,
      tips: [
        "Connect at least 2 platforms for maximum reach",
        "Use your main business accounts",
        "Grant publishing permissions for auto-posting",
      ],
    },
    {
      id: "content",
      number: 3,
      title: "Generate Your First Content",
      description: "Create AI-powered posts in seconds",
      detailedDescription:
        "Use Quick Generate to instantly create 3 posts optimized for each connected platform. Or use Custom Generate for more control over topics and formats.",
      href: "/dashboard/content",
      action: "Generate Content",
      icon: <Sparkles className="w-5 h-5" />,
      done: status.contentCreated,
      tips: [
        "Start with 'Quick Generate' for instant results",
        "Review and edit posts before approving",
        "The AI learns from your edits over time",
      ],
    },
    {
      id: "publish",
      number: 4,
      title: "Publish Your First Post",
      description: "Send your content to the world",
      detailedDescription:
        "Review your generated content, approve what you like, and publish it. You can publish immediately or schedule for later.",
      href: "/dashboard/content",
      action: "Review & Publish",
      icon: <Zap className="w-5 h-5" />,
      done: status.contentPublished,
      tips: [
        "Approve content you're happy with",
        "Use scheduling for optimal posting times",
        "You can edit before publishing",
      ],
    },
    {
      id: "automate",
      number: 5,
      title: "Enable Auto-Publishing",
      description: "Set it and forget it",
      detailedDescription:
        "Once you're comfortable with the content quality, enable auto-publishing. The AI will generate, schedule, and publish content automatically based on your preferences.",
      href: "/dashboard/settings",
      action: "Enable Automation",
      icon: <CalendarCheck className="w-5 h-5" />,
      done: status.autoPublishing,
      tips: [
        "Start with 'Auto-approve similar content' for safety",
        "Set posting frequency per platform",
        "Enable notifications for published content",
      ],
    },
    {
      id: "learn",
      number: 6,
      title: "Watch AI Learn",
      description: "See the flywheel in action",
      detailedDescription:
        "As your content performs, the AI analyzes engagement patterns and automatically improves your Brand Brain. Best posting times, trending topics, and audience preferences feed back into future content.",
      href: "/dashboard/brand",
      action: "View Learnings",
      icon: <BarChart3 className="w-5 h-5" />,
      done: status.hasLearnings,
      tips: [
        "AI discovers best posting times from your data",
        "Topic performance feeds back into content suggestions",
        "The more you post, the smarter your AI gets",
      ],
    },
  ];

  const completedSteps = steps.filter((s) => s.done).length;
  const progress = Math.round((completedSteps / steps.length) * 100);
  const currentStep = steps.find((s) => !s.done);
  const isComplete = completedSteps === steps.length;

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardBody className="h-32" />
      </Card>
    );
  }

  if (isComplete && compact) {
    return (
      <Card className="bg-gradient-to-r from-success-500/10 to-success-400/10 border border-success-500/30">
        <CardBody className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-success-500 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-success-700 dark:text-success-400">
                Flywheel Active!
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your autonomous social media engine is running
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className="bg-gradient-to-r from-brand-500/10 to-purple-500/10 border border-brand-500/30">
        <CardBody className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center">
                <Rocket className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  Flywheel Setup: {completedSteps}/{steps.length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {currentStep ? `Next: ${currentStep.title}` : "Almost there!"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Progress
                value={progress}
                color="primary"
                className="w-24"
                size="sm"
              />
              {currentStep && (
                <Link href={currentStep.href}>
                  <Button
                    color="primary"
                    size="sm"
                    endContent={<ArrowRight className="w-4 h-4" />}
                  >
                    Continue
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-brand-500/10 via-purple-500/10 to-pink-500/10 border-b">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center">
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Set Up Your Content Flywheel
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Complete these steps to enable autonomous social media marketing
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-brand-600 dark:text-brand-400">
              {progress}%
            </div>
            <Progress
              value={progress}
              color="primary"
              className="w-32"
              size="sm"
            />
          </div>
        </div>
      </CardHeader>

      <CardBody className="p-0">
        <Accordion variant="splitted" className="gap-0 px-4 py-2">
          {steps.map((step, index) => {
            const isCurrent = !step.done && steps.slice(0, index).every((s) => s.done);

            return (
              <AccordionItem
                key={step.id}
                aria-label={step.title}
                title={
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        step.done
                          ? "bg-success-500 text-white"
                          : isCurrent
                          ? "bg-brand-500 text-white ring-2 ring-brand-500/30"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                      }`}
                    >
                      {step.done ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <span className="text-sm font-bold">{step.number}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div
                        className={`font-medium flex items-center ${
                          step.done
                            ? "text-success-700 dark:text-success-400"
                            : isCurrent
                            ? "text-gray-900 dark:text-white"
                            : "text-gray-500"
                        }`}
                      >
                        <span>{step.title}</span>
                        {step.done && (
                          <Chip size="sm" color="success" variant="flat" className="ml-2">
                            Done
                          </Chip>
                        )}
                        {isCurrent && (
                          <Chip size="sm" color="primary" variant="flat" className="ml-2">
                            Current
                          </Chip>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{step.description}</p>
                    </div>
                  </div>
                }
                classNames={{
                  base: `${isCurrent ? "ring-2 ring-brand-500/30 bg-brand-50/50 dark:bg-brand-900/10" : ""}`,
                }}
              >
                <div className="pb-4 pl-11">
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {step.detailedDescription}
                  </p>

                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="w-4 h-4 text-warning-500" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Pro Tips
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {step.tips.map((tip, i) => (
                        <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                          <span className="text-brand-500 mt-1">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {!step.done && (
                    <Link href={step.href}>
                      <Button
                        color={isCurrent ? "primary" : "default"}
                        variant={isCurrent ? "solid" : "flat"}
                        startContent={step.icon}
                        endContent={<ChevronRight className="w-4 h-4" />}
                      >
                        {step.action}
                      </Button>
                    </Link>
                  )}
                </div>
              </AccordionItem>
            );
          })}
        </Accordion>

        {isComplete && (
          <div className="px-4 py-6 bg-gradient-to-r from-success-500/10 to-success-400/10 border-t">
            <div className="flex items-center justify-center gap-4">
              <Trophy className="w-12 h-12 text-success-500" />
              <div className="text-center">
                <h4 className="text-xl font-bold text-success-700 dark:text-success-400">
                  Congratulations! Your Flywheel is Active!
                </h4>
                <p className="text-gray-600 dark:text-gray-400">
                  Your autonomous social media marketing engine is now running 24/7
                </p>
              </div>
            </div>
            {onDismiss && (
              <div className="flex justify-center mt-4">
                <Button variant="flat" onPress={onDismiss}>
                  Dismiss Guide
                </Button>
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
