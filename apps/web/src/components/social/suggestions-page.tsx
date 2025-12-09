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
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Checkbox,
  Select,
  SelectItem,
  Tabs,
  Tab,
  useDisclosure,
  addToast,
} from "@heroui/react";
import { PageHeader } from "@/components/layout/page-header";
import {
  Sparkles,
  Send,
  X,
  Edit3,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings,
  Lightbulb,
} from "lucide-react";
import Link from "next/link";

interface Suggestion {
  id: string;
  content: string;
  imageUrl?: string;
  triggerType: string;
  triggerData?: Record<string, unknown>;
  suggestedPlatforms: string[];
  status: "PENDING" | "APPROVED" | "POSTED" | "DISMISSED";
  postedAt?: string;
  postPlatforms?: string[];
  dismissedAt?: string;
  dismissReason?: string;
  createdAt: string;
}

interface Integration {
  id: string;
  name: string;
  identifier: string;
  picture?: string;
  disabled: boolean;
}

const TRIGGER_LABELS: Record<string, string> = {
  LEAD_CONVERTED: "New Customer",
  FIVE_STAR_CALL: "Great Call",
  WEEKLY_CONTENT: "Weekly Content",
  MANUAL: "Manual",
};

const PLATFORMS: Record<string, { name: string; color: string }> = {
  x: { name: "X", color: "bg-black" },
  twitter: { name: "X", color: "bg-black" },
  linkedin: { name: "LinkedIn", color: "bg-blue-600" },
  facebook: { name: "Facebook", color: "bg-blue-500" },
  instagram: { name: "Instagram", color: "bg-pink-500" },
};

