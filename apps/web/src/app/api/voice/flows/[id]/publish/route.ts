/**
 * Publish Conversation Flow API
 * Publish/unpublish a flow for use with the voice agent
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";
import { z } from "zod";

const publishSchema = z.object({
  publish: z.boolean(),
});

type RouteContext = { params: Promise<{ id: string }> };

// POST publish/unpublish a flow
export async function POST(request: NextRequest, context: RouteContext) {
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

    const body = await request.json();
    const validation = publishSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { publish } = validation.data;

    // Check flow exists and belongs to org
    const existingFlow = await prisma.conversationFlow.findFirst({
      where: {
        id,
        organizationId: org.id,
      },
      include: {
        nodes: true,
      },
    });

    if (!existingFlow) {
      return NextResponse.json(
        { error: "Conversation flow not found" },
        { status: 404 }
      );
    }

    // Validate flow before publishing
    if (publish) {
      // Must have a start node
      const startNode = existingFlow.nodes.find((n) => n.type === "START");
      if (!startNode) {
        return NextResponse.json(
          { error: "Flow must have a START node to be published" },
          { status: 400 }
        );
      }

      // Must have at least one other node
      if (existingFlow.nodes.length < 2) {
        return NextResponse.json(
          {
            error:
              "Flow must have at least one node in addition to START to be published",
          },
          { status: 400 }
        );
      }

      // Must be linked to an agent
      if (!existingFlow.agentId) {
        return NextResponse.json(
          { error: "Flow must be linked to an agent to be published" },
          { status: 400 }
        );
      }
    }

    const flow = await prisma.conversationFlow.update({
      where: { id },
      data: {
        isPublished: publish,
        publishedAt: publish ? new Date() : null,
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      flow,
      message: publish
        ? "Flow published successfully"
        : "Flow unpublished successfully",
    });
  } catch (error) {
    console.error("Error publishing conversation flow:", error);
    return NextResponse.json(
      { error: "Failed to publish conversation flow" },
      { status: 500 }
    );
  }
}
