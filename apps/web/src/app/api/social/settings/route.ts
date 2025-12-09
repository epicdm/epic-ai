import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserOrganization } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";
import { z } from "zod";

const settingsSchema = z.object({
  enabled: z.boolean().optional(),
  onLeadConverted: z.boolean().optional(),
  onFiveStarCall: z.boolean().optional(),
  onWeeklySchedule: z.boolean().optional(),
  weeklyScheduleDay: z.number().min(0).max(6).optional(),
  weeklyScheduleHour: z.number().min(0).max(23).optional(),
  approvalMode: z.enum(["REVIEW", "AUTO_QUEUE", "AUTO_POST"]).optional(),
  defaultPlatforms: z.array(z.string()).optional(),
  maxPostsPerDay: z.number().min(1).max(20).optional(),
  minHoursBetween: z.number().min(1).max(24).optional(),
  defaultTone: z.string().optional(),
  includeEmojis: z.boolean().optional(),
  includeHashtags: z.boolean().optional(),
  includeCTA: z.boolean().optional(),
  brandDescription: z.string().optional().nullable(),
});

/**
 * GET - Retrieve autopilot settings for the organization
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

    // Get or create settings
    let settings = await prisma.autopilotSettings.findUnique({
      where: { organizationId: org.id },
    });

    if (!settings) {
      // Create default settings
      settings = await prisma.autopilotSettings.create({
        data: {
          organizationId: org.id,
          enabled: false,
          onLeadConverted: true,
          onFiveStarCall: true,
          onWeeklySchedule: false,
          weeklyScheduleDay: 1,
          weeklyScheduleHour: 9,
          approvalMode: "REVIEW",
          defaultPlatforms: [],
          maxPostsPerDay: 3,
          minHoursBetween: 4,
          defaultTone: "professional",
          includeEmojis: true,
          includeHashtags: true,
          includeCTA: false,
          brandDescription: null,
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

/**
 * PUT - Update autopilot settings
 */
export async function PUT(request: Request) {
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
    const parsed = settingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid settings", details: parsed.error.errors },
        { status: 400 }
      );
    }

    // Upsert settings
    const settings = await prisma.autopilotSettings.upsert({
      where: { organizationId: org.id },
      update: parsed.data,
      create: {
        organizationId: org.id,
        ...parsed.data,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
