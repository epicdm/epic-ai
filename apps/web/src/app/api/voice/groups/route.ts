import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { z } from "zod";

// Schema for creating a group
const createGroupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  routingStrategy: z.enum([
    "ROUND_ROBIN",
    "LEAST_BUSY",
    "PRIORITY",
    "WEIGHTED",
    "SKILLS_BASED",
    "RANDOM",
  ]).default("ROUND_ROBIN"),
  members: z.array(z.object({
    agentId: z.string(),
    priority: z.number().default(0),
    weight: z.number().min(0).max(100).default(100),
    maxConcurrent: z.number().min(1).default(5),
    skills: z.array(z.string()).default([]),
  })).optional(),
});

// GET /api/voice/groups - List all agent groups
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await getAuth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const groups = await prisma.agentGroup.findMany({
      where: { organizationId: orgId },
      include: {
        members: {
          include: {
            // We can't include agent directly due to schema, so we'll fetch separately
          },
        },
        _count: {
          select: {
            members: true,
            routingRules: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch agent details for each group member
    const groupsWithAgents = await Promise.all(
      groups.map(async (group) => {
        const agentIds = group.members.map((m) => m.agentId);
        const agents = await prisma.voiceAgent.findMany({
          where: { id: { in: agentIds } },
          select: { id: true, name: true, isActive: true },
        });

        const agentMap = new Map(agents.map((a) => [a.id, a]));

        return {
          ...group,
          members: group.members.map((m) => ({
            ...m,
            agent: agentMap.get(m.agentId) || null,
          })),
        };
      })
    );

    return NextResponse.json({ groups: groupsWithAgents });
  } catch (error) {
    console.error("[API] Error fetching agent groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent groups" },
      { status: 500 }
    );
  }
}

// POST /api/voice/groups - Create a new agent group
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await getAuth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = createGroupSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { name, description, routingStrategy, members } = validation.data;

    // Create the group with members
    const group = await prisma.agentGroup.create({
      data: {
        organizationId: orgId,
        name,
        description,
        routingStrategy,
        members: members ? {
          create: members.map((m) => ({
            agentId: m.agentId,
            priority: m.priority,
            weight: m.weight,
            maxConcurrent: m.maxConcurrent,
            skills: m.skills,
          })),
        } : undefined,
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

    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    console.error("[API] Error creating agent group:", error);
    return NextResponse.json(
      { error: "Failed to create agent group" },
      { status: 500 }
    );
  }
}
