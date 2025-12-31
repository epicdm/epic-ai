"use client";

import { Card, CardBody, Button } from "@heroui/react";
import {
  Zap,
  Bot,
  Clock,
  TrendingUp,
  Shield,
  Sparkles,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import type { AutomateWizardData } from "@/lib/flywheel/types";

interface AutopilotIntroStepProps {
  data: AutomateWizardData;
  updateData: (updates: Partial<AutomateWizardData>) => void;
}

const AUTOMATION_LEVELS = [
  {
    icon: Shield,
    title: "Full Control",
    description: "Review and approve every piece of content before it posts",
    color: "blue",
  },
  {
    icon: Clock,
    title: "Smart Queue",
    description: "AI queues content, you approve batches at your convenience",
    color: "purple",
  },
  {
    icon: Bot,
    title: "Full Autopilot",
    description: "AI handles everything—you just monitor and adjust",
    color: "orange",
  },
];

const BENEFITS = [
  {
    icon: TrendingUp,
    title: "Consistent Growth",
    description: "Never miss a post with automated scheduling",
  },
  {
    icon: Sparkles,
    title: "AI Learning",
    description: "System continuously improves based on performance",
  },
  {
    icon: Clock,
    title: "Time Savings",
    description: "Reclaim hours every week while maintaining presence",
  },
];

export function AutopilotIntroStep({ data, updateData }: AutopilotIntroStepProps) {
  const handleContinue = () => {
    updateData({ seenIntro: true });
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="text-center py-4">
        <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-orange-100 dark:bg-orange-900/30 mb-4">
          <Zap className="w-10 h-10 text-orange-600 dark:text-orange-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Your AI Autopilot Is Ready
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
          You&apos;ve set up the entire flywheel. Now let&apos;s configure how much
          automation you want—from full control to complete autopilot.
        </p>
      </div>

      {/* Automation Levels Preview */}
      <Card className="border border-gray-200 dark:border-gray-700">
        <CardBody className="p-6">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4">
            Choose Your Automation Level
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {AUTOMATION_LEVELS.map((level) => {
              const Icon = level.icon;
              const colorClasses = {
                blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
                purple: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
                orange: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
              }[level.color];

              return (
                <div
                  key={level.title}
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-center"
                >
                  <div className={`inline-flex p-3 rounded-xl ${colorClasses} mb-3`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h5 className="font-medium text-gray-900 dark:text-white mb-1">
                    {level.title}
                  </h5>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {level.description}
                  </p>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* Benefits */}
      <Card className="border border-gray-200 dark:border-gray-700">
        <CardBody className="p-6">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4">
            Why Automate?
          </h4>
          <div className="space-y-4">
            {BENEFITS.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div key={benefit.title} className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                    <Icon className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {benefit.title}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* How It Works */}
      <Card className="border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/30">
        <CardBody className="p-4">
          <h5 className="font-medium text-orange-900 dark:text-orange-100 mb-2">
            The Flywheel in Motion
          </h5>
          <div className="text-sm text-orange-700 dark:text-orange-300 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>Brand Brain informs content creation</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>Content Factory generates on-brand posts</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>Publishing Engine distributes at optimal times</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>Analytics track performance</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>Learning loop improves everything</span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* CTA */}
      <div className="text-center">
        <Button
          color="primary"
          size="lg"
          endContent={<ArrowRight className="w-4 h-4" />}
          onPress={handleContinue}
          className={data.seenIntro ? "bg-green-600" : "bg-orange-600"}
        >
          {data.seenIntro ? "Let's Configure" : "I'm Ready to Automate"}
        </Button>
      </div>
    </div>
  );
}
