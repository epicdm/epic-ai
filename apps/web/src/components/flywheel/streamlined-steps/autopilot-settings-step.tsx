"use client";

import { useState, useEffect } from "react";
import {
  Button,
  Card,
  CardBody,
  RadioGroup,
  Radio,
  Slider,
  Chip,
  Spinner,
} from "@heroui/react";
import {
  Sparkles,
  Eye,
  Clock,
  Zap,
  AlertTriangle,
} from "lucide-react";
import type { StreamlinedWizardData } from "../streamlined-flywheel-wizard";

interface AutopilotSettingsStepProps {
  data: Partial<StreamlinedWizardData>;
  updateData: (data: Partial<StreamlinedWizardData>) => void;
}

type ApprovalMode = "review" | "auto_queue" | "auto_post";

interface ModeOption {
  id: ApprovalMode;
  label: string;
  description: string;
  icon: React.ElementType;
  recommended?: boolean;
  warning?: string;
}

const APPROVAL_MODES: ModeOption[] = [
  {
    id: "review",
    label: "Review Mode",
    description: "AI generates content, you review and approve before publishing",
    icon: Eye,
    recommended: true,
  },
  {
    id: "auto_queue",
    label: "Auto-Queue Mode",
    description: "AI generates and schedules content, you can edit before publish",
    icon: Clock,
  },
  {
    id: "auto_post",
    label: "Auto-Post Mode (Autopilot)",
    description: "AI generates and publishes content automatically",
    icon: Zap,
    warning: "Content will be published without your review",
  },
];

interface ContentMix {
  educational: number;
  promotional: number;
  entertaining: number;
  engaging: number;
}

const DEFAULT_CONTENT_MIX: ContentMix = {
  educational: 40,
  promotional: 20,
  entertaining: 20,
  engaging: 20,
};

