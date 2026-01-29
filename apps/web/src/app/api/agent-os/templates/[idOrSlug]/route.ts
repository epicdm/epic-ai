/**
 * Agent OS - Single Template API
 *
 * GET /api/agent-os/templates/:idOrSlug - Get template by ID or slug
 *
 * Supports Wizard Step 2: Template Selection
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import type { ApiResponse, AgentTemplateInfo } from "@epic-ai/shared";
import type { AgentTemplate } from "@prisma/client";

interface RouteParams {
  params: Promise<{ idOrSlug: string }>;
}

interface TemplateDetailResponse extends AgentTemplateInfo {
  roleCardTemplate: Record<string, unknown>;
  brainConfigTemplate: Record<string, unknown>;
  personalityTemplate: Record<string, unknown>;
  toolConfigTemplate: Record<string, unknown>;
  knowledgeConfigTemplate: Record<string, unknown>;
  memoryConfigTemplate: Record<string, unknown>;
  learningConfigTemplate: Record<string, unknown>;
  governanceTemplate: Record<string, unknown>;
  economicsTemplate: Record<string, unknown>;
}

/**
 * GET /api/agent-os/templates/:idOrSlug
 * Get a single template by ID or slug with full config templates
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<TemplateDetailResponse>>> {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json(
        { data: null, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const { idOrSlug } = await params;

    // Try to find by ID first, then by slug
    let template: AgentTemplate | null = null;

    // Check if it looks like a CUID
    if (idOrSlug.length >= 20) {
      template = await prisma.agentTemplate.findUnique({
        where: { id: idOrSlug },
      });
    }

    // If not found, try by slug
    if (!template) {
      template = await prisma.agentTemplate.findUnique({
        where: { slug: idOrSlug },
      });
    }

    if (!template) {
      return NextResponse.json(
        { data: null, error: { code: "NOT_FOUND", message: "Template not found" } },
        { status: 404 }
      );
    }

    if (!template.isActive) {
      return NextResponse.json(
        { data: null, error: { code: "TEMPLATE_INACTIVE", message: "Template is no longer available" } },
        { status: 410 }
      );
    }

    const templateDetail: TemplateDetailResponse = {
      id: template.id,
      slug: template.slug,
      name: template.name,
      description: template.description,
      category: template.category,
      useCases: template.useCases,
      industries: template.industries,
      channels: template.channels,
      complexity: template.complexity,
      popularity: template.popularity,
      featured: template.featured,
      // Include config templates for agent creation
      roleCardTemplate: template.roleCardTemplate as Record<string, unknown>,
      brainConfigTemplate: template.brainConfigTemplate as Record<string, unknown>,
      personalityTemplate: template.personalityTemplate as Record<string, unknown>,
      toolConfigTemplate: template.toolConfigTemplate as Record<string, unknown>,
      knowledgeConfigTemplate: template.knowledgeConfigTemplate as Record<string, unknown>,
      memoryConfigTemplate: template.memoryConfigTemplate as Record<string, unknown>,
      learningConfigTemplate: template.learningConfigTemplate as Record<string, unknown>,
      governanceTemplate: template.governanceTemplate as Record<string, unknown>,
      economicsTemplate: template.economicsTemplate as Record<string, unknown>,
    };

    // Calculate completeness of template configs
    const configCompleteness = calculateConfigCompleteness(template);

    return NextResponse.json({
      data: templateDetail,
      confidence: {
        template: 1.0,
        ...configCompleteness,
      },
      gaps: [],
      warnings: [],
    });
  } catch (error) {
    console.error("Error getting template:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to get template" } },
      { status: 500 }
    );
  }
}

/**
 * Calculate completeness scores for each config template
 */
function calculateConfigCompleteness(template: AgentTemplate): Record<string, number> {
  const completeness: Record<string, number> = {};

  // Check each template config for completeness
  completeness.roleCardTemplate = getObjectCompleteness(template.roleCardTemplate as Record<string, unknown>);
  completeness.brainConfigTemplate = getObjectCompleteness(template.brainConfigTemplate as Record<string, unknown>);
  completeness.personalityTemplate = getObjectCompleteness(template.personalityTemplate as Record<string, unknown>);
  completeness.toolConfigTemplate = getObjectCompleteness(template.toolConfigTemplate as Record<string, unknown>);
  completeness.knowledgeConfigTemplate = getObjectCompleteness(template.knowledgeConfigTemplate as Record<string, unknown>);
  completeness.memoryConfigTemplate = getObjectCompleteness(template.memoryConfigTemplate as Record<string, unknown>);
  completeness.learningConfigTemplate = getObjectCompleteness(template.learningConfigTemplate as Record<string, unknown>);
  completeness.governanceTemplate = getObjectCompleteness(template.governanceTemplate as Record<string, unknown>);
  completeness.economicsTemplate = getObjectCompleteness(template.economicsTemplate as Record<string, unknown>);

  // Overall template config completeness
  const scores = Object.values(completeness);
  completeness.overall = scores.reduce((a, b) => a + b, 0) / scores.length;

  return completeness;
}

/**
 * Get completeness score for an object (0-1)
 */
function getObjectCompleteness(obj: Record<string, unknown> | null | undefined): number {
  if (!obj || typeof obj !== "object") return 0;
  const keys = Object.keys(obj);
  if (keys.length === 0) return 0;
  // More keys = more complete (simplified heuristic)
  return Math.min(keys.length / 5, 1);
}
