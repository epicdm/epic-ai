/**
 * Voice Agent Detail API
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";

// GET single agent
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

    // Get brand IDs for this org
    const brands = await prisma.brand.findMany({
      where: { organizationId: org.id },
      select: { id: true },
    });
    const brandIds = brands.map((b) => b.id);

    const agent = await prisma.voiceAgent.findFirst({
      where: {
        id,
        brandId: { in: brandIds },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Get brand info
    const brand = await prisma.brand.findUnique({
      where: { id: agent.brandId },
      select: { id: true, name: true },
    });

    return NextResponse.json({ ...agent, brand });
  } catch (error) {
    console.error("Error fetching agent:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent" },
      { status: 500 }
    );
  }
}

// PATCH update agent
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

    // Get brand IDs for this org
    const brands = await prisma.brand.findMany({
      where: { organizationId: org.id },
      select: { id: true },
    });
    const brandIds = brands.map((b) => b.id);

    // Verify ownership
    const existing = await prisma.voiceAgent.findFirst({
      where: {
        id,
        brandId: { in: brandIds },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const body = await request.json();

    // Only allow updating fields that exist on the model
    const { name, systemPrompt, voiceId, isActive, settings } = body;
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;
    if (systemPrompt !== undefined) updateData.systemPrompt = systemPrompt;
    if (voiceId !== undefined) updateData.voiceId = voiceId;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (settings !== undefined) updateData.settings = settings;

    const agent = await prisma.voiceAgent.update({
      where: { id },
      data: updateData,
    });

    const brand = await prisma.brand.findUnique({
      where: { id: agent.brandId },
      select: { id: true, name: true },
    });

    return NextResponse.json({ ...agent, brand });
  } catch (error) {
    console.error("Error updating agent:", error);
    return NextResponse.json(
      { error: "Failed to update agent" },
      { status: 500 }
    );
  }
}

// DELETE agent
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

    // Get brand IDs for this org
    const brands = await prisma.brand.findMany({
      where: { organizationId: org.id },
      select: { id: true },
    });
    const brandIds = brands.map((b) => b.id);

    // Verify ownership
    const existing = await prisma.voiceAgent.findFirst({
      where: {
        id,
        brandId: { in: brandIds },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    await prisma.voiceAgent.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting agent:", error);
    return NextResponse.json(
      { error: "Failed to delete agent" },
      { status: 500 }
    );
  }
}
