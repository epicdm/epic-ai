/**
 * Ad Account Detail API
 * TODO: Fix schema mismatches
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserOrganization } from "@/lib/sync-user";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    // TODO: Implement when schema is fixed
    return NextResponse.json({ error: `Ad account ${id} not found` }, { status: 404 });
  } catch (error) {
    console.error("Error fetching ad account:", error);
    return NextResponse.json({ error: "Failed to fetch ad account" }, { status: 500 });
  }
}

export async function PUT(_request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    return NextResponse.json({ error: `Cannot update ad account ${id} - not implemented` }, { status: 501 });
  } catch (error) {
    console.error("Error updating ad account:", error);
    return NextResponse.json({ error: "Failed to update ad account" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    return NextResponse.json({ error: `Cannot delete ad account ${id} - not implemented` }, { status: 501 });
  } catch (error) {
    console.error("Error deleting ad account:", error);
    return NextResponse.json({ error: "Failed to delete ad account" }, { status: 500 });
  }
}
