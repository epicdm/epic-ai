/**
 * Voice Campaign Detail API
 * GET - Get single campaign with stats
 * PATCH - Update campaign
 * DELETE - Delete campaign
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma, CampaignVoiceStatus } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";
import { z } from "zod";

// Voice service URL for campaign operations
const VOICE_SERVICE_URL = process.env.VOICE_SERVICE_URL || "http://localhost:5000";

// Schema for updating campaign
const updateCampaignSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  status: z.nativeEnum(CampaignVoiceStatus).optional(),
  timezone: z.string().optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  callWindowStart: z.string().optional(),
  callWindowEnd: z.string().optional(),
  callDays: z.array(z.number().min(1).max(7)).optional(),
  maxConcurrentCalls: z.number().min(1).max(50).optional(),
  callsPerHour: z.number().min(1).max(120).optional(),
  retryAttempts: z.number().min(0).max(5).optional(),
  retryDelayMinutes: z.number().min(5).max(1440).optional(),
});

/**
 * GET /api/voice/campaigns/[id] - Get campaign details
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;

    const campaign = await prisma.voiceCampaign.findFirst({
      where: { id, organizationId: org.id },
      include: {
        agent: { select: { id: true, name: true, agentType: true } },
        leads: {
          select: {
            id: true,
            phoneNumber: true,
            firstName: true,
            lastName: true,
            status: true,
            callAttempts: true,
            lastCalledAt: true,
            outcome: true,
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        },
        _count: {
          select: {
            leads: true,
            callLogs: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Calculate additional stats
    const leadStats = await prisma.campaignLead.groupBy({
      by: ["status"],
      where: { campaignId: id },
      _count: true,
    });

    const stats = {
      totalLeads: campaign._count.leads,
      totalCalls: campaign._count.callLogs,
      pending: 0,
      calling: 0,
      completed: 0,
      failed: 0,
      skipped: 0,
    };

    for (const stat of leadStats) {
      const key = stat.status.toLowerCase() as keyof typeof stats;
      if (key in stats) {
        stats[key] = stat._count;
      }
    }

    return NextResponse.json({ campaign, stats });
  } catch (error) {
    console.error("Error fetching campaign:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaign" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/voice/campaigns/[id] - Update campaign
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const body = await request.json();
    const validated = updateCampaignSchema.parse(body);

    // Verify ownership
    const existing = await prisma.voiceCampaign.findFirst({
      where: { id, organizationId: org.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Handle status transitions
    if (validated.status) {
      const currentStatus = existing.status;

      // Validate status transitions
      const validTransitions: Record<CampaignVoiceStatus, CampaignVoiceStatus[]> = {
        DRAFT: ["SCHEDULED", "CANCELLED"],
        SCHEDULED: ["RUNNING", "PAUSED", "CANCELLED"],
        RUNNING: ["PAUSED", "COMPLETED", "CANCELLED"],
        PAUSED: ["RUNNING", "CANCELLED"],
        COMPLETED: [],
        CANCELLED: [],
      };

      if (
        !validTransitions[currentStatus].includes(validated.status) &&
        validated.status !== currentStatus
      ) {
        return NextResponse.json(
          { error: `Cannot transition from ${currentStatus} to ${validated.status}` },
          { status: 400 }
        );
      }

      // Notify voice service of status change
      if (validated.status === "RUNNING" || validated.status === "PAUSED") {
        try {
          await fetch(`${VOICE_SERVICE_URL}/api/campaigns/${id}/status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: validated.status.toLowerCase(),
              organization_id: org.id,
            }),
          });
        } catch {
          console.warn("Voice service notification failed");
        }
      }
    }

    const updateData: Record<string, unknown> = { ...validated };
    if (validated.startDate) updateData.startDate = new Date(validated.startDate);
    if (validated.endDate) updateData.endDate = new Date(validated.endDate);
    if (validated.startDate === null) updateData.startDate = null;
    if (validated.endDate === null) updateData.endDate = null;

    const campaign = await prisma.voiceCampaign.update({
      where: { id },
      data: updateData,
      include: {
        agent: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ campaign });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    console.error("Error updating campaign:", error);
    return NextResponse.json(
      { error: "Failed to update campaign" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/voice/campaigns/[id] - Delete campaign
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.voiceCampaign.findFirst({
      where: { id, organizationId: org.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Don't allow deletion of running campaigns
    if (existing.status === "RUNNING") {
      return NextResponse.json(
        { error: "Cannot delete a running campaign. Pause or cancel it first." },
        { status: 400 }
      );
    }

    // Delete campaign (cascade deletes leads)
    await prisma.voiceCampaign.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    return NextResponse.json(
      { error: "Failed to delete campaign" },
      { status: 500 }
    );
  }
}
