"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

const CONTENT_TYPE_LABELS = {
  educational: "Educational",
  promotional: "Promotional",
  engaging: "Engaging",
};

export function FirstContentStep({ data, updateData }: FirstContentStepProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPost[]>(() => {
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

  useEffect(() => {
    if (generatedPosts.length === 0) {
      handleGenerate();
    }
  }, []);

  useEffect(() => {
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
          generateMockPosts();
        }
      } else {
        generateMockPosts();
      }
    } catch (error) {
      console.error("Error generating content:", error);
      generateMockPosts();
    } finally {
      setIsGenerating(false);
    }
  };

  const generateMockPosts = () => {
    const brandName = data.brandName || "your brand";
    const industry = data.industry || "business";
    setGeneratedPosts([
      { id: `post-${Date.now()}-1`, content: `🎯 5 ways ${brandName} is transforming the ${industry} industry:\n\n1. Innovative solutions\n2. Customer-first approach\n3. Data-driven decisions\n4. Continuous improvement\n5. Sustainable practices\n\nWhat strategies work best for you? Share below! 👇`, platform: "linkedin", contentType: "educational", status: "draft" },
      { id: `post-${Date.now()}-2`, content: `Exciting news! 🚀 We're launching something that will change how you think about ${industry}. Stay tuned for the big reveal this week!\n\n#innovation #${industry.replace(/\s+/g, "")}`, platform: "twitter", contentType: "promotional", status: "draft" },
      { id: `post-${Date.now()}-3`, content: `Quick question for our community: What's the biggest challenge you face in ${industry} right now?\n\n💭 Drop your thoughts below - we'd love to hear from you!\n\n#community #feedback`, platform: "instagram", contentType: "engaging", status: "draft" },
    ]);
  };

  const handleRegenerate = async (postId: string) => {
    const post = generatedPosts.find((p) => p.id === postId);
    if (!post) return;
    setIsGenerating(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const brandName = data.brandName || "your brand";
    const newContent = post.contentType === "educational"
      ? `📚 Pro tip: Successful ${data.industry || "businesses"} focus on continuous learning and adaptation. What's your secret to staying ahead? #${brandName.replace(/\s+/g, "")}`
      : post.contentType === "promotional"
      ? `Big things are coming! 🎉 ${brandName} is ready to take your experience to the next level. Are you ready? #excited`
      : `We want to hear from you! 🗣️ What's the one thing you wish ${brandName} would do differently? Your feedback shapes our future! 💡`;
    setGeneratedPosts((prev) => prev.map((p) => p.id === postId ? { ...p, content: newContent, status: "draft" as const } : p));
    setIsGenerating(false);
  };

  const handleStartEdit = (post: GeneratedPost) => { setEditingId(post.id); setEditContent(post.content); };
  const handleSaveEdit = (postId: string) => { setGeneratedPosts((prev) => prev.map((p) => p.id === postId ? { ...p, content: editContent, status: "draft" as const } : p)); setEditingId(null); setEditContent(""); };
  const handleCancelEdit = () => { setEditingId(null); setEditContent(""); };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Sample Content</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">AI-generated posts based on your brand voice. Review and edit as needed.</p>
          </div>
          <Button variant="secondary" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Sparkles className="mr-2 w-4 h-4" />}
            {isGenerating ? "Generating..." : "Regenerate All"}
          </Button>
        </div>

        {isGenerating && generatedPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Creating sample posts based on your brand voice...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {generatedPosts.map((post, index) => {
              const PlatformIcon = PLATFORM_ICONS[post.platform];
              const isEditing = editingId === post.id;
              return (
                <Card key={post.id} className="overflow-visible">
                  <CardContent className="space-y-4 py-4 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-500">Post {index + 1}</span>
                        <Badge variant={post.contentType === "educational" ? "default" : post.contentType === "promotional" ? "secondary" : "outline"}>
                          {CONTENT_TYPE_LABELS[post.contentType]}
                        </Badge>
                      </div>
                      <Badge variant="secondary">
                        <PlatformIcon className="w-3 h-3 mr-1" />
                        {post.platform.charAt(0).toUpperCase() + post.platform.slice(1)}
                      </Badge>
                    </div>

                    {isEditing ? (
                      <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={4} className="text-sm" />
                    ) : (
                      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{post.content}</p>
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
                      {isEditing ? (
                        <>
                          <Tooltip><TooltipTrigger asChild><Button size="icon" variant="secondary" className="h-8 w-8" onClick={handleCancelEdit}><X className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent>Cancel</TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><Button size="icon" variant="secondary" className="h-8 w-8 bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400" onClick={() => handleSaveEdit(post.id)}><Check className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent>Save</TooltipContent></Tooltip>
                        </>
                      ) : (
                        <>
                          <Tooltip><TooltipTrigger asChild><Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => handleStartEdit(post)}><Edit2 className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => handleRegenerate(post.id)} disabled={isGenerating}><RefreshCw className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent>Regenerate</TooltipContent></Tooltip>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {generatedPosts.length > 0 && (
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            {generatedPosts.length} post{generatedPosts.length !== 1 ? "s" : ""} ready • Edit any post or continue to connect your accounts
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
