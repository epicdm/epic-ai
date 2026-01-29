/**
 * Voice Agent Tool API - Individual Tool Operations
 * GET, PATCH, DELETE for a specific tool
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";
import { z } from "zod";

// Validation schema for updating tools
const toolUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(1000).optional(),
  type: z.enum(["WEBHOOK", "BUILTIN", "FUNCTION"]).optional(),
  webhookUrl: z.string().url().optional().nullable(),
  webhookMethod: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
  webhookHeaders: z.record(z.string()).optional(),
  authType: z.enum(["none", "api_key", "bearer", "basic"]).optional().nullable(),
  authConfig: z.record(z.any()).optional(),
  parameters: z.object({
    type: z.literal("object").default("object"),
    properties: z.record(z.object({
      type: z.string(),
      description: z.string().optional(),
      enum: z.array(z.string()).optional(),
    })).default({}),
  }).optional(),
  requiredParams: z.array(z.string()).optional(),
  responseMapping: z.record(z.any()).optional(),
  timeoutMs: z.number().min(1000).max(60000).optional(),
  retryCount: z.number().min(0).max(5).optional(),
  builtinType: z.string().optional().nullable(),
  builtinConfig: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
});

// GET a specific tool
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; toolId: string }> }
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

    const { id: agentId, toolId } = await params;

    // Verify agent belongs to org
    const agent = await prisma.voiceAgent.findFirst({
      where: {
        id: agentId,
        organizationId: org.id,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Get the specific tool
    const tool = await prisma.agentTool.findFirst({
      where: {
        id: toolId,
        agentId,
      },
    });

    if (!tool) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }

    return NextResponse.json({ tool });
  } catch (error) {
    console.error("Error fetching tool:", error);
    return NextResponse.json(
      { error: "Failed to fetch tool" },
      { status: 500 }
    );
  }
}

// PATCH update a specific tool
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; toolId: string }> }
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

    const { id: agentId, toolId } = await params;

    // Verify agent belongs to org
    const agent = await prisma.voiceAgent.findFirst({
      where: {
        id: agentId,
        organizationId: org.id,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Verify tool exists and belongs to agent
    const existingTool = await prisma.agentTool.findFirst({
      where: {
        id: toolId,
        agentId,
      },
    });

    if (!existingTool) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }

    const body = await request.json();
    const validation = toolUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid tool data", details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.webhookUrl !== undefined) updateData.webhookUrl = data.webhookUrl;
    if (data.webhookMethod !== undefined) updateData.webhookMethod = data.webhookMethod;
    if (data.webhookHeaders !== undefined) updateData.webhookHeaders = data.webhookHeaders;
    if (data.authType !== undefined) updateData.authType = data.authType;
    if (data.authConfig !== undefined) updateData.authConfig = data.authConfig;
    if (data.parameters !== undefined) updateData.parameters = data.parameters;
    if (data.requiredParams !== undefined) updateData.requiredParams = data.requiredParams;
    if (data.responseMapping !== undefined) updateData.responseMapping = data.responseMapping;
    if (data.timeoutMs !== undefined) updateData.timeoutMs = data.timeoutMs;
    if (data.retryCount !== undefined) updateData.retryCount = data.retryCount;
    if (data.builtinType !== undefined) updateData.builtinType = data.builtinType;
    if (data.builtinConfig !== undefined) updateData.builtinConfig = data.builtinConfig;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    // Update the tool
    const tool = await prisma.agentTool.update({
      where: { id: toolId },
      data: updateData,
    });

    return NextResponse.json({ tool });
  } catch (error) {
    console.error("Error updating tool:", error);
    return NextResponse.json(
      { error: "Failed to update tool" },
      { status: 500 }
    );
  }
}

// DELETE a specific tool
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; toolId: string }> }
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

    const { id: agentId, toolId } = await params;

    // Verify agent belongs to org
    const agent = await prisma.voiceAgent.findFirst({
      where: {
        id: agentId,
        organizationId: org.id,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Verify tool exists and belongs to agent
    const existingTool = await prisma.agentTool.findFirst({
      where: {
        id: toolId,
        agentId,
      },
    });

    if (!existingTool) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }

    // Delete the tool (will cascade delete usages due to schema)
    await prisma.agentTool.delete({
      where: { id: toolId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting tool:", error);
    return NextResponse.json(
      { error: "Failed to delete tool" },
      { status: 500 }
    );
  }
}
