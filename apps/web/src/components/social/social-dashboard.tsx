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
  ExternalLink,
  Clock,
  RefreshCw,
  Trash2,
  AlertTriangle,
} from "lucide-react";

interface Integration {
  id: string;
  name: string;
  platform: string;
  platformDisplay: string;
  platformColor: string;
  picture?: string;
  disabled: boolean;
}

interface Post {
  id: string;
  content: string;
  publishDate: string;
  state: "QUEUE" | "PUBLISHED" | "ERROR" | "DRAFT";
  integration: {
    id: string;
    providerIdentifier: string;
    name: string;
    picture?: string;
  };
}

interface SetupStatus {
  connected: boolean;
  connectedAt?: string;
  postizUrl?: string;
  connectUrl?: string;
  postizOrgId?: string;
  autoProvisioned?: boolean;
  requiresManualSetup?: boolean;
  error?: string;
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

export function SocialDashboard() {
  // State
  const [setup, setSetup] = useState<SetupStatus | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
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

  // Settings modal (for manual setup fallback and settings)
  const { isOpen: isSettingsOpen, onOpen: onSettingsOpen, onClose: onSettingsClose } = useDisclosure();
  const [apiKey, setApiKey] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [settingsError, setSettingsError] = useState("");

  // Track when user is connecting accounts in Postiz (new tab)
  const [isConnecting, setIsConnecting] = useState(false);

  // Load data - auto-provisions on first visit if POSTIZ_DATABASE_URL is configured
  const loadData = useCallback(async () => {
    try {
      setSetupError(null);

      // Setup endpoint auto-provisions if possible
      const setupRes = await fetch("/api/social/setup");
      const setupData = await setupRes.json();

      if (setupData.error) {
        setSetupError(setupData.error);
        setSetup({ connected: false });
        return;
      }

      setSetup(setupData);

      // Only fetch integrations and posts if connected
      if (setupData.connected) {
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

  // Save API key (manual fallback)
  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) return;
    setSavingKey(true);
    setSettingsError("");

    try {
      const res = await fetch("/api/social/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save API key");
      }

      onSettingsClose();
      setApiKey("");
      loadData();
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setSavingKey(false);
    }
  };

  // Disconnect
  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect? You can reconnect anytime.")) return;

    try {
      await fetch("/api/social/setup", { method: "DELETE" });
      onSettingsClose();
      loadData();
    } catch (error) {
      console.error("Disconnect failed:", error);
    }
  };

  // Get the connect URL - uses server-side redirect for SSO
  const getConnectUrl = (platform?: string) => {
    const params = platform ? `?platform=${platform}` : "";
    return `/api/social/connect-redirect${params}`;
  };

  // Open Postiz with auto-login for connecting accounts
  const openConnectInNewTab = (platform?: string) => {
    window.open(getConnectUrl(platform), "_blank");
    setIsConnecting(true);
  };

  // Called when user clicks "Done" after connecting
  const handleDoneConnecting = () => {
    setIsConnecting(false);
    loadData();
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
          integrationIds: selectedPlatforms,
          scheduleDate: postNow ? undefined : scheduleDate,
          postNow,
          imageUrl: generatedImage,
          generatedBy: generating ? "AI" : "MANUAL",
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
        <p className="text-gray-500">Setting up social media...</p>
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

  // Not connected state - show manual setup if required
  if (!setup?.connected) {
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
              {setup?.requiresManualSetup ? "Connect Your Postiz Account" : "Setting Up Social Media"}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              {setup?.requiresManualSetup
                ? "Enter your Postiz API key to connect your social media accounts."
                : "We're setting up your social media workspace. This should only take a moment."
              }
            </p>
            {setup?.requiresManualSetup ? (
              <div className="flex flex-col items-center gap-4">
                <Button color="primary" size="lg" onPress={onSettingsOpen}>
                  Connect Postiz Account
                </Button>
                {setup?.postizUrl && (
                  <a
                    href={setup.postizUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    Open Postiz to get your API key
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ) : (
              <Button color="primary" onPress={handleRefresh} isLoading={refreshing}>
                Refresh
              </Button>
            )}
          </CardBody>
        </Card>

        {/* Manual Setup Modal */}
        <Modal isOpen={isSettingsOpen} onClose={onSettingsClose}>
          <ModalContent>
            <ModalHeader>Connect Postiz</ModalHeader>
            <ModalBody>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Enter your Postiz API key to connect. You can find this in your Postiz settings under &quot;API Keys&quot;.
              </p>
              <Input
                label="API Key"
                placeholder="Enter your Postiz API key"
                value={apiKey}
                onValueChange={setApiKey}
                type="password"
              />
              {settingsError && (
                <p className="text-sm text-red-500 mt-2">{settingsError}</p>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={onSettingsClose}>
                Cancel
              </Button>
              <Button
                color="primary"
                onPress={handleSaveApiKey}
                isLoading={savingKey}
                isDisabled={!apiKey.trim()}
              >
                Connect
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
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
              onPress={() => openConnectInNewTab()}
            >
              Add Account
            </Button>
            <Button
              variant="flat"
              startContent={<Settings className="w-4 h-4" />}
              onPress={onSettingsOpen}
            >
              Settings
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
                {integrations.length === 0 ? (
                  <div className="text-sm text-gray-500">
                    No accounts connected.{" "}
                    <button
                      onClick={() => openConnectInNewTab()}
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
                      <Avatar
                        src={post.integration.picture}
                        name={post.integration.name}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {post.integration.name}
                          </span>
                          <Chip
                            size="sm"
                            variant="flat"
                            color={
                              post.state === "PUBLISHED"
                                ? "success"
                                : post.state === "ERROR"
                                ? "danger"
                                : post.state === "QUEUE"
                                ? "warning"
                                : "default"
                            }
                          >
                            {post.state === "QUEUE"
                              ? "Scheduled"
                              : post.state === "PUBLISHED"
                              ? "Published"
                              : post.state === "ERROR"
                              ? "Failed"
                              : "Draft"}
                          </Chip>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {post.content}
                        </p>
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(post.publishDate).toLocaleString()}
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
                onPress={() => openConnectInNewTab()}
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
                    onPress={() => openConnectInNewTab()}
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
                      {integration.disabled && (
                        <Chip size="sm" color="warning" variant="flat">
                          Needs reconnect
                        </Chip>
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
                    {posts.filter((p) => p.state === "QUEUE").length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Published
                  </span>
                  <span className="font-semibold">
                    {posts.filter((p) => p.state === "PUBLISHED").length}
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

          {/* Postiz Link */}
          <Card>
            <CardBody className="py-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Advanced features available in Postiz
              </p>
              <Button
                as="a"
                href={setup?.postizUrl}
                target="_blank"
                variant="flat"
                className="w-full"
                endContent={<ExternalLink className="w-4 h-4" />}
              >
                Open Postiz Dashboard
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Settings Modal */}
      <Modal isOpen={isSettingsOpen} onClose={onSettingsClose}>
        <ModalContent>
          <ModalHeader>Social Media Settings</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Connection Status
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-sm">
                    {setup?.autoProvisioned ? "Auto-configured" : "Connected to Postiz"}
                  </span>
                </div>
                {setup?.connectedAt && (
                  <p className="text-xs text-gray-500 mt-1">
                    Connected on{" "}
                    {new Date(setup.connectedAt).toLocaleDateString()}
                  </p>
                )}
              </div>

              {!setup?.autoProvisioned && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Update API Key
                  </label>
                  <Input
                    placeholder="Enter new API key"
                    value={apiKey}
                    onValueChange={setApiKey}
                    type="password"
                    className="mt-1"
                  />
                  {settingsError && (
                    <p className="text-sm text-red-500 mt-1">{settingsError}</p>
                  )}
                </div>
              )}

              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Connected Accounts: {integrations.length}
                </p>
                {setup?.postizUrl && (
                  <Button
                    as="a"
                    href={setup.postizUrl}
                    target="_blank"
                    variant="flat"
                    size="sm"
                    className="w-full"
                    endContent={<ExternalLink className="w-4 h-4" />}
                  >
                    Manage in Postiz
                  </Button>
                )}
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" color="danger" onPress={handleDisconnect}>
              Disconnect
            </Button>
            <div className="flex-1" />
            <Button variant="flat" onPress={onSettingsClose}>
              Close
            </Button>
            {!setup?.autoProvisioned && apiKey.trim() && (
              <Button
                color="primary"
                onPress={handleSaveApiKey}
                isLoading={savingKey}
              >
                Update Key
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Connecting Banner - shows when user opened Postiz in new tab */}
      {isConnecting && (
        <div className="fixed bottom-4 right-4 z-50 bg-brand-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-4">
          <div>
            <p className="font-medium">Connecting social accounts...</p>
            <p className="text-sm text-brand-100">Click Done when you&apos;ve finished in Postiz</p>
          </div>
          <Button
            size="sm"
            color="default"
            variant="solid"
            onPress={handleDoneConnecting}
            className="bg-white text-brand-600 font-medium"
          >
            Done
          </Button>
        </div>
      )}
    </div>
  );
}
