import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { z } from "zod";

// Schema for condition in a routing rule
const conditionSchema = z.object({
  field: z.enum([
    "caller_id",
    "caller_name",
    "time_of_day",
    "day_of_week",
    "intent",
    "skill_required",
    "language",
    "custom",
  ]),
  operator: z.enum([
    "equals",
    "not_equals",
    "contains",
    "not_contains",
    "starts_with",
    "ends_with",
    "regex",
    "in_list",
    "not_in_list",
    "greater_than",
    "less_than",
    "between",
  ]),
  value: z.union([z.string(), z.number(), z.array(z.string())]),
});

// Schema for schedule
const scheduleSchema = z.object({
  timezone: z.string().default("UTC"),
  periods: z.array(z.object({
    days: z.array(z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"])),
    startTime: z.string(), // HH:MM format
    endTime: z.string(), // HH:MM format
  })).optional(),
  holidays: z.array(z.string()).optional(), // ISO date strings
});

// Schema for creating a routing rule
const createRoutingRuleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  groupId: z.string().optional(),
  targetAgentId: z.string().optional(),
  priority: z.number().int().min(0).default(0),
  conditions: z.array(conditionSchema).default([]),
  fallbackAgentId: z.string().optional(),
  fallbackGroupId: z.string().optional(),
  fallbackAction: z.enum(["voicemail", "hangup", "transfer", "queue"]).default("voicemail"),
  announcementMessage: z.string().optional(),
  holdMusic: z.string().optional(),
  maxWaitSeconds: z.number().int().min(0).max(3600).default(300),
  scheduleEnabled: z.boolean().default(false),
  schedule: scheduleSchema.optional(),
  isActive: z.boolean().default(true),
});

// GET /api/voice/routing - List all routing rules
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await getAuth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("groupId");
    const isActive = searchParams.get("isActive");

    const rules = await prisma.agentRoutingRule.findMany({
      where: {
        organizationId: orgId,
        ...(groupId && { groupId }),
        ...(isActive !== null && { isActive: isActive === "true" }),
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            routingStrategy: true,
          },
        },
      },
      orderBy: [
        { priority: "desc" },
        { createdAt: "desc" },
      ],
    });

    // Fetch agent details for target and fallback agents
    const agentIds = new Set<string>();
    rules.forEach((rule) => {
      if (rule.targetAgentId) agentIds.add(rule.targetAgentId);
      if (rule.fallbackAgentId) agentIds.add(rule.fallbackAgentId);
    });

    const agents = await prisma.voiceAgent.findMany({
      where: { id: { in: Array.from(agentIds) } },
      select: { id: true, name: true, isActive: true },
    });

    const agentMap = new Map(agents.map((a) => [a.id, a]));

    const rulesWithAgents = rules.map((rule) => ({
      ...rule,
      targetAgent: rule.targetAgentId ? agentMap.get(rule.targetAgentId) || null : null,
      fallbackAgent: rule.fallbackAgentId ? agentMap.get(rule.fallbackAgentId) || null : null,
    }));

    return NextResponse.json({ rules: rulesWithAgents });
  } catch (error) {
    console.error("[API] Error fetching routing rules:", error);
    return NextResponse.json(
      { error: "Failed to fetch routing rules" },
      { status: 500 }
    );
  }
}

// POST /api/voice/routing - Create a new routing rule
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await getAuth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = createRoutingRuleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.errors },
        { status: 400 }
      );
    }

    const {
      name,
      description,
      groupId,
      targetAgentId,
      priority,
      conditions,
      fallbackAgentId,
      fallbackGroupId,
      fallbackAction,
      announcementMessage,
      holdMusic,
      maxWaitSeconds,
      scheduleEnabled,
      schedule,
      isActive,
    } = validation.data;

    // Validate group belongs to org if provided
    if (groupId) {
      const group = await prisma.agentGroup.findFirst({
        where: { id: groupId, organizationId: orgId },
      });
      if (!group) {
        return NextResponse.json(
          { error: "Group not found or doesn't belong to organization" },
          { status: 400 }
        );
      }
    }

    // Validate target agent belongs to org if provided
    if (targetAgentId) {
      const agent = await prisma.voiceAgent.findFirst({
        where: { id: targetAgentId, organizationId: orgId },
      });
      if (!agent) {
        return NextResponse.json(
          { error: "Target agent not found or doesn't belong to organization" },
          { status: 400 }
        );
      }
    }

    // Create the routing rule
    const rule = await prisma.agentRoutingRule.create({
      data: {
        organizationId: orgId,
        name,
        description,
        groupId,
        targetAgentId,
        priority,
        conditions,
        fallbackAgentId,
        fallbackGroupId,
        fallbackAction,
        announcementMessage,
        holdMusic,
        maxWaitSeconds,
        scheduleEnabled,
        schedule: schedule || {},
        isActive,
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            routingStrategy: true,
          },
        },
      },
    });

    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    console.error("[API] Error creating routing rule:", error);
    return NextResponse.json(
      { error: "Failed to create routing rule" },
      { status: 500 }
    );
  }
}
