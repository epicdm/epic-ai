"use client";

/**
 * Content Strategy Step (Streamlined)
 *
 * Combines Target Audiences + Content Pillars into one step.
 * Step 3 of 12 in the streamlined wizard.
 *
 * AI-Assisted: Yes - Suggests audiences and pillars from template
 */

import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Trash2,
  Users,
  Target,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { StreamlinedWizardData } from "../streamlined-flywheel-wizard";
import type { AudienceData, ContentPillarData } from "@/lib/flywheel/types";

interface ContentStrategyStepProps {
  data: StreamlinedWizardData;
  updateData: (updates: Partial<StreamlinedWizardData>) => void;
}

export function ContentStrategyStep({
  data,
  updateData,
}: ContentStrategyStepProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedAudience, setExpandedAudience] = useState<number | null>(0);
  const [expandedPillar, setExpandedPillar] = useState<number | null>(0);

  const audiences = data.audiences || [];
  const pillars = data.contentPillars || [];

  const handleAddAudience = useCallback(() => {
    const newAudience: AudienceData = {
      name: "",
      description: "",
      demographics: "",
      painPoints: [],
      goals: [],
    };
    updateData({ audiences: [...audiences, newAudience] });
    setExpandedAudience(audiences.length);
  }, [audiences, updateData]);

  const handleUpdateAudience = useCallback(
    (index: number, updates: Partial<AudienceData>) => {
      const updated = [...audiences];
      updated[index] = { ...updated[index], ...updates };
      updateData({ audiences: updated });
    },
    [audiences, updateData]
  );

  const handleRemoveAudience = useCallback(
    (index: number) => {
      const updated = audiences.filter((_, i) => i !== index);
      updateData({ audiences: updated });
      if (expandedAudience === index) {
        setExpandedAudience(null);
      }
    },
    [audiences, expandedAudience, updateData]
  );

  const handleAddPillar = useCallback(() => {
    const newPillar: ContentPillarData = {
      name: "",
      description: "",
      topics: [],
      frequency: 25,
    };
    updateData({ contentPillars: [...pillars, newPillar] });
    setExpandedPillar(pillars.length);
  }, [pillars, updateData]);

  const handleUpdatePillar = useCallback(
    (index: number, updates: Partial<ContentPillarData>) => {
      const updated = [...pillars];
      updated[index] = { ...updated[index], ...updates };
      updateData({ contentPillars: updated });
    },
    [pillars, updateData]
  );

  const handleRemovePillar = useCallback(
    (index: number) => {
      const updated = pillars.filter((_, i) => i !== index);
      updateData({ contentPillars: updated });
      if (expandedPillar === index) {
        setExpandedPillar(null);
      }
    },
    [pillars, expandedPillar, updateData]
  );

  const handleAIGenerate = useCallback(async () => {
    setIsGenerating(true);

    try {
      const response = await fetch("/api/flywheel/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry: data.industry,
          brandName: data.brandName,
          brandDescription: data.brandDescription,
        }),
      });

      if (response.ok) {
        const suggestions = await response.json();
        if (suggestions.audiences?.length) {
          updateData({ audiences: suggestions.audiences });
        }
        if (suggestions.contentPillars?.length) {
          updateData({ contentPillars: suggestions.contentPillars });
        }
      }
    } catch (error) {
      console.error("Failed to generate suggestions:", error);
      if (audiences.length === 0) {
        updateData({
          audiences: [
            {
              name: "Primary Customer",
              description: "Your main target audience",
              demographics: "",
              painPoints: [],
              goals: [],
            },
          ],
        });
      }
      if (pillars.length === 0) {
        updateData({
          contentPillars: [
            { name: "Educational", description: "Helpful tips and how-to content", topics: [], frequency: 40 },
            { name: "Behind the Scenes", description: "Company culture and team updates", topics: [], frequency: 30 },
            { name: "Industry News", description: "Trends and insights in your field", topics: [], frequency: 30 },
          ],
        });
      }
    } finally {
      setIsGenerating(false);
    }
  }, [data, audiences.length, pillars.length, updateData]);

  return (
    <div className="space-y-8">
      {(audiences.length === 0 || pillars.length === 0) && (
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-purple-900 dark:text-purple-100">
                <span className="font-medium">AI Suggestion:</span> Let AI generate
                target audiences and content pillars based on your brand.
              </p>
              <Button
                size="sm"
                variant="secondary"
                className="mt-2"
                disabled={isGenerating}
                onClick={handleAIGenerate}
              >
                {isGenerating ? (
                  <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Sparkles className="mr-2 w-3 h-3" />
                )}
                Generate Strategy
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Target Audiences Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Target Audiences
            </h3>
          </div>
          <Button size="sm" variant="secondary" onClick={handleAddAudience} disabled={audiences.length >= 3}>
            <Plus className="mr-2 w-4 h-4" />
            Add Audience
          </Button>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Define 1-2 key personas representing your ideal customers.
        </p>

        {audiences.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No audiences defined yet. Add one or let AI generate suggestions.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {audiences.map((audience, index) => (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-0">
                  <button
                    onClick={() => setExpandedAudience(expandedAudience === index ? null : index)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <span className="text-sm font-medium text-purple-600 dark:text-purple-400">{index + 1}</span>
                      </div>
                      <div className="text-left">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {audience.name || `Audience ${index + 1}`}
                        </span>
                        {audience.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{audience.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-500 hover:text-red-600"
                        onClick={(e) => { e.stopPropagation(); handleRemoveAudience(index); }}
                        aria-label="Remove audience"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      {expandedAudience === index ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </div>
                  </button>
                  {expandedAudience === index && (
                    <div className="px-4 pb-4 space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                      <div className="space-y-2">
                        <Label>Audience Name</Label>
                        <Input placeholder="e.g., Small Business Owners" value={audience.name} onChange={(e) => handleUpdateAudience(index, { name: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea placeholder="Describe this audience in 1-2 sentences" value={audience.description} onChange={(e) => handleUpdateAudience(index, { description: e.target.value })} rows={2} />
                      </div>
                      <div className="space-y-2">
                        <Label>Demographics (optional)</Label>
                        <Input placeholder="e.g., Age 25-45, Urban professionals" value={audience.demographics || ""} onChange={(e) => handleUpdateAudience(index, { demographics: e.target.value })} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Content Pillars Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Content Pillars</h3>
          </div>
          <Button size="sm" variant="secondary" onClick={handleAddPillar} disabled={pillars.length >= 5}>
            <Plus className="mr-2 w-4 h-4" />
            Add Pillar
          </Button>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Define 3-4 content themes you&apos;ll consistently create content about.
        </p>

        {pillars.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <Target className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No content pillars defined yet. Add one or let AI generate suggestions.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pillars.map((pillar, index) => (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-0">
                  <button
                    onClick={() => setExpandedPillar(expandedPillar === index ? null : index)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{index + 1}</span>
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">{pillar.name || `Pillar ${index + 1}`}</span>
                          {pillar.frequency && <Badge variant="default">{pillar.frequency}%</Badge>}
                        </div>
                        {pillar.description && <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{pillar.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={(e) => { e.stopPropagation(); handleRemovePillar(index); }} aria-label="Remove pillar">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      {expandedPillar === index ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </div>
                  </button>
                  {expandedPillar === index && (
                    <div className="px-4 pb-4 space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                      <div className="space-y-2">
                        <Label>Pillar Name</Label>
                        <Input placeholder="e.g., Educational Tips" value={pillar.name} onChange={(e) => handleUpdatePillar(index, { name: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea placeholder="What kind of content falls under this pillar?" value={pillar.description} onChange={(e) => handleUpdatePillar(index, { description: e.target.value })} rows={2} />
                      </div>
                      <div className="space-y-2">
                        <Label>Content Mix %</Label>
                        <div className="relative">
                          <Input placeholder="25" type="number" min={0} max={100} value={pillar.frequency?.toString() || ""} onChange={(e) => handleUpdatePillar(index, { frequency: parseInt(e.target.value) || 0 })} className="pr-8" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {pillars.length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Content Mix Total</span>
              <span className={`font-medium ${pillars.reduce((sum, p) => sum + (p.frequency || 0), 0) === 100 ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"}`}>
                {pillars.reduce((sum, p) => sum + (p.frequency || 0), 0)}%
                {pillars.reduce((sum, p) => sum + (p.frequency || 0), 0) !== 100 && " (should equal 100%)"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
