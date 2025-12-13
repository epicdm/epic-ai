"use client";

import { useState, useCallback } from "react";
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
  Twitter,
  Linkedin,
  Instagram,
  Facebook,
} from "lucide-react";

interface Schedule {
  id: string;
  platform: string;
  scheduledFor: Date;
  status: string;
  socialAccount: {
    id: string;
    platform: string;
    accountName: string;
    profileImageUrl: string | null;
  } | null;
}

interface ContentItem {
  id: string;
  content: string;
  contentType: string;
  status: string;
  aiGenerated: boolean;
  imageUrls: string[];
  createdAt: Date;
  schedules: Schedule[];
}

interface ContentQueuePageProps {
  brandId: string;
  items: ContentItem[];
}

const STATUS_COLORS: Record<string, "default" | "warning" | "success" | "danger" | "primary"> = {
  DRAFT: "default",
  PENDING: "warning",
  APPROVED: "success",
  SCHEDULED: "primary",
  PUBLISHED: "success",
  REJECTED: "danger",
};

const PLATFORM_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  TWITTER: Twitter,
  LINKEDIN: Linkedin,
  INSTAGRAM: Instagram,
  FACEBOOK: Facebook,
};

export function ContentQueuePage({ brandId, items: initialItems }: ContentQueuePageProps) {
  const [items, setItems] = useState(initialItems);
  const [selectedTab, setSelectedTab] = useState("all");
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editContent, setEditContent] = useState("");

  const loadItems = useCallback(async () => {
    try {
      const res = await fetch(`/api/content?brandId=${brandId}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (error) {
      console.error("Error loading content:", error);
    }
  }, [brandId]);

  const handleStatusChange = async (itemId: string, status: string) => {
    try {
      await fetch(`/api/content/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await loadItems();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this content?")) return;
    try {
      await fetch(`/api/content/${itemId}`, { method: "DELETE" });
      await loadItems();
    } catch (error) {
      console.error("Error deleting content:", error);
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
      await fetch(`/api/content/${selectedItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });
      onClose();
      await loadItems();
    } catch (error) {
      console.error("Error saving content:", error);
    }
  };

  const filteredItems = items.filter((item) => {
    if (selectedTab === "all") return true;
    if (selectedTab === "pending") return item.status === "PENDING";
    if (selectedTab === "approved") return item.status === "APPROVED" || item.status === "SCHEDULED";
    if (selectedTab === "published") return item.status === "PUBLISHED";
    if (selectedTab === "rejected") return item.status === "REJECTED";
    return true;
  });

  const stats = {
    total: items.length,
    pending: items.filter((i) => i.status === "PENDING").length,
    approved: items.filter((i) => i.status === "APPROVED" || i.status === "SCHEDULED").length,
    published: items.filter((i) => i.status === "PUBLISHED").length,
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Content Queue"
        description="Review, approve, and schedule your AI-generated content."
        actions={
          <div className="flex gap-2">
            <Link href="/dashboard/content/calendar">
              <Button variant="flat" startContent={<Calendar className="w-4 h-4" />}>
                Calendar View
              </Button>
            </Link>
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
            <p className="text-2xl font-bold text-primary">{stats.approved}</p>
            <p className="text-sm text-gray-500">Approved/Scheduled</p>
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
        <CardHeader className="border-b border-gray-200 dark:border-gray-700">
          <Tabs
            selectedKey={selectedTab}
            onSelectionChange={(key) => setSelectedTab(key as string)}
            variant="underlined"
          >
            <Tab key="all" title={`All (${items.length})`} />
            <Tab key="pending" title={`Pending (${stats.pending})`} />
            <Tab key="approved" title={`Approved (${stats.approved})`} />
            <Tab key="published" title={`Published (${stats.published})`} />
          </Tabs>
        </CardHeader>
        <CardBody>
          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="w-16 h-16 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No content yet</h3>
              <p className="text-gray-500 mb-6">
                Generate AI content to start building your queue.
              </p>
              <Link href="/dashboard/content/generate">
                <Button color="primary" startContent={<Plus className="w-4 h-4" />}>
                  Generate Content
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredItems.map((item) => (
                <ContentCard
                  key={item.id}
                  item={item}
                  onApprove={() => handleStatusChange(item.id, "APPROVED")}
                  onReject={() => handleStatusChange(item.id, "REJECTED")}
                  onEdit={() => handleEdit(item)}
                  onDelete={() => handleDelete(item.id)}
                />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Edit Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="2xl">
        <ModalContent>
          <ModalHeader>Edit Content</ModalHeader>
          <ModalBody>
            <Textarea
              value={editContent}
              onValueChange={setEditContent}
              minRows={6}
              maxRows={12}
            />
            {selectedItem?.imageUrls && selectedItem.imageUrls.length > 0 && (
              <div className="flex gap-2 mt-4">
                {selectedItem.imageUrls.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Image ${i + 1}`}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                ))}
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
  onApprove,
  onReject,
  onEdit,
  onDelete,
}: {
  item: ContentItem;
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
      <div className="flex items-start gap-4">
        {/* Content Preview */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Chip size="sm" color={STATUS_COLORS[item.status]} variant="flat">
              {item.status}
            </Chip>
            <Chip size="sm" variant="bordered">
              {item.contentType}
            </Chip>
            {item.aiGenerated && (
              <Chip size="sm" variant="flat" color="secondary" startContent={<Sparkles className="w-3 h-3" />}>
                AI
              </Chip>
            )}
          </div>

          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 mb-3">
            {item.content}
          </p>

          {/* Scheduled Platforms */}
          {item.schedules.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-gray-400" />
              <div className="flex gap-1">
                {item.schedules.map((schedule) => {
                  const Icon = PLATFORM_ICONS[schedule.platform] || Send;
                  return (
                    <div
                      key={schedule.id}
                      className="flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded"
                    >
                      <Icon className="w-3 h-3" />
                      <span>{new Date(schedule.scheduledFor).toLocaleDateString()}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Images */}
          {item.imageUrls && item.imageUrls.length > 0 && (
            <div className="flex gap-2">
              {item.imageUrls.slice(0, 3).map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Image ${i + 1}`}
                  className="w-16 h-16 object-cover rounded-lg"
                />
              ))}
              {item.imageUrls.length > 3 && (
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-sm text-gray-500">
                  +{item.imageUrls.length - 3}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-2">
          {item.status === "PENDING" && (
            <div className="flex gap-2">
              <Button
                size="sm"
                color="success"
                variant="flat"
                startContent={<ThumbsUp className="w-4 h-4" />}
                onPress={onApprove}
              >
                Approve
              </Button>
              <Button
                size="sm"
                color="danger"
                variant="flat"
                startContent={<ThumbsDown className="w-4 h-4" />}
                onPress={onReject}
              >
                Reject
              </Button>
            </div>
          )}

          <Dropdown>
            <DropdownTrigger>
              <Button isIconOnly size="sm" variant="light">
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
