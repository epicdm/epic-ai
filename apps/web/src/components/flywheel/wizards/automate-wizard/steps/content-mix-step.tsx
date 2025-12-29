"use client";

import { useState, useEffect } from "react";
import { Card, CardBody, Slider, Button, Chip } from "@heroui/react";
import { BookOpen, Megaphone, Smile, MessageCircle, RotateCcw, Sparkles } from "lucide-react";
import type { AutomateWizardData, ContentMixSettings } from "@/lib/flywheel/types";

interface ContentMixStepProps {
  data: AutomateWizardData;
  updateData: (updates: Partial<AutomateWizardData>) => void;
}

const CONTENT_TYPES = [
  {
    id: "educational" as const,
    name: "Educational",
    description: "Tips, how-tos, industry insights",
    icon: BookOpen,
    color: "blue",
    defaultValue: 40,
  },
  {
    id: "promotional" as const,
    name: "Promotional",
    description: "Product/service highlights, offers",
    icon: Megaphone,
    color: "green",
    defaultValue: 20,
  },
  {
    id: "entertaining" as const,
    name: "Entertaining",
    description: "Fun content, memes, behind-the-scenes",
    icon: Smile,
    color: "yellow",
    defaultValue: 20,
  },
  {
    id: "engaging" as const,
    name: "Engaging",
    description: "Questions, polls, conversation starters",
    icon: MessageCircle,
    color: "purple",
    defaultValue: 20,
  },
];

const PRESETS = [
  {
    name: "Balanced (Recommended)",
    mix: { educational: 40, promotional: 20, entertaining: 20, engaging: 20 },
  },
  {
    name: "Thought Leader",
    mix: { educational: 60, promotional: 10, entertaining: 10, engaging: 20 },
  },
  {
    name: "Community Builder",
    mix: { educational: 25, promotional: 15, entertaining: 30, engaging: 30 },
  },
  {
    name: "Sales Focused",
    mix: { educational: 30, promotional: 40, entertaining: 10, engaging: 20 },
  },
];

export function ContentMixStep({ data, updateData }: ContentMixStepProps) {
  const [localMix, setLocalMix] = useState<ContentMixSettings>(
    data.contentMix || {
      educational: 40,
      promotional: 20,
      entertaining: 20,
      engaging: 20,
    }
  );

  const total = localMix.educational + localMix.promotional + localMix.entertaining + localMix.engaging;
  const isValid = total === 100;

  useEffect(() => {
    if (isValid) {
      updateData({ contentMix: localMix });
    }
  }, [localMix, isValid, updateData]);

  const handleSliderChange = (type: keyof ContentMixSettings, value: number) => {
    setLocalMix((prev) => ({
      ...prev,
      [type]: value,
    }));
  };

  const applyPreset = (mix: ContentMixSettings) => {
    setLocalMix(mix);
  };

  const resetToDefault = () => {
    setLocalMix({
      educational: 40,
      promotional: 20,
      entertaining: 20,
      engaging: 20,
    });
  };

  return (
    <div className="space-y-6">
      <p className="text-gray-600 dark:text-gray-400">
        Define the balance of content types the AI will create. The total must
        equal 100%.
      </p>

      {/* Total Indicator */}
      <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Total allocation:
        </span>
        <Chip
          color={isValid ? "success" : total > 100 ? "danger" : "warning"}
          variant="flat"
        >
          {total}% {isValid ? "✓" : total > 100 ? "(over)" : "(under)"}
        </Chip>
      </div>

      {/* Quick Presets */}
      <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30">
        <CardBody className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Quick Presets
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <Button
                key={preset.name}
                size="sm"
                variant="flat"
                onPress={() => applyPreset(preset.mix)}
              >
                {preset.name}
              </Button>
            ))}
            <Button
              size="sm"
              variant="bordered"
              startContent={<RotateCcw className="w-3 h-3" />}
              onPress={resetToDefault}
            >
              Reset
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Sliders */}
      <Card className="border border-gray-200 dark:border-gray-700">
        <CardBody className="p-6 space-y-6">
          {CONTENT_TYPES.map((type) => {
            const Icon = type.icon;
            const value = localMix[type.id];
            const colorClasses = {
              blue: "text-blue-600 dark:text-blue-400",
              green: "text-green-600 dark:text-green-400",
              yellow: "text-yellow-600 dark:text-yellow-400",
              purple: "text-purple-600 dark:text-purple-400",
            }[type.color];

            return (
              <div key={type.id}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${colorClasses}`} />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {type.name}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {value}%
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  {type.description}
                </p>
                <Slider
                  size="sm"
                  step={5}
                  minValue={0}
                  maxValue={100}
                  value={value}
                  onChange={(val) => handleSliderChange(type.id, val as number)}
                  classNames={{
                    track: "bg-gray-200 dark:bg-gray-700",
                    filler: `bg-${type.color}-500`,
                  }}
                />
              </div>
            );
          })}
        </CardBody>
      </Card>

      {/* Visual Breakdown */}
      <Card className="border border-gray-200 dark:border-gray-700">
        <CardBody className="p-4">
          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Visual Breakdown
          </h5>
          <div className="h-8 rounded-full overflow-hidden flex">
            <div
              className="bg-blue-500 transition-all"
              style={{ width: `${localMix.educational}%` }}
            />
            <div
              className="bg-green-500 transition-all"
              style={{ width: `${localMix.promotional}%` }}
            />
            <div
              className="bg-yellow-500 transition-all"
              style={{ width: `${localMix.entertaining}%` }}
            />
            <div
              className="bg-purple-500 transition-all"
              style={{ width: `${localMix.engaging}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              Educational
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Promotional
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              Entertaining
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              Engaging
            </span>
          </div>
        </CardBody>
      </Card>

      {/* Tip */}
      <Card className="border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <CardBody className="p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Tip:</strong> Most successful brands follow the 40-20-20-20
            rule. Heavy on education, balanced on the rest. Adjust based on your
            industry and goals.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
