"use client";

import { useState, useCallback } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Textarea,
  Select,
  SelectItem,
  useDisclosure,
  Spinner,
  Tooltip,
} from "@heroui/react";
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
  url: string | null;
  status: string;
  lastProcessedAt: Date | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
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
  const { isOpen, onOpen, onClose } = useDisclosure();
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
          <Button
            color="primary"
            startContent={<Plus className="w-4 h-4" />}
            onPress={onOpen}
          >
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
            <Card key={type.key} isPressable onPress={() => {
              setFormData({ ...formData, type: type.key });
              onOpen();
            }}>
              <CardBody className="flex flex-col items-center text-center py-6">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center mb-3">
                  <Icon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </div>
                <p className="font-medium">{type.label}</p>
                <p className="text-xs text-gray-500">{count} source{count !== 1 ? "s" : ""}</p>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Sources List */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">All Sources</h2>
        </CardHeader>
        <CardBody>
          {sources.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="w-16 h-16 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No context sources yet</h3>
              <p className="text-gray-500 mb-6">
                Add your website, documents, or RSS feeds to train your AI.
              </p>
              <Button color="primary" onPress={onOpen}>
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
                        <Chip
                          size="sm"
                          variant="flat"
                          color={
                            source.status === "ACTIVE" ? "success" :
                            source.status === "PROCESSING" ? "warning" :
                            source.status === "ERROR" ? "danger" : "default"
                          }
                          startContent={
                            source.status === "ACTIVE" ? <CheckCircle2 className="w-3 h-3" /> :
                            source.status === "PROCESSING" ? <Clock className="w-3 h-3" /> :
                            source.status === "ERROR" ? <AlertCircle className="w-3 h-3" /> : undefined
                          }
                        >
                          {source.status}
                        </Chip>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        {source.url && (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:text-brand-500"
                          >
                            {source.url.substring(0, 40)}...
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {source.lastProcessedAt && (
                          <span>
                            Updated {new Date(source.lastProcessedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Tooltip content="Refresh source">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="flat"
                          onPress={() => handleRefresh(source.id)}
                          isLoading={refreshing === source.id}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </Tooltip>
                      <Tooltip content="Delete source">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="flat"
                          color="danger"
                          onPress={() => handleDelete(source.id)}
                          isLoading={deleting === source.id}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </Tooltip>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Add Source Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalContent>
          <ModalHeader>Add Context Source</ModalHeader>
          <ModalBody className="space-y-4">
            <Select
              label="Source Type"
              selectedKeys={[formData.type]}
              onSelectionChange={(keys) => {
                const type = Array.from(keys)[0] as string;
                setFormData({ ...formData, type, url: "", content: "" });
              }}
            >
              {SOURCE_TYPES.map((type) => (
                <SelectItem key={type.key} description={type.description}>
                  {type.label}
                </SelectItem>
              ))}
            </Select>

            <Input
              label="Name"
              placeholder="e.g., Company Website, Blog RSS"
              value={formData.name}
              onValueChange={(v) => setFormData({ ...formData, name: v })}
              isRequired
            />

            {(formData.type === "WEBSITE" || formData.type === "RSS") && (
              <Input
                label="URL"
                placeholder={formData.type === "WEBSITE" ? "https://example.com" : "https://example.com/feed.xml"}
                value={formData.url}
                onValueChange={(v) => setFormData({ ...formData, url: v })}
                isRequired
              />
            )}

            {formData.type === "DOCUMENT" && (
              <Textarea
                label="Content"
                placeholder="Paste your document content here..."
                value={formData.content}
                onValueChange={(v) => setFormData({ ...formData, content: v })}
                minRows={6}
                description="Paste text content directly, or upload a file"
              />
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
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onClose}>
              Cancel
            </Button>
            <Button
              color="primary"
              onPress={handleCreate}
              isLoading={creating}
              isDisabled={
                !formData.name.trim() ||
                ((formData.type === "WEBSITE" || formData.type === "RSS") && !formData.url.trim())
              }
            >
              Add Source
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
