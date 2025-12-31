"use client";

/**
 * Template Step - Select an industry template
 *
 * Pre-fills voice, tone, pillars, and audience settings based on industry.
 */

import { Card, CardBody, Chip } from "@heroui/react";
import { cn } from "@/lib/utils";
import {
  WizardStepContainer,
  WizardStepHeader,
  WizardStepContent,
  useWizard,
} from "@/components/ui/wizard";
import { brandTemplates, type BrandTemplate } from "@/lib/brand-brain/templates";
import type { BrandWizardData } from "../brand-setup-wizard";

interface TemplateStepProps {
  stepIndex: number;
}

export function TemplateStep({ stepIndex }: TemplateStepProps) {
  const { data, setData, setAllData } = useWizard();
  const wizardData = data as unknown as BrandWizardData;

  const handleSelectTemplate = (template: BrandTemplate) => {
    // Pre-fill all template settings
    setAllData({
      selectedTemplate: template,
      voiceTone: template.voiceTone,
      writingStyle: template.writingStyle,
      emojiStyle: template.emojiStyle,
      ctaStyle: template.ctaStyle,
      contentPillars: [...template.contentPillars],
      targetAudience: {
        demographics: [...template.targetAudience.demographics],
        interests: [...template.targetAudience.interests],
        painPoints: [...template.targetAudience.painPoints],
      },
      suggestedHashtags: [...template.suggestedHashtags],
      sampleValues: [...template.sampleValues],
    });
  };

  const selectedTemplateId = wizardData.selectedTemplate?.id;

  return (
    <WizardStepContainer
      stepIndex={stepIndex}
      nextLabel="Continue"
      disableNext={!selectedTemplateId}
    >
      <WizardStepHeader
        title="Choose Your Industry"
        description="Select a template to pre-fill your brand voice and content strategy. You can customize everything later."
      />

      <WizardStepContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {brandTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              isSelected={selectedTemplateId === template.id}
              onSelect={handleSelectTemplate}
            />
          ))}
        </div>
      </WizardStepContent>
    </WizardStepContainer>
  );
}

interface TemplateCardProps {
  template: BrandTemplate;
  isSelected: boolean;
  onSelect: (template: BrandTemplate) => void;
}

function TemplateCard({ template, isSelected, onSelect }: TemplateCardProps) {
  return (
    <Card
      isPressable
      isHoverable
      className={cn(
        "transition-all cursor-pointer",
        isSelected && "ring-2 ring-primary border-primary bg-primary/5"
      )}
      onPress={() => onSelect(template)}
    >
      <CardBody className="p-4 gap-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{template.icon}</span>
            <div>
              <h3 className="font-semibold">{template.name}</h3>
            </div>
          </div>
          {isSelected && (
            <Chip color="primary" size="sm" variant="solid">
              Selected
            </Chip>
          )}
        </div>

        <p className="text-sm text-default-500">{template.description}</p>

        <div className="flex flex-wrap gap-1 mt-2">
          <Chip size="sm" variant="flat" color="secondary">
            {template.voiceTone}
          </Chip>
          <Chip size="sm" variant="flat">
            {template.emojiStyle} emoji
          </Chip>
        </div>

        {template.contentPillars.length > 0 && (
          <div className="mt-2 pt-2 border-t border-divider">
            <p className="text-xs text-default-400 mb-1">Content Pillars:</p>
            <div className="flex flex-wrap gap-1">
              {template.contentPillars.slice(0, 3).map((pillar) => (
                <Chip key={pillar} size="sm" variant="dot" color="default">
                  {pillar}
                </Chip>
              ))}
              {template.contentPillars.length > 3 && (
                <Chip size="sm" variant="flat" color="default">
                  +{template.contentPillars.length - 3}
                </Chip>
              )}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
