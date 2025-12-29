"use client";

import { useState } from "react";
import {
  Card,
  CardBody,
  RadioGroup,
  Radio,
  Input,
  Button,
  Chip,
} from "@heroui/react";
import { Hash, Plus, Sparkles, Loader2 } from "lucide-react";
import type { CreateWizardData } from "@/lib/flywheel/types";

interface HashtagStepProps {
  data: CreateWizardData;
  updateData: (updates: Partial<CreateWizardData>) => void;
  brandId?: string;
}

const HASHTAG_STRATEGIES = [
  {
    id: "none",
    label: "No Hashtags",
    description: "Clean posts without hashtags",
    example: "Posts will have no hashtags appended",
  },
  {
    id: "minimal",
    label: "Minimal (1-2)",
    description: "Just the essentials",
    example: "#marketing #ai",
  },
  {
    id: "moderate",
    label: "Moderate (3-5)",
    description: "Balanced visibility",
    example: "#marketing #ai #contentcreation #growth #strategy",
  },
  {
    id: "heavy",
    label: "Heavy (6+)",
    description: "Maximum discoverability",
    example: "#marketing #ai #content #strategy #growth #business #tips #digital",
  },
];

export function HashtagStep({ data, updateData, brandId }: HashtagStepProps) {
  const [newHashtag, setNewHashtag] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const hashtagStrategy = data.hashtagStrategy || "moderate";
  const savedHashtags = data.savedHashtags || [];

  const addHashtag = (tag: string) => {
    // Clean up the hashtag
    let cleanTag = tag.trim().toLowerCase();
    if (!cleanTag.startsWith("#")) {
      cleanTag = "#" + cleanTag;
    }
    // Remove any spaces or special characters
    cleanTag = cleanTag.replace(/[^a-zA-Z0-9#_]/g, "");

    if (cleanTag.length > 1 && !savedHashtags.includes(cleanTag)) {
      updateData({
        savedHashtags: [...savedHashtags, cleanTag],
      });
    }
    setNewHashtag("");
  };

  const removeHashtag = (tag: string) => {
    updateData({
      savedHashtags: savedHashtags.filter((t) => t !== tag),
    });
  };

  const generateHashtags = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/flywheel/phases/create/suggest-hashtags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          existingHashtags: savedHashtags,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.hashtags?.length > 0) {
          const newTags = result.hashtags.filter(
            (tag: string) => !savedHashtags.includes(tag)
          );
          updateData({
            savedHashtags: [...savedHashtags, ...newTags],
          });
        }
      }
    } catch (error) {
      console.error("Error generating hashtags:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-gray-600 dark:text-gray-400">
        Configure how AI uses hashtags in your content. Save commonly used
        hashtags for quick access.
      </p>

      {/* Hashtag Strategy */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <Hash className="w-4 h-4" />
          Hashtag Density
        </h4>

        <RadioGroup
          value={hashtagStrategy}
          onValueChange={(value) =>
            updateData({
              hashtagStrategy: value as CreateWizardData["hashtagStrategy"],
            })
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {HASHTAG_STRATEGIES.map((strategy) => (
              <Card
                key={strategy.id}
                className={`border cursor-pointer transition-all ${
                  hashtagStrategy === strategy.id
                    ? "border-blue-400 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                }`}
                isPressable
                onPress={() =>
                  updateData({
                    hashtagStrategy: strategy.id as CreateWizardData["hashtagStrategy"],
                  })
                }
              >
                <CardBody className="p-4">
                  <div className="flex items-start gap-3">
                    <Radio value={strategy.id} />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {strategy.label}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {strategy.description}
                      </p>
                      {strategy.id !== "none" && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-mono">
                          {strategy.example}
                        </p>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </RadioGroup>
      </div>

      {/* Saved Hashtags */}
      {hashtagStrategy !== "none" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900 dark:text-white">
              Saved Hashtags
            </h4>
            <Button
              size="sm"
              variant="flat"
              color="secondary"
              startContent={
                isGenerating ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )
              }
              onPress={generateHashtags}
              isDisabled={isGenerating}
            >
              AI Suggest
            </Button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Add hashtags that AI will use when creating content.
          </p>

          {/* Add Hashtag Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter a hashtag..."
              value={newHashtag}
              onValueChange={setNewHashtag}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newHashtag.trim()) {
                  addHashtag(newHashtag);
                }
              }}
              startContent={<Hash className="w-4 h-4 text-gray-400" />}
              classNames={{
                input: "text-sm",
              }}
            />
            <Button
              color="primary"
              variant="flat"
              onPress={() => addHashtag(newHashtag)}
              isDisabled={!newHashtag.trim()}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Hashtag List */}
          {savedHashtags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {savedHashtags.map((tag) => (
                <Chip
                  key={tag}
                  variant="flat"
                  color="primary"
                  onClose={() => removeHashtag(tag)}
                >
                  {tag}
                </Chip>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">
              No hashtags saved yet. Add some or let AI suggest based on your brand.
            </p>
          )}
        </div>
      )}

      {/* Info Box */}
      <Card className="border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <CardBody className="p-4">
          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Platform Tips
          </h5>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>• <strong>Twitter/X:</strong> 1-2 hashtags work best</li>
            <li>• <strong>LinkedIn:</strong> 3-5 hashtags for visibility</li>
            <li>• <strong>Instagram:</strong> Up to 30 allowed, 5-10 recommended</li>
            <li>• <strong>Facebook:</strong> 1-2 or none, less hashtag-focused</li>
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
