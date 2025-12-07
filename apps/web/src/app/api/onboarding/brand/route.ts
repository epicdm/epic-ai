import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";
import { createBrand } from "@/lib/services/organization";
import { brandSchema } from "@/lib/validations/onboarding";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { organizationId, ...brandData } = body;

    // Verify user has access to this organization
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "You don't have access to this organization" },
        { status: 403 }
      );
    }

    // Validate input
    const validationResult = brandSchema.safeParse(brandData);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, website } = validationResult.data;

    // Create brand
    const brand = await createBrand({
      organizationId,
      name,
      website: website || undefined,
    });

    return NextResponse.json(brand);
  } catch (error) {
    console.error("Error creating brand:", error);
    return NextResponse.json(
      { error: "Failed to create brand" },
      { status: 500 }
    );
  }
}
