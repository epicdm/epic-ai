"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Tabs,
  Tab,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Avatar,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Textarea,
  useDisclosure,
  Spinner,
  Badge,
  Tooltip,
  Progress,
} from "@heroui/react";
import { PageHeader } from "@/components/layout/page-header";
import {
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Edit3,
  Trash2,
  Send,
  MoreVertical,
  Sparkles,
  Eye,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Zap,
} from "lucide-react";
import { getPlatformIcon, getPlatformColor, getPlatformName } from "@/lib/utils/platform";

interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

interface ContentVariation {
  id: string;
  platform: string;
  text: string;
  hashtags: string[];
  characterCount: number;
  isOptimal: boolean;
  status: string;
  accountId: string | null;
  postId: string | null;
  postUrl: string | null;
  publishedAt: string | null;
  error: string | null;
  account: SocialAccount | null;
}

interface ContentItem {
  id: string;
  content: string;
  contentType: string;
  category: string | null;
  status: string;
  approvalStatus: string;
  scheduledFor: string | null;
  createdAt: string;
  contentVariations: ContentVariation[];
}

interface ContentFactoryPageProps {
  brandId: string;
  brandName: string;
  connectedAccounts: SocialAccount[];
}

const STATUS_COLORS: Record<string, "default" | "warning" | "success" | "danger" | "primary" | "secondary"> = {
  DRAFT: "default",
  PENDING: "warning",
  APPROVED: "success",
  AUTO_APPROVED: "success",
  SCHEDULED: "primary",
  PUBLISHED: "success",
  PARTIALLY_PUBLISHED: "secondary",
  REJECTED: "danger",
  FAILED: "danger",
  SKIPPED: "default",
  PUBLISHING: "primary",
};

