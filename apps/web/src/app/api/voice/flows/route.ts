/**
 * Conversation Flows API
 * Manage visual conversation flows for voice agents
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";
import { z } from "zod";

const createFlowSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  agentId: z.string().optional(),
});

// GET all conversation flows for the organization
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

    const flows = await prisma.conversationFlow.findMany({
      where: {
        organizationId: org.id,
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            nodes: true,
            edges: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      flows: flows.map((flow) => ({
        ...flow,
        nodesCount: flow._count.nodes,
        edgesCount: flow._count.edges,
      })),
    });
  } catch (error) {
    console.error("Error fetching conversation flows:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversation flows" },
      { status: 500 }
    );
  }
}

// POST create a new conversation flow
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
    const validation = createFlowSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check if agent already has a flow
    if (data.agentId) {
      const existingFlow = await prisma.conversationFlow.findUnique({
        where: { agentId: data.agentId },
      });

      if (existingFlow) {
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

    // Create flow with a default START node
    const flow = await prisma.conversationFlow.create({
      data: {
        organizationId: org.id,
        name: data.name,
        description: data.description || null,
        agentId: data.agentId || null,
        nodes: {
          create: {
            nodeId: "start",
            type: "START",
            label: "Start",
            positionX: 250,
            positionY: 50,
            config: {},
          },
        },
      },
      include: {
        nodes: true,
        edges: true,
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Update the start node ID
    await prisma.conversationFlow.update({
      where: { id: flow.id },
      data: { startNodeId: "start" },
    });

    return NextResponse.json({ flow }, { status: 201 });
  } catch (error) {
    console.error("Error creating conversation flow:", error);
    return NextResponse.json(
      { error: "Failed to create conversation flow" },
      { status: 500 }
    );
  }
}
