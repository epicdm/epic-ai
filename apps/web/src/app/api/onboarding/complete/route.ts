import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";

export async function POST(_request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify user has at least one organization
    const membership = await prisma.membership.findFirst({
      where: { userId },
      include: {
        organization: {
          include: {
            brands: true,
          },
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Please create an organization first" },
        { status: 400 }
      );
    }

    // Optional: Create a default subscription record
    const existingSubscription = await prisma.subscription.findFirst({
      where: { organizationId: membership.organizationId },
    });

    if (!existingSubscription) {
      await prisma.subscription.create({
        data: {
          organizationId: membership.organizationId,
          plan: "starter",
          status: "trialing",
          socialAccountsLimit: 5,
          voiceMinutesLimit: 250,
          brandsLimit: 1,
          usersLimit: 1,
          trialEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        },
      });
    }

    return NextResponse.json({
      success: true,
      organizationId: membership.organizationId,
    });
  } catch (error) {
    console.error("Error completing onboarding:", error);
    return NextResponse.json(
      { error: "Failed to complete onboarding" },
      { status: 500 }
    );
  }
}
