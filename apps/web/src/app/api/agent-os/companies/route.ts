/**
 * Agent OS - Company Profile API
 *
 * POST /api/agent-os/companies - Create/update company profile
 * GET /api/agent-os/companies - Get company profile
 *
 * Supports Wizard Step 1: Company Info
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";
import { CreateCompanyProfileRequestSchema, type ApiResponse, type GapItem } from "@epic-ai/shared";
import type { CompanyProfile } from "@prisma/client";

type CompanyResponse = ApiResponse<CompanyProfile>;

/**
 * GET /api/agent-os/companies
 * Get the company profile for the current organization
 */
export async function GET(): Promise<NextResponse<CompanyResponse>> {
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

    const companyProfile = await prisma.companyProfile.findUnique({
      where: { organizationId: org.id },
    });

    if (!companyProfile) {
      // Return empty but valid response with gaps indicating profile needs creation
      return NextResponse.json({
        data: null,
        confidence: {},
        gaps: [{
          gap_type: "missing_profile",
          field_path: "company_profile",
          severity: "high",
          impact: "Cannot create agents without company profile",
          recommended_fix: "Create a company profile to get started",
          question_to_user: "What is your company name?",
        }],
        warnings: [],
      });
    }

    // Calculate confidence and gaps
    const { confidence, gaps } = calculateProfileConfidenceAndGaps(companyProfile);

    return NextResponse.json({
      data: companyProfile,
      confidence,
      gaps,
      warnings: [],
    });
  } catch (error) {
    console.error("Error getting company profile:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to get company profile" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agent-os/companies
 * Create or update company profile (upsert)
 */
export async function POST(request: NextRequest): Promise<NextResponse<CompanyResponse>> {
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
    const parsed = CreateCompanyProfileRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request body",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const { name, website, industry, companySize, mission, values } = parsed.data;

    // Upsert company profile
    const companyProfile = await prisma.companyProfile.upsert({
      where: { organizationId: org.id },
      create: {
        organizationId: org.id,
        name,
        website,
        industry,
        companySize,
        mission,
        values,
        // Initialize empty arrays for enrichment
        products: [],
        services: [],
        targetMarkets: [],
        competitors: [],
        socialLinks: {},
      },
      update: {
        name,
        website,
        industry,
        companySize,
        mission,
        values,
        updatedAt: new Date(),
      },
    });

    // Calculate confidence and gaps
    const { confidence, gaps } = calculateProfileConfidenceAndGaps(companyProfile);

    // Determine if enrichment is recommended
    const warnings = [];
    if (website && !companyProfile.enrichedAt) {
      warnings.push({
        code: "CAN_ENRICH",
        message: "Company profile can be enriched from website",
        severity: "info" as const,
        suggestion: "Run enrichment to automatically populate more company details",
      });
    }

    return NextResponse.json({
      data: companyProfile,
      confidence,
      gaps,
      warnings,
    });
  } catch (error) {
    console.error("Error creating company profile:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to create company profile" } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/agent-os/companies
 * Update specific fields of company profile
 */
export async function PATCH(request: NextRequest): Promise<NextResponse<CompanyResponse>> {
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

    // Check if profile exists
    const existing = await prisma.companyProfile.findUnique({
      where: { organizationId: org.id },
    });

    if (!existing) {
      return NextResponse.json(
        { data: null, error: { code: "NOT_FOUND", message: "Company profile not found. Create one first." } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = CreateCompanyProfileRequestSchema.partial().safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request body",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    // Only update provided fields
    const updateData: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.website !== undefined) updateData.website = parsed.data.website;
    if (parsed.data.industry !== undefined) updateData.industry = parsed.data.industry;
    if (parsed.data.companySize !== undefined) updateData.companySize = parsed.data.companySize;
    if (parsed.data.mission !== undefined) updateData.mission = parsed.data.mission;
    if (parsed.data.values !== undefined) updateData.values = parsed.data.values;

    const companyProfile = await prisma.companyProfile.update({
      where: { organizationId: org.id },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });

    const { confidence, gaps } = calculateProfileConfidenceAndGaps(companyProfile);

    return NextResponse.json({
      data: companyProfile,
      confidence,
      gaps,
      warnings: [],
    });
  } catch (error) {
    console.error("Error updating company profile:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to update company profile" } },
      { status: 500 }
    );
  }
}

/**
 * Calculate confidence scores and gaps for a company profile
 */
function calculateProfileConfidenceAndGaps(profile: CompanyProfile): {
  confidence: Record<string, number>;
  gaps: GapItem[];
} {
  const confidence: Record<string, number> = {};
  const gaps: GapItem[] = [];

  // Name (required)
  confidence["name"] = profile.name ? 1 : 0;
  if (!profile.name) {
    gaps.push({
      gap_type: "missing_required",
      field_path: "name",
      severity: "high",
      impact: "Company name is required",
      recommended_fix: "Provide the company name",
    });
  }

  // Website (recommended)
  confidence["website"] = profile.website ? 0.9 : 0;
  if (!profile.website) {
    gaps.push({
      gap_type: "missing_recommended",
      field_path: "website",
      severity: "medium",
      impact: "Cannot auto-enrich company information",
      recommended_fix: "Provide the company website URL",
      question_to_user: "What is your company website?",
    });
  }

  // Industry
  confidence["industry"] = profile.industry ? 0.8 : 0;
  if (!profile.industry) {
    gaps.push({
      gap_type: "missing_config",
      field_path: "industry",
      severity: "low",
      impact: "Industry context missing for agent behavior",
      recommended_fix: "Specify the industry",
    });
  }

  // Enriched data
  const products = profile.products as unknown[] || [];
  const services = profile.services as unknown[] || [];
  confidence["products"] = products.length > 0 ? 0.9 : 0;
  confidence["services"] = services.length > 0 ? 0.9 : 0;

  if (products.length === 0 && services.length === 0) {
    gaps.push({
      gap_type: "missing_data",
      field_path: "products_services",
      severity: "medium",
      impact: "Agent won't know what company offers",
      recommended_fix: "Add products or services, or run enrichment",
    });
  }

  // Mission and values
  confidence["mission"] = profile.mission ? 0.7 : 0;
  const values = profile.values as string[] || [];
  confidence["values"] = values.length > 0 ? 0.7 : 0;

  // Overall profile confidence
  const allScores = Object.values(confidence);
  confidence["overall"] = allScores.reduce((a, b) => a + b, 0) / allScores.length;

  return { confidence, gaps };
}
