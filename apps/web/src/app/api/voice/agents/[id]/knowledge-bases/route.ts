/**
 * Agent Knowledge Bases API
 * Link and manage knowledge bases for a voice agent
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";
import { z } from "zod";

const linkKnowledgeBaseSchema = z.object({
  knowledgeBaseId: z.string().min(1, "Knowledge base ID is required"),
  priority: z.number().int().min(0).max(100).default(0),
  maxChunks: z.number().int().min(1).max(20).default(5),
  minScore: z.number().min(0).max(1).default(0.7),
});

const updateLinkSchema = z.object({
  priority: z.number().int().min(0).max(100).optional(),
  maxChunks: z.number().int().min(1).max(20).optional(),
  minScore: z.number().min(0).max(1).optional(),
  isActive: z.boolean().optional(),
});

// GET all knowledge bases linked to an agent
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

    const { id: agentId } = await params;

    // Verify agent ownership
    const agent = await prisma.voiceAgent.findFirst({
      where: {
        id: agentId,
        organizationId: org.id,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const linkedKnowledgeBases = await prisma.agentKnowledgeBase.findMany({
      where: {
        agentId,
      },
      include: {
        knowledgeBase: {
          select: {
            id: true,
            name: true,
            description: true,
            documentCount: true,
            chunkCount: true,
            isActive: true,
          },
        },
      },
      orderBy: { priority: "desc" },
    });

    return NextResponse.json({
      knowledgeBases: linkedKnowledgeBases.map((link) => ({
        id: link.id,
        knowledgeBaseId: link.knowledgeBaseId,
        name: link.knowledgeBase.name,
        description: link.knowledgeBase.description,
        documentCount: link.knowledgeBase.documentCount,
        chunkCount: link.knowledgeBase.chunkCount,
        priority: link.priority,
        maxChunks: link.maxChunks,
        minScore: link.minScore,
        isActive: link.isActive,
        knowledgeBaseActive: link.knowledgeBase.isActive,
      })),
    });
  } catch (error) {
    console.error("Error fetching agent knowledge bases:", error);
    return NextResponse.json(
      { error: "Failed to fetch knowledge bases" },
      { status: 500 }
    );
  }
}

// POST link a knowledge base to an agent
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

    const { id: agentId } = await params;

    // Verify agent ownership
    const agent = await prisma.voiceAgent.findFirst({
      where: {
        id: agentId,
        organizationId: org.id,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const body = await request.json();
    const validation = linkKnowledgeBaseSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Verify knowledge base ownership
    const knowledgeBase = await prisma.knowledgeBase.findFirst({
      where: {
        id: data.knowledgeBaseId,
        organizationId: org.id,
      },
    });

    if (!knowledgeBase) {
      return NextResponse.json({ error: "Knowledge base not found" }, { status: 404 });
    }

    // Check if already linked
    const existingLink = await prisma.agentKnowledgeBase.findUnique({
      where: {
        agentId_knowledgeBaseId: {
          agentId,
          knowledgeBaseId: data.knowledgeBaseId,
        },
      },
    });

    if (existingLink) {
      return NextResponse.json(
        { error: "Knowledge base already linked to this agent" },
        { status: 400 }
      );
    }

    const link = await prisma.agentKnowledgeBase.create({
      data: {
        agentId,
        knowledgeBaseId: data.knowledgeBaseId,
        priority: data.priority,
        maxChunks: data.maxChunks,
        minScore: data.minScore,
      },
      include: {
        knowledgeBase: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    return NextResponse.json({ link }, { status: 201 });
  } catch (error) {
    console.error("Error linking knowledge base:", error);
    return NextResponse.json(
      { error: "Failed to link knowledge base" },
      { status: 500 }
    );
  }
}

// PATCH update a knowledge base link
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

    const { id: agentId } = await params;
    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get("linkId");

    if (!linkId) {
      return NextResponse.json({ error: "linkId query param required" }, { status: 400 });
    }

    // Verify agent ownership
    const agent = await prisma.voiceAgent.findFirst({
      where: {
        id: agentId,
        organizationId: org.id,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Verify link exists and belongs to agent
    const existingLink = await prisma.agentKnowledgeBase.findFirst({
      where: {
        id: linkId,
        agentId,
      },
    });

    if (!existingLink) {
      return NextResponse.json({ error: "Knowledge base link not found" }, { status: 404 });
    }

    const body = await request.json();
    const validation = updateLinkSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;
    const updateData: Record<string, unknown> = {};

    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.maxChunks !== undefined) updateData.maxChunks = data.maxChunks;
    if (data.minScore !== undefined) updateData.minScore = data.minScore;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const link = await prisma.agentKnowledgeBase.update({
      where: { id: linkId },
      data: updateData,
    });

    return NextResponse.json({ link });
  } catch (error) {
    console.error("Error updating knowledge base link:", error);
    return NextResponse.json(
      { error: "Failed to update knowledge base link" },
      { status: 500 }
    );
  }
}

// DELETE unlink a knowledge base from an agent
export async function DELETE(
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

    const { id: agentId } = await params;
    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get("linkId");

    if (!linkId) {
      return NextResponse.json({ error: "linkId query param required" }, { status: 400 });
    }

    // Verify agent ownership
    const agent = await prisma.voiceAgent.findFirst({
      where: {
        id: agentId,
        organizationId: org.id,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Verify link exists and belongs to agent
    const existingLink = await prisma.agentKnowledgeBase.findFirst({
      where: {
        id: linkId,
        agentId,
      },
    });

    if (!existingLink) {
      return NextResponse.json({ error: "Knowledge base link not found" }, { status: 404 });
    }

    await prisma.agentKnowledgeBase.delete({
      where: { id: linkId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unlinking knowledge base:", error);
    return NextResponse.json(
      { error: "Failed to unlink knowledge base" },
      { status: 500 }
    );
  }
}
