/**
 * Admin System Configuration API
 * GET - List all system configurations
 * POST - Create a new configuration
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@epic-ai/database";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

// Default system configurations that should be initialized
const DEFAULT_CONFIGS = [
  // LiveKit Settings
  {
    key: "livekit_url",
    category: "livekit",
    description: "LiveKit server URL",
    value: process.env.LIVEKIT_URL || "",
    isEncrypted: false,
  },
  {
    key: "livekit_api_key",
    category: "livekit",
    description: "LiveKit API key",
    value: process.env.LIVEKIT_API_KEY || "",
    isEncrypted: true,
  },
  {
    key: "livekit_api_secret",
    category: "livekit",
    description: "LiveKit API secret",
    value: process.env.LIVEKIT_API_SECRET || "",
    isEncrypted: true,
  },
  // Magnus Billing / Asterisk Settings
  {
    key: "magnus_api_url",
    category: "magnus",
    description: "MagnusBilling API URL",
    value: process.env.MAGNUS_API_URL || "",
    isEncrypted: false,
  },
  {
    key: "magnus_api_key",
    category: "magnus",
    description: "MagnusBilling API key",
    value: process.env.MAGNUS_API_KEY || "",
    isEncrypted: true,
  },
  {
    key: "magnus_api_secret",
    category: "magnus",
    description: "MagnusBilling API secret",
    value: process.env.MAGNUS_API_SECRET || "",
    isEncrypted: true,
  },
  // SIP Settings
  {
    key: "sip_server_host",
    category: "sip",
    description: "SIP server hostname",
    value: process.env.SIP_SERVER_HOST || "",
    isEncrypted: false,
  },
  {
    key: "sip_server_port",
    category: "sip",
    description: "SIP server port",
    value: process.env.SIP_SERVER_PORT || "5060",
    isEncrypted: false,
  },
  // API Keys
  {
    key: "openai_api_key",
    category: "api_keys",
    description: "OpenAI API key",
    value: process.env.OPENAI_API_KEY || "",
    isEncrypted: true,
  },
  {
    key: "deepgram_api_key",
    category: "api_keys",
    description: "Deepgram API key for speech-to-text",
    value: process.env.DEEPGRAM_API_KEY || "",
    isEncrypted: true,
  },
  {
    key: "anthropic_api_key",
    category: "api_keys",
    description: "Anthropic API key for Claude",
    value: "",
    isEncrypted: true,
  },
  {
    key: "elevenlabs_api_key",
    category: "api_keys",
    description: "ElevenLabs API key for TTS",
    value: "",
    isEncrypted: true,
  },
  // Voice Service Settings
  {
    key: "voice_service_url",
    category: "general",
    description: "Voice service backend URL",
    value: process.env.VOICE_SERVICE_URL || "",
    isEncrypted: false,
  },
];

// Validation schema for creating config
const createConfigSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
  category: z.enum(["livekit", "magnus", "sip", "api_keys", "general"]),
  description: z.string().optional(),
  isEncrypted: z.boolean().default(false),
});

/**
 * GET /api/admin/config
 * List all system configurations
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TODO: Add admin role check here when we implement roles
    // For now, any authenticated user can access (we'll lock this later)

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    // Get configs, optionally filtered by category
    const configs = await prisma.systemConfig.findMany({
      where: category ? { category } : undefined,
      orderBy: [{ category: "asc" }, { key: "asc" }],
    });

    // Mask encrypted values for display
    const maskedConfigs = configs.map((config) => ({
      ...config,
      value: config.isEncrypted && config.value ? "••••••••" : config.value,
      hasValue: !!config.value,
    }));

    return NextResponse.json({
      success: true,
      configs: maskedConfigs,
      categories: ["livekit", "magnus", "sip", "api_keys", "general"],
    });
  } catch (error) {
    console.error("[Admin Config] Error fetching configs:", error);
    return NextResponse.json(
      { error: "Failed to fetch configurations" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/config
 * Create a new configuration or initialize defaults
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Special action to initialize default configs
    if (body.action === "initialize_defaults") {
      const results = [];

      for (const defaultConfig of DEFAULT_CONFIGS) {
        // Only create if doesn't exist
        const existing = await prisma.systemConfig.findUnique({
          where: { key: defaultConfig.key },
        });

        if (!existing) {
          const created = await prisma.systemConfig.create({
            data: defaultConfig,
          });
          results.push({ key: created.key, action: "created" });
        } else {
          results.push({ key: existing.key, action: "skipped" });
        }
      }

      // Log the action
      await prisma.adminAuditLog.create({
        data: {
          userId,
          action: "initialize",
          resource: "system_config",
          newValue: { results },
        },
      });

      return NextResponse.json({
        success: true,
        message: "Default configurations initialized",
        results,
      });
    }

    // Create a single config
    const parseResult = createConfigSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.errors },
        { status: 400 }
      );
    }

    const { key, value, category, description, isEncrypted } = parseResult.data;

    // Check if key already exists
    const existing = await prisma.systemConfig.findUnique({
      where: { key },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Configuration key already exists" },
        { status: 409 }
      );
    }

    const config = await prisma.systemConfig.create({
      data: {
        key,
        value,
        category,
        description,
        isEncrypted,
      },
    });

    // Log the action
    await prisma.adminAuditLog.create({
      data: {
        userId,
        action: "create",
        resource: "system_config",
        resourceId: config.id,
        newValue: { key, category, isEncrypted },
      },
    });

    return NextResponse.json({
      success: true,
      config: {
        ...config,
        value: isEncrypted ? "••••••••" : config.value,
      },
    });
  } catch (error) {
    console.error("[Admin Config] Error creating config:", error);
    return NextResponse.json(
      { error: "Failed to create configuration" },
      { status: 500 }
    );
  }
}
