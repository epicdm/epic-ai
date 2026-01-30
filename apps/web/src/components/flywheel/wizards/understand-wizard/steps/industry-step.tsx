"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { INDUSTRY_TEMPLATES } from "@/lib/flywheel/constants";
import type { UnderstandWizardData } from "@/lib/flywheel/types";

interface IndustryStepProps {
  data: UnderstandWizardData;
  updateData: (updates: Partial<UnderstandWizardData>) => void;
}

export function IndustryStep({ data, updateData }: IndustryStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        Select the industry that best describes your business. This helps us
        provide tailored templates and AI suggestions.
      </p>

      <RadioGroup
        value={data.industry}
        onValueChange={(value) =>
          updateData({ industry: value, industryTemplate: value })
        }
        className="gap-3"
      >
        {INDUSTRY_TEMPLATES.map((industry) => (
          <div key={industry.id}>
            <Label
              htmlFor={`industry-${industry.id}`}
              className="cursor-pointer w-full"
            >
              <Card
                className={`w-full cursor-pointer transition-all ${
                  data.industry === industry.id
                    ? "border-2 border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                    : "border border-gray-200 dark:border-gray-700 hover:border-purple-300"
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <RadioGroupItem
                        value={industry.id}
                        id={`industry-${industry.id}`}
                      />
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {industry.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {industry.description}
                        </p>
                      </div>
                    </div>
                    {data.industry === industry.id && (
                      <span className="text-purple-500 text-xl">&#10003;</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
