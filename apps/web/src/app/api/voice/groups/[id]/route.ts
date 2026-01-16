import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";
import { z } from "zod";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// Schema for updating a group
const updateGroupSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  routingStrategy: z.enum([
    "ROUND_ROBIN",
    "LEAST_BUSY",
    "PRIORITY",
    "WEIGHTED",
    "SKILLS_BASED",
    "RANDOM",
  ]).optional(),
  isActive: z.boolean().optional(),
  members: z.array(z.object({
    agentId: z.string(),
    priority: z.number().default(0),
    weight: z.number().min(0).max(100).default(100),
    maxConcurrent: z.number().min(1).default(5),
    skills: z.array(z.string()).default([]),
    isActive: z.boolean().default(true),
  })).optional(),
});

// GET /api/voice/groups/[id] - Get a single agent group
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await getAuthWithBypass();
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const group = await prisma.agentGroup.findFirst({
      where: {
        id,
        organizationId: org.id,
      },
      include: {
        members: true,
        routingRules: true,
        _count: {
          select: {
            members: true,
            routingRules: true,
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Fetch agent details for members
    const agentIds = group.members.map((m) => m.agentId);
    const agents = await prisma.voiceAgent.findMany({
      where: { id: { in: agentIds } },
      select: { id: true, name: true, isActive: true, description: true },
    });

    const agentMap = new Map(agents.map((a) => [a.id, a]));

    const groupWithAgents = {
      ...group,
      members: group.members.map((m) => ({
        ...m,
        agent: agentMap.get(m.agentId) || null,
      })),
    };

    return NextResponse.json({ group: groupWithAgents });
  } catch (error) {
    console.error("[API] Error fetching agent group:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent group" },
      { status: 500 }
    );
  }
}

// PATCH /api/voice/groups/[id] - Update an agent group
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await getAuthWithBypass();
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    // Verify group belongs to org
    const existingGroup = await prisma.agentGroup.findFirst({
      where: { id, organizationId: org.id },
    });

    if (!existingGroup) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const body = await request.json();
    const validation = updateGroupSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { name, description, routingStrategy, isActive, members } = validation.data;

    // Update with transaction if members are provided
    if (members) {
      const group = await prisma.$transaction(async (tx) => {
        // Delete existing members
        await tx.agentGroupMember.deleteMany({
          where: { groupId: id },
        });

        // Update group and create new members
        return tx.agentGroup.update({
          where: { id },
          data: {
            ...(name && { name }),
            ...(description !== undefined && { description }),
            ...(routingStrategy && { routingStrategy }),
            ...(isActive !== undefined && { isActive }),
            members: {
              create: members.map((m) => ({
                agentId: m.agentId,
                priority: m.priority,
                weight: m.weight,
                maxConcurrent: m.maxConcurrent,
                skills: m.skills,
                isActive: m.isActive,
              })),
            },
          },
          include: {
            members: true,
            _count: {
              select: {
                members: true,
                routingRules: true,
              },
            },
          },
        });
      });

      return NextResponse.json({ group });
    }

    // Simple update without members
    const group = await prisma.agentGroup.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(routingStrategy && { routingStrategy }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        members: true,
        _count: {
          select: {
            members: true,
            routingRules: true,
          },
        },
      },
    });

    return NextResponse.json({ group });
  } catch (error) {
    console.error("[API] Error updating agent group:", error);
    return NextResponse.json(
      { error: "Failed to update agent group" },
      { status: 500 }
    );
  }
}

// DELETE /api/voice/groups/[id] - Delete an agent group
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await getAuthWithBypass();
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    // Verify group belongs to org
    const existingGroup = await prisma.agentGroup.findFirst({
      where: { id, organizationId: org.id },
    });

    if (!existingGroup) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Delete the group (members will cascade)
    await prisma.agentGroup.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Error deleting agent group:", error);
    return NextResponse.json(
      { error: "Failed to delete agent group" },
      { status: 500 }
    );
  }
}
