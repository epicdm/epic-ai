import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserOrganization } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";
import crypto from "crypto";

/**
 * GET - List webhook configs
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

    const configs = await prisma.webhookConfig.findMany({
      where: { orgId: org.id },
      orderBy: { createdAt: "desc" },
    });

    // Generate webhook URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://leads.epic.dm";
    const configsWithUrls = configs.map((config) => ({
      ...config,
      webhookUrl: `${baseUrl}/api/webhooks/${config.platform.toLowerCase()}/${org.id}`,
    }));

    return NextResponse.json({ configs: configsWithUrls });
  } catch (error) {
    console.error("Error getting webhook configs:", error);
    return NextResponse.json({ error: "Failed to get configs" }, { status: 500 });
  }
}

/**
 * POST - Create or update webhook config
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

    const body = await request.json();
    const { platform, enabled, autoTriggerVoiceAI, fieldMappings, linkedCampaigns } = body;

    if (!platform) {
      return NextResponse.json({ error: "Platform required" }, { status: 400 });
    }

    // Generate secure tokens
    const verifyToken = crypto.randomBytes(16).toString("hex");
    const secretKey = crypto.randomBytes(32).toString("hex");

    const config = await prisma.webhookConfig.upsert({
      where: {
        orgId_platform: {
          orgId: org.id,
          platform,
        },
      },
      create: {
        orgId: org.id,
        platform,
        verifyToken,
        secretKey,
        enabled: enabled ?? true,
        autoTriggerVoiceAI: autoTriggerVoiceAI ?? true,
        fieldMappings: fieldMappings || null,
        linkedCampaigns: linkedCampaigns || [],
      },
      update: {
        enabled: enabled ?? undefined,
        autoTriggerVoiceAI: autoTriggerVoiceAI ?? undefined,
        fieldMappings: fieldMappings ?? undefined,
        linkedCampaigns: linkedCampaigns ?? undefined,
      },
    });

    // Generate webhook URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://leads.epic.dm";
    const webhookUrl = `${baseUrl}/api/webhooks/${platform.toLowerCase()}/${org.id}`;

    return NextResponse.json({
      config: {
        ...config,
        webhookUrl,
      },
    });
  } catch (error) {
    console.error("Error creating webhook config:", error);
    return NextResponse.json({ error: "Failed to create config" }, { status: 500 });
  }
}
