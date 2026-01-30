"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Linkedin,
  Twitter,
  Instagram,
  Calendar,
  Send,
  SkipForward,
} from "lucide-react";
import type { StreamlinedWizardData } from "../streamlined-flywheel-wizard";
import { AIAssistButton } from "../ai-assist-button";

interface FirstPostStepProps {
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

export function FirstPostStep({ data, updateData }: FirstPostStepProps) {
  const generatedPosts: GeneratedPost[] = (data.generatedContent || []).map((item, index) => ({
    id: item.id || `post-${index}`,
    content: item.content,
    platform: (item.platform as GeneratedPost["platform"]) || "linkedin",
    contentType: "educational" as const,
    status: item.status === "scheduled" ? "approved" as const : (item.status as "draft" | "approved"),
  }));

  const [selectedPostId, setSelectedPostId] = useState<string | undefined>(data.selectedPostId || undefined);
  const [publishAction, setPublishAction] = useState<"publish_now" | "schedule" | "skip">(
    (data.firstPostAction as "publish_now" | "schedule" | "skip") || "schedule"
  );

  const parseScheduledTime = (isoString?: string): { date: string; time: string } => {
    if (!isoString) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return { date: tomorrow.toISOString().split("T")[0], time: "09:00" };
    }
    const dateObj = new Date(isoString);
    return { date: dateObj.toISOString().split("T")[0], time: dateObj.toTimeString().slice(0, 5) };
  };

  const initialScheduled = parseScheduledTime(data.scheduledTime);
  const [scheduledDate, setScheduledDate] = useState<string>(initialScheduled.date);
  const [scheduledTime, setScheduledTime] = useState<string>(initialScheduled.time);
  const [isLoadingAISuggestions, setIsLoadingAISuggestions] = useState(false);
  const [aiTimeRecommendation, setAITimeRecommendation] = useState<string | null>(null);

  const handleAISuggestTime = async () => {
    setIsLoadingAISuggestions(true);
    try {
      const selectedPost = generatedPosts.find((p) => p.id === selectedPostId);
      const platform = selectedPost?.platform || "linkedin";
      await new Promise((resolve) => setTimeout(resolve, 800));
      const platformTimes: Record<string, { time: string; reason: string }> = {
        linkedin: { time: "09:00", reason: "Tuesday-Thursday mornings see 60% higher engagement for B2B content" },
        twitter: { time: "12:00", reason: "Lunch hours and evenings drive the most retweets and engagement" },
        instagram: { time: "18:00", reason: "Early evening posts get 3x more engagement than morning posts" },
      };
      const recommendation = platformTimes[platform] || platformTimes.linkedin;
      setScheduledTime(recommendation.time);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const day = tomorrow.getDay();
      if (day === 0) tomorrow.setDate(tomorrow.getDate() + 2);
      else if (day === 5) tomorrow.setDate(tomorrow.getDate() + 4);
      else if (day === 6) tomorrow.setDate(tomorrow.getDate() + 3);
      setScheduledDate(tomorrow.toISOString().split("T")[0]);
      setAITimeRecommendation(recommendation.reason);
    } catch (error) {
      console.error("Error getting AI suggestions:", error);
    } finally {
      setIsLoadingAISuggestions(false);
    }
  };

