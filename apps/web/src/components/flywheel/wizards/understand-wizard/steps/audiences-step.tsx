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
import { Plus, Trash2, Users, Sparkles } from "lucide-react";
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
          <p className="text-gray-600 dark:text-gray-400">
            Define your target audiences. Create 1-3 personas that represent your
            ideal customers.
          </p>
        </div>
        <Button
          size="sm"
          variant="flat"
          color="secondary"
          startContent={<Sparkles className="w-4 h-4" />}
          onPress={generateAudiences}
          isLoading={isGenerating}
          isDisabled={!data.industry && !data.brandDescription}
        >
          AI Suggest
        </Button>
      </div>

      <div className="space-y-4">
        {audiences.map((audience) => (
          <Card key={audience.id} className="border border-gray-200 dark:border-gray-700">
            <CardBody className="p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-500" />
                  <Input
                    value={audience.name}
                    onValueChange={(value) =>
                      updateAudience(audience.id, { name: value })
                    }
                    placeholder="Persona Name"
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
                  onPress={() => removeAudience(audience.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <Textarea
                label="Description"
                placeholder="Describe this persona..."
                value={audience.description || ""}
                onValueChange={(value) =>
                  updateAudience(audience.id, { description: value })
                }
                minRows={2}
              />

              <Input
                label="Demographics"
                placeholder="Age, location, profession, etc."
                value={audience.demographics || ""}
                onValueChange={(value) =>
                  updateAudience(audience.id, { demographics: value })
                }
              />

              {/* Pain Points */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Pain Points
                </label>
                <div className="flex flex-wrap gap-2">
                  {audience.painPoints?.map((point, index) => (
                    <Chip
                      key={index}
                      onClose={() => removePainPoint(audience.id, index)}
                      variant="flat"
                      color="danger"
                    >
                      {point}
                    </Chip>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    size="sm"
                    placeholder="Add a pain point..."
                    value={newPainPoint[audience.id] || ""}
                    onValueChange={(value) =>
                      setNewPainPoint((prev) => ({ ...prev, [audience.id]: value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addPainPoint(audience.id);
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    isIconOnly
                    variant="flat"
                    onPress={() => addPainPoint(audience.id)}
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
                    <Chip
                      key={index}
                      onClose={() => removeGoal(audience.id, index)}
                      variant="flat"
                      color="success"
                    >
                      {goal}
                    </Chip>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    size="sm"
                    placeholder="Add a goal..."
                    value={newGoal[audience.id] || ""}
                    onValueChange={(value) =>
                      setNewGoal((prev) => ({ ...prev, [audience.id]: value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addGoal(audience.id);
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    isIconOnly
                    variant="flat"
                    onPress={() => addGoal(audience.id)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}

        {audiences.length < 3 && (
          <Button
            variant="bordered"
            className="w-full"
            startContent={<Plus className="w-4 h-4" />}
            onPress={addAudience}
          >
            Add Audience Persona
          </Button>
        )}
      </div>

      {audiences.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          Add at least one target audience to continue.
        </p>
      )}
    </div>
  );
}