export function ContentFactoryPage({
  brandId,
  brandName,
  connectedAccounts,
}: ContentFactoryPageProps) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("all");
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editContent, setEditContent] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const status =
        selectedTab === "pending"
          ? "pending"
          : selectedTab === "scheduled"
          ? "scheduled"
          : selectedTab === "published"
          ? "published"
          : undefined;

      const url = status
        ? `/api/content/queue?brandId=${brandId}&status=${status}`
        : `/api/content/queue?brandId=${brandId}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (error) {
      console.error("Error loading content:", error);
    } finally {
      setLoading(false);
    }
  }, [brandId, selectedTab]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleApprove = async (contentId: string) => {
    setActionLoading(contentId);
    try {
      await fetch("/api/content/queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId, action: "approve" }),
      });
      await loadItems();
    } catch (error) {
      console.error("Error approving content:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (contentId: string) => {
    setActionLoading(contentId);
    try {
      await fetch("/api/content/queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId, action: "reject" }),
      });
      await loadItems();
    } catch (error) {
      console.error("Error rejecting content:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePublish = async (contentId: string) => {
    setActionLoading(contentId);
    try {
      const res = await fetch("/api/content/queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId, action: "publish" }),
      });
      const data = await res.json();
      if (data.publishResults) {
        const successes = data.publishResults.filter((r: { success: boolean }) => r.success).length;
        const failures = data.publishResults.filter((r: { success: boolean }) => !r.success).length;
        alert(`Published: ${successes} succeeded, ${failures} failed`);
      }
      await loadItems();
    } catch (error) {
      console.error("Error publishing content:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (contentId: string) => {
    if (!confirm("Are you sure you want to delete this content?")) return;
    setActionLoading(contentId);
    try {
      await fetch(`/api/content/queue/${contentId}`, { method: "DELETE" });
      await loadItems();
    } catch (error) {
      console.error("Error deleting content:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = (item: ContentItem) => {
    setSelectedItem(item);
    setEditContent(item.content);
    onOpen();
  };

  const handleSaveEdit = async () => {
    if (!selectedItem) return;
    try {
      await fetch(`/api/content/queue/${selectedItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });
      onClose();
      await loadItems();
    } catch (error) {
      console.error("Error saving content:", error);
    }
  };

  const handleQuickGenerate = async () => {
    setGenerating(true);
    try {
      const platforms = connectedAccounts.map((a) => a.platform);
      const res = await fetch("/api/content/generate/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          count: 3,
          targetPlatforms: platforms.length > 0 ? platforms : ["TWITTER", "LINKEDIN"],
          autoApprove: false,
        }),
      });
      const data = await res.json();
      if (data.generated > 0) {
        alert(`Generated ${data.generated} content items!`);
        await loadItems();
      } else {
        alert("Failed to generate content. Please check your brand profile.");
      }
    } catch (error) {
      console.error("Error generating content:", error);
      alert("Failed to generate content");
    } finally {
      setGenerating(false);
    }
  };

  const stats = {
    total: items.length,
    pending: items.filter((i) => i.approvalStatus === "PENDING").length,
    scheduled: items.filter((i) => i.status === "SCHEDULED").length,
    published: items.filter((i) => i.status === "PUBLISHED" || i.status === "PARTIALLY_PUBLISHED").length,
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Content Factory"
        description={`AI-powered content generation for ${brandName}`}
        actions={
          <div className="flex gap-2">
            <Button
              variant="flat"
              startContent={generating ? <Spinner size="sm" /> : <Zap className="w-4 h-4" />}
              onPress={handleQuickGenerate}
              isDisabled={generating}
            >
              Quick Generate
            </Button>
            <Link href="/dashboard/content/generate">
              <Button color="primary" startContent={<Sparkles className="w-4 h-4" />}>
                Generate Content
              </Button>
            </Link>
          </div>
        }
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardBody className="py-4">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-gray-500">Total Content</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-4">
            <p className="text-2xl font-bold text-warning">{stats.pending}</p>
            <p className="text-sm text-gray-500">Pending Review</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-4">
            <p className="text-2xl font-bold text-primary">{stats.scheduled}</p>
            <p className="text-sm text-gray-500">Scheduled</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-4">
            <p className="text-2xl font-bold text-success">{stats.published}</p>
            <p className="text-sm text-gray-500">Published</p>
          </CardBody>
        </Card>
      </div>

      {/* Content List */}
      <Card>
        <CardHeader className="border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <Tabs
            selectedKey={selectedTab}
            onSelectionChange={(key) => setSelectedTab(key as string)}
            variant="underlined"
          >
            <Tab key="all" title={`All (${items.length})`} />
            <Tab key="pending" title={`Pending (${stats.pending})`} />
            <Tab key="scheduled" title={`Scheduled (${stats.scheduled})`} />
            <Tab key="published" title={`Published (${stats.published})`} />
          </Tabs>
          <Button
            size="sm"
            variant="light"
            startContent={<RefreshCw className="w-4 h-4" />}
            onPress={loadItems}
            isDisabled={loading}
          >
            Refresh
          </Button>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="w-16 h-16 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No content yet</h3>
              <p className="text-gray-500 mb-6">
                Generate AI content to start building your queue.
              </p>
              <div className="flex gap-2 justify-center">
                <Button
                  variant="flat"
                  startContent={<Zap className="w-4 h-4" />}
                  onPress={handleQuickGenerate}
                  isDisabled={generating}
                >
                  Quick Generate 3 Posts
                </Button>
                <Link href="/dashboard/content/generate">
                  <Button color="primary" startContent={<Plus className="w-4 h-4" />}>
                    Custom Generate
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <ContentCard
                  key={item.id}
                  item={item}
                  isLoading={actionLoading === item.id}
                  onApprove={() => handleApprove(item.id)}
                  onReject={() => handleReject(item.id)}
                  onPublish={() => handlePublish(item.id)}
                  onEdit={() => handleEdit(item)}
                  onDelete={() => handleDelete(item.id)}
                />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Edit Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="3xl">
        <ModalContent>
          <ModalHeader>Edit Content</ModalHeader>
          <ModalBody>
            <Textarea
              label="Main Content"
              value={editContent}
              onValueChange={setEditContent}
              minRows={4}
              maxRows={8}
            />
            {selectedItem?.contentVariations && selectedItem.contentVariations.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Platform Variations</p>
                <div className="space-y-2">
                  {selectedItem.contentVariations.map((variation) => (
                    <div
                      key={variation.id}
                      className="p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Chip size="sm" variant="flat">
                          {getPlatformName(variation.platform)}
                        </Chip>
                        <span className="text-xs text-gray-500">
                          {variation.characterCount} characters
                        </span>
                        {!variation.isOptimal && (
                          <Chip size="sm" color="warning" variant="flat">
                            Over optimal length
                          </Chip>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {variation.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onClose}>
              Cancel
            </Button>
            <Button color="primary" onPress={handleSaveEdit}>
              Save Changes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

function ContentCard({
  item,
  isLoading,
  onApprove,
  onReject,
  onPublish,
  onEdit,
  onDelete,
}: {
  item: ContentItem;
  isLoading: boolean;
  onApprove: () => void;
  onReject: () => void;
  onPublish: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const canApprove = item.approvalStatus === "PENDING";
  const canPublish =
    (item.approvalStatus === "APPROVED" || item.approvalStatus === "AUTO_APPROVED") &&
    item.status !== "PUBLISHED" &&
    item.status !== "PARTIALLY_PUBLISHED";
  const hasVariations = item.contentVariations && item.contentVariations.length > 0;

  return (
    <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
      <div className="flex items-start gap-4">
        {/* Content Preview */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Chip size="sm" color={STATUS_COLORS[item.status]} variant="flat">
              {item.status.replace("_", " ")}
            </Chip>
            {item.approvalStatus !== item.status && (
              <Chip size="sm" color={STATUS_COLORS[item.approvalStatus]} variant="bordered">
                {item.approvalStatus.replace("_", " ")}
              </Chip>
            )}
            {item.category && (
              <Chip size="sm" variant="flat" color="secondary">
                {item.category}
              </Chip>
            )}
            <Chip size="sm" variant="flat" startContent={<Sparkles className="w-3 h-3" />}>
              AI Generated
            </Chip>
          </div>

          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mb-3">
            {item.content}
          </p>

          {/* Platform Variations */}
          {hasVariations && (
            <div className="flex flex-wrap gap-2 mb-3">
              {item.contentVariations.map((variation) => {
                const Icon = getPlatformIcon(variation.platform);
                const bgColor = getPlatformColor(variation.platform);

                return (
                  <Tooltip
                    key={variation.id}
                    content={
                      <div className="max-w-xs p-2">
                        <p className="font-medium mb-1">{getPlatformName(variation.platform)}</p>
                        <p className="text-xs text-gray-400 mb-2">
                          {variation.characterCount} chars | {variation.status}
                        </p>
                        <p className="text-sm">{variation.text.slice(0, 100)}...</p>
                        {variation.account && (
                          <p className="text-xs text-gray-400 mt-2">
                            @{variation.account.username}
                          </p>
                        )}
                      </div>
                    }
                  >
                    <div
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${bgColor} text-white cursor-default`}
                    >
                      {Icon && <Icon className="w-3 h-3" />}
                      <span>{getPlatformName(variation.platform)}</span>
                      {variation.status === "PUBLISHED" && (
                        <CheckCircle2 className="w-3 h-3" />
                      )}
                      {variation.status === "FAILED" && (
                        <XCircle className="w-3 h-3" />
                      )}
                    </div>
                  </Tooltip>
                );
              })}
            </div>
          )}

          {/* Scheduled Time */}
          {item.scheduledFor && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>
                Scheduled for {new Date(item.scheduledFor).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-2">
          {canApprove && (
            <div className="flex gap-2">
              <Button
                size="sm"
                color="success"
                variant="flat"
                startContent={<ThumbsUp className="w-4 h-4" />}
                onPress={onApprove}
                isLoading={isLoading}
              >
                Approve
              </Button>
              <Button
                size="sm"
                color="danger"
                variant="flat"
                startContent={<ThumbsDown className="w-4 h-4" />}
                onPress={onReject}
                isLoading={isLoading}
              >
                Reject
              </Button>
            </div>
          )}

          {canPublish && (
            <Button
              size="sm"
              color="primary"
              startContent={<Send className="w-4 h-4" />}
              onPress={onPublish}
              isLoading={isLoading}
            >
              Publish Now
            </Button>
          )}

          <Dropdown>
            <DropdownTrigger>
              <Button isIconOnly size="sm" variant="light" isDisabled={isLoading}>
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownTrigger>
            <DropdownMenu>
              <DropdownItem
                key="edit"
                startContent={<Edit3 className="w-4 h-4" />}
                onPress={onEdit}
              >
                Edit
              </DropdownItem>
              <DropdownItem
                key="view"
                startContent={<Eye className="w-4 h-4" />}
              >
                Preview
              </DropdownItem>
              <DropdownItem
                key="delete"
                startContent={<Trash2 className="w-4 h-4" />}
                color="danger"
                className="text-danger"
                onPress={onDelete}
              >
                Delete
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>

          <p className="text-xs text-gray-400">
            {new Date(item.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}
