/**
 * Individual Conversation Flow API
 * Get, update, delete a specific flow
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma, Prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";
import { z } from "zod";

const nodeSchema = z.object({
  nodeId: z.string(),
  type: z.enum([
    "START",
    "MESSAGE",
    "INPUT",
    "CONDITION",
    "INTENT",
    "TOOL_CALL",
    "TRANSFER",
    "WAIT",
    "SET_VARIABLE",
    "END",
  ]),
  label: z.string(),
  content: z.string().optional().nullable(),
  positionX: z.number(),
  positionY: z.number(),
  config: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
});

const edgeSchema = z.object({
  edgeId: z.string(),
  sourceNodeId: z.string(),
  targetNodeId: z.string(),
  sourceHandle: z.string().optional().nullable(),
  targetHandle: z.string().optional().nullable(),
  type: z.enum(["DEFAULT", "CONDITIONAL", "INTENT_MATCH", "FALLBACK", "ERROR"]),
  condition: z.record(z.any()).optional().nullable(),
  priority: z.number().optional(),
  label: z.string().optional().nullable(),
  animated: z.boolean().optional(),
  style: z.record(z.any()).optional().nullable(),
});

const updateFlowSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  agentId: z.string().optional().nullable(),
  startNodeId: z.string().optional().nullable(),
  settings: z.record(z.any()).optional(),
  viewport: z
    .object({
      x: z.number(),
      y: z.number(),
      zoom: z.number(),
    })
    .optional(),
  nodes: z.array(nodeSchema).optional(),
  edges: z.array(edgeSchema).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

// GET a specific conversation flow
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { id } = await context.params;

    const flow = await prisma.conversationFlow.findFirst({
      where: {
        id,
        organizationId: org.id,
      },
      include: {
        nodes: {
          orderBy: { createdAt: "asc" },
        },
        edges: {
          orderBy: { createdAt: "asc" },
        },
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!flow) {
      return NextResponse.json(
        { error: "Conversation flow not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ flow });
  } catch (error) {
    console.error("Error fetching conversation flow:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversation flow" },
      { status: 500 }
    );
  }
}

// PATCH update a conversation flow
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { id } = await context.params;

    // Check flow exists and belongs to org
    const existingFlow = await prisma.conversationFlow.findFirst({
      where: {
        id,
        organizationId: org.id,
      },
    });

    if (!existingFlow) {
      return NextResponse.json(
        { error: "Conversation flow not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = updateFlowSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // If changing agent, check agent doesn't already have a flow
    if (data.agentId && data.agentId !== existingFlow.agentId) {
      const agentFlow = await prisma.conversationFlow.findUnique({
        where: { agentId: data.agentId },
      });

      if (agentFlow && agentFlow.id !== id) {
        return NextResponse.json(
          { error: "Agent already has a conversation flow" },
          { status: 400 }
        );
      }

      // Verify agent belongs to this organization
      const agent = await prisma.voiceAgent.findFirst({
        where: {
          id: data.agentId,
          organizationId: org.id,
        },
      });

      if (!agent) {
        return NextResponse.json(
          { error: "Agent not found or unauthorized" },
          { status: 404 }
        );
      }
    }

    // Update flow and optionally sync nodes/edges in a transaction
    const flow = await prisma.$transaction(async (tx) => {
      // If nodes provided, sync them (delete existing, create new)
      if (data.nodes) {
        // Delete all existing nodes (cascade deletes edges)
        await tx.flowNode.deleteMany({
          where: { flowId: id },
        });

        // Create new nodes
        for (const node of data.nodes) {
          await tx.flowNode.create({
            data: {
              flowId: id,
              nodeId: node.nodeId,
              type: node.type,
              label: node.label,
              content: node.content || null,
              positionX: node.positionX,
              positionY: node.positionY,
              config: node.config || {},
              metadata: node.metadata || {},
            },
          });
        }

        // Create new edges (after nodes are created)
        if (data.edges) {
          for (const edge of data.edges) {
            await tx.flowEdge.create({
              data: {
                flowId: id,
                edgeId: edge.edgeId,
                sourceNodeId: edge.sourceNodeId,
                targetNodeId: edge.targetNodeId,
                sourceHandle: edge.sourceHandle || null,
                targetHandle: edge.targetHandle || null,
                type: edge.type,
                condition: edge.condition ?? Prisma.JsonNull,
                priority: edge.priority || 0,
                label: edge.label || null,
                animated: edge.animated || false,
                style: edge.style ?? Prisma.JsonNull,
              },
            });
          }
        }
      }

      // Update flow metadata
      return tx.conversationFlow.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          agentId: data.agentId,
          startNodeId: data.startNodeId,
          settings: data.settings,
          viewport: data.viewport,
          version: { increment: 1 },
        },
        include: {
          nodes: {
            orderBy: { createdAt: "asc" },
          },
          edges: {
            orderBy: { createdAt: "asc" },
          },
          agent: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    });

    return NextResponse.json({ flow });
  } catch (error) {
    console.error("Error updating conversation flow:", error);
    return NextResponse.json(
      { error: "Failed to update conversation flow" },
      { status: 500 }
    );
  }
}

// DELETE a conversation flow
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { id } = await context.params;

    // Check flow exists and belongs to org
    const flow = await prisma.conversationFlow.findFirst({
      where: {
        id,
        organizationId: org.id,
      },
    });

    if (!flow) {
      return NextResponse.json(
        { error: "Conversation flow not found" },
        { status: 404 }
      );
    }

    // Delete will cascade to nodes and edges
    await prisma.conversationFlow.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting conversation flow:", error);
    return NextResponse.json(
      { error: "Failed to delete conversation flow" },
      { status: 500 }
    );
  }
}
