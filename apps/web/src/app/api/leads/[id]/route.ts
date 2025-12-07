import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";
import { emitLeadStatusChanged } from "@/lib/events/emit-lead-events";

// GET single lead with activities
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

    const lead = await prisma.lead.findFirst({
      where: {
        id,
        organizationId: org.id,
      },
      include: {
        brand: {
          select: { id: true, name: true },
        },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        calls: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            agent: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json(lead);
  } catch (error) {
    console.error("Error fetching lead:", error);
    return NextResponse.json(
      { error: "Failed to fetch lead" },
      { status: 500 }
    );
  }
}

// PATCH update lead
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

    // Verify ownership
    const existing = await prisma.lead.findFirst({
      where: {
        id,
        organizationId: org.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const body = await request.json();

    // Track status change
    if (body.status && body.status !== existing.status) {
      await prisma.leadActivity.create({
        data: {
          leadId: id,
          type: "STATUS_CHANGE",
          title: `Status changed to ${body.status}`,
          description: `Status changed from ${existing.status} to ${body.status}`,
          metadata: {
            oldStatus: existing.status,
            newStatus: body.status,
          },
          userId,
        },
      });

      // Emit status change event for automations
      emitLeadStatusChanged(
        id,
        org.id,
        existing.status,
        body.status
      ).catch(console.error);

      // Set convertedAt if converted
      if (body.status === "CONVERTED" && !existing.convertedAt) {
        body.convertedAt = new Date();
      }
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: body,
      include: {
        brand: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(lead);
  } catch (error) {
    console.error("Error updating lead:", error);
    return NextResponse.json(
      { error: "Failed to update lead" },
      { status: 500 }
    );
  }
}

// DELETE lead
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
    const existing = await prisma.lead.findFirst({
      where: {
        id,
        organizationId: org.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    await prisma.lead.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting lead:", error);
    return NextResponse.json(
      { error: "Failed to delete lead" },
      { status: 500 }
    );
  }
}
