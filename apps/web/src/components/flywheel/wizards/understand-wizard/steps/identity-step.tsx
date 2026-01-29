"use client";

import { Input, Textarea } from "@heroui/react";
import { Building2, FileText, Target } from "lucide-react";
import type { UnderstandWizardData } from "@/lib/flywheel/types";

interface IdentityStepProps {
  data: UnderstandWizardData;
  updateData: (updates: Partial<UnderstandWizardData>) => void;
}

export function IdentityStep({ data, updateData }: IdentityStepProps) {
  return (
    <div className="space-y-6">
      <p className="text-gray-600 dark:text-gray-400">
        Define your brand's core identity. This information will be used by AI
        to maintain consistent messaging across all content.
      </p>

      <div className="space-y-4">
        <Input
          label="Brand Name"
          placeholder="Enter your brand or company name"
          value={data.brandName || ""}
          onValueChange={(value) => updateData({ brandName: value })}
          startContent={<Building2 className="w-4 h-4 text-gray-400" />}
          isRequired
          description="Your official brand or company name"
        />

        <Textarea
          label="Brand Description"
          placeholder="Describe what your brand does and what makes it unique..."
          value={data.brandDescription || ""}
          onValueChange={(value) => updateData({ brandDescription: value })}
          startContent={<FileText className="w-4 h-4 text-gray-400" />}
          minRows={3}
          description="A brief description of your brand (1-3 sentences)"
        />

        <Textarea
          label="Mission Statement"
          placeholder="What is your brand's mission or purpose?"
          value={data.mission || ""}
          onValueChange={(value) => updateData({ mission: value })}
          startContent={<Target className="w-4 h-4 text-gray-400" />}
          minRows={2}
          description="Your brand's core purpose or mission"
        />
      </div>

      {data.websiteAnalyzed && (
        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-sm text-purple-700 dark:text-purple-300">
          These fields were pre-filled from your website analysis. Feel free to
          edit them.
        </div>
      )}
    </div>
  );
}