export function AutopilotSettingsStep({
  data,
  updateData,
}: AutopilotSettingsStepProps) {
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>(
    (data.approvalMode as ApprovalMode) || "review"
  );
  const [postsPerWeek, setPostsPerWeek] = useState<number>(
    (data.postsPerWeek as number) || 7
  );
  const [contentMix, setContentMix] = useState<ContentMix>(
    (data.contentMix as ContentMix) || DEFAULT_CONTENT_MIX
  );
  const [isSuggesting, setIsSuggesting] = useState(false);

  useEffect(() => {
    updateData({
      approvalMode,
      postsPerWeek,
      contentMix,
    });
  }, [approvalMode, postsPerWeek, contentMix, updateData]);

  const handleContentMixChange = (type: keyof ContentMix, value: number) => {
    const newMix = { ...contentMix, [type]: value };

    // Auto-balance other values to total 100%
    const total = Object.values(newMix).reduce((sum, v) => sum + v, 0);
    if (total !== 100) {
      const diff = 100 - total;
      const otherTypes = (Object.keys(newMix) as (keyof ContentMix)[]).filter(
        (t) => t !== type
      );

      // Distribute the difference proportionally among other types
      let remaining = diff;
      otherTypes.forEach((t, i) => {
        if (i === otherTypes.length - 1) {
          newMix[t] = Math.max(0, Math.min(100, newMix[t] + remaining));
        } else {
          const adjustment = Math.round(diff / otherTypes.length);
          newMix[t] = Math.max(0, Math.min(100, newMix[t] + adjustment));
          remaining -= adjustment;
        }
      });
    }

    setContentMix(newMix);
  };

  const handleAISuggest = async () => {
    setIsSuggesting(true);

    try {
      const response = await fetch("/api/ai/suggest-content-mix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry: data.industry,
          goal: data.primaryGoal,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.contentMix) {
          setContentMix(result.contentMix);
        } else {
          applySuggestedMix();
        }
      } else {
        applySuggestedMix();
      }
    } catch (error) {
      console.error("Error getting AI suggestion:", error);
      applySuggestedMix();
    } finally {
      setIsSuggesting(false);
    }
  };

  const applySuggestedMix = () => {
    // Suggest based on primary goal
    const goal = data.primaryGoal as string;

    if (goal === "engagement") {
      setContentMix({ educational: 30, promotional: 10, entertaining: 30, engaging: 30 });
    } else if (goal === "leads" || goal === "conversions") {
      setContentMix({ educational: 35, promotional: 35, entertaining: 10, engaging: 20 });
    } else if (goal === "growth") {
      setContentMix({ educational: 40, promotional: 15, entertaining: 25, engaging: 20 });
    } else {
      setContentMix({ educational: 40, promotional: 20, entertaining: 20, engaging: 20 });
    }
  };

  const totalMix = Object.values(contentMix).reduce((sum, v) => sum + v, 0);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Autopilot Settings
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Configure how AI manages your content
        </p>
      </div>

      {/* Approval Mode */}
      <div className="space-y-3">
        <p className="font-medium text-gray-700 dark:text-gray-300">
          Approval Mode
        </p>

        <RadioGroup
          value={approvalMode}
          onValueChange={(value) => setApprovalMode(value as ApprovalMode)}
        >
          {APPROVAL_MODES.map((mode) => {
            const Icon = mode.icon;
            const isSelected = approvalMode === mode.id;

            return (
              <Card
                key={mode.id}
                isPressable
                className={`transition-all ${
                  isSelected
                    ? "border-2 border-primary bg-primary/5"
                    : "border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                }`}
                onPress={() => setApprovalMode(mode.id)}
              >
                <CardBody className="flex flex-row items-start gap-4 py-4">
                  <Radio value={mode.id} className="mt-1" />
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
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {mode.label}
                      </p>
                      {mode.recommended && (
                        <Chip size="sm" color="primary" variant="flat">
                          Recommended
                        </Chip>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {mode.description}
                    </p>
                    {mode.warning && isSelected && (
                      <div className="flex items-center gap-1 mt-2 text-sm text-warning">
                        <AlertTriangle className="w-4 h-4" />
                        {mode.warning}
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </RadioGroup>
      </div>

      {/* Posts Per Week */}
      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Posts Per Week
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                How many posts should AI create each week?
              </p>
            </div>
            <Chip size="lg" color="primary" variant="flat">
              {postsPerWeek} posts
            </Chip>
          </div>
          <Slider
            size="lg"
            step={1}
            minValue={1}
            maxValue={21}
            value={postsPerWeek}
            onChange={(value) => setPostsPerWeek(value as number)}
            marks={[
              { value: 1, label: "1" },
              { value: 7, label: "7" },
              { value: 14, label: "14" },
              { value: 21, label: "21" },
            ]}
            className="max-w-full"
          />
        </CardBody>
      </Card>

      {/* Content Mix */}
      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Content Mix
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Balance of content types (must total 100%)
              </p>
            </div>
            <Button
              size="sm"
              color="primary"
              variant="flat"
              startContent={
                isSuggesting ? (
                  <Spinner size="sm" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )
              }
              onPress={handleAISuggest}
              isDisabled={isSuggesting}
            >
              AI Suggest
            </Button>
          </div>

          <div className="space-y-4">
            {[
              { key: "educational" as const, label: "Educational", color: "bg-blue-500" },
              { key: "promotional" as const, label: "Promotional", color: "bg-amber-500" },
              { key: "entertaining" as const, label: "Entertaining", color: "bg-purple-500" },
              { key: "engaging" as const, label: "Engaging", color: "bg-green-500" },
            ].map(({ key, label, color }) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {label}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {contentMix[key]}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${color}`} />
                  <Slider
                    size="sm"
                    step={5}
                    minValue={0}
                    maxValue={100}
                    value={contentMix[key]}
                    onChange={(value) =>
                      handleContentMixChange(key, value as number)
                    }
                    className="flex-1"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Mix Visualization */}
          <div className="h-4 rounded-full overflow-hidden flex">
            <div
              className="bg-blue-500 transition-all"
              style={{ width: `${contentMix.educational}%` }}
            />
            <div
              className="bg-amber-500 transition-all"
              style={{ width: `${contentMix.promotional}%` }}
            />
            <div
              className="bg-purple-500 transition-all"
              style={{ width: `${contentMix.entertaining}%` }}
            />
            <div
              className="bg-green-500 transition-all"
              style={{ width: `${contentMix.engaging}%` }}
            />
          </div>

          {totalMix !== 100 && (
            <p className="text-sm text-warning text-center">
              Total: {totalMix}% (should be 100%)
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
