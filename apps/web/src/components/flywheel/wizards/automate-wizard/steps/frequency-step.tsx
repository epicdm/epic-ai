"use client";

import { useState, useEffect } from "react";
import { Card, CardBody, Slider, Chip, Switch } from "@heroui/react";
import { Calendar, Clock, Twitter, Linkedin, Facebook, Instagram } from "lucide-react";
import type { AutomateWizardData } from "@/lib/flywheel/types";

interface FrequencyStepProps {
  data: AutomateWizardData;
  updateData: (updates: Partial<AutomateWizardData>) => void;
}

const PLATFORMS = [
  { id: "twitter", name: "Twitter/X", icon: Twitter, maxPosts: 21, recommended: 7 },
  { id: "linkedin", name: "LinkedIn", icon: Linkedin, maxPosts: 7, recommended: 3 },
  { id: "facebook", name: "Facebook", icon: Facebook, maxPosts: 14, recommended: 5 },
  { id: "instagram", name: "Instagram", icon: Instagram, maxPosts: 14, recommended: 5 },
];

const FREQUENCY_LABELS = [
  { value: 1, label: "Light", description: "1-2 posts/week" },
  { value: 3, label: "Moderate", description: "3-5 posts/week" },
  { value: 7, label: "Active", description: "Daily posts" },
  { value: 14, label: "Power", description: "2x daily" },
];

export function FrequencyStep({ data, updateData }: FrequencyStepProps) {
  const [usePerPlatform, setUsePerPlatform] = useState(
    Object.keys(data.platformFrequency || {}).length > 0
  );

  const [platformFrequency, setPlatformFrequency] = useState<Record<string, number>>(
    data.platformFrequency || {}
  );

  useEffect(() => {
    if (usePerPlatform) {
      updateData({ platformFrequency });
    }
  }, [platformFrequency, usePerPlatform, updateData]);

  const handleOverallChange = (value: number) => {
    updateData({ postsPerWeek: value });
  };

  const handlePlatformChange = (platform: string, value: number) => {
    setPlatformFrequency((prev) => ({
      ...prev,
      [platform]: value,
    }));
  };

  const getFrequencyLabel = (value: number) => {
    if (value <= 2) return "Light";
    if (value <= 5) return "Moderate";
    if (value <= 7) return "Active";
    return "Power";
  };

  const totalPerPlatform = Object.values(platformFrequency).reduce(
    (sum, val) => sum + val,
    0
  );

  return (
    <div className="space-y-6">
      <p className="text-gray-600 dark:text-gray-400">
        Set how often the AI should create and publish content. Start conservative—you
        can always increase later.
      </p>

      {/* Toggle: Overall vs Per Platform */}
      <Card className="border border-gray-200 dark:border-gray-700">
        <CardBody className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Per-Platform Frequency
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Set different posting rates for each platform
              </p>
            </div>
            <Switch
              isSelected={usePerPlatform}
              onValueChange={setUsePerPlatform}
              size="sm"
            />
          </div>
        </CardBody>
      </Card>

      {!usePerPlatform ? (
        /* Overall Frequency */
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardBody className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900">
                <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Overall Posting Frequency
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total posts per week across all platforms
                </p>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500">Posts per week</span>
                <Chip color="primary" variant="flat">
                  {data.postsPerWeek || 5} posts/week • {getFrequencyLabel(data.postsPerWeek || 5)}
                </Chip>
              </div>
              <Slider
                step={1}
                minValue={1}
                maxValue={21}
                value={data.postsPerWeek || 5}
                onChange={(val) => handleOverallChange(val as number)}
                classNames={{
                  track: "bg-gray-200 dark:bg-gray-700",
                  filler: "bg-orange-500",
                }}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1</span>
                <span>7</span>
                <span>14</span>
                <span>21</span>
              </div>
            </div>

            {/* Frequency Labels */}
            <div className="grid grid-cols-4 gap-2 mt-4">
              {FREQUENCY_LABELS.map((freq) => (
                <button
                  key={freq.value}
                  onClick={() => handleOverallChange(freq.value)}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    data.postsPerWeek === freq.value
                      ? "border-orange-500 bg-orange-50 dark:bg-orange-900/30"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {freq.label}
                  </p>
                  <p className="text-xs text-gray-500">{freq.description}</p>
                </button>
              ))}
            </div>
          </CardBody>
        </Card>
      ) : (
        /* Per-Platform Frequency */
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardBody className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900">
                  <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Platform-Specific Frequency
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Customize posting rate for each platform
                  </p>
                </div>
              </div>
              <Chip color="secondary" variant="flat">
                Total: {totalPerPlatform} posts/week
              </Chip>
            </div>

            <div className="space-y-6">
              {PLATFORMS.map((platform) => {
                const Icon = platform.icon;
                const value = platformFrequency[platform.id] || platform.recommended;

                return (
                  <div key={platform.id}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        <span className="font-medium text-gray-900 dark:text-white">
                          {platform.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          (rec: {platform.recommended}/week)
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {value} posts/week
                      </span>
                    </div>
                    <Slider
                      size="sm"
                      step={1}
                      minValue={0}
                      maxValue={platform.maxPosts}
                      value={value}
                      onChange={(val) =>
                        handlePlatformChange(platform.id, val as number)
                      }
                      classNames={{
                        track: "bg-gray-200 dark:bg-gray-700",
                        filler: "bg-orange-500",
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Best Practices */}
      <Card className="border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <CardBody className="p-4">
          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Platform Best Practices
          </h5>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600 dark:text-gray-400">
                <strong>Twitter/X:</strong> 1-3x daily optimal
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                <strong>LinkedIn:</strong> 1x daily max
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">
                <strong>Facebook:</strong> 1-2x daily
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                <strong>Instagram:</strong> 1-2x daily
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
