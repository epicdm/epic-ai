import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getUserOrganization } from "@/lib/sync-user";
import {
  ensurePostizOrganization,
  generatePostizAuthToken,
} from "@/lib/services/postiz-provisioning";
import { prisma } from "@epic-ai/database";

const POSTIZ_URL = (process.env.NEXT_PUBLIC_POSTIZ_URL || "http://localhost:5000").trim();

/**
 * GET - Generate a Postiz connect URL with auth token for the current user's organization
 * This ensures the Postiz org exists and provides seamless auto-login
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress || "admin@epic.dm";

    // Get destination from query param (default to social integrations page)
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform"); // Optional: specific platform

    // Check if POSTIZ_DATABASE_URL is configured for auto-provisioning
    const hasPostizDb = !!process.env.POSTIZ_DATABASE_URL;

    let postizOrgId: string | null = null;
    let authToken: string | null = null;

    if (hasPostizDb) {
      try {
        const postizOrg = await ensurePostizOrganization(org.id, org.name, email);
        postizOrgId = postizOrg.id;

        // Generate auth token for auto-login
        authToken = await generatePostizAuthToken(postizOrgId);
      } catch (error) {
        console.error("Failed to ensure Postiz org:", error);
        // Fall through to use default connect URL without auth
      }
    } else {
      // Get existing postizOrgId from database
      const orgData = await prisma.organization.findUnique({
        where: { id: org.id },
        select: { postizOrgId: true },
      });
      if (orgData?.postizOrgId) {
        postizOrgId = orgData.postizOrgId;
        authToken = await generatePostizAuthToken(postizOrgId);
      }
    }

    // Build the connect URL with auth token
    let connectPath = "/integrations/social";
    if (platform) {
      connectPath = `/integrations/social/${platform}`;
    }

    // If we have an auth token, append it to the URL
    let connectUrl = `${POSTIZ_URL}${connectPath}`;
    if (authToken) {
      // Postiz uses auth cookie, so we need to redirect through a login endpoint
      // that sets the cookie and then redirects to the destination
      connectUrl = `${POSTIZ_URL}/api/auth/token-login?token=${encodeURIComponent(authToken)}&redirect=${encodeURIComponent(connectPath)}`;
    }

    return NextResponse.json({
      url: connectUrl,
      postizOrgId,
      hasAuthToken: !!authToken,
    });
  } catch (error) {
    console.error("Error generating connect URL:", error);
    return NextResponse.json({ error: "Failed to generate connect URL" }, { status: 500 });
  }
}
