/**
 * Voice Agents API
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@epic-ai/database";
import { getAuthWithBypass, getCurrentOrganization } from "@/lib/auth";
import { generateDemoVoiceAgent } from "@/lib/demo/sample-data";

// GET all agents for the organization
export async function GET() {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is in demo mode
    const progress = await prisma.userOnboardingProgress.findUnique({
      where: { userId },
      select: { isDemoMode: true },
    });

    if (progress?.isDemoMode) {
      const demoAgent = generateDemoVoiceAgent("Demo Company");
      return NextResponse.json({
        agents: [demoAgent],
        isDemo: true,
      });
    }

    const org = await getCurrentOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    // Query agents directly by organizationId with all required relations
    const agents = await prisma.voiceAgent.findMany({
      where: {
        organizationId: org.id,
      },
      include: {
        phoneMappings: {
          select: { id: true, phoneNumber: true },
        },
        _count: {
          select: { callLogs: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform to match frontend expectations
    const agentsWithBrand = await Promise.all(
      agents.map(async (agent) => {
        const brand = agent.brandId
          ? await prisma.brand.findUnique({
              where: { id: agent.brandId },
              select: { id: true, name: true },
            })
          : null;

        return {
          ...agent,
          brand: brand || { id: "", name: "No Brand" },
          phoneNumbers: agent.phoneMappings.map((pm) => ({
            id: pm.id,
            number: pm.phoneNumber,
          })),
          isDeployed: agent.status === "deployed",
          _count: { calls: agent._count.callLogs },
        };
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
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getCurrentOrganization();
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
        organizationId: org.id,
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
