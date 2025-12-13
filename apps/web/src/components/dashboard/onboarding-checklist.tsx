"use client";

/**
 * Onboarding Checklist Component - PKG-026
 * Shows setup progress for new users
 */

import { Card, CardBody, Button, Progress } from "@heroui/react";
import { useRouter } from "next/navigation";
import {
  Brain,
  Users,
  Layers,
  Share2,
  Sparkles,
  CheckCircle,
  Circle,
  ArrowRight,
  X,
} from "lucide-react";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  isComplete: boolean;
}

interface OnboardingChecklistProps {
  brandBrain: {
    isSetup: boolean;
    audienceCount: number;
    pillarCount: number;
  };
  accountsConnected: number;
  contentPublished: number;
  onDismiss?: () => void;
}

export function OnboardingChecklist({
  brandBrain,
  accountsConnected,
  contentPublished,
  onDismiss,
}: OnboardingChecklistProps) {
  const router = useRouter();

  const steps: OnboardingStep[] = [
    {
      id: "brand",
      title: "Set up Brand Brain",
      description: "Define your company, voice, and tone",
      icon: Brain,
      href: "/dashboard/brand",
      isComplete: brandBrain.isSetup,
    },
    {
      id: "audience",
      title: "Add Target Audience",
      description: "Define who you're creating content for",
      icon: Users,
      href: "/dashboard/brand?tab=audience",
      isComplete: brandBrain.audienceCount > 0,
    },
    {
      id: "pillars",
      title: "Create Content Pillars",
      description: "Define your content themes and topics",
      icon: Layers,
      href: "/dashboard/brand?tab=pillars",
      isComplete: brandBrain.pillarCount > 0,
    },
    {
      id: "connect",
      title: "Connect Social Accounts",
      description: "Link your Twitter, LinkedIn, or other accounts",
      icon: Share2,
      href: "/dashboard/social/accounts",
      isComplete: accountsConnected > 0,
    },
    {
      id: "publish",
      title: "Publish Your First Post",
      description: "Generate and publish AI-powered content",
      icon: Sparkles,
      href: "/dashboard/content",
      isComplete: contentPublished > 0,
    },
  ];

  const completedCount = steps.filter((s) => s.isComplete).length;
  const progress = (completedCount / steps.length) * 100;

  // Don't show if all complete
  if (completedCount === steps.length) {
    return null;
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardBody className="space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold">Getting Started</h3>
            <p className="text-sm text-default-500">
              Complete these steps to unlock the full power of Epic AI
            </p>
          </div>
          {onDismiss && (
            <Button isIconOnly size="sm" variant="light" onPress={onDismiss}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Progress value={progress} className="flex-1" color="primary" />
          <span className="text-sm text-default-500">
            {completedCount}/{steps.length}
          </span>
        </div>

        <div className="space-y-2">
          {steps.map((step) => {
            const Icon = step.icon;
            const StatusIcon = step.isComplete ? CheckCircle : Circle;

            return (
              <div
                key={step.id}
                onClick={() => !step.isComplete && router.push(step.href)}
                className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                  step.isComplete
                    ? "bg-success/5"
                    : "bg-default-50 hover:bg-default-100 cursor-pointer"
                }`}
              >
                <div className="flex items-center gap-3">
                  <StatusIcon
                    className={`w-5 h-5 ${
                      step.isComplete ? "text-success" : "text-default-300"
                    }`}
                  />
                  <div>
                    <p
                      className={`text-sm font-medium ${
                        step.isComplete ? "text-default-400 line-through" : ""
                      }`}
                    >
                      {step.title}
                    </p>
                    <p className="text-xs text-default-400">
                      {step.description}
                    </p>
                  </div>
                </div>
                {!step.isComplete && (
                  <ArrowRight className="w-4 h-4 text-default-400" />
                )}
              </div>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}
