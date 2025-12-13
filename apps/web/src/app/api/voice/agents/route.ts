/**
 * Voice Agents API
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";

// GET all agents for the organization
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    // Get brand IDs for this org
    const brands = await prisma.brand.findMany({
      where: { organizationId: org.id },
      select: { id: true },
    });
    const brandIds = brands.map((b) => b.id);

    const agents = await prisma.voiceAgent.findMany({
      where: {
        brandId: { in: brandIds },
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform to include brand info
    const agentsWithBrand = await Promise.all(
      agents.map(async (agent) => {
        const brand = await prisma.brand.findUnique({
          where: { id: agent.brandId },
          select: { id: true, name: true },
        });
        return { ...agent, brand };
      })
    );

    return NextResponse.json({ agents: agentsWithBrand });
  } catch (error) {
    console.error("Error fetching agents:", error);
    return NextResponse.json(
      { error: "Failed to fetch agents" },
      { status: 500 }
    );
  }
}

// POST create new agent
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const body = await request.json();
    const { name, brandId, systemPrompt, voiceId, isActive, settings } = body;

    // Validate brand belongs to org
    const brand = await prisma.brand.findFirst({
      where: {
        id: brandId,
        organizationId: org.id,
      },
    });

    if (!brand) {
      return NextResponse.json({ error: "Invalid brand" }, { status: 400 });
    }

    const agent = await prisma.voiceAgent.create({
      data: {
        name,
        brandId,
        systemPrompt: systemPrompt || "You are a helpful AI assistant.",
        voiceId,
        isActive: isActive ?? true,
        settings: settings || {},
      },
    });

    return NextResponse.json({ ...agent, brand: { id: brand.id, name: brand.name } }, { status: 201 });
  } catch (error) {
    console.error("Error creating agent:", error);
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 }
    );
  }
}