export function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState("pending");
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [editedContent, setEditedContent] = useState("");
  const [posting, setPosting] = useState(false);

  const postModal = useDisclosure();
  const editModal = useDisclosure();

  const fetchSuggestions = useCallback(async () => {
    try {
      const status = selectedTab === "all" ? "" : selectedTab.toUpperCase();
      const url = `/api/social/suggestions${status ? `?status=${status}` : ""}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
    }
  }, [selectedTab]);

  const fetchIntegrations = useCallback(async () => {
    try {
      const response = await fetch("/api/social/integrations");
      if (response.ok) {
        const data = await response.json();
        setIntegrations(data.integrations || []);
      }
    } catch (error) {
      console.error("Failed to fetch integrations:", error);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchSuggestions(), fetchIntegrations()]);
      setLoading(false);
    };
    load();
  }, [fetchSuggestions, fetchIntegrations]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSuggestions();
    setRefreshing(false);
  };

  const openPostModal = (suggestion: Suggestion) => {
    setSelectedSuggestion(suggestion);
    setSelectedPlatforms(suggestion.suggestedPlatforms);
    postModal.onOpen();
  };

  const openEditModal = (suggestion: Suggestion) => {
    setSelectedSuggestion(suggestion);
    setEditedContent(suggestion.content);
    editModal.onOpen();
  };

  const handlePost = async () => {
    if (!selectedSuggestion || selectedPlatforms.length === 0) return;

    setPosting(true);
    try {
      const response = await fetch(`/api/social/suggestions/${selectedSuggestion.id}/post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platforms: selectedPlatforms,
          scheduleType: "now",
        }),
      });

      if (response.ok) {
        addToast({ title: "Posted successfully!", color: "success" });
        postModal.onClose();
        await fetchSuggestions();
      } else {
        const error = await response.json();
        addToast({ title: error.error || "Failed to post", color: "danger" });
      }
    } catch (error) {
      console.error("Failed to post:", error);
      addToast({ title: "Failed to post", color: "danger" });
    } finally {
      setPosting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedSuggestion) return;

    try {
      const response = await fetch(`/api/social/suggestions/${selectedSuggestion.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editedContent }),
      });

      if (response.ok) {
        addToast({ title: "Suggestion updated", color: "success" });
        editModal.onClose();
        await fetchSuggestions();
      } else {
        addToast({ title: "Failed to update", color: "danger" });
      }
    } catch (error) {
      console.error("Failed to update:", error);
      addToast({ title: "Failed to update", color: "danger" });
    }
  };

  const handleDismiss = async (suggestion: Suggestion) => {
    try {
      const response = await fetch(`/api/social/suggestions/${suggestion.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DISMISSED" }),
      });

      if (response.ok) {
        addToast({ title: "Suggestion dismissed", color: "default" });
        await fetchSuggestions();
      }
    } catch (error) {
      console.error("Failed to dismiss:", error);
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Chip color="warning" variant="flat" size="sm">Pending Review</Chip>;
      case "APPROVED":
        return <Chip color="primary" variant="flat" size="sm">Approved</Chip>;
      case "POSTED":
        return <Chip color="success" variant="flat" size="sm">Posted</Chip>;
      case "DISMISSED":
        return <Chip color="default" variant="flat" size="sm">Dismissed</Chip>;
      default:
        return null;
    }
  };

  const availablePlatforms = integrations
    .filter((int) => !int.disabled)
    .map((int) => int.identifier)
    .filter((v, i, a) => a.indexOf(v) === i);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Suggestions"
        description="AI-generated social media content based on your business activity"
      />

      <div className="flex justify-between items-center">
        <Tabs
          selectedKey={selectedTab}
          onSelectionChange={(key) => setSelectedTab(key as string)}
          variant="underlined"
        >
          <Tab key="pending" title="Pending" />
          <Tab key="posted" title="Posted" />
          <Tab key="dismissed" title="Dismissed" />
          <Tab key="all" title="All" />
        </Tabs>

        <div className="flex gap-2">
          <Button
            variant="flat"
            startContent={<RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />}
            onPress={handleRefresh}
            isDisabled={refreshing}
          >
            Refresh
          </Button>
          <Button
            as={Link}
            href="/dashboard/social/settings"
            variant="flat"
            startContent={<Settings className="w-4 h-4" />}
          >
            Autopilot Settings
          </Button>
        </div>
      </div>

      {suggestions.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <Lightbulb className="w-12 h-12 mx-auto text-default-300 mb-4" />
            <h3 className="text-lg font-medium mb-2">No suggestions yet</h3>
            <p className="text-default-500 mb-4">
              Suggestions are generated automatically when leads convert or calls are completed.
            </p>
            <Button
              as={Link}
              href="/dashboard/social/settings"
              color="primary"
              variant="flat"
            >
              Configure Autopilot
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4">
          {suggestions.map((suggestion) => (
            <Card key={suggestion.id}>
              <CardHeader className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Chip size="sm" variant="flat" color="secondary">
                    {TRIGGER_LABELS[suggestion.triggerType] || suggestion.triggerType}
                  </Chip>
                  {getStatusChip(suggestion.status)}
                  {suggestion.suggestedPlatforms.map((platform) => (
                    <Chip
                      key={platform}
                      size="sm"
                      className={`text-white ${PLATFORMS[platform]?.color || "bg-gray-500"}`}
                    >
                      {PLATFORMS[platform]?.name || platform}
                    </Chip>
                  ))}
                </div>
                <span className="text-sm text-default-400">
                  {new Date(suggestion.createdAt).toLocaleDateString()}
                </span>
              </CardHeader>
              <CardBody className="pt-0">
                <p className="text-default-700 whitespace-pre-wrap mb-4">
                  {suggestion.content}
                </p>

                {suggestion.status === "POSTED" && suggestion.postedAt && (
                  <p className="text-sm text-success flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Posted on {new Date(suggestion.postedAt).toLocaleDateString()}
                    {suggestion.postPlatforms && ` to ${suggestion.postPlatforms.join(", ")}`}
                  </p>
                )}

                {suggestion.status === "PENDING" && (
                  <div className="flex gap-2 mt-2">
                    <Button
                      color="primary"
                      startContent={<Send className="w-4 h-4" />}
                      onPress={() => openPostModal(suggestion)}
                      isDisabled={availablePlatforms.length === 0}
                    >
                      Post Now
                    </Button>
                    <Button
                      variant="flat"
                      startContent={<Edit3 className="w-4 h-4" />}
                      onPress={() => openEditModal(suggestion)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="flat"
                      color="danger"
                      startContent={<XCircle className="w-4 h-4" />}
                      onPress={() => handleDismiss(suggestion)}
                    >
                      Dismiss
                    </Button>
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Post Modal */}
      <Modal isOpen={postModal.isOpen} onClose={postModal.onClose} size="lg">
        <ModalContent>
          <ModalHeader>Post to Social Media</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-default-500 mb-2">Content Preview:</p>
                <div className="p-3 bg-default-100 rounded-lg">
                  <p className="whitespace-pre-wrap">{selectedSuggestion?.content}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-default-500 mb-2">Select platforms:</p>
                <div className="flex flex-wrap gap-2">
                  {availablePlatforms.map((platform) => (
                    <Checkbox
                      key={platform}
                      isSelected={selectedPlatforms.includes(platform)}
                      onValueChange={(checked) => {
                        if (checked) {
                          setSelectedPlatforms([...selectedPlatforms, platform]);
                        } else {
                          setSelectedPlatforms(selectedPlatforms.filter((p) => p !== platform));
                        }
                      }}
                    >
                      {PLATFORMS[platform]?.name || platform}
                    </Checkbox>
                  ))}
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={postModal.onClose}>
              Cancel
            </Button>
            <Button
              color="primary"
              onPress={handlePost}
              isLoading={posting}
              isDisabled={selectedPlatforms.length === 0}
              startContent={!posting && <Send className="w-4 h-4" />}
            >
              Post Now
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={editModal.isOpen} onClose={editModal.onClose} size="lg">
        <ModalContent>
          <ModalHeader>Edit Suggestion</ModalHeader>
          <ModalBody>
            <Textarea
              label="Content"
              value={editedContent}
              onValueChange={setEditedContent}
              minRows={4}
              maxRows={10}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={editModal.onClose}>
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
