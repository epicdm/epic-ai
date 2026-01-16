/**
 * Knowledge Base Search API
 * Search for relevant chunks using vector similarity
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";
import { z } from "zod";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const searchSchema = z.object({
  query: z.string().min(1, "Query is required").max(1000),
  maxResults: z.number().int().min(1).max(20).default(5),
  minScore: z.number().min(0).max(1).default(0.7),
});

// POST search knowledge base
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
        isActive: true,
      },
    });

    if (!knowledgeBase) {
      return NextResponse.json({ error: "Knowledge base not found" }, { status: 404 });
    }

    const body = await request.json();
    const validation = searchSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { query, maxResults, minScore } = validation.data;

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query, knowledgeBase.embeddingModel);

    if (!queryEmbedding) {
      return NextResponse.json(
        { error: "Failed to generate query embedding" },
        { status: 500 }
      );
    }

    // Get all chunks with embeddings
    const chunks = await prisma.knowledgeChunk.findMany({
      where: {
        knowledgeBaseId,
        embedding: { not: null },
      },
      include: {
        document: {
          select: {
            id: true,
            name: true,
            type: true,
            sourceUrl: true,
          },
        },
      },
    });

    // Calculate cosine similarity for each chunk
    const results = chunks
      .map((chunk) => {
        if (!chunk.embedding) return null;

        const chunkEmbedding = bufferToFloatArray(chunk.embedding);
        const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);

        return {
          id: chunk.id,
          content: chunk.content,
          score: similarity,
          chunkIndex: chunk.chunkIndex,
          document: chunk.document,
          metadata: chunk.metadata,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null && r.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);

    return NextResponse.json({
      query,
      results,
      totalChunks: chunks.length,
      matchedChunks: results.length,
    });
  } catch (error) {
    console.error("Error searching knowledge base:", error);
    return NextResponse.json(
      { error: "Failed to search knowledge base" },
      { status: 500 }
    );
  }
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
 * Convert Buffer to Float32Array
 */
function bufferToFloatArray(buffer: Buffer): number[] {
  const floatArray = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.length / 4);
  return Array.from(floatArray);
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}
