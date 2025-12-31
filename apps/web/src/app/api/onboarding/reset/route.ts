import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";

export async function POST(request: NextRequest) {
  try {
    const { userId, isUATBypass } = await getAuthWithBypass();

    console.log("[Reset] Starting reset for userId:", userId, "isUATBypass:", isUATBypass);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body for options
    let removeBrand = false;
    let removeOrganization = false;
    try {
      const body = await request.json();
      removeBrand = body.removeBrand === true;
      removeOrganization = body.removeOrganization === true;
      console.log("[Reset] Options received:", { removeBrand, removeOrganization });
    } catch {
      // No body or invalid JSON - use defaults
      console.log("[Reset] No body or invalid JSON, using defaults");
    }

    // Get ALL memberships for this user to see full picture
    const allMemberships = await prisma.membership.findMany({
      where: { userId },
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    console.log("[Reset] All memberships for user:", JSON.stringify(allMemberships, null, 2));

    // Get first membership for deletion
    const membership = allMemberships[0];

    // Also log if we can find the user at all
    if (!membership) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true },
      });
      console.log("[Reset] User lookup (no membership):", user);
      console.log("[Reset] WARNING: No membership found for userId:", userId);
    }

    let organizationDeleted = false;
    let deletedOrgId: string | null = null;

    // If removeOrganization is requested, delete the entire organization
    // This cascades to brands, memberships, and all related data
    if (removeOrganization && membership) {
      deletedOrgId = membership.organizationId;
      console.log("[Reset] Attempting to delete organization:", deletedOrgId);
      console.log("[Reset] Organization details:", membership.organization);

      try {
        // Delete the organization - this will cascade delete:
        // - Memberships
        // - Brands (and their BrandBrain, BrandAudience, ContentPillar, etc.)
        // - Leads, VoiceAgents, SocialAccounts, etc.
        await prisma.organization.delete({
          where: { id: membership.organizationId },
        });
        console.log("[Reset] Organization deleted successfully");
        organizationDeleted = true;

        // Verify deletion
        const verifyOrg = await prisma.organization.findUnique({
          where: { id: deletedOrgId },
        });
        console.log("[Reset] Verification - org still exists?", !!verifyOrg);

        if (verifyOrg) {
          console.error("[Reset] ERROR: Organization still exists after delete!");
        }
      } catch (deleteError) {
        console.error("[Reset] Failed to delete organization:", deleteError);
        throw deleteError;
      }
    } else if (removeOrganization && !membership) {
      console.log("[Reset] Cannot delete organization - no membership found for user");
    } else if (removeBrand && membership) {
      console.log("[Reset] Deleting brands for org:", membership.organizationId);
      // If only removeBrand is requested, delete all brands for the organization
      // BrandBrain, BrandAudience, ContentPillar, etc. will cascade delete
      await prisma.brand.deleteMany({
        where: { organizationId: membership.organizationId },
      });
      console.log("[Reset] Brands deleted successfully");
    }

    // Delete FlywheelProgress for this user (reset the 5-phase wizard)
    await prisma.flywheelProgress.deleteMany({
      where: { userId },
    });

    // Reset the onboarding progress for this user
    await prisma.userOnboardingProgress.upsert({
      where: { userId },
      create: {
        userId,
        hasSeenWelcome: false,
        hasChosenGoal: null,
        hasCreatedBrand: false,
        hasCompletedQuickWin: false,
        hasSeenDashboardTour: false,
        hasCreatedVoiceAgent: false,
        hasConnectedSocial: false,
        hasCreatedCampaign: false,
        hasGeneratedContent: false,
        completionPercentage: 0,
        currentStep: null,
        isDemoMode: false,
        onboardingCompletedAt: null,
      },
      update: {
        hasSeenWelcome: false,
        hasChosenGoal: null,
        hasCreatedBrand: false,
        hasCompletedQuickWin: false,
        hasSeenDashboardTour: false,
        hasCreatedVoiceAgent: false,
        hasConnectedSocial: false,
        hasCreatedCampaign: false,
        hasGeneratedContent: false,
        completionPercentage: 0,
        currentStep: null,
        isDemoMode: false,
        onboardingCompletedAt: null,
      },
    });

    // Also reset any active wizard sessions
    await prisma.wizardSession.deleteMany({
      where: { userId },
    });

    // Final verification - check if user still has any memberships
    const remainingMemberships = await prisma.membership.findMany({
      where: { userId },
      include: { organization: { select: { id: true, name: true } } },
    });

    console.log("[Reset] Reset complete. Details:", {
      organizationDeleted,
      deletedOrgId,
      remainingMemberships: remainingMemberships.length,
      remainingOrgs: remainingMemberships.map(m => m.organization),
    });

    return NextResponse.json({
      success: true,
      message: organizationDeleted
        ? "Full reset complete. Organization deleted. Refresh the page to start fresh."
        : "Onboarding reset successfully. Refresh the page to start onboarding again.",
      organizationDeleted,
      deletedOrgId,
      remainingMemberships: remainingMemberships.length,
      debug: {
        userId,
        isUATBypass,
        hadMembership: !!membership,
        requestedOrgDelete: removeOrganization,
      },
    });
  } catch (error) {
    console.error("[Reset] Error resetting onboarding:", error);
    return NextResponse.json(
      { error: "Failed to reset onboarding", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
