/**
 * Voice Personas API
 * GET - List all personas (org-specific + system templates)
 * POST - Create a new persona
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";
import { z } from "zod";

// Schema for creating persona
const createPersonaSchema = z.object({
  name: z.string().min(1),
  type: z.string(), // sales, support, receptionist, etc.
  description: z.string().optional(),
  instructions: z.string().min(10),
  personalityTraits: z.array(z.string()).optional(),
  tone: z.string().optional(), // professional, friendly, casual
  languageStyle: z.string().optional(), // concise, detailed
  voiceConfig: z
    .object({
      voiceId: z.string().optional(),
      provider: z.string().optional(),
      speed: z.number().optional(),
    })
    .optional(),
  capabilities: z.array(z.string()).default(["voice"]),
  tools: z.array(z.unknown()).default([]),
  isTemplate: z.boolean().default(false),
});

/**
 * GET /api/voice/personas - List personas
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const includeTemplates = searchParams.get("includeTemplates") !== "false";

    // Build query to get org personas and system templates
    const whereConditions = [];

    // Org-specific personas
    whereConditions.push({ organizationId: org.id });

    // System templates
    if (includeTemplates) {
      whereConditions.push({ organizationId: null, isTemplate: true });
    }

    const personas = await prisma.voicePersona.findMany({
      where: {
        OR: whereConditions,
        ...(type ? { type } : {}),
      },
      include: {
        _count: { select: { agents: true } },
      },
      orderBy: [{ isTemplate: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ personas });
  } catch (error) {
    console.error("Error fetching personas:", error);
    return NextResponse.json(
      { error: "Failed to fetch personas" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/voice/personas - Create a new persona
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const body = await request.json();
    const validated = createPersonaSchema.parse(body);

    const persona = await prisma.voicePersona.create({
      data: {
        organizationId: org.id,
        name: validated.name,
        type: validated.type,
        description: validated.description,
        instructions: validated.instructions,
        personalityTraits: validated.personalityTraits || [],
        tone: validated.tone,
        languageStyle: validated.languageStyle,
        voiceConfig: validated.voiceConfig || {},
        capabilities: validated.capabilities,
        tools: validated.tools,
        isTemplate: false, // User-created personas are not templates
      },
    });

    return NextResponse.json({ persona }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    console.error("Error creating persona:", error);
    return NextResponse.json(
      { error: "Failed to create persona" },
      { status: 500 }
    );
  }
}
