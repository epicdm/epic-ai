/**
 * Social Profiles API for Brand Setup Wizard
 *
 * Aggregates profile information from connected social accounts.
 * Returns avatars, usernames, and display names to help populate brand settings.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";

interface SocialProfile {
  platform: string;
  username: string | null;
  displayName: string | null;
  avatar: string | null;
  profileUrl: string | null;
}

interface SocialProfilesResponse {
  success: boolean;
  data?: {
    profiles: SocialProfile[];
    suggestedLogo: string | null;
    suggestedName: string | null;
  };
  error?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<SocialProfilesResponse>> {
  try {
    // Authenticate
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get organizationId from query params
    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: "organizationId is required" },
        { status: 400 }
      );
    }

    // Verify user has access to the organization
    const userOrg = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (!userOrg) {
      return NextResponse.json(
        { success: false, error: "Organization not found" },
        { status: 404 }
      );
    }

    // Get all brands for the organization with their social accounts
    const brands = await prisma.brand.findMany({
      where: { organizationId },
      include: {
        socialAccounts: {
          where: {
            status: "CONNECTED",
          },
          select: {
            platform: true,
            username: true,
            displayName: true,
            avatar: true,
            profileUrl: true,
          },
        },
      },
    });

    // Aggregate all connected social accounts
    const profiles: SocialProfile[] = [];
    let suggestedLogo: string | null = null;
    let suggestedName: string | null = null;

    // Platform priority for logo suggestion (higher quality avatars first)
    const platformPriority: Record<string, number> = {
      FACEBOOK: 1,
      INSTAGRAM: 2,
      LINKEDIN: 3,
      TWITTER: 4,
    };

    for (const brand of brands) {
      for (const account of brand.socialAccounts) {
        profiles.push({
          platform: account.platform,
          username: account.username,
          displayName: account.displayName,
          avatar: account.avatar,
          profileUrl: account.profileUrl,
        });

        // Update suggested logo based on priority (prefer higher quality platform avatars)
        if (account.avatar) {
          const currentPriority = suggestedLogo
            ? platformPriority[
                profiles.find((p) => p.avatar === suggestedLogo)?.platform || ""
              ] ?? 999
            : 999;
          const newPriority = platformPriority[account.platform] ?? 999;

          if (newPriority < currentPriority) {
            suggestedLogo = account.avatar;
          }
        }

        // Suggest name from first profile with a displayName
        if (!suggestedName && account.displayName) {
          suggestedName = account.displayName;
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        profiles,
        suggestedLogo,
        suggestedName,
      },
    });
  } catch (error) {
    console.error("Error fetching social profiles:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch social profiles",
      },
      { status: 500 }
    );
  }
}
