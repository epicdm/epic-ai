"use client";

import { useState, useEffect } from "react";
import { Card, CardBody, Button, Chip, RadioGroup, Radio, Spinner } from "@heroui/react";
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
      <p className="text-gray-600 dark:text-gray-400">
        Choose how you want to handle your first post. You can publish
        immediately, schedule it, or skip this step for now.
      </p>

      {/* First Post Options */}
      <RadioGroup
        value={data.firstPostOption || "skip"}
        onValueChange={handleOptionChange}
        classNames={{
          wrapper: "gap-3",
        }}
      >
        <Radio
          value="skip"
          classNames={{
            base: "border border-gray-200 dark:border-gray-700 rounded-lg p-4 m-0 max-w-full data-[selected=true]:border-green-500 dark:data-[selected=true]:border-green-500",
          }}
        >
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-gray-400" />
            <div>
              <p className="font-medium">Skip for Now</p>
              <p className="text-sm text-gray-500">
                I&apos;ll create and schedule content later
              </p>
            </div>
          </div>
        </Radio>

        <Radio
          value="schedule"
          classNames={{
            base: "border border-gray-200 dark:border-gray-700 rounded-lg p-4 m-0 max-w-full data-[selected=true]:border-green-500 dark:data-[selected=true]:border-green-500",
          }}
        >
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-blue-500" />
            <div>
              <p className="font-medium">Schedule First Post</p>
              <p className="text-sm text-gray-500">
                Pick content and schedule for optimal time
              </p>
            </div>
          </div>
        </Radio>

        <Radio
          value="publish"
          classNames={{
            base: "border border-gray-200 dark:border-gray-700 rounded-lg p-4 m-0 max-w-full data-[selected=true]:border-green-500 dark:data-[selected=true]:border-green-500",
          }}
        >
          <div className="flex items-center gap-3">
            <Send className="w-5 h-5 text-green-500" />
            <div>
              <p className="font-medium">Publish Now</p>
              <p className="text-sm text-gray-500">
                Send your first post immediately
              </p>
            </div>
          </div>
        </Radio>
      </RadioGroup>

      {/* Content Selection (for schedule/publish options) */}
      {(data.firstPostOption === "schedule" || data.firstPostOption === "publish") && (
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardBody className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900 dark:text-white">
                Select Content
              </h4>
              <Button
                size="sm"
                variant="flat"
                color="secondary"
                startContent={
                  isGenerating ? (
                    <Spinner size="sm" color="current" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )
                }
                onPress={generateFirstPost}
                isDisabled={isGenerating || !brandId}
              >
                {isGenerating ? "Generating..." : "Generate New"}
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner size="lg" />
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
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                          {content.content}
                        </p>
                        <div className="flex gap-1 mt-2">
                          {content.platforms.map((p) => (
                            <Chip key={p} size="sm" variant="flat">
                              {p}
                            </Chip>
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
                <p className="text-gray-500 dark:text-gray-400 mb-3">
                  No content available yet
                </p>
                <Button
                  color="primary"
                  variant="flat"
                  startContent={<Sparkles className="w-4 h-4" />}
                  onPress={generateFirstPost}
                  isDisabled={isGenerating || !brandId}
                >
                  Generate Your First Post
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Platform Preview */}
      {connectedPlatforms.length > 0 && data.firstPostOption !== "skip" && (
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardBody className="p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">
              Will be posted to:
            </h4>
            <div className="flex flex-wrap gap-2">
              {connectedPlatforms.map((platform) => (
                <Chip key={platform} color="success" variant="flat">
                  {platform}
                </Chip>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Info Note */}
      <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30">
        <CardBody className="p-4">
          <h5 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
            Pro Tip
          </h5>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Your first post sets the tone! Consider introducing your brand or
            sharing a valuable insight. You can always create more content from
            the Content Factory later.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
