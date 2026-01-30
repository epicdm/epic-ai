"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Sparkles,
  Heart,
  TrendingUp,
  MousePointer,
  Users,
  Target,
  Check,
} from "lucide-react";
import type { StreamlinedWizardData } from "../streamlined-flywheel-wizard";

interface OptimizationGoalsStepProps {
  data: Partial<StreamlinedWizardData>;
  updateData: (data: Partial<StreamlinedWizardData>) => void;
}

type OptimizationGoal = "engagement" | "growth" | "traffic" | "leads" | "conversions";

interface GoalOption {
  id: OptimizationGoal;
  label: string;
  description: string;
  icon: React.ElementType;
  targetLabel: string;
  targetUnit: string;
}

const OPTIMIZATION_GOALS: GoalOption[] = [
  { id: "engagement", label: "Maximize Engagement", description: "Get more likes, comments, and shares", icon: Heart, targetLabel: "engaged users", targetUnit: "/week" },
  { id: "growth", label: "Grow Audience", description: "Increase your follower count", icon: TrendingUp, targetLabel: "new followers", targetUnit: "/week" },
  { id: "traffic", label: "Drive Traffic", description: "Send visitors to your website", icon: MousePointer, targetLabel: "link clicks", targetUnit: "/week" },
  { id: "leads", label: "Generate Leads", description: "Collect contact information from prospects", icon: Users, targetLabel: "leads generated", targetUnit: "/week" },
  { id: "conversions", label: "Increase Conversions", description: "Drive signups, sales, or other actions", icon: Target, targetLabel: "conversions", targetUnit: "/week" },
];

const AI_OPTIMIZATIONS = [
  "Analyze top-performing content patterns",
  "Suggest content improvements",
  "Optimize posting times for your audience",
  "Adjust content mix based on performance",
];