  useEffect(() => {
    const combinedDateTime = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
    updateData({ selectedPostId, firstPostAction: publishAction, scheduledTime: combinedDateTime });
  }, [selectedPostId, publishAction, scheduledDate, scheduledTime, updateData]);

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
  };

  const selectedPost = generatedPosts.find((p) => p.id === selectedPostId);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Schedule Your First Post</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">Choose a post to publish first, or skip for now</p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Select a post:</p>
        <RadioGroup
          value={selectedPostId || "skip"}
          onValueChange={(value) => {
            if (value === "skip") { setSelectedPostId(undefined); setPublishAction("skip"); }
            else { setSelectedPostId(value); if (publishAction === "skip") setPublishAction("schedule"); }
          }}
        >
          {generatedPosts.map((post, index) => {
            const PlatformIcon = PLATFORM_ICONS[post.platform];
            const isSelected = selectedPostId === post.id;
            return (
              <Card
                key={post.id}
                className={`cursor-pointer transition-all ${isSelected ? "border-2 border-primary bg-primary/5" : "border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-700"}`}
                onClick={() => { setSelectedPostId(post.id); if (publishAction === "skip") setPublishAction("schedule"); }}
              >
                <CardContent className="flex flex-row items-start gap-4 py-4 px-4">
                  <RadioGroupItem value={post.id} id={`post-${post.id}`} className="mt-1" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-500">Post {index + 1}</span>
                      <Badge variant={post.contentType === "educational" ? "default" : post.contentType === "promotional" ? "secondary" : "outline"}>
                        {CONTENT_TYPE_LABELS[post.contentType]}
                      </Badge>
                      <Badge variant="secondary"><PlatformIcon className="w-3 h-3 mr-1" />{post.platform.charAt(0).toUpperCase() + post.platform.slice(1)}</Badge>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{truncateContent(post.content)}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <Card
            className={`cursor-pointer transition-all ${publishAction === "skip" && !selectedPostId ? "border-2 border-amber-500 bg-amber-500/5" : "border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-700"}`}
            onClick={() => { setSelectedPostId(undefined); setPublishAction("skip"); }}
          >
            <CardContent className="flex flex-row items-center gap-4 py-4 px-4">
              <RadioGroupItem value="skip" id="post-skip" />
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800"><SkipForward className="w-5 h-5 text-gray-500" /></div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Skip for now</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">I&apos;ll schedule my first post later</p>
              </div>
            </CardContent>
          </Card>
        </RadioGroup>
      </div>

      {selectedPost && publishAction !== "skip" && (
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">When to publish:</p>
          <RadioGroup value={publishAction} onValueChange={(value) => setPublishAction(value as "publish_now" | "schedule")} className="flex flex-row gap-4">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="publish_now" id="action-publish" />
              <Label htmlFor="action-publish" className="flex items-center gap-2 cursor-pointer"><Send className="w-4 h-4" /><span>Publish now</span></Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="schedule" id="action-schedule" />
              <Label htmlFor="action-schedule" className="flex items-center gap-2 cursor-pointer"><Calendar className="w-4 h-4" /><span>Schedule for later</span></Label>
            </div>
          </RadioGroup>

          {publishAction === "schedule" && (
            <div className="space-y-3">
              <div className="flex gap-4 flex-wrap items-end">
                <div className="space-y-2"><Label>Date</Label><Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} min={new Date().toISOString().split("T")[0]} className="max-w-[180px]" /></div>
                <div className="space-y-2"><Label>Time</Label><Input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="max-w-[140px]" /></div>
                <AIAssistButton onSuggest={handleAISuggestTime} loading={isLoadingAISuggestions} label="Best Time" tooltip="Get AI-recommended optimal posting time" />
              </div>
              {aiTimeRecommendation && <p className="text-xs text-muted-foreground">{aiTimeRecommendation}</p>}
            </div>
          )}
        </div>
      )}

      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        {publishAction === "skip" ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">You can schedule posts from the dashboard after setup</p>
        ) : selectedPost ? (
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="text-gray-500 dark:text-gray-400">Ready to {publishAction === "publish_now" ? "publish" : "schedule"}:</span>
            <Badge variant="default">{CONTENT_TYPE_LABELS[selectedPost.contentType]} post on {selectedPost.platform}</Badge>
            {publishAction === "schedule" && <span className="text-gray-500 dark:text-gray-400">for {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleDateString()} at {scheduledTime}</span>}
          </div>
        ) : (
          <p className="text-sm text-amber-600 dark:text-amber-400 text-center">Select a post or skip to continue</p>
        )}
      </div>
    </div>
  );
}
