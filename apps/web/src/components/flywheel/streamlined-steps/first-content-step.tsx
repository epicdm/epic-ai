"use client";

import { useState, useEffect } from "react";
import {
  Button,
  Card,
  CardBody,
  Textarea,
  Chip,
  Spinner,
  Tooltip,
} from "@heroui/react";
import { Sparkles, RefreshCw, Edit2, Check, X, Linkedin, Twitter, Instagram } from "lucide-react";
import type { StreamlinedWizardData } from "../streamlined-flywheel-wizard";

interface FirstContentStepProps {
  data: Partial<StreamlinedWizardData>;
  updateData: (data: Partial<StreamlinedWizardData>) => void;
}

interface GeneratedPost {
  id: string;
  content: string;
  platform: "linkedin" | "twitter" | "instagram";
  contentType: "educational" | "promotional" | "engaging";
  status: "draft" | "approved";
}

const PLATFORM_ICONS = {
  linkedin: Linkedin,
  twitter: Twitter,
  instagram: Instagram,
};

const PLATFORM_COLORS = {
  linkedin: "primary",
  twitter: "default",
  instagram: "secondary",
} as const;

const CONTENT_TYPE_LABELS = {
  educational: "Educational",
  promotional: "Promotional",
  engaging: "Engaging",
};

