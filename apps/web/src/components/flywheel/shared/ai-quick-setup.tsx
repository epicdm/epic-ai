"use client";

import { useState } from "react";
import {
  Card,
  CardBody,
  Button,
  Input,
  Select,
  SelectItem,
  Spinner,
  Chip,
} from "@heroui/react";
import {
  Wand2,
  Sparkles,
  Settings2,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { FlywheelPhase } from "@/lib/flywheel/types";

interface AIQuickSetupProps {
  phase: FlywheelPhase;
  onComplete: (data: Record<string, unknown>) => void;
  onSkip: () => void;
  existingData?: Record<string, unknown>;
}

interface QuickSetupConfig {
  title: string;
  description: string;
  fields: QuickSetupField[];
  color: string;
}

interface QuickSetupField {
  key: string;
  label: string;
  type: "text" | "url" | "select" | "auto";
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  autoDetect?: boolean;
}

const PHASE_CONFIGS: Record<FlywheelPhase, QuickSetupConfig> = {
  UNDERSTAND: {
    title: "Quick Brand Setup",
    description: "Tell us your website and we'll analyze your brand automatically",
    color: "purple",
    fields: [
      {
        key: "websiteUrl",
        label: "Website URL",
        type: "url",
        placeholder: "https://yourcompany.com",
        required: true,
      },
      {
        key: "industry",
        label: "Industry (optional)",
        type: "select",
        options: [
          { value: "", label: "Let AI detect" },
          { value: "technology", label: "Technology" },
          { value: "ecommerce", label: "E-commerce" },
          { value: "healthcare", label: "Healthcare" },
          { value: "finance", label: "Finance" },
          { value: "education", label: "Education" },
          { value: "marketing", label: "Marketing" },
          { value: "consulting", label: "Consulting" },
          { value: "saas", label: "SaaS" },
          { value: "agency", label: "Agency" },
          { value: "other", label: "Other" },
        ],
      },
    ],
  },
  CREATE: {
    title: "Quick Content Setup",
    description: "Let AI configure your content preferences based on your brand",
    color: "blue",
    fields: [
      {
        key: "contentFocus",
        label: "Primary Content Focus",
        type: "select",
        required: true,
        options: [
          { value: "thought_leadership", label: "Thought Leadership" },
          { value: "product_updates", label: "Product Updates" },
          { value: "educational", label: "Educational Content" },
          { value: "engagement", label: "Community Engagement" },
          { value: "mixed", label: "Balanced Mix" },
        ],
      },
    ],
  },
  DISTRIBUTE: {
    title: "Quick Distribution Setup",
    description: "We'll set optimal posting times based on your audience",
    color: "green",
    fields: [
      {
        key: "timezone",
        label: "Your Timezone",
        type: "auto",
        autoDetect: true,
      },
      {
        key: "postingGoal",
        label: "Posting Goal",
        type: "select",
        required: true,
        options: [
          { value: "consistent", label: "Consistent Presence (3-5/week)" },
          { value: "active", label: "Active Engagement (7-10/week)" },
          { value: "aggressive", label: "Maximum Reach (14+/week)" },
          { value: "minimal", label: "Quality Over Quantity (1-2/week)" },
        ],
      },
    ],
  },
  LEARN: {
    title: "Quick Analytics Setup",
    description: "Tell us your primary goal and we'll set up tracking",
    color: "pink",
    fields: [
      {
        key: "primaryGoal",
        label: "What matters most to you?",
        type: "select",
        required: true,
        options: [
          { value: "engagement", label: "Engagement (likes, comments, shares)" },
          { value: "reach", label: "Reach & Impressions" },
          { value: "followers", label: "Follower Growth" },
          { value: "traffic", label: "Website Traffic" },
          { value: "leads", label: "Lead Generation" },
          { value: "brand", label: "Brand Awareness" },
        ],
      },
    ],
  },
  AUTOMATE: {
    title: "Quick Automation Setup",
    description: "Choose your automation level and we'll handle the rest",
    color: "orange",
    fields: [
      {
        key: "automationLevel",
        label: "How much automation do you want?",
        type: "select",
        required: true,
        options: [
          { value: "assisted", label: "AI-Assisted (Review everything)" },
          { value: "supervised", label: "Supervised (Review important posts)" },
          { value: "autonomous", label: "Autonomous (Full autopilot)" },
        ],
      },
    ],
  },
};

const COLOR_CLASSES: Record<string, { bg: string; border: string; text: string }> = {
  purple: {
    bg: "bg-purple-50 dark:bg-purple-950/30",
    border: "border-purple-200 dark:border-purple-800",
    text: "text-purple-600 dark:text-purple-400",
  },
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-600 dark:text-blue-400",
  },
  green: {
    bg: "bg-green-50 dark:bg-green-950/30",
    border: "border-green-200 dark:border-green-800",
    text: "text-green-600 dark:text-green-400",
  },
  pink: {
    bg: "bg-pink-50 dark:bg-pink-950/30",
    border: "border-pink-200 dark:border-pink-800",
    text: "text-pink-600 dark:text-pink-400",
  },
  orange: {
    bg: "bg-orange-50 dark:bg-orange-950/30",
    border: "border-orange-200 dark:border-orange-800",
    text: "text-orange-600 dark:text-orange-400",
  },
};

