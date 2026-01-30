"use client";

import { Label } from "@/components/ui/label";
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

  const personality = data.personality || [];

  const togglePersonality = (traitId: string) => {
    if (personality.includes(traitId)) {
      updateData({ personality: personality.filter((t) => t !== traitId) });
    } else {
      updateData({ personality: [...personality, traitId] });
    }
  };

  return (
    <div className="space-y-8">
      <p className="text-muted-foreground">
        Define how your brand communicates. This sets the tone for all
        AI-generated content.
      </p>

      {/* Formality Level */}
      <div className="space-y-4">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white mb-1">
            Formality Level
          </h3>
          <p className="text-sm text-muted-foreground">
            How formal should your content sound?
          </p>
        </div>

        <div className="space-y-2">
          <input
            type="range"
            className="w-full accent-purple-600"
            value={data.formality || 3}
            onChange={(e) => updateData({ formality: Number(e.target.value) })}
            min={1}
            max={5}
            step={1}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            {FORMALITY_LEVELS.map((f) => (
              <span key={f.value}>{f.label}</span>
            ))}
          </div>
        </div>

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
          <p className="text-sm text-muted-foreground">
            Select 2-4 traits that describe your brand&apos;s personality
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {PERSONALITY_TRAITS.map((trait) => {
            const isSelected = personality.includes(trait.id);
            return (
              <button
                key={trait.id}
                type="button"
                onClick={() => togglePersonality(trait.id)}
                className={`px-3 py-2 rounded-full border text-sm transition-colors ${
                  isSelected
                    ? "bg-purple-100 border-purple-500 dark:bg-purple-900/30 dark:border-purple-500"
                    : "border-gray-200 dark:border-gray-700 hover:border-purple-300"
                }`}
              >
                {trait.emoji} {trait.label}
              </button>
            );
          })}
        </div>

        {(personality.length) > 4 && (
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
          <p className="text-sm text-muted-foreground">
            How should your content be structured?
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {WRITING_STYLES.map((style) => {
            const isSelected = data.writingStyle === style.id;
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => updateData({ writingStyle: style.id })}
                className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                  isSelected
                    ? "bg-purple-100 border-purple-500 dark:bg-purple-900/30 dark:border-purple-500"
                    : "border-gray-200 dark:border-gray-700 hover:border-purple-300"
                }`}
              >
                <span className="font-medium">{style.label}</span>
                <span className="text-xs text-muted-foreground block">
                  {style.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
