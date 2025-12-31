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
import { Plus, Trash2, Layers, Sparkles, GripVertical } from "lucide-react";
import type { UnderstandWizardData, ContentPillarData } from "@/lib/flywheel/types";

interface PillarsStepProps {
  data: UnderstandWizardData;
  updateData: (updates: Partial<UnderstandWizardData>) => void;
}

const SUGGESTED_TOPICS: Record<string, string[]> = {
  saas: ["Product Updates", "Industry Trends", "Customer Success", "Tips & Tutorials", "Behind the Scenes"],
  ecommerce: ["Product Highlights", "Customer Stories", "Style Guides", "Promotions", "Brand Values"],
  agency: ["Case Studies", "Industry Insights", "Team Culture", "Thought Leadership", "Client Success"],
  consulting: ["Expert Advice", "Industry Analysis", "Success Stories", "Best Practices", "Events"],
  healthcare: ["Patient Education", "Wellness Tips", "Research Updates", "Staff Highlights", "Community"],
  education: ["Learning Tips", "Student Success", "Course Updates", "Industry Trends", "Community"],
  nonprofit: ["Impact Stories", "Volunteer Spotlights", "Campaign Updates", "Education", "Events"],
  realestate: ["Market Updates", "Property Showcases", "Buyer Tips", "Neighborhood Guides", "Success Stories"],
  restaurant: ["Menu Highlights", "Behind the Kitchen", "Events", "Team Stories", "Community"],
  fitness: ["Workout Tips", "Nutrition Advice", "Member Success", "Class Schedules", "Motivation"],
  other: ["Industry News", "Tips & Advice", "Behind the Scenes", "Success Stories", "Updates"],
};

export function PillarsStep({ data, updateData }: PillarsStepProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [newTopic, setNewTopic] = useState<Record<string, string>>({});

  const pillars = data.contentPillars || [];

  const addPillar = (name?: string) => {
    const newPillar: ContentPillarData = {
      id: `pillar-${Date.now()}`,
      name: name || `Pillar ${pillars.length + 1}`,
      description: "",
      topics: [],
    };
    updateData({ contentPillars: [...pillars, newPillar] });
  };

  const updatePillar = (id: string, updates: Partial<ContentPillarData>) => {
    updateData({
      contentPillars: pillars.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    });
  };

  const removePillar = (id: string) => {
    updateData({
      contentPillars: pillars.filter((p) => p.id !== id),
    });
  };

  const addTopic = (pillarId: string) => {
    const topic = newTopic[pillarId]?.trim();
    if (!topic) return;

    const pillar = pillars.find((p) => p.id === pillarId);
    if (pillar) {
      updatePillar(pillarId, {
        topics: [...(pillar.topics || []), topic],
      });
      setNewTopic((prev) => ({ ...prev, [pillarId]: "" }));
    }
  };

  const removeTopic = (pillarId: string, index: number) => {
    const pillar = pillars.find((p) => p.id === pillarId);
    if (pillar) {
      updatePillar(pillarId, {
        topics: pillar.topics?.filter((_, i) => i !== index),
      });
    }
  };

  const generatePillars = async () => {
    if (!data.industry && !data.brandDescription) return;

    setIsGenerating(true);
    try {
      const response = await fetch("/api/flywheel/phases/understand/suggest-pillars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry: data.industry,
          brandName: data.brandName,
          brandDescription: data.brandDescription,
          audiences: data.audiences,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.pillars?.length > 0) {
          updateData({ contentPillars: result.pillars });
        }
      }
    } catch (error) {
      console.error("Error generating pillars:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const suggestedPillars = SUGGESTED_TOPICS[data.industry || "other"] || SUGGESTED_TOPICS.other;
  const usedPillarNames = pillars.map((p) => p.name.toLowerCase());

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-600 dark:text-gray-400">
            Define 3-5 content pillars - the main themes you'll create content
            around.
          </p>
        </div>
        <Button
          size="sm"
          variant="flat"
          color="secondary"
          startContent={<Sparkles className="w-4 h-4" />}
          onPress={generatePillars}
          isLoading={isGenerating}
          isDisabled={!data.industry && !data.brandDescription}
        >
          AI Suggest
        </Button>
      </div>

      {/* Quick Add Suggestions */}
      {pillars.length < 5 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Quick add suggested pillars:
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestedPillars
              .filter((name) => !usedPillarNames.includes(name.toLowerCase()))
              .map((name) => (
                <Chip
                  key={name}
                  variant="bordered"
                  className="cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/30"
                  onClick={() => addPillar(name)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {name}
                </Chip>
              ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {pillars.map((pillar, index) => (
          <Card
            key={pillar.id}
            className="border border-gray-200 dark:border-gray-700"
          >
            <CardBody className="p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                  <Layers className="w-5 h-5 text-purple-500" />
                  <Input
                    value={pillar.name}
                    onValueChange={(value) =>
                      updatePillar(pillar.id, { name: value })
                    }
                    placeholder="Pillar Name"
                    variant="underlined"
                    classNames={{
                      input: "font-medium text-lg",
                    }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Chip size="sm" variant="flat">
                    #{index + 1}
                  </Chip>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    color="danger"
                    onPress={() => removePillar(pillar.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Textarea
                label="Description"
                placeholder="What topics does this pillar cover?"
                value={pillar.description || ""}
                onValueChange={(value) =>
                  updatePillar(pillar.id, { description: value })
                }
                minRows={2}
              />

              {/* Topics */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sub-topics
                </label>
                <div className="flex flex-wrap gap-2">
                  {pillar.topics?.map((topic, topicIndex) => (
                    <Chip
                      key={topicIndex}
                      onClose={() => removeTopic(pillar.id, topicIndex)}
                      variant="flat"
                      color="secondary"
                    >
                      {topic}
                    </Chip>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    size="sm"
                    placeholder="Add a sub-topic..."
                    value={newTopic[pillar.id] || ""}
                    onValueChange={(value) =>
                      setNewTopic((prev) => ({ ...prev, [pillar.id]: value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTopic(pillar.id);
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    isIconOnly
                    variant="flat"
                    onPress={() => addTopic(pillar.id)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}

        {pillars.length < 5 && (
          <Button
            variant="bordered"
            className="w-full"
            startContent={<Plus className="w-4 h-4" />}
            onPress={() => addPillar()}
          >
            Add Content Pillar
          </Button>
        )}
      </div>

      {pillars.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          Add at least one content pillar to continue.
        </p>
      )}

      {pillars.length >= 3 && pillars.length <= 5 && (
        <p className="text-sm text-green-600 dark:text-green-400 text-center">
          Great! {pillars.length} pillars is a good foundation for consistent
          content.
        </p>
      )}
    </div>
  );
}
