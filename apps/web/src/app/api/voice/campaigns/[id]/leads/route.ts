/**
 * Campaign Leads API
 * GET - List leads for a campaign
 * POST - Add leads to a campaign (single or bulk)
 * DELETE - Remove leads from campaign
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma, CampaignLeadStatus } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";
import { z } from "zod";

// Schema for single lead
const leadSchema = z.object({
  phoneNumber: z.string().min(10),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  company: z.string().optional(),
  customFields: z.record(z.unknown()).optional(),
});

// Schema for adding leads
const addLeadsSchema = z.object({
  leads: z.array(leadSchema).min(1).max(1000),
});

// Schema for updating lead status
const updateLeadSchema = z.object({
  leadId: z.string(),
  status: z.nativeEnum(CampaignLeadStatus).optional(),
  outcome: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/voice/campaigns/[id]/leads - List campaign leads
 */
export async function GET(
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

    const { id: campaignId } = await params;

    // Verify campaign ownership
    const campaign = await prisma.voiceCampaign.findFirst({
      where: { id: campaignId, organizationId: org.id },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as CampaignLeadStatus | null;
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: Record<string, unknown> = {
      campaignId,
    };

    if (status) {
      where.status = status;
    }

    const [leads, total] = await Promise.all([
      prisma.campaignLead.findMany({
        where,
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        take: limit,
        skip: offset,
      }),
      prisma.campaignLead.count({ where }),
    ]);

    // Get status counts
    const statusCounts = await prisma.campaignLead.groupBy({
      by: ["status"],
      where: { campaignId },
      _count: true,
    });

    const counts: Record<string, number> = {};
    for (const item of statusCounts) {
      counts[item.status] = item._count;
    }

    return NextResponse.json({ leads, total, limit, offset, statusCounts: counts });
  } catch (error) {
    console.error("Error fetching campaign leads:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaign leads" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/voice/campaigns/[id]/leads - Add leads to campaign
 */
export async function POST(
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

    const { id: campaignId } = await params;

    // Verify campaign ownership
    const campaign = await prisma.voiceCampaign.findFirst({
      where: { id: campaignId, organizationId: org.id },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Don't allow adding leads to completed/cancelled campaigns
    if (campaign.status === "COMPLETED" || campaign.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Cannot add leads to a completed or cancelled campaign" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validated = addLeadsSchema.parse(body);

    // Get existing phone numbers to avoid duplicates
    const existingLeads = await prisma.campaignLead.findMany({
      where: { campaignId },
      select: { phoneNumber: true },
    });
    const existingNumbers = new Set(existingLeads.map((l) => l.phoneNumber));

    // Filter out duplicates and create new leads
    const newLeads = validated.leads.filter(
      (lead) => !existingNumbers.has(lead.phoneNumber)
    );

    if (newLeads.length === 0) {
      return NextResponse.json({
        added: 0,
        skipped: validated.leads.length,
        message: "All phone numbers already exist in campaign",
      });
    }

    // Bulk create leads
    const created = await prisma.campaignLead.createMany({
      data: newLeads.map((lead) => ({
        campaignId,
        phoneNumber: lead.phoneNumber,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        company: lead.company,
        customFields: lead.customFields || {},
        status: "PENDING",
      })),
    });

    // Update campaign total leads count
    await prisma.voiceCampaign.update({
      where: { id: campaignId },
      data: { totalLeads: { increment: created.count } },
    });

    return NextResponse.json(
      {
        added: created.count,
        skipped: validated.leads.length - newLeads.length,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    console.error("Error adding campaign leads:", error);
    return NextResponse.json(
      { error: "Failed to add campaign leads" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/voice/campaigns/[id]/leads - Update lead status
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

    const { id: campaignId } = await params;

    // Verify campaign ownership
    const campaign = await prisma.voiceCampaign.findFirst({
      where: { id: campaignId, organizationId: org.id },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const body = await request.json();
    const validated = updateLeadSchema.parse(body);

    // Verify lead belongs to campaign
    const existingLead = await prisma.campaignLead.findFirst({
      where: { id: validated.leadId, campaignId },
    });

    if (!existingLead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const lead = await prisma.campaignLead.update({
      where: { id: validated.leadId },
      data: {
        status: validated.status,
        outcome: validated.outcome,
        notes: validated.notes,
      },
    });

    return NextResponse.json({ lead });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    console.error("Error updating campaign lead:", error);
    return NextResponse.json(
      { error: "Failed to update campaign lead" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/voice/campaigns/[id]/leads - Remove leads from campaign
 */
export async function DELETE(
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

    const { id: campaignId } = await params;

    // Verify campaign ownership
    const campaign = await prisma.voiceCampaign.findFirst({
      where: { id: campaignId, organizationId: org.id },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const body = await request.json();
    const { leadIds } = body as { leadIds: string[] };

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: "leadIds array required" }, { status: 400 });
    }

    // Only allow deletion of pending leads
    const result = await prisma.campaignLead.deleteMany({
      where: {
        id: { in: leadIds },
        campaignId,
        status: "PENDING",
      },
    });

    // Update campaign total leads count
    if (result.count > 0) {
      await prisma.voiceCampaign.update({
        where: { id: campaignId },
        data: { totalLeads: { decrement: result.count } },
      });
    }

    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    console.error("Error deleting campaign leads:", error);
    return NextResponse.json(
      { error: "Failed to delete campaign leads" },
      { status: 500 }
    );
  }
}
