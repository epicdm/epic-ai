/**
 * Voice Persona Detail API
 * GET - Get single persona
 * PATCH - Update persona
 * DELETE - Delete persona
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";
import { z } from "zod";

// Schema for updating persona
const updatePersonaSchema = z.object({
  name: z.string().optional(),
  type: z.string().optional(),
  description: z.string().optional(),
  instructions: z.string().optional(),
  personalityTraits: z.array(z.string()).optional(),
  tone: z.string().optional(),
  languageStyle: z.string().optional(),
  voiceConfig: z
    .object({
      voiceId: z.string().optional(),
      provider: z.string().optional(),
      speed: z.number().optional(),
    })
    .optional(),
  capabilities: z.array(z.string()).optional(),
  tools: z.array(z.unknown()).optional(),
});

/**
 * GET /api/voice/personas/[id] - Get persona details
 */
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

    const { id } = await params;

    // Allow access to org personas and system templates
    const persona = await prisma.voicePersona.findFirst({
      where: {
        id,
        OR: [
          { organizationId: org.id },
          { organizationId: null, isTemplate: true },
        ],
      },
      include: {
        agents: {
          select: { id: true, name: true },
          take: 10,
        },
        _count: { select: { agents: true } },
      },
    });

    if (!persona) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    return NextResponse.json({ persona });
  } catch (error) {
    console.error("Error fetching persona:", error);
    return NextResponse.json(
      { error: "Failed to fetch persona" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/voice/personas/[id] - Update persona
 */
export async function PATCH(
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

    const { id } = await params;
    const body = await request.json();
    const validated = updatePersonaSchema.parse(body);

    // Only allow editing org-specific personas (not templates)
    const existing = await prisma.voicePersona.findFirst({
      where: { id, organizationId: org.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Persona not found or cannot edit template" },
        { status: 404 }
      );
    }

    const persona = await prisma.voicePersona.update({
      where: { id },
      data: validated,
    });

    return NextResponse.json({ persona });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    console.error("Error updating persona:", error);
    return NextResponse.json(
      { error: "Failed to update persona" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/voice/personas/[id] - Delete persona
 */
export async function DELETE(
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

    const { id } = await params;

    // Only allow deleting org-specific personas
    const existing = await prisma.voicePersona.findFirst({
      where: { id, organizationId: org.id },
      include: { _count: { select: { agents: true } } },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Persona not found or cannot delete template" },
        { status: 404 }
      );
    }

    // Check if any agents are using this persona
    if (existing._count.agents > 0) {
      return NextResponse.json(
        { error: "Cannot delete persona with associated agents" },
        { status: 400 }
      );
    }

    await prisma.voicePersona.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting persona:", error);
    return NextResponse.json(
      { error: "Failed to delete persona" },
      { status: 500 }
    );
  }
}
