/**
 * Individual Knowledge Base API
 * GET, PATCH, DELETE a specific knowledge base
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";
import { z } from "zod";

const updateKnowledgeBaseSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  embeddingModel: z.enum(["text-embedding-3-small", "text-embedding-3-large", "text-embedding-ada-002"]).optional(),
  chunkSize: z.number().int().min(100).max(4000).optional(),
  chunkOverlap: z.number().int().min(0).max(1000).optional(),
  isActive: z.boolean().optional(),
});

// GET a specific knowledge base
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

    const { id } = await params;

    const knowledgeBase = await prisma.knowledgeBase.findFirst({
      where: {
        id,
        organizationId: org.id,
      },
      include: {
        documents: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            chunkCount: true,
            tokenCount: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        agentKnowledgeBases: {
          include: {
            agent: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            chunks: true,
          },
        },
      },
    });

    if (!knowledgeBase) {
      return NextResponse.json({ error: "Knowledge base not found" }, { status: 404 });
    }

    return NextResponse.json({
      knowledgeBase: {
        ...knowledgeBase,
        chunksCount: knowledgeBase._count.chunks,
        agents: knowledgeBase.agentKnowledgeBases.map(akb => ({
          id: akb.agent.id,
          name: akb.agent.name,
          priority: akb.priority,
          maxChunks: akb.maxChunks,
          minScore: akb.minScore,
          isActive: akb.isActive,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching knowledge base:", error);
    return NextResponse.json(
      { error: "Failed to fetch knowledge base" },
      { status: 500 }
    );
  }
}

// PATCH update a knowledge base
export async function PATCH(
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

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.knowledgeBase.findFirst({
      where: {
        id,
        organizationId: org.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Knowledge base not found" }, { status: 404 });
    }

    const body = await request.json();
    const validation = updateKnowledgeBaseSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.embeddingModel !== undefined) updateData.embeddingModel = data.embeddingModel;
    if (data.chunkSize !== undefined) updateData.chunkSize = data.chunkSize;
    if (data.chunkOverlap !== undefined) updateData.chunkOverlap = data.chunkOverlap;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const knowledgeBase = await prisma.knowledgeBase.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ knowledgeBase });
  } catch (error) {
    console.error("Error updating knowledge base:", error);
    return NextResponse.json(
      { error: "Failed to update knowledge base" },
      { status: 500 }
    );
  }
}

// DELETE a knowledge base
export async function DELETE(
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

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.knowledgeBase.findFirst({
      where: {
        id,
        organizationId: org.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Knowledge base not found" }, { status: 404 });
    }

    // Delete will cascade to documents, chunks, and agent links
    await prisma.knowledgeBase.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting knowledge base:", error);
    return NextResponse.json(
      { error: "Failed to delete knowledge base" },
      { status: 500 }
    );
  }
}
