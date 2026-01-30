"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
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

  const [isAddSourceOpen, setIsAddSourceOpen] = useState(false);
  const onAddSourceOpen = () => setIsAddSourceOpen(true);
  const onAddSourceClose = () => setIsAddSourceOpen(false);
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
          <CardContent className="flex flex-row items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Database className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-default-500">Total Sources</p>
              <p className="text-2xl font-bold">{stats.totalSources}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-row items-center gap-4">
            <div className="p-3 bg-success/10 rounded-lg">
              <FileText className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-default-500">Content Items</p>
              <p className="text-2xl font-bold">{stats.totalItems}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-row items-center gap-4">
            <div className="p-3 bg-secondary/10 rounded-lg">
              <Upload className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <p className="text-sm text-default-500">Documents</p>
              <p className="text-2xl font-bold">{documents.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="sources">
        <TabsList>
          <TabsTrigger value="sources">
            <Globe className="w-4 h-4 mr-2" />
            Sources
          </TabsTrigger>
          <TabsTrigger value="documents">
            <Upload className="w-4 h-4 mr-2" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="search">
            <Search className="w-4 h-4 mr-2" />
            Search
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sources">
          <Card className="mt-4">
            <CardHeader className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Context Sources</h3>
              <Button onClick={onAddSourceOpen}>
                <Plus className="w-4 h-4 mr-2" />
                Add Source
              </Button>
            </CardHeader>
            <CardContent>
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
                          <Badge variant="secondary" className={
                            getStatusColor(source.status) === "success" ? "bg-green-100 text-green-800" :
                            getStatusColor(source.status) === "warning" ? "bg-yellow-100 text-yellow-800" :
                            getStatusColor(source.status) === "danger" ? "bg-red-100 text-red-800" : ""
                          }>
                            {source.status}
                          </Badge>

                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={syncingSourceId === source.id}
                            onClick={() => handleSyncSource(source.id)}
                          >
                            {syncingSourceId === source.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => handleDeleteSource(source.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card className="mt-4">
            <CardHeader>
              <h3 className="text-lg font-semibold">Document Uploads</h3>
            </CardHeader>
            <CardContent>
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
                    <Loader2 className="w-8 h-8 animate-spin" />
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
                        <Badge variant="secondary" className={
                          getStatusColor(doc.status) === "success" ? "bg-green-100 text-green-800" :
                          getStatusColor(doc.status) === "warning" ? "bg-yellow-100 text-yellow-800" :
                          getStatusColor(doc.status) === "danger" ? "bg-red-100 text-red-800" : ""
                        }>
                          {doc.status}
                        </Badge>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search">
          <ContextSearchTab brandId={brandId} />
        </TabsContent>
      </Tabs>

      {/* Add Source Modal */}
      <Dialog open={isAddSourceOpen} onOpenChange={setIsAddSourceOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Context Source</DialogTitle></DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Source Type</Label>
                <Select value={newSourceType} onValueChange={setNewSourceType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_TYPES.map((type) => (
                      <SelectItem key={type.key} value={type.key}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  placeholder="e.g., Company Website, Industry News"
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                />
              </div>

              {(newSourceType === "WEBSITE" || newSourceType === "RSS_FEED") && (
                <div className="space-y-2">
                  <Label>{newSourceType === "WEBSITE" ? "Website URL" : "Feed URL"}</Label>
                  <Input
                    placeholder={
                      newSourceType === "WEBSITE"
                        ? "https://example.com"
                        : "https://example.com/feed.xml"
                    }
                    value={newSourceUrl}
                    onChange={(e) => setNewSourceUrl(e.target.value)}
                  />
                </div>
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
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={onAddSourceClose}>
              Cancel
            </Button>
            <Button
              onClick={handleAddSource}
              disabled={!newSourceName || (newSourceType !== "MANUAL_NOTE" && !newSourceUrl) || isLoading}
            >
              Add Source
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
      <CardContent>
        <div className="flex gap-2 mb-6">
          <Input
            placeholder="Search your context items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        className="flex-1"
          />
          <Button disabled={isSearching} onClick={handleSearch}>
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
                    <Badge variant="secondary">
                      {item.contentType}
                    </Badge>
                    <Badge variant="default">
                      Score: {item.importance}/10
                    </Badge>
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
      </CardContent>
    </Card>
  );
}
