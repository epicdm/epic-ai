"use client";

/**
 * Review Step - Review and customize brand settings
 *
 * Shows all auto-filled data from template, website, and social accounts.
 * Allows editing of all fields before final creation.
 */

import { useState, useCallback } from "react";
import {
  Input,
  Textarea,
  Button,
  Card,
  CardBody,
  CardHeader,
  Avatar,
  Select,
  SelectItem,
  Chip,
  Divider,
} from "@heroui/react";
import {
  WizardStepContainer,
  WizardStepHeader,
  WizardStepContent,
  useWizard,
} from "@/components/ui/wizard";
import {
  CheckCircle,
  Building2,
  Mic,
  Target,
  Hash,
  Pencil,
  Upload,
  X,
} from "lucide-react";
import type { BrandWizardData } from "../brand-setup-wizard";

interface ReviewStepProps {
  stepIndex: number;
  onCancel?: () => void;
}

const voiceToneOptions = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "witty", label: "Witty" },
  { value: "authoritative", label: "Authoritative" },
  { value: "casual", label: "Casual" },
  { value: "inspiring", label: "Inspiring" },
];

const writingStyleOptions = [
  { value: "formal", label: "Formal" },
  { value: "balanced", label: "Balanced" },
  { value: "conversational", label: "Conversational" },
];

const emojiStyleOptions = [
  { value: "none", label: "None" },
  { value: "minimal", label: "Minimal" },
  { value: "moderate", label: "Moderate" },
  { value: "heavy", label: "Heavy" },
];

const ctaStyleOptions = [
  { value: "none", label: "None" },
  { value: "soft", label: "Soft" },
  { value: "direct", label: "Direct" },
  { value: "urgent", label: "Urgent" },
];