export function AIQuickSetup({ phase, onComplete, onSkip, existingData }: AIQuickSetupProps) {
  const config = PHASE_CONFIGS[phase];
  const colors = COLOR_CLASSES[config.color];

  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    config.fields.forEach((field) => {
      if (field.autoDetect && field.key === "timezone") {
        initial[field.key] = Intl.DateTimeFormat().resolvedOptions().timeZone;
      } else if (existingData?.[field.key]) {
        initial[field.key] = String(existingData[field.key]);
      } else {
        initial[field.key] = "";
      }
    });
    return initial;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedConfig, setGeneratedConfig] = useState<Record<string, unknown> | null>(null);

  const handleInputChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const canSubmit = () => {
    return config.fields.every((field) => {
      if (!field.required) return true;
      return formData[field.key]?.trim().length > 0;
    });
  };

  const handleGenerate = async () => {
    if (!canSubmit()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/flywheel/ai-configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phase,
          inputs: formData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate configuration");
      }

      const data = await response.json();
      setGeneratedConfig(data.configuration);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate configuration");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = () => {
    if (generatedConfig) {
      onComplete(generatedConfig);
    }
  };

  const renderField = (field: QuickSetupField) => {
    if (field.type === "auto" && field.autoDetect) {
      return (
        <div key={field.key} className="space-y-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {field.label}
          </label>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Auto-detected: <strong>{formData[field.key]}</strong>
            </span>
          </div>
        </div>
      );
    }

    if (field.type === "select" && field.options) {
      return (
        <Select
          key={field.key}
          label={field.label}
          placeholder={`Select ${field.label.toLowerCase()}`}
          selectedKeys={formData[field.key] ? [formData[field.key]] : []}
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0];
            handleInputChange(field.key, selected as string);
          }}
          isRequired={field.required}
        >
          {field.options.map((option) => (
            <SelectItem key={option.value}>{option.label}</SelectItem>
          ))}
        </Select>
      );
    }

    return (
      <Input
        key={field.key}
        label={field.label}
        placeholder={field.placeholder}
        value={formData[field.key] || ""}
        onChange={(e) => handleInputChange(field.key, e.target.value)}
        type={field.type === "url" ? "url" : "text"}
        isRequired={field.required}
      />
    );
  };

  // Show the generated config preview
  if (generatedConfig) {
    return (
      <Card className={`border-2 ${colors.border}`}>
        <CardBody className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${colors.bg}`}>
              <Sparkles className={`w-6 h-6 ${colors.text}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                AI Configuration Ready!
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Review the generated settings below
              </p>
            </div>
          </div>

          {/* Config Summary */}
          <div className={`p-4 rounded-lg ${colors.bg} space-y-3`}>
            <h4 className="font-medium text-gray-900 dark:text-white">Generated Settings:</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(generatedConfig).slice(0, 8).map(([key, value]) => {
                if (typeof value === "object") return null;
                return (
                  <Chip key={key} size="sm" variant="flat">
                    {key}: {String(value).substring(0, 30)}
                    {String(value).length > 30 ? "..." : ""}
                  </Chip>
                );
              })}
              {Object.keys(generatedConfig).length > 8 && (
                <Chip size="sm" variant="flat" color="primary">
                  +{Object.keys(generatedConfig).length - 8} more
                </Chip>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="bordered"
              onPress={() => setGeneratedConfig(null)}
              className="flex-1"
            >
              Regenerate
            </Button>
            <Button
              color="primary"
              onPress={handleAccept}
              className="flex-1"
              endContent={<ArrowRight className="w-4 h-4" />}
            >
              Accept & Continue
            </Button>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            You can edit individual settings later in the detailed wizard
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Quick Setup Card */}
      <Card className={`border-2 ${colors.border}`}>
        <CardBody className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${colors.bg}`}>
              <Wand2 className={`w-6 h-6 ${colors.text}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {config.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {config.description}
              </p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {config.fields.map(renderField)}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              color="primary"
              onPress={handleGenerate}
              isLoading={isLoading}
              isDisabled={!canSubmit()}
              className="flex-1"
              startContent={!isLoading && <Sparkles className="w-4 h-4" />}
            >
              {isLoading ? "Generating..." : "Generate with AI"}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Manual Setup Option */}
      <div className="text-center">
        <Button
          variant="light"
          onPress={onSkip}
          startContent={<Settings2 className="w-4 h-4" />}
          className="text-gray-500"
        >
          Set up manually instead
        </Button>
      </div>
    </div>
  );
}

export type { AIQuickSetupProps };
