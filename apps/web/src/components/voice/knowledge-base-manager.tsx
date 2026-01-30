"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Trash2,
  Settings,
  Database,
  FileText,
  Globe,
  Upload,
  Search,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  BookOpen,
  ArrowLeft,
} from "lucide-react";

interface KnowledgeBase {
  id: string;
  name: string;
  description: string | null;
  embeddingModel: string;
  chunkSize: number;
  chunkOverlap: number;
  documentCount: number;
  chunkCount: number;
  totalTokens: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface KnowledgeDocument {
  id: string;
  name: string;
  type: string;
  sourceUrl: string | null;
  status: string;
  errorMessage: string | null;
  chunkCount: number;
  tokenCount: number;
  characterCount: number;
  processedAt: string | null;
  createdAt: string;
}

interface SearchResult {
  id: string;
  content: string;
  score: number;
  chunkIndex: number;
  document: {
    id: string;
    name: string;
    type: string;
  };
}

const embeddingModels = [
  { value: "text-embedding-3-small", label: "text-embedding-3-small (Recommended)", dimensions: 1536 },
  { value: "text-embedding-3-large", label: "text-embedding-3-large (Higher quality)", dimensions: 3072 },
  { value: "text-embedding-ada-002", label: "text-embedding-ada-002 (Legacy)", dimensions: 1536 },
];

export function KnowledgeBaseManager() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKb, setSelectedKb] = useState<KnowledgeBase | null>(null);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create KB modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKbName, setNewKbName] = useState("");
  const [newKbDescription, setNewKbDescription] = useState("");
  const [newKbModel, setNewKbModel] = useState("text-embedding-3-small");
  const [newKbChunkSize, setNewKbChunkSize] = useState(1000);
  const [newKbChunkOverlap, setNewKbChunkOverlap] = useState(200);

  // Add document modal
  const [isDocOpen, setIsDocOpen] = useState(false);
  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState<string>("TEXT");
  const [docContent, setDocContent] = useState("");
  const [docUrl, setDocUrl] = useState("");

  // Search modal
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchKnowledgeBases();
  }, []);

  useEffect(() => {
    if (selectedKb) {
      fetchDocuments(selectedKb.id);
    }
  }, [selectedKb]);

  const fetchKnowledgeBases = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/voice/knowledge-bases");
      if (!response.ok) throw new Error("Failed to fetch knowledge bases");
      const data = await response.json();
      setKnowledgeBases(data.knowledgeBases || []);
    } catch (err) {
      console.error("Error fetching knowledge bases:", err);
      setError("Failed to load knowledge bases");
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async (kbId: string) => {
    try {
      const response = await fetch(`/api/voice/knowledge-bases/${kbId}/documents`);
      if (!response.ok) throw new Error("Failed to fetch documents");
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (err) {
      console.error("Error fetching documents:", err);
    }
  };

  const handleCreateKnowledgeBase = async () => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch("/api/voice/knowledge-bases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKbName,
          description: newKbDescription || null,
          embeddingModel: newKbModel,
          chunkSize: newKbChunkSize,
          chunkOverlap: newKbChunkOverlap,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create knowledge base");
      }

      await fetchKnowledgeBases();
      setIsCreateOpen(false);
      resetCreateForm();
    } catch (err) {
      console.error("Error creating knowledge base:", err);
      setError(err instanceof Error ? err.message : "Failed to create knowledge base");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteKnowledgeBase = async (kb: KnowledgeBase) => {
    if (!confirm(`Are you sure you want to delete "${kb.name}"? This will delete all documents and chunks.`)) return;

    try {
      const response = await fetch(`/api/voice/knowledge-bases/${kb.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete knowledge base");

      setKnowledgeBases(knowledgeBases.filter((k) => k.id !== kb.id));
      if (selectedKb?.id === kb.id) {
        setSelectedKb(null);
      }
    } catch (err) {
      console.error("Error deleting knowledge base:", err);
      setError("Failed to delete knowledge base");
    }
  };

  const handleAddDocument = async () => {
    if (!selectedKb) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/voice/knowledge-bases/${selectedKb.id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: docName,
          type: docType,
          content: docType === "TEXT" || docType === "MARKDOWN" ? docContent : undefined,
          sourceUrl: docType === "URL" ? docUrl : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add document");
      }

      await fetchDocuments(selectedKb.id);
      await fetchKnowledgeBases(); // Refresh stats
      setIsDocOpen(false);
      resetDocForm();
    } catch (err) {
      console.error("Error adding document:", err);
      setError(err instanceof Error ? err.message : "Failed to add document");
    } finally {
      setSaving(false);
    }
  };

  const handleSearch = async () => {
    if (!selectedKb || !searchQuery.trim()) return;

    try {
      setSearching(true);
      setError(null);

      const response = await fetch(`/api/voice/knowledge-bases/${selectedKb.id}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          maxResults: 10,
          minScore: 0.5,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Search failed");
      }

      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error("Error searching:", err);
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const resetCreateForm = () => {
    setNewKbName("");
    setNewKbDescription("");
    setNewKbModel("text-embedding-3-small");
    setNewKbChunkSize(1000);
    setNewKbChunkOverlap(200);
  };

  const resetDocForm = () => {
    setDocName("");
    setDocType("TEXT");
    setDocContent("");
    setDocUrl("");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "PROCESSING":
        return <Clock className="w-4 h-4 text-yellow-600 animate-spin" />;
      case "FAILED":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "PENDING":
        return <Clock className="w-4 h-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "COMPLETED":
        return "default";
      case "PROCESSING":
        return "secondary";
      case "FAILED":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getScoreBadgeClass = (score: number): string => {
    if (score >= 0.8) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 0.6) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "";
  };

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

  // Detail view for selected knowledge base
  if (selectedKb) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => setSelectedKb(null)}
          >
            Back
          </Button>
          <div>
            <h2 className="text-xl font-bold">{selectedKb.name}</h2>
            <p className="text-sm text-muted-foreground">{selectedKb.description}</p>
          </div>
        </div>

        {error && (
          <Card className="bg-red-50 border border-red-200">
            <CardContent className="py-3">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">Documents</p>
              <p className="text-2xl font-bold">{selectedKb.documentCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">Chunks</p>
              <p className="text-2xl font-bold">{selectedKb.chunkCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">Total Tokens</p>
              <p className="text-2xl font-bold">{selectedKb.totalTokens.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">Embedding Model</p>
              <p className="text-sm font-medium truncate">{selectedKb.embeddingModel}</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={() => setIsDocOpen(true)}
          >
            Add Document
          </Button>
          <Button
            variant="secondary"
            onClick={() => setIsSearchOpen(true)}
            disabled={selectedKb.chunkCount === 0}
          >
            Test Search
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              fetchDocuments(selectedKb.id);
              fetchKnowledgeBases();
            }}
          >
            Refresh
          </Button>
        </div>

        {/* Documents Table */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold">Documents</h3>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No documents yet</p>
                <p className="text-sm text-muted-foreground">Add documents to build your knowledge base</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NAME</TableHead>
                    <TableHead>TYPE</TableHead>
                    <TableHead>STATUS</TableHead>
                    <TableHead>CHUNKS</TableHead>
                    <TableHead>TOKENS</TableHead>
                    <TableHead>CREATED</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          {doc.sourceUrl && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {doc.sourceUrl}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {doc.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(doc.status)}
                          <Badge variant={getStatusVariant(doc.status)}>
                            {doc.status}
                          </Badge>
                        </div>
                        {doc.errorMessage && (
                          <p className="text-xs text-red-600 mt-1">{doc.errorMessage}</p>
                        )}
                      </TableCell>
                      <TableCell>{doc.chunkCount}</TableCell>
                      <TableCell>{doc.tokenCount.toLocaleString()}</TableCell>
                      <TableCell>
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Add Document Modal */}
        <Dialog open={isDocOpen} onOpenChange={setIsDocOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader><DialogTitle>Add Document</DialogTitle></DialogHeader>
            <div className="py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Document Name</Label>
                  <Input
                    placeholder="e.g., Product FAQ"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Document Type</Label>
                  <Select
                    value={docType}
                    onValueChange={setDocType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TEXT">
                        Plain Text
                      </SelectItem>
                      <SelectItem value="MARKDOWN">
                        Markdown
                      </SelectItem>
                      <SelectItem value="URL">
                        Web URL
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(docType === "TEXT" || docType === "MARKDOWN") && (
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <Textarea
                      placeholder="Paste your content here..."
                      value={docContent}
                      onChange={(e) => setDocContent(e.target.value)}
                      rows={8}
                    />
                  </div>
                )}

                {docType === "URL" && (
                  <div className="space-y-2">
                    <Label>URL</Label>
                    <Input
                      placeholder="https://example.com/page"
                      value={docUrl}
                      onChange={(e) => setDocUrl(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setIsDocOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddDocument}
                disabled={saving || !docName || (docType === "URL" ? !docUrl : !docContent)}
              >
                Add Document
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Search Modal */}
        <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
          <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Test Search</DialogTitle></DialogHeader>
            <div className="py-4">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter a search query..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                  <Button
                    onClick={handleSearch}
                    disabled={searching || !searchQuery.trim()}
                  >
                    Search
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Found {searchResults.length} results
                    </p>
                    {searchResults.map((result, index) => (
                      <Card key={result.id}>
                        <CardContent className="py-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge>
                                #{index + 1}
                              </Badge>
                              <span className="text-sm font-medium">
                                {result.document.name}
                              </span>
                              <Badge variant="secondary">
                                Chunk {result.chunkIndex + 1}
                              </Badge>
                            </div>
                            <Badge
                              variant="outline"
                              className={getScoreBadgeClass(result.score)}
                            >
                              {(result.score * 100).toFixed(1)}% match
                            </Badge>
                          </div>
                          <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-4">
                            {result.content}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {searchResults.length === 0 && searchQuery && !searching && (
                  <p className="text-center text-muted-foreground py-4">
                    No results found for &quot;{searchQuery}&quot;
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setIsSearchOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Knowledge Bases</h2>
          <p className="text-sm text-muted-foreground">
            Manage knowledge bases for RAG-powered voice agents
          </p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
        >
          Create Knowledge Base
        </Button>
      </div>

      {error && (
        <Card className="bg-red-50 border border-red-200">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {knowledgeBases.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 rounded-full bg-muted">
                <Database className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">No knowledge bases yet</p>
                <p className="text-sm text-muted-foreground">
                  Create a knowledge base to start adding documents
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => setIsCreateOpen(true)}
              >
                Create Your First Knowledge Base
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {knowledgeBases.map((kb) => (
            <Card
              key={kb.id}
              className={`cursor-pointer hover:shadow-md transition-shadow ${!kb.isActive ? "opacity-60" : ""}`}
              onClick={() => setSelectedKb(kb)}
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{kb.name}</p>
                      {!kb.isActive && (
                        <Badge variant="outline">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteKnowledgeBase(kb);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {kb.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {kb.description}
                  </p>
                )}

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold">{kb.documentCount}</p>
                    <p className="text-xs text-muted-foreground">Docs</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold">{kb.chunkCount}</p>
                    <p className="text-xs text-muted-foreground">Chunks</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold">{(kb.totalTokens / 1000).toFixed(1)}k</p>
                    <p className="text-xs text-muted-foreground">Tokens</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Knowledge Base Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Create Knowledge Base</DialogTitle></DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  placeholder="e.g., Product Documentation"
                  value={newKbName}
                  onChange={(e) => setNewKbName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="What is this knowledge base for?"
                  value={newKbDescription}
                  onChange={(e) => setNewKbDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Embedding Model</Label>
                <Select
                  value={newKbModel}
                  onValueChange={setNewKbModel}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {embeddingModels.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">The model used to generate embeddings for search</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Chunk Size</Label>
                  <Input
                    type="number"
                    value={String(newKbChunkSize)}
                    onChange={(e) => setNewKbChunkSize(parseInt(e.target.value) || 1000)}
                  />
                  <p className="text-xs text-muted-foreground">Characters per chunk</p>
                </div>
                <div className="space-y-2">
                  <Label>Chunk Overlap</Label>
                  <Input
                    type="number"
                    value={String(newKbChunkOverlap)}
                    onChange={(e) => setNewKbChunkOverlap(parseInt(e.target.value) || 200)}
                  />
                  <p className="text-xs text-muted-foreground">Overlap between chunks</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateKnowledgeBase}
              disabled={saving || !newKbName}
            >
              Create Knowledge Base
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
