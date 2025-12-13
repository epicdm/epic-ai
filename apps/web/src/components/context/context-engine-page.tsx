"use client";

import { useState, useCallback } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Tabs,
  Tab,
  Chip,
  Progress,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Select,
  SelectItem,
  useDisclosure,
  Spinner,
} from "@heroui/react";
import {
  Globe,
  Rss,
  FileText,
  Upload,
  RefreshCw,
  Plus,
  Trash2,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  Search,
} from "lucide-react";
import { useDropzone } from "react-dropzone";

interface ContextSource {
  id: string;
  type: string;
  name: string;
  status: string;
  lastSync: Date | null;
  syncError: string | null;
  itemCount: number;
  createdAt: Date;
}

interface DocumentUpload {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  status: string;
  errorMessage: string | null;
  processedAt: Date | null;
  createdAt: Date;
}

interface Props {
  brandId: string;
  brandName: string;
  initialSources: ContextSource[];
  initialDocuments: DocumentUpload[];
  stats: {
    totalSources: number;
    totalItems: number;
  };
}

const SOURCE_TYPES = [
  { key: "WEBSITE", label: "Website", icon: Globe, description: "Scrape your company website" },
  { key: "RSS_FEED", label: "RSS Feed", icon: Rss, description: "Subscribe to news feeds" },
  { key: "MANUAL_NOTE", label: "Manual Note", icon: FileText, description: "Add custom content" },
];

