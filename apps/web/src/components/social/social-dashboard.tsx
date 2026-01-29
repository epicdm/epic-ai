"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Spinner,
  Textarea,
  Checkbox,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Select,
  SelectItem,
  Avatar,
  Tooltip,
  useDisclosure,
} from "@heroui/react";
import { PageHeader } from "@/components/layout/page-header";
import {
  Sparkles,
  Send,
  Calendar,
  Settings,
  Plus,
  Clock,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Twitter,
  Linkedin,
  Facebook,
  Instagram,
} from "lucide-react";

interface SocialAccount {
  id: string;
  name: string;
  platform: string;
  platformDisplay: string;
  platformColor: string;
  picture?: string;
  username?: string;
  isActive: boolean;
  disabled: boolean;
  expiresAt?: string;
}

interface Post {
  id: string;
  text: string;
  scheduledAt?: string;
  publishedAt?: string;
  status: string;
  platform: string;
  postUrl?: string;
}

interface SetupStatus {
  connected: boolean;
  hasBrand: boolean;
  brandId?: string;
  accounts: SocialAccount[];
  platforms: string[];
  message?: string;
}

interface GeneratedContent {
  content: string;
  hashtags: string[];
  suggestedImagePrompt?: string;
  imageUrl?: string;
}

const CONTENT_TYPES = [
  { key: "custom", label: "Custom Prompt" },
  { key: "lead_converted", label: "New Customer Celebration" },
  { key: "five_star_call", label: "Great Call Highlight" },
  { key: "weekly_content", label: "Weekly Content" },
];

const TONES = [
  { key: "professional", label: "Professional" },
  { key: "casual", label: "Casual" },
  { key: "enthusiastic", label: "Enthusiastic" },
  { key: "educational", label: "Educational" },
];

const PLATFORM_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  TWITTER: Twitter,
  LINKEDIN: Linkedin,
  FACEBOOK: Facebook,
  INSTAGRAM: Instagram,
};

