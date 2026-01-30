"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { Send, Calendar, Sparkles, Wand2, RefreshCw, Lightbulb, MessageSquare } from "lucide-react";
import { trackEvent } from "@/lib/analytics/analytics";

interface SocialAccount {
  id: string;
  platform: string;
  platformUsername?: string;
  displayName?: string;
  avatarUrl?: string;
  isActive: boolean;
}

interface ContentPillar {
  id: string;
  name: string;
  description?: string;
}

interface BrandVoice {
  tone?: string;
  formality?: number;
  emojiUsage?: string;
}

interface SetupStatus {
  connected: boolean;
  hasBrand: boolean;
  brandId?: string;
  accounts: SocialAccount[];
  message?: string;
  brandName?: string;
  pillars?: ContentPillar[];
  voice?: BrandVoice;
}

export function PostComposer() {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [postNow, setPostNow] = useState(true);
  const [scheduleDate, setScheduleDate] = useState("");
  const [posting, setPosting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedPillar, setSelectedPillar] = useState<string | null>(null);
  const [customTopic, setCustomTopic] = useState("");

  useEffect(() => {
    async function checkStatus() {
      try {
        const response = await fetch("/api/social/setup?includeBrand=true");
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
        }
      } catch (err) {
        console.error("Error checking status:", err);
      } finally {
        setLoading(false);
      }
    }

    checkStatus();
  }, []);

  // AI Content Generation
  const handleGenerateContent = async (topic?: string) => {
    if (!status?.brandId) {
      console.error("No brand ID available for content generation");
      return;
    }

    setGenerating(true);
    try {
      // Determine target platforms from selected accounts
      const selectedPlatforms = selectedAccounts
        .map(id => status?.accounts.find(a => a.id === id)?.platform?.toUpperCase())
        .filter((p): p is string => !!p);

      // Default to common platforms if none selected
      const targetPlatforms = selectedPlatforms.length > 0
        ? selectedPlatforms
        : ["TWITTER", "LINKEDIN"];

      const response = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId: status.brandId,
          topic: topic || customTopic || selectedPillar,
          targetPlatforms,
          contentType: "POST",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // The generator returns content with variations, get the first one
        const generatedContent = data.content?.text || data.content?.variations?.[0]?.text || "";
        setContent(generatedContent);
        trackEvent("ai_content_generated", {
          topic: topic || customTopic || selectedPillar || undefined,
          platforms: targetPlatforms,
        });
      } else {
        const error = await response.json();
        console.error("Content generation failed:", error);
      }
    } catch (err) {
      console.error("Error generating content:", err);
    } finally {
      setGenerating(false);
    }
  };

  const toggleAccount = (id: string) => {
    setSelectedAccounts((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const handlePost = async () => {
    if (!content.trim() || selectedAccounts.length === 0) return;
    setPosting(true);

    try {
      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          accountIds: selectedAccounts,
          scheduleDate: postNow ? undefined : scheduleDate,
          postNow,
        }),
      });

      if (!res.ok) throw new Error("Failed to create post");

      trackEvent("social_post_created", {
        platforms_count: selectedAccounts.length,
        scheduled: !postNow,
        content_length: content.length,
      });

      // Reset form
      setContent("");
      setSelectedAccounts([]);
      setScheduleDate("");
    } catch (error) {
      console.error("Post failed:", error);
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const activeAccounts = status?.accounts?.filter((a) => a.isActive) || [];

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/dashboard/social" className="hover:text-gray-700">
            Social
          </Link>
          <span>/</span>
          <span>Create Post</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Create Post
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Schedule content across your social media platforms.
        </p>
      </div>

      {!status?.hasBrand ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Brand Configured
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create a brand first to start posting to social media.
            </p>
            <Button as={Link} href="/dashboard/brand" >
              Create Brand
            </Button>
          </CardContent>
        </Card>
      ) : activeAccounts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Connect Your Social Accounts
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Connect Twitter, LinkedIn, or Meta to start posting.
            </p>
            <Button as={Link} href="/dashboard/social" >
              Connect Accounts
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Composer */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <h2 className="text-lg font-semibold">Compose</h2>
                {status?.brandName && (
                  <Badge variant="secondary">
                    Posting as {status.brandName}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* AI Generation Section */}
                {status?.pillars && status.pillars.length > 0 && (
                  <div className="p-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl border border-primary/10">
                    <div className="flex items-center gap-2 mb-3">
                      <Wand2 className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">AI-Powered Content</span>
                    </div>

                    {/* Topic Suggestions from Content Pillars */}
                    <div className="mb-3">
                      <p className="text-xs text-default-500 mb-2">Choose a topic from your content pillars:</p>
                      <div className="flex flex-wrap gap-2">
                        {status.pillars.map((pillar) => (
                          <TooltipProvider key={pillar.id}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant={selectedPillar === pillar.name ? "default" : "outline"}
                                  className="cursor-pointer"
                                  onClick={() => setSelectedPillar(selectedPillar === pillar.name ? null : pillar.name)}
                                >
                                  {pillar.name}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>{pillar.description || `Generate content about ${pillar.name}`}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </div>
                    </div>

                    {/* Custom Topic or Generate */}
                    <div className="flex gap-2">
                      <Input
                        size="sm"
                        placeholder="Or enter a custom topic..."
                        value={customTopic}
                        onChange={(e) => {
                          setCustomTopic(e.target.value);
                          if (e.target.value) setSelectedPillar(null);
                        }}
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        disabled={generating || (!selectedPillar && !customTopic)}
                        onClick={() => handleGenerateContent()}
                      >
                        {generating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Generate
                      </Button>
                    </div>
                  </div>
                )}

                <div className="relative">
                  <Textarea
                    placeholder={status?.pillars?.length ? "Select a topic above and click Generate, or write your own..." : "Write your post content here..."}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={8}
                  />
                  {content && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute bottom-2 right-2"
                      onClick={() => handleGenerateContent(content.split(' ').slice(0, 5).join(' '))}
                      disabled={generating}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {/* Platform selection */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Post to
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {activeAccounts.map((account) => (
                      <Badge
                        key={account.id}
                        variant={selectedAccounts.includes(account.id) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleAccount(account.id)}
                      >
                        {account.avatarUrl && (
                          <img src={account.avatarUrl} alt="" className="w-4 h-4 rounded-full mr-1" />
                        )}
                        {account.displayName || account.platformUsername || account.platform}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Schedule options */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="post-now"
                      checked={postNow}
                      onCheckedChange={setPostNow}
                    />
                    <Label htmlFor="post-now" className="text-sm">Post immediately</Label>
                  </div>
                  {!postNow && (
                    <Input
                      type="datetime-local"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="max-w-xs"
                    />
                  )}
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-gray-500">
                    {content.length} characters
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline">Save Draft</Button>
                    <Button
                      onClick={handlePost}
                      disabled={
                        posting ||
                        !content.trim() ||
                        selectedAccounts.length === 0 ||
                        (!postNow && !scheduleDate)
                      }
                    >
                      {posting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : postNow ? (
                        <Send className="w-4 h-4 mr-2" />
                      ) : (
                        <Calendar className="w-4 h-4 mr-2" />
                      )}
                      {postNow ? "Post Now" : "Schedule Post"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Connected Accounts</h2>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeAccounts.map((account) => (
                  <div key={account.id} className="flex items-center gap-3">
                    {account.avatarUrl ? (
                      <img src={account.avatarUrl} alt={account.displayName || account.platform} className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium">
                        {(account.displayName || account.platform).charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {account.displayName || account.platformUsername}
                      </p>
                      <p className="text-xs text-gray-500">{account.platform}</p>
                    </div>
                  </div>
                ))}
                <Button
                  as={Link}
                  href="/dashboard/social"
                  variant="secondary"
                  size="sm"
                  className="w-full mt-2"
                >
                  Manage Accounts
                </Button>
              </CardContent>
            </Card>

            {/* Brand Voice Card */}
            {status?.voice && (
              <Card className="border border-secondary/20">
                <CardHeader>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-secondary" />
                    Your Brand Voice
                  </h2>
                </CardHeader>
                <CardContent className="space-y-3">
                  {status.voice.tone && (
                    <div>
                      <p className="text-xs text-default-500 uppercase tracking-wide">Tone</p>
                      <p className="text-sm font-medium capitalize">{status.voice.tone}</p>
                    </div>
                  )}
                  {status.voice.formality && (
                    <div>
                      <p className="text-xs text-default-500 uppercase tracking-wide">Formality</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-2 bg-default-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-secondary rounded-full"
                            style={{ width: `${(status.voice.formality / 5) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-default-500">
                          {status.voice.formality <= 2 ? "Casual" : status.voice.formality >= 4 ? "Formal" : "Balanced"}
                        </span>
                      </div>
                    </div>
                  )}
                  {status.voice.emojiUsage && (
                    <div>
                      <p className="text-xs text-default-500 uppercase tracking-wide">Emoji Usage</p>
                      <p className="text-sm font-medium capitalize">{status.voice.emojiUsage}</p>
                    </div>
                  )}
                  <Button
                    as={Link}
                    href="/dashboard/brand"
                    variant="secondary"
                    size="sm"
                    className="w-full mt-2"
                  >
                    Edit Brand Voice
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Tips Card - only show if no voice data */}
            {!status?.voice && (
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold">Tips</h2>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-start gap-2">
                      <span>•</span>
                      <span>Keep posts concise for better engagement</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>•</span>
                      <span>Use images or videos to boost visibility</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>•</span>
                      <span>Schedule posts for optimal times</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>•</span>
                      <span>Cross-post to multiple platforms</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
