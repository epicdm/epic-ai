import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass, getCurrentOrganization } from "@/lib/auth";
import { prisma } from "@epic-ai/database";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const organization = await getCurrentOrganization();
    if (!organization) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      );
    }

    // Fetch brand for this organization
    const brand = await prisma.brand.findFirst({
      where: { organizationId: organization.id },
    });

    if (!brand) {
      return NextResponse.json(
        { error: "No brand found" },
        { status: 404 }
      );
    }

    // Fetch brand brain with related data
    const brain = await prisma.brandBrain.findUnique({
      where: { brandId: brand.id },
      include: {
        audiences: {
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        },
        pillars: {
          orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
        },
        brandCompetitors: {
          orderBy: { createdAt: "asc" },
        },
        brandLearnings: {
          where: { isActive: true, isExpired: false },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    // Return in same format as main brand-brain API
    return NextResponse.json({
      brain,
      initialized: !!brain,
      brand: {
        id: brand.id,
        name: brand.name,
        website: brand.website,
        industry: brand.industry,
      },
    });
  } catch (error) {
    console.error("Error fetching brand brain:", error);
    return NextResponse.json(
      { error: "Failed to fetch brand brain" },
      { status: 500 }
    );
  }
}
