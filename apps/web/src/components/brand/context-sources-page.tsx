"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import {
  Plus,
  Globe,
  FileText,
  Rss,
  Mail,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
} from "lucide-react";

interface ContextSource {
  id: string;
  type: string;
  name: string;
  config: { url?: string } & Record<string, unknown>;
  status: string;
  lastSync: Date | null;
  syncError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ContextSourcesPageProps {
  brandId: string;
  sources: ContextSource[];
}

const SOURCE_TYPES = [
  { key: "WEBSITE", label: "Website", icon: Globe, description: "Scrape your website content" },
  { key: "RSS", label: "RSS Feed", icon: Rss, description: "Import from RSS/Atom feeds" },
  { key: "DOCUMENT", label: "Document", icon: FileText, description: "Upload PDFs, docs, or text files" },
  { key: "EMAIL", label: "Email", icon: Mail, description: "Forward emails to ingest" },
];

export function ContextSourcesPage({ brandId, sources: initialSources }: ContextSourcesPageProps) {
  const [sources, setSources] = useState(initialSources);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    type: "WEBSITE",
    name: "",
    url: "",
    content: "",
  });

  const loadSources = useCallback(async () => {
    try {
      const res = await fetch(`/api/brands/${brandId}/context`);
      if (res.ok) {
        const data = await res.json();
        setSources(data.sources || []);
      }
    } catch (error) {
      console.error("Error loading sources:", error);
    }
  }, [brandId]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch(`/api/brands/${brandId}/context`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        onClose();
        setFormData({ type: "WEBSITE", name: "", url: "", content: "" });
        loadSources();
      }
    } catch (error) {
      console.error("Error creating source:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleRefresh = async (sourceId: string) => {
    setRefreshing(sourceId);
    try {
      await fetch(`/api/brands/${brandId}/context/${sourceId}/refresh`, {
        method: "POST",
      });
      await loadSources();
    } catch (error) {
      console.error("Error refreshing source:", error);
    } finally {
      setRefreshing(null);
    }
  };

  const handleDelete = async (sourceId: string) => {
    if (!confirm("Are you sure you want to delete this context source?")) return;
    setDeleting(sourceId);
    try {
      await fetch(`/api/brands/${brandId}/context/${sourceId}`, {
        method: "DELETE",
      });
      await loadSources();
    } catch (error) {
      console.error("Error deleting source:", error);
    } finally {
      setDeleting(null);
    }
  };

  const getSourceIcon = (type: string) => {
    const sourceType = SOURCE_TYPES.find((t) => t.key === type);
    return sourceType?.icon || Globe;
  };

  const selectedSourceType = SOURCE_TYPES.find((t) => t.key === formData.type);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Context Sources"
        description="Add sources for your AI to learn from and reference when generating content."
        actions={
          <Button onClick={onOpen}>
            <Plus className="w-4 h-4 mr-2" />
            Add Source
          </Button>
        }
      />

      {/* Source Types Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {SOURCE_TYPES.map((type) => {
          const Icon = type.icon;
          const count = sources.filter((s) => s.type === type.key).length;
          return (
            <Card key={type.key} onClick={() => {
              setFormData({ ...formData, type: type.key });
              onOpen();
            }}>
              <CardContent className="flex flex-col items-center text-center py-6">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center mb-3">
                  <Icon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </div>
                <p className="font-medium">{type.label}</p>
                <p className="text-xs text-gray-500">{count} source{count !== 1 ? "s" : ""}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sources List */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">All Sources</h2>
        </CardHeader>
        <CardContent>
          {sources.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="w-16 h-16 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No context sources yet</h3>
              <p className="text-gray-500 mb-6">
                Add your website, documents, or RSS feeds to train your AI.
              </p>
              <Button  onClick={onOpen}>
                Add Your First Source
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {sources.map((source) => {
                const Icon = getSourceIcon(source.type);
                return (
                  <div
                    key={source.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{source.name}</p>
                        <Badge
                          variant={
                            source.status === "ACTIVE" ? "default" :
                            source.status === "PROCESSING" ? "secondary" :
                            source.status === "ERROR" ? "destructive" : "outline"
                          }
                          className="flex items-center gap-1"
                        >
                          {source.status === "ACTIVE" && <CheckCircle2 className="w-3 h-3" />}
                          {source.status === "PROCESSING" && <Clock className="w-3 h-3" />}
                          {source.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        {source.config?.url && (
                          <a
                            href={source.config.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:text-brand-500"
                          >
                            {source.config.url.substring(0, 40)}...
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {source.lastSync && (
                          <span>
                            Updated {new Date(source.lastSync).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="secondary"
                              onClick={() => handleRefresh(source.id)}
                              disabled={refreshing === source.id}
                            >
                              {refreshing === source.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Refresh source</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="destructive"
                              onClick={() => handleDelete(source.id)}
                              disabled={deleting === source.id}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete source</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Source Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Context Source</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Source Type</Label>
              <Select value={formData.type} onValueChange={(type) => setFormData({ ...formData, type, url: "", content: "" })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_TYPES.map((type) => (
                    <SelectItem key={type.key} value={type.key}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="e.g., Company Website, Blog RSS"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {(formData.type === "WEBSITE" || formData.type === "RSS") && (
              <div className="space-y-2">
                <Label>URL</Label>
                <Input
                  placeholder={formData.type === "WEBSITE" ? "https://example.com" : "https://example.com/feed.xml"}
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  required
                />
              </div>
            )}

            {formData.type === "DOCUMENT" && (
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  placeholder="Paste your document content here..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={6}
                />
                <p className="text-xs text-gray-500">Paste text content directly, or upload a file</p>
              </div>
            )}

            {formData.type === "EMAIL" && (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Forward emails to this address to add them as context:
                </p>
                <code className="text-sm bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                  context-{brandId.slice(0, 8)}@ingest.epic.dm
                </code>
              </div>
            )}

            {selectedSourceType && (
              <p className="text-sm text-gray-500">
                {selectedSourceType.description}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                creating ||
                !formData.name.trim() ||
                ((formData.type === "WEBSITE" || formData.type === "RSS") && !formData.url.trim())
              }
            >
              {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Source
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
