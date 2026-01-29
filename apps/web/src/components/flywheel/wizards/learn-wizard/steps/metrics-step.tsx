"use client";

import { Card, CardBody, CheckboxGroup, Checkbox, Chip } from "@heroui/react";
import {
  Eye,
  Users,
  Heart,
  MousePointer,
  UserPlus,
  Target,
  DollarSign,
} from "lucide-react";
import type { LearnWizardData, MetricType } from "@/lib/flywheel/types";

interface MetricsStepProps {
  data: LearnWizardData;
  updateData: (updates: Partial<LearnWizardData>) => void;
}

const METRICS = [
  {
    id: "impressions" as MetricType,
    name: "Impressions",
    description: "How many times your content is displayed",
    icon: Eye,
    category: "Reach",
  },
  {
    id: "reach" as MetricType,
    name: "Reach",
    description: "Unique accounts that see your content",
    icon: Users,
    category: "Reach",
  },
  {
    id: "engagement" as MetricType,
    name: "Engagement",
    description: "Likes, comments, shares, and saves",
    icon: Heart,
    category: "Engagement",
  },
  {
    id: "clicks" as MetricType,
    name: "Link Clicks",
    description: "Clicks on links in your posts",
    icon: MousePointer,
    category: "Engagement",
  },
  {
    id: "followers" as MetricType,
    name: "Follower Growth",
    description: "Net new followers over time",
    icon: UserPlus,
    category: "Growth",
  },
  {
    id: "conversions" as MetricType,
    name: "Conversions",
    description: "Goal completions from social traffic",
    icon: Target,
    category: "Business",
  },
  {
    id: "leads" as MetricType,
    name: "Leads Generated",
    description: "New leads from social channels",
    icon: DollarSign,
    category: "Business",
  },
];

export function MetricsStep({ data, updateData }: MetricsStepProps) {
  const selectedMetrics = data.priorityMetrics || [];

  const handleChange = (values: string[]) => {
    updateData({ priorityMetrics: values as MetricType[] });
  };

  const categories = [...new Set(METRICS.map((m) => m.category))];

  return (
    <div className="space-y-6">
      <p className="text-gray-600 dark:text-gray-400">
        Choose which metrics matter most to your business. We&apos;ll prioritize
        these in your reports and use them to generate insights.
      </p>

      {/* Selection Summary */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Selected metrics:
        </span>
        <Chip
          size="sm"
          color={selectedMetrics.length >= 3 ? "success" : "warning"}
          variant="flat"
        >
          {selectedMetrics.length} of {METRICS.length}
        </Chip>
        {selectedMetrics.length < 3 && (
          <span className="text-sm text-amber-600 dark:text-amber-400">
            (Select at least 3 for best insights)
          </span>
        )}
      </div>

      {/* Metrics by Category */}
      <CheckboxGroup
        value={selectedMetrics}
        onValueChange={handleChange}
        classNames={{
          wrapper: "gap-6",
        }}
      >
        {categories.map((category) => (
          <div key={category} className="space-y-3">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {category}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {METRICS.filter((m) => m.category === category).map((metric) => {
                const Icon = metric.icon;
                const isSelected = selectedMetrics.includes(metric.id);

                return (
                  <Checkbox
                    key={metric.id}
                    value={metric.id}
                    classNames={{
                      base: `border rounded-lg p-3 m-0 max-w-full transition-all ${
                        isSelected
                          ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }`,
                      wrapper: "hidden",
                      label: "w-full cursor-pointer",
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          isSelected
                            ? "bg-purple-100 dark:bg-purple-900"
                            : "bg-gray-100 dark:bg-gray-800"
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 ${
                            isSelected
                              ? "text-purple-600 dark:text-purple-400"
                              : "text-gray-500"
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <p
                          className={`font-medium ${
                            isSelected
                              ? "text-purple-900 dark:text-purple-100"
                              : "text-gray-900 dark:text-white"
                          }`}
                        >
                          {metric.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {metric.description}
                        </p>
                      </div>
                    </div>
                  </Checkbox>
                );
              })}
            </div>
          </div>
        ))}
      </CheckboxGroup>

      {/* Recommendation */}
      <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30">
        <CardBody className="p-4">
          <h5 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
            Recommended for Most Businesses
          </h5>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Start with <strong>Engagement</strong>, <strong>Reach</strong>, and{" "}
            <strong>Follower Growth</strong>. These give you a balanced view of
            how your content performs and how your audience is growing.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
