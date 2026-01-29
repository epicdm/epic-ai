"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  Checkbox,
  Chip,
  RadioGroup,
  Radio,
} from "@heroui/react";
import {
  Heart,
  Eye,
  MousePointer,
  Users,
  BarChart3,
  Target,
  UserPlus,
} from "lucide-react";
import type { StreamlinedWizardData } from "../streamlined-flywheel-wizard";
import { AIAssistButton } from "../ai-assist-button";

interface KeyMetricsStepProps {
  data: Partial<StreamlinedWizardData>;
  updateData: (data: Partial<StreamlinedWizardData>) => void;
}

type MetricType =
  | "engagement"
  | "reach"
  | "clicks"
  | "followers"
  | "impressions"
  | "conversions"
  | "leads";

interface MetricOption {
  id: MetricType;
  label: string;
  description: string;
  icon: React.ElementType;
  recommended: boolean;
}

const METRICS: MetricOption[] = [
  {
    id: "engagement",
    label: "Engagement Rate",
    description: "Likes, comments, shares, and saves",
    icon: Heart,
    recommended: true,
  },
  {
    id: "reach",
    label: "Reach",
    description: "Unique people who see your content",
    icon: Eye,
    recommended: true,
  },
  {
    id: "clicks",
    label: "Click-through Rate",
    description: "Link clicks from your posts",
    icon: MousePointer,
    recommended: true,
  },
  {
    id: "followers",
    label: "Follower Growth",
    description: "New followers gained per week",
    icon: UserPlus,
    recommended: false,
  },
  {
    id: "impressions",
    label: "Impressions",
    description: "Total times your content is viewed",
    icon: BarChart3,
    recommended: false,
  },
  {
    id: "conversions",
    label: "Conversions",
    description: "Goal completions (signups, purchases)",
    icon: Target,
    recommended: false,
  },
  {
    id: "leads",
    label: "Leads Generated",
    description: "Contact form submissions and inquiries",
    icon: Users,
    recommended: false,
  },
];

const REPORT_FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
];

type ReportFrequency = "weekly" | "biweekly" | "monthly";

export function KeyMetricsStep({ data, updateData }: KeyMetricsStepProps) {
  const [selectedMetrics, setSelectedMetrics] = useState<MetricType[]>(
    (data.priorityMetrics as MetricType[]) || ["engagement", "reach", "clicks"]
  );
  const [reportFrequency, setReportFrequency] = useState<ReportFrequency>(
    (data.reportFrequency as ReportFrequency) || "weekly"
  );
  const [isLoadingAISuggestions, setIsLoadingAISuggestions] = useState(false);

  useEffect(() => {
    updateData({
      priorityMetrics: selectedMetrics,
      reportFrequency,
    });
  }, [selectedMetrics, reportFrequency, updateData]);

  // AI-powered metrics suggestions based on goals
  const handleAISuggest = async () => {
    setIsLoadingAISuggestions(true);
    try {
      // Get context from previous wizard data
      const goals = data.optimizationGoals || [];
      const industry = data.industry || "";

      // Simulate AI suggestion
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Determine metrics based on goals/industry
      let suggestedMetrics: MetricType[] = ["engagement", "reach"];

      if (industry.toLowerCase().includes("ecommerce") || industry.toLowerCase().includes("retail")) {
        suggestedMetrics = ["clicks", "conversions", "reach", "engagement"];
      } else if (industry.toLowerCase().includes("saas") || industry.toLowerCase().includes("tech")) {
        suggestedMetrics = ["leads", "clicks", "engagement", "reach"];
      } else if (industry.toLowerCase().includes("consulting") || industry.toLowerCase().includes("service")) {
        suggestedMetrics = ["leads", "engagement", "reach"];
      } else {
        suggestedMetrics = ["engagement", "reach", "clicks"];
      }

      setSelectedMetrics(suggestedMetrics);
    } catch (error) {
      console.error("Error getting AI suggestions:", error);
    } finally {
      setIsLoadingAISuggestions(false);
    }
  };

  const handleToggleMetric = (metricId: MetricType) => {
    setSelectedMetrics((prev) => {
      if (prev.includes(metricId)) {
        // Don't allow deselecting if it would leave fewer than 3
        if (prev.length <= 3) return prev;
        return prev.filter((m) => m !== metricId);
      } else {
        // Don't allow selecting more than 5
        if (prev.length >= 5) return prev;
        return [...prev, metricId];
      }
    });
  };

  const isValid = selectedMetrics.length >= 3 && selectedMetrics.length <= 5;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Key Metrics
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Select 3-5 metrics that matter most to your goals
          </p>
        </div>
        <AIAssistButton
          onSuggest={handleAISuggest}
          loading={isLoadingAISuggestions}
          label="AI Suggest"
          tooltip="Get metric suggestions based on your industry and goals"
        />
      </div>

      {/* Metrics Selection */}
      <div className="space-y-3">
        {METRICS.map((metric) => {
          const Icon = metric.icon;
          const isSelected = selectedMetrics.includes(metric.id);
          const isDisabledSelect =
            !isSelected && selectedMetrics.length >= 5;
          const isDisabledDeselect =
            isSelected && selectedMetrics.length <= 3;

          return (
            <Card
              key={metric.id}
              isPressable={!isDisabledSelect && !isDisabledDeselect}
              className={`transition-all ${
                isSelected
                  ? "border-2 border-primary bg-primary/5"
                  : isDisabledSelect
                  ? "opacity-50 cursor-not-allowed border-2 border-transparent"
                  : "border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-700"
              }`}
              onPress={() => {
                if (!isDisabledSelect && !isDisabledDeselect) {
                  handleToggleMetric(metric.id);
                }
              }}
            >
              <CardBody className="flex flex-row items-center gap-4 py-4">
                <Checkbox
                  isSelected={isSelected}
                  isDisabled={isDisabledSelect || isDisabledDeselect}
                  onValueChange={() => handleToggleMetric(metric.id)}
                  size="lg"
                />
                <div
                  className={`p-2 rounded-lg ${
                    isSelected
                      ? "bg-primary/10"
                      : "bg-gray-100 dark:bg-gray-800"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      isSelected ? "text-primary" : "text-gray-500"
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {metric.label}
                    </p>
                    {metric.recommended && (
                      <Chip size="sm" color="primary" variant="flat">
                        Recommended
                      </Chip>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {metric.description}
                  </p>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Selection Counter */}
      <div className="flex items-center justify-center">
        <Chip
          size="lg"
          color={isValid ? "primary" : "warning"}
          variant="flat"
        >
          {selectedMetrics.length} of 3-5 selected
        </Chip>
      </div>

      {/* Report Frequency */}
      <Card>
        <CardBody className="space-y-4">
          <div>
            <p className="font-medium text-gray-900 dark:text-white mb-1">
              Report Frequency
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              How often would you like to receive performance reports?
            </p>
          </div>

          <RadioGroup
            value={reportFrequency}
            onValueChange={(value) => setReportFrequency(value as ReportFrequency)}
            orientation="horizontal"
          >
            {REPORT_FREQUENCIES.map((freq) => (
              <Radio key={freq.value} value={freq.value}>
                {freq.label}
              </Radio>
            ))}
          </RadioGroup>
        </CardBody>
      </Card>

      {/* Summary */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        You&apos;ll receive {reportFrequency} reports tracking{" "}
        {selectedMetrics.length} key metrics
      </div>
    </div>
  );
}
