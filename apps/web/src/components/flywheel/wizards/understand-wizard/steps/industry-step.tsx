"use client";

import { RadioGroup, Radio, Card, CardBody } from "@heroui/react";
import { INDUSTRY_TEMPLATES } from "@/lib/flywheel/constants";
import type { UnderstandWizardData } from "@/lib/flywheel/types";

interface IndustryStepProps {
  data: UnderstandWizardData;
  updateData: (updates: Partial<UnderstandWizardData>) => void;
}

export function IndustryStep({ data, updateData }: IndustryStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-gray-600 dark:text-gray-400">
        Select the industry that best describes your business. This helps us
        provide tailored templates and AI suggestions.
      </p>

      <RadioGroup
        value={data.industry}
        onValueChange={(value) =>
          updateData({ industry: value, industryTemplate: value })
        }
        classNames={{
          wrapper: "gap-3",
        }}
      >
        {INDUSTRY_TEMPLATES.map((industry) => (
          <Radio
            key={industry.id}
            value={industry.id}
            classNames={{
              base: "w-full max-w-none m-0 p-0",
              labelWrapper: "w-full",
            }}
          >
            <Card
              className={`w-full cursor-pointer transition-all ${
                data.industry === industry.id
                  ? "border-2 border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                  : "border border-gray-200 dark:border-gray-700 hover:border-purple-300"
              }`}
            >
              <CardBody className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {industry.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {industry.description}
                    </p>
                  </div>
                  {data.industry === industry.id && (
                    <span className="text-purple-500 text-xl">✓</span>
                  )}
                </div>
              </CardBody>
            </Card>
          </Radio>
        ))}
      </RadioGroup>
    </div>
  );
}
