"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Globe, Sparkles, Check, AlertCircle } from "lucide-react";
import type { UnderstandWizardData } from "@/lib/flywheel/types";

interface WebsiteStepProps {
  data: UnderstandWizardData;
  updateData: (updates: Partial<UnderstandWizardData>) => void;
}

export function WebsiteStep({ data, updateData }: WebsiteStepProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    success: boolean;
    message: string;
    suggestions?: Partial<UnderstandWizardData>;
  } | null>(null);

  const handleAnalyze = async () => {
    if (!data.websiteUrl) return;

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const response = await fetch("/api/flywheel/phases/understand/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteUrl: data.websiteUrl }),
      });

      if (response.ok) {
        const result = await response.json();
        setAnalysisResult({
          success: true,
          message: "Website analyzed successfully! We have pre-filled some fields for you.",
          suggestions: result.suggestedData,
        });
        updateData({
          websiteAnalyzed: true,
          ...result.suggestedData,
        });
      } else {
        setAnalysisResult({
          success: false,
          message: "Could not analyze website. You can skip this step and fill in details manually.",
        });
      }
    } catch {
      setAnalysisResult({
        success: false,
        message: "Error analyzing website. You can skip this step and continue.",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Enter your website URL and our AI will analyze it to extract brand
        information, suggested voice, and content ideas.
      </p>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="url"
            placeholder="https://yourwebsite.com"
            value={data.websiteUrl || ""}
            onChange={(e) => updateData({ websiteUrl: e.target.value })}
            className="pl-10 text-base"
          />
        </div>
        <Button
          variant="secondary"
          onClick={handleAnalyze}
          disabled={!data.websiteUrl || isAnalyzing}
        >
          {isAnalyzing ? (
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : (
            <Sparkles className="mr-2 w-4 h-4" />
          )}
          {isAnalyzing ? "Analyzing..." : "Analyze"}
        </Button>
      </div>

      {analysisResult && (
        <Card
          className={
            analysisResult.success
              ? "border-green-500 bg-green-50 dark:bg-green-900/20"
              : "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
          }
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {analysisResult.success ? (
                <Check className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              )}
              <div>
                <p
                  className={`font-medium ${
                    analysisResult.success
                      ? "text-green-700 dark:text-green-300"
                      : "text-yellow-700 dark:text-yellow-300"
                  }`}
                >
                  {analysisResult.message}
                </p>
                {analysisResult.suggestions && (
                  <ul className="mt-2 text-sm text-muted-foreground space-y-1">
                    {analysisResult.suggestions.brandName && (
                      <li>Brand name: {analysisResult.suggestions.brandName}</li>
                    )}
                    {analysisResult.suggestions.industry && (
                      <li>Suggested industry: {analysisResult.suggestions.industry}</li>
                    )}
                    {analysisResult.suggestions.brandDescription && (
                      <li>Description extracted</li>
                    )}
                    {analysisResult.suggestions.contentPillars && (
                      <li>{analysisResult.suggestions.contentPillars.length} content pillars suggested</li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {data.websiteAnalyzed && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4 inline mr-1 text-purple-500" />
            AI has pre-filled the following steps based on your website. Feel
            free to edit them.
          </p>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        This step is optional. You can skip it and fill in details manually.
      </p>
    </div>
  );
}
