"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sparkles, RefreshCw, Check, Edit2 } from "lucide-react";
import type { CreateWizardData, GeneratedContentData } from "@/lib/flywheel/types";

interface FirstContentStepProps {
  data: CreateWizardData;
  updateData: (updates: Partial<CreateWizardData>) => void;
  brandId?: string;
}

export function FirstContentStep({ data, updateData, brandId }: FirstContentStepProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [topic, setTopic] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const generatedContent = data.generatedContent || [];

  const generateContent = async () => {
    if (!topic.trim()) return;

    setIsGenerating(true);
    try {
      const response = await fetch("/api/flywheel/phases/create/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          topic: topic.trim(),
          templates: data.templates,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.content) {
          const newContent: GeneratedContentData = {
            id: `content-${Date.now()}`,
            topic: topic.trim(),
            content: result.content,
            platform: result.platform || "twitter",
            status: "draft",
          };
          updateData({
            generatedContent: [...generatedContent, newContent],
          });
          setTopic("");
        }
      }
    } catch (error) {
      console.error("Error generating content:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateSampleContent = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/flywheel/phases/create/generate-samples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          templates: data.templates,
          count: 3,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.samples?.length > 0) {
          updateData({
            generatedContent: [
              ...generatedContent,
              ...result.samples.map((s: Partial<GeneratedContentData>, i: number) => ({
                id: `content-${Date.now()}-${i}`,
                topic: s.topic || "Sample topic",
                content: s.content || "",
                platform: s.platform || "twitter",
                status: "draft" as const,
              })),
            ],
          });
        }
      }
    } catch (error) {
      console.error("Error generating samples:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const approveContent = (id: string) => {
    updateData({
      generatedContent: generatedContent.map((c) =>
        c.id === id ? { ...c, status: "approved" as const } : c
      ),
    });
  };

  const startEdit = (content: GeneratedContentData) => {
    setEditingId(content.id!);
    setEditContent(content.content);
  };

  const saveEdit = (id: string) => {
    updateData({
      generatedContent: generatedContent.map((c) =>
        c.id === id ? { ...c, content: editContent } : c
      ),
    });
    setEditingId(null);
    setEditContent("");
  };

  const removeContent = (id: string) => {
    updateData({
      generatedContent: generatedContent.filter((c) => c.id !== id),
    });
  };

  const regenerateContent = async (id: string) => {
    const content = generatedContent.find((c) => c.id === id);
    if (!content) return;

    setIsGenerating(true);
    try {
      const response = await fetch("/api/flywheel/phases/create/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          topic: content.topic,
          templates: data.templates,
          platform: content.platform,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.content) {
          updateData({
            generatedContent: generatedContent.map((c) =>
              c.id === id
                ? { ...c, content: result.content, status: "draft" as const }
                : c
            ),
          });
        }
      }
    } catch (error) {
      console.error("Error regenerating content:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-gray-600 dark:text-gray-400">
        Generate your first pieces of content using your brand voice. Review and
        approve them before proceeding.
      </p>

      {/* Topic Input */}
      <div className="flex gap-3">
        <Input
          placeholder="Enter a topic for AI to write about..."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && topic.trim()) {
              generateContent();
            }
          }}
          className="text-base"
        />
        <Button
          onClick={generateContent}
          disabled={!topic.trim() || isGenerating}
        >
          {isGenerating ? (
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          Generate
        </Button>
      </div>

      {generatedContent.length === 0 && (
        <div className="text-center py-8">
          <Sparkles className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No content yet. Enter a topic or let AI create samples.
          </p>
          <Button
            variant="outline"
            onClick={generateSampleContent}
            disabled={isGenerating}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Sample Content
          </Button>
        </div>
      )}

      {/* Generated Content List */}
      <div className="space-y-4">
        {generatedContent.map((content) => (
          <Card
            key={content.id}
            className={`border ${
              content.status === "approved"
                ? "border-green-300 dark:border-green-700"
                : "border-gray-200 dark:border-gray-700"
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {content.platform}
                  </Badge>
                  <span className="text-sm text-gray-500">{content.topic}</span>
                </div>
                <Badge
                  variant={content.status === "approved" ? "default" : "secondary"}
                  className={content.status === "approved" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"}
                >
                  {content.status}
                </Badge>
              </div>

              {editingId === content.id ? (
                <div className="space-y-3">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    rows={4}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => saveEdit(content.id!)}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {content.content}
                  </p>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(content)}
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => regenerateContent(content.id!)}
                        disabled={isGenerating}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Regenerate
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeContent(content.id!)}
                      >
                        Remove
                      </Button>
                    </div>

                    {content.status !== "approved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => approveContent(content.id!)}
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Approve
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {generatedContent.length > 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          You need at least 1 piece of content to continue. Approved:{" "}
          {generatedContent.filter((c) => c.status === "approved").length}/
          {generatedContent.length}
        </p>
      )}
    </div>
  );
}