export function ReviewStep({ stepIndex, onCancel }: ReviewStepProps) {
  const { data, setData, setAllData, isLoading } = useWizard();
  const wizardData = data as unknown as BrandWizardData;

  const [newPillar, setNewPillar] = useState("");
  const [newHashtag, setNewHashtag] = useState("");

  // Handlers for updating wizard data
  const updateField = useCallback(
    (field: keyof BrandWizardData, value: unknown) => {
      setData(field, value);
    },
    [setData]
  );

  const handleAddPillar = () => {
    if (newPillar.trim()) {
      setData("contentPillars", [...wizardData.contentPillars, newPillar.trim()]);
      setNewPillar("");
    }
  };

  const handleRemovePillar = (index: number) => {
    const updated = wizardData.contentPillars.filter((_, i) => i !== index);
    setData("contentPillars", updated);
  };

  const handleAddHashtag = () => {
    if (newHashtag.trim()) {
      const tag = newHashtag.trim().startsWith("#")
        ? newHashtag.trim()
        : `#${newHashtag.trim()}`;
      setData("suggestedHashtags", [...wizardData.suggestedHashtags, tag]);
      setNewHashtag("");
    }
  };

  const handleRemoveHashtag = (index: number) => {
    const updated = wizardData.suggestedHashtags.filter((_, i) => i !== index);
    setData("suggestedHashtags", updated);
  };

  // Validate required fields
  const isValid = wizardData.brandName?.trim().length > 0;

  return (
    <WizardStepContainer
      stepIndex={stepIndex}
      nextLabel="Create Brand"
      disableNext={!isValid || isLoading}
    >
      <WizardStepHeader
        icon={<CheckCircle className="w-6 h-6 text-primary" />}
        title="Review & Customize"
        description="Review the auto-filled settings and make any changes before creating your brand."
      />

      <WizardStepContent>
        <div className="space-y-6">
          {/* Brand Identity Section */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Brand Identity</h3>
              </div>
            </CardHeader>
            <CardBody className="gap-4">
              <div className="flex gap-4 items-start">
                {/* Logo Preview */}
                <div className="flex-shrink-0">
                  <Avatar
                    src={wizardData.brandLogo || undefined}
                    className="w-20 h-20"
                    radius="lg"
                    showFallback
                    fallback={
                      <Building2 className="w-8 h-8 text-default-400" />
                    }
                  />
                  <Button
                    size="sm"
                    variant="light"
                    className="mt-2 w-full"
                    startContent={<Upload className="w-3 h-3" />}
                    isDisabled
                  >
                    Upload
                  </Button>
                </div>

                {/* Name and Description */}
                <div className="flex-1 space-y-3">
                  <Input
                    label="Brand Name"
                    placeholder="Your brand name"
                    value={wizardData.brandName}
                    onChange={(e) => updateField("brandName", e.target.value)}
                    isRequired
                    isInvalid={!wizardData.brandName?.trim()}
                    errorMessage={!wizardData.brandName?.trim() ? "Brand name is required" : undefined}
                  />
                  <Input
                    label="Website"
                    placeholder="https://yourcompany.com"
                    value={wizardData.brandWebsite}
                    onChange={(e) => updateField("brandWebsite", e.target.value)}
                  />
                </div>
              </div>

              <Textarea
                label="Brand Description"
                placeholder="Describe your brand..."
                value={wizardData.brandDescription}
                onChange={(e) => updateField("brandDescription", e.target.value)}
                minRows={2}
                maxRows={4}
              />
            </CardBody>
          </Card>

          {/* Voice & Tone Section */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Mic className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Voice & Tone</h3>
              </div>
            </CardHeader>
            <CardBody className="gap-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Select
                  label="Voice Tone"
                  selectedKeys={[wizardData.voiceTone]}
                  onChange={(e) => updateField("voiceTone", e.target.value)}
                  size="sm"
                >
                  {voiceToneOptions.map((opt) => (
                    <SelectItem key={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </Select>

                <Select
                  label="Writing Style"
                  selectedKeys={[wizardData.writingStyle]}
                  onChange={(e) => updateField("writingStyle", e.target.value)}
                  size="sm"
                >
                  {writingStyleOptions.map((opt) => (
                    <SelectItem key={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </Select>

                <Select
                  label="Emoji Style"
                  selectedKeys={[wizardData.emojiStyle]}
                  onChange={(e) =>
                    updateField(
                      "emojiStyle",
                      e.target.value as BrandWizardData["emojiStyle"]
                    )
                  }
                  size="sm"
                >
                  {emojiStyleOptions.map((opt) => (
                    <SelectItem key={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </Select>

                <Select
                  label="CTA Style"
                  selectedKeys={[wizardData.ctaStyle]}
                  onChange={(e) =>
                    updateField(
                      "ctaStyle",
                      e.target.value as BrandWizardData["ctaStyle"]
                    )
                  }
                  size="sm"
                >
                  {ctaStyleOptions.map((opt) => (
                    <SelectItem key={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </Select>
              </div>

              {wizardData.selectedTemplate && (
                <div className="flex items-center gap-2 text-sm text-default-500">
                  <span className="text-lg">{wizardData.selectedTemplate.icon}</span>
                  <span>Based on {wizardData.selectedTemplate.name} template</span>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Content Pillars Section */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Content Pillars</h3>
              </div>
            </CardHeader>
            <CardBody className="gap-3">
              <p className="text-sm text-default-500">
                Topics and themes you'll focus on in your content
              </p>

              {wizardData.contentPillars.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {wizardData.contentPillars.map((pillar, idx) => (
                    <Chip
                      key={idx}
                      variant="flat"
                      color="secondary"
                      onClose={() => handleRemovePillar(idx)}
                    >
                      {pillar}
                    </Chip>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  placeholder="Add a content pillar..."
                  value={newPillar}
                  onChange={(e) => setNewPillar(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddPillar()}
                  size="sm"
                  classNames={{ base: "flex-1" }}
                />
                <Button
                  size="sm"
                  color="secondary"
                  variant="flat"
                  onPress={handleAddPillar}
                  isDisabled={!newPillar.trim()}
                >
                  Add
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Hashtags Section */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Hash className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Suggested Hashtags</h3>
              </div>
            </CardHeader>
            <CardBody className="gap-3">
              <p className="text-sm text-default-500">
                Hashtags to use across your social content
              </p>

              {wizardData.suggestedHashtags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {wizardData.suggestedHashtags.map((tag, idx) => (
                    <Chip
                      key={idx}
                      variant="flat"
                      color="primary"
                      onClose={() => handleRemoveHashtag(idx)}
                    >
                      {tag}
                    </Chip>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  placeholder="Add a hashtag..."
                  value={newHashtag}
                  onChange={(e) => setNewHashtag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddHashtag()}
                  size="sm"
                  classNames={{ base: "flex-1" }}
                />
                <Button
                  size="sm"
                  color="primary"
                  variant="flat"
                  onPress={handleAddHashtag}
                  isDisabled={!newHashtag.trim()}
                >
                  Add
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Cancel Button */}
          {onCancel && (
            <div className="flex justify-center pt-4">
              <Button
                variant="light"
                color="danger"
                onPress={onCancel}
              >
                Cancel Setup
              </Button>
            </div>
          )}
        </div>
      </WizardStepContent>
    </WizardStepContainer>
  );
}
