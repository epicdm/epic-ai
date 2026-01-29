"use client";

import { Slider, Checkbox, CheckboxGroup, RadioGroup, Radio } from "@heroui/react";
import {
  FORMALITY_LEVELS,
  PERSONALITY_TRAITS,
  WRITING_STYLES,
} from "@/lib/flywheel/constants";
import type { UnderstandWizardData } from "@/lib/flywheel/types";

interface VoiceStepProps {
  data: UnderstandWizardData;
  updateData: (updates: Partial<UnderstandWizardData>) => void;
}

export function VoiceStep({ data, updateData }: VoiceStepProps) {
  const currentFormality = FORMALITY_LEVELS.find(
    (f) => f.value === data.formality
  );

  return (
    <div className="space-y-8">
      <p className="text-gray-600 dark:text-gray-400">
        Define how your brand communicates. This sets the tone for all
        AI-generated content.
      </p>

      {/* Formality Level */}
      <div className="space-y-4">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white mb-1">
            Formality Level
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            How formal should your content sound?
          </p>
        </div>

        <Slider
          size="lg"
          step={1}
          minValue={1}
          maxValue={5}
          value={data.formality || 3}
          onChange={(value) =>
            updateData({ formality: Array.isArray(value) ? value[0] : value })
          }
          marks={FORMALITY_LEVELS.map((f) => ({
            value: f.value,
            label: f.label,
          }))}
          classNames={{
            mark: "text-xs",
          }}
        />

        {currentFormality && (
          <p className="text-center text-sm text-purple-600 dark:text-purple-400">
            {currentFormality.description}
          </p>
        )}
      </div>

      {/* Personality Traits */}
      <div className="space-y-4">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white mb-1">
            Personality Traits
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Select 2-4 traits that describe your brand's personality
          </p>
        </div>

        <CheckboxGroup
          value={data.personality || []}
          onValueChange={(value) => updateData({ personality: value })}
          orientation="horizontal"
          classNames={{
            wrapper: "gap-2 flex-wrap",
          }}
        >
          {PERSONALITY_TRAITS.map((trait) => (
            <Checkbox
              key={trait.id}
              value={trait.id}
              classNames={{
                base: "m-0 px-3 py-2 rounded-full border border-gray-200 dark:border-gray-700 data-[selected=true]:bg-purple-100 data-[selected=true]:border-purple-500 dark:data-[selected=true]:bg-purple-900/30",
                label: "text-sm",
              }}
            >
              {trait.emoji} {trait.label}
            </Checkbox>
          ))}
        </CheckboxGroup>

        {(data.personality?.length || 0) > 4 && (
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            Consider limiting to 4 traits for more focused content.
          </p>
        )}
      </div>

      {/* Writing Style */}
      <div className="space-y-4">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white mb-1">
            Writing Style
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            How should your content be structured?
          </p>
        </div>

        <RadioGroup
          value={data.writingStyle}
          onValueChange={(value) => updateData({ writingStyle: value })}
          orientation="horizontal"
          classNames={{
            wrapper: "gap-2 flex-wrap",
          }}
        >
          {WRITING_STYLES.map((style) => (
            <Radio
              key={style.id}
              value={style.id}
              classNames={{
                base: "m-0 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 data-[selected=true]:bg-purple-100 data-[selected=true]:border-purple-500 dark:data-[selected=true]:bg-purple-900/30",
                label: "text-sm",
              }}
            >
              <span className="font-medium">{style.label}</span>
              <span className="text-xs text-gray-500 block">
                {style.description}
              </span>
            </Radio>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
}
