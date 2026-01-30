"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import {
  Upload,
  FileText,
  AlertCircle,
} from "lucide-react";
import { useDropzone } from "react-dropzone";

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
  initialDocuments: DocumentUpload[];
}

export function ContextDocumentsPage({
  brandId,
  brandName,
  initialDocuments,
}: Props) {
  const [documents, setDocuments] = useState<DocumentUpload[]>(initialDocuments);
  const [uploadingFiles, setUploadingFiles] = useState(false);

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
        <h1 className="text-3xl font-bold mb-2">Document Uploads</h1>
        <p className="text-default-500">
          Upload PDFs, documents, and other files to add to {brandName}'s context.
        </p>
      </div>

      {/* Documents Card */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Documents</h3>
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
                      doc.status === "ACTIVE" || doc.status === "COMPLETED" ? "bg-green-100 text-green-800" :
                      doc.status === "SYNCING" || doc.status === "PROCESSING" || doc.status === "PENDING" ? "bg-yellow-100 text-yellow-800" :
                      doc.status === "ERROR" || doc.status === "FAILED" ? "bg-red-100 text-red-800" : ""
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
    </div>
  );
}
