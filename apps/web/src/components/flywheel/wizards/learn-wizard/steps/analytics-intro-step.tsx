"use client";

import { Card, CardBody, Button } from "@heroui/react";
import {
  BarChart3,
  TrendingUp,
  Brain,
  RefreshCw,
  Target,
  Zap,
  ArrowRight,
} from "lucide-react";
import type { LearnWizardData } from "@/lib/flywheel/types";

interface AnalyticsIntroStepProps {
  data: LearnWizardData;
  updateData: (updates: Partial<LearnWizardData>) => void;
}

const LEARNING_LOOP_STEPS = [
  {
    icon: BarChart3,
    title: "Collect Data",
    description: "We track impressions, engagement, clicks, and more across all your connected platforms",
    color: "blue",
  },
  {
    icon: Brain,
    title: "AI Analysis",
    description: "Our AI analyzes patterns, identifies what works best, and spots opportunities",
    color: "purple",
  },
  {
    icon: TrendingUp,
    title: "Generate Insights",
    description: "Get actionable recommendations to improve your content strategy",
    color: "green",
  },
  {
    icon: RefreshCw,
    title: "Apply Learnings",
    description: "Insights feed back into your Brand Brain, making future content even better",
    color: "orange",
  },
];

export function AnalyticsIntroStep({ data, updateData }: AnalyticsIntroStepProps) {
  const handleContinue = () => {
    updateData({ seenIntro: true });
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="text-center py-4">
        <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-purple-100 dark:bg-purple-900/30 mb-4">
          <BarChart3 className="w-10 h-10 text-purple-600 dark:text-purple-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          The Learning Loop
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
          Epic AI doesn&apos;t just post content—it learns from every interaction.
          The more you use it, the better it gets at reaching your audience.
        </p>
      </div>

      {/* Learning Loop Visualization */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {LEARNING_LOOP_STEPS.map((step, index) => {
          const Icon = step.icon;
          const colorClasses = {
            blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
            purple: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
            green: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
            orange: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
          }[step.color];

          return (
            <Card
              key={step.title}
              className="border border-gray-200 dark:border-gray-700 relative"
            >
              <CardBody className="p-4 text-center">
                <div className="absolute -top-3 left-4 bg-gray-100 dark:bg-gray-800 px-2 text-xs font-medium text-gray-500">
                  Step {index + 1}
                </div>
                <div className={`inline-flex p-3 rounded-xl ${colorClasses} mb-3`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  {step.title}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {step.description}
                </p>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Features Grid */}
      <Card className="border border-gray-200 dark:border-gray-700">
        <CardBody className="p-6">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4">
            What You&apos;ll Get
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Target className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Performance Metrics
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Track impressions, engagement, and growth across all platforms
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  AI-Powered Insights
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Get recommendations based on your actual performance data
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Weekly Reports
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Automated summaries delivered to your inbox
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Zap className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Continuous Improvement
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Every insight feeds back into your content strategy
                </p>
              </div>
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
          className={data.seenIntro ? "bg-green-600" : ""}
        >
          {data.seenIntro ? "Let's Configure Analytics" : "I Understand, Let's Set It Up"}
        </Button>
      </div>
    </div>
  );
}
