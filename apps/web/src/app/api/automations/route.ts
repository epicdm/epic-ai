import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";

// GET all automations
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

    const automations = await prisma.automation.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { runs: true },
        },
      },
    });

    return NextResponse.json(automations);
  } catch (error) {
    console.error("Error fetching automations:", error);
    return NextResponse.json(
      { error: "Failed to fetch automations" },
      { status: 500 }
    );
  }
}

// POST create automation
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
    const { name, description, trigger, triggerConfig, conditions, actions, isActive } =
      body;

    if (!name || !trigger || !actions || !Array.isArray(actions)) {
      return NextResponse.json(
        { error: "Name, trigger, and actions are required" },
        { status: 400 }
      );
    }

    const automation = await prisma.automation.create({
      data: {
        name,
        description,
        trigger,
        triggerConfig,
        conditions,
        actions,
        isActive: isActive ?? true,
        organizationId: org.id,
      },
    });

    return NextResponse.json(automation, { status: 201 });
  } catch (error) {
    console.error("Error creating automation:", error);
    return NextResponse.json(
      { error: "Failed to create automation" },
      { status: 500 }
    );
  }
}
