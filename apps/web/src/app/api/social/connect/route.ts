import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getUserOrganization } from "@/lib/sync-user";
import { ensurePostizOrganization } from "@/lib/services/postiz-provisioning";
import { getPostizConnectUrl } from "@/lib/services/postiz";

/**
 * GET - Generate a Postiz connect URL for the current user's organization
 * This ensures the Postiz org exists before redirecting to connect accounts
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
    const destination = searchParams.get("destination") || "/integrations/social";
    const platform = searchParams.get("platform"); // Optional: specific platform

    // Check if POSTIZ_DATABASE_URL is configured for auto-provisioning
    const hasPostizDb = !!process.env.POSTIZ_DATABASE_URL;

    let postizOrgId: string | null = null;

    if (hasPostizDb) {
      try {
        const postizOrg = await ensurePostizOrganization(org.id, org.name, email);
        postizOrgId = postizOrg.id;
      } catch (error) {
        console.error("Failed to ensure Postiz org:", error);
        // Fall through to use default connect URL
      }
    }

    // Generate the connect URL
    const connectUrl = getPostizConnectUrl(platform || undefined);

    return NextResponse.json({
      url: connectUrl,
      postizOrgId,
      destination,
    });
  } catch (error) {
    console.error("Error generating connect URL:", error);
    return NextResponse.json({ error: "Failed to generate connect URL" }, { status: 500 });
  }
}
