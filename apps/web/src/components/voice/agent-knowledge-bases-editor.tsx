"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Input,
  Select,
  SelectItem,
  Switch,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Chip,
  Slider,
  Progress,
} from "@heroui/react";
import {
  Plus,
  Trash2,
  Settings,
  Database,
  FileText,
  Link,
  Unlink,
  AlertCircle,
  BookOpen,
  Search,
} from "lucide-react";

interface KnowledgeBase {
  id: string;
  name: string;
  description: string | null;
  documentCount: number;
  chunkCount: number;
  isActive: boolean;
}

interface LinkedKnowledgeBase {
  id: string;
  knowledgeBaseId: string;
  name: string;
  description: string | null;
  documentCount: number;
  chunkCount: number;
  priority: number;
  maxChunks: number;
  minScore: number;
  isActive: boolean;
  knowledgeBaseActive: boolean;
}

interface AgentKnowledgeBasesEditorProps {
  agentId: string;
  onKnowledgeBasesChange?: (knowledgeBases: LinkedKnowledgeBase[]) => void;
}

export function AgentKnowledgeBasesEditor({
  agentId,
  onKnowledgeBasesChange,
}: AgentKnowledgeBasesEditorProps) {
  const [linkedKbs, setLinkedKbs] = useState<LinkedKnowledgeBase[]>([]);
  const [availableKbs, setAvailableKbs] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedKbId, setSelectedKbId] = useState<string>("");
  const [editingLink, setEditingLink] = useState<LinkedKnowledgeBase | null>(null);
  const { isOpen: isLinkOpen, onOpen: onLinkOpen, onClose: onLinkClose } = useDisclosure();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();

  // New link settings
  const [linkPriority, setLinkPriority] = useState(0);
  const [linkMaxChunks, setLinkMaxChunks] = useState(5);
  const [linkMinScore, setLinkMinScore] = useState(0.7);

  useEffect(() => {
    fetchLinkedKnowledgeBases();
    fetchAvailableKnowledgeBases();
  }, [agentId]);

  const fetchLinkedKnowledgeBases = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/voice/agents/${agentId}/knowledge-bases`);
      if (!response.ok) throw new Error("Failed to fetch linked knowledge bases");
      const data = await response.json();
      setLinkedKbs(data.knowledgeBases || []);
      onKnowledgeBasesChange?.(data.knowledgeBases || []);
    } catch (err) {
      console.error("Error fetching linked knowledge bases:", err);
      setError("Failed to load linked knowledge bases");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableKnowledgeBases = async () => {
    try {
      const response = await fetch("/api/voice/knowledge-bases");
      if (!response.ok) throw new Error("Failed to fetch knowledge bases");
      const data = await response.json();
      setAvailableKbs(data.knowledgeBases || []);
    } catch (err) {
      console.error("Error fetching available knowledge bases:", err);
    }
  };

  const handleLinkKnowledgeBase = async () => {
    if (!selectedKbId) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/voice/agents/${agentId}/knowledge-bases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          knowledgeBaseId: selectedKbId,
          priority: linkPriority,
          maxChunks: linkMaxChunks,
          minScore: linkMinScore,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to link knowledge base");
      }

      await fetchLinkedKnowledgeBases();
      onLinkClose();
      setSelectedKbId("");
      setLinkPriority(0);
      setLinkMaxChunks(5);
      setLinkMinScore(0.7);
    } catch (err) {
      console.error("Error linking knowledge base:", err);
      setError(err instanceof Error ? err.message : "Failed to link knowledge base");
    } finally {
      setSaving(false);
    }
  };

  const handleUnlinkKnowledgeBase = async (link: LinkedKnowledgeBase) => {
    if (!confirm(`Are you sure you want to unlink "${link.name}"?`)) return;

    try {
      const response = await fetch(
        `/api/voice/agents/${agentId}/knowledge-bases?linkId=${link.id}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Failed to unlink knowledge base");

      const newLinkedKbs = linkedKbs.filter((kb) => kb.id !== link.id);
      setLinkedKbs(newLinkedKbs);
      onKnowledgeBasesChange?.(newLinkedKbs);
    } catch (err) {
      console.error("Error unlinking knowledge base:", err);
      setError("Failed to unlink knowledge base");
    }
  };

  const handleToggleActive = async (link: LinkedKnowledgeBase) => {
    try {
      const response = await fetch(
        `/api/voice/agents/${agentId}/knowledge-bases?linkId=${link.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !link.isActive }),
        }
      );

      if (!response.ok) throw new Error("Failed to update link");

      await fetchLinkedKnowledgeBases();
    } catch (err) {
      console.error("Error toggling link:", err);
      setError("Failed to update link");
    }
  };

  const handleEditLink = (link: LinkedKnowledgeBase) => {
    setEditingLink({ ...link });
    onEditOpen();
  };

  const handleSaveEdit = async () => {
    if (!editingLink) return;

    try {
      setSaving(true);
      const response = await fetch(
        `/api/voice/agents/${agentId}/knowledge-bases?linkId=${editingLink.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            priority: editingLink.priority,
            maxChunks: editingLink.maxChunks,
            minScore: editingLink.minScore,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to update link");

      await fetchLinkedKnowledgeBases();
      onEditClose();
      setEditingLink(null);
    } catch (err) {
      console.error("Error updating link:", err);
      setError("Failed to update link settings");
    } finally {
      setSaving(false);
    }
  };

  const unlinkedKbs = availableKbs.filter(
    (kb) => !linkedKbs.some((link) => link.knowledgeBaseId === kb.id)
  );

  if (loading) {
    return (
      <Card>
        <CardBody>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">RAG Knowledge Bases</h3>
          <p className="text-sm text-default-500">
            Link knowledge bases for context retrieval during calls
          </p>
        </div>
        <Button
          color="primary"
          startContent={<Link className="w-4 h-4" />}
          onPress={onLinkOpen}
          isDisabled={unlinkedKbs.length === 0}
        >
          Link Knowledge Base
        </Button>
      </div>

      {error && (
        <Card className="bg-danger-50 border border-danger-200">
          <CardBody className="py-3">
            <div className="flex items-center gap-2 text-danger">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardBody>
        </Card>
      )}

      {linkedKbs.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 rounded-full bg-default-100">
                <Database className="w-8 h-8 text-default-400" />
              </div>
              <div>
                <p className="font-medium">No knowledge bases linked</p>
                <p className="text-sm text-default-500">
                  Link knowledge bases to enable RAG for this agent
                </p>
              </div>
              {unlinkedKbs.length > 0 ? (
                <Button
                  color="primary"
                  variant="flat"
                  startContent={<Link className="w-4 h-4" />}
                  onPress={onLinkOpen}
                >
                  Link Your First Knowledge Base
                </Button>
              ) : (
                <Button
                  as="a"
                  href="/voice/knowledge-bases"
                  color="primary"
                  variant="flat"
                  startContent={<Plus className="w-4 h-4" />}
                >
                  Create Knowledge Base First
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {linkedKbs.map((link) => (
            <Card
              key={link.id}
              className={!link.isActive || !link.knowledgeBaseActive ? "opacity-60" : ""}
            >
              <CardBody className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary-100">
                      <BookOpen className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{link.name}</span>
                        <Chip size="sm" variant="flat" color="primary">
                          Priority: {link.priority}
                        </Chip>
                        {!link.isActive && (
                          <Chip size="sm" variant="flat" color="default">
                            Disabled
                          </Chip>
                        )}
                        {!link.knowledgeBaseActive && (
                          <Chip size="sm" variant="flat" color="warning">
                            KB Inactive
                          </Chip>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-default-500">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {link.documentCount} docs
                        </span>
                        <span className="flex items-center gap-1">
                          <Search className="w-3 h-3" />
                          {link.chunkCount} chunks
                        </span>
                        <span>Max: {link.maxChunks} results</span>
                        <span>Min score: {(link.minScore * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      size="sm"
                      isSelected={link.isActive}
                      onValueChange={() => handleToggleActive(link)}
                    />
                    <Button
                      size="sm"
                      variant="flat"
                      isIconOnly
                      onPress={() => handleEditLink(link)}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="flat"
                      color="danger"
                      isIconOnly
                      onPress={() => handleUnlinkKnowledgeBase(link)}
                    >
                      <Unlink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Link Knowledge Base Modal */}
      <Modal isOpen={isLinkOpen} onClose={onLinkClose} size="lg">
        <ModalContent>
          <ModalHeader>Link Knowledge Base</ModalHeader>
          <ModalBody>
            <div className="space-y-6">
              <Select
                label="Select Knowledge Base"
                placeholder="Choose a knowledge base to link"
                selectedKeys={selectedKbId ? [selectedKbId] : []}
                onSelectionChange={(keys) => setSelectedKbId(Array.from(keys)[0] as string)}
              >
                {unlinkedKbs.map((kb) => (
                  <SelectItem
                    key={kb.id}
                    description={`${kb.documentCount} documents, ${kb.chunkCount} chunks`}
                  >
                    {kb.name}
                  </SelectItem>
                ))}
              </Select>

              <div className="space-y-2">
                <label className="text-sm font-medium">Priority (higher = searched first)</label>
                <Slider
                  size="sm"
                  step={1}
                  minValue={0}
                  maxValue={100}
                  value={linkPriority}
                  onChange={(value) => setLinkPriority(value as number)}
                  className="max-w-full"
                  showTooltip
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Max Results</label>
                <Slider
                  size="sm"
                  step={1}
                  minValue={1}
                  maxValue={20}
                  value={linkMaxChunks}
                  onChange={(value) => setLinkMaxChunks(value as number)}
                  className="max-w-full"
                  showTooltip
                />
                <p className="text-xs text-default-500">
                  Maximum number of relevant chunks to retrieve
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Minimum Relevance Score ({(linkMinScore * 100).toFixed(0)}%)
                </label>
                <Slider
                  size="sm"
                  step={0.05}
                  minValue={0}
                  maxValue={1}
                  value={linkMinScore}
                  onChange={(value) => setLinkMinScore(value as number)}
                  className="max-w-full"
                  showTooltip
                  formatOptions={{ style: "percent" }}
                />
                <p className="text-xs text-default-500">
                  Only return results above this similarity threshold
                </p>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onLinkClose}>
              Cancel
            </Button>
            <Button
              color="primary"
              startContent={<Link className="w-4 h-4" />}
              onPress={handleLinkKnowledgeBase}
              isLoading={saving}
              isDisabled={!selectedKbId}
            >
              Link Knowledge Base
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Link Settings Modal */}
      <Modal isOpen={isEditOpen} onClose={onEditClose} size="lg">
        <ModalContent>
          <ModalHeader>Edit Link Settings</ModalHeader>
          <ModalBody>
            {editingLink && (
              <div className="space-y-6">
                <div className="p-3 rounded-lg bg-default-100">
                  <p className="font-medium">{editingLink.name}</p>
                  <p className="text-sm text-default-500">{editingLink.description}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Priority (higher = searched first)
                  </label>
                  <Slider
                    size="sm"
                    step={1}
                    minValue={0}
                    maxValue={100}
                    value={editingLink.priority}
                    onChange={(value) =>
                      setEditingLink({ ...editingLink, priority: value as number })
                    }
                    className="max-w-full"
                    showTooltip
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Results</label>
                  <Slider
                    size="sm"
                    step={1}
                    minValue={1}
                    maxValue={20}
                    value={editingLink.maxChunks}
                    onChange={(value) =>
                      setEditingLink({ ...editingLink, maxChunks: value as number })
                    }
                    className="max-w-full"
                    showTooltip
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Minimum Relevance Score ({(editingLink.minScore * 100).toFixed(0)}%)
                  </label>
                  <Slider
                    size="sm"
                    step={0.05}
                    minValue={0}
                    maxValue={1}
                    value={editingLink.minScore}
                    onChange={(value) =>
                      setEditingLink({ ...editingLink, minScore: value as number })
                    }
                    className="max-w-full"
                    showTooltip
                    formatOptions={{ style: "percent" }}
                  />
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onEditClose}>
              Cancel
            </Button>
            <Button
              color="primary"
              onPress={handleSaveEdit}
              isLoading={saving}
            >
              Save Changes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
