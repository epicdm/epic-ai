"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Building2,
  Users,
  Layers,
  Target,
  MessageSquare,
  Globe,
  Check,
} from "lucide-react";
import {
  INDUSTRY_TEMPLATES,
  FORMALITY_LEVELS,
  PERSONALITY_TRAITS,
  WRITING_STYLES,
} from "@/lib/flywheel/constants";
import type { UnderstandWizardData } from "@/lib/flywheel/types";

interface ReviewStepProps {
  data: UnderstandWizardData;
  updateData: (updates: Partial<UnderstandWizardData>) => void;
}

export function ReviewStep({ data, updateData }: ReviewStepProps) {
  const industry = INDUSTRY_TEMPLATES.find((i) => i.id === data.industry);
  const formality = FORMALITY_LEVELS.find((f) => f.value === data.formality);
  const writingStyle = WRITING_STYLES.find((s) => s.id === data.writingStyle);
  const personalityTraits = PERSONALITY_TRAITS.filter((t) =>
    data.personality?.includes(t.id)
  );

  const sections = [
    {
      title: "Industry",
      icon: <Globe className="w-5 h-5 text-blue-500" />,
      content: industry?.name || "Not selected",
      isComplete: !!data.industry,
    },
    {
      title: "Brand Identity",
      icon: <Building2 className="w-5 h-5 text-purple-500" />,
      content: (
        <div className="space-y-2">
          <p>
            <strong>{data.brandName || "Not set"}</strong>
          </p>
          {data.brandDescription && (
            <p className="text-sm text-muted-foreground">
              {data.brandDescription}
            </p>
          )}
          {data.mission && (
            <p className="text-sm text-muted-foreground italic">
              Mission: {data.mission}
            </p>
          )}
        </div>
      ),
      isComplete: !!data.brandName,
    },
    {
      title: "Voice & Tone",
      icon: <MessageSquare className="w-5 h-5 text-green-500" />,
      content: (
        <div className="space-y-2">
          <p>
            <strong>Formality:</strong> {formality?.label || "Not set"} -{" "}
            {formality?.description}
          </p>
          <div className="flex flex-wrap gap-1">
            {personalityTraits.map((trait) => (
              <Badge key={trait.id} variant="secondary">
                {trait.emoji} {trait.label}
              </Badge>
            ))}
          </div>
          <p className="text-sm">
            <strong>Writing Style:</strong> {writingStyle?.label || "Not set"}
          </p>
        </div>
      ),
      isComplete: data.formality !== undefined,
    },
    {
      title: "Target Audiences",
      icon: <Users className="w-5 h-5 text-orange-500" />,
      content: (
        <div className="space-y-2">
          {data.audiences?.length ? (
            data.audiences.map((audience) => (
              <div
                key={audience.id}
                className="p-2 bg-gray-50 dark:bg-gray-800 rounded"
              >
                <p className="font-medium">{audience.name}</p>
                {audience.description && (
                  <p className="text-sm text-muted-foreground">
                    {audience.description}
                  </p>
                )}
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">No audiences defined</p>
          )}
        </div>
      ),
      isComplete: (data.audiences?.length ?? 0) >= 1,
    },
    {
      title: "Content Pillars",
      icon: <Layers className="w-5 h-5 text-indigo-500" />,
      content: (
        <div className="flex flex-wrap gap-2">
          {data.contentPillars?.length ? (
            data.contentPillars.map((pillar) => (
              <Badge key={pillar.id} variant="secondary">
                {pillar.name}
              </Badge>
            ))
          ) : (
            <p className="text-muted-foreground">No pillars defined</p>
          )}
        </div>
      ),
      isComplete: (data.contentPillars?.length ?? 0) >= 1,
    },
    {
      title: "Competitors",
      icon: <Target className="w-5 h-5 text-red-500" />,
      content: (
        <div className="flex flex-wrap gap-2">
          {data.competitors?.length ? (
            data.competitors.map((competitor) => (
              <Badge key={competitor.id} variant="outline">
                {competitor.name}
              </Badge>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">
              No competitors added (optional)
            </p>
          )}
        </div>
      ),
      isComplete: true, // Optional step
    },
  ];

  const completedCount = sections.filter((s) => s.isComplete).length;
  const requiredComplete = completedCount >= 5; // 5 of 6 required (competitors optional)

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Review Your Brand Brain
        </h3>
        <p className="text-muted-foreground mt-1">
          Confirm the information below is correct before saving.
        </p>
      </div>

      {/* Progress Summary */}
      <div className="flex items-center justify-center gap-2">
        <div className="flex items-center gap-1">
          {sections.map((section, index) => (
            <div
              key={index}
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                section.isComplete
                  ? "bg-green-100 dark:bg-green-900/30"
                  : "bg-gray-100 dark:bg-gray-800"
              }`}
            >
              {section.isComplete ? (
                <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
              ) : (
                <span className="text-xs text-muted-foreground">{index + 1}</span>
              )}
            </div>
          ))}
        </div>
        <span className="text-sm text-muted-foreground ml-2">
          {completedCount}/{sections.length} complete
        </span>
      </div>

      {/* Review Sections */}
      <div className="space-y-4">
        {sections.map((section, index) => (
          <Card
            key={index}
            className={`border ${
              section.isComplete
                ? "border-green-200 dark:border-green-800"
                : "border-gray-200 dark:border-gray-700"
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    section.isComplete
                      ? "bg-green-50 dark:bg-green-900/20"
                      : "bg-gray-50 dark:bg-gray-800"
                  }`}
                >
                  {section.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {section.title}
                    </h4>
                    {section.isComplete && (
                      <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                    )}
                  </div>
                  <div className="text-sm">{section.content}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Confirmation Checkbox */}
      <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="confirm-review"
            checked={data.confirmed || false}
            onCheckedChange={(checked) => updateData({ confirmed: checked === true })}
            disabled={!requiredComplete}
          />
          <Label htmlFor="confirm-review" className="text-sm cursor-pointer">
            I confirm this information is correct and ready to save as my Brand
            Brain.
          </Label>
        </div>

        {!requiredComplete && (
          <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2 ml-6">
            Complete all required sections above to continue.
          </p>
        )}
      </div>

      {data.confirmed && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
          <p className="text-green-700 dark:text-green-300 font-medium">
            Your Brand Brain is ready to be saved.
          </p>
          <p className="text-sm text-green-600 dark:text-green-400 mt-1">
            Click &quot;Complete&quot; to save and proceed to the next phase.
          </p>
        </div>
      )}
    </div>
  );
}
