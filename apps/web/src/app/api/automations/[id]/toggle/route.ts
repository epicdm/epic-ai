/**
 * Automation Toggle API
 *
 * Enable/disable automation activation.
 * Part of the "One Brain, Many Voices" architecture.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { getUserOrganization } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";
import { WORKFLOW_TEMPLATES } from "@/lib/services/cross-channel/workflow-templates";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST toggle automation enabled/disabled
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    // Get optional explicit state from body
    let body: { isActive?: boolean } = {};
    try {
      body = await request.json();
    } catch {
      // No body provided, will toggle
    }

    // Verify automation exists and belongs to org
    const existing = await prisma.automation.findFirst({
      where: {
        id,
        organizationId: org.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: `Automation not found: ${id}` },
        { status: 404 }
      );
    }

    // Determine new state
    const newState = body.isActive !== undefined ? body.isActive : !existing.isActive;

    // If activating, validate that the automation is properly configured
    if (newState && !existing.isActive) {
      // Check that steps exist
      const steps = existing.steps as unknown[];
      if (!steps || !Array.isArray(steps) || steps.length === 0) {
        return NextResponse.json(
          { error: "Cannot activate automation without steps" },
          { status: 400 }
        );
      }

      // Check that entry step exists
      if (!existing.entryStepId) {
        return NextResponse.json(
          { error: "Cannot activate automation without entry step" },
          { status: 400 }
        );
      }

      // If automation requires brand brain, verify it exists
      if (existing.requiresBrandBrain) {
        const brandBrain = await prisma.brandBrain.findFirst({
          where: {
            organizationId: org.id,
            ...(existing.brandId && { brandId: existing.brandId }),
          },
        });

        if (!brandBrain) {
          return NextResponse.json(
            { error: "Automation requires Brand Brain, but none is configured" },
            { status: 400 }
          );
        }
      }
    }

    // Update automation state
    const automation = await prisma.automation.update({
      where: { id },
      data: { isActive: newState },
      include: {
        _count: {
          select: {
            instances: true,
          },
        },
      },
    });

    // Add template info
    const template = WORKFLOW_TEMPLATES[automation.templateId];

    return NextResponse.json({
      ...automation,
      templateName: template?.name || "Custom",
      templateDescription: template?.description,
      channelCount: automation.channels.length,
      instanceCount: automation._count.instances,
      previousState: existing.isActive,
      message: newState ? "Automation activated" : "Automation deactivated",
    });
  } catch (error) {
    console.error("Error toggling automation:", error);
    return NextResponse.json(
      { error: "Failed to toggle automation" },
      { status: 500 }
    );
  }
}
