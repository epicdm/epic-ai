"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Send, Calendar, Clock, Sparkles, FileText, CheckCircle } from "lucide-react";
import type { DistributeWizardData, FirstPostOption } from "@/lib/flywheel/types";

interface FirstPostStepProps {
  data: DistributeWizardData;
  updateData: (updates: Partial<DistributeWizardData>) => void;
  brandId?: string;
}

interface ContentPreview {
  id: string;
  title: string;
  content: string;
  platforms: string[];
  createdAt: string;
}

export function FirstPostStep({ data, updateData, brandId }: FirstPostStepProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [availableContent, setAvailableContent] = useState<ContentPreview[]>([]);
  const [selectedContent, setSelectedContent] = useState<string | null>(
    data.firstPostContentId || null
  );
  const [isGenerating, setIsGenerating] = useState(false);

  // Normalize to lowercase since DB stores uppercase (FACEBOOK) but UI uses lowercase (facebook)
  const connectedPlatforms = data.connectedAccounts
    ?.filter((a) => a.connected)
    .map((a) => a.platform.toLowerCase()) || [];

  // Fetch available content
  useEffect(() => {
    const fetchContent = async () => {
      if (!brandId) return;

      setIsLoading(true);
      try {
        const response = await fetch(`/api/content?brandId=${brandId}&limit=5`);
        if (response.ok) {
          const result = await response.json();
          setAvailableContent(result.content || []);
        }
      } catch (error) {
        console.error("Error fetching content:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [brandId]);

  const handleOptionChange = (value: string) => {
    updateData({ firstPostOption: value as FirstPostOption });
  };

  const handleContentSelect = (contentId: string) => {
    setSelectedContent(contentId);
    updateData({ firstPostContentId: contentId });
  };

  const generateFirstPost = async () => {
    if (!brandId) return;

    setIsGenerating(true);
    try {
      const response = await fetch("/api/flywheel/phases/distribute/generate-first-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          platforms: connectedPlatforms,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.content) {
          setAvailableContent((prev) => [result.content, ...prev]);
          setSelectedContent(result.content.id);
          updateData({ firstPostContentId: result.content.id });
        }
      }
    } catch (error) {
      console.error("Error generating content:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Choose how you want to handle your first post. You can publish
        immediately, schedule it, or skip this step for now.
      </p>

      {/* First Post Options */}
      <RadioGroup
        value={data.firstPostOption || "skip"}
        onValueChange={handleOptionChange}
        className="gap-3"
      >
        <Label htmlFor="fp-skip" className="cursor-pointer">
          <div className={`flex items-center gap-3 border rounded-lg p-4 transition-colors ${data.firstPostOption === "skip" || !data.firstPostOption ? "border-green-500" : "border-gray-200 dark:border-gray-700"}`}>
            <RadioGroupItem value="skip" id="fp-skip" />
            <Clock className="w-5 h-5 text-gray-400" />
            <div>
              <p className="font-medium">Skip for Now</p>
              <p className="text-sm text-muted-foreground">
                I&apos;ll create and schedule content later
              </p>
            </div>
          </div>
        </Label>

        <Label htmlFor="fp-schedule" className="cursor-pointer">
          <div className={`flex items-center gap-3 border rounded-lg p-4 transition-colors ${data.firstPostOption === "schedule" ? "border-green-500" : "border-gray-200 dark:border-gray-700"}`}>
            <RadioGroupItem value="schedule" id="fp-schedule" />
            <Calendar className="w-5 h-5 text-blue-500" />
            <div>
              <p className="font-medium">Schedule First Post</p>
              <p className="text-sm text-muted-foreground">
                Pick content and schedule for optimal time
              </p>
            </div>
          </div>
        </Label>

        <Label htmlFor="fp-publish" className="cursor-pointer">
          <div className={`flex items-center gap-3 border rounded-lg p-4 transition-colors ${data.firstPostOption === "publish" ? "border-green-500" : "border-gray-200 dark:border-gray-700"}`}>
            <RadioGroupItem value="publish" id="fp-publish" />
            <Send className="w-5 h-5 text-green-500" />
            <div>
              <p className="font-medium">Publish Now</p>
              <p className="text-sm text-muted-foreground">
                Send your first post immediately
              </p>
            </div>
          </div>
        </Label>
      </RadioGroup>

      {/* Content Selection (for schedule/publish options) */}
      {(data.firstPostOption === "schedule" || data.firstPostOption === "publish") && (
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900 dark:text-white">
                Select Content
              </h4>
              <Button
                size="sm"
                variant="secondary"
                onClick={generateFirstPost}
                disabled={isGenerating || !brandId}
              >
                {isGenerating ? (
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : (
                  <Sparkles className="mr-2 w-4 h-4" />
                )}
                {isGenerating ? "Generating..." : "Generate New"}
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : availableContent.length > 0 ? (
              <div className="space-y-3">
                {availableContent.map((content) => (
                  <button
                    key={content.id}
                    onClick={() => handleContentSelect(content.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedContent === content.id
                        ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          selectedContent === content.id
                            ? "bg-green-100 dark:bg-green-900"
                            : "bg-gray-100 dark:bg-gray-800"
                        }`}
                      >
                        {selectedContent === content.id ? (
                          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <FileText className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {content.title || "Untitled Post"}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {content.content}
                        </p>
                        <div className="flex gap-1 mt-2">
                          {content.platforms.map((p) => (
                            <Badge key={p} variant="secondary">
                              {p}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-muted-foreground mb-3">
                  No content available yet
                </p>
                <Button
                  variant="secondary"
                  onClick={generateFirstPost}
                  disabled={isGenerating || !brandId}
                >
                  <Sparkles className="mr-2 w-4 h-4" />
                  Generate Your First Post
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Platform Preview */}
      {connectedPlatforms.length > 0 && data.firstPostOption !== "skip" && (
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">
              Will be posted to:
            </h4>
            <div className="flex flex-wrap gap-2">
              {connectedPlatforms.map((platform) => (
                <Badge key={platform} variant="outline">
                  {platform}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Note */}
      <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30">
        <CardContent className="p-4">
          <h5 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
            Pro Tip
          </h5>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Your first post sets the tone! Consider introducing your brand or
            sharing a valuable insight. You can always create more content from
            the Content Factory later.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
