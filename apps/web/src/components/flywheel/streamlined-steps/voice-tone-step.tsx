"use client";

/**
 * Voice & Tone Step (Streamlined)
 *
 * Sets communication style: formality, personality traits, writing style.
 * Step 2 of 12 in the streamlined wizard.
 *
 * AI-Assisted: Yes - Shows template defaults, allows editing
 */

import { useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Check } from "lucide-react";
import type { StreamlinedWizardData } from "../streamlined-flywheel-wizard";
import {
  FORMALITY_LEVELS,
  PERSONALITY_TRAITS,
  WRITING_STYLES,
} from "@/lib/flywheel/constants";

interface VoiceToneStepProps {
  data: StreamlinedWizardData;
  updateData: (updates: Partial<StreamlinedWizardData>) => void;
}

export function VoiceToneStep({ data, updateData }: VoiceToneStepProps) {
  const handleFormalityChange = useCallback(
    (value: number | number[]) => {
      const formalityValue = Array.isArray(value) ? value[0] : value;
      updateData({ formality: formalityValue });
    },
    [updateData]
  );

  const handlePersonalityChange = useCallback(
    (traitId: string, checked: boolean) => {
      const current = data.personality || [];
      if (checked) {
        if (current.length < 4) {
          updateData({ personality: [...current, traitId] });
        }
      } else {
        updateData({ personality: current.filter((id) => id !== traitId) });
      }
    },
    [data.personality, updateData]
  );

  const handleWritingStyleChange = useCallback(
    (value: string) => {
      updateData({ writingStyle: value });
    },
    [updateData]
  );

  const currentFormality =
    FORMALITY_LEVELS.find((f) => f.value === data.formality) ||
    FORMALITY_LEVELS[2];

  return (
    <div className="space-y-8">
      {/* Formality Level */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Formality Level
          </label>
          <Badge variant="secondary">
            {currentFormality.label}
          </Badge>
        </div>

        <div className="space-y-2">
          <input
            type="range"
            className="w-full accent-primary"
            min={1}
            max={5}
            step={1}
            value={data.formality || 3}
            onChange={(e) => handleFormalityChange(Number(e.target.value))}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            {FORMALITY_LEVELS.map((level) => (
              <span key={level.value}>{level.label}</span>
            ))}
          </div>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">
          {currentFormality.description}
        </p>
      </div>

      {/* Personality Traits */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Personality Traits
          </label>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Select up to 4
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PERSONALITY_TRAITS.map((trait) => {
            const isSelected = data.personality?.includes(trait.id);
            const isDisabled = !isSelected && (data.personality?.length || 0) >= 4;

            return (
              <label
                key={trait.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? "border-primary bg-primary/10 text-primary"
                    : isDisabled
                    ? "border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <Checkbox
                  checked={isSelected}
                  disabled={isDisabled}
                  onCheckedChange={(checked) => handlePersonalityChange(trait.id, checked === true)}
                  className="sr-only"
                />
                <span className="text-lg">{trait.emoji}</span>
                <span className="text-sm font-medium">{trait.label}</span>
                {isSelected && <Check className="w-4 h-4 ml-auto" />}
              </label>
            );
          })}
        </div>

        {(data.personality?.length || 0) > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {data.personality?.map((traitId) => {
              const trait = PERSONALITY_TRAITS.find((t) => t.id === traitId);
              return trait ? (
                <Badge key={traitId} variant="default">
                  {trait.emoji} {trait.label}
                </Badge>
              ) : null;
            })}
          </div>
        )}
      </div>

      {/* Writing Style */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Writing Style
        </label>

        <RadioGroup
          value={data.writingStyle || "conversational"}
          onValueChange={handleWritingStyleChange}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          {WRITING_STYLES.map((style) => (
            <div key={style.id}>
              <RadioGroupItem
                value={style.id}
                id={`style-${style.id}`}
                className="sr-only"
              />
              <Label htmlFor={`style-${style.id}`} className="cursor-pointer">
                <Card
                  className={`cursor-pointer transition-all ${
                    data.writingStyle === style.id
                      ? "border-2 border-primary ring-2 ring-primary/20"
                      : "border border-gray-200 dark:border-gray-700 hover:border-primary/50"
                  }`}
                  onClick={() => handleWritingStyleChange(style.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {style.label}
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {style.description}
                        </p>
                      </div>
                      {data.writingStyle === style.id && (
                        <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Preview */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Voice Preview
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Your brand voice is{" "}
          <span className="font-medium text-gray-900 dark:text-white">
            {currentFormality.label.toLowerCase()}
          </span>
          {data.personality && data.personality.length > 0 && (
            <>
              {", "}
              <span className="font-medium text-gray-900 dark:text-white">
                {data.personality
                  .map(
                    (id) =>
                      PERSONALITY_TRAITS.find((t) => t.id === id)?.label.toLowerCase()
                  )
                  .filter(Boolean)
                  .join(", ")}
              </span>
            </>
          )}
          {data.writingStyle && (
            <>
              {" with a "}
              <span className="font-medium text-gray-900 dark:text-white">
                {WRITING_STYLES.find(
                  (s) => s.id === data.writingStyle
                )?.label.toLowerCase()}
              </span>
              {" writing style."}
            </>
          )}
        </p>
      </div>
    </div>
  );
}
