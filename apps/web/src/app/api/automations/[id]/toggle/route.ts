import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";

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

    const { id } = await params;

    const existing = await prisma.automation.findFirst({
      where: {
        id,
        organizationId: org.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Automation not found" }, { status: 404 });
    }

    const automation = await prisma.automation.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });

    return NextResponse.json(automation);
  } catch (error) {
    console.error("Error toggling automation:", error);
    return NextResponse.json(
      { error: "Failed to toggle automation" },
      { status: 500 }
    );
  }
}
