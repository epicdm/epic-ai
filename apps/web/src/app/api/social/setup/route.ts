import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getUserOrganization } from "@/lib/sync-user";
import { getPostizConnectUrl, PostizClient } from "@/lib/services/postiz";
import { ensurePostizOrganization } from "@/lib/services/postiz-provisioning";
import { prisma } from "@epic-ai/database";

/**
 * GET - Check/provision Postiz setup
 * Auto-provisions Postiz org on first visit
 */
export async function GET() {
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

    // Check if POSTIZ_DATABASE_URL is configured
    const hasPostizDb = !!process.env.POSTIZ_DATABASE_URL;

    // Auto-provision Postiz organization if database is available
    if (hasPostizDb) {
      try {
        const postizOrg = await ensurePostizOrganization(org.id, org.name, email);

        // Test connection with the provisioned API key
        const client = new PostizClient(postizOrg.apiKey, org.id);
        const isConnected = await client.testConnection();

        return NextResponse.json({
          connected: isConnected,
          postizOrgId: postizOrg.id,
          postizUrl: process.env.NEXT_PUBLIC_POSTIZ_URL,
          connectUrl: getPostizConnectUrl(),
          autoProvisioned: true,
        });
      } catch (error) {
        console.error("Failed to auto-provision Postiz org:", error);
        // Fall through to manual setup flow
      }
    }

    // Manual setup flow (fallback when auto-provisioning is not available)
    const orgData = await prisma.organization.findUnique({
      where: { id: org.id },
      select: { postizApiKey: true, postizConnectedAt: true, postizOrgId: true },
    });

    if (orgData?.postizApiKey) {
      const client = new PostizClient(orgData.postizApiKey, org.id);
      const isConnected = await client.testConnection();

      return NextResponse.json({
        connected: isConnected,
        postizOrgId: orgData.postizOrgId,
        connectedAt: orgData.postizConnectedAt,
        postizUrl: process.env.NEXT_PUBLIC_POSTIZ_URL,
        connectUrl: getPostizConnectUrl(),
        autoProvisioned: false,
      });
    }

    return NextResponse.json({
      connected: false,
      postizUrl: process.env.NEXT_PUBLIC_POSTIZ_URL,
      connectUrl: getPostizConnectUrl(),
      requiresManualSetup: !hasPostizDb,
    });
  } catch (error) {
    console.error("Error in social setup:", error);
    return NextResponse.json({ error: "Setup failed" }, { status: 500 });
  }
}

/**
 * POST - Manual API key setup (fallback when auto-provisioning not available)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { apiKey } = await request.json();
    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 400 });
    }

    // Test the API key
    const client = new PostizClient(apiKey.trim(), org.id);
    const isValid = await client.testConnection();

    if (!isValid) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 400 });
    }

    // Save the API key
    await prisma.organization.update({
      where: { id: org.id },
      data: {
        postizApiKey: apiKey.trim(),
        postizConnectedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving API key:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/**
 * DELETE - Disconnect Postiz (clears reference, doesn't delete Postiz org)
 */
export async function DELETE() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    await prisma.organization.update({
      where: { id: org.id },
      data: {
        postizApiKey: null,
        postizOrgId: null,
        postizConnectedAt: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
