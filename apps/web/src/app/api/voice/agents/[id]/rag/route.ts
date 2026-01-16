/**
 * Agent RAG Search API
 * Search across all linked knowledge bases for a voice agent
 * Used by the voice service during calls to retrieve relevant context
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@epic-ai/database";
import { z } from "zod";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ragSearchSchema = z.object({
  query: z.string().min(1, "Query is required").max(1000),
  maxResults: z.number().int().min(1).max(20).optional(),
});

// POST search across agent's knowledge bases
// Note: This endpoint is designed for internal use by voice service
// It doesn't require user auth but validates agent exists
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params;

    // Get agent with linked knowledge bases
    const agent = await prisma.voiceAgent.findUnique({
      where: { id: agentId },
      include: {
        knowledgeBases: {
          where: { isActive: true },
          include: {
            knowledgeBase: {
              select: {
                id: true,
                name: true,
                embeddingModel: true,
                isActive: true,
              },
            },
          },
          orderBy: { priority: "desc" },
        },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Filter to only active knowledge bases
    const activeKnowledgeBases = agent.knowledgeBases.filter(
      (link) => link.knowledgeBase.isActive
    );

    if (activeKnowledgeBases.length === 0) {
      return NextResponse.json({
        results: [],
        message: "No active knowledge bases linked to this agent",
      });
    }

    const body = await request.json();
    const validation = ragSearchSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { query, maxResults: requestedMax } = validation.data;

    // Use the embedding model from the first (highest priority) knowledge base
    const primaryModel = activeKnowledgeBases[0].knowledgeBase.embeddingModel;

    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query, primaryModel);

    if (!queryEmbedding) {
      return NextResponse.json(
        { error: "Failed to generate query embedding" },
        { status: 500 }
      );
    }

    // Search each knowledge base and combine results
    const allResults: SearchResult[] = [];

    for (const link of activeKnowledgeBases) {
      const kb = link.knowledgeBase;
      const maxChunks = requestedMax || link.maxChunks;
      const minScore = link.minScore;

      // Get chunks from this knowledge base
      const chunks = await prisma.knowledgeChunk.findMany({
        where: {
          knowledgeBaseId: kb.id,
          embedding: { not: null },
        },
        include: {
          document: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      });

      // Calculate similarity for each chunk
      for (const chunk of chunks) {
        if (!chunk.embedding) continue;

        const chunkEmbedding = bufferToFloatArray(chunk.embedding);
        const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);

        if (similarity >= minScore) {
          allResults.push({
            content: chunk.content,
            score: similarity,
            knowledgeBase: kb.name,
            knowledgeBaseId: kb.id,
            documentName: chunk.document.name,
            documentId: chunk.document.id,
            chunkIndex: chunk.chunkIndex,
            priority: link.priority,
          });
        }
      }
    }

    // Sort by score (and priority as tiebreaker)
    allResults.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.priority - a.priority;
    });

    // Limit to requested max results
    const totalMax = requestedMax || activeKnowledgeBases[0].maxChunks;
    const topResults = allResults.slice(0, totalMax);

    // Format for voice agent consumption
    const context = topResults.map((r) => r.content).join("\n\n---\n\n");

    return NextResponse.json({
      query,
      context,
      results: topResults.map((r) => ({
        content: r.content,
        score: r.score,
        source: `${r.knowledgeBase}: ${r.documentName}`,
      })),
      totalMatches: allResults.length,
      knowledgeBasesSearched: activeKnowledgeBases.length,
    });
  } catch (error) {
    console.error("Error in RAG search:", error);
    return NextResponse.json(
      { error: "Failed to search knowledge bases" },
      { status: 500 }
    );
  }
}

interface SearchResult {
  content: string;
  score: number;
  knowledgeBase: string;
  knowledgeBaseId: string;
  documentName: string;
  documentId: string;
  chunkIndex: number;
  priority: number;
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
