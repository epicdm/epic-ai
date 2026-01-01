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
import {
  Slider,
  CheckboxGroup,
  Checkbox,
  RadioGroup,
  Radio,
  Card,
  CardBody,
  Chip,
} from "@heroui/react";
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
    (values: string[]) => {
      // Limit to 4 traits
      if (values.length <= 4) {
        updateData({ personality: values });
      }
    },
    [updateData]
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
          <Chip size="sm" variant="flat" color="primary">
            {currentFormality.label}
          </Chip>
        </div>

        <Slider
          value={data.formality || 3}
          onChange={handleFormalityChange}
          minValue={1}
          maxValue={5}
          step={1}
          showSteps
          marks={FORMALITY_LEVELS.map((level) => ({
            value: level.value,
            label: level.label,
          }))}
          classNames={{
            track: "bg-gray-200 dark:bg-gray-700",
            filler: "bg-primary",
            thumb: "bg-primary border-2 border-white shadow-md",
            mark: "text-xs text-gray-500",
          }}
        />

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

        <CheckboxGroup
          value={data.personality || []}
          onValueChange={handlePersonalityChange}
          classNames={{
            wrapper: "grid grid-cols-2 sm:grid-cols-3 gap-2",
          }}
        >
          {PERSONALITY_TRAITS.map((trait) => {
            const isSelected = data.personality?.includes(trait.id);
            const isDisabled =
              !isSelected && (data.personality?.length || 0) >= 4;

            return (
              <Checkbox
                key={trait.id}
                value={trait.id}
                isDisabled={isDisabled}
                classNames={{
                  base: `max-w-full m-0 p-0 ${isDisabled ? "opacity-50" : ""}`,
                  wrapper: "hidden",
                  label: "w-full",
                }}
              >
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <span className="text-lg">{trait.emoji}</span>
                  <span className="text-sm font-medium">{trait.label}</span>
                  {isSelected && <Check className="w-4 h-4 ml-auto" />}
                </div>
              </Checkbox>
            );
          })}
        </CheckboxGroup>

        {(data.personality?.length || 0) > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {data.personality?.map((traitId) => {
              const trait = PERSONALITY_TRAITS.find((t) => t.id === traitId);
              return trait ? (
                <Chip key={traitId} size="sm" variant="flat" color="primary">
                  {trait.emoji} {trait.label}
                </Chip>
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
          classNames={{
            wrapper: "grid grid-cols-1 sm:grid-cols-2 gap-3",
          }}
        >
          {WRITING_STYLES.map((style) => (
            <Radio
              key={style.id}
              value={style.id}
              classNames={{
                base: "max-w-full m-0 p-0",
                labelWrapper: "w-full",
                label: "w-full",
              }}
            >
              <Card
                className={`cursor-pointer transition-all ${
                  data.writingStyle === style.id
                    ? "border-2 border-primary ring-2 ring-primary/20"
                    : "border border-gray-200 dark:border-gray-700 hover:border-primary/50"
                }`}
                isPressable
                onPress={() => handleWritingStyleChange(style.id)}
              >
                <CardBody className="p-3">
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
                </CardBody>
              </Card>
            </Radio>
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
