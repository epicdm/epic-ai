"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

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
      setIsLinkOpen(false);
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
    setIsEditOpen(true);
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
      setIsEditOpen(false);
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
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">RAG Knowledge Bases</h3>
          <p className="text-sm text-muted-foreground">
            Link knowledge bases for context retrieval during calls
          </p>
        </div>
        <Button
          onClick={() => setIsLinkOpen(true)}
          disabled={unlinkedKbs.length === 0}
        >
          Link Knowledge Base
        </Button>
      </div>

      {error && (
        <Card className="bg-destructive/10 border border-destructive/30">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {linkedKbs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 rounded-full bg-muted">
                <Database className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">No knowledge bases linked</p>
                <p className="text-sm text-muted-foreground">
                  Link knowledge bases to enable RAG for this agent
                </p>
              </div>
              {unlinkedKbs.length > 0 ? (
                <Button
                  variant="secondary"
                  onClick={() => setIsLinkOpen(true)}
                >
                  Link Your First Knowledge Base
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  asChild
                >
                  <a href="/dashboard/voice/knowledge-bases">
                    Create Knowledge Base First
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {linkedKbs.map((link) => (
            <Card
              key={link.id}
              className={!link.isActive || !link.knowledgeBaseActive ? "opacity-60" : ""}
            >
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <BookOpen className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{link.name}</span>
                        <Badge variant="secondary">
                          Priority: {link.priority}
                        </Badge>
                        {!link.isActive && (
                          <Badge variant="outline">
                            Disabled
                          </Badge>
                        )}
                        {!link.knowledgeBaseActive && (
                          <Badge variant="destructive">
                            KB Inactive
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
                      checked={link.isActive}
                      onCheckedChange={() => handleToggleActive(link)}
                    />
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => handleEditLink(link)}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => handleUnlinkKnowledgeBase(link)}
                    >
                      <Unlink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Link Knowledge Base Dialog */}
      <Dialog open={isLinkOpen} onOpenChange={setIsLinkOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Link Knowledge Base</DialogTitle></DialogHeader>
          <div className="py-4">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Select Knowledge Base</Label>
                <Select
                  value={selectedKbId}
                  onValueChange={setSelectedKbId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a knowledge base to link" />
                  </SelectTrigger>
                  <SelectContent>
                    {unlinkedKbs.map((kb) => (
                      <SelectItem key={kb.id} value={kb.id}>
                        {kb.name} ({kb.documentCount} documents, {kb.chunkCount} chunks)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority (higher = searched first): {linkPriority}</Label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={linkPriority}
                  onChange={(e) => setLinkPriority(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label>Max Results: {linkMaxChunks}</Label>
                <input
                  type="range"
                  min={1}
                  max={20}
                  step={1}
                  value={linkMaxChunks}
                  onChange={(e) => setLinkMaxChunks(Number(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum number of relevant chunks to retrieve
                </p>
              </div>

              <div className="space-y-2">
                <Label>
                  Minimum Relevance Score ({(linkMinScore * 100).toFixed(0)}%)
                </Label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={Math.round(linkMinScore * 100)}
                  onChange={(e) => setLinkMinScore(Number(e.target.value) / 100)}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Only return results above this similarity threshold
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsLinkOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleLinkKnowledgeBase}
              disabled={saving || !selectedKbId}
            >
              Link Knowledge Base
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Link Settings Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Link Settings</DialogTitle></DialogHeader>
          <div className="py-4">
            {editingLink && (
              <div className="space-y-6">
                <div className="p-3 rounded-lg bg-muted">
                  <p className="font-medium">{editingLink.name}</p>
                  <p className="text-sm text-muted-foreground">{editingLink.description}</p>
                </div>

                <div className="space-y-2">
                  <Label>
                    Priority (higher = searched first): {editingLink.priority}
                  </Label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={editingLink.priority}
                    onChange={(e) =>
                      setEditingLink({ ...editingLink, priority: Number(e.target.value) })
                    }
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Max Results: {editingLink.maxChunks}</Label>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    step={1}
                    value={editingLink.maxChunks}
                    onChange={(e) =>
                      setEditingLink({ ...editingLink, maxChunks: Number(e.target.value) })
                    }
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    Minimum Relevance Score ({(editingLink.minScore * 100).toFixed(0)}%)
                  </Label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={Math.round(editingLink.minScore * 100)}
                    onChange={(e) =>
                      setEditingLink({ ...editingLink, minScore: Number(e.target.value) / 100 })
                    }
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={saving}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
