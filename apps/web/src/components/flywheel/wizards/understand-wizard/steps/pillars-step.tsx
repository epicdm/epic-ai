"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Layers, Sparkles, GripVertical, X } from "lucide-react";
import { AIBadge } from "@/components/ui/ai-badge";
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
          <p className="text-muted-foreground">
            Define 3-5 content pillars - the main themes you will create content
            around.
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={generatePillars}
          disabled={isGenerating || (!data.industry && !data.brandDescription)}
        >
          {isGenerating ? (
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : (
            <Sparkles className="mr-2 w-4 h-4" />
          )}
          AI Suggest Pillars
          <AIBadge
            type="suggestion"
            size="sm"
            reason="Based on your brand details"
            className="ml-2"
          />
        </Button>
      </div>

      {/* Quick Add Suggestions */}
      {pillars.length < 5 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mb-6">
          {suggestedPillars
            .filter((name) => !usedPillarNames.includes(name.toLowerCase()))
            .map((topic) => {
              const isHighPriority = [
                "Industry Trends",
                "Customer Success",
                "Thought Leadership"
              ].includes(topic);

              return (
                <div key={topic} className="relative">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => addPillar(topic)}
                    className="w-full text-left justify-start"
                  >
                    {topic}
                    {isHighPriority && (
                      <AIBadge
                        type="recommended"
                        size="sm"
                        reason="High engagement for your industry"
                        confidence={85}
                        position="corner"
                        className="absolute top-1 right-1"
                      />
                    )}
                  </Button>
                </div>
              );
            })}
        </div>
      )}

      <div className="space-y-4">
        {pillars.map((pillar, index) => (
          <Card
            key={pillar.id}
            className="border border-gray-200 dark:border-gray-700"
          >
            <CardContent className="p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                  <Layers className="w-5 h-5 text-purple-500" />
                  <Input
                    value={pillar.name}
                    onChange={(e) =>
                      updatePillar(pillar.id!, { name: e.target.value })
                    }
                    placeholder="Pillar Name"
                    className="font-medium text-lg border-0 border-b rounded-none px-0 focus-visible:ring-0"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    #{index + 1}
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removePillar(pillar.id!)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <Textarea
                  placeholder="What topics does this pillar cover?"
                  value={pillar.description || ""}
                  onChange={(e) =>
                    updatePillar(pillar.id!, { description: e.target.value })
                  }
                  rows={2}
                />
              </div>

              {/* Topics */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sub-topics
                </label>
                <div className="flex flex-wrap gap-2">
                  {pillar.topics?.map((topic, topicIndex) => (
                    <Badge
                      key={topicIndex}
                      variant="secondary"
                      className="gap-1"
                    >
                      {topic}
                      <button
                        type="button"
                        onClick={() => removeTopic(pillar.id!, topicIndex)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a sub-topic..."
                    value={newTopic[pillar.id!] || ""}
                    onChange={(e) =>
                      setNewTopic((prev) => ({ ...prev, [pillar.id!]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTopic(pillar.id!);
                      }
                    }}
                    className="text-sm"
                  />
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() => addTopic(pillar.id!)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {pillars.length < 5 && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => addPillar()}
          >
            <Plus className="mr-2 w-4 h-4" />
            Add Content Pillar
          </Button>
        )}
      </div>

      {pillars.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
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
