/**
 * Knowledge Base Documents API
 * Upload and manage documents in a knowledge base
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma, Prisma, KnowledgeDocType, DocumentStatus } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";
import { z } from "zod";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const addDocumentSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  type: z.enum(["TEXT", "PDF", "URL", "MARKDOWN", "DOCX", "CSV"]).default("TEXT"),
  content: z.string().optional(), // For text/markdown content
  sourceUrl: z.string().url().optional(), // For URL type
  metadata: z.record(z.unknown()).optional(),
});

// GET all documents in a knowledge base
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { id: knowledgeBaseId } = await params;

    // Verify ownership
    const knowledgeBase = await prisma.knowledgeBase.findFirst({
      where: {
        id: knowledgeBaseId,
        organizationId: org.id,
      },
    });

    if (!knowledgeBase) {
      return NextResponse.json({ error: "Knowledge base not found" }, { status: 404 });
    }

    const documents = await prisma.knowledgeDocument.findMany({
      where: {
        knowledgeBaseId,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

// POST add a new document
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { id: knowledgeBaseId } = await params;

    // Verify ownership
    const knowledgeBase = await prisma.knowledgeBase.findFirst({
      where: {
        id: knowledgeBaseId,
        organizationId: org.id,
      },
    });

    if (!knowledgeBase) {
      return NextResponse.json({ error: "Knowledge base not found" }, { status: 404 });
    }

    const body = await request.json();
    const validation = addDocumentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Create the document
    const document = await prisma.knowledgeDocument.create({
      data: {
        knowledgeBaseId,
        name: data.name,
        type: data.type as KnowledgeDocType,
        content: data.content || null,
        sourceUrl: data.sourceUrl || null,
        metadata: (data.metadata || {}) as Prisma.InputJsonValue,
        status: "PENDING" as DocumentStatus,
      },
    });

    // Process the document asynchronously (create chunks and embeddings)
    // For now, process inline for simplicity
    if (data.content || data.type === "TEXT" || data.type === "MARKDOWN") {
      await processTextDocument(document.id, knowledgeBase);
    } else if (data.type === "URL" && data.sourceUrl) {
      await processUrlDocument(document.id, knowledgeBase, data.sourceUrl);
    }

    // Fetch updated document
    const updatedDocument = await prisma.knowledgeDocument.findUnique({
      where: { id: document.id },
    });

    // Update knowledge base stats
    await updateKnowledgeBaseStats(knowledgeBaseId);

    return NextResponse.json({ document: updatedDocument }, { status: 201 });
  } catch (error) {
    console.error("Error adding document:", error);
    return NextResponse.json(
      { error: "Failed to add document" },
      { status: 500 }
    );
  }
}

/**
 * Process a text document: chunk and create embeddings
 */
async function processTextDocument(
  documentId: string,
  knowledgeBase: { id: string; chunkSize: number; chunkOverlap: number; embeddingModel: string }
) {
  const document = await prisma.knowledgeDocument.findUnique({
    where: { id: documentId },
  });

  if (!document || !document.content) {
    await prisma.knowledgeDocument.update({
      where: { id: documentId },
      data: {
        status: "FAILED",
        errorMessage: "No content to process",
      },
    });
    return;
  }

  try {
    // Update status to processing
    await prisma.knowledgeDocument.update({
      where: { id: documentId },
      data: { status: "PROCESSING" },
    });

    // Chunk the content
    const chunks = chunkText(document.content, knowledgeBase.chunkSize, knowledgeBase.chunkOverlap);

    // Generate embeddings for each chunk
    const chunkData = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await generateEmbedding(chunk, knowledgeBase.embeddingModel);

      chunkData.push({
        knowledgeBaseId: knowledgeBase.id,
        documentId: documentId,
        content: chunk,
        chunkIndex: i,
        embedding: embedding ? Buffer.from(new Float32Array(embedding).buffer) : null,
        embeddingModel: knowledgeBase.embeddingModel,
        tokenCount: estimateTokenCount(chunk),
      });
    }

    // Batch insert chunks
    await prisma.knowledgeChunk.createMany({
      data: chunkData,
    });

    // Update document status
    await prisma.knowledgeDocument.update({
      where: { id: documentId },
      data: {
        status: "COMPLETED",
        chunkCount: chunks.length,
        tokenCount: chunkData.reduce((sum, c) => sum + c.tokenCount, 0),
        characterCount: document.content.length,
        processedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Error processing document:", error);
    await prisma.knowledgeDocument.update({
      where: { id: documentId },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}

/**
 * Process a URL document: fetch content, chunk, and create embeddings
 */
async function processUrlDocument(
  documentId: string,
  knowledgeBase: { id: string; chunkSize: number; chunkOverlap: number; embeddingModel: string },
  url: string
) {
  try {
    // Update status to processing
    await prisma.knowledgeDocument.update({
      where: { id: documentId },
      data: { status: "PROCESSING" },
    });

    // Fetch URL content
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; EpicAI/1.0; +https://epic.dm)",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();

    // Basic HTML to text conversion (strip tags)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Update document with extracted content
    await prisma.knowledgeDocument.update({
      where: { id: documentId },
      data: { content: textContent },
    });

    // Now process as text document
    await processTextDocument(documentId, knowledgeBase);
  } catch (error) {
    console.error("Error processing URL:", error);
    await prisma.knowledgeDocument.update({
      where: { id: documentId },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}

/**
 * Split text into chunks with overlap
 */
function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let currentChunk = "";

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());

      // Start new chunk with overlap from previous
      const words = currentChunk.split(" ");
      const overlapWords = Math.ceil(overlap / 5); // Approximate words per overlap
      currentChunk = words.slice(-overlapWords).join(" ") + " " + sentence;
    } else {
      currentChunk += (currentChunk ? " " : "") + sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Generate embedding using OpenAI
 */
async function generateEmbedding(text: string, model: string): Promise<number[] | null> {
  try {
    const response = await openai.embeddings.create({
      model: model,
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    return null;
  }
}

/**
 * Estimate token count (rough approximation)
 */
function estimateTokenCount(text: string): number {
  // Rough estimate: 4 characters per token on average
  return Math.ceil(text.length / 4);
}

/**
 * Update knowledge base stats
 */
async function updateKnowledgeBaseStats(knowledgeBaseId: string) {
  const stats = await prisma.knowledgeDocument.aggregate({
    where: { knowledgeBaseId },
    _count: { id: true },
    _sum: { tokenCount: true },
  });

  const chunkCount = await prisma.knowledgeChunk.count({
    where: { knowledgeBaseId },
  });

  await prisma.knowledgeBase.update({
    where: { id: knowledgeBaseId },
    data: {
      documentCount: stats._count.id,
      chunkCount: chunkCount,
      totalTokens: stats._sum.tokenCount || 0,
      lastSyncedAt: new Date(),
    },
  });
}
