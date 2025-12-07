import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";

// GET single automation
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

    const { id } = await params;

    const automation = await prisma.automation.findFirst({
      where: {
        id,
        organizationId: org.id,
      },
      include: {
        runs: {
          orderBy: { startedAt: "desc" },
          take: 20,
        },
      },
    });

    if (!automation) {
      return NextResponse.json({ error: "Automation not found" }, { status: 404 });
    }

    return NextResponse.json(automation);
  } catch (error) {
    console.error("Error fetching automation:", error);
    return NextResponse.json(
      { error: "Failed to fetch automation" },
      { status: 500 }
    );
  }
}

// PATCH update automation
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
    const existing = await prisma.automation.findFirst({
      where: {
        id,
        organizationId: org.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Automation not found" }, { status: 404 });
    }

    const body = await request.json();
    const automation = await prisma.automation.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(automation);
  } catch (error) {
    console.error("Error updating automation:", error);
    return NextResponse.json(
      { error: "Failed to update automation" },
      { status: 500 }
    );
  }
}

// DELETE automation
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

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.automation.findFirst({
      where: {
        id,
        organizationId: org.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Automation not found" }, { status: 404 });
    }

    await prisma.automation.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting automation:", error);
    return NextResponse.json(
      { error: "Failed to delete automation" },
      { status: 500 }
    );
  }
}
