/**
 * Agent OS - Templates API
 *
 * GET /api/agent-os/templates - List templates with optional filtering
 * POST /api/agent-os/templates/recommend - Get ranked recommendations based on company
 *
 * Supports Wizard Step 2: Template Selection
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";
import type { ApiResponse, TemplateRecommendation, AgentTemplateInfo } from "@epic-ai/shared";
import type { AgentTemplate, AgentTemplateCategory, ChannelType } from "@prisma/client";
import { voiceAgentTemplates } from "@/lib/voice/templates";

type TemplateListResponse = ApiResponse<AgentTemplateInfo[]>;
type TemplateRecommendResponse = ApiResponse<TemplateRecommendation[]>;

/**
 * GET /api/agent-os/templates
 * List available templates with optional filtering
 *
 * Query params:
 * - category: Filter by category (sales, support, marketing, etc.)
 * - industry: Filter by industry match
 * - channel: Filter by channel support
 * - complexity: Filter by complexity level
 * - featured: Only show featured templates
 */
export async function GET(request: NextRequest): Promise<NextResponse<TemplateListResponse>> {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json(
        { data: null, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") as AgentTemplateCategory | null;
    const industry = searchParams.get("industry");
    const channel = searchParams.get("channel") as ChannelType | null;
    const complexity = searchParams.get("complexity");
    const featured = searchParams.get("featured") === "true";

    // Build filter
    const where: Record<string, unknown> = {
      isActive: true,
    };

    if (category) {
      where.category = category;
    }

    if (industry) {
      where.industries = { has: industry };
    }

    if (channel) {
      where.channels = { has: channel };
    }

    if (complexity) {
      where.complexity = complexity;
    }

    if (featured) {
      where.featured = true;
    }

    const templates = await prisma.agentTemplate.findMany({
      where,
      orderBy: [
        { featured: "desc" },
        { popularity: "desc" },
        { name: "asc" },
      ],
    });

    let templateInfos: AgentTemplateInfo[];

    if (templates.length > 0) {
      templateInfos = templates.map(mapTemplateToInfo);
    } else {
      // Fallback: serve hardcoded voice templates when DB has none
      templateInfos = voiceAgentTemplates.map((vt) => ({
        id: vt.id,
        slug: vt.id,
        name: vt.name,
        description: vt.description,
        category: mapVoiceCategory(vt.category),
        useCases: vt.features,
        industries: [],
        channels: ["VOICE" as ChannelType],
        complexity: vt.difficulty === "beginner"
          ? ("BEGINNER" as const)
          : vt.difficulty === "advanced"
          ? ("ADVANCED" as const)
          : ("INTERMEDIATE" as const),
        popularity: 0,
        featured: vt.difficulty === "beginner",
      }));

      // Apply client-side category filter if requested
      if (category) {
        templateInfos = templateInfos.filter(
          (t) => t.category === category
        );
      }
    }

    return NextResponse.json({
      data: templateInfos,
      confidence: {
        templates: templates.length > 0 ? 1.0 : 0.8,
      },
      gaps: [],
      warnings: templateInfos.length === 0 ? [{
        code: "NO_TEMPLATES",
        message: "No templates found matching filters",
        severity: "info" as const,
        suggestion: "Try broadening your search criteria",
      }] : [],
    });
  } catch (error) {
    console.error("Error listing templates:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to list templates" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agent-os/templates
 * Get ranked template recommendations based on company profile
 *
 * Body:
 * - companyId?: string - Use existing company profile for matching
 * - industry?: string - Industry for matching
 * - channels?: string[] - Desired channels
 * - useCases?: string[] - Desired use cases
 */
export async function POST(request: NextRequest): Promise<NextResponse<TemplateRecommendResponse>> {
  try {
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

    const body = await request.json();
    const { companyId, industry, channels, useCases } = body as {
      companyId?: string;
      industry?: string;
      channels?: string[];
      useCases?: string[];
    };

    // Get company profile for matching if available
    let companyIndustry = industry;
    let companyChannels = channels || [];

    if (companyId || !industry) {
      const companyProfile = await prisma.companyProfile.findUnique({
        where: { organizationId: org.id },
      });

      if (companyProfile) {
        companyIndustry = companyIndustry || companyProfile.industry || undefined;
      }
    }

    // Get all active templates
    const templates = await prisma.agentTemplate.findMany({
      where: { isActive: true },
      orderBy: [
        { featured: "desc" },
        { popularity: "desc" },
      ],
    });

    // Score and rank templates
    const recommendations: TemplateRecommendation[] = templates.map((template) => {
      const { score, reasons } = calculateTemplateMatchScore(template, {
        industry: companyIndustry,
        channels: companyChannels,
        useCases: useCases || [],
      });

      return {
        template: mapTemplateToInfo(template),
        matchScore: score,
        reasons,
      };
    });

    // Sort by match score descending
    recommendations.sort((a, b) => b.matchScore - a.matchScore);

    // Calculate gaps
    const gaps = [];
    if (!companyIndustry) {
      gaps.push({
        gap_type: "missing_context" as const,
        field_path: "industry",
        severity: "low" as const,
        impact: "Template recommendations may be less accurate",
        recommended_fix: "Provide industry information for better matching",
        question_to_user: "What industry is your company in?",
      });
    }

    return NextResponse.json({
      data: recommendations,
      confidence: {
        recommendations: companyIndustry ? 0.8 : 0.5,
      },
      gaps,
      warnings: [],
    });
  } catch (error) {
    console.error("Error getting template recommendations:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to get recommendations" } },
      { status: 500 }
    );
  }
}

/**
 * Map Prisma template to API info format
 */
function mapTemplateToInfo(template: AgentTemplate): AgentTemplateInfo {
  return {
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
  };
}

/**
 * Calculate match score for a template against company context
 */
function calculateTemplateMatchScore(
  template: AgentTemplate,
  context: {
    industry?: string;
    channels: string[];
    useCases: string[];
  }
): { score: number; reasons: string[] } {
  let score = 0.5; // Base score
  const reasons: string[] = [];

  // Featured templates get a boost
  if (template.featured) {
    score += 0.1;
    reasons.push("Featured template");
  }

  // Popularity boost (normalized to 0-0.1)
  const popularityBoost = Math.min(template.popularity / 1000, 0.1);
  score += popularityBoost;
  if (template.popularity > 100) {
    reasons.push(`Popular choice (${template.popularity}+ uses)`);
  }

  // Industry match
  if (context.industry) {
    const industryLower = context.industry.toLowerCase();
    const matchesIndustry = template.industries.some(
      (ind) => ind.toLowerCase().includes(industryLower) || industryLower.includes(ind.toLowerCase())
    );
    if (matchesIndustry) {
      score += 0.2;
      reasons.push(`Matches your industry: ${context.industry}`);
    }
  }

  // Channel match
  if (context.channels.length > 0) {
    const channelMatches = context.channels.filter((ch) =>
      template.channels.includes(ch as ChannelType)
    );
    if (channelMatches.length > 0) {
      score += 0.1 * (channelMatches.length / context.channels.length);
      reasons.push(`Supports ${channelMatches.length}/${context.channels.length} desired channels`);
    }
  }

  // Use case match
  if (context.useCases.length > 0) {
    const useCaseMatches = context.useCases.filter((uc) =>
      template.useCases.some(
        (tuc) => tuc.toLowerCase().includes(uc.toLowerCase()) || uc.toLowerCase().includes(tuc.toLowerCase())
      )
    );
    if (useCaseMatches.length > 0) {
      score += 0.15 * (useCaseMatches.length / context.useCases.length);
      reasons.push(`Matches ${useCaseMatches.length}/${context.useCases.length} use cases`);
    }
  }

  // If no specific reasons, add generic ones
  if (reasons.length === 0) {
    reasons.push("General purpose template");
  }

  // Normalize score to 0-1
  score = Math.min(Math.max(score, 0), 1);

  return { score, reasons };
}

/**
 * Map voice template category string to AgentTemplateCategory enum value.
 * Enum: SALES, SUPPORT, SCHEDULING, LEAD_GEN, ONBOARDING, SURVEY, COLLECTIONS, NOTIFICATIONS, CUSTOM
 */
function mapVoiceCategory(
  cat: "sales" | "support" | "booking" | "survey" | "general"
): AgentTemplateCategory {
  const map: Record<string, AgentTemplateCategory> = {
    sales: "SALES" as AgentTemplateCategory,
    support: "SUPPORT" as AgentTemplateCategory,
    booking: "SCHEDULING" as AgentTemplateCategory,
    survey: "SURVEY" as AgentTemplateCategory,
    general: "SUPPORT" as AgentTemplateCategory,
  };
  return map[cat] ?? ("CUSTOM" as AgentTemplateCategory);
}
