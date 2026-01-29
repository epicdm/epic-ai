/**
 * Admin System Configuration API - Single Config
 * GET - Get a specific configuration
 * PUT - Update a configuration
 * DELETE - Delete a configuration
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@epic-ai/database";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

// Validation schema for updating config
const updateConfigSchema = z.object({
  value: z.string(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/admin/config/[key]
 * Get a specific configuration by key
 * Query params:
 *   - reveal=true: Return the actual value for encrypted configs (for verification)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { key } = await params;
    const { searchParams } = new URL(request.url);
    const reveal = searchParams.get("reveal") === "true";

    const config = await prisma.systemConfig.findUnique({
      where: { key },
    });

    if (!config) {
      return NextResponse.json(
        { error: "Configuration not found" },
        { status: 404 }
      );
    }

    // If reveal=true, return actual value; otherwise mask encrypted values
    const shouldMask = config.isEncrypted && config.value && !reveal;

    // Log reveal action for audit purposes
    if (reveal && config.isEncrypted) {
      await prisma.adminAuditLog.create({
        data: {
          userId,
          action: "reveal",
          resource: "system_config",
          resourceId: config.id,
          newValue: { key, revealed: true },
        },
      });
    }

    return NextResponse.json({
      success: true,
      config: {
        ...config,
        value: shouldMask ? "••••••••" : config.value,
        hasValue: !!config.value,
      },
    });
  } catch (error) {
    console.error("[Admin Config] Error fetching config:", error);
    return NextResponse.json(
      { error: "Failed to fetch configuration" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/config/[key]
 * Update a configuration
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { key } = await params;
    const body = await request.json();

    const parseResult = updateConfigSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.errors },
        { status: 400 }
      );
    }

    const { value, description, isActive } = parseResult.data;

    // Find existing config
    const existing = await prisma.systemConfig.findUnique({
      where: { key },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Configuration not found" },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = { value };
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;

    const config = await prisma.systemConfig.update({
      where: { key },
      data: updateData,
    });

    // Log the action (don't log actual values for encrypted configs)
    await prisma.adminAuditLog.create({
      data: {
        userId,
        action: "update",
        resource: "system_config",
        resourceId: config.id,
        oldValue: {
          key,
          hasValue: !!existing.value,
          isActive: existing.isActive,
        },
        newValue: {
          key,
          hasValue: !!value,
          isActive: config.isActive,
        },
      },
    });

    return NextResponse.json({
      success: true,
      config: {
        ...config,
        value: config.isEncrypted ? "••••••••" : config.value,
      },
    });
  } catch (error) {
    console.error("[Admin Config] Error updating config:", error);
    return NextResponse.json(
      { error: "Failed to update configuration" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/config/[key]
 * Delete a configuration
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { key } = await params;

    // Find existing config
    const existing = await prisma.systemConfig.findUnique({
      where: { key },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Configuration not found" },
        { status: 404 }
      );
    }

    await prisma.systemConfig.delete({
      where: { key },
    });

    // Log the action
    await prisma.adminAuditLog.create({
      data: {
        userId,
        action: "delete",
        resource: "system_config",
        resourceId: existing.id,
        oldValue: { key, category: existing.category },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Configuration '${key}' deleted`,
    });
  } catch (error) {
    console.error("[Admin Config] Error deleting config:", error);
    return NextResponse.json(
      { error: "Failed to delete configuration" },
      { status: 500 }
    );
  }
}