export function ContextEnginePage({
  brandId,
  brandName,
  initialSources,
  initialDocuments,
  stats,
}: Props) {
  const [sources, setSources] = useState<ContextSource[]>(initialSources);
  const [documents, setDocuments] = useState<DocumentUpload[]>(initialDocuments);
  const [isLoading, setIsLoading] = useState(false);
  const [syncingSourceId, setSyncingSourceId] = useState<string | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const { isOpen: isAddSourceOpen, onOpen: onAddSourceOpen, onClose: onAddSourceClose } = useDisclosure();
  const [newSourceType, setNewSourceType] = useState<string>("WEBSITE");
  const [newSourceName, setNewSourceName] = useState("");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newSourceContent, setNewSourceContent] = useState("");

  // Refresh sources from server
  const refreshSources = async () => {
    try {
      const res = await fetch(`/api/context/sources?brandId=${brandId}`);
      if (res.ok) {
        const data = await res.json();
        setSources(data.sources);
      }
    } catch (error) {
      console.error("Failed to refresh sources:", error);
    }
  };

  // Refresh documents from server
  const refreshDocuments = async () => {
    try {
      const res = await fetch(`/api/context/documents?brandId=${brandId}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error("Failed to refresh documents:", error);
    }
  };

  // Add new source
  const handleAddSource = async () => {
    setIsLoading(true);
    try {
      const config: Record<string, unknown> = {};

      if (newSourceType === "WEBSITE") {
        config.url = newSourceUrl;
        config.maxPages = 10;
        config.includeSubpages = true;
      } else if (newSourceType === "RSS_FEED") {
        config.feedUrl = newSourceUrl;
        config.maxItems = 20;
      } else if (newSourceType === "MANUAL_NOTE") {
        config.title = newSourceName;
        config.content = newSourceContent;
      }

      const res = await fetch("/api/context/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          type: newSourceType,
          name: newSourceName,
          config,
        }),
      });

      if (res.ok) {
        await refreshSources();
        onAddSourceClose();
        setNewSourceName("");
        setNewSourceUrl("");
        setNewSourceContent("");
      }
    } catch (error) {
      console.error("Failed to add source:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Sync a source
  const handleSyncSource = async (sourceId: string) => {
    setSyncingSourceId(sourceId);
    try {
      const res = await fetch(`/api/context/sources/${sourceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      });

      if (res.ok) {
        await refreshSources();
      }
    } catch (error) {
      console.error("Failed to sync source:", error);
    } finally {
      setSyncingSourceId(null);
    }
  };

  // Delete a source
  const handleDeleteSource = async (sourceId: string) => {
    if (!confirm("Are you sure you want to delete this source and all its content?")) {
      return;
    }

    try {
      const res = await fetch(`/api/context/sources/${sourceId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setSources(sources.filter((s) => s.id !== sourceId));
      }
    } catch (error) {
      console.error("Failed to delete source:", error);
    }
  };

  // Handle file upload
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploadingFiles(true);

    for (const file of acceptedFiles) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("brandId", brandId);

      try {
        const res = await fetch("/api/context/documents", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          await refreshDocuments();
        }
      } catch (error) {
        console.error("Failed to upload file:", error);
      }
    }

    setUploadingFiles(false);
  }, [brandId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
      "text/markdown": [".md"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  // Get icon for source type
  const getSourceIcon = (type: string) => {
    switch (type) {
      case "WEBSITE":
      case "COMPETITOR":
        return Globe;
      case "RSS_FEED":
      case "NEWS_SEARCH":
        return Rss;
      case "PDF_UPLOAD":
        return FileText;
      default:
        return Database;
    }
  };

  // Get status color
  const getStatusColor = (status: string): "success" | "warning" | "danger" | "default" => {
    switch (status) {
      case "ACTIVE":
      case "COMPLETED":
        return "success";
      case "SYNCING":
      case "PROCESSING":
      case "PENDING":
        return "warning";
      case "ERROR":
      case "FAILED":
        return "danger";
      default:
        return "default";
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="container mx-auto max-w-6xl p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Context Engine</h1>
        <p className="text-default-500">
          Feed your AI with company knowledge from websites, documents, and RSS feeds.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Database className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-default-500">Total Sources</p>
              <p className="text-2xl font-bold">{stats.totalSources}</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 bg-success/10 rounded-lg">
              <FileText className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-default-500">Content Items</p>
              <p className="text-2xl font-bold">{stats.totalItems}</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 bg-secondary/10 rounded-lg">
              <Upload className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <p className="text-sm text-default-500">Documents</p>
              <p className="text-2xl font-bold">{documents.length}</p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs aria-label="Context Engine tabs" size="lg" color="primary">
        {/* Sources Tab */}
        <Tab
          key="sources"
          title={
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <span>Sources</span>
            </div>
          }
        >
          <Card className="mt-4">
            <CardHeader className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Context Sources</h3>
              <Button
                color="primary"
                startContent={<Plus className="w-4 h-4" />}
                onPress={onAddSourceOpen}
              >
                Add Source
              </Button>
            </CardHeader>
            <CardBody>
              {sources.length === 0 ? (
                <div className="text-center py-8 text-default-500">
                  <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No context sources yet</p>
                  <p className="text-sm">Add a website, RSS feed, or manual note to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sources.map((source) => {
                    const Icon = getSourceIcon(source.type);
                    return (
                      <div
                        key={source.id}
                        className="flex items-center justify-between p-4 border border-default-200 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-default-100 rounded-lg">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium">{source.name}</p>
                            <div className="flex items-center gap-2 text-sm text-default-500">
                              <span>{source.type.replace("_", " ")}</span>
                              <span>•</span>
                              <span>{source.itemCount} items</span>
                              {source.lastSync && (
                                <>
                                  <span>•</span>
                                  <span>
                                    Last sync: {new Date(source.lastSync).toLocaleDateString()}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Chip color={getStatusColor(source.status)} size="sm" variant="flat">
                            {source.status}
                          </Chip>

                          <Button
                            isIconOnly
                            variant="light"
                            size="sm"
                            isLoading={syncingSourceId === source.id}
                            onPress={() => handleSyncSource(source.id)}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>

                          <Button
                            isIconOnly
                            variant="light"
                            size="sm"
                            color="danger"
                            onPress={() => handleDeleteSource(source.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </Tab>

        {/* Documents Tab */}
        <Tab
          key="documents"
          title={
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              <span>Documents</span>
            </div>
          }
        >
          <Card className="mt-4">
            <CardHeader>
              <h3 className="text-lg font-semibold">Document Uploads</h3>
            </CardHeader>
            <CardBody>
              {/* Upload Zone */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors mb-6 ${
                  isDragActive
                    ? "border-primary bg-primary/10"
                    : "border-default-300 hover:border-primary"
                }`}
              >
                <input {...getInputProps()} />
                {uploadingFiles ? (
                  <div className="flex flex-col items-center">
                    <Spinner size="lg" />
                    <p className="mt-2">Uploading...</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12 mx-auto mb-4 text-default-400" />
                    <p className="font-medium">
                      {isDragActive
                        ? "Drop files here"
                        : "Drag & drop files, or click to browse"}
                    </p>
                    <p className="text-sm text-default-500 mt-1">
                      Supports PDF, TXT, MD, DOCX (max 10MB)
                    </p>
                  </>
                )}
              </div>

              {/* Documents List */}
              {documents.length === 0 ? (
                <div className="text-center py-4 text-default-500">
                  <p>No documents uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 border border-default-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-default-500" />
                        <div>
                          <p className="font-medium">{doc.fileName}</p>
                          <p className="text-sm text-default-500">
                            {formatFileSize(doc.fileSize)} •{" "}
                            {new Date(doc.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Chip color={getStatusColor(doc.status)} size="sm" variant="flat">
                          {doc.status}
                        </Chip>
                        {doc.errorMessage && (
                          <span className="text-sm text-danger" title={doc.errorMessage}>
                            <AlertCircle className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </Tab>

        {/* Search Tab */}
        <Tab
          key="search"
          title={
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              <span>Search</span>
            </div>
          }
        >
          <ContextSearchTab brandId={brandId} />
        </Tab>
      </Tabs>

      {/* Add Source Modal */}
      <Modal isOpen={isAddSourceOpen} onClose={onAddSourceClose} size="lg">
        <ModalContent>
          <ModalHeader>Add Context Source</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Select
                label="Source Type"
                selectedKeys={[newSourceType]}
                onSelectionChange={(keys) => setNewSourceType(Array.from(keys)[0] as string)}
              >
                {SOURCE_TYPES.map((type) => (
                  <SelectItem key={type.key} textValue={type.label}>
                    <div className="flex items-center gap-2">
                      <type.icon className="w-4 h-4" />
                      <div>
                        <p className="font-medium">{type.label}</p>
                        <p className="text-sm text-default-500">{type.description}</p>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </Select>

              <Input
                label="Name"
                placeholder="e.g., Company Website, Industry News"
                value={newSourceName}
                onChange={(e) => setNewSourceName(e.target.value)}
              />

              {(newSourceType === "WEBSITE" || newSourceType === "RSS_FEED") && (
                <Input
                  label={newSourceType === "WEBSITE" ? "Website URL" : "Feed URL"}
                  placeholder={
                    newSourceType === "WEBSITE"
                      ? "https://example.com"
                      : "https://example.com/feed.xml"
                  }
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                />
              )}

              {newSourceType === "MANUAL_NOTE" && (
                <textarea
                  className="w-full p-3 border border-default-300 rounded-lg min-h-[150px]"
                  placeholder="Enter your content here..."
                  value={newSourceContent}
                  onChange={(e) => setNewSourceContent(e.target.value)}
                />
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onAddSourceClose}>
              Cancel
            </Button>
            <Button
              color="primary"
              isLoading={isLoading}
              onPress={handleAddSource}
              isDisabled={!newSourceName || (newSourceType !== "MANUAL_NOTE" && !newSourceUrl)}
            >
              Add Source
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

// Search Tab Component
function ContextSearchTab({ brandId }: { brandId: string }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{
    id: string;
    title: string | null;
    summary: string | null;
    contentType: string;
    importance: number;
  }>>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/context/items?brandId=${brandId}&search=${encodeURIComponent(searchQuery)}&limit=20`
      );

      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.items);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <h3 className="text-lg font-semibold">Search Context</h3>
      </CardHeader>
      <CardBody>
        <div className="flex gap-2 mb-6">
          <Input
            placeholder="Search your context items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            startContent={<Search className="w-4 h-4 text-default-400" />}
            className="flex-1"
          />
          <Button color="primary" isLoading={isSearching} onPress={handleSearch}>
            Search
          </Button>
        </div>

        {searchResults.length > 0 ? (
          <div className="space-y-3">
            {searchResults.map((item) => (
              <div
                key={item.id}
                className="p-4 border border-default-200 rounded-lg"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium">{item.title || "Untitled"}</h4>
                  <div className="flex items-center gap-2">
                    <Chip size="sm" variant="flat">
                      {item.contentType}
                    </Chip>
                    <Chip size="sm" variant="flat" color="primary">
                      Score: {item.importance}/10
                    </Chip>
                  </div>
                </div>
                <p className="text-sm text-default-600 line-clamp-2">
                  {item.summary || "No summary available"}
                </p>
              </div>
            ))}
          </div>
        ) : searchQuery && !isSearching ? (
          <div className="text-center py-8 text-default-500">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No results found for "{searchQuery}"</p>
          </div>
        ) : (
          <div className="text-center py-8 text-default-500">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Enter a search term to find relevant context</p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
