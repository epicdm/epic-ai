/**
 * Knowledge Base API
 * Manage knowledge bases for RAG-powered voice agents
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";
import { z } from "zod";

const createKnowledgeBaseSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  embeddingModel: z.enum(["text-embedding-3-small", "text-embedding-3-large", "text-embedding-ada-002"]).optional(),
  chunkSize: z.number().int().min(100).max(4000).optional(),
  chunkOverlap: z.number().int().min(0).max(1000).optional(),
});

// GET all knowledge bases for the organization
export async function GET() {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const knowledgeBases = await prisma.knowledgeBase.findMany({
      where: {
        organizationId: org.id,
      },
      include: {
        _count: {
          select: {
            documents: true,
            chunks: true,
            agentKnowledgeBases: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      knowledgeBases: knowledgeBases.map(kb => ({
        ...kb,
        documentsCount: kb._count.documents,
        chunksCount: kb._count.chunks,
        agentsCount: kb._count.agentKnowledgeBases,
      })),
    });
  } catch (error) {
    console.error("Error fetching knowledge bases:", error);
    return NextResponse.json(
      { error: "Failed to fetch knowledge bases" },
      { status: 500 }
    );
  }
}

// POST create a new knowledge base
export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const body = await request.json();
    const validation = createKnowledgeBaseSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    const knowledgeBase = await prisma.knowledgeBase.create({
      data: {
        organizationId: org.id,
        name: data.name,
        description: data.description || null,
        embeddingModel: data.embeddingModel || "text-embedding-3-small",
        chunkSize: data.chunkSize || 1000,
        chunkOverlap: data.chunkOverlap || 200,
      },
    });

    return NextResponse.json({ knowledgeBase }, { status: 201 });
  } catch (error) {
    console.error("Error creating knowledge base:", error);
    return NextResponse.json(
      { error: "Failed to create knowledge base" },
      { status: 500 }
    );
  }
}
