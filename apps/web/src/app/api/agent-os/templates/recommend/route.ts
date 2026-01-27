/**
 * Agent OS - Template Recommendations API
 *
 * POST /api/agent-os/templates/recommend
 * Get ranked template recommendations based on company profile
 *
 * Supports Wizard Step: Template Selection after enrichment
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";
import type { ApiResponse, TemplateRecommendation, AgentTemplateInfo } from "@epic-ai/shared";
import { TemplateComplexity, type AgentTemplate, type ChannelType } from "@prisma/client";

type TemplateRecommendResponse = ApiResponse<TemplateRecommendation[]>;

interface CompanyProfile {
  name?: string;
  industry?: string;
  company_type?: string;
  target_audience?: string;
  main_products?: string[];
  main_services?: string[];
  company_size?: string;
  geographic_focus?: string;
}

/**
 * POST /api/agent-os/templates/recommend
 * Get ranked template recommendations based on enriched company profile
 *
 * Body:
 * - company_profile: CompanyProfile - Enriched company data
 * - channels?: string[] - Desired channels (optional)
 * - useCases?: string[] - Desired use cases (optional)
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
    const { company_profile, channels, useCases } = body as {
      company_profile?: CompanyProfile;
      channels?: string[];
      useCases?: string[];
    };

    // Get all active templates
    const templates = await prisma.agentTemplate.findMany({
      where: { isActive: true },
      orderBy: [
        { featured: "desc" },
        { popularity: "desc" },
      ],
    });

    // Score and rank templates based on company profile
    const recommendations: TemplateRecommendation[] = templates.map((template) => {
      const { score, reasons } = calculateTemplateMatchScore(template, {
        companyProfile: company_profile,
        channels: channels || [],
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

    // Return top 3 recommendations
    const topRecommendations = recommendations.slice(0, 3);

    // Calculate overall confidence based on available context
    let confidence = 0.5;
    if (company_profile?.industry) confidence += 0.2;
    if (company_profile?.company_type) confidence += 0.1;
    if (company_profile?.main_products?.length || company_profile?.main_services?.length) confidence += 0.1;

    // Calculate gaps
    const gaps = [];
    if (!company_profile?.industry) {
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
      data: topRecommendations,
      confidence: {
        recommendations: Math.min(confidence, 0.95),
      },
      gaps,
      warnings: topRecommendations.length === 0 ? [{
        code: "NO_TEMPLATES",
        message: "No templates available",
        severity: "warning" as const,
        suggestion: "Try again later or create a custom agent",
      }] : [],
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
 * Calculate match score for a template against company profile
 */
function calculateTemplateMatchScore(
  template: AgentTemplate,
  context: {
    companyProfile?: CompanyProfile;
    channels: string[];
    useCases: string[];
  }
): { score: number; reasons: string[] } {
  let score = 0.4; // Base score
  const reasons: string[] = [];
  const profile = context.companyProfile;

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
  if (profile?.industry) {
    const industryLower = profile.industry.toLowerCase();
    const matchesIndustry = template.industries.some(
      (ind) => ind.toLowerCase().includes(industryLower) || industryLower.includes(ind.toLowerCase())
    );
    if (matchesIndustry) {
      score += 0.2;
      reasons.push(`Matches your industry: ${profile.industry}`);
    }
  }

  // Company type match (e.g., B2B vs B2C)
  if (profile?.company_type) {
    const typeLower = profile.company_type.toLowerCase();
    // Check if template use cases match company type
    const typeMatches = template.useCases.some((uc) => {
      const ucLower = uc.toLowerCase();
      if (typeLower.includes("b2b") && (ucLower.includes("b2b") || ucLower.includes("enterprise") || ucLower.includes("business"))) return true;
      if (typeLower.includes("b2c") && (ucLower.includes("b2c") || ucLower.includes("consumer") || ucLower.includes("retail"))) return true;
      return false;
    });
    if (typeMatches) {
      score += 0.15;
      reasons.push(`Suited for ${profile.company_type} businesses`);
    }
  }

  // Products/Services match
  if (profile?.main_products?.length || profile?.main_services?.length) {
    const offerings = [...(profile.main_products || []), ...(profile.main_services || [])];
    const offeringMatches = offerings.some((offering) => {
      const offeringLower = offering.toLowerCase();
      return template.useCases.some((uc) => {
        const ucLower = uc.toLowerCase();
        return ucLower.includes(offeringLower) || offeringLower.includes(ucLower);
      });
    });
    if (offeringMatches) {
      score += 0.1;
      reasons.push("Aligns with your products/services");
    }
  }

  // Channel match
  if (context.channels.length > 0) {
    const channelMatches = context.channels.filter((ch) =>
      template.channels.includes(ch as ChannelType)
    );
    if (channelMatches.length > 0) {
      score += 0.1 * (channelMatches.length / context.channels.length);
      reasons.push(`Supports ${channelMatches.join(", ")} channels`);
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
      reasons.push(`Covers ${useCaseMatches.join(", ")} use cases`);
    }
  }

  // Complexity match based on company size
  if (profile?.company_size) {
    const sizeLower = profile.company_size.toLowerCase();
    const isSmall = sizeLower.includes("small") || sizeLower.includes("startup") || sizeLower.includes("1-10");
    const isEnterprise = sizeLower.includes("enterprise") || sizeLower.includes("large") || sizeLower.includes("1000+");

    if (isSmall && template.complexity === TemplateComplexity.BEGINNER) {
      score += 0.1;
      reasons.push("Designed for smaller teams");
    } else if (isEnterprise && (template.complexity === TemplateComplexity.ADVANCED || template.complexity === TemplateComplexity.EXPERT)) {
      score += 0.1;
      reasons.push("Built for enterprise scale");
    }
  }

  // If no specific reasons beyond base, add generic ones
  if (reasons.length === 0) {
    reasons.push("General purpose template");
  }

  // Normalize score to 0-1
  score = Math.min(Math.max(score, 0), 1);

  return { score, reasons };
}