export function FirstContentStep({ data, updateData }: FirstContentStepProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPost[]>(() => {
    // Convert from StreamlinedWizardData format to GeneratedPost format
    if (data.generatedContent && data.generatedContent.length > 0) {
      return data.generatedContent.map((item, index) => ({
        id: item.id || `post-${index}`,
        content: item.content,
        platform: (item.platform as GeneratedPost["platform"]) || "linkedin",
        contentType: "educational" as const,
        status: item.status === "scheduled" ? "approved" as const : (item.status as "draft" | "approved"),
      }));
    }
    return [];
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  // Auto-generate on first load if no content exists
  useEffect(() => {
    if (generatedPosts.length === 0) {
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Convert back to StreamlinedWizardData format
    updateData({
      generatedContent: generatedPosts.map((post) => ({
        id: post.id,
        topic: post.contentType,
        content: post.content,
        platform: post.platform,
        status: post.status as "draft" | "approved" | "scheduled",
      })),
    });
  }, [generatedPosts, updateData]);

  const handleGenerate = async () => {
    setIsGenerating(true);

    try {
      const response = await fetch("/api/flywheel/phases/create/generate-samples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId: data.brandId,
          voiceTone: data.formality,
          personality: data.personalityTraits,
          contentPillars: data.contentPillars,
          count: 3,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.samples && result.samples.length > 0) {
          setGeneratedPosts(
            result.samples.map((sample: { content: string; platform: string; type: string }, index: number) => ({
              id: `post-${Date.now()}-${index}`,
              content: sample.content,
              platform: sample.platform || ["linkedin", "twitter", "instagram"][index % 3],
              contentType: sample.type || ["educational", "promotional", "engaging"][index % 3],
              status: "draft" as const,
            }))
          );
        } else {
          // Use mock data if API returns empty
          generateMockPosts();
        }
      } else {
        // Fallback to mock data
        generateMockPosts();
      }
    } catch (error) {
      console.error("Error generating content:", error);
      // Fallback to mock data
      generateMockPosts();
    } finally {
      setIsGenerating(false);
    }
  };

  const generateMockPosts = () => {
    const brandName = data.brandName || "your brand";
    const industry = data.industry || "business";

    setGeneratedPosts([
      {
        id: `post-${Date.now()}-1`,
        content: `🎯 5 ways ${brandName} is transforming the ${industry} industry:\n\n1. Innovative solutions\n2. Customer-first approach\n3. Data-driven decisions\n4. Continuous improvement\n5. Sustainable practices\n\nWhat strategies work best for you? Share below! 👇`,
        platform: "linkedin",
        contentType: "educational",
        status: "draft",
      },
      {
        id: `post-${Date.now()}-2`,
        content: `Exciting news! 🚀 We're launching something that will change how you think about ${industry}. Stay tuned for the big reveal this week!\n\n#innovation #${industry.replace(/\s+/g, "")}`,
        platform: "twitter",
        contentType: "promotional",
        status: "draft",
      },
      {
        id: `post-${Date.now()}-3`,
        content: `Quick question for our community: What's the biggest challenge you face in ${industry} right now?\n\n💭 Drop your thoughts below - we'd love to hear from you!\n\n#community #feedback`,
        platform: "instagram",
        contentType: "engaging",
        status: "draft",
      },
    ]);
  };

  const handleRegenerate = async (postId: string) => {
    const post = generatedPosts.find((p) => p.id === postId);
    if (!post) return;

    setIsGenerating(true);

    // Simulate regeneration - in production, call the API for a single post
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const brandName = data.brandName || "your brand";
    const newContent = post.contentType === "educational"
      ? `📚 Pro tip: Successful ${data.industry || "businesses"} focus on continuous learning and adaptation. What's your secret to staying ahead? #${brandName.replace(/\s+/g, "")}`
      : post.contentType === "promotional"
      ? `Big things are coming! 🎉 ${brandName} is ready to take your experience to the next level. Are you ready? #excited`
      : `We want to hear from you! 🗣️ What's the one thing you wish ${brandName} would do differently? Your feedback shapes our future! 💡`;

    setGeneratedPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, content: newContent, status: "draft" as const } : p
      )
    );
    setIsGenerating(false);
  };

  const handleStartEdit = (post: GeneratedPost) => {
    setEditingId(post.id);
    setEditContent(post.content);
  };

  const handleSaveEdit = (postId: string) => {
    setGeneratedPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, content: editContent, status: "draft" as const } : p
      )
    );
    setEditingId(null);
    setEditContent("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Sample Content
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            AI-generated posts based on your brand voice. Review and edit as needed.
          </p>
        </div>
        <Button
          color="primary"
          variant="flat"
          startContent={isGenerating ? <Spinner size="sm" /> : <Sparkles className="w-4 h-4" />}
          onPress={handleGenerate}
          isDisabled={isGenerating}
        >
          {isGenerating ? "Generating..." : "Regenerate All"}
        </Button>
      </div>

      {isGenerating && generatedPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Creating sample posts based on your brand voice...
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {generatedPosts.map((post, index) => {
            const PlatformIcon = PLATFORM_ICONS[post.platform];
            const isEditing = editingId === post.id;

            return (
              <Card key={post.id} className="overflow-visible">
                <CardBody className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-500">
                        Post {index + 1}
                      </span>
                      <Chip
                        size="sm"
                        variant="flat"
                        color={post.contentType === "educational" ? "primary" : post.contentType === "promotional" ? "warning" : "success"}
                      >
                        {CONTENT_TYPE_LABELS[post.contentType]}
                      </Chip>
                    </div>
                    <div className="flex items-center gap-2">
                      <Chip
                        size="sm"
                        variant="flat"
                        color={PLATFORM_COLORS[post.platform]}
                        startContent={<PlatformIcon className="w-3 h-3" />}
                      >
                        {post.platform.charAt(0).toUpperCase() + post.platform.slice(1)}
                      </Chip>
                    </div>
                  </div>

                  {/* Content */}
                  {isEditing ? (
                    <Textarea
                      value={editContent}
                      onValueChange={setEditContent}
                      minRows={4}
                      variant="bordered"
                      classNames={{
                        input: "text-sm",
                      }}
                    />
                  ) : (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {post.content}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-2">
                    {isEditing ? (
                      <>
                        <Tooltip content="Cancel">
                          <Button
                            size="sm"
                            variant="flat"
                            isIconOnly
                            onPress={handleCancelEdit}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </Tooltip>
                        <Tooltip content="Save">
                          <Button
                            size="sm"
                            color="success"
                            variant="flat"
                            isIconOnly
                            onPress={() => handleSaveEdit(post.id)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        </Tooltip>
                      </>
                    ) : (
                      <>
                        <Tooltip content="Edit">
                          <Button
                            size="sm"
                            variant="flat"
                            isIconOnly
                            onPress={() => handleStartEdit(post)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </Tooltip>
                        <Tooltip content="Regenerate">
                          <Button
                            size="sm"
                            variant="flat"
                            isIconOnly
                            onPress={() => handleRegenerate(post.id)}
                            isDisabled={isGenerating}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                        </Tooltip>
                      </>
                    )}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Status */}
      {generatedPosts.length > 0 && (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          {generatedPosts.length} post{generatedPosts.length !== 1 ? "s" : ""} ready •
          Edit any post or continue to connect your accounts
        </div>
      )}
    </div>
  );
}
