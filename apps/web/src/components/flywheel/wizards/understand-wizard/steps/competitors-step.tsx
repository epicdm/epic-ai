"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Target, Sparkles, ExternalLink, X } from "lucide-react";
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
          <p className="text-muted-foreground">
            Add 2-3 competitors to track. This helps AI understand your market
            position and differentiate your content.
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={generateCompetitors}
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
        {competitors.map((competitor) => (
          <Card
            key={competitor.id}
            className="border border-gray-200 dark:border-gray-700"
          >
            <CardContent className="p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-orange-500" />
                  <Input
                    value={competitor.name}
                    onChange={(e) =>
                      updateCompetitor(competitor.id!, { name: e.target.value })
                    }
                    placeholder="Competitor Name"
                    className="font-medium text-lg border-0 border-b rounded-none px-0 focus-visible:ring-0"
                  />
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeCompetitor(competitor.id!)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Website</label>
                <div className="relative">
                  <Input
                    placeholder="https://competitor.com"
                    value={competitor.website || ""}
                    onChange={(e) =>
                      updateCompetitor(competitor.id!, { website: e.target.value })
                    }
                    className="pr-10"
                  />
                  {competitor.website && (
                    <a
                      href={competitor.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Notes</label>
                <Textarea
                  placeholder="What do they do well? What is their positioning?"
                  value={competitor.notes || ""}
                  onChange={(e) =>
                    updateCompetitor(competitor.id!, { notes: e.target.value })
                  }
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Strengths */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-green-700 dark:text-green-300">
                    Their Strengths
                  </label>
                  <div className="flex flex-wrap gap-2 min-h-[32px]">
                    {competitor.strengths?.map((strength, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 gap-1"
                      >
                        {strength}
                        <button
                          type="button"
                          onClick={() => removeStrength(competitor.id!, index)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <Input
                    placeholder="Add strength and press Enter"
                    className="text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addStrength(competitor.id!, (e.target as HTMLInputElement).value);
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
                      <Badge
                        key={index}
                        variant="secondary"
                        className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 gap-1"
                      >
                        {weakness}
                        <button
                          type="button"
                          onClick={() => removeWeakness(competitor.id!, index)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <Input
                    placeholder="Add weakness and press Enter"
                    className="text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addWeakness(competitor.id!, (e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = "";
                      }
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {competitors.length < 5 && (
          <Button
            variant="outline"
            className="w-full"
            onClick={addCompetitor}
          >
            <Plus className="mr-2 w-4 h-4" />
            Add Competitor
          </Button>
        )}
      </div>

      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <p className="text-sm text-muted-foreground">
          <strong>This step is optional.</strong> You can skip it and add
          competitors later. Tracking competitors helps AI create content that
          differentiates your brand.
        </p>
      </div>
    </div>
  );
}
