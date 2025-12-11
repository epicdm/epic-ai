import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserOrganization } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";
import crypto from "crypto";

/**
 * GET - Get single webhook config
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { platform } = await params;

    const config = await prisma.webhookConfig.findUnique({
      where: {
        orgId_platform: {
          orgId: org.id,
          platform: platform.toUpperCase() as any,
        },
      },
    });

    if (!config) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://leads.epic.dm";

    return NextResponse.json({
      config: {
        ...config,
        webhookUrl: `${baseUrl}/api/webhooks/${platform.toLowerCase()}/${org.id}`,
      },
    });
  } catch (error) {
    console.error("Error getting webhook config:", error);
    return NextResponse.json({ error: "Failed to get config" }, { status: 500 });
  }
}

/**
 * PUT - Update webhook config
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { platform } = await params;
    const body = await request.json();

    const config = await prisma.webhookConfig.update({
      where: {
        orgId_platform: {
          orgId: org.id,
          platform: platform.toUpperCase() as any,
        },
      },
      data: {
        enabled: body.enabled,
        autoTriggerVoiceAI: body.autoTriggerVoiceAI,
        fieldMappings: body.fieldMappings,
        linkedCampaigns: body.linkedCampaigns,
      },
    });

    return NextResponse.json({ config });
  } catch (error) {
    console.error("Error updating webhook config:", error);
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
  }
}

/**
 * DELETE - Delete webhook config
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { platform } = await params;

    await prisma.webhookConfig.delete({
      where: {
        orgId_platform: {
          orgId: org.id,
          platform: platform.toUpperCase() as any,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting webhook config:", error);
    return NextResponse.json({ error: "Failed to delete config" }, { status: 500 });
  }
}

/**
 * POST - Regenerate tokens
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { platform } = await params;
    const body = await request.json();
    const { action } = body;

    if (action === "regenerate_tokens") {
      const verifyToken = crypto.randomBytes(16).toString("hex");
      const secretKey = crypto.randomBytes(32).toString("hex");

      const config = await prisma.webhookConfig.update({
        where: {
          orgId_platform: {
            orgId: org.id,
            platform: platform.toUpperCase() as any,
          },
        },
        data: {
          verifyToken,
          secretKey,
        },
      });

      return NextResponse.json({ config });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
