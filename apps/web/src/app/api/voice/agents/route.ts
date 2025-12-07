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

    const agents = await prisma.voiceAgent.findMany({
      where: {
        brand: {
          organizationId: org.id,
        },
      },
      include: {
        brand: {
          select: { id: true, name: true },
        },
        phoneNumbers: {
          select: { id: true, number: true },
        },
        _count: {
          select: { calls: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(agents);
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
    const {
      name,
      description,
      brandId,
      personaId,
      systemPrompt,
      greeting,
      fallbackMessage,
      llmProvider,
      llmModel,
      sttProvider,
      ttsProvider,
      voiceSettings,
      transferNumber,
    } = body;

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
        description,
        brandId,
        personaId,
        systemPrompt: systemPrompt || "You are a helpful AI assistant.",
        greeting: greeting || "Hello! Thanks for calling. How can I help you today?",
        fallbackMessage,
        llmProvider: llmProvider || "openai",
        llmModel: llmModel || "gpt-4-turbo",
        sttProvider: sttProvider || "deepgram",
        ttsProvider: ttsProvider || "openai",
        voiceSettings: voiceSettings || {},
        transferNumber,
      },
      include: {
        brand: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    console.error("Error creating agent:", error);
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 }
    );
  }
}
