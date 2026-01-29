"use client";

import { Card, CardBody, Checkbox, Chip } from "@heroui/react";
import {
  BarChart3,
  CheckCircle,
  XCircle,
  Target,
  Calendar,
  Mail,
  Brain,
} from "lucide-react";
import type { LearnWizardData } from "@/lib/flywheel/types";

interface LearnReviewStepProps {
  data: LearnWizardData;
  updateData: (updates: Partial<LearnWizardData>) => void;
}

const METRIC_LABELS: Record<string, string> = {
  impressions: "Impressions",
  reach: "Reach",
  engagement: "Engagement",
  clicks: "Link Clicks",
  followers: "Follower Growth",
  conversions: "Conversions",
  leads: "Leads Generated",
};

export function LearnReviewStep({ data, updateData }: LearnReviewStepProps) {
  const metrics = data.priorityMetrics || [];
  const goals = data.optimizationGoals || [];

  // Check completion status
  const hasMetrics = metrics.length >= 1;
  const hasReporting = !!data.reportFrequency;
  const hasGoals = goals.length >= 1;

  const completionItems = [
    {
      label: "Priority Metrics",
      complete: hasMetrics,
      detail: hasMetrics
        ? `Tracking ${metrics.length} metric${metrics.length !== 1 ? "s" : ""}`
        : "No metrics selected",
      icon: BarChart3,
    },
    {
      label: "Reporting Schedule",
      complete: hasReporting,
      detail: hasReporting
        ? `${data.reportFrequency} reports${data.reportEmail ? " via email" : ""}`
        : "Not configured",
      icon: Calendar,
    },
    {
      label: "Learning Goals",
      complete: hasGoals,
      detail: hasGoals
        ? `${goals.length} optimization goal${goals.length !== 1 ? "s" : ""}`
        : "No goals set",
      icon: Target,
    },
  ];

  const getFrequencyLabel = () => {
    switch (data.reportFrequency) {
      case "daily":
        return "Daily";
      case "weekly":
        return "Weekly";
      case "monthly":
        return "Monthly";
      default:
        return "Not set";
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-gray-600 dark:text-gray-400">
        Review your analytics and learning settings before activating. These
        settings determine how Epic AI learns from your content performance.
      </p>

      {/* Completion Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {completionItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.label}
              className={`border ${
                item.complete
                  ? "border-green-200 dark:border-green-800"
                  : "border-amber-200 dark:border-amber-800"
              }`}
            >
              <CardBody className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      item.complete
                        ? "bg-green-100 dark:bg-green-900"
                        : "bg-amber-100 dark:bg-amber-900"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        item.complete
                          ? "text-green-600 dark:text-green-400"
                          : "text-amber-600 dark:text-amber-400"
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {item.label}
                      </p>
                      {item.complete ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-amber-600" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {item.detail}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Metrics Summary */}
      {hasMetrics && (
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardBody className="p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Tracked Metrics
            </h4>
            <div className="flex flex-wrap gap-2">
              {metrics.map((metric) => (
                <Chip key={metric} color="secondary" variant="flat">
                  {METRIC_LABELS[metric] || metric}
                </Chip>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Reporting Summary */}
      <Card className="border border-gray-200 dark:border-gray-700">
        <CardBody className="p-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Reporting Settings
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Frequency
              </p>
              <p className="font-medium text-gray-900 dark:text-white">
                {getFrequencyLabel()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Email Reports
              </p>
              <div className="flex items-center gap-2">
                <Mail
                  className={`w-4 h-4 ${
                    data.reportEmail
                      ? "text-green-600"
                      : "text-gray-400"
                  }`}
                />
                <span className="font-medium text-gray-900 dark:text-white">
                  {data.reportEmail !== false ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Goals Summary */}
      {hasGoals && (
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardBody className="p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Optimization Goals
            </h4>
            <div className="space-y-2">
              {goals.map((goal) => (
                <div
                  key={goal.metric}
                  className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <span className="font-medium text-gray-900 dark:text-white">
                    {METRIC_LABELS[goal.metric] || goal.metric}
                  </span>
                  <div className="flex items-center gap-2">
                    {goal.target && (
                      <Chip size="sm" variant="flat">
                        Target: {goal.target}
                      </Chip>
                    )}
                    <Chip
                      size="sm"
                      color={
                        goal.priority === "high"
                          ? "danger"
                          : goal.priority === "medium"
                          ? "warning"
                          : "default"
                      }
                      variant="flat"
                    >
                      {goal.priority}
                    </Chip>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* AI Learning Note */}
      <Card className="border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/30">
        <CardBody className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-800">
              <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="font-medium text-purple-900 dark:text-purple-100">
                The AI Learning Loop
              </p>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                After you publish content, Epic AI will analyze performance and
                feed insights back into your Brand Brain, continuously improving
                future content.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Confirmation */}
      <Card className="border border-gray-200 dark:border-gray-700">
        <CardBody className="p-4">
          <Checkbox
            isSelected={data.confirmed}
            onValueChange={(value) => updateData({ confirmed: value })}
            classNames={{
              label: "text-gray-700 dark:text-gray-300",
            }}
          >
            <span>
              I confirm my analytics settings are correct and I&apos;m ready to
              start the learning loop.
            </span>
          </Checkbox>
        </CardBody>
      </Card>
    </div>
  );
}