export function OptimizationGoalsStep({ data, updateData }: OptimizationGoalsStepProps) {
  const [primaryGoal, setPrimaryGoal] = useState<OptimizationGoal>(
    (data.primaryGoal as OptimizationGoal) || "engagement"
  );
  const [target, setTarget] = useState<string>(
    data.optimizationTarget !== undefined ? String(data.optimizationTarget) : ""
  );
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{ goal: OptimizationGoal; reasoning: string } | null>(null);

  useEffect(() => {
    updateData({ primaryGoal, optimizationTarget: target ? parseInt(target, 10) : undefined });
  }, [primaryGoal, target, updateData]);

  const handleAISuggest = async () => {
    setIsSuggesting(true);
    setAiSuggestion(null);
    try {
      const response = await fetch("/api/ai/suggest-goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry: data.industry, currentMetrics: data.priorityMetrics }),
      });
      if (response.ok) {
        const result = await response.json();
        if (result.suggestedGoal) {
          setAiSuggestion({ goal: result.suggestedGoal, reasoning: result.reasoning || "Based on your industry and selected metrics" });
        } else { suggestBasedOnIndustry(); }
      } else { suggestBasedOnIndustry(); }
    } catch (error) {
      console.error("Error getting AI suggestion:", error);
      suggestBasedOnIndustry();
    } finally { setIsSuggesting(false); }
  };

  const suggestBasedOnIndustry = () => {
    const industry = (data.industry as string)?.toLowerCase() || "";
    let suggested: { goal: OptimizationGoal; reasoning: string };
    if (industry.includes("ecommerce") || industry.includes("retail") || industry.includes("shop")) {
      suggested = { goal: "conversions", reasoning: "E-commerce businesses typically benefit most from optimizing for sales and conversions." };
    } else if (industry.includes("saas") || industry.includes("software") || industry.includes("tech")) {
      suggested = { goal: "leads", reasoning: "SaaS companies often focus on lead generation for their sales pipeline." };
    } else if (industry.includes("media") || industry.includes("content") || industry.includes("creator")) {
      suggested = { goal: "growth", reasoning: "Content creators and media companies benefit from growing their audience." };
    } else if (industry.includes("agency") || industry.includes("service")) {
      suggested = { goal: "leads", reasoning: "Service businesses typically optimize for client lead generation." };
    } else {
      suggested = { goal: "engagement", reasoning: "Engagement is a universal metric that helps build brand awareness and community." };
    }
    setAiSuggestion(suggested);
  };

  const handleApplySuggestion = () => { if (aiSuggestion) { setPrimaryGoal(aiSuggestion.goal); setAiSuggestion(null); } };

  const selectedGoal = OPTIMIZATION_GOALS.find((g) => g.id === primaryGoal);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Optimization Goal</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">What should AI optimize your content for?</p>
        </div>
        <Button variant="secondary" onClick={handleAISuggest} disabled={isSuggesting}>
          {isSuggesting ? <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Sparkles className="mr-2 w-4 h-4" />}
          {isSuggesting ? "Analyzing..." : "AI Suggest"}
        </Button>
      </div>

      {aiSuggestion && (
        <Card className="bg-primary/5 border-2 border-primary">
          <CardContent className="flex flex-row items-center gap-4 py-4 px-4">
            <div className="p-2 rounded-lg bg-primary/10"><Sparkles className="w-5 h-5 text-primary" /></div>
            <div className="flex-1">
              <p className="font-medium text-gray-900 dark:text-white">AI Recommendation: {OPTIMIZATION_GOALS.find((g) => g.id === aiSuggestion.goal)?.label}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{aiSuggestion.reasoning}</p>
            </div>
            <Button size="sm" onClick={handleApplySuggestion}>Apply</Button>
          </CardContent>
        </Card>
      )}

      <RadioGroup value={primaryGoal} onValueChange={(value) => setPrimaryGoal(value as OptimizationGoal)}>
        <div className="space-y-3">
          {OPTIMIZATION_GOALS.map((goal) => {
            const Icon = goal.icon;
            const isSelected = primaryGoal === goal.id;
            return (
              <Card
                key={goal.id}
                className={`cursor-pointer transition-all ${isSelected ? "border-2 border-primary bg-primary/5" : "border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-700"}`}
                onClick={() => setPrimaryGoal(goal.id)}
              >
                <CardContent className="flex flex-row items-center gap-4 py-4 px-4">
                  <RadioGroupItem value={goal.id} id={`goal-${goal.id}`} />
                  <div className={`p-2 rounded-lg ${isSelected ? "bg-primary/10" : "bg-gray-100 dark:bg-gray-800"}`}>
                    <Icon className={`w-5 h-5 ${isSelected ? "text-primary" : "text-gray-500"}`} />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor={`goal-${goal.id}`} className="font-medium text-gray-900 dark:text-white cursor-pointer">{goal.label}</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{goal.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </RadioGroup>

      {selectedGoal && (
        <Card>
          <CardContent className="flex flex-row items-center gap-4 py-4 px-4">
            <div className="flex-1">
              <p className="font-medium text-gray-900 dark:text-white mb-1">Set a Target (Optional)</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">How many {selectedGoal.targetLabel} do you want {selectedGoal.targetUnit}?</p>
            </div>
            <div className="relative">
              <Input type="number" placeholder="e.g., 1000" value={target} onChange={(e) => setTarget(e.target.value)} className="max-w-[140px] pr-14" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{selectedGoal.targetUnit}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-gray-50 dark:bg-gray-800/50">
        <CardContent className="space-y-3 py-4 px-4">
          <p className="font-medium text-gray-900 dark:text-white">AI will automatically:</p>
          <ul className="space-y-2">
            {AI_OPTIMIZATIONS.map((action, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-gray-600 dark:text-gray-400">{action}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="text-center">
        <Badge variant="default" className="text-base px-3 py-1">
          Optimizing for: {selectedGoal?.label}{target && ` | Target: ${target}${selectedGoal?.targetUnit}`}
        </Badge>
      </div>
    </div>
  );
}
