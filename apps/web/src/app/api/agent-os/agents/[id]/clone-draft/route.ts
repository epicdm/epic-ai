/**
 * Agent OS - Clone Draft Endpoint
 *
 * POST /api/agent-os/agents/:id/clone-draft
 * Create an editable draft copy of an agent (typically used for published agents)
 *
 * GOVERNANCE INVARIANT: Published agents cannot be edited directly.
 * Users must clone to draft to make changes.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";
import type { ApiResponse } from "@epic-ai/shared";
import type { Agent, Prisma } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/agent-os/agents/:id/clone-draft
 * Clone an agent to create an editable draft version
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<Agent>>> {
  try {
    const { id } = await params;

    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json(
        { data: null, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json(
        { data: null, error: { code: "NO_ORG", message: "No organization found" } },
        { status: 404 }
      );
    }

    // Find the source agent
    const sourceAgent = await prisma.agent.findFirst({
      where: {
        id,
        organizationId: org.id,
      },
    });

    if (!sourceAgent) {
      return NextResponse.json(
        { data: null, error: { code: "NOT_FOUND", message: "Agent not found" } },
        { status: 404 }
      );
    }

    // Cannot clone archived agents
    if (sourceAgent.status === "ARCHIVED") {
      return NextResponse.json(
        { data: null, error: { code: "AGENT_ARCHIVED", message: "Cannot clone archived agent" } },
        { status: 400 }
      );
    }

    // Parse optional body for custom name/slug
    let customName: string | undefined;
    let customSlug: string | undefined;
    try {
      const body = await request.json();
      customName = body.name;
      customSlug = body.slug;
    } catch {
      // No body provided, use defaults
    }

    // Calculate next version number
    // Count existing agents with similar slug pattern
    const existingDrafts = await prisma.agent.count({
      where: {
        organizationId: org.id,
        slug: {
          startsWith: `${sourceAgent.slug}-draft`,
        },
      },
    });
    const version = existingDrafts + 1;

    // Generate new slug ensuring uniqueness
    const baseSlug = customSlug || `${sourceAgent.slug}-draft-v${version}`;
    let newSlug = baseSlug;
    let slugAttempt = 0;

    while (true) {
      const existing = await prisma.agent.findFirst({
        where: { organizationId: org.id, slug: newSlug },
      });
      if (!existing) break;
      slugAttempt++;
      newSlug = `${baseSlug}-${slugAttempt}`;
      if (slugAttempt > 100) {
        return NextResponse.json(
          { data: null, error: { code: "SLUG_CONFLICT", message: "Unable to generate unique slug" } },
          { status: 409 }
        );
      }
    }

    // Generate new name
    const newName = customName || `${sourceAgent.name} (Draft v${version})`;

    // Clone the agent with all JSON config blobs
    const clonedAgent = await prisma.agent.create({
      data: {
        organizationId: org.id,
        name: newName,
        slug: newSlug,
        description: sourceAgent.description,
        channels: sourceAgent.channels,
        status: "DRAFT",
        templateId: sourceAgent.templateId,
        companyProfileId: sourceAgent.companyProfileId,
        // Copy all config JSON blobs
        roleCard: sourceAgent.roleCard as Prisma.InputJsonValue,
        brainConfig: sourceAgent.brainConfig as Prisma.InputJsonValue,
        personalityConfig: sourceAgent.personalityConfig as Prisma.InputJsonValue,
        toolConfig: sourceAgent.toolConfig as Prisma.InputJsonValue,
        knowledgeConfig: sourceAgent.knowledgeConfig as Prisma.InputJsonValue,
        memoryConfig: sourceAgent.memoryConfig as Prisma.InputJsonValue,
        learningConfig: sourceAgent.learningConfig as Prisma.InputJsonValue,
        governanceConfig: sourceAgent.governanceConfig as Prisma.InputJsonValue,
        economicsConfig: sourceAgent.economicsConfig as Prisma.InputJsonValue,
        // Copy confidence tracking
        configConfidence: sourceAgent.configConfidence as Prisma.InputJsonValue,
        configGaps: sourceAgent.configGaps as Prisma.InputJsonValue,
        configWarnings: sourceAgent.configWarnings as Prisma.InputJsonValue,
      },
      include: {
        template: {
          select: { id: true, name: true, slug: true },
        },
        companyProfile: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({
      data: clonedAgent,
      confidence: {
        clone_draft: 1.0,
      },
      gaps: [],
      warnings: [
        {
          code: "DRAFT_CREATED",
          message: `Draft version created from ${sourceAgent.status.toLowerCase()} agent`,
          severity: "info" as const,
          field_path: "status",
          suggestion: "Review and publish when ready",
        },
      ],
    });
  } catch (error) {
    console.error("Error cloning agent to draft:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to clone agent" } },
      { status: 500 }
    );
  }
}
