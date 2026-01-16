import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { z } from "zod";

type RouteParams = {
  params: Promise<{ id: string }>;
};

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

// Schema for updating a routing rule
const updateRoutingRuleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  groupId: z.string().nullable().optional(),
  targetAgentId: z.string().nullable().optional(),
  priority: z.number().int().min(0).optional(),
  conditions: z.array(conditionSchema).optional(),
  fallbackAgentId: z.string().nullable().optional(),
  fallbackGroupId: z.string().nullable().optional(),
  fallbackAction: z.enum(["voicemail", "hangup", "transfer", "queue"]).optional(),
  announcementMessage: z.string().nullable().optional(),
  holdMusic: z.string().nullable().optional(),
  maxWaitSeconds: z.number().int().min(0).max(3600).optional(),
  scheduleEnabled: z.boolean().optional(),
  schedule: scheduleSchema.optional(),
  isActive: z.boolean().optional(),
});

// GET /api/voice/routing/[id] - Get a single routing rule
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId, orgId } = await getAuth();
    const { id } = await params;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rule = await prisma.agentRoutingRule.findFirst({
      where: {
        id,
        organizationId: orgId,
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            routingStrategy: true,
            isActive: true,
            _count: {
              select: { members: true },
            },
          },
        },
      },
    });

    if (!rule) {
      return NextResponse.json({ error: "Routing rule not found" }, { status: 404 });
    }

    // Fetch agent details
    const agentIds: string[] = [];
    if (rule.targetAgentId) agentIds.push(rule.targetAgentId);
    if (rule.fallbackAgentId) agentIds.push(rule.fallbackAgentId);

    const agents = await prisma.voiceAgent.findMany({
      where: { id: { in: agentIds } },
      select: { id: true, name: true, isActive: true, description: true },
    });

    const agentMap = new Map(agents.map((a) => [a.id, a]));

    // Fetch fallback group if specified
    let fallbackGroup = null;
    if (rule.fallbackGroupId) {
      fallbackGroup = await prisma.agentGroup.findUnique({
        where: { id: rule.fallbackGroupId },
        select: { id: true, name: true, routingStrategy: true },
      });
    }

    const ruleWithDetails = {
      ...rule,
      targetAgent: rule.targetAgentId ? agentMap.get(rule.targetAgentId) || null : null,
      fallbackAgent: rule.fallbackAgentId ? agentMap.get(rule.fallbackAgentId) || null : null,
      fallbackGroup,
    };

    return NextResponse.json({ rule: ruleWithDetails });
  } catch (error) {
    console.error("[API] Error fetching routing rule:", error);
    return NextResponse.json(
      { error: "Failed to fetch routing rule" },
      { status: 500 }
    );
  }
}

// PATCH /api/voice/routing/[id] - Update a routing rule
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId, orgId } = await getAuth();
    const { id } = await params;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify rule belongs to org
    const existingRule = await prisma.agentRoutingRule.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existingRule) {
      return NextResponse.json({ error: "Routing rule not found" }, { status: 404 });
    }

    const body = await request.json();
    const validation = updateRoutingRuleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Validate group belongs to org if provided
    if (data.groupId) {
      const group = await prisma.agentGroup.findFirst({
        where: { id: data.groupId, organizationId: orgId },
      });
      if (!group) {
        return NextResponse.json(
          { error: "Group not found or doesn't belong to organization" },
          { status: 400 }
        );
      }
    }

    // Validate target agent belongs to org if provided
    if (data.targetAgentId) {
      const agent = await prisma.voiceAgent.findFirst({
        where: { id: data.targetAgentId, organizationId: orgId },
      });
      if (!agent) {
        return NextResponse.json(
          { error: "Target agent not found or doesn't belong to organization" },
          { status: 400 }
        );
      }
    }

    // Update the routing rule
    const rule = await prisma.agentRoutingRule.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.groupId !== undefined && { groupId: data.groupId }),
        ...(data.targetAgentId !== undefined && { targetAgentId: data.targetAgentId }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.conditions && { conditions: data.conditions }),
        ...(data.fallbackAgentId !== undefined && { fallbackAgentId: data.fallbackAgentId }),
        ...(data.fallbackGroupId !== undefined && { fallbackGroupId: data.fallbackGroupId }),
        ...(data.fallbackAction && { fallbackAction: data.fallbackAction }),
        ...(data.announcementMessage !== undefined && { announcementMessage: data.announcementMessage }),
        ...(data.holdMusic !== undefined && { holdMusic: data.holdMusic }),
        ...(data.maxWaitSeconds !== undefined && { maxWaitSeconds: data.maxWaitSeconds }),
        ...(data.scheduleEnabled !== undefined && { scheduleEnabled: data.scheduleEnabled }),
        ...(data.schedule && { schedule: data.schedule }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
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

    return NextResponse.json({ rule });
  } catch (error) {
    console.error("[API] Error updating routing rule:", error);
    return NextResponse.json(
      { error: "Failed to update routing rule" },
      { status: 500 }
    );
  }
}

// DELETE /api/voice/routing/[id] - Delete a routing rule
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId, orgId } = await getAuth();
    const { id } = await params;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify rule belongs to org
    const existingRule = await prisma.agentRoutingRule.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existingRule) {
      return NextResponse.json({ error: "Routing rule not found" }, { status: 404 });
    }

    // Delete the rule
    await prisma.agentRoutingRule.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Error deleting routing rule:", error);
    return NextResponse.json(
      { error: "Failed to delete routing rule" },
      { status: 500 }
    );
  }
}
