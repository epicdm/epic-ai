"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Textarea,
  Spinner,
  Chip,
  Avatar,
  Checkbox,
  Input,
  Tooltip,
} from "@heroui/react";
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
          topic: topic || customTopic || selectedPillar,
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
        <Spinner size="lg" />
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
          <CardBody className="py-16 text-center">
            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Brand Configured
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create a brand first to start posting to social media.
            </p>
            <Button as={Link} href="/dashboard/brand" color="primary">
              Create Brand
            </Button>
          </CardBody>
        </Card>
      ) : activeAccounts.length === 0 ? (
        <Card>
          <CardBody className="py-16 text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Connect Your Social Accounts
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Connect Twitter, LinkedIn, or Meta to start posting.
            </p>
            <Button as={Link} href="/dashboard/social" color="primary">
              Connect Accounts
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Composer */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <h2 className="text-lg font-semibold">Compose</h2>
                {status?.brandName && (
                  <Chip size="sm" variant="flat" color="secondary" startContent={<MessageSquare className="w-3 h-3" />}>
                    Posting as {status.brandName}
                  </Chip>
                )}
              </CardHeader>
              <CardBody className="space-y-4">
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
                          <Tooltip key={pillar.id} content={pillar.description || `Generate content about ${pillar.name}`}>
                            <Chip
                              variant={selectedPillar === pillar.name ? "solid" : "bordered"}
                              color={selectedPillar === pillar.name ? "primary" : "default"}
                              className="cursor-pointer"
                              startContent={<Lightbulb className="w-3 h-3" />}
                              onClick={() => setSelectedPillar(selectedPillar === pillar.name ? null : pillar.name)}
                            >
                              {pillar.name}
                            </Chip>
                          </Tooltip>
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
                        color="primary"
                        size="sm"
                        isLoading={generating}
                        isDisabled={!selectedPillar && !customTopic}
                        startContent={!generating && <Sparkles className="w-4 h-4" />}
                        onPress={() => handleGenerateContent()}
                      >
                        Generate
                      </Button>
                    </div>
                  </div>
                )}

                <Textarea
                  label="What's on your mind?"
                  placeholder={status?.pillars?.length ? "Select a topic above and click Generate, or write your own..." : "Write your post content here..."}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  minRows={6}
                  maxRows={12}
                  endContent={
                    content && (
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        className="absolute bottom-2 right-2"
                        onPress={() => handleGenerateContent(content.split(' ').slice(0, 5).join(' '))}
                        isLoading={generating}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    )
                  }
                />

                {/* Platform selection */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Post to
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {activeAccounts.map((account) => (
                      <Chip
                        key={account.id}
                        variant={
                          selectedAccounts.includes(account.id)
                            ? "solid"
                            : "bordered"
                        }
                        color={
                          selectedAccounts.includes(account.id)
                            ? "primary"
                            : "default"
                        }
                        className="cursor-pointer"
                        onClick={() => toggleAccount(account.id)}
                        avatar={
                          account.avatarUrl ? (
                            <Avatar
                              src={account.avatarUrl}
                              size="sm"
                              className="w-5 h-5"
                            />
                          ) : undefined
                        }
                      >
                        {account.displayName || account.platformUsername || account.platform}
                      </Chip>
                    ))}
                  </div>
                </div>

                {/* Schedule options */}
                <div className="flex items-center gap-4">
                  <Checkbox
                    isSelected={postNow}
                    onValueChange={setPostNow}
                    size="sm"
                  >
                    Post immediately
                  </Checkbox>
                  {!postNow && (
                    <Input
                      type="datetime-local"
                      value={scheduleDate}
                      onValueChange={setScheduleDate}
                      size="sm"
                      className="max-w-xs"
                      label="Schedule for"
                    />
                  )}
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-gray-500">
                    {content.length} characters
                  </div>
                  <div className="flex gap-3">
                    <Button variant="bordered">Save Draft</Button>
                    <Button
                      color="primary"
                      onPress={handlePost}
                      isLoading={posting}
                      isDisabled={
                        !content.trim() ||
                        selectedAccounts.length === 0 ||
                        (!postNow && !scheduleDate)
                      }
                      startContent={
                        !posting &&
                        (postNow ? (
                          <Send className="w-4 h-4" />
                        ) : (
                          <Calendar className="w-4 h-4" />
                        ))
                      }
                    >
                      {postNow ? "Post Now" : "Schedule Post"}
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Connected Accounts</h2>
              </CardHeader>
              <CardBody className="space-y-3">
                {activeAccounts.map((account) => (
                  <div key={account.id} className="flex items-center gap-3">
                    <Avatar
                      src={account.avatarUrl}
                      name={account.displayName || account.platform}
                      size="sm"
                    />
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
                  variant="flat"
                  size="sm"
                  className="w-full mt-2"
                >
                  Manage Accounts
                </Button>
              </CardBody>
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
                <CardBody className="space-y-3">
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
                    variant="flat"
                    size="sm"
                    className="w-full mt-2"
                  >
                    Edit Brand Voice
                  </Button>
                </CardBody>
              </Card>
            )}

            {/* Tips Card - only show if no voice data */}
            {!status?.voice && (
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold">Tips</h2>
                </CardHeader>
                <CardBody>
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
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
