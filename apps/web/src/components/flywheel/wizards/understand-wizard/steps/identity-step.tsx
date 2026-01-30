"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, FileText, Target } from "lucide-react";
import type { UnderstandWizardData } from "@/lib/flywheel/types";

interface IdentityStepProps {
  data: UnderstandWizardData;
  updateData: (updates: Partial<UnderstandWizardData>) => void;
}

export function IdentityStep({ data, updateData }: IdentityStepProps) {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Define your brand&apos;s core identity. This information will be used by AI
        to maintain consistent messaging across all content.
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="brandName">
            Brand Name <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="brandName"
              placeholder="Enter your brand or company name"
              value={data.brandName || ""}
              onChange={(e) => updateData({ brandName: e.target.value })}
              className="pl-10"
              required
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Your official brand or company name
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="brandDescription">Brand Description</Label>
          <div className="relative">
            <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Textarea
              id="brandDescription"
              placeholder="Describe what your brand does and what makes it unique..."
              value={data.brandDescription || ""}
              onChange={(e) => updateData({ brandDescription: e.target.value })}
              className="pl-10 min-h-[80px]"
              rows={3}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            A brief description of your brand (1-3 sentences)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mission">Mission Statement</Label>
          <div className="relative">
            <Target className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Textarea
              id="mission"
              placeholder="What is your brand's mission or purpose?"
              value={data.mission || ""}
              onChange={(e) => updateData({ mission: e.target.value })}
              className="pl-10 min-h-[60px]"
              rows={2}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Your brand&apos;s core purpose or mission
          </p>
        </div>
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
