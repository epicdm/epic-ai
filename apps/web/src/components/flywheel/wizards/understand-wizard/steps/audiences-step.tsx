"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Users, Sparkles, X } from "lucide-react";
import type { UnderstandWizardData, AudiencePersona } from "@/lib/flywheel/types";

interface AudiencesStepProps {
  data: UnderstandWizardData;
  updateData: (updates: Partial<UnderstandWizardData>) => void;
}

const DEFAULT_PERSONA: AudiencePersona = {
  id: "",
  name: "",
  description: "",
  demographics: "",
  painPoints: [],
  goals: [],
};

export function AudiencesStep({ data, updateData }: AudiencesStepProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [newPainPoint, setNewPainPoint] = useState<Record<string, string>>({});
  const [newGoal, setNewGoal] = useState<Record<string, string>>({});

  const audiences = data.audiences || [];

  const addAudience = () => {
    const newAudience: AudiencePersona = {
      ...DEFAULT_PERSONA,
      id: `audience-${Date.now()}`,
      name: `Audience ${audiences.length + 1}`,
    };
    updateData({ audiences: [...audiences, newAudience] });
  };

  const updateAudience = (id: string, updates: Partial<AudiencePersona>) => {
    updateData({
      audiences: audiences.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      ),
    });
  };

  const removeAudience = (id: string) => {
    updateData({
      audiences: audiences.filter((a) => a.id !== id),
    });
  };

  const addPainPoint = (audienceId: string) => {
    const point = newPainPoint[audienceId]?.trim();
    if (!point) return;

    const audience = audiences.find((a) => a.id === audienceId);
    if (audience) {
      updateAudience(audienceId, {
        painPoints: [...(audience.painPoints || []), point],
      });
      setNewPainPoint((prev) => ({ ...prev, [audienceId]: "" }));
    }
  };

  const removePainPoint = (audienceId: string, index: number) => {
    const audience = audiences.find((a) => a.id === audienceId);
    if (audience) {
      updateAudience(audienceId, {
        painPoints: audience.painPoints?.filter((_, i) => i !== index),
      });
    }
  };

  const addGoal = (audienceId: string) => {
    const goal = newGoal[audienceId]?.trim();
    if (!goal) return;

    const audience = audiences.find((a) => a.id === audienceId);
    if (audience) {
      updateAudience(audienceId, {
        goals: [...(audience.goals || []), goal],
      });
      setNewGoal((prev) => ({ ...prev, [audienceId]: "" }));
    }
  };

  const removeGoal = (audienceId: string, index: number) => {
    const audience = audiences.find((a) => a.id === audienceId);
    if (audience) {
      updateAudience(audienceId, {
        goals: audience.goals?.filter((_, i) => i !== index),
      });
    }
  };

  const generateAudiences = async () => {
    if (!data.industry && !data.brandDescription) return;

    setIsGenerating(true);
    try {
      const response = await fetch("/api/flywheel/phases/understand/suggest-audiences", {
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
        if (result.audiences?.length > 0) {
          updateData({ audiences: result.audiences });
        }
      }
    } catch (error) {
      console.error("Error generating audiences:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-muted-foreground">
            Define your target audiences. Create 1-3 personas that represent your
            ideal customers.
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={generateAudiences}
          disabled={isGenerating || (!data.industry && !data.brandDescription)}
        >
          {isGenerating ? (
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : (
            <Sparkles className="mr-2 w-4 h-4" />
          )}
          AI Suggest
        </Button>
      </div>

      <div className="space-y-4">
        {audiences.map((audience) => (
          <Card key={audience.id} className="border border-gray-200 dark:border-gray-700">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-500" />
                  <Input
                    value={audience.name}
                    onChange={(e) =>
                      updateAudience(audience.id!, { name: e.target.value })
                    }
                    placeholder="Persona Name"
                    className="font-medium text-lg border-0 border-b rounded-none px-0 focus-visible:ring-0"
                  />
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeAudience(audience.id!)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <Textarea
                  placeholder="Describe this persona..."
                  value={audience.description || ""}
                  onChange={(e) =>
                    updateAudience(audience.id!, { description: e.target.value })
                  }
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Demographics</label>
                <Input
                  placeholder="Age, location, profession, etc."
                  value={audience.demographics || ""}
                  onChange={(e) =>
                    updateAudience(audience.id!, { demographics: e.target.value })
                  }
                />
              </div>

              {/* Pain Points */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Pain Points
                </label>
                <div className="flex flex-wrap gap-2">
                  {audience.painPoints?.map((point, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 gap-1"
                    >
                      {point}
                      <button
                        type="button"
                        onClick={() => removePainPoint(audience.id!, index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a pain point..."
                    value={newPainPoint[audience.id!] || ""}
                    onChange={(e) =>
                      setNewPainPoint((prev) => ({ ...prev, [audience.id!]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addPainPoint(audience.id!);
                      }
                    }}
                    className="text-sm"
                  />
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() => addPainPoint(audience.id!)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Goals */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Goals
                </label>
                <div className="flex flex-wrap gap-2">
                  {audience.goals?.map((goal, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 gap-1"
                    >
                      {goal}
                      <button
                        type="button"
                        onClick={() => removeGoal(audience.id!, index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a goal..."
                    value={newGoal[audience.id!] || ""}
                    onChange={(e) =>
                      setNewGoal((prev) => ({ ...prev, [audience.id!]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addGoal(audience.id!);
                      }
                    }}
                    className="text-sm"
                  />
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() => addGoal(audience.id!)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {audiences.length < 3 && (
          <Button
            variant="outline"
            className="w-full"
            onClick={addAudience}
          >
            <Plus className="mr-2 w-4 h-4" />
            Add Audience Persona
          </Button>
        )}
      </div>

      {audiences.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Add at least one target audience to continue.
        </p>
      )}
    </div>
  );
}
