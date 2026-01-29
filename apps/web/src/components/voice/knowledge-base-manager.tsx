"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Input,
  Textarea,
  Select,
  SelectItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Chip,
  Progress,
  Tabs,
  Tab,
  Divider,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/react";
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
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  const [newKbName, setNewKbName] = useState("");
  const [newKbDescription, setNewKbDescription] = useState("");
  const [newKbModel, setNewKbModel] = useState("text-embedding-3-small");
  const [newKbChunkSize, setNewKbChunkSize] = useState(1000);
  const [newKbChunkOverlap, setNewKbChunkOverlap] = useState(200);

  // Add document modal
  const { isOpen: isDocOpen, onOpen: onDocOpen, onClose: onDocClose } = useDisclosure();
  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState<string>("TEXT");
  const [docContent, setDocContent] = useState("");
  const [docUrl, setDocUrl] = useState("");

  // Search modal
  const { isOpen: isSearchOpen, onOpen: onSearchOpen, onClose: onSearchClose } = useDisclosure();
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
      onCreateClose();
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
      onDocClose();
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
        return <CheckCircle className="w-4 h-4 text-success" />;
      case "PROCESSING":
        return <Clock className="w-4 h-4 text-warning animate-spin" />;
      case "FAILED":
        return <XCircle className="w-4 h-4 text-danger" />;
      case "PENDING":
        return <Clock className="w-4 h-4 text-default-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string): "success" | "warning" | "danger" | "default" => {
    switch (status) {
      case "COMPLETED":
        return "success";
      case "PROCESSING":
        return "warning";
      case "FAILED":
        return "danger";
      default:
        return "default";
    }
  };

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

  // Detail view for selected knowledge base
  if (selectedKb) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="light"
            startContent={<ArrowLeft className="w-4 h-4" />}
            onPress={() => setSelectedKb(null)}
          >
            Back
          </Button>
          <div>
            <h2 className="text-xl font-bold">{selectedKb.name}</h2>
            <p className="text-sm text-default-500">{selectedKb.description}</p>
          </div>
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

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardBody className="py-4">
              <p className="text-sm text-default-500">Documents</p>
              <p className="text-2xl font-bold">{selectedKb.documentCount}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="py-4">
              <p className="text-sm text-default-500">Chunks</p>
              <p className="text-2xl font-bold">{selectedKb.chunkCount}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="py-4">
              <p className="text-sm text-default-500">Total Tokens</p>
              <p className="text-2xl font-bold">{selectedKb.totalTokens.toLocaleString()}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="py-4">
              <p className="text-sm text-default-500">Embedding Model</p>
              <p className="text-sm font-medium truncate">{selectedKb.embeddingModel}</p>
            </CardBody>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            color="primary"
            startContent={<Plus className="w-4 h-4" />}
            onPress={onDocOpen}
          >
            Add Document
          </Button>
          <Button
            variant="flat"
            startContent={<Search className="w-4 h-4" />}
            onPress={onSearchOpen}
            isDisabled={selectedKb.chunkCount === 0}
          >
            Test Search
          </Button>
          <Button
            variant="flat"
            startContent={<RefreshCw className="w-4 h-4" />}
            onPress={() => {
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
          <CardBody>
            {documents.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-default-300 mx-auto mb-3" />
                <p className="text-default-500">No documents yet</p>
                <p className="text-sm text-default-400">Add documents to build your knowledge base</p>
              </div>
            ) : (
              <Table aria-label="Documents table">
                <TableHeader>
                  <TableColumn>NAME</TableColumn>
                  <TableColumn>TYPE</TableColumn>
                  <TableColumn>STATUS</TableColumn>
                  <TableColumn>CHUNKS</TableColumn>
                  <TableColumn>TOKENS</TableColumn>
                  <TableColumn>CREATED</TableColumn>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          {doc.sourceUrl && (
                            <p className="text-xs text-default-400 truncate max-w-[200px]">
                              {doc.sourceUrl}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Chip size="sm" variant="flat">
                          {doc.type}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(doc.status)}
                          <Chip size="sm" variant="flat" color={getStatusColor(doc.status)}>
                            {doc.status}
                          </Chip>
                        </div>
                        {doc.errorMessage && (
                          <p className="text-xs text-danger mt-1">{doc.errorMessage}</p>
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
          </CardBody>
        </Card>

        {/* Add Document Modal */}
        <Modal isOpen={isDocOpen} onClose={onDocClose} size="2xl">
          <ModalContent>
            <ModalHeader>Add Document</ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <Input
                  label="Document Name"
                  placeholder="e.g., Product FAQ"
                  value={docName}
                  onValueChange={setDocName}
                />
                <Select
                  label="Document Type"
                  selectedKeys={[docType]}
                  onSelectionChange={(keys) => setDocType(Array.from(keys)[0] as string)}
                >
                  <SelectItem key="TEXT" startContent={<FileText className="w-4 h-4" />}>
                    Plain Text
                  </SelectItem>
                  <SelectItem key="MARKDOWN" startContent={<FileText className="w-4 h-4" />}>
                    Markdown
                  </SelectItem>
                  <SelectItem key="URL" startContent={<Globe className="w-4 h-4" />}>
                    Web URL
                  </SelectItem>
                </Select>

                {(docType === "TEXT" || docType === "MARKDOWN") && (
                  <Textarea
                    label="Content"
                    placeholder="Paste your content here..."
                    value={docContent}
                    onValueChange={setDocContent}
                    minRows={8}
                    maxRows={20}
                  />
                )}

                {docType === "URL" && (
                  <Input
                    label="URL"
                    placeholder="https://example.com/page"
                    value={docUrl}
                    onValueChange={setDocUrl}
                    startContent={<Globe className="w-4 h-4 text-default-400" />}
                  />
                )}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={onDocClose}>
                Cancel
              </Button>
              <Button
                color="primary"
                onPress={handleAddDocument}
                isLoading={saving}
                isDisabled={!docName || (docType === "URL" ? !docUrl : !docContent)}
              >
                Add Document
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Search Modal */}
        <Modal isOpen={isSearchOpen} onClose={onSearchClose} size="3xl" scrollBehavior="inside">
          <ModalContent>
            <ModalHeader>Test Search</ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter a search query..."
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    startContent={<Search className="w-4 h-4 text-default-400" />}
                  />
                  <Button
                    color="primary"
                    onPress={handleSearch}
                    isLoading={searching}
                    isDisabled={!searchQuery.trim()}
                  >
                    Search
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm text-default-500">
                      Found {searchResults.length} results
                    </p>
                    {searchResults.map((result, index) => (
                      <Card key={result.id}>
                        <CardBody className="py-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Chip size="sm" variant="flat" color="primary">
                                #{index + 1}
                              </Chip>
                              <span className="text-sm font-medium">
                                {result.document.name}
                              </span>
                              <Chip size="sm" variant="flat">
                                Chunk {result.chunkIndex + 1}
                              </Chip>
                            </div>
                            <Chip
                              size="sm"
                              color={result.score >= 0.8 ? "success" : result.score >= 0.6 ? "warning" : "default"}
                            >
                              {(result.score * 100).toFixed(1)}% match
                            </Chip>
                          </div>
                          <p className="text-sm text-default-700 whitespace-pre-wrap line-clamp-4">
                            {result.content}
                          </p>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                )}

                {searchResults.length === 0 && searchQuery && !searching && (
                  <p className="text-center text-default-500 py-4">
                    No results found for "{searchQuery}"
                  </p>
                )}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={onSearchClose}>
                Close
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Knowledge Bases</h2>
          <p className="text-sm text-default-500">
            Manage knowledge bases for RAG-powered voice agents
          </p>
        </div>
        <Button
          color="primary"
          startContent={<Plus className="w-4 h-4" />}
          onPress={onCreateOpen}
        >
          Create Knowledge Base
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

      {knowledgeBases.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 rounded-full bg-default-100">
                <Database className="w-8 h-8 text-default-400" />
              </div>
              <div>
                <p className="font-medium">No knowledge bases yet</p>
                <p className="text-sm text-default-500">
                  Create a knowledge base to start adding documents
                </p>
              </div>
              <Button
                color="primary"
                variant="flat"
                startContent={<Plus className="w-4 h-4" />}
                onPress={onCreateOpen}
              >
                Create Your First Knowledge Base
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {knowledgeBases.map((kb) => (
            <Card
              key={kb.id}
              isPressable
              onPress={() => setSelectedKb(kb)}
              className={!kb.isActive ? "opacity-60" : ""}
            >
              <CardBody className="py-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary-100">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{kb.name}</p>
                      {!kb.isActive && (
                        <Chip size="sm" variant="flat" color="default">
                          Inactive
                        </Chip>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="light"
                    color="danger"
                    isIconOnly
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteKnowledgeBase(kb);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {kb.description && (
                  <p className="text-sm text-default-500 mb-3 line-clamp-2">
                    {kb.description}
                  </p>
                )}

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-default-50">
                    <p className="text-lg font-bold">{kb.documentCount}</p>
                    <p className="text-xs text-default-500">Docs</p>
                  </div>
                  <div className="p-2 rounded-lg bg-default-50">
                    <p className="text-lg font-bold">{kb.chunkCount}</p>
                    <p className="text-xs text-default-500">Chunks</p>
                  </div>
                  <div className="p-2 rounded-lg bg-default-50">
                    <p className="text-lg font-bold">{(kb.totalTokens / 1000).toFixed(1)}k</p>
                    <p className="text-xs text-default-500">Tokens</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Create Knowledge Base Modal */}
      <Modal isOpen={isCreateOpen} onClose={onCreateClose} size="lg">
        <ModalContent>
          <ModalHeader>Create Knowledge Base</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="Name"
                placeholder="e.g., Product Documentation"
                value={newKbName}
                onValueChange={setNewKbName}
              />
              <Textarea
                label="Description"
                placeholder="What is this knowledge base for?"
                value={newKbDescription}
                onValueChange={setNewKbDescription}
              />
              <Select
                label="Embedding Model"
                selectedKeys={[newKbModel]}
                onSelectionChange={(keys) => setNewKbModel(Array.from(keys)[0] as string)}
                description="The model used to generate embeddings for search"
              >
                {embeddingModels.map((model) => (
                  <SelectItem key={model.value} description={`${model.dimensions} dimensions`}>
                    {model.label}
                  </SelectItem>
                ))}
              </Select>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="number"
                  label="Chunk Size"
                  value={String(newKbChunkSize)}
                  onValueChange={(v) => setNewKbChunkSize(parseInt(v) || 1000)}
                  description="Characters per chunk"
                />
                <Input
                  type="number"
                  label="Chunk Overlap"
                  value={String(newKbChunkOverlap)}
                  onValueChange={(v) => setNewKbChunkOverlap(parseInt(v) || 200)}
                  description="Overlap between chunks"
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onCreateClose}>
              Cancel
            </Button>
            <Button
              color="primary"
              onPress={handleCreateKnowledgeBase}
              isLoading={saving}
              isDisabled={!newKbName}
            >
              Create Knowledge Base
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
