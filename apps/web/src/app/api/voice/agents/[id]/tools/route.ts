/**
 * Voice Agent Tools API
 * Manage function calling tools for voice agents
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";
import { z } from "zod";

// Validation schema for creating/updating tools
const toolSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  type: z.enum(["WEBHOOK", "BUILTIN", "FUNCTION"]).default("WEBHOOK"),
  webhookUrl: z.string().url().optional().nullable(),
  webhookMethod: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("POST"),
  webhookHeaders: z.record(z.string()).default({}),
  authType: z.enum(["none", "api_key", "bearer", "basic"]).optional().nullable(),
  authConfig: z.record(z.any()).default({}),
  parameters: z.object({
    type: z.literal("object").default("object"),
    properties: z.record(z.object({
      type: z.string(),
      description: z.string().optional(),
      enum: z.array(z.string()).optional(),
    })).default({}),
  }).default({ type: "object", properties: {} }),
  requiredParams: z.array(z.string()).default([]),
  responseMapping: z.record(z.any()).default({}),
  timeoutMs: z.number().min(1000).max(60000).default(10000),
  retryCount: z.number().min(0).max(5).default(1),
  builtinType: z.string().optional().nullable(),
  builtinConfig: z.record(z.any()).default({}),
  isActive: z.boolean().default(true),
});

// GET all tools for an agent
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

    // Get all tools for this agent
    const tools = await prisma.agentTool.findMany({
      where: { agentId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ tools });
  } catch (error) {
    console.error("Error fetching tools:", error);
    return NextResponse.json(
      { error: "Failed to fetch tools" },
      { status: 500 }
    );
  }
}

// POST create new tool
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

    const body = await request.json();
    const validation = toolSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid tool data", details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Create the tool
    const tool = await prisma.agentTool.create({
      data: {
        agentId,
        organizationId: org.id,
        name: data.name,
        description: data.description,
        type: data.type,
        webhookUrl: data.webhookUrl,
        webhookMethod: data.webhookMethod,
        webhookHeaders: data.webhookHeaders,
        authType: data.authType,
        authConfig: data.authConfig,
        parameters: data.parameters,
        requiredParams: data.requiredParams,
        responseMapping: data.responseMapping,
        timeoutMs: data.timeoutMs,
        retryCount: data.retryCount,
        builtinType: data.builtinType,
        builtinConfig: data.builtinConfig,
        isActive: data.isActive,
      },
    });

    return NextResponse.json({ tool }, { status: 201 });
  } catch (error) {
    console.error("Error creating tool:", error);
    return NextResponse.json(
      { error: "Failed to create tool" },
      { status: 500 }
    );
  }
}