export function SocialDashboard() {
  // State
  const [setup, setSetup] = useState<SetupStatus | null>(null);
  const [integrations, setIntegrations] = useState<SocialAccount[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Composer state
  const [content, setContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [scheduleDate, setScheduleDate] = useState("");
  const [postNow, setPostNow] = useState(true);
  const [posting, setPosting] = useState(false);

  // AI generation state
  const [generating, setGenerating] = useState(false);
  const [contentType, setContentType] = useState("custom");
  const [tone, setTone] = useState("professional");
  const [customPrompt, setCustomPrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  // Connect modal
  const { isOpen: isConnectOpen, onOpen: onConnectOpen, onClose: onConnectClose } = useDisclosure();
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    try {
      setSetupError(null);

      const setupRes = await fetch("/api/social/setup");
      const setupData = await setupRes.json();

      if (setupData.error) {
        setSetupError(setupData.error);
        setSetup({ connected: false, hasBrand: false, accounts: [], platforms: [] });
        return;
      }

      setSetup(setupData);

      // Fetch integrations and posts if we have a brand
      if (setupData.hasBrand) {
        const [integrationsRes, postsRes] = await Promise.all([
          fetch("/api/social/integrations"),
          fetch("/api/social/posts"),
        ]);

        if (integrationsRes.ok) {
          const data = await integrationsRes.json();
          setIntegrations(data.integrations || []);
        }

        if (postsRes.ok) {
          const data = await postsRes.json();
          setPosts(data.posts || []);
        }
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      setSetupError("Failed to connect to social media service");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Connect to platform
  const handleConnect = async (platform: string) => {
    setConnectingPlatform(platform);
    try {
      const res = await fetch(`/api/social/connect?platform=${platform}`);
      const data = await res.json();

      if (data.url) {
        // Redirect to OAuth URL
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Failed to get connect URL:", error);
    } finally {
      setConnectingPlatform(null);
    }
  };

  // Disconnect account
  const handleDisconnect = async (accountId: string) => {
    if (!confirm("Are you sure you want to disconnect this account?")) return;

    try {
      const res = await fetch(`/api/social/setup?accountId=${accountId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        loadData();
      }
    } catch (error) {
      console.error("Disconnect failed:", error);
    }
  };

  // Generate content with AI
  const handleGenerate = async () => {
    setGenerating(true);
    setGeneratedImage(null);

    try {
      const res = await fetch("/api/social/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: contentType,
          tone,
          customPrompt: contentType === "custom" ? customPrompt : undefined,
          platforms: selectedPlatforms,
          includeImage: true,
        }),
      });

      if (!res.ok) throw new Error("Generation failed");

      const data: GeneratedContent = await res.json();

      // Combine content with hashtags
      const hashtags = data.hashtags?.length
        ? "\n\n" + data.hashtags.map((h) => `#${h}`).join(" ")
        : "";
      setContent(data.content + hashtags);

      if (data.imageUrl) {
        setGeneratedImage(data.imageUrl);
      }
    } catch (error) {
      console.error("Generation error:", error);
    } finally {
      setGenerating(false);
    }
  };

  // Create post
  const handlePost = async () => {
    if (!content.trim() || selectedPlatforms.length === 0) return;
    setPosting(true);

    try {
      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          accountIds: selectedPlatforms,
          scheduleDate: postNow ? undefined : scheduleDate,
          postNow,
          imageUrl: generatedImage,
        }),
      });

      if (!res.ok) throw new Error("Failed to create post");

      // Reset form
      setContent("");
      setSelectedPlatforms([]);
      setScheduleDate("");
      setGeneratedImage(null);
      setCustomPrompt("");

      // Refresh posts
      loadData();
    } catch (error) {
      console.error("Post failed:", error);
    } finally {
      setPosting(false);
    }
  };

  // Toggle platform selection
  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Spinner size="lg" />
        <p className="text-gray-500">Loading social media...</p>
      </div>
    );
  }

  // Error state
  if (setupError) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Social Media"
          description="Connect your social accounts and manage content across all platforms."
        />

        <Card>
          <CardBody className="py-16 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Connection Error
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              {setupError}
            </p>
            <Button color="primary" onPress={handleRefresh}>
              Try Again
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  // No brand state
  if (!setup?.hasBrand) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Social Media"
          description="Connect your social accounts and manage content across all platforms."
        />

        <Card>
          <CardBody className="py-16 text-center">
            <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8 text-brand-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Create Your Brand First
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Set up your brand to connect social accounts and start posting.
            </p>
            <Button color="primary" size="lg" as="a" href="/dashboard/brand">
              Create Brand
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Connected state with native experience
  return (
    <div className="space-y-8">
      <PageHeader
        title="Social Media"
        description="Create, schedule, and manage your social content."
        actions={
          <div className="flex items-center gap-2">
            <Tooltip content="Refresh">
              <Button
                variant="flat"
                isIconOnly
                onPress={handleRefresh}
                isLoading={refreshing}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </Tooltip>
            <Button
              variant="flat"
              startContent={<Plus className="w-4 h-4" />}
              onPress={onConnectOpen}
            >
              Add Account
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main composer area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Post Composer */}
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Create Post</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              {/* AI Generation */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Sparkles className="w-4 h-4 text-brand-500" />
                  AI Content Generator
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Content Type"
                    selectedKeys={[contentType]}
                    onSelectionChange={(keys) =>
                      setContentType(Array.from(keys)[0] as string)
                    }
                    size="sm"
                  >
                    {CONTENT_TYPES.map((type) => (
                      <SelectItem key={type.key}>{type.label}</SelectItem>
                    ))}
                  </Select>
                  <Select
                    label="Tone"
                    selectedKeys={[tone]}
                    onSelectionChange={(keys) =>
                      setTone(Array.from(keys)[0] as string)
                    }
                    size="sm"
                  >
                    {TONES.map((t) => (
                      <SelectItem key={t.key}>{t.label}</SelectItem>
                    ))}
                  </Select>
                </div>
                {contentType === "custom" && (
                  <Input
                    label="What should we write about?"
                    placeholder="e.g., Tips for small business owners"
                    value={customPrompt}
                    onValueChange={setCustomPrompt}
                    size="sm"
                  />
                )}
                <Button
                  color="secondary"
                  variant="flat"
                  onPress={handleGenerate}
                  isLoading={generating}
                  startContent={!generating && <Sparkles className="w-4 h-4" />}
                  isDisabled={contentType === "custom" && !customPrompt.trim()}
                >
                  Generate Content
                </Button>
              </div>

              {/* Content textarea */}
              <Textarea
                label="Post Content"
                placeholder="What's on your mind?"
                value={content}
                onValueChange={setContent}
                minRows={4}
                maxRows={8}
              />

              {/* Generated image preview */}
              {generatedImage && (
                <div className="relative">
                  <img
                    src={generatedImage}
                    alt="Generated"
                    className="rounded-lg max-h-64 object-cover"
                  />
                  <Button
                    isIconOnly
                    size="sm"
                    variant="flat"
                    className="absolute top-2 right-2"
                    onPress={() => setGeneratedImage(null)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Platform selection */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Post to
                </label>
                {integrations.filter((i) => !i.disabled).length === 0 ? (
                  <div className="text-sm text-gray-500">
                    No accounts connected.{" "}
                    <button
                      onClick={onConnectOpen}
                      className="text-brand-500 hover:underline"
                    >
                      Add one now
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {integrations
                      .filter((i) => !i.disabled)
                      .map((integration) => (
                        <Chip
                          key={integration.id}
                          variant={
                            selectedPlatforms.includes(integration.id)
                              ? "solid"
                              : "bordered"
                          }
                          color={
                            selectedPlatforms.includes(integration.id)
                              ? "primary"
                              : "default"
                          }
                          className="cursor-pointer"
                          onClick={() => togglePlatform(integration.id)}
                          avatar={
                            integration.picture ? (
                              <Avatar
                                src={integration.picture}
                                size="sm"
                                className="w-5 h-5"
                              />
                            ) : undefined
                          }
                        >
                          {integration.name}
                        </Chip>
                      ))}
                  </div>
                )}
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

              {/* Post button */}
              <div className="flex justify-end">
                <Button
                  color="primary"
                  onPress={handlePost}
                  isLoading={posting}
                  isDisabled={
                    !content.trim() ||
                    selectedPlatforms.length === 0 ||
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
            </CardBody>
          </Card>

          {/* Scheduled/Recent Posts */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Scheduled & Recent Posts</h2>
            </CardHeader>
            <CardBody>
              {posts.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No scheduled posts yet. Create your first post above!
                </p>
              ) : (
                <div className="space-y-4">
                  {posts.slice(0, 10).map((post) => (
                    <div
                      key={post.id}
                      className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {post.platform}
                          </span>
                          <Chip
                            size="sm"
                            variant="flat"
                            color={
                              post.status === "PUBLISHED"
                                ? "success"
                                : post.status === "FAILED"
                                ? "danger"
                                : post.status === "SCHEDULED"
                                ? "warning"
                                : "default"
                            }
                          >
                            {post.status}
                          </Chip>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {post.text}
                        </p>
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(post.scheduledAt || post.publishedAt || "").toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Connected Accounts */}
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h3 className="font-semibold">Connected Accounts</h3>
              <Button
                size="sm"
                variant="light"
                isIconOnly
                onPress={onConnectOpen}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardBody>
              {integrations.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 mb-3">
                    No accounts connected
                  </p>
                  <Button
                    size="sm"
                    color="primary"
                    variant="flat"
                    onPress={onConnectOpen}
                  >
                    Connect Account
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {integrations.map((integration) => (
                    <div
                      key={integration.id}
                      className="flex items-center gap-3"
                    >
                      <Avatar
                        src={integration.picture}
                        name={integration.name}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {integration.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {integration.platformDisplay}
                        </p>
                      </div>
                      {integration.disabled ? (
                        <Chip size="sm" color="warning" variant="flat">
                          Needs reconnect
                        </Chip>
                      ) : (
                        <Button
                          size="sm"
                          variant="light"
                          isIconOnly
                          onPress={() => handleDisconnect(integration.id)}
                        >
                          <Trash2 className="w-3 h-3 text-gray-400" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold">This Week</h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Scheduled
                  </span>
                  <span className="font-semibold">
                    {posts.filter((p) => p.status === "SCHEDULED").length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Published
                  </span>
                  <span className="font-semibold">
                    {posts.filter((p) => p.status === "PUBLISHED").length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Accounts
                  </span>
                  <span className="font-semibold">
                    {integrations.filter((i) => !i.disabled).length}
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Connect Account Modal */}
      <Modal isOpen={isConnectOpen} onClose={onConnectClose}>
        <ModalContent>
          <ModalHeader>Connect Social Account</ModalHeader>
          <ModalBody>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Select a platform to connect your social account.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="flat"
                className="h-20 flex-col gap-2"
                onPress={() => handleConnect("twitter")}
                isLoading={connectingPlatform === "twitter"}
              >
                <Twitter className="w-6 h-6 text-sky-500" />
                <span>Twitter/X</span>
              </Button>
              <Button
                variant="flat"
                className="h-20 flex-col gap-2"
                onPress={() => handleConnect("linkedin")}
                isLoading={connectingPlatform === "linkedin"}
              >
                <Linkedin className="w-6 h-6 text-blue-700" />
                <span>LinkedIn</span>
              </Button>
              <Button
                variant="flat"
                className="h-20 flex-col gap-2"
                onPress={() => handleConnect("facebook")}
                isLoading={connectingPlatform === "facebook"}
              >
                <Facebook className="w-6 h-6 text-blue-600" />
                <span>Facebook</span>
              </Button>
              <Button
                variant="flat"
                className="h-20 flex-col gap-2"
                onPress={() => handleConnect("instagram")}
                isLoading={connectingPlatform === "instagram"}
              >
                <Instagram className="w-6 h-6 text-pink-500" />
                <span>Instagram</span>
              </Button>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onConnectClose}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
