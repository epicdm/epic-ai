"use client";

/**
 * Brand Identity Step (Streamlined)
 *
 * Combines Identity + Industry selection into one step.
 * Step 1 of 12 in the streamlined wizard.
 *
 * AI-Assisted: Yes - Applies smart defaults from industry template
 */

import { useState, useCallback } from "react";
import {
  Input,
  Textarea,
  RadioGroup,
  Radio,
  Card,
  CardBody,
  Button,
  Chip,
} from "@heroui/react";
import { Sparkles, Building2, Check } from "lucide-react";
import type { StreamlinedWizardData } from "../streamlined-flywheel-wizard";

interface IndustryTemplate {
  id: string;
  name: string;
  description: string;
  suggestedVoice?: {
    formality: number;
    personality: string[];
  };
}

interface BrandIdentityStepProps {
  data: StreamlinedWizardData;
  updateData: (updates: Partial<StreamlinedWizardData>) => void;
  industryTemplates: IndustryTemplate[];
}

export function BrandIdentityStep({
  data,
  updateData,
  industryTemplates,
}: BrandIdentityStepProps) {
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);

  const handleIndustryChange = useCallback(
    (industryId: string) => {
      updateData({ industry: industryId });
    },
    [updateData]
  );

  const handleApplyTemplate = useCallback(async () => {
    if (!data.industry) return;

    setIsApplyingTemplate(true);

    // Find the selected template
    const template = industryTemplates.find((t) => t.id === data.industry);
    if (template?.suggestedVoice) {
      // Apply template defaults after a brief delay for UX
      await new Promise((resolve) => setTimeout(resolve, 500));

      updateData({
        formality: template.suggestedVoice.formality,
        personality: template.suggestedVoice.personality,
      });
    }

    setIsApplyingTemplate(false);
  }, [data.industry, industryTemplates, updateData]);

  const selectedTemplate = industryTemplates.find((t) => t.id === data.industry);

  return (
    <div className="space-y-6">
      {/* Industry Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          What industry are you in?
        </label>
        <RadioGroup
          value={data.industry || ""}
          onValueChange={handleIndustryChange}
          classNames={{
            wrapper: "grid grid-cols-1 sm:grid-cols-2 gap-3",
          }}
        >
          {industryTemplates.map((template) => (
            <Radio
              key={template.id}
              value={template.id}
              classNames={{
                base: "max-w-full m-0 p-0",
                labelWrapper: "w-full",
                label: "w-full",
              }}
            >
              <Card
                className={`cursor-pointer transition-all ${
                  data.industry === template.id
                    ? "border-2 border-primary ring-2 ring-primary/20"
                    : "border border-gray-200 dark:border-gray-700 hover:border-primary/50"
                }`}
                isPressable
                onPress={() => handleIndustryChange(template.id)}
              >
                <CardBody className="p-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        data.industry === template.id
                          ? "bg-primary text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {template.name}
                        </span>
                        {data.industry === template.id && (
                          <Check className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                        {template.description}
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Radio>
          ))}
        </RadioGroup>

        {/* Apply Template Button */}
        {selectedTemplate?.suggestedVoice && (
          <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-purple-900 dark:text-purple-100">
                  <span className="font-medium">AI Tip:</span> We have optimized
                  voice settings for {selectedTemplate.name} businesses.
                </p>
                <Button
                  size="sm"
                  color="secondary"
                  variant="flat"
                  className="mt-2"
                  startContent={<Sparkles className="w-3 h-3" />}
                  isLoading={isApplyingTemplate}
                  onPress={handleApplyTemplate}
                >
                  Apply Industry Defaults
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Brand Name */}
      <div>
        <Input
          label="Brand Name"
          placeholder="Enter your brand or company name"
          value={data.brandName || ""}
          onValueChange={(value) => updateData({ brandName: value })}
          variant="bordered"
          classNames={{
            label: "text-gray-700 dark:text-gray-300",
            input: "text-gray-900 dark:text-white",
          }}
        />
      </div>

      {/* Brand Description */}
      <div>
        <Textarea
          label="Brand Description"
          placeholder="Describe what your brand does in 1-2 sentences"
          value={data.brandDescription || ""}
          onValueChange={(value) => updateData({ brandDescription: value })}
          variant="bordered"
          minRows={2}
          maxRows={4}
          classNames={{
            label: "text-gray-700 dark:text-gray-300",
            input: "text-gray-900 dark:text-white",
          }}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          This helps AI understand your business and create relevant content.
        </p>
      </div>

      {/* Mission Statement */}
      <div>
        <Textarea
          label="Mission Statement"
          placeholder="What is your brand's mission or purpose?"
          value={data.mission || ""}
          onValueChange={(value) => updateData({ mission: value })}
          variant="bordered"
          minRows={2}
          maxRows={3}
          classNames={{
            label: "text-gray-700 dark:text-gray-300",
            input: "text-gray-900 dark:text-white",
          }}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Optional but helps establish your brand voice.
        </p>
      </div>

      {/* Current selections summary */}
      {(data.industry || data.brandName) && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Summary
          </p>
          <div className="flex flex-wrap gap-2">
            {data.industry && (
              <Chip size="sm" variant="flat" color="primary">
                {industryTemplates.find((t) => t.id === data.industry)?.name ||
                  data.industry}
              </Chip>
            )}
            {data.brandName && (
              <Chip size="sm" variant="flat" color="default">
                {data.brandName}
              </Chip>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
