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
 * POST - Sync API key from Postiz DB or manual API key setup
 * If body is empty, syncs from Postiz DB (after auto-login)
 * If body contains apiKey, uses manual setup flow
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

    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress;

    // Check if body contains apiKey (manual setup) or is empty (auto-sync)
    let body: { apiKey?: string } = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      // Empty body or invalid JSON - proceed with auto-sync
    }

    if (body.apiKey) {
      // Manual API key setup
      const client = new PostizClient(body.apiKey.trim(), org.id);
      const isValid = await client.testConnection();

      if (!isValid) {
        return NextResponse.json({ error: "Invalid API key" }, { status: 400 });
      }

      await prisma.organization.update({
        where: { id: org.id },
        data: {
          postizApiKey: body.apiKey.trim(),
          postizConnectedAt: new Date(),
        },
      });

      return NextResponse.json({ success: true });
    }

    // Auto-sync from Postiz DB
    if (!email) {
      return NextResponse.json({ error: "No email found" }, { status: 400 });
    }

    const hasPostizDb = !!process.env.POSTIZ_DATABASE_URL;
    if (!hasPostizDb) {
      return NextResponse.json({ error: "Auto-sync not available" }, { status: 400 });
    }

    // Import dynamically to avoid build errors when env is not set
    const { syncPostizApiKey } = await import("@/lib/services/postiz-db");
    const syncResult = await syncPostizApiKey(org.id, email);

    if (!syncResult.success) {
      return NextResponse.json({ error: syncResult.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, synced: true });
  } catch (error) {
    console.error("Error in setup POST:", error);
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
