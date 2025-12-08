import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserOrganization } from "@/lib/sync-user";
import { savePostizApiKey, getPostizConnectUrl } from "@/lib/services/postiz";
import { prisma } from "@epic-ai/database";

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

    const orgData = await prisma.organization.findUnique({
      where: { id: org.id },
      select: { postizApiKey: true, postizConnectedAt: true },
    });

    return NextResponse.json({
      connected: !!orgData?.postizApiKey,
      connectedAt: orgData?.postizConnectedAt,
      postizUrl: process.env.NEXT_PUBLIC_POSTIZ_URL,
      connectUrl: getPostizConnectUrl(),
    });
  } catch (error) {
    console.error("Error checking Postiz setup:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

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

    const { apiKey } = await request.json();
    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 400 });
    }

    const success = await savePostizApiKey(org.id, apiKey.trim());
    if (!success) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving API key:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    await prisma.organization.update({
      where: { id: org.id },
      data: { postizApiKey: null, postizConnectedAt: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
