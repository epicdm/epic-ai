"use client";

import { useState } from "react";
import {
  Input,
  Textarea,
  Button,
  Card,
  CardBody,
  Chip,
} from "@heroui/react";
import { Plus, Trash2, Target, Sparkles, ExternalLink } from "lucide-react";
import type { UnderstandWizardData, CompetitorData } from "@/lib/flywheel/types";

interface CompetitorsStepProps {
  data: UnderstandWizardData;
  updateData: (updates: Partial<UnderstandWizardData>) => void;
}

export function CompetitorsStep({ data, updateData }: CompetitorsStepProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const competitors = data.competitors || [];

  const addCompetitor = () => {
    const newCompetitor: CompetitorData = {
      id: `competitor-${Date.now()}`,
      name: "",
      website: "",
      notes: "",
      strengths: [],
      weaknesses: [],
    };
    updateData({ competitors: [...competitors, newCompetitor] });
  };

  const updateCompetitor = (id: string, updates: Partial<CompetitorData>) => {
    updateData({
      competitors: competitors.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    });
  };

  const removeCompetitor = (id: string) => {
    updateData({
      competitors: competitors.filter((c) => c.id !== id),
    });
  };

  const addStrength = (competitorId: string, strength: string) => {
    if (!strength.trim()) return;
    const competitor = competitors.find((c) => c.id === competitorId);
    if (competitor) {
      updateCompetitor(competitorId, {
        strengths: [...(competitor.strengths || []), strength.trim()],
      });
    }
  };

  const removeStrength = (competitorId: string, index: number) => {
    const competitor = competitors.find((c) => c.id === competitorId);
    if (competitor) {
      updateCompetitor(competitorId, {
        strengths: competitor.strengths?.filter((_, i) => i !== index),
      });
    }
  };

  const addWeakness = (competitorId: string, weakness: string) => {
    if (!weakness.trim()) return;
    const competitor = competitors.find((c) => c.id === competitorId);
    if (competitor) {
      updateCompetitor(competitorId, {
        weaknesses: [...(competitor.weaknesses || []), weakness.trim()],
      });
    }
  };

  const removeWeakness = (competitorId: string, index: number) => {
    const competitor = competitors.find((c) => c.id === competitorId);
    if (competitor) {
      updateCompetitor(competitorId, {
        weaknesses: competitor.weaknesses?.filter((_, i) => i !== index),
      });
    }
  };

  const generateCompetitors = async () => {
    if (!data.industry && !data.brandDescription) return;

    setIsGenerating(true);
    try {
      const response = await fetch("/api/flywheel/phases/understand/suggest-competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry: data.industry,
          brandName: data.brandName,
          brandDescription: data.brandDescription,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.competitors?.length > 0) {
          updateData({ competitors: result.competitors });
        }
      }
    } catch (error) {
      console.error("Error generating competitors:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-600 dark:text-gray-400">
            Add 2-3 competitors to track. This helps AI understand your market
            position and differentiate your content.
          </p>
        </div>
        <Button
          size="sm"
          variant="flat"
          color="secondary"
          startContent={<Sparkles className="w-4 h-4" />}
          onPress={generateCompetitors}
          isLoading={isGenerating}
          isDisabled={!data.industry && !data.brandDescription}
        >
          AI Suggest
        </Button>
      </div>

      <div className="space-y-4">
        {competitors.map((competitor) => (
          <Card
            key={competitor.id}
            className="border border-gray-200 dark:border-gray-700"
          >
            <CardBody className="p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-orange-500" />
                  <Input
                    value={competitor.name}
                    onValueChange={(value) =>
                      updateCompetitor(competitor.id, { name: value })
                    }
                    placeholder="Competitor Name"
                    variant="underlined"
                    classNames={{
                      input: "font-medium text-lg",
                    }}
                  />
                </div>
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  color="danger"
                  onPress={() => removeCompetitor(competitor.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <Input
                label="Website"
                placeholder="https://competitor.com"
                value={competitor.website || ""}
                onValueChange={(value) =>
                  updateCompetitor(competitor.id, { website: value })
                }
                endContent={
                  competitor.website && (
                    <a
                      href={competitor.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )
                }
              />

              <Textarea
                label="Notes"
                placeholder="What do they do well? What's their positioning?"
                value={competitor.notes || ""}
                onValueChange={(value) =>
                  updateCompetitor(competitor.id, { notes: value })
                }
                minRows={2}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Strengths */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-green-700 dark:text-green-300">
                    Their Strengths
                  </label>
                  <div className="flex flex-wrap gap-2 min-h-[32px]">
                    {competitor.strengths?.map((strength, index) => (
                      <Chip
                        key={index}
                        size="sm"
                        onClose={() => removeStrength(competitor.id, index)}
                        variant="flat"
                        color="success"
                      >
                        {strength}
                      </Chip>
                    ))}
                  </div>
                  <Input
                    size="sm"
                    placeholder="Add strength and press Enter"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addStrength(competitor.id, (e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = "";
                      }
                    }}
                  />
                </div>

                {/* Weaknesses */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-red-700 dark:text-red-300">
                    Their Weaknesses
                  </label>
                  <div className="flex flex-wrap gap-2 min-h-[32px]">
                    {competitor.weaknesses?.map((weakness, index) => (
                      <Chip
                        key={index}
                        size="sm"
                        onClose={() => removeWeakness(competitor.id, index)}
                        variant="flat"
                        color="danger"
                      >
                        {weakness}
                      </Chip>
                    ))}
                  </div>
                  <Input
                    size="sm"
                    placeholder="Add weakness and press Enter"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addWeakness(competitor.id, (e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = "";
                      }
                    }}
                  />
                </div>
              </div>
            </CardBody>
          </Card>
        ))}

        {competitors.length < 5 && (
          <Button
            variant="bordered"
            className="w-full"
            startContent={<Plus className="w-4 h-4" />}
            onPress={addCompetitor}
          >
            Add Competitor
          </Button>
        )}
      </div>

      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <strong>This step is optional.</strong> You can skip it and add
          competitors later. Tracking competitors helps AI create content that
          differentiates your brand.
        </p>
      </div>
    </div>
  );
}
